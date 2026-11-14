import { capturedToScraped, formatDuration } from '~/utils/media';
import type { CapturedMedia, ScrapedMedia, VideoQuality } from '~/utils/media';
import { settings } from '~/utils/storage';

const CHANNEL = '__mediagrab';
const ICON_IDLE = `<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M12 3a1 1 0 0 1 1 1v9.6l3.3-3.3a1 1 0 1 1 1.4 1.4l-5 5a1 1 0 0 1-1.4 0l-5-5a1 1 0 1 1 1.4-1.4L11 13.6V4a1 1 0 0 1 1-1Zm-7 15a1 1 0 0 1 1 1v1h12v-1a1 1 0 1 1 2 0v1.5A1.5 1.5 0 0 1 18.5 22h-13A1.5 1.5 0 0 1 4 20.5V19a1 1 0 0 1 1-1Z"/></svg>`;
const ICON_BUSY = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><circle cx="12" cy="12" r="8" stroke-opacity=".25"/><path d="M20 12a8 8 0 0 0-8-8" stroke-linecap="round"><animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="0.8s" repeatCount="indefinite"/></path></svg>`;
const ICON_DONE = `<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M9.6 16.8 5.8 13l-1.4 1.4 5.2 5.2L21 8.2 19.6 6.8z"/></svg>`;
const ICON_ERROR = `<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M12 2 1 21h22L12 2Zm0 5.5 7.5 12.5h-15L12 7.5ZM11 10v5h2v-5h-2Zm0 6.5v2h2v-2h-2Z"/></svg>`;

export default defineContentScript({
  matches: ['*://x.com/*', '*://twitter.com/*'],
  runAt: 'document_start',
  async main() {
    const nonce = crypto.randomUUID();
    const byTweet = new Map<string, CapturedMedia[]>();
    const loose: CapturedMedia[] = [];
    let actionButtonEnabled = await settings.xActionButton.getValue();
    let scanQueued = false;
    let reportedIngest = false;

    const post = (payload: Record<string, unknown>) => {
      window.postMessage({ [CHANNEL]: 1, ...payload }, window.location.origin);
    };

    const ingest = (items: CapturedMedia[]) => {
      let added = false;
      for (const item of items) {
        if (!item?.id) continue;
        if (item.tweetId) {
          const list = byTweet.get(item.tweetId) || [];
          if (!list.some((existing) => existing.id === item.id)) {
            list.push(item);
            byTweet.set(item.tweetId, list);
            added = true;
          }
        } else if (!loose.some((existing) => existing.id === item.id)) {
          loose.push(item);
          added = true;
        }
      }
      if (added) {
        if (!reportedIngest) {
          reportedIngest = true;
          console.info(`[MediaGrab] bridge indexed media for ${byTweet.size} tweet(s)`);
        }
        queueScan();
      }
    };

    post({ type: 'bridge-ready', nonce });

    window.addEventListener('message', (event) => {
      if (event.source !== window || event.origin !== window.location.origin) return;
      const data = event.data;
      if (!data || data[CHANNEL] !== 1) return;

      if (data.type === 'capture-ready') {
        post({ type: 'bridge-ready', nonce });
        return;
      }

      if (data.type === 'media' && data.nonce === nonce && Array.isArray(data.items)) {
        ingest(data.items as CapturedMedia[]);
      }
    });

    /* ---------------------------------------------------------------------
       Resolve media for a tweet
       ------------------------------------------------------------------ */

    async function quality(): Promise<VideoQuality> {
      return (await settings.videoQuality.getValue()) as VideoQuality;
    }

    async function mediaForTweet(tweetId: string): Promise<ScrapedMedia[]> {
      const q = await quality();
      const captured = byTweet.get(tweetId);
      if (captured?.length) {
        return captured.map((item) => capturedToScraped(item, q));
      }

      const response = await browser.runtime.sendMessage({
        type: 'mediagrab:resolve-tweet',
        tweetId,
      });
      return response?.ok ? (response.items as ScrapedMedia[]) : [];
    }

    /* ---------------------------------------------------------------------
       Action bar button
       ------------------------------------------------------------------ */

    function queueScan() {
      if (scanQueued) return;
      scanQueued = true;
      setTimeout(() => {
        scanQueued = false;
        scan();
      }, 250);
    }

    function tweetIdFromArticle(article: Element): string | undefined {
      const link = article.querySelector('a[href*="/status/"]');
      const href = link?.getAttribute('href') || '';
      return href.match(/\/status\/(\d+)/)?.[1];
    }

    function actionGroup(article: Element): Element | null {
      const groups = Array.from(article.querySelectorAll('[role="group"]'));
      return groups.find((group) => group.querySelector('[data-testid="like"]')) || groups[0] || null;
    }

    function scan() {
      if (!actionButtonEnabled) return;

      document.querySelectorAll('article[data-testid="tweet"]').forEach((article) => {
        // X re-renders action bars often; presence of the button is the source of truth.
        if (article.querySelector('.mg-action-wrap')) return;

        const tweetId = tweetIdFromArticle(article);
        if (!tweetId || !byTweet.has(tweetId)) return;

        const group = actionGroup(article);
        if (!group) return;

        mountButton(group, tweetId);
      });
    }

    function setButtonState(button: HTMLButtonElement, state: 'idle' | 'busy' | 'done' | 'error', title?: string) {
      button.innerHTML =
        state === 'busy' ? ICON_BUSY : state === 'done' ? ICON_DONE : state === 'error' ? ICON_ERROR : ICON_IDLE;
      button.style.color =
        state === 'done' ? 'rgb(0, 186, 124)' : state === 'error' ? 'rgb(244, 33, 46)' : 'rgb(113, 118, 123)';
      if (title) button.title = title;
    }

    function mountButton(group: Element, tweetId: string) {
      const wrap = document.createElement('div');
      wrap.className = 'mg-action-wrap';
      wrap.style.cssText = 'display:flex;align-items:center;justify-content:center;';

      const button = document.createElement('button');
      button.type = 'button';
      button.setAttribute('aria-label', 'Save media with MediaGrab');
      button.title = 'Save media (MediaGrab)';
      button.innerHTML = ICON_IDLE;
      button.style.cssText =
        'display:inline-flex;align-items:center;justify-content:center;width:34px;height:34px;margin:0;padding:0;border:none;' +
        'background:transparent;border-radius:9999px;cursor:pointer;color:rgb(113,118,123);transition:background .15s,color .15s;';

      button.addEventListener('mouseenter', () => {
        button.style.background = 'rgba(29,155,240,.1)';
        button.style.color = 'rgb(29,155,240)';
      });
      button.addEventListener('mouseleave', () => {
        button.style.background = 'transparent';
        setButtonState(button, 'idle', 'Save media (MediaGrab)');
      });

      button.addEventListener('click', async (event) => {
        event.preventDefault();
        event.stopPropagation();
        await handleSave(button, tweetId);
      });

      wrap.appendChild(button);
      group.appendChild(wrap);
    }

    async function handleSave(button: HTMLButtonElement, tweetId: string) {
      setButtonState(button, 'busy', 'Finding media…');
      button.disabled = true;

      try {
        const items = await mediaForTweet(tweetId);
        if (!items.length) {
          setButtonState(button, 'error', 'No media found for this post');
          return;
        }

        if (items.length === 1) {
          const result = await download(items[0]!);
          setButtonState(button, result.ok ? 'done' : 'error', result.ok ? 'Saved' : result.error);
          return;
        }

        openMenu(button, items);
        setButtonState(button, 'idle', 'Choose media to save');
      } finally {
        button.disabled = false;
        setTimeout(() => setButtonState(button, 'idle', 'Save media (MediaGrab)'), 1600);
      }
    }

    async function download(media: ScrapedMedia): Promise<{ ok: boolean; error?: string }> {
      try {
        return await browser.runtime.sendMessage({
          type: 'mediagrab:download',
          media,
          pageTitle: document.title,
        });
      } catch (error) {
        return { ok: false, error: String(error) };
      }
    }

    function openMenu(anchor: HTMLElement, items: ScrapedMedia[]) {
      closeMenu();

      const dark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
      const rect = anchor.getBoundingClientRect();

      const menu = document.createElement('div');
      menu.className = 'mg-media-menu';
      menu.style.cssText =
        `position:fixed;z-index:2147483647;min-width:220px;padding:6px;border-radius:12px;` +
        `background:${dark ? '#16181c' : '#fff'};color:${dark ? '#e7e9ea' : '#0f1419'};` +
        `border:1px solid ${dark ? '#2f3336' : '#e1e8ed'};box-shadow:0 8px 28px rgba(0,0,0,.28);` +
        `font:13px/1.3 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;`;

      items.forEach((media, index) => {
        const entry = document.createElement('button');
        entry.type = 'button';
        const label =
          media.kind === 'gif' ? 'GIF' : media.kind === 'video' ? 'Video' : 'Photo';
        const meta = [
          media.unsupported === 'hls-only' ? 'HLS only — unsupported' : '',
          formatDuration(media.durationMs),
          media.width && media.height ? `${media.width}×${media.height}` : '',
        ]
          .filter(Boolean)
          .join(' · ');

        entry.style.cssText =
          'display:flex;align-items:center;justify-content:space-between;gap:14px;width:100%;padding:8px 10px;' +
          'border:none;background:transparent;color:inherit;border-radius:8px;cursor:pointer;text-align:left;font:inherit;';
        entry.innerHTML = `<span>${label} ${index + 1}</span><span style="opacity:.6">${meta}</span>`;
        entry.addEventListener('mouseenter', () => {
          entry.style.background = dark ? 'rgba(255,255,255,.08)' : 'rgba(15,20,25,.06)';
        });
        entry.addEventListener('mouseleave', () => {
          entry.style.background = 'transparent';
        });
        entry.addEventListener('click', async (event) => {
          event.preventDefault();
          event.stopPropagation();
          closeMenu();
          await download(media);
        });
        menu.appendChild(entry);
      });

      document.body.appendChild(menu);
      const menuRect = menu.getBoundingClientRect();
      menu.style.top = `${Math.min(rect.bottom + 6, window.innerHeight - menuRect.height - 8)}px`;
      menu.style.left = `${Math.max(8, Math.min(rect.left, window.innerWidth - menuRect.width - 8))}px`;

      setTimeout(() => {
        document.addEventListener('click', onOutside, { once: true });
        document.addEventListener('keydown', onKey, { once: true });
      }, 0);

      function onOutside() {
        closeMenu();
      }
      function onKey(event: KeyboardEvent) {
        if (event.key === 'Escape') closeMenu();
      }
    }

    function closeMenu() {
      document.querySelectorAll('.mg-media-menu').forEach((node) => node.remove());
    }

    settings.xActionButton.watch((value) => {
      actionButtonEnabled = Boolean(value);
      if (!actionButtonEnabled) {
        document.querySelectorAll('.mg-action-wrap').forEach((node) => node.remove());
        document.querySelectorAll('[data-mediagrab="1"]').forEach((node) => node.removeAttribute('data-mediagrab'));
      } else {
        queueScan();
      }
    });

    /* ---------------------------------------------------------------------
       Popup bridge
       ------------------------------------------------------------------ */

    browser.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      if (message?.type !== 'mediagrab:get-media') return;

      (async () => {
        const q = await quality();
        if (message.tweetId) {
          sendResponse({ ok: true, items: byTweet.get(String(message.tweetId))?.map((m) => capturedToScraped(m, q)) || [] });
          return;
        }
        const all = [...byTweet.values()].flat().concat(loose).map((m) => capturedToScraped(m, q));
        sendResponse({ ok: true, items: all });
      })();

      return true;
    });

    const observer = new MutationObserver(() => queueScan());
    const start = () => {
      observer.observe(document.documentElement, { childList: true, subtree: true });
      queueScan();
    };

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', start, { once: true });
    } else {
      start();
    }
  },
});
