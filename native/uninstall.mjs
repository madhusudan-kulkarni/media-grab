#!/usr/bin/env node
/**
 * Remove the MediaGrab native host and messaging manifests.
 * Downloaded files are left untouched.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { FIREFOX_ADDON_ID, HOST_NAME } from './lib/constants.mjs';

const home = os.homedir();
const targets = [
  path.join(home, 'Library', 'Application Support', 'Mozilla', 'NativeMessagingHosts', `${HOST_NAME}.json`),
  path.join(home, 'Library', 'Application Support', 'Google', 'Chrome', 'NativeMessagingHosts', `${HOST_NAME}.json`),
];

for (const file of targets) {
  if (fs.existsSync(file)) {
    fs.rmSync(file);
    console.log(`removed ${file}`);
  }
}

const supportDir = path.join(home, 'Library', 'Application Support', 'MediaGrab', 'native');
if (fs.existsSync(supportDir)) {
  fs.rmSync(supportDir, { recursive: true, force: true });
  console.log(`removed ${supportDir}`);
}

console.log(`\nMediaGrab host ${HOST_NAME} (${FIREFOX_ADDON_ID}) removed. Downloads were not touched.`);
