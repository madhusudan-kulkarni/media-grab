import { useEffect, useMemo, useState } from 'react';
import type { VideoQuality } from '~/utils/storage';
import { settings } from '~/utils/storage';
import { clearHistory, getHistory } from '~/utils/history';
import { formatFilename, getTimestamp } from '~/utils/filename';
import { Button, cn, Mark, Row, Section, Select, Switch } from '~/ui/primitives';

const DEFAULT_TEMPLATE = '${domain}_${timestamp}_${index}.${ext}';

const TOKENS = [
  '${domain}',
  '${timestamp}',
  '${index}',
  '${index_00}',
  '${original_name}',
  '${page_title}',
  '${author}',
  '${tweet_id}',
  '${width}',
  '${height}',
  '${ext}',
];

export default function Options() {
  const [template, setTemplate] = useState(DEFAULT_TEMPLATE);
  const [quality, setQuality] = useState<VideoQuality>('best');
  const [hover, setHover] = useState(true);
  const [actionButton, setActionButton] = useState(true);
  const [subfolder, setSubfolder] = useState(true);
  const [granted, setGranted] = useState(true);
  const [historyCount, setHistoryCount] = useState(0);
  const [saved, setSaved] = useState(false);

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

  const preview = useMemo(
    () =>
      formatFilename(template || DEFAULT_TEMPLATE, {
        originalName: 'clip',
        ext: 'mp4',
        domain: 'x.com',
        timestamp: getTimestamp(),
        index: 1,
        pageTitle: 'Example post',
        width: 720,
        height: 1280,
        author: 'user',
        tweetId: '1600649710662213632',
      }),
    [template]
  );

  async function saveTemplate(value: string) {
    setTemplate(value);
    await settings.filenameTemplate.setValue(value || DEFAULT_TEMPLATE);
    flashSaved();
  }

  function flashSaved() {
    setSaved(true);
    setTimeout(() => setSaved(false), 1400);
  }

  return (
    <div className="min-h-screen bg-surface-2 px-5 py-10 text-ink">
      <div className="mx-auto max-w-[720px]">
        <header className="mb-7 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <Mark size={34} />
            <div>
              <h1 className="m-0 text-[19px] font-semibold tracking-[-0.02em]">MediaGrab settings</h1>
              <p className="m-0 mt-0.5 text-[12px] text-ink-soft">Changes save as you make them.</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span
              className={cn(
                'inline-flex items-center gap-1.5 text-[11.5px] font-medium transition-opacity duration-200',
                saved ? 'text-success opacity-100' : 'opacity-0'
              )}
            >
              <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor" aria-hidden="true">
                <path d="M9.6 16.8 5.8 13l-1.4 1.4 5.2 5.2L21 8.2 19.6 6.8z" />
              </svg>
              Saved
            </span>
            <span className="text-[11.5px] text-ink-soft">v{browser.runtime.getManifest().version}</span>
          </div>
        </header>

        <div className="flex flex-col gap-4">
          <Section title="Site access" hint="Firefox treats this as opt-in. Without it, nothing runs.">
            <Row
              title={granted ? 'Enabled for all sites' : 'Not granted'}
              hint={granted ? 'MediaGrab can read media on the pages you open.' : 'Scanning and save buttons stay off.'}
            >
              {granted ? (
                <span className="inline-flex items-center gap-1.5 text-[11.5px] font-medium text-success">
                  <span className="h-1.5 w-1.5 rounded-full bg-success" />
                  Active
                </span>
              ) : (
                <Button
                  variant="danger"
                  size="sm"
                  onClick={async () => {
                    const ok = await browser.permissions.request({ origins: ['<all_urls>'] });
                    setGranted(ok);
                  }}
                >
                  Enable
                </Button>
              )}
            </Row>
          </Section>

          <Section title="Filenames" hint="Applied to every download. Batch folders group by site and page.">
            <label className="block py-2">
              <span className="text-[12px] font-medium">Template</span>
              <input
                value={template}
                onChange={(event) => setTemplate(event.target.value)}
                onBlur={(event) => saveTemplate(event.target.value)}
                spellCheck={false}
                className={cn(
                  'mt-1.5 h-10 w-full rounded-lg border border-line bg-surface px-3 font-mono text-[12.5px]',
                  'text-ink transition-colors duration-150 focus:border-accent focus:outline-none'
                )}
              />
            </label>

            <div className="flex flex-wrap gap-1.5 pb-2">
              {TOKENS.map((token) => (
                <button
                  key={token}
                  type="button"
                  onClick={() => saveTemplate(`${template}${token}`)}
                  className="rounded-md border border-line bg-surface px-1.5 py-0.5 font-mono text-[10.5px] text-ink-soft transition-colors duration-150 hover:border-accent/40 hover:text-accent active:scale-[0.97]"
                >
                  {token}
                </button>
              ))}
            </div>

            <div className="mb-3 rounded-lg border border-line bg-surface-2 px-3 py-2">
              <p className="m-0 text-[10.5px] uppercase tracking-wide text-ink-soft">Preview</p>
              <p className="m-0 mt-0.5 truncate font-mono text-[12px]">{preview}</p>
            </div>

            <Row title="Subfolder per page" hint="Download under MediaGrab/site/page.">
              <Switch
                checked={subfolder}
                label="Subfolder per page"
                onChange={async (value) => {
                  setSubfolder(value);
                  await settings.batchSubfolder.setValue(value);
                  flashSaved();
                }}
              />
            </Row>
          </Section>

          <Section title="Video" hint="Progressive MP4 renditions. HLS-only posts arrive in 2.1.">
            <Row title="Preferred quality" hint="The closest rendition at or below this cap.">
              <Select
                aria-label="Preferred video quality"
                value={quality}
                onChange={async (event) => {
                  const value = event.target.value as VideoQuality;
                  setQuality(value);
                  await settings.videoQuality.setValue(value);
                  flashSaved();
                }}
              >
                <option value="best">Best available</option>
                <option value="1080">1080p</option>
                <option value="720">720p</option>
                <option value="480">480p</option>
                <option value="360">360p</option>
              </Select>
            </Row>
          </Section>

          <Section title="On the page" hint="Two ways to save without opening the popup.">
            <Row title="Hover save button" hint="Appears over images and videos as you move the pointer.">
              <Switch
                checked={hover}
                label="Hover save button"
                onChange={async (value) => {
                  setHover(value);
                  await settings.hoverOverlayEnabled.setValue(value);
                  flashSaved();
                }}
              />
            </Row>
            <Row title="Save button on posts" hint="Adds a download icon to each media post on X.">
              <Switch
                checked={actionButton}
                label="Save button on posts"
                onChange={async (value) => {
                  setActionButton(value);
                  await settings.xActionButton.setValue(value);
                  flashSaved();
                }}
              />
            </Row>
          </Section>

          <Section title="History" hint="Remembers what you saved so it can be skipped next time.">
            <Row title={`${historyCount} item${historyCount === 1 ? '' : 's'} remembered`} hint="Clearing keeps your files.">
              <Button
                variant="secondary"
                size="sm"
                onClick={async () => {
                  await clearHistory();
                  setHistoryCount(0);
                  flashSaved();
                }}
              >
                Clear
              </Button>
            </Row>
          </Section>

          <Section title="Reset" hint="Restores the default filename template.">
            <Row title="Filename template" hint="Other settings stay as they are.">
              <Button variant="secondary" size="sm" onClick={() => saveTemplate(DEFAULT_TEMPLATE)}>
                Restore default
              </Button>
            </Row>
          </Section>
        </div>

        <footer className="mt-6 flex items-center justify-between text-[11.5px] text-ink-soft">
          <span>Local only. No account, no telemetry.</span>
          <a
            href="https://github.com/madhusudan-kulkarni/image-grab"
            target="_blank"
            rel="noreferrer"
            className="rounded-md px-1.5 py-1 transition-colors hover:bg-surface hover:text-ink"
          >
            GitHub
          </a>
        </footer>
      </div>
    </div>
  );
}
