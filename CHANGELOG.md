# Changelog

All notable changes to **MediaGrab** (formerly ImageGrab) are documented here.

---

## [2.2.0] - 2026-11-15

### Added
- **Copy image to clipboard**, as a real image rather than a URL. Three entry
  points: right-click → *MediaGrab: Copy Image*, the hover pill over any image,
  and the gallery/preview. Pastes into an agent, editor or chat.
- Non-video YouTube pages (home, search, channel) now say "Open a video to
  download it" instead of offering a button that cannot work.

### Changed
- New `clipboardWrite` permission. Firefox will ask to approve it once after
  the update.
- Copying uses Firefox's `clipboard.setImageData`; PNG and JPEG are copied
  directly, other formats are re-encoded through a canvas (GIFs become their
  first frame).
- Version 2.2.0.

## [2.1.0] - 2026-11-15

### Added
- **YouTube downloads** through a native messaging host that runs yt-dlp and
  merges audio with ffmpeg. Setup: `brew install yt-dlp ffmpeg && pnpm native:install`.
  The extension never extracts YouTube streams itself.
- **HLS-only X posts** can be handed to the same host from the gallery; the host
  resolves the post with yt-dlp instead of failing.
- **YouTube card in the popup** with helper status, quality choice, progress and
  a saved/failed result.
- **Settings → YouTube**: output folder, browser cookies for private or
  age-restricted videos, helper check.
- Desktop notification when a download finishes or fails.
- `native/install.mjs`, `native/uninstall.mjs`, protocol tests and
  [docs/NATIVE.md](docs/NATIVE.md).

### Changed
- Manifest gains `nativeMessaging` and `notifications`. Firefox will ask to
  approve them once after the update.
- Version 2.1.0.

### Notes
- The host is macOS-only and requires Node 22+, yt-dlp and ffmpeg.
- Playlists stay disabled on purpose; open a single video.

## [2.0.0] - 2026-11-15

The image-only extension becomes a media grabber, with X as the first-class target.

### Added
- **X video and GIF saving**: captures X's own GraphQL media payloads from the page, keeps the progressive MP4 renditions, and saves the best one. GIFs are X's silent MP4s, which is what X actually serves.
- **Per-post save button**: a download control in every media post's action row, cloned from X's own button so it matches the layout. Four states: ready, working, saved, error with a reason.
- **Photo saving on X**: original-size images at `?name=orig`, including all images in a multi-photo post.
- **Mixed and multi-media menu**: when a post has several items, a menu lists each with kind, duration and dimensions.
- **Public fallback**: posts whose API response was missed are resolved through X's public syndication endpoint. No cookies or bearer tokens are read.
- **Batch gallery**: a full-page view with filters (all/images/videos/GIFs), search, selection, preview lightbox, per-item status, retry-failed and ZIP-for-images.
- **Download history and duplicate detection**: saved media is remembered and marked in the gallery, and skipped by default.
- **New popup**: one status line, one primary action, plus hover-save, post-button and quality controls.
- **Settings page**: filename template with tokens, video quality, subfolder grouping, on-page controls, history reset, permission state.
- **First-run permission page**: Firefox MV3 site access is opt-in; the extension now asks for it instead of silently doing nothing.
- **Filename tokens** for `${author}`, `${tweet_id}` and `${media_id}`.

### Changed
- Renamed to MediaGrab; add-on id `mediagrab@madhusudan.dev`.
- Rebuilt the UI with React and Tailwind, including dark mode.
- Builds now emit to `output/` instead of `.output/` so Firefox can load them.
- ZIP batches are capped at 500 files / 500 MB and use a blob URL where available, avoiding the base64 data-URL limit.
- Saved videos are written with `conflictAction: uniquify`.
- Releases build both browsers, optionally sign the Firefox XPI unlisted, and publish `updates.json`.

### Removed
- The old in-page batch modal and its deep-scan scroll, replaced by the gallery.
- The AMO "listed" submission step; this build is distributed from GitHub.

### Known limits
- 720p is the ceiling for most posts; 1080p and HLS-only posts need the 2.1 ffmpeg muxing work.
- Protected and age-gated posts cannot be resolved without authentication, and no authentication is bypassed.
- X can change its DOM or payloads at any time; the capture layer and public fallback are the mitigations.
