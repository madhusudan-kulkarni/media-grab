# MediaGrab

Save images, GIFs and videos from any page — one at a time or all at once. Built for X, works anywhere with standard HTML media.

<p>
  <a href="docs/INSTALL.md"><img src="https://img.shields.io/badge/install-guide-1d9bf0" alt="Install guide"></a>
  <a href="https://github.com/madhusudan-kulkarni/media-grab/releases/latest"><img src="https://img.shields.io/github/v/release/madhusudan-kulkarni/media-grab?display_name=release" alt="Release"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-ISC-blue" alt="License"></a>
</p>

## What it does

- **One click on X.** A save control in each post's action row, next to share. Videos come down as progressive MP4, GIFs as the silent MP4 X actually serves, photos at original size.
- **Every item in a post.** Multi-video and photo posts open a small menu; multi-photo posts save all images with indexed names.
- **Batch gallery.** Open the popup, press *Review & save*, filter by type, search, select, preview, and download. ZIP for images; videos download individually so large batches do not blow up memory.
- **Remembers what you saved.** Already-downloaded media is marked and skipped, with a retry-failed action for the rest.
- **Works off X too.** Scans `<img>`/`srcset`/`<picture>`, CSS backgrounds, canvases, `<video>`/`<source>` and direct media links.
- **Local only.** No telemetry, no account, no remote code. Media is read from the page you are on; public posts whose API response was missed are resolved through X's public syndication endpoint.

## Install

This is a personal build, not a store listing. See **[docs/INSTALL.md](docs/INSTALL.md)** for Firefox (temporary and unlisted-signed), Chrome, and updates.

Short version for development:

```bash
pnpm install
pnpm dev:firefox      # loads a temporary add-on with hot reload
pnpm build:firefox    # output/firefox-mv3
pnpm build            # output/chrome-mv3
```

Firefox will ask for site access once. Without it, Firefox MV3 runs no content scripts at all.

## Limits

- Most X videos top out at 720p; 1080p and HLS-only posts need the 2.1 muxing work.
- Protected and age-gated posts are not supported. No authentication is bypassed.
- X changes its markup and payloads; the capture layer plus public fallback exist to absorb that.

## Development

```bash
pnpm test        # vitest, media parsing and variant ranking
pnpm exec tsc --noEmit
pnpm icons       # regenerate icons from the SVG source
```

Layout:

- `src/entrypoints/media-capture.content.ts` — MAIN-world fetch/XHR hook on x.com.
- `src/entrypoints/x-bridge.content.ts` — isolated bridge, per-post button, media index.
- `src/entrypoints/image-scraper.content.tsx` — DOM scanning and hover save.
- `src/entrypoints/popup`, `gallery`, `options` — React surfaces.
- `src/utils/media.ts` — media model, variant ranking, X payload parsing.
- `src/utils/history.ts` — saved-media index.

Research and the overhaul plan live in [`docs/`](docs/).

## License

ISC.
