import { useEffect, useState } from 'react';
import type { ScrapedMedia } from '~/utils/media';
import type { VideoQuality } from '~/utils/storage';
import { settings } from '~/utils/storage';
import { countMedia, storeGalleryPayload } from '~/utils/gallery';

const MEDIA_COLLECT_TIMEOUT = 4000;

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
        MEDIA_COLLECT_TIMEOUT
      );
      if (response?.ok === false) throw new Error(response.error || 'Scan failed');
      setItems((response?.items as ScrapedMedia[]) || []);
    } catch {
      setError('Reload this page once so MediaGrab can scan it.');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  async function reviewAndSave() {
    if (!items.length || busy) return;
    setBusy(true);
    try {
      const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
      await storeGalleryPayload({
        items,
        title: tab?.title,
        url: tab?.url,
        createdAt: Date.now(),
      });
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
      <header className="flex items-center justify-between px-4 pt-3.5 pb-2">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent/10 text-accent">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
              <path d="M12 3a1 1 0 0 1 1 1v9.6l3.3-3.3a1 1 0 1 1 1.4 1.4l-5 5a1 1 0 0 1-1.4 0l-5-5a1 1 0 1 1 1.4-1.4L11 13.6V4a1 1 0 0 1 1-1Zm-7 15a1 1 0 0 1 1 1v1h12v-1a1 1 0 1 1 2 0v1.5A1.5 1.5 0 0 1 18.5 22h-13A1.5 1.5 0 0 1 4 20.5V19a1 1 0 0 1 1-1Z" />
            </svg>
          </span>
          <h1 className="m-0 text-[15px] font-bold tracking-tight">MediaGrab</h1>
        </div>
        <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[10px] font-semibold text-ink-soft">
          v{version}
        </span>
      </header>

      {!granted && (
        <div className="mx-4 mb-2 flex items-center gap-2 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-[12px] text-danger">
          <span className="flex-1">Site access is off, so scanning cannot run.</span>
          <button
            type="button"
            onClick={enableAccess}
            className="rounded-md bg-danger px-2 py-1 text-[11px] font-semibold text-white"
          >
            Enable
          </button>
        </div>
      )}

      <section className="px-4 pb-3">
        {loading ? (
          <div className="rounded-xl border border-line bg-surface-2 px-4 py-4 text-[13px] text-ink-soft">
            Scanning this page…
          </div>
        ) : items.length ? (
          <div className="rounded-xl border border-line bg-surface-2 px-4 py-3.5">
            <div className="text-[26px] font-bold leading-none tracking-tight">
              {counts.total}
              <span className="ml-1.5 text-[13px] font-medium text-ink-soft">
                {counts.total === 1 ? 'item' : 'media items'}
              </span>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] font-medium">
              {counts.images > 0 && <Chip label={`${counts.images} images`} />}
              {counts.videos > 0 && <Chip label={`${counts.videos} videos`} />}
              {counts.gifs > 0 && <Chip label={`${counts.gifs} GIFs`} />}
            </div>
            {tabTitle && <p className="mt-2 truncate text-[11px] text-ink-soft">{tabTitle}</p>}
          </div>
        ) : (
          <div className="rounded-xl border border-line bg-surface-2 px-4 py-4">
            <p className="m-0 text-[13px] font-semibold">No media found on this page</p>
            <p className="m-0 mt-1 text-[12px] leading-snug text-ink-soft">{error}</p>
            <button
              type="button"
              onClick={scan}
              className="mt-2 rounded-lg border border-line bg-surface px-2.5 py-1 text-[11.5px] font-semibold hover:text-accent"
            >
              Scan again
            </button>
          </div>
        )}
      </section>

      <div className="px-4 pb-3">
        <button
          type="button"
          disabled={!items.length || busy}
          onClick={reviewAndSave}
          className="flex w-full items-center justify-between rounded-xl bg-ink px-4 py-2.5 text-[13px] font-semibold text-surface transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
        >
          <span>{busy ? 'Opening…' : 'Review & save'}</span>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
            <path d="M8.6 4.6 16 12l-7.4 7.4-1.4-1.4L13.2 12 7.2 6z" />
          </svg>
        </button>

        {items.length > 0 && (
          <button
            type="button"
            onClick={scan}
            className="mt-1.5 w-full rounded-lg py-1.5 text-[11.5px] font-semibold text-ink-soft hover:text-accent"
          >
            Scan again
          </button>
        )}
      </div>

      <div className="mx-4 border-t border-line py-1">
        <ToggleRow
          label="Hover save"
          hint="Button on images and videos"
          checked={hoverEnabled}
          onChange={async (value) => {
            setHoverEnabled(value);
            await settings.hoverOverlayEnabled.setValue(value);
          }}
        />
        <ToggleRow
          label="Save button on posts"
          hint="X and compatible sites"
          checked={xButtonEnabled}
          onChange={async (value) => {
            setXButtonEnabled(value);
            await settings.xActionButton.setValue(value);
          }}
        />
        <label className="flex items-center justify-between gap-3 py-2">
          <span className="text-[12.5px] font-medium">Video quality</span>
          <select
            value={quality}
            onChange={async (event) => {
              const value = event.target.value as VideoQuality;
              setQuality(value);
              await settings.videoQuality.setValue(value);
            }}
            className="rounded-md border border-line bg-surface px-2 py-1 text-[12px] font-medium"
          >
            <option value="best">Best</option>
            <option value="1080">1080p</option>
            <option value="720">720p</option>
            <option value="480">480p</option>
            <option value="360">360p</option>
          </select>
        </label>
      </div>

      <footer className="flex items-center justify-between border-t border-line px-4 py-2.5 text-[11.5px] font-medium text-ink-soft">
        <button
          type="button"
          onClick={() => browser.runtime.openOptionsPage()}
          className="hover:text-accent"
        >
          Settings
        </button>
        <a
          href="https://github.com/madhusudan-kulkarni/image-grab"
          target="_blank"
          rel="noreferrer"
          className="hover:text-accent"
        >
          GitHub
        </a>
      </footer>
    </div>
  );
}

function Chip({ label }: { label: string }) {
  return (
    <span className="rounded-full border border-line bg-surface px-2 py-0.5 text-ink-soft">{label}</span>
  );
}

function ToggleRow({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <div className="min-w-0">
        <p className="m-0 text-[12.5px] font-medium">{label}</p>
        <p className="m-0 text-[11px] text-ink-soft">{hint}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`relative h-[22px] w-[38px] shrink-0 rounded-full transition-colors ${
          checked ? 'bg-accent' : 'bg-line'
        }`}
      >
        <span
          className={`absolute top-[3px] h-4 w-4 rounded-full bg-white transition-transform ${
            checked ? 'translate-x-[19px]' : 'translate-x-[3px]'
          }`}
        />
      </button>
    </div>
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
