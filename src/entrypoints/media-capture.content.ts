/**
 * MAIN-world capture for X/Twitter.
 *
 * X plays video through MediaSource, so the <video> element only exposes a
 * blob: URL. The real variants live in the GraphQL JSON the page already
 * fetched. This script runs before the app boots, watches fetch + XHR, and
 * forwards media records to the isolated world over postMessage.
 *
 * Phase 0: proves the page-context hook works in Firefox. The GraphQL walker
 * lands in Phase 1.
 */
export default defineContentScript({
  matches: ['*://x.com/*', '*://twitter.com/*'],
  runAt: 'document_start',
  world: 'MAIN',
  main() {
    const CHANNEL = '__mediagrab';

    window.postMessage({ [CHANNEL]: 1, type: 'capture-ready' }, window.location.origin);

    const originalFetch = window.fetch;
    window.fetch = async function (...args) {
      const response = await originalFetch.apply(this, args as any);
      try {
        const url = typeof args[0] === 'string' ? args[0] : (args[0] as Request)?.url;
        if (url && url.includes('/graphql/')) {
          response
            .clone()
            .json()
            .then((json) => {
              window.postMessage(
                {
                  [CHANNEL]: 1,
                  type: 'graphql-response',
                  url,
                  json,
                },
                window.location.origin
              );
            })
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
          const json = JSON.parse(this.responseText);
          window.postMessage({ [CHANNEL]: 1, type: 'graphql-response', url, json }, window.location.origin);
        } catch {
          // Not JSON; ignore.
        }
      });
      return originalSend.apply(this, args as any);
    };

    console.info('[MediaGrab] main-world capture active');

    if (import.meta.env.DEV) {
      console.debug('[MediaGrab] document_start reached');
    }
  },
});
