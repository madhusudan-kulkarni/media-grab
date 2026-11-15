import { describe, expect, it } from 'vitest';
import {
  buildArgs,
  defaultOutputDir,
  expandHome,
  parseLine,
  validateRequest,
} from './args.mjs';
import type { DownloadRequest, ValidationResult } from './args.mjs';

const HOME = '/Users/tester';

describe('expandHome', () => {
  it('expands ~ and ~/ paths', () => {
    expect(expandHome('~', HOME)).toBe(HOME);
    expect(expandHome('~/Downloads', HOME)).toBe('/Users/tester/Downloads');
  });

  it('leaves absolute paths alone', () => {
    expect(expandHome('/tmp/x', HOME)).toBe('/tmp/x');
  });
});

describe('defaultOutputDir', () => {
  it('sits under Downloads/MediaGrab/yt-dlp', () => {
    expect(defaultOutputDir(HOME)).toBe('/Users/tester/Downloads/MediaGrab/yt-dlp');
  });
});

describe('validateRequest', () => {
  it('accepts a normal download and expands the folder', () => {
    const result = validateRequest(
      { id: 'a1', type: 'download', url: 'https://www.youtube.com/watch?v=abc', quality: '720' },
      HOME
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toMatchObject({
      id: 'a1',
      quality: '720',
      cookiesBrowser: 'none',
      outputDir: '/Users/tester/Downloads/MediaGrab/yt-dlp',
    });
  });

  it('rejects non-http protocols', () => {
    expect(validateRequest({ id: 'a', type: 'download', url: 'file:///etc/passwd' }, HOME).ok).toBe(false);
    expect(validateRequest({ id: 'a', type: 'download', url: 'javascript:alert(1)' }, HOME).ok).toBe(false);
  });

  it('rejects control characters in URLs', () => {
    expect(
      validateRequest({ id: 'a', type: 'download', url: 'https://x.com/\u0000evil' }, HOME).ok
    ).toBe(false);
  });

  it('rejects relative output folders', () => {
    expect(
      validateRequest({ id: 'a', type: 'download', url: 'https://x.com/a', outputDir: 'Downloads' }, HOME).ok
    ).toBe(false);
  });

  it('falls back to safe defaults for unknown enums', () => {
    const result = validateRequest(
      { id: 'a', type: 'download', url: 'https://x.com/a', quality: '8k', cookiesBrowser: 'netscape' },
      HOME
    );
    expect(result.ok).toBe(true);
    if (!result.ok || result.value.type !== 'download') return;
    expect(result.value.quality).toBe('best');
    expect(result.value.cookiesBrowser).toBe('none');
  });

  it('accepts ping and cancel without a URL', () => {
    expect(validateRequest({ id: 'p', type: 'ping' }, HOME).ok).toBe(true);
    expect(validateRequest({ id: 'c', type: 'cancel' }, HOME).ok).toBe(true);
  });

  it('rejects missing ids', () => {
    expect(validateRequest({ type: 'ping' }, HOME).ok).toBe(false);
  });
});

describe('buildArgs', () => {
  const base: DownloadRequest = {
    id: '1',
    type: 'download',
    url: 'https://www.youtube.com/watch?v=abc',
    quality: 'best',
    cookiesBrowser: 'none',
    outputDir: '/Users/tester/Downloads/MediaGrab/yt-dlp',
  };

  it('merges video and audio and asks for a final path', () => {
    const args = buildArgs(base);
    expect(args).toContain('bv*+ba/b');
    expect(args).toContain('--merge-output-format');
    expect(args.join(' ')).toContain('after_move:MGFILE');
    expect(args.at(-1)).toBe(base.url);
  });

  it('caps quality with a height filter', () => {
    expect(buildArgs({ ...base, quality: '720' })).toContain('bv*[height<=720]+ba/b[height<=720]/b');
  });

  it('adds cookies only when requested', () => {
    expect(buildArgs(base)).not.toContain('--cookies-from-browser');
    const withCookies = buildArgs({ ...base, cookiesBrowser: 'firefox' });
    expect(withCookies).toContain('--cookies-from-browser');
    expect(withCookies).toContain('firefox');
  });

  it('never uses a shell', () => {
    const args = buildArgs(base);
    expect(args.some((arg) => arg.includes(';') || arg.includes('&&'))).toBe(false);
  });
});

describe('parseLine', () => {
  it('parses the file marker', () => {
    expect(parseLine('MGFILE /Users/tester/Downloads/a.mp4')).toEqual({
      kind: 'file',
      path: '/Users/tester/Downloads/a.mp4',
    });
  });

  it('parses progress and clamps it', () => {
    expect(parseLine('MGPROG  42.5%| 1.2MiB/s| 00:03')).toEqual({
      kind: 'progress',
      percent: 42.5,
      speed: '1.2MiB/s',
      eta: '00:03',
    });
    const clamped = parseLine('MGPROG 140.0%| 1MiB/s| 00:00');
    expect(clamped?.kind === 'progress' ? clamped.percent : null).toBe(100);
  });

  it('strips ANSI colour codes', () => {
    expect(parseLine('\u001b[0;32mMGFILE /tmp/a.mp4\u001b[0m')?.kind).toBe('file');
  });

  it('ignores unrelated output', () => {
    expect(parseLine('[youtube] Extracting URL: ...')).toBeNull();
    expect(parseLine('')).toBeNull();
  });
});
