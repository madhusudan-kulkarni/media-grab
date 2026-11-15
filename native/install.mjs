#!/usr/bin/env node
/**
 * Install the MediaGrab native messaging host for the current macOS user.
 *
 * Writes:
 *   ~/Library/Application Support/MediaGrab/native/          (host + launcher)
 *   ~/Library/Application Support/Mozilla/NativeMessagingHosts/dev.madhusudan.mediagrab.json
 *   ~/Library/Application Support/Google/Chrome/NativeMessagingHosts/... (only with --chrome-id)
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { FIREFOX_ADDON_ID, HOST_NAME } from './lib/constants.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const home = os.homedir();

if (process.platform !== 'darwin') {
  console.error('This installer targets macOS. On other platforms, place the host manifest by hand.');
  process.exit(1);
}

const args = process.argv.slice(2);
const chromeIdArg = args.find((arg) => arg.startsWith('--chrome-id='));
const chromeId = chromeIdArg ? chromeIdArg.split('=')[1] : null;

if (chromeId && !/^[a-p]{32}$/.test(chromeId)) {
  console.error(`Invalid Chrome extension id: ${chromeId}`);
  process.exit(1);
}

const supportDir = path.join(home, 'Library', 'Application Support', 'MediaGrab', 'native');
const firefoxDir = path.join(home, 'Library', 'Application Support', 'Mozilla', 'NativeMessagingHosts');
const chromeDir = path.join(home, 'Library', 'Application Support', 'Google', 'Chrome', 'NativeMessagingHosts');

function copy(source, target) {
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(source, target);
}

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

fs.mkdirSync(path.join(supportDir, 'lib'), { recursive: true });
copy(path.join(here, 'host.mjs'), path.join(supportDir, 'host.mjs'));
copy(path.join(here, 'lib', 'args.mjs'), path.join(supportDir, 'lib', 'args.mjs'));

const launcher = path.join(supportDir, 'run.sh');
const nodePath = process.execPath;
fs.writeFileSync(
  launcher,
  `#!/bin/sh\n` +
    `# Firefox started from Finder has a minimal PATH; add Homebrew and use the\n` +
    `# absolute Node path so nvm installations work too.\n` +
    `export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"\n` +
    `exec "${nodePath}" "${path.join(supportDir, 'host.mjs')}" "$@"\n`
);
fs.chmodSync(launcher, 0o755);

const hostManifestForFirefox = {
  name: HOST_NAME,
  description: 'MediaGrab yt-dlp download host',
  path: launcher,
  type: 'stdio',
  allowed_extensions: [FIREFOX_ADDON_ID],
};
writeJson(path.join(firefoxDir, `${HOST_NAME}.json`), hostManifestForFirefox);

if (chromeId) {
  writeJson(path.join(chromeDir, `${HOST_NAME}.json`), {
    name: HOST_NAME,
    description: 'MediaGrab yt-dlp download host',
    path: launcher,
    type: 'stdio',
    allowed_origins: [`chrome-extension://${chromeId}/`],
  });
}

function check(binary, args) {
  const result = spawnSync(binary, args, { encoding: 'utf8', timeout: 5000 });
  if (result.status !== 0) return null;
  return (result.stdout || '').trim().split('\n')[0];
}

const node = check('node', ['--version']);
const ytDlp = check('yt-dlp', ['--version']);
const ffmpeg = check('ffmpeg', ['-version']);

console.log('\nMediaGrab native host installed\n');
console.log(`  host:     ${path.join(supportDir, 'host.mjs')}`);
console.log(`  manifest: ${path.join(firefoxDir, `${HOST_NAME}.json`)}`);
if (chromeId) console.log(`  chrome:   ${path.join(chromeDir, `${HOST_NAME}.json`)}`);
console.log(`  node:     ${node || 'MISSING'}`);
console.log(`  yt-dlp:   ${ytDlp || 'MISSING — brew install yt-dlp'}`);
console.log(`  ffmpeg:   ${ffmpeg || 'MISSING — brew install ffmpeg'}`);

if (!ytDlp || !ffmpeg) {
  console.log('\nInstall the missing tools before downloading:\n  brew install yt-dlp ffmpeg');
}

console.log('\nNext: restart Firefox, then use "Download with yt-dlp" in the MediaGrab popup.');
console.log('Uninstall with: node native/uninstall.mjs\n');
