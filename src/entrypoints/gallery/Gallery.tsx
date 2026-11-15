import { useEffect, useMemo, useState } from 'react';
import type { ScrapedMedia } from '~/utils/media';
import type { ScrapedImage } from '~/utils/storage';
import { getOriginalName } from '~/utils/filename';
import { countMedia, loadGalleryPayload } from '~/utils/gallery';
import { getHistory, mediaKey } from '~/utils/history';
import { Button, cn, IconButton, Mark } from '~/ui/primitives';

type Filter = 'all' | 'image' | 'gif' | 'video';
type ItemStatus = 'idle' | 'queued' | 'done' | 'error';

const FILTERS: Array<{ id: Filter; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'image', label: 'Images' },
  { id: 'video', label: 'Videos' },
  { id: 'gif', label: 'GIFs' },
];

export default function Gallery() {
  const [items, setItems] = useState<ScrapedMedia[]>([]);
  const [title, setTitle] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [status, setStatus] = useState<Record<string, ItemStatus>>({});
  const [preview, setPreview] = useState<ScrapedMedia | null>(null);
  const [notice, setNotice] = useState('');
  const [savedKeys, setSavedKeys] = useState<Set<string>>(new Set());

  useEffect(() => {
    (async () => {
      const [payload, history] = await Promise.all([loadGalleryPayload(), getHistory()]);
      const saved = new Set(history.map((entry) => entry.key));
      setSavedKeys(saved);

      if (payload) {
        setItems(payload.items);
        setTitle(payload.title || '');
        setSourceUrl(payload.url || '');
        setSelected(
          new Set(
            payload.items
              .filter((item) => !item.unsupported && !saved.has(mediaKey(item.src)))
              .map((item) => item.id)
          )
        );
      }
      setLoading(false);
    })();

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setPreview(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return items.filter((item) => {
      if (filter !== 'all' && item.kind !== filter) return false;
      if (!needle) return true;
      return [item.alt, item.author, item.tweetId, item.src]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(needle);
    });
  }, [items, filter, query]);

  const counts = countMedia(items);
  const selectedVisible = visible.filter((item) => selected.has(item.id) && !item.unsupported);
  const selectedImages = selectedVisible.filter((item) => item.kind === 'image');
  const failed = visible.filter((item) => status[item.id] === 'error');
  const savedCount = visible.filter((item) => savedKeys.has(mediaKey(item.src))).length;

  function toggle(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAll() {
    setSelected(new Set(visible.filter((item) => !item.unsupported).map((item) => item.id)));
  }

  function clearSelection() {
    setSelected(new Set());
  }

  async function downloadOne(media: ScrapedMedia, index: number) {
    setStatus((current) => ({ ...current, [media.id]: 'queued' }));
    try {
      const response = await browser.runtime.sendMessage({
        type: 'mediagrab:download',
        media,
        index,
        pageTitle: title,
      });
      setStatus((current) => ({ ...current, [media.id]: response?.ok ? 'done' : 'error' }));
      return Boolean(response?.ok);
    } catch {
      setStatus((current) => ({ ...current, [media.id]: 'error' }));
      return false;
    }
  }

  async function downloadSelected() {
    if (!selectedVisible.length) return;
    setNotice(`Downloading ${selectedVisible.length}…`);
    let ok = 0;
    for (let i = 0; i < selectedVisible.length; i++) {
      if (await downloadOne(selectedVisible[i]!, i + 1)) ok++;
      await sleep(150);
    }
    setNotice(`Saved ${ok} of ${selectedVisible.length}.`);
  }

  async function retryFailed() {
    if (!failed.length) return;
    setNotice(`Retrying ${failed.length}…`);
    let ok = 0;
    for (let i = 0; i < failed.length; i++) {
      if (await downloadOne(failed[i]!, i + 1)) ok++;
      await sleep(150);
    }
    setNotice(`Retried: ${ok} of ${failed.length} saved.`);
  }

  async function copyImage(src: string) {
    try {
      const response = await browser.runtime.sendMessage({ type: 'mediagrab:copy-image', src });
      setNotice(response?.ok ? 'Image copied. Paste it anywhere.' : response?.error || 'Could not copy this image.');
    } catch {
      setNotice('Could not copy this image.');
    }
  }

  async function sendToYtdlp(media: ScrapedMedia) {
    const url = media.tweetId ? `https://x.com/i/status/${media.tweetId}` : media.src;
    try {
      const response = await browser.runtime.sendMessage({
        type: 'mediagrab:ytdlp-start',
        url,
        quality: 'best',
        title,
      });
      setNotice(
        response?.ok
          ? 'Sent to yt-dlp. You will get a notification when the merge finishes.'
          : response?.error || 'The yt-dlp helper is not installed.'
      );
    } catch {
      setNotice('The yt-dlp helper is not installed.');
    }
  }

  async function downloadZip() {
    if (!selectedImages.length) return;
    const images: ScrapedImage[] = selectedImages.map((item) => ({
      src: item.src,
      originalName: getOriginalName(item.src),
      ext: item.ext || 'jpg',
      width: item.width,
      height: item.height,
      format: (item.ext || 'jpg').toUpperCase(),
      alt: item.alt,
    }));

    setNotice('Building ZIP…');
    try {
      const response = await browser.runtime.sendMessage({
        type: 'download-batch-zip',
        images,
        pageTitle: title,
      });
      setNotice(response?.ok ? `ZIP saved with ${response.count} images.` : response?.error || 'ZIP failed.');
    } catch (error) {
      setNotice(String(error));
    }
  }

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-surface">
        <div className="flex items-center gap-2.5 text-[13px] text-ink-soft">
          <Spinner />
          Reading page media…
        </div>
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className="grid min-h-screen place-items-center bg-surface px-6 text-center text-ink">
        <div className="max-w-sm">
          <Mark size={40} />
          <h1 className="mt-4 text-[17px] font-semibold tracking-[-0.01em]">Nothing to show</h1>
          <p className="m-0 mt-1.5 text-[13px] leading-relaxed text-ink-soft">
            Open a page, scan it from the MediaGrab popup, then choose Review &amp; save.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface pb-24 text-ink">
      <header className="sticky top-0 z-20 border-b border-line bg-surface/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-5 py-3">
          <Mark size={24} />
          <div className="min-w-0 flex-1">
            <h1 className="m-0 truncate text-[14px] font-semibold tracking-[-0.01em]" title={title}>
              {counts.total} media from {title || 'this page'}
            </h1>
            <p className="m-0 text-[11px] text-ink-soft">
              {plural(counts.images, 'image')} · {plural(counts.videos, 'video')} · {plural(counts.gifs, 'GIF')}
              {savedCount > 0 && <span className="text-ink-soft"> · {savedCount} already saved</span>}
              {sourceUrl && (
                <>
                  {' · '}
                  <a href={sourceUrl} target="_blank" rel="noreferrer" className="underline-offset-2 hover:text-ink hover:underline">
                    open source
                  </a>
                </>
              )}
            </p>
          </div>

          <label className="relative">
            <svg
              viewBox="0 0 24 24"
              width="14"
              height="14"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              aria-hidden="true"
              className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-soft"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" strokeLinecap="round" />
            </svg>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search media"
              className="h-9 w-52 rounded-lg border border-line bg-surface-2 pl-8 pr-3 text-[12px] text-ink outline-none transition-colors duration-150 placeholder:text-ink-soft/70 focus:border-ink"
            />
          </label>

          <div className="flex items-center gap-0.5 rounded-lg bg-surface-2 p-0.5">
            {FILTERS.map((entry) => (
              <button
                key={entry.id}
                type="button"
                onClick={() => setFilter(entry.id)}
                className={cn(
                  'h-7 rounded-[7px] px-2.5 text-[11.5px] font-medium transition-colors duration-150',
                  filter === entry.id
                    ? 'bg-surface text-ink shadow-sm'
                    : 'text-ink-soft hover:text-ink'
                )}
              >
                {entry.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mx-auto flex max-w-7xl items-center gap-3 px-5 pb-2 text-[11.5px]">
          <button type="button" onClick={selectAll} className="font-medium hover:text-ink">
            Select all
          </button>
          <span className="h-3 w-px bg-line" />
          <button type="button" onClick={clearSelection} className="font-medium hover:text-ink">
            Clear
          </button>
          <span className="ml-auto text-ink-soft">
            {selectedVisible.length} of {visible.length} selected
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-5 py-4">
        <div className="grid grid-cols-[repeat(auto-fill,minmax(184px,1fr))] gap-3">
          {visible.map((item) => {
            const isSelected = selected.has(item.id);
            const itemStatus = status[item.id] || 'idle';
            const isSaved = savedKeys.has(mediaKey(item.src));
            const disabled = item.unsupported === 'hls-only';

            return (
              <article
                key={item.id}
                className={cn(
                  'group relative overflow-hidden rounded-xl border bg-surface transition-shadow duration-200',
                  isSelected ? 'border-ink/70' : 'border-line hover:shadow-[var(--shadow-soft)]'
                )}
              >
                <button
                  type="button"
                  onClick={() => setPreview(item)}
                  className="block w-full text-left"
                  aria-label={`Preview ${item.kind}`}
                >
                  <div className="relative aspect-[4/3] w-full overflow-hidden bg-surface-2">
                    {item.poster || item.kind === 'image' ? (
                      <img
                        src={item.kind === 'image' ? item.src : item.poster}
                        alt={item.alt || ''}
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-300 ease-[var(--ease-out)]"
                      />
                    ) : (
                      <div className="grid h-full w-full place-items-center text-ink-soft">
                        <PlayIcon size={26} />
                      </div>
                    )}

                    <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-md bg-black/65 px-1.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-wide text-white backdrop-blur-sm">
                      {item.kind === 'image' ? 'Photo' : item.kind}
                    </span>

                    {item.durationMs ? (
                      <span className="absolute bottom-2 right-2 rounded bg-black/65 px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-white">
                        {formatDuration(item.durationMs)}
                      </span>
                    ) : null}

                    {isSaved && (
                      <span className="absolute bottom-2 left-2 rounded bg-black/70 px-1.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-wide text-white">
                        saved
                      </span>
                    )}

                    {disabled && (
                      <span className="absolute inset-x-2 bottom-2 rounded border border-white/20 bg-black/75 px-2 py-1 text-[10px] font-medium text-white">
                        HLS only — 2.1
                      </span>
                    )}
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => toggle(item.id)}
                  disabled={disabled}
                  aria-pressed={isSelected}
                  aria-label={isSelected ? 'Deselect item' : 'Select item'}
                  className={cn(
                    'absolute right-2 top-2 grid h-[22px] w-[22px] place-items-center rounded-md border transition-colors duration-150',
                    isSelected
                      ? 'border-ink bg-ink text-surface'
                      : 'border-white/70 bg-black/35 text-transparent hover:bg-black/55'
                  )}
                >
                  <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor" aria-hidden="true">
                    <path d="M9.6 16.8 5.8 13l-1.4 1.4 5.2 5.2L21 8.2 19.6 6.8z" />
                  </svg>
                </button>

                <div className="flex items-center justify-between gap-2 px-2.5 py-2">
                  <div className="min-w-0">
                    <p className="m-0 truncate text-[11.5px] font-medium">
                      {item.author ? `@${item.author}` : item.kind === 'image' ? 'Image' : item.kind.toUpperCase()}
                    </p>
                    <p className="m-0 text-[10.5px] text-ink-soft">
                      {item.width && item.height ? `${item.width}×${item.height}` : 'size unknown'}
                      {itemStatus === 'done' && <span> · saved</span>}
                      {itemStatus === 'error' && <span className="text-danger"> · failed</span>}
                      {itemStatus === 'queued' && ' · working…'}
                    </p>
                  </div>

                  {item.kind === 'image' && (
                    <IconButton label="Copy image" onClick={() => copyImage(item.src)}>
                      <CopyIcon />
                    </IconButton>
                  )}

                  {disabled ? (
                    <button
                      type="button"
                      onClick={() => sendToYtdlp(item)}
                      className="rounded-md border border-line px-1.5 py-1 text-[10px] font-semibold text-ink-soft transition-colors hover:border-ink/30 hover:text-ink"
                      title="Download this stream with yt-dlp"
                    >
                      yt-dlp
                    </button>
                  ) : (
                    <IconButton
                      label="Download item"
                      disabled={itemStatus === 'queued'}
                      onClick={() => downloadOne(item, 1)}
                    >
                      <DownloadIcon />
                    </IconButton>
                  )}
                </div>
              </article>
            );
          })}
        </div>

        {!visible.length && (
          <p className="py-20 text-center text-[13px] text-ink-soft">Nothing matches that filter.</p>
        )}
      </main>

      <footer className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-5 py-3">
          <p className="m-0 text-[12px] text-ink-soft">
            {notice || (
              <>
                <span className="font-semibold text-ink">{selectedVisible.length}</span> selected
                {savedCount > 0 && <span className="text-ink-soft"> · saved items excluded</span>}
              </>
            )}
          </p>
          <div className="flex items-center gap-2">
            {failed.length > 0 && (
              <Button variant="danger" size="sm" onClick={retryFailed}>
                Retry failed ({failed.length})
              </Button>
            )}
            <Button variant="secondary" size="sm" disabled={!selectedImages.length} onClick={downloadZip}>
              ZIP images ({selectedImages.length})
            </Button>
            <Button variant="primary" size="sm" className="px-3.5" disabled={!selectedVisible.length} onClick={downloadSelected}>
              Download selected
            </Button>
          </div>
        </div>
      </footer>

      {preview && (
        <div
          className="fixed inset-0 z-40 grid place-items-center bg-black/75 p-6 backdrop-blur-sm animate-[mg-fade-in_160ms_var(--ease-out)]"
          onClick={() => setPreview(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="relative max-h-full w-full max-w-4xl"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setPreview(null)}
              aria-label="Close preview"
              className="absolute -top-3 right-0 z-10 grid h-8 w-8 place-items-center rounded-full bg-white/10 text-white backdrop-blur transition-colors hover:bg-white/20"
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" />
              </svg>
            </button>

            {preview.kind === 'image' ? (
              <img
                src={preview.src}
                alt={preview.alt || ''}
                className="max-h-[78vh] w-full rounded-xl object-contain bg-black"
              />
            ) : (
              <video
                src={preview.unsupported === 'hls-only' ? undefined : preview.src}
                poster={preview.poster}
                controls
                autoPlay
                className="max-h-[78vh] w-full rounded-xl bg-black"
              />
            )}

            <div className="mt-3 flex items-center justify-between gap-3 text-white">
              <span className="text-[12px] text-white/80">
                {preview.author ? `@${preview.author}` : ''}
                {preview.width && preview.height ? ` · ${preview.width}×${preview.height}` : ''}
                {preview.durationMs ? ` · ${formatDuration(preview.durationMs)}` : ''}
              </span>
              <div className="flex gap-2">
                {preview.kind === 'image' && (
                  <button
                    type="button"
                    onClick={() => copyImage(preview.src)}
                    className="h-8 rounded-lg border border-white/40 px-3 text-[12px] font-semibold text-white transition-colors hover:bg-white/10"
                  >
                    Copy image
                  </button>
                )}
                <button
                  type="button"
                  onClick={() =>
                    preview.unsupported === 'hls-only' ? sendToYtdlp(preview) : downloadOne(preview, 1)
                  }
                  className="h-8 rounded-lg bg-white px-3 text-[12px] font-semibold text-black transition-opacity hover:opacity-90 active:scale-[0.98]"
                >
                  {preview.unsupported === 'hls-only' ? 'Download with yt-dlp' : 'Download'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function plural(count: number, word: string): string {
  return `${count} ${word}${count === 1 ? '' : 's'}`;
}

function formatDuration(durationMs: number): string {
  const total = Math.round(durationMs / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function Spinner() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.2" className="animate-spin">
      <circle cx="12" cy="12" r="8" strokeOpacity="0.25" />
      <path d="M20 12a8 8 0 0 0-8-8" strokeLinecap="round" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
      <path d="M16 1H4a2 2 0 0 0-2 2v12h2V3h12V1Zm3 4H8a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2Zm0 16H8V7h11v14Z" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
      <path d="M12 3a1 1 0 0 1 1 1v9.6l3.3-3.3a1 1 0 1 1 1.4 1.4l-5 5a1 1 0 0 1-1.4 0l-5-5a1 1 0 1 1 1.4-1.4L11 13.6V4a1 1 0 0 1 1-1Zm-7 15a1 1 0 0 1 1 1v1h12v-1a1 1 0 1 1 2 0v1.5A1.5 1.5 0 0 1 18.5 22h-13A1.5 1.5 0 0 1 4 20.5V19a1 1 0 0 1 1-1Z" />
    </svg>
  );
}

function PlayIcon({ size = 24 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden="true">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}
