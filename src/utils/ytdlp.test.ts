import { describe, expect, it } from 'vitest';
import { isYoutubeUrl, normalizeYoutubeUrl, qualityLabel } from './ytdlp';

describe('isYoutubeUrl', () => {
  it('accepts the usual YouTube hosts', () => {
    expect(isYoutubeUrl('https://www.youtube.com/watch?v=abc123def45')).toBe(true);
    expect(isYoutubeUrl('https://youtu.be/abc123def45')).toBe(true);
    expect(isYoutubeUrl('https://music.youtube.com/watch?v=abc123def45')).toBe(true);
    expect(isYoutubeUrl('https://m.youtube.com/watch?v=abc123def45')).toBe(true);
  });

  it('rejects lookalike hosts and other sites', () => {
    expect(isYoutubeUrl('https://youtube.com.evil.test/watch?v=1')).toBe(false);
    expect(isYoutubeUrl('https://x.com/watch?v=1')).toBe(false);
    expect(isYoutubeUrl('not a url')).toBe(false);
    expect(isYoutubeUrl(undefined)).toBe(false);
  });
});

describe('normalizeYoutubeUrl', () => {
  it('canonicalises watch URLs and drops playlists and timestamps', () => {
    expect(
      normalizeYoutubeUrl('https://www.youtube.com/watch?v=abc123def45&list=PL123&t=42s')
    ).toBe('https://www.youtube.com/watch?v=abc123def45');
  });

  it('handles youtu.be, shorts, live and embed', () => {
    expect(normalizeYoutubeUrl('https://youtu.be/abc123def45?t=10')).toBe(
      'https://www.youtube.com/watch?v=abc123def45'
    );
    expect(normalizeYoutubeUrl('https://www.youtube.com/shorts/abc123def45')).toBe(
      'https://www.youtube.com/watch?v=abc123def45'
    );
    expect(normalizeYoutubeUrl('https://www.youtube.com/live/abc123def45')).toBe(
      'https://www.youtube.com/watch?v=abc123def45'
    );
    expect(normalizeYoutubeUrl('https://www.youtube.com/embed/abc123def45')).toBe(
      'https://www.youtube.com/watch?v=abc123def45'
    );
  });

  it('rejects pages without a video id', () => {
    expect(normalizeYoutubeUrl('https://www.youtube.com/feed/subscriptions')).toBeNull();
    expect(normalizeYoutubeUrl('https://www.youtube.com/watch?v=')).toBeNull();
    expect(normalizeYoutubeUrl('https://x.com/a/status/1')).toBeNull();
  });
});

describe('qualityLabel', () => {
  it('labels best and caps', () => {
    expect(qualityLabel('best')).toBe('Best available');
    expect(qualityLabel('1080')).toBe('1080p');
  });
});
