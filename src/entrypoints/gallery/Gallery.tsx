import { useEffect, useMemo, useState } from 'react';
import type { ScrapedMedia } from '~/utils/media';
import type { ScrapedImage } from '~/utils/storage';
import { getOriginalName } from '~/utils/filename';
import { countMedia, loadGalleryPayload } from '~/utils/gallery';

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

  useEffect(() => {
    (async () => {
      const payload = await loadGalleryPayload();
      if (payload) {
        setItems(payload.items);
        setTitle(payload.title || '');
        setSourceUrl(payload.url || '');
        setSelected(new Set(payload.items.filter((item) => !item.unsupported).map((item) => item.id)));
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
      return [item.alt, item.author, item.tweetId, item.src].filter(Boolean).join(' ').toLowerCase().includes(needle);
    });
  }, [items, filter, query]);

  const counts = countMedia(items);
  const selectedVisible = visible.filter((item) => selected.has(item.id) && !item.unsupported);
  const selectedImages = selectedVisible.filter((item) => item.kind === 'image');

  function toggle(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAll() {
    setSelected(new Set(visible.map((item) => item.id)));
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
    setNotice(`Finished: ${ok} of ${selectedVisible.length} saved.`);
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
    return <div className="grid min-h-screen place-items-center bg-surface text-ink-soft">Loading media…</div>;
  }

  if (!items.length) {
    return (
      <div className="grid min-h-screen place-items-center bg-surface px-6 text-center text-ink">
        <div>
          <h1 className="m-0 text-lg font-bold">Nothing to show</h1>
          <p className="mx-auto mt-2 max-w-sm text-sm text-ink-soft">
            Open a page, scan it from the MediaGrab popup, then choose Review &amp; save.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface pb-24 text-ink">
      <header className="sticky top-0 z-20 border-b border-line bg-surface/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-5 py-3">
          <div className="min-w-0 flex-1">
            <h1 className="m-0 truncate text-[15px] font-bold">
              {counts.total} media from {title || 'this page'}
            </h1>
            <p className="m-0 flex items-center gap-2 text-[12px] text-ink-soft">
              <span>
                {counts.images} images · {counts.videos} videos · {counts.gifs} GIFs
              </span>
              {sourceUrl && (
                <a href={sourceUrl} target="_blank" rel="noreferrer" className="truncate underline hover:text-accent">
                  source
                </a>
              )}
            </p>
          </div>

          <div className="flex items-center gap-1.5">
            {FILTERS.map((entry) => (
              <button
                key={entry.id}
                type="button"
                onClick={() => setFilter(entry.id)}
                className={`rounded-full px-2.5 py-1 text-[12px] font-semibold transition-colors ${
                  filter === entry.id
                    ? 'bg-ink text-surface'
                    : 'border border-line bg-surface-2 text-ink-soft hover:text-ink'
                }`}
              >
                {entry.label}
              </button>
            ))}
          </div>

          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search"
            className="h-8 w-40 rounded-lg border border-line bg-surface-2 px-3 text-[12px] outline-none focus:border-accent"
          />
        </div>

        <div className="mx-auto flex max-w-6xl items-center gap-3 px-5 pb-2 text-[12px]">
          <button type="button" onClick={selectAll} className="font-semibold hover:text-accent">
            Select all
          </button>
          <button type="button" onClick={clearSelection} className="font-semibold hover:text-accent">
            Clear
          </button>
          <span className="text-ink-soft">
            {selectedVisible.length} of {visible.length} selected
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-4">
        <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-3">
          {visible.map((item) => {
            const isSelected = selected.has(item.id);
            const itemStatus = status[item.id] || 'idle';
            return (
              <article
                key={item.id}
                className={`group relative overflow-hidden rounded-xl border bg-surface-2 transition-shadow ${
                  isSelected ? 'border-accent ring-1 ring-accent' : 'border-line'
                }`}
              >
                <button
                  type="button"
                  onClick={() => setPreview(item)}
                  className="block w-full text-left"
                  aria-label={`Preview ${item.kind}`}
                >
                  <div className="relative aspect-[4/3] w-full overflow-hidden bg-black/5">
                    {item.poster || item.kind === 'image' ? (
                      <img
                        src={item.kind === 'image' ? item.src : item.poster}
                        alt={item.alt || ''}
                        loading="lazy"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="grid h-full w-full place-items-center text-ink-soft">
                        <svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor" aria-hidden="true">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      </div>
                    )}

                    <span className="absolute left-2 top-2 rounded-md bg-black/70 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                      {item.kind === 'video' ? 'video' : item.kind === 'gif' ? 'gif' : 'photo'}
                    </span>

                    {item.durationMs ? (
                      <span className="absolute bottom-2 right-2 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                        {formatDuration(item.durationMs)}
                      </span>
                    ) : null}

                    {item.unsupported === 'hls-only' && (
                      <span className="absolute inset-x-2 bottom-2 rounded bg-danger/90 px-2 py-1 text-[10px] font-semibold text-white">
                        HLS only — not supported yet
                      </span>
                    )}
                  </div>
                </button>

                <label className="absolute right-2 top-2 grid h-5 w-5 cursor-pointer place-items-center rounded-md border border-white/60 bg-black/50">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    disabled={item.unsupported === 'hls-only'}
                    onChange={() => toggle(item.id)}
                    className="h-3.5 w-3.5 accent-accent disabled:opacity-40"
                  />
                </label>

                <div className="flex items-center justify-between gap-2 px-2.5 py-2">
                  <div className="min-w-0">
                    <p className="m-0 truncate text-[11.5px] font-semibold">
                      {item.author ? `@${item.author}` : item.kind === 'image' ? 'Image' : item.kind.toUpperCase()}
                    </p>
                    <p className="m-0 text-[10.5px] text-ink-soft">
                      {item.width && item.height ? `${item.width}×${item.height}` : 'size unknown'}
                      {itemStatus === 'done' ? ' · saved' : itemStatus === 'error' ? ' · failed' : ''}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => downloadOne(item, 1)}
                    disabled={item.unsupported === 'hls-only' || itemStatus === 'queued'}
                    className="rounded-md px-1.5 py-1 text-ink-soft hover:bg-surface hover:text-accent disabled:opacity-40"
                    aria-label="Download"
                  >
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
                      <path d="M12 3a1 1 0 0 1 1 1v9.6l3.3-3.3a1 1 0 1 1 1.4 1.4l-5 5a1 1 0 0 1-1.4 0l-5-5a1 1 0 1 1 1.4-1.4L11 13.6V4a1 1 0 0 1 1-1Zm-7 15a1 1 0 0 1 1 1v1h12v-1a1 1 0 1 1 2 0v1.5A1.5 1.5 0 0 1 18.5 22h-13A1.5 1.5 0 0 1 4 20.5V19a1 1 0 0 1 1-1Z" />
                    </svg>
                  </button>
                </div>
              </article>
            );
          })}
        </div>

        {!visible.length && (
          <p className="py-16 text-center text-sm text-ink-soft">Nothing matches that filter.</p>
        )}
      </main>

      <footer className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface/95 px-5 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
          <p className="m-0 text-[12px] text-ink-soft">{notice || `${selectedVisible.length} selected`}</p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={downloadZip}
              disabled={!selectedImages.length}
              className="rounded-lg border border-line bg-surface-2 px-3 py-1.5 text-[12px] font-semibold disabled:opacity-40"
            >
              ZIP images ({selectedImages.length})
            </button>
            <button
              type="button"
              onClick={downloadSelected}
              disabled={!selectedVisible.length}
              className="rounded-lg bg-ink px-4 py-1.5 text-[12px] font-semibold text-surface disabled:opacity-40"
            >
              Download selected
            </button>
          </div>
        </div>
      </footer>

      {preview && (
        <div
          className="fixed inset-0 z-40 grid place-items-center bg-black/70 p-6"
          onClick={() => setPreview(null)}
          role="dialog"
          aria-modal="true"
        >
          <div className="max-h-full w-full max-w-3xl" onClick={(event) => event.stopPropagation()}>
            {preview.kind === 'image' ? (
              <img src={preview.src} alt={preview.alt || ''} className="max-h-[80vh] w-full rounded-xl object-contain" />
            ) : (
              <video
                src={preview.unsupported === 'hls-only' ? undefined : preview.src}
                poster={preview.poster}
                controls
                autoPlay
                className="max-h-[80vh] w-full rounded-xl bg-black"
              />
            )}
            <div className="mt-3 flex items-center justify-between text-white">
              <span className="text-[12px]">
                {preview.width && preview.height ? `${preview.width}×${preview.height}` : ''}
                {preview.durationMs ? ` · ${formatDuration(preview.durationMs)}` : ''}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => downloadOne(preview, 1)}
                  disabled={preview.unsupported === 'hls-only'}
                  className="rounded-lg bg-white px-3 py-1.5 text-[12px] font-semibold text-black disabled:opacity-40"
                >
                  Download
                </button>
                <button
                  type="button"
                  onClick={() => setPreview(null)}
                  className="rounded-lg border border-white/40 px-3 py-1.5 text-[12px] font-semibold"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function formatDuration(durationMs: number): string {
  const total = Math.round(durationMs / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
