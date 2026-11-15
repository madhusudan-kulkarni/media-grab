import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { VideoQuality } from '~/utils/storage';
import { settings } from '~/utils/storage';
import { clearHistory, getHistory } from '~/utils/history';

const DEFAULT_TEMPLATE = '${domain}_${timestamp}_${index}.${ext}';

export default function Options() {
  const [template, setTemplate] = useState(DEFAULT_TEMPLATE);
  const [quality, setQuality] = useState<VideoQuality>('best');
  const [hover, setHover] = useState(true);
  const [actionButton, setActionButton] = useState(true);
  const [subfolder, setSubfolder] = useState(true);
  const [granted, setGranted] = useState(true);
  const [saved, setSaved] = useState(false);
  const [historyCount, setHistoryCount] = useState(0);

  useEffect(() => {
    (async () => {
      setTemplate(await settings.filenameTemplate.getValue());
      setQuality((await settings.videoQuality.getValue()) as VideoQuality);
      setHover(await settings.hoverOverlayEnabled.getValue());
      setActionButton(await settings.xActionButton.getValue());
      setSubfolder(await settings.batchSubfolder.getValue());
      setGranted(await browser.permissions.contains({ origins: ['<all_urls>'] }).catch(() => true));
      setHistoryCount((await getHistory()).length);
    })();
  }, []);

  async function saveTemplate(value: string) {
    setTemplate(value);
    await settings.filenameTemplate.setValue(value || DEFAULT_TEMPLATE);
    flashSaved();
  }

  function flashSaved() {
    setSaved(true);
    setTimeout(() => setSaved(false), 1200);
  }

  return (
    <div className="min-h-screen bg-surface-2 px-5 py-8 text-ink">
      <div className="mx-auto max-w-2xl">
        <header className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="m-0 text-xl font-bold tracking-tight">MediaGrab settings</h1>
            <p className="m-0 text-[12.5px] text-ink-soft">Saved automatically.</p>
          </div>
          <span className="text-[12px] text-ink-soft">{saved ? 'Saved' : `v${browser.runtime.getManifest().version}`}</span>
        </header>

        <Section title="Site access" hint="Firefox treats this as opt-in. Without it no page can be scanned.">
          <div className="flex items-center justify-between gap-4">
            <span className="text-[13px]">{granted ? 'Enabled for all sites' : 'Not granted — nothing can run'}</span>
            {!granted && (
              <button
                type="button"
                onClick={async () => {
                  const ok = await browser.permissions.request({ origins: ['<all_urls>'] });
                  setGranted(ok);
                }}
                className="rounded-lg bg-danger px-3 py-1.5 text-[12px] font-semibold text-white"
              >
                Enable
              </button>
            )}
          </div>
        </Section>

        <Section title="Downloads" hint="Filenames and folders for saved media.">
          <label className="block">
            <span className="text-[12.5px] font-semibold">Filename template</span>
            <input
              value={template}
              onChange={(event) => setTemplate(event.target.value)}
              onBlur={(event) => saveTemplate(event.target.value)}
              spellCheck={false}
              className="mt-1.5 w-full rounded-lg border border-line bg-surface px-3 py-2 font-mono text-[12.5px] outline-none focus:border-accent"
            />
          </label>
          <p className="m-0 mt-2 text-[11.5px] leading-relaxed text-ink-soft">
            Tokens: {'${original_name} ${ext} ${domain} ${timestamp} ${date} ${time} ${page_title} ${width} ${height} ${author} ${tweet_id} ${media_id} ${index} ${index_00}'}
          </p>

          <div className="mt-4 flex items-center justify-between gap-4">
            <div>
              <p className="m-0 text-[12.5px] font-semibold">Subfolder per page</p>
              <p className="m-0 text-[11.5px] text-ink-soft">Group batches under MediaGrab/site/page.</p>
            </div>
            <Switch
              checked={subfolder}
              onChange={async (value) => {
                setSubfolder(value);
                await settings.batchSubfolder.setValue(value);
              }}
              label="Subfolder per page"
            />
          </div>
        </Section>

        <Section title="Video" hint="Progressive MP4 renditions. HLS-only posts arrive in 2.1.">
          <div className="flex items-center justify-between gap-4">
            <span className="text-[12.5px] font-semibold">Preferred quality</span>
            <select
              value={quality}
              onChange={async (event) => {
                const value = event.target.value as VideoQuality;
                setQuality(value);
                await settings.videoQuality.setValue(value);
                flashSaved();
              }}
              className="rounded-lg border border-line bg-surface px-2 py-1.5 text-[12.5px]"
            >
              <option value="best">Best available</option>
              <option value="1080">1080p</option>
              <option value="720">720p</option>
              <option value="480">480p</option>
              <option value="360">360p</option>
            </select>
          </div>
        </Section>

        <Section title="On the page" hint="Two ways to save something without opening the popup.">
          <Row
            title="Hover save button"
            hint="Appears over images and videos as you move the pointer."
            checked={hover}
            onChange={async (value) => {
              setHover(value);
              await settings.hoverOverlayEnabled.setValue(value);
            }}
          />
          <Row
            title="Save button on posts"
            hint="Adds a download icon to each media post on X."
            checked={actionButton}
            onChange={async (value) => {
              setActionButton(value);
              await settings.xActionButton.setValue(value);
            }}
          />
        </Section>

        <Section title="History" hint="Used to mark media you already saved and skip it next time.">
          <div className="flex items-center justify-between gap-4">
            <span className="text-[12.5px]">{historyCount} saved item(s) remembered</span>
            <button
              type="button"
              onClick={async () => {
                await clearHistory();
                setHistoryCount(0);
                flashSaved();
              }}
              className="rounded-lg border border-line bg-surface px-3 py-1.5 text-[12px] font-semibold"
            >
              Clear history
            </button>
          </div>
        </Section>

        <Section title="Reset" hint="Restores the default filename template.">
          <button
            type="button"
            onClick={() => saveTemplate(DEFAULT_TEMPLATE)}
            className="rounded-lg border border-line bg-surface px-3 py-1.5 text-[12px] font-semibold"
          >
            Restore default template
          </button>
        </Section>
      </div>
    </div>
  );
}

function Section({ title, hint, children }: { title: string; hint: string; children: ReactNode }) {
  return (
    <section className="mb-4 rounded-xl border border-line bg-surface p-4">
      <h2 className="m-0 text-[13px] font-bold">{title}</h2>
      <p className="m-0 mb-3 text-[11.5px] text-ink-soft">{hint}</p>
      {children}
    </section>
  );
}

function Row({
  title,
  hint,
  checked,
  onChange,
}: {
  title: string;
  hint: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-1.5">
      <div>
        <p className="m-0 text-[12.5px] font-semibold">{title}</p>
        <p className="m-0 text-[11.5px] text-ink-soft">{hint}</p>
      </div>
      <Switch checked={checked} onChange={onChange} label={title} />
    </div>
  );
}

function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-[22px] w-[38px] shrink-0 rounded-full transition-colors ${checked ? 'bg-accent' : 'bg-line'}`}
    >
      <span
        className={`absolute top-[3px] h-4 w-4 rounded-full bg-white transition-transform ${
          checked ? 'translate-x-[19px]' : 'translate-x-[3px]'
        }`}
      />
    </button>
  );
}
