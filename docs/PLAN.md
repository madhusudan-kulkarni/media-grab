# MediaGrab 2.0 — overhaul and media-grabbing plan

Status: approved in principle; Phase 0 can start.
Research: `docs/research/` (market-reviews, feature-matrix, technical-feasibility, ux-patterns).

Personal-use build: distributed as zips on GitHub Releases, not published to extension stores.

## Goal

Turn ImageGrab into **MediaGrab**: save anything on this page, especially X, in one gesture — with an honest batch surface and a UI that does not look like 2023.

Positioning: *Media Harvest's one-click, plus the archive job.* Media Harvest (100K users, OSS) deliberately refuses batch and ZIP; the batch tool in the space has 20K users. No one owns both halves.

## Name

**MediaGrab.** Store-search continuity no longer matters, but keeping "Grab" means the repo history, README, bookmarks and muscle memory carry over, and one word describes the new capability.

Version **2.0.0**. No listing migration concerns, so the repo can be renamed `media-grab` and the old URLs will redirect on GitHub.

## Scope

### In v1

- Images, GIFs and videos from X/Twitter and generic pages.
- X: per-tweet one-click (action-bar button + hover), GIF as silent MP4, best progressive MP4 up to a chosen quality, explicit "HLS-only, not supported yet" state.
- Generic: `<video src>`, `<video><source>`, direct `.mp4/.webm/.gif` links, existing image scan.
- Batch surface rebuilt: type filter, preview, per-item state, retry failed, ZIP for images only (capped), videos always individual.
- Popup rebuilt as status + one action; real options page; history and duplicate detection; new icon.
- Site access: `<all_urls>`, granted once in Firefox's MV3 opt-in flow (see below). No telemetry, no remote code, no cookie or bearer-token extraction.

### Out of v1 (2.1+, in order)

1. HLS/DASH muxing in an offscreen document with ffmpeg.wasm (+32 MB) for 1080p and HLS-only posts.
2. Audio-only extraction for videos.
3. Conversion (webp→png/jpg, video→gif).
4. Bulk archive of a profile's media tab (deliberate opt-in, rate limited).
5. PDF/SVG capture parity.

## Browsers and distribution

Firefox is the primary target: develop, test and dogfood there. Chrome is a secondary build kept working, not a testing focus. Safari is dropped.

| Browser | Status | Notes |
| --- | --- | --- |
| Firefox | Primary | Stable is the daily browser. Unsigned XPIs do not persist there, so releases are **signed as an unlisted AMO add-on** and installed as a signed XPI. Developer Edition remains the fast dev loop. Phase 0 confirms the build target, `world:'MAIN'`, and permission behavior. |
| Chrome / Arc / Brave / Edge | Secondary | Load unpacked from `output/chrome-mv3`; smoke test only. |
| Safari | Not planned | No `browser.downloads` API, so the download layer would need a fetch→blob→anchor fallback, plus an Xcode wrapper and unsigned-extension mode. Not worth it for occasional use. |

Distribution: `wxt zip` → `web-ext sign --channel unlisted` → signed XPI attached to a GitHub Release. Chrome zip alongside it. `docs/INSTALL.md` covers dragging the signed XPI into Firefox, the Developer Edition path, and the temporary `about:debugging` fallback.

### Signing on stable Firefox

- **Unlisted signing is the only persistent path on stable.** Upload the zip to AMO with channel `unlisted`; AMO returns a signed XPI that installs and survives restarts. Review still happens per version, but the add-on never appears in search.
- **Do not reuse the listed ImageGrab add-on.** A single add-on can technically host both listed and self-hosted versions, but the MediaGrab build introduces the policy-sensitive capability. Keep it a **separate, unlisted add-on with its own ID** (`mediagrab@madhusudan.dev`) so a rejection or complaint cannot touch the live public listing or its reviews.
- **Automation:** `web-ext sign` in the release workflow with AMO API keys in GitHub secrets (`AMO_API_KEY`, `AMO_API_SECRET`); upload the bundler sources zip as AMO requires for transpiled builds.
- **Auto-updates:** add `browser_specific_settings.gecko.update_url` pointing at an `updates.json` hosted on GitHub (Pages or a release asset) that lists the new version and links to the signed XPI. Without it, unlisted installs update only by reinstalling.

### Firefox MV3 specifics

- **Host permissions are opt-in.** Firefox MV3 does not grant manifest `host_permissions` at install; the user enables them in `about:addons` or the extension requests them from a user gesture. Nothing works on x.com or anywhere else until that grant, so a first-run onboarding page with one "Enable site access" button is required, not optional. The popup shows the same state and can re-prompt.
- **Background is an event page, not a service worker.** It has a DOM, so `URL.createObjectURL` works directly. The offscreen-document path is Chrome-only; Firefox builds ZIP blobs in the background page.
- **No `onDeterminingFilename`.** Filenames must be passed at `downloads.download` call time. Already the plan.
- **MAIN world** is supported from Firefox 128. Phase 0 proves the page-`fetch` wrap actually captures GraphQL responses in Firefox; the fallback is an MV2 build using `wrappedJSObject`.

## Architecture

### New/changed files

| File | Change |
| --- | --- |
| `src/utils/media.ts` | New. `ScrapedMedia`, kind/mime detection, variant ranking, duration/size formatting. |
| `src/utils/storage.ts` | Add `videoQuality`, `includeVideos`, `xActionButton`, `history`; keep existing keys. |
| `src/utils/offscreen.ts` | New. Blob-URL creation via offscreen document on Chrome, background page on Firefox. |
| `src/entrypoints/media-capture.content.ts` | New, MAIN world, `document_start`, x.com/twitter.com only. Wraps `fetch` + XHR, extracts `video_info`/`animated_gif`, nonce handshake, `postMessage`. |
| `src/entrypoints/x-bridge.content.ts` | New, isolated world. Receives capture, resolves variants, maintains tweet→media index, adds action-bar button. |
| `src/entrypoints/image-scraper.content.tsx` | Reduced to scanner + mount point; UI moves to React. Scanner gains videos, GIF links, media-id dedupe. |
| `src/ui/*` | New. React + Tailwind design system: tokens, Button, IconButton, Chip, Tile, Dialog, Toast, Progress. |
| `src/entrypoints/popup/*` | Rebuilt. |
| `src/entrypoints/options/*` | New options page (settings out of the popup). |
| `src/entrypoints/background.ts` | Context menus (Save video), resolution, batch orchestration, ZIP cap + offscreen, filename tokens, history. |
| `wxt.config.ts` | Name/description, `<all_urls>`, Firefox MV3 confirmation, CSP `wasm-unsafe-eval` only when HLS lands (not v1). |
| `public/icon*.png`, `public/icon.svg` | New mark: frame + play glyph. |

### Data model

```ts
type MediaKind = 'image' | 'gif' | 'video';

interface MediaVariant { url: string; mime: string; bitrate?: number; width?: number; height?: number }

interface ScrapedMedia {
  id: string;                 // media id or URL hash
  kind: MediaKind;
  src: string;                // resolved best URL
  poster?: string;
  width: number; height: number;
  duration?: number;          // seconds
  ext: string; mimeType?: string;
  variants?: MediaVariant[];
  alt?: string; author?: string; tweetId?: string; pageUrl?: string;
  source: 'dom' | 'x-capture' | 'syndication';
  unsupported?: 'hls-only' | 'protected';
}
```

`ScrapedImage` stays as a deprecated alias during the migration so no call site breaks at once.

### X pipeline

1. MAIN script at `document_start` wraps `fetch`/XHR, keeps responses whose URL contains `/graphql/`, walks JSON for media objects (`video_info`, `animated_gif`, `tweet_video`), emits normalized records.
2. Isolated bridge validates `event.source === window` + nonce, stores an in-memory index keyed by tweet id, merges duplicates by media id.
3. Resolver picks the highest-bitrate MP4 at or below the quality setting; if only `.m3u8` exists, marks `unsupported: 'hls-only'`.
4. Fallback for public posts not captured: `cdn.syndication.twimg.com/tweet-result` with the derived token. Protected/age-gated posts stay unsupported — no cookie or bearer extraction.
5. Download goes straight to `browser.downloads.download({ url, filename, conflictAction: 'uniquify' })`. Never `data:` URLs.

### Batch downloads

- ZIP: images only, hard cap 500 files / 500 MB, telling the user why. Built as a blob in the Firefox background event page, or an offscreen document on Chrome; no base64 `data:` URL.
- Videos: always individual, throttled, with per-item status and retry.
- Partial failure: keep successes, list failures with the reason, "Retry failed" only.

## UI overhaul

### Popup (350×~420)

```
┌──────────────────────────────────┐
│ ◈ MediaGrab                  ⚙ ? │
│                                  │
│  12 media on this page           │
│  9 images · 2 videos · 1 GIF     │
│  ▸ example.com/article/…         │
│                                  │
│  [        Review & save        ] │
│                                  │
│  Hover save            [ on  ]   │
│  Deep scan             [ on  ]   │
│ ──────────────────────────────── │
│  History · Settings · Shortcuts  │
└──────────────────────────────────┘
```

No filename-template fields in the popup. One primary action, one status line, quiet footer.

### X per-tweet control

- Icon button in the tweet action bar after share, four inline states: ready, fetching, done, error (tooltip with plain reason).
- One media → save immediately at the chosen quality. Several → small popover with thumbnails, duration, quality.
- Hover overlay on the media itself as a second path.
- Per-site toggle to hide the action-bar button if X changes break it.

### Batch surface

Full-page in-page dialog (React, shadow DOM), masonry grid:

- Header: `12 media · 9 images · 2 videos · 1 GIF`, search, All/Images/Videos/GIFs chips, min-size, quality selector, density, select all/none/invert.
- Tile: thumbnail/poster, play badge + duration for video, dimensions, "already saved" check, explicit checkbox, per-item progress.
- Unsupported tiles are visible but disabled with the reason ("HLS only — coming in 2.1").
- Lightbox: arrows, Esc, D download, Space play, Enter open post.
- Footer: `Save N (ZIP)` for images, `Download N` for mixed, cancel.
- Empty state explains why nothing was found, plus deep scan.

### Options page

Filename template with live preview and token list (`${domain} ${timestamp} ${index} ${ext} ${author} ${tweetId} ${width} ${height}`), video quality, hover overlay, action-bar button, subfolders, history clear, reset.

## Phases

Every phase ends with a Firefox build and a manual checklist on your real profile; Chrome gets a build plus a smoke test at Phases 2 and 5.

**Phase 0 — Spike and scaffold (0.75d).** Prove on Firefox: the WXT build is MV3, `world:'MAIN'` runs at `document_start` on x.com, a wrapped page `fetch` captures a GraphQL `video_info` response, and `permissions.request({origins:['<all_urls>']})` from an extension-page click grants access. Fallback if MAIN fails: MV2 build with `wrappedJSObject`. Install React + Tailwind module, tokens, rename to MediaGrab, branch `media-v2`. *Done when:* the tombstone capture script logs a tweet's variant list in Firefox.

**Phase 1 — Capture and resolve (1d).** `media.ts`, capture script, bridge, resolver, syndication fallback, context-menu "Save video". Unit tests for variant ranking and filename tokens. *Done when:* a public X post with one video, one GIF and one multi-video tweet downloads a playable MP4 at the chosen quality in Firefox; HLS-only reports the reason.

**Phase 2 — Scanner and one-click surfaces (1d).** Generic video/GIF scanning, hover overlay on video, X action-bar button, popup status counts. *Done when:* save works on a generic `<video>`, a `.gif` link, and an X tweet without opening the popup — after the one-time access grant.

**Phase 3 — Batch rebuild (1.5d).** React gallery, filters, selection, lightbox, per-item state, ZIP cap + background-page blob, retry. *Done when:* 200 images ZIP successfully under the cap, a mixed 3-video + 50-image page downloads with clear per-item results, and 1 GB of images refuses gracefully.

**Phase 4 — Onboarding and polish (1d).** First-run page with the one-click access grant (required in Firefox MV3), popup permission state, options page, history/dedupe, new icon, keyboard map, dark mode, a11y pass, action-bar toggle. *Done when:* a fresh profile goes from install to saving in two clicks; revoking access and reopening the popup offers to restore it.

**Phase 5 — Packaging (0.5d).** README, CHANGELOG, `docs/INSTALL.md`, release workflow builds both zips, signs the Firefox zip unlisted with `web-ext`, publishes the signed XPI plus Chrome zip on the GitHub Release, and writes `updates.json`. `v2.0.0` tag. *Done when:* a fresh clone builds, the signed XPI installs on stable Firefox and survives a restart, and the update manifest serves the new version.

Total: ~5.75 focused days.

## Acceptance criteria

- X: single video, GIF, multi-video, quoted tweet, HLS-only, age-gated → correct state for each.
- Generic: `<video src>`, `<source>`, `.gif`, direct `.mp4`, background-image, srcset, canvas unchanged.
- Every downloaded video plays in QuickTime and VLC (checks the broken-moov complaint).
- No `data:` URL downloads anywhere; large batches do not grow memory linearly.
- No network request to x.com beyond what the page already made, except the public syndication fallback on demand.
- Keyboard-only path: open popup → review → select → download; Esc closes; focus returns.
- After the one-time Firefox access grant, hover save works on any site.
- Revoking access is detected: popup and onboarding both offer to restore it instead of silently doing nothing.
- The signed unlisted XPI installs on stable Firefox, survives a restart, and is offered as an update by the `updates.json` manifest.

## Risks

| Risk | Mitigation |
| --- | --- |
| X changes DOM/GraphQL | Capture + syndication fallback + per-site toggle; label failures instead of silence |
| Action-bar button fights X's UI | Isolated styles, `data-mediagrab` attributes, feature flag in options |
| Firefox MV3 host permissions are opt-in, so a fresh install does nothing | First-run onboarding with a user-gesture request, popup permission state, restore flow |
| Firefox unsigned install is per-session on stable | Unlisted AMO signing; signed XPI is the release artifact |
| AMO rejects the video capability or an X complaint lands | Separate unlisted add-on ID keeps the public ImageGrab listing and account history out of it; user-initiated only, no crawl |
| MAIN-world `fetch` wrap fails in Firefox | Phase 0 proves it; fallback is MV2 with `wrappedJSObject` |
| Chrome drifts untested | CI builds every push; smoke test at Phases 2 and 5 |
| HLS-only posts remain unavailable until 2.1 | Explicit disabled state with reason, not a silent failure |
| ZIP memory | Background-page blob in Firefox + hard cap + videos individual |

## Approved decisions

1. **Name:** MediaGrab.
2. **Stack:** React + Tailwind for popup, options and gallery.
3. **Site access:** `<all_urls>`, granted through Firefox's MV3 opt-in flow with a first-run onboarding page.
4. **X one-click surface:** action-bar button + hover.
5. **Browsers:** Firefox primary; Chrome/Chromium secondary build; Safari dropped.
6. **HLS:** 2.1, not v1.
7. **Distribution:** GitHub Releases with `wxt zip` artifacts; no store publishing.
8. **Daily driver:** stable Firefox, using an unlisted AMO-signed XPI from GitHub Releases.
9. **Signing:** separate unlisted add-on ID `mediagrab@madhusudan.dev`; the public ImageGrab listing is not touched.
10. **Updates:** self-hosted `updates.json` on GitHub so stable Firefox auto-updates.
