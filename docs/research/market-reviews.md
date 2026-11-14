# Market, reviews and positioning

Research for the ImageGrab → MediaGrab overhaul. Done 2026-11-14.
[V] verified in a source, [K] from knowledge, [U] unverified, test first.

## Market

| Extension | Platform | Users | Rating | Price | Headline |
| --- | --- | --- | --- | --- | --- |
| Video DownloadHelper | Chrome + Firefox | 6M / 1.9M DAU | 4.7 / 4.3 | Free; merge paid | HLS/DASH, 1000+ sites, no YouTube [V](https://help.downloadhelper.net/article/29-non-premium-restrictions) |
| Imageye | Chrome | 2M | 4.8 | Free + Pro | filters, bulk, webp convert [V](https://tooltivity.com/extensions/imageye) |
| Image Downloader (Pact) | Chrome | 2M | 4.0 | Free | filter/dedupe, rename, subfolder [V](https://chromewebstore.google.com/detail/image-downloader/cnpniohnfphhjihaiiggeabnkjhpaldj) |
| Fatkun → Fiktu | Chrome | 200K | 4.6 | Freemium | batch, multi-tab [V](https://fatkun.org/) |
| Media Harvest (X) | Chrome + FF | 100K | 4.8 | Free, OSS | X one-click, filenames, **no batch/ZIP by design** [V](https://chromewebstore.google.com/detail/media-harvest-x-twitter-m/hpcgabhdlnapolkkjpejieegfpehfdok) |
| X/Twitter Content Backup | Chrome | 20K | 4.5 | IAP | timeline batch, ZIP, XLSX, aria2 [V](https://chromewebstore.google.com/detail/xtwitter-content-backup-t/dcpelmafllhhdcbiegigphjnbgnolkgm) |
| CocoCut | Chrome | 900K | 4.8 | Free | HLS m3u8, quality picker, record [V](https://cococut.net/articles/faq.html) |
| DownThemAll! | Chrome + Firefox | 200K / 197K DAU | 3.9 / 4.1 | Donations | queue, rename masks [V](https://about.downthemall.org/4.0/) |
| Hover Zoom+ | Chrome | 300K | 4.1 | Free, OSS | hover enlarge + save [V](https://chromewebstore.google.com/detail/hover-zoom+/pccckmaobkjjboncdfnnofkonhgpceea) |
| Imagus | Chrome + Firefox | 200K / 54K DAU | 4.38 FF | Free | 200+ site rules; Chrome build dead after MV2 removal (Aug 2026) [V](https://www.getbellevue.com/blog/hover-zoom-alternatives/) |

## Likes and dislikes

| App | People like | People dislike |
| --- | --- | --- |
| Video DownloadHelper | site breadth, one-click detection, rename before save | free tier now rate-limits; QR watermark; silent 360p downgrade; cluttered stream list; update tab |
| Imageye / Fatkun | finds images others miss, filters, single ZIP | thumbnails instead of originals on X; misses media; collisions; Firefox neglected; Fatkun pulled from CWS for malware, relaunched as Fiktu [V](https://chrome-stats.com/d/gjnbhjpcpiegmooelafaphjciekfindc) |
| X downloaders | one-click, original quality, local processing, "already downloaded" state | paywalls after 10 items; breaks on every X UI change; bulk "finished" with zero files; MP4 with broken moov atom [V](https://github.com/imputnet/cobalt/issues/1399) |
| DownThemAll! | true bulk, link selection | double downloads; Save As per file; no stop; Chrome build pulled |
| Generic image savers | instant, filters beat right-click | adware history; `<all_urls>` scares installs; ZIP OOM "Aw Snap" [V](https://github.com/Stuk/jszip/issues/446) |

## Patterns

1. **Betrayal after trust.** Free → rate limit → watermark → subscription is the most-quoted grievance and converts 5-star users to 1-star fastest.
2. **Silent wrongness beats visible failure.** Thumbnail instead of original, 360p instead of 1080p, "done" with zero files, unplayable MP4. Users forgive errors, not files that look fine and aren't.
3. **Click tax.** The tools people keep save in one gesture on the media itself.
4. **Fragility is expected, opacity isn't.** Everyone breaks on X changes; only the silent ones get uninstalled.

## Decision

Position as **"Media Harvest's one-click, plus the archive job"** — per-post one-click and batch on the same page, with honest quality labels. Do not chase Video DownloadHelper's site list. Trust (activeTab, optional permissions, no telemetry, no ads) is a stated feature, because CWS history in this category is adware and delistings.
