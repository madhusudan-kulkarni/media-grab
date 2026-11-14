# Technical feasibility

Verified 2026-11-14. [V] source, [K] knowledge, [U] must be tested.

## How X serves media

- A media object carries `video_info.variants`: progressive MP4s plus one HLS master. A live check of a public post returned 320×568, 480×852 and 720×1280 MP4s plus an `application/x-mpegURL` URL [V](https://cdn.syndication.twimg.com/tweet-result?id=1600649710662213632&token=3vol7tqmapv).
- The HLS master uses separate audio groups and 3-second fMP4 video segments (`#EXT-X-MEDIA:TYPE=AUDIO`, `#EXT-X-MAP`, `.m4s`).
- GIFs are `animated_gif`: silent `tweet_video/<id>.mp4` at bitrate 0.
- Amplify ads are read by yt-dlp from card bindings (`amplify_url_vmap`) [V](https://github.com/yt-dlp/yt-dlp/blob/master/yt_dlp/extractor/twitter.py). No "blend" type in current tooling.
- Metadata is GraphQL with rotating query IDs (yt-dlp `TweetResultByRestId`, gallery-dl `qxWQxcMLiTPcavz9Qy5hwQ`). Neither uses `__INITIAL_STATE__`; both can fall back to syndication.

## `<video>` elements

On X, video plays through Media Source Extensions, so `src`/`currentSrc` is `blob:`. The real MP4 is not in the DOM. `webRequest`/PerformanceObserver see m3u8 and segments, not the progressive MP4. Working extensions hook `window.fetch`/`XMLHttpRequest` in a MAIN-world script at `document_start` and scan JSON for `video_info` [V](https://github.com/wangsen2020/x-media-downloader). One does extract cookies + bearer token instead [V](https://github.com/Teylersf/x-video-downloader) — brittle and privacy-hostile; we will not.

## MV3 / WXT

- Static `world:'MAIN'` content scripts: Chrome 111+, Firefox 128+ [V](https://github.com/mdn/browser-compat-data/blob/main/webextensions/manifest/content_scripts.json).
- WXT supports `world:'MAIN'`; `injectScript` is blocked on x.com because its CSP `script-src` lacks `chrome-extension:` [V] live header; manifest-declared MAIN scripts still run.
- MAIN world has no `chrome.*`: bridge with `window.postMessage`, verify `event.source === window`, treat page data as forgeable.
- Firefox: confirm the build target. The CI comment says MV2 while `manifestVersion: 3` and the AMO `data_collection_permissions` field suggest MV3. If MV2, MAIN-world requires `wrappedJSObject` workarounds — verify before Phase 1.

## HLS cost (deferred)

- `@ffmpeg/core` is a 32.2 MB `.wasm`; needs an offscreen document (SW has no DOM/blob URL) and `'wasm-unsafe-eval'` in the extension CSP [V](https://ffmpegwasm.netlify.app/docs/faq).
- Realistic: +32 MB install, 150–500 MB RAM for a 2-minute 720p clip, minutes of CPU [K/U].
- hls.js/mux.js do not produce a muxed file; mp4box.js is 2.4 MB with custom merge work.

## Downloads API

- `downloads.download({url, filename, conflictAction:'uniquify'})` streams with cookies and no size cap [V](https://developer.chrome.com/docs/extensions/reference/api/downloads).
- MP4 URL without `Referer` returned 200 `video/mp4` with `Accept-Ranges` [V one URL]. 403s are usually expired, geo- or age-gated [U].
- `data:` URLs are unsafe: Chromium documents >64 MB crashes and 50 MB takes minutes [V](https://issues.chromium.org/issues/40774955). Current ZIP path uses base64 data URLs — must change.
- Chrome cannot set `Referer`; Firefox 70+ can. SW cannot create blob URLs; offscreen can.
- Firefox lacks `onDeterminingFilename`; pass filenames at call time.

## Policy and naming

- Chrome Web Store prohibits facilitating unauthorized download/streaming of copyrighted media and names YouTube; video downloaders are excluded from featuring but may stay listed [V](https://developer.chrome.com/docs/webstore/program-policies/policies).
- X ToS (effective 9 Oct 2026) prohibits scraping and reproducing content outside provided interfaces [V](https://x.com/en/tos).
- AMO has no blanket downloader ban but requires no IP infringement [V](https://extensionworkshop.com/documentation/publish/add-on-policies/).
- CWS forbids implying endorsement or infringing trademarks; "X Video Downloader" is complaint-exposed [V](https://developer.chrome.com/docs/webstore/program-policies/impersonation-and-intellectual-property). Use a neutral brand; mention x.com only in the description and never in the name.

## Architecture decision

| Layer | v1 | Why |
| --- | --- | --- |
| Capture | MAIN-world script at `document_start`, wrap fetch+XHR, scan `video_info`, postMessage | No CSP-blocked injection, no tokens |
| Fallback | `cdn.syndication.twimg.com/tweet-result` with derived token, public posts only | Unauthenticated, current; used by working extensions |
| Resolve | Best progressive MP4 ≤ chosen quality; detect HLS-only and label it | Streams via downloads API, no muxing |
| Download | `downloads.download` with filename + uniquify | No blob/data URL, no memory ceiling |
| Batch | ZIP images only, offscreen blob URL, cap ~500 MB; videos individual | Avoids 64 MB data-URL crash and JSZip OOM |
| HLS | v2, opt-in offscreen + ffmpeg.wasm | 32 MB and high memory |
| State | `storage.session` keyed by tweet id; never persist tokens | SW restarts; privacy |

## Risks

1. X moves more uploads to HLS-only or 1080p, making "any video" false.
2. Capture misses content played before injection or served from protected/age-gated posts.
3. CWS/AMO removal on copyright complaint or X enforcement; trademark action over the name. No code change removes this.
