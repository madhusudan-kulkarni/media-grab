import { extractMediaFromGraphql } from '~/utils/media';
import type { CapturedMedia } from '~/utils/media';

/**
 * MAIN-world capture for X/Twitter.
 *
 * X plays video through MediaSource, so the <video> element only exposes a
 * blob: URL. The real variants live in GraphQL responses the page already
 * fetched. This script runs before the app boots, watches fetch + XHR, and
 * forwards normalized media to the isolated world over postMessage.
 *
 * Messages carry a nonce handed over by the isolated bridge, so page scripts
 * cannot forge capture traffic.
 */
export default defineContentScript({
  matches: ['*://x.com/*', '*://twitter.com/*'],
  runAt: 'document_start',
  world: 'MAIN',
  main() {
    const CHANNEL = '__mediagrab';
    const DEBUG = false;
    let nonce: string | null = null;
    let reportedCapture = false;
    const pending: CapturedMedia[] = [];

    const post = (payload: Record<string, unknown>) => {
      window.postMessage({ [CHANNEL]: 1, ...payload }, window.location.origin);
    };

    const sendMedia = (items: CapturedMedia[]) => {
      if (!items.length) return;
      if (!nonce) {
        pending.push(...items);
        return;
      }
      post({ type: 'media', nonce, items });
    };

    const handlePayload = (json: unknown) => {
      const items = extractMediaFromGraphql(json);
      if (!items.length) return;

      if (!reportedCapture) {
        reportedCapture = true;
        if (DEBUG) console.info(`[MediaGrab] capture working: ${items.length} media item(s) in one response`);
      }

      sendMedia(items);
    };

    window.addEventListener('message', (event) => {
      if (event.source !== window) return;
      const data = event.data;
      if (!data || data[CHANNEL] !== 1) return;

      if (data.type === 'bridge-ready' && typeof data.nonce === 'string') {
        nonce = data.nonce;
        if (pending.length) {
          sendMedia(pending.splice(0, pending.length));
        }
      }
    });

    post({ type: 'capture-ready' });
    if (DEBUG) console.info('[MediaGrab] main-world capture active');

    const originalFetch = window.fetch;
    window.fetch = async function (...args) {
      const response = await originalFetch.apply(this, args as any);
      try {
        const url = typeof args[0] === 'string' ? args[0] : (args[0] as Request)?.url;
        if (url && url.includes('/graphql/')) {
          response
            .clone()
            .json()
            .then(handlePayload)
            .catch(() => {});
        }
      } catch {
        // Never break the page's own request.
      }
      return response;
    };

    const originalOpen = XMLHttpRequest.prototype.open;
    const originalSend = XMLHttpRequest.prototype.send;

    XMLHttpRequest.prototype.open = function (method: string, url: string | URL, ...rest: any[]) {
      (this as any).__mediagrabUrl = String(url);
      return (originalOpen as any).call(this, method, url, ...rest);
    };

    XMLHttpRequest.prototype.send = function (...args: any[]) {
      this.addEventListener('load', () => {
        const url = (this as any).__mediagrabUrl as string | undefined;
        if (!url || !url.includes('/graphql/')) return;
        try {
          handlePayload(JSON.parse(this.responseText));
        } catch {
          // Not JSON; ignore.
        }
      });
      return originalSend.apply(this, args as any);
    };
  },
});
