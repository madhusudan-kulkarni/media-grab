import { capturedToScraped, formatDuration, withOriginalSize } from '~/utils/media';
import type { CapturedMedia, ScrapedMedia, VideoQuality } from '~/utils/media';
import { settings } from '~/utils/storage';

const CHANNEL = '__mediagrab';
const ICON_IDLE = `<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M12 3a1 1 0 0 1 1 1v9.6l3.3-3.3a1 1 0 1 1 1.4 1.4l-5 5a1 1 0 0 1-1.4 0l-5-5a1 1 0 1 1 1.4-1.4L11 13.6V4a1 1 0 0 1 1-1Zm-7 15a1 1 0 0 1 1 1v1h12v-1a1 1 0 1 1 2 0v1.5A1.5 1.5 0 0 1 18.5 22h-13A1.5 1.5 0 0 1 4 20.5V19a1 1 0 0 1 1-1Z"/></svg>`;
const ICON_BUSY = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><circle cx="12" cy="12" r="8" stroke-opacity=".25"/><path d="M20 12a8 8 0 0 0-8-8" stroke-linecap="round"><animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="0.8s" repeatCount="indefinite"/></path></svg>`;
const ICON_DONE = `<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M9.6 16.8 5.8 13l-1.4 1.4 5.2 5.2L21 8.2 19.6 6.8z"/></svg>`;
const ICON_ERROR = `<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M12 2 1 21h22L12 2Zm0 5.5 7.5 12.5h-15L12 7.5ZM11 10v5h2v-5h-2Zm0 6.5v2h2v-2h-2Z"/></svg>`;
const PHOTO_URL_RE = /pbs\.twimg\.com\/(media|card_img)\//;
const VIDEO_THUMB_RE = /(ext_tw_video_thumb|amplify_video_thumb|tweet_video_thumb|video_thumb)/;
const VIDEO_SELECTOR =
  '[data-testid="videoPlayer"], [data-testid="videoComponent"], [data-testid="videoContainer"], ' +
  '[data-testid="playButton"], video, [aria-label*="Play" i]';

interface TweetInfo {
  tweetId: string;
  author?: string;
}

interface ArticleMedia {
  kind: 'video' | 'image' | 'mixed';
  images: string[];
}

console.info('[MediaGrab] bridge module loaded', location.href);

export default defineContentScript({
  matches: ['*://x.com/*', '*://twitter.com/*'],
  runAt: 'document_start',
  async main() {
    console.info('[MediaGrab] bridge main start');
    const nonce = crypto.randomUUID();
    // Photos and videos are kept apart on purpose: a post can carry both, and
    // letting a poster photo win is how you download a JPEG instead of a video.
    const videosByTweet = new Map<string, CapturedMedia[]>();
    const photosByTweet = new Map<string, CapturedMedia[]>();
    const loose: CapturedMedia[] = [];

    let actionButtonEnabled = await settings.xActionButton.getValue();
    let scanQueued = false;
    let reportedIngest = false;
    let lastSummary = '';

    const post = (payload: Record<string, unknown>) => {
      window.postMessage({ [CHANNEL]: 1, ...payload }, window.location.origin);
    };

    const pushUnique = (map: Map<string, CapturedMedia[]>, key: string, item: CapturedMedia) => {
      const list = map.get(key) || [];
      if (list.some((existing) => existing.id === item.id)) return false;
      list.push(item);
      map.set(key, list);
      return true;
    };

    const ingest = (items: CapturedMedia[]) => {
      let added = false;
      for (const item of items) {
        if (!item?.id) continue;
        if (!item.tweetId) {
          if (!loose.some((existing) => existing.id === item.id)) {
            loose.push(item);
            added = true;
          }
          continue;
        }
        if (item.kind === 'image') {
          added = pushUnique(photosByTweet, item.tweetId, item) || added;
        } else {
          added = pushUnique(videosByTweet, item.tweetId, item) || added;
        }
      }

      if (added) {
        if (!reportedIngest) {
          reportedIngest = true;
          console.info(
            `[MediaGrab] bridge indexed ${videosByTweet.size} video post(s), ${photosByTweet.size} photo post(s)`
          );
        }
        queueScan();
      }
    };

    post({ type: 'bridge-ready', nonce });
    console.info('[MediaGrab] bridge active');

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
       DOM -> what is actually on screen
       ------------------------------------------------------------------ */

    function tweetInfoFromArticle(article: Element): TweetInfo | null {
      // The canonical link is the one wrapping <time>. Other /status/ links in
      // a card can point at a quoted post or a media viewer.
      const links = Array.from(article.querySelectorAll('a[href*="/status/"]'));
      const parse = (link: Element) => {
        const match = (link.getAttribute('href') || '').match(/^\/([^/]+)\/status\/(\d+)/);
        return match ? { author: match[1]!, tweetId: match[2]! } : null;
      };
      for (const link of links) {
        if (link.querySelector('time')) {
          const info = parse(link);
          if (info) return info;
        }
      }
      for (const link of links) {
        const info = parse(link);
        if (info) return info;
      }
      const page = window.location.pathname.match(/^\/([^/]+)\/status\/(\d+)/);
      return page ? { author: page[1]!, tweetId: page[2]! } : null;
    }

    /** What the article renders: video, images, or both. */
    function articleMedia(article: Element): ArticleMedia | null {
      const images: string[] = [];
      const posters: string[] = [];

      for (const img of article.querySelectorAll('img')) {
        const element = img as HTMLImageElement;
        const src = element.currentSrc || element.src || '';
        if (!src) continue;

        // X often renders just the poster until the player mounts.
        if (VIDEO_THUMB_RE.test(src)) {
          posters.push(src);
          continue;
        }
        if (img.closest(VIDEO_SELECTOR)) continue;
        if (!PHOTO_URL_RE.test(src)) continue;

        const original = withOriginalSize(src);
        if (!images.includes(original)) images.push(original);
      }

      const hasVideo = posters.length > 0 || Boolean(article.querySelector(VIDEO_SELECTOR));

      if (hasVideo && images.length) return { kind: 'mixed', images };
      if (hasVideo) return { kind: 'video', images };
      if (images.length) return { kind: 'image', images };
      return null;
    }

    async function quality(): Promise<VideoQuality> {
      return (await settings.videoQuality.getValue()) as VideoQuality;
    }

    async function resolveRemote(tweetId: string): Promise<ScrapedMedia[]> {
      const response = await browser.runtime.sendMessage({
        type: 'mediagrab:resolve-tweet',
        tweetId,
      });
      return response?.ok ? (response.items as ScrapedMedia[]) : [];
    }

    function photoToScraped(url: string, info: TweetInfo): ScrapedMedia {
      return {
        id: url,
        kind: 'image',
        src: withOriginalSize(url),
        ext: 'jpg',
        mimeType: 'image/jpeg',
        width: 0,
        height: 0,
        author: info.author,
        tweetId: info.tweetId,
        source: 'dom',
      };
    }

    async function mediaFor(article: Element, info: TweetInfo, media: ArticleMedia): Promise<ScrapedMedia[]> {
      const q = await quality();

      if (media.kind === 'video') {
        const captured = videosByTweet.get(info.tweetId) || [];
        if (captured.length) return captured.map((item) => capturedToScraped(item, q));
        return (await resolveRemote(info.tweetId)).filter((item) => item.kind !== 'image');
      }

      if (media.kind === 'image') {
        if (media.images.length) return media.images.map((url) => photoToScraped(url, info));
        const captured = photosByTweet.get(info.tweetId) || [];
        if (captured.length) return captured.map((item) => capturedToScraped(item, q));
        return (await resolveRemote(info.tweetId)).filter((item) => item.kind === 'image');
      }

      const videos = videosByTweet.get(info.tweetId)?.map((item) => capturedToScraped(item, q)) || [];
      const images = media.images.length
        ? media.images.map((url) => photoToScraped(url, info))
        : (photosByTweet.get(info.tweetId) || []).map((item) => capturedToScraped(item, q));
      return [...videos, ...images];
    }

    /* ---------------------------------------------------------------------
       Action bar button
       ------------------------------------------------------------------ */

    function queueScan() {
      if (scanQueued) return;
      scanQueued = true;
      requestAnimationFrame(() => {
        scanQueued = false;
        scan();
      });
    }

    function actionGroup(article: Element): Element | null {
      const groups = Array.from(article.querySelectorAll('[role="group"]'));
      return groups.find((group) => group.querySelector('[data-testid="like"]')) || groups[0] || null;
    }

    function scan() {
      if (!actionButtonEnabled) return;

      try {
        const articles = Array.from(document.querySelectorAll('article'));
        articles.forEach((article) => {
          // X re-renders action bars often; presence of the button is the truth.
          const existing = article.querySelector('.mg-media-btn');
          const media = articleMedia(article);
          if (!media) {
            existing?.remove();
            return;
          }
          if (existing) return;

          const info = tweetInfoFromArticle(article);
          if (!info) return;
          const group = actionGroup(article);
          if (!group) return;

          mountButton(group, article, info);
        });

        const withMedia = articles.filter((article) => articleMedia(article)).length;
        const summary = `${articles.length} article(s), ${withMedia} with media, ${document.querySelectorAll('.mg-media-btn').length} button(s)`;
        if (summary !== lastSummary) {
          lastSummary = summary;
          console.info(`[MediaGrab] scan: ${summary}`);
        }
      } catch (error) {
        console.error('[MediaGrab] scan failed', error);
      }
    }

    function setButtonState(button: HTMLElement, state: 'idle' | 'busy' | 'done' | 'error', title?: string) {
      const icon =
        state === 'busy' ? ICON_BUSY : state === 'done' ? ICON_DONE : state === 'error' ? ICON_ERROR : ICON_IDLE;
      const color =
        state === 'done' ? 'rgb(0, 186, 124)' : state === 'error' ? 'rgb(244, 33, 46)' : state === 'busy' ? 'rgb(29, 155, 240)' : '';

      const current = button.querySelector('svg');
      if (current) current.outerHTML = icon;
      else button.insertAdjacentHTML('beforeend', icon);

      button.querySelectorAll('svg').forEach((svg) => {
        (svg as SVGElement).style.color = color;
      });
      button.style.color = color;
      button.setAttribute('aria-label', title || 'Save media with MediaGrab');
      button.title = title || 'Save media (MediaGrab)';
    }

    function mountButton(group: Element, article: Element, info: TweetInfo) {
      // Clone one of X's own action buttons so layout, hover disc and spacing
      // are identical. A hand-built button gets collapsed or clipped by the
      // action bar's layout rules.
      const template =
        group.querySelector('[data-testid="bookmark"]') ||
        group.querySelector('[data-testid="share"]') ||
        group.querySelector('[role="button"]');

      let button: HTMLElement;
      if (template) {
        button = template.cloneNode(true) as HTMLElement;
        button.removeAttribute('data-testid');
        button.removeAttribute('id');
        button.removeAttribute('aria-haspopup');
        button.removeAttribute('aria-expanded');
        button.removeAttribute('aria-controls');
        button.removeAttribute('aria-describedby');
        button.querySelectorAll('[data-testid]').forEach((node) => node.removeAttribute('data-testid'));
        button.setAttribute('role', 'button');
        button.setAttribute('tabindex', '0');
      } else {
        const fallback = document.createElement('button');
        fallback.type = 'button';
        fallback.style.cssText =
          'display:inline-flex;align-items:center;justify-content:center;width:34px;height:34px;margin:0;padding:0;' +
          'border:none;background:transparent;border-radius:9999px;cursor:pointer;';
        button = fallback;
      }

      button.classList.add('mg-media-btn');
      button.style.cursor = 'pointer';
      setButtonState(button, 'idle');

      const activate = async (event: Event) => {
        event.preventDefault();
        event.stopPropagation();
        if (button.getAttribute('aria-disabled') === 'true') return;
        await handleSave(button, article, info);
      };

      button.addEventListener('click', activate);
      button.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') activate(event);
      });

      if (template?.parentElement) template.after(button);
      else group.appendChild(button);

      requestAnimationFrame(() => {
        const rect = button.getBoundingClientRect();
        console.info(
          `[MediaGrab] button mounted for ${info.tweetId} (${articleMedia(article)?.kind}) ${Math.round(rect.width)}x${Math.round(rect.height)}`
        );
      });
    }

    async function handleSave(button: HTMLElement, article: Element, info: TweetInfo) {
      const media = articleMedia(article);
      if (!media) {
        setButtonState(button, 'error', 'No media found for this post');
        return;
      }

      setButtonState(button, 'busy', 'Finding media…');
      button.setAttribute('aria-disabled', 'true');

      try {
        const items = await mediaFor(article, info, media);
        console.info(
          `[MediaGrab] save ${info.tweetId} (${media.kind}):`,
          items.map((item) => `${item.kind}:${item.ext}`).join(', ') || 'nothing'
        );

        if (!items.length) {
          setButtonState(button, 'error', 'No media found for this post');
          return;
        }

        if (media.kind === 'image' && items.length > 1) {
          let saved = 0;
          for (let i = 0; i < items.length; i++) {
            const result = await download(items[i]!, i + 1);
            if (result.ok) saved++;
            await new Promise((resolve) => setTimeout(resolve, 120));
          }
          setButtonState(button, saved ? 'done' : 'error', saved ? `Saved ${saved} images` : 'Download failed');
          return;
        }

        if (items.length === 1) {
          const result = await download(items[0]!);
          setButtonState(button, result.ok ? 'done' : 'error', result.ok ? 'Saved' : result.error);
          return;
        }

        openMenu(button, items);
      } finally {
        button.removeAttribute('aria-disabled');
        setTimeout(() => setButtonState(button, 'idle'), 1800);
      }
    }

    async function download(media: ScrapedMedia, index = 1): Promise<{ ok: boolean; error?: string }> {
      try {
        return await browser.runtime.sendMessage({
          type: 'mediagrab:download',
          media,
          index,
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
      menu.setAttribute('role', 'menu');
      menu.style.cssText =
        `position:fixed;z-index:2147483647;min-width:220px;max-width:300px;padding:6px;border-radius:12px;` +
        `background:${dark ? '#16181c' : '#fff'};color:${dark ? '#e7e9ea' : '#0f1419'};` +
        `border:1px solid ${dark ? '#2f3336' : '#e1e8ed'};box-shadow:0 8px 28px rgba(0,0,0,.28);` +
        `font:13px/1.3 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;`;

      items.forEach((media, index) => {
        const entry = document.createElement('button');
        entry.type = 'button';
        entry.setAttribute('role', 'menuitem');

        const label = media.kind === 'gif' ? 'GIF' : media.kind === 'video' ? 'Video' : 'Photo';
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
          await download(media, index + 1);
        });
        menu.appendChild(entry);
      });

      document.body.appendChild(menu);
      const menuRect = menu.getBoundingClientRect();
      let top = rect.bottom + 6;
      if (top + menuRect.height > window.innerHeight - 8) {
        const above = rect.top - menuRect.height - 6;
        top = above >= 8 ? above : window.innerHeight - menuRect.height - 8;
      }
      menu.style.top = `${Math.max(8, top)}px`;
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
        document.querySelectorAll('.mg-media-btn').forEach((node) => node.remove());
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
          const items = [...(videosByTweet.get(String(message.tweetId)) || []), ...(photosByTweet.get(String(message.tweetId)) || [])];
          sendResponse({ ok: true, items: items.map((m) => capturedToScraped(m, q)) });
          return;
        }
        const all = [...videosByTweet.values(), ...photosByTweet.values()].flat().concat(loose);
        sendResponse({ ok: true, items: all.map((m) => capturedToScraped(m, q)) });
      })();

      return true;
    });

    const observer = new MutationObserver(() => queueScan());
    const start = () => {
      observer.observe(document.body, { childList: true, subtree: true });
      queueScan();
    };

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', start, { once: true });
    } else {
      start();
    }
  },
});
