import path from 'node:path';

export const QUALITIES = ['best', '1080', '720', '480'];
export const COOKIE_SOURCES = ['none', 'firefox', 'chrome', 'safari', 'edge', 'brave'];
export const HOST_VERSION = '1.0.0';

const CONTROL_CHARS = /[\u0000-\u001f\u007f]/;
const MAX_URL = 2048;
const MAX_PATH = 500;

export function stripAnsi(input) {
  // eslint-disable-next-line no-control-regex
  return String(input).replace(/\u001b\[[0-9;]*m/g, '');
}

export function expandHome(value, home) {
  if (value === '~') return home;
  if (value.startsWith('~/')) return path.join(home, value.slice(2));
  return value;
}

export function defaultOutputDir(home) {
  return path.join(home, 'Downloads', 'MediaGrab', 'yt-dlp');
}

function fail(error) {
  return { ok: false, error };
}

/**
 * Validate an untrusted message from the extension. The host is deliberately
 * strict: it is the only component that can spawn processes.
 */
export function validateRequest(raw, home) {
  if (!raw || typeof raw !== 'object') return fail('Invalid request');

  const id = typeof raw.id === 'string' && raw.id.length > 0 && raw.id.length <= 80 ? raw.id : null;
  if (!id) return fail('Missing or invalid request id');

  if (raw.type === 'ping') return { ok: true, value: { id, type: 'ping' } };

  if (raw.type === 'cancel') return { ok: true, value: { id, type: 'cancel' } };

  if (raw.type !== 'download') return fail('Unknown request type');

  const url = typeof raw.url === 'string' ? raw.url.trim() : '';
  if (!url || url.length > MAX_URL || CONTROL_CHARS.test(url)) return fail('Invalid URL');

  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return fail('Invalid URL');
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return fail('Only http and https URLs are supported');
  }

  const quality = QUALITIES.includes(raw.quality) ? raw.quality : 'best';
  const cookiesBrowser = COOKIE_SOURCES.includes(raw.cookiesBrowser) ? raw.cookiesBrowser : 'none';

  const rawDir =
    typeof raw.outputDir === 'string' && raw.outputDir.trim()
      ? raw.outputDir.trim()
      : defaultOutputDir(home);
  if (rawDir.length > MAX_PATH || CONTROL_CHARS.test(rawDir)) return fail('Invalid output folder');

  const outputDir = expandHome(rawDir, home);
  if (!path.isAbsolute(outputDir)) return fail('Output folder must be absolute or start with ~');

  return {
    ok: true,
    value: {
      id,
      type: 'download',
      url: parsed.toString(),
      quality,
      cookiesBrowser,
      outputDir,
    },
  };
}

export function buildArgs(request) {
  const format =
    request.quality === 'best'
      ? 'bv*+ba/b'
      : `bv*[height<=${request.quality}]+ba/b[height<=${request.quality}]/b`;

  const args = [
    '--no-playlist',
    '--newline',
    '--no-quiet',
    '--no-mtime',
    '--merge-output-format',
    'mp4',
    '-f',
    format,
    '--progress-template',
    'download:MGPROG %(progress._percent_str)s|%(progress._speed_str)s|%(progress._eta_str)s',
    '--print',
    'after_move:MGFILE %(filepath)s',
    '-o',
    path.join(
      request.outputDir,
      '%(extractor_key)s',
      '%(uploader|Unknown)s',
      '%(title).120B [%(id)s].%(ext)s'
    ),
  ];

  if (request.cookiesBrowser && request.cookiesBrowser !== 'none') {
    args.push('--cookies-from-browser', request.cookiesBrowser);
  }

  args.push(request.url);
  return args;
}

/**
 * Parse one line of yt-dlp output. Only the two lines we asked for are
 * meaningful; everything else is ignored.
 */
export function parseLine(line) {
  const clean = stripAnsi(line).trim();

  const file = clean.match(/^MGFILE\s+(.+)$/);
  if (file) return { kind: 'file', path: file[1].trim() };

  const progress = clean.match(/^MGPROG\s+([\d.]+)%\s*\|\s*(\S+)\s*\|\s*(.+)$/);
  if (progress) {
    const percent = Number(progress[1]);
    if (!Number.isFinite(percent)) return null;
    return {
      kind: 'progress',
      percent: Math.max(0, Math.min(100, percent)),
      speed: progress[2].trim(),
      eta: progress[3].trim(),
    };
  }

  return null;
}
