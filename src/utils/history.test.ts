import { describe, expect, it } from 'vitest';
import { mediaKey } from './history';

describe('mediaKey', () => {
  it('strips query strings and fragments', () => {
    expect(mediaKey('https://video.twimg.com/1/pu/vid/avc1/720x1280/clip.mp4?tag=12#t')).toBe(
      'video.twimg.com/1/pu/vid/avc1/720x1280/clip.mp4'
    );
  });

  it('keeps distinct paths distinct', () => {
    expect(mediaKey('https://pbs.twimg.com/media/a.jpg')).not.toBe(
      mediaKey('https://pbs.twimg.com/media/b.jpg')
    );
  });

  it('falls back for unparseable URLs', () => {
    expect(mediaKey('not a url?x=1')).toBe('not a url');
  });
});
