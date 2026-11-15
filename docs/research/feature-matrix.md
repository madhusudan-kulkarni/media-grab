# Feature matrix

Leaders vs ImageGrab today. ● strong · ◐ partial · ○ absent · P paid-only. IG = ImageGrab (current).
Apps: VDH = Video DownloadHelper, IY = Imageye, FK = Fatkun/Fiktu, DTA = DownThemAll!, CC = CocoCut, X = Plucker / X media tools, VDP = Video Downloader Plus, HZ = Hover Zoom+.

| Feature | VDH | IY | FK | DTA | CC | X | VDP | HZ | IG |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Per-item save | ● | ● | ● | ● | ● | ● | ● | ● | ● |
| Hover button / preview | ○ | ◐ | ◐ | ○ | ○ | ◐ | ○ | ● | ● |
| Batch / select-all | ● | ● | ● | ● | ◐P | ● | ● | ○ | ● |
| ZIP bundle | ○ | ● | ● | ○ | ○ | ◐ | ○ | ○ | ● |
| Media-type filter | ◐ | ● | ● | ● | ◐ | ◐ | ◐ | ○ | ● |
| Quality / resolution | ● | ○ | ○ | ○ | ● | ● | ● | ○ | ○ |
| HLS / DASH | ● | ○ | ○ | ○ | ● | ○ | ● | ○ | ○ |
| Audio track / merge | ● | ○ | ○ | ○ | ◐ | ◐ | ● | ○ | ○ |
| GIF handling | ◐ | ● | ● | ◐ | ◐ | ● | ◐ | ● | ◐ |
| Filename template | ● | ◐ | ● | ● | ○ | ● | ◐ | ○ | ● |
| Subfolder per site | ● | ● | ● | ● | ○ | ● | ◐ | ○ | ◐ |
| History / recent | ● | ○ | ○ | ● | ○ | ● | ● | ○ | ○ |
| Clipboard copy | ◐ | ● | ◐ | ● | ○ | ○ | ○ | ● | ○ |
| Keyboard + menu | ● | ◐ | ◐ | ● | ○ | ● | ○ | ◐ | ● |
| Video preview | ◐ | ● | ● | ○ | ● | ● | ◐ | ● | ◐ |
| Conversion | ○ | ● | ● | ○ | ○ | ◐ | ● | ○ | ○ |
| Dimensions / duration | ◐ | ● | ● | ◐ | ◐ | ○ | ◐ | ◐ | ◐ |
| Deep scan | ○ | ◐P | ◐ | ◐ | ○ | ○ | ○ | ○ | ● |
| PDF / SVG / CSS bg | ◐ | ● | ◐ | ● | ○ | ○ | ○ | ◐ | ○ |
| Blocked-site handling | ◐ | ◐ | ◐ | ○ | ◐ | ○ | ● | ◐ | ○ |
| Settings sync | ○ | ○ | ○ | ○ | ○ | ○ | ● | ○ | ○ |
| Paywall / limits | ● | ● | ● | ○ | ● | ● | ● | ○ | ○ |

## Findings

1. **ZIP is not table stakes.** Imageye, Fatkun and DownThemAll ship loose files. Our ZIP + filename templates + subfolder combo is a wedge, not catch-up.
2. **Cheap, unowned-together differentiators:** download history, duplicate detection, copy URL, per-site disable, hover-save. Leaders split them; no batch leader has hover-save. Imagus' Chrome build died with MV2, so cross-browser MV3 hover-save is open.
3. **Video only works at full depth.** Half-support (no quality choice, no audio merge, no HLS story) ranks last in every comparison. But "full depth" for X means honest 720p progressive MP4 + explicit unsupported state, not a 32 MB ffmpeg bundle on day one.
4. **v2 candidates in order:** duplicate detection + history → HLS/DASH with audio merge → conversion/settings sync.
