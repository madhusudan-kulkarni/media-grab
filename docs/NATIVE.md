# YouTube downloads with yt-dlp

MediaGrab does not extract YouTube streams inside the browser. YouTube's web
player now uses SABR streaming and proof-of-origin tokens, and that arms race is
better fought by [yt-dlp](https://github.com/yt-dlp/yt-dlp) than by an extension.

Instead, the extension talks to a **native messaging host** on this Mac. The
host validates the request and runs yt-dlp with a fixed set of flags. Video and
audio are merged by ffmpeg.

## Requirements

- macOS
- Node.js 22 or newer
- `yt-dlp` and `ffmpeg` on `PATH`

```bash
brew install yt-dlp ffmpeg
```

Useful extras for stubborn videos:

```bash
brew upgrade yt-dlp          # first thing to try when YouTube breaks
# optional PO-token provider, if downloads start returning 403:
# https://github.com/Breainicism/bgutil-ytdlp-pot-provider
```

## Install the host

From the repository:

```bash
pnpm native:install
```

or directly:

```bash
node native/install.mjs
```

It writes:

| Path | Purpose |
| --- | --- |
| `~/Library/Application Support/MediaGrab/native/host.mjs` | the host process |
| `~/Library/Application Support/MediaGrab/native/run.sh` | launcher used by the browser |
| `~/Library/Application Support/Mozilla/NativeMessagingHosts/dev.madhusudan.mediagrab.json` | Firefox registration |

The installer prints the detected Node, yt-dlp and ffmpeg versions. Restart
Firefox afterwards; the extension opens native ports lazily, so a restart is the
reliable way to pick up a new host.

Chrome support is opt-in and needs the extension id:

```bash
node native/install.mjs --chrome-id=<32-character-id>
```

Chrome only allows native hosts for a fixed set of extension ids, so this is only
worth doing if you pin the unpacked extension's id.

## Use it

1. Open a YouTube video.
2. Click the MediaGrab toolbar icon. The popup shows a **YouTube video** card
   instead of page media.
3. Pick a quality and press **Download**.
4. A notification fires when the merge finishes.

Files go to `~/Downloads/MediaGrab/yt-dlp/<site>/<uploader>/<title> [id].<ext>`.
Change the folder in Settings → YouTube.

## Settings

- **Output folder** — absolute path or `~/...`.
- **Cookies from browser** — off by default. Enable it for private or
  age-restricted videos; yt-dlp reads the browser's cookie store.
- **Quality** — Best, 1080p, 720p, 480p. Best merges the highest video and audio.

## Security

The host only accepts messages from the MediaGrab add-on id
(`mediagrab@madhusudan.dev`), enforced by Firefox through the manifest.

Inside the host:

- URLs must be `http` or `https`, at most 2048 characters, with no control
  characters.
- Quality and cookie sources are enums; unknown values fall back to safe
  defaults.
- The output folder must be absolute or start with `~`.
- yt-dlp is started with an argument array, never a shell. There is no
  `child_process.exec`.
- At most two downloads run at once; additional requests queue.
- Each job is killed after 45 minutes.

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| "helper missing" in the popup | Run `pnpm native:install`, restart Firefox. Check the manifest path above exists. |
| yt-dlp is missing | `brew install yt-dlp` |
| ffmpeg is missing | `brew install ffmpeg` |
| HTTP 403 or "Requested format is not available" | `brew upgrade yt-dlp`; enable cookies; if it persists, install a PO-token provider. |
| Private or age-restricted video fails | Settings → YouTube → Cookies → Firefox, and make sure that browser is signed in. |
| Playlist links | Playlists are deliberately disabled; open a single video. |
| Slow downloads | yt-dlp is throttled by the CDN without a token; a PO-token provider helps. |

Logs: native host output goes to stderr, which Firefox does not show. Run the
host manually to debug:

```bash
node native/host.mjs          # then send framed messages on stdin
```

For a quick version check, the extension's Settings page pings the host and
reports the yt-dlp and ffmpeg versions.

## Update and remove

```bash
brew upgrade yt-dlp
pnpm native:uninstall
```

Uninstalling removes the host and both browser manifests. Downloaded files stay
where they are.

## Why not do this inside the extension?

As of late 2026 YouTube's web client returns only SABR formats, and most clients
need a PO token bound to the video and session. yt-dlp itself is a full-time
maintenance project that ships repairs within days of each change. Reimplementing
that inside an MV3 extension would mean a SABR protobuf client, a JavaScript
challenge solver, an attestation provider, and ffmpeg.wasm — a second project,
not a feature. Delegating to the tool that already does it keeps this extension
small and honest.
