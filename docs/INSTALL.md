# Installing MediaGrab

Personal build. There is no store listing; releases are zips and a signed XPI on GitHub.

## Build

```bash
pnpm install
pnpm build:firefox     # -> output/firefox-mv3
pnpm build             # -> output/chrome-mv3
pnpm zip && pnpm zip:firefox   # -> output/*.zip
```

`output/` is intentionally not a hidden folder, so Firefox's file picker can reach it.

## Firefox (primary)

Firefox MV3 treats site access as opt-in. Nothing runs until it is granted, and
re-adding the add-on resets it. The first-run page asks for it; if it is skipped,
use the popup banner or `about:addons → MediaGrab → Permissions`.

### Temporary install, no signing

1. `about:debugging#/runtime/this-firefox`
2. **Load Temporary Add-on…** → `output/firefox-mv3/manifest.json`
3. Grant site access when the MediaGrab page opens.
4. Temporary add-ons disappear when Firefox restarts.

### Permanent install on stable Firefox (unlisted signing)

Stable Firefox only runs signed add-ons. Sign the build against AMO in the
unlisted channel — it is not listed publicly.

1. Create an API key at <https://addons.mozilla.org/developers/addon/api/key/>.
2. Sign:

```bash
FIREFOX_JWT_ISSUER=... FIREFOX_JWT_SECRET=... pnpm sign:firefox
```

Or set `FIREFOX_JWT_ISSUER` (API key) and `FIREFOX_JWT_SECRET` (API secret) as
GitHub secrets; the release workflow then signs the build and attaches
`mediagrab-<version>.xpi` to the release. The older `AMO_API_KEY` /
`AMO_API_SECRET` names are not needed.

3. Drag the signed `.xpi` into Firefox, or use
   `about:addons → gear → Install Add-on From File…`.

The add-on ID is `mediagrab@madhusudan.dev`. Keep it stable: changing it makes
Firefox treat the install as a different add-on and drops the grant.

### Updates

`browser_specific_settings.gecko.update_url` points at
`updates.json` on the repository's main branch. On a tag release the workflow
rewrites it to the new signed XPI. Firefox checks it on its normal update cycle.
If an update does not appear, reinstall the new XPI — that always works.

## Chrome / Chromium (secondary)

1. `chrome://extensions` → enable **Developer mode**
2. **Load unpacked** → `output/chrome-mv3`

Chrome has no unlisted signing path; keep using the unpacked build. Host access
is requested at install, unlike Firefox.

## Notes

- Downloads go to the browser's normal download folder. Filename template,
  subfolders and video quality live in the extension's Settings page.
- X posts that are HLS-only cannot be saved until the 2.1 muxing work; the UI
  marks them as unsupported instead of failing silently.
- Nothing is uploaded anywhere. Media is read from the page you are on and saved
  locally, with one exception: public posts whose GraphQL response was missed are
  resolved through X's public syndication endpoint.
