# UX patterns

## Popup

- One job: status + primary action. Badge count on the toolbar icon is the category-wide "media here" signal [V](https://help.downloadhelper.net/article/4-basic-usage).
- 350px wide is correct; height follows content under the 600px clamp [V](https://extension.js.org/docs/implementation-guide/popup-sizing).
- Fatkun's popup is two buttons because the work happens elsewhere [V](https://fatkun.org/how-to-use-fatkun-batch-download-image-plugin). Treat the popup as triage, not a workspace.
- uBlock's pattern: one large primary control + one stat, settings behind a gear that opens a dashboard [V](https://github.com/gorhill/uBlock/wiki/Quick-guide:-popup-user-interface).

## In-page

- Put per-item control in the host's own action bar (X downloaders append an icon after share/bookmark), not a floating badge [V](https://chromewebstore.google.com/detail/twitterx-downloader/mimapfhmfcnkfdldiokhmgaflkclnelg).
- Four inline states: ready → fetching → done → error with a plain-language reason.
- Hover intent ~100ms, fixed-position overlay, zero reflow.
- Bulk is an explicit mode with its own shortcut (B); hover-save on P [V](https://chromewebstore.google.com/detail/twitter-x-video-downloade/mobkjhjdbpomkighonleeejfeblfgnla).
- Shift+click range select, Esc exits [V](https://github.com/Nijika-jia/X-Media-Downloader).

## Batch gallery

- Grid beats list; pixels on the tile; filters above; primary Download top-left [V](https://tooltivity.com/extensions/imageye).
- Mixed aspect ratios → masonry, density +/–, remembered.
- Filter All/Photos/Videos, plus author or post text — not an eight-way file-type matrix [V](https://chromewebstore.google.com/detail/x-media-gallery/elblpcbpknpdgfpbgoflmamfpnknjaja).
- Lightbox: arrows, Esc close, D download, Space play.
- Per-item state with "retry failed" only. Explicit checkmarks; dimming selected tiles is ambiguous [V](https://octoparse.jp/blog/how-to-use-fatkun-batch-download-image/).

## Video

- Quality select defaults to Best with size and format visible before commit [V](https://help.downloadhelper.net/article/4-basic-usage).
- Audio-only is a first-class choice for video sites; for X it is v2.
- Long HLS jobs run in a dedicated progress surface; unsupported/encrypted streams get explicit copy, not a silent failure [V](https://cococut.net/tutorial.html).
- X: audio is a separate stream that must be muxed; HLS-only long videos should be labeled unsupported **before** the click.

## Visual and accessibility

- 4/8/16/24 spacing scale, ≥14px body type, system stack; `prefers-color-scheme` dark mode; toasts over alerts.
- 48px targets, visible focus ring, dialog role + focus trap + Esc restores focus, never color-only status [V](https://github.com/uBlockOrigin/uBlock-issues/issues/1027).
- Permission rationale as purpose ("read media on this page"), not scope names.

## Three rules for the redesign

1. **Popup = status + one action.** "12 media on this page: 9 images · 2 videos · 1 GIF" and a single **Review & save**. Settings live in a real options page.
2. **Per-item control in the native action bar; bulk as a deliberate mode.** One-click on the tweet, select mode entered explicitly.
3. **Say exactly what will be saved.** Type, dimensions, duration, size, quality on every tile, explicit checkmarks, per-item progress, retry only failed.
