import { useEffect, useState } from 'react';
import type { ScrapedMedia } from '~/utils/media';
import type { VideoQuality } from '~/utils/storage';
import { settings } from '~/utils/storage';
import { countMedia, storeGalleryPayload } from '~/utils/gallery';
import { Button, cn, Mark, Row, Select, Switch } from '~/ui/primitives';

const COLLECT_TIMEOUT = 4000;

export default function Popup() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<ScrapedMedia[]>([]);
  const [granted, setGranted] = useState(true);
  const [error, setError] = useState('');
  const [tabTitle, setTabTitle] = useState('');
  const [hoverEnabled, setHoverEnabled] = useState(true);
  const [xButtonEnabled, setXButtonEnabled] = useState(true);
  const [quality, setQuality] = useState<VideoQuality>('best');
  const [busy, setBusy] = useState(false);

  const counts = countMedia(items);
  const version = browser.runtime.getManifest().version;

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const [permission, hoverValue, xValue, qualityValue] = await Promise.all([
        browser.permissions.contains({ origins: ['<all_urls>'] }).catch(() => true),
        settings.hoverOverlayEnabled.getValue(),
        settings.xActionButton.getValue(),
        settings.videoQuality.getValue(),
      ]);
      if (cancelled) return;
      setGranted(permission);
      setHoverEnabled(hoverValue);
      setXButtonEnabled(xValue);
      setQuality(qualityValue as VideoQuality);
      await scan();
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  async function scan() {
    setLoading(true);
    setError('');

    try {
      const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
      setTabTitle(tab?.title || '');
      if (!tab?.id) {
        setError('No active tab.');
        return;
      }

      const response = await withTimeout(
        browser.tabs.sendMessage(tab.id, { type: 'mediagrab:collect' }),
        COLLECT_TIMEOUT
      );
      if (response?.ok === false) throw new Error(response.error || 'Scan failed');
      setItems((response?.items as ScrapedMedia[]) || []);
    } catch {
      setItems([]);
      setError('Reload this page once so MediaGrab can scan it.');
    } finally {
      setLoading(false);
    }
  }

  async function reviewAndSave() {
    if (!items.length || busy) return;
    setBusy(true);
    try {
      const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
      await storeGalleryPayload({ items, title: tab?.title, url: tab?.url, createdAt: Date.now() });
      await browser.tabs.create({ url: browser.runtime.getURL('/gallery.html') });
      window.close();
    } finally {
      setBusy(false);
    }
  }

  async function enableAccess() {
    const ok = await browser.permissions.request({ origins: ['<all_urls>'] });
    setGranted(ok);
    if (ok) await scan();
  }

  return (
    <div className="w-[360px] bg-surface text-ink">
      <header className="flex items-center justify-between px-4 pt-3.5 pb-2.5">
        <div className="flex items-center gap-2.5">
          <Mark size={26} />
          <div>
            <h1 className="m-0 text-[14.5px] font-semibold leading-none tracking-[-0.01em]">MediaGrab</h1>
            <p className="m-0 mt-1 text-[10.5px] leading-none text-ink-soft">v{version}</p>
          </div>
        </div>
      </header>

      {!granted && (
        <div className="mx-4 mb-3 flex items-center gap-3 rounded-xl border border-danger/25 bg-danger/10 px-3 py-2.5">
          <p className="m-0 flex-1 text-[11.5px] leading-snug text-danger">
            Site access is off. MediaGrab cannot read this page.
          </p>
          <Button variant="danger" size="sm" onClick={enableAccess}>
            Enable
          </Button>
        </div>
      )}

      <section className="px-4 pb-3">
        {loading ? (
          <div className="rounded-2xl border border-line bg-surface-2 px-4 py-5">
            <div className="h-3 w-24 animate-pulse rounded bg-line" />
            <div className="mt-3 h-7 w-16 animate-pulse rounded bg-line" />
            <div className="mt-3 h-2.5 w-40 animate-pulse rounded bg-line" />
          </div>
        ) : items.length ? (
          <div className="rounded-2xl border border-line bg-surface-2 px-4 py-4">
            <div className="flex items-baseline gap-2">
              <span className="text-[30px] font-bold leading-none tracking-[-0.03em]">{counts.total}</span>
              <span className="text-[12px] font-medium text-ink-soft">
                {counts.total === 1 ? 'media item' : 'media items'}
              </span>
            </div>

            <div className="mt-3 flex flex-wrap gap-1.5">
              {counts.images > 0 && <Stat color="bg-accent" label={`${counts.images} images`} />}
              {counts.videos > 0 && <Stat color="bg-[#8b5cf6]" label={`${counts.videos} videos`} />}
              {counts.gifs > 0 && <Stat color="bg-success" label={`${counts.gifs} GIFs`} />}
            </div>

            {tabTitle && (
              <p className="m-0 mt-2.5 truncate text-[11px] text-ink-soft" title={tabTitle}>
                {tabTitle}
              </p>
            )}
          </div>
        ) : (
          <div className="rounded-2xl border border-line bg-surface-2 px-4 py-4">
            <p className="m-0 text-[13px] font-semibold">No media found here</p>
            <p className="m-0 mt-1 text-[11.5px] leading-relaxed text-ink-soft">{error}</p>
            <Button variant="secondary" size="sm" className="mt-3" onClick={scan}>
              Scan again
            </Button>
          </div>
        )}
      </section>

      <div className="px-4 pb-2">
        <Button
          variant="primary"
          className="h-10 w-full justify-between px-4"
          disabled={!items.length || busy}
          onClick={reviewAndSave}
        >
          <span>{busy ? 'Opening gallery…' : 'Review & save'}</span>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
            <path d="M8.6 4.6 16 12l-7.4 7.4-1.4-1.4L13.2 12 7.2 6z" />
          </svg>
        </Button>

        {items.length > 0 && (
          <button
            type="button"
            onClick={scan}
            className="mt-1 flex h-8 w-full items-center justify-center gap-1.5 rounded-lg text-[11.5px] font-medium text-ink-soft transition-colors duration-150 hover:bg-surface-2 hover:text-ink"
          >
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
              <path d="M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Rescan page
          </button>
        )}
      </div>

      <div className="mx-4 mt-1 border-t border-line">
        <Row title="Hover save" hint="Button over images and videos">
          <Switch
            checked={hoverEnabled}
            label="Hover save"
            onChange={async (value) => {
              setHoverEnabled(value);
              await settings.hoverOverlayEnabled.setValue(value);
            }}
          />
        </Row>
        <Row title="Save button on posts" hint="On X and compatible sites">
          <Switch
            checked={xButtonEnabled}
            label="Save button on posts"
            onChange={async (value) => {
              setXButtonEnabled(value);
              await settings.xActionButton.setValue(value);
            }}
          />
        </Row>
        <Row title="Video quality" hint="Applied to video posts">
          <Select
            aria-label="Video quality"
            value={quality}
            onChange={async (event) => {
              const value = event.target.value as VideoQuality;
              setQuality(value);
              await settings.videoQuality.setValue(value);
            }}
          >
            <option value="best">Best</option>
            <option value="1080">1080p</option>
            <option value="720">720p</option>
            <option value="480">480p</option>
            <option value="360">360p</option>
          </Select>
        </Row>
      </div>

      <footer className="mt-1 flex items-center justify-between border-t border-line px-4 py-2.5">
        <Button
          variant="ghost"
          size="sm"
          className="px-1.5 text-[11.5px]"
          onClick={() => browser.runtime.openOptionsPage()}
        >
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" />
          </svg>
          Settings
        </Button>
        <a
          href="https://github.com/madhusudan-kulkarni/image-grab"
          target="_blank"
          rel="noreferrer"
          className="rounded-md px-1.5 py-1 text-[11.5px] font-medium text-ink-soft transition-colors duration-150 hover:bg-surface-2 hover:text-ink"
        >
          GitHub
        </a>
      </footer>
    </div>
  );
}

function Stat({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-2 py-0.5 text-[10.5px] font-medium text-ink-soft">
      <span className={cn('h-1.5 w-1.5 rounded-full', color)} />
      {label}
    </span>
  );
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error('timeout')), ms);
    }),
  ]);
}
