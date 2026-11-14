import { describe, expect, it } from 'vitest';
import {
  capturedToScraped,
  extractMediaFromGraphql,
  formatDuration,
  parseDimensionsFromUrl,
  pickMp4Variant,
  extractMediaFromSyndication,
  syndicationEndpoint,
  syndicationToken,
} from './media';

const tweetWithVideo = {
  data: {
    tweetResult: {
      result: {
        __typename: 'Tweet',
        rest_id: '1600649710662213632',
        core: { user_results: { result: { legacy: { screen_name: 'example' } } } },
        legacy: {
          extended_entities: {
            media: [
              {
                media_key: '7_1600649511827013632',
                type: 'video',
                media_url_https: 'https://pbs.twimg.com/ext_tw_video_thumb/1600649511827013632/pu/img/thumb.jpg',
                original_info: { width: 1280, height: 720 },
                video_info: {
                  duration_millis: 12345,
                  variants: [
                    {
                      bitrate: 632000,
                      content_type: 'video/mp4',
                      url: 'https://video.twimg.com/ext_tw_video/1600/pu/vid/avc1/320x568/low.mp4?tag=12',
                    },
                    {
                      bitrate: 2176000,
                      content_type: 'video/mp4',
                      url: 'https://video.twimg.com/ext_tw_video/1600/pu/vid/avc1/720x1280/high.mp4?tag=12',
                    },
                    {
                      bitrate: 0,
                      content_type: 'application/x-mpegURL',
                      url: 'https://video.twimg.com/ext_tw_video/1600/pu/pl/master.m3u8',
                    },
                  ],
                },
              },
            ],
          },
        },
      },
    },
  },
};

describe('parseDimensionsFromUrl', () => {
  it('reads WIDTHxHEIGHT from an X media path', () => {
    expect(parseDimensionsFromUrl('https://video.twimg.com/a/avc1/720x1280/clip.mp4')).toEqual({
      width: 720,
      height: 1280,
    });
  });

  it('returns null when there is no size segment', () => {
    expect(parseDimensionsFromUrl('https://video.twimg.com/a/clip.mp4')).toBeNull();
  });
});

describe('pickMp4Variant', () => {
  const variants = extractMediaFromGraphql(tweetWithVideo)[0]!.variants;

  it('prefers the highest rendition on best', () => {
    expect(pickMp4Variant(variants, 'best')?.url).toContain('720x1280');
  });

  it('honours the quality cap', () => {
    expect(pickMp4Variant(variants, '480')?.url).toContain('320x568');
  });

  it('falls back to the smallest rendition when nothing fits the cap', () => {
    const onlyHigh = variants.filter((variant) => variant.url.includes('720x1280'));
    expect(pickMp4Variant(onlyHigh, '360')?.url).toContain('720x1280');
  });

  it('returns null for HLS-only media', () => {
    const hlsOnly = variants.filter((variant) => variant.url.endsWith('.m3u8'));
    expect(pickMp4Variant(hlsOnly, 'best')).toBeNull();
  });
});

describe('extractMediaFromGraphql', () => {
  it('keeps tweet id, author, dimensions and duration', () => {
    const media = extractMediaFromGraphql(tweetWithVideo)[0]!;
    expect(media).toMatchObject({
      id: '7_1600649511827013632',
      kind: 'video',
      tweetId: '1600649710662213632',
      author: 'example',
      width: 1280,
      height: 720,
      durationMs: 12345,
    });
    expect(media.variants).toHaveLength(3);
  });

  it('dedupes the same media appearing in both entity shapes', () => {
    const payload = {
      data: {
        tweetResult: {
          result: {
            rest_id: '1',
            legacy: {
              extended_entities: tweetWithVideo.data.tweetResult.result.legacy.extended_entities,
              entities: tweetWithVideo.data.tweetResult.result.legacy.extended_entities,
            },
          },
        },
      },
    };
    expect(extractMediaFromGraphql(payload)).toHaveLength(1);
  });

  it('classifies animated_gif as gif', () => {
    const payload = {
      data: {
        tweetResult: {
          result: {
            rest_id: '2',
            legacy: {
              extended_entities: {
                media: [
                  {
                    media_key: '16_2',
                    type: 'animated_gif',
                    media_url_https: 'https://pbs.twimg.com/tweet_video_thumb/2.jpg',
                    original_info: { width: 480, height: 270 },
                    video_info: {
                      variants: [
                        {
                          bitrate: 0,
                          content_type: 'video/mp4',
                          url: 'https://video.twimg.com/tweet_video/2.mp4',
                        },
                      ],
                    },
                  },
                ],
              },
            },
          },
        },
      },
    };
    const media = extractMediaFromGraphql(payload)[0]!;
    expect(media.kind).toBe('gif');
    expect(capturedToScraped(media)).toMatchObject({ kind: 'gif', ext: 'mp4' });
  });

  it('uses the original-size URL for photos', () => {
    const payload = {
      data: {
        tweetResult: {
          result: {
            rest_id: '3',
            legacy: {
              extended_entities: {
                media: [
                  {
                    media_key: '3_3',
                    type: 'photo',
                    media_url_https: 'https://pbs.twimg.com/media/abc.jpg',
                    original_info: { width: 2048, height: 1365 },
                  },
                ],
              },
            },
          },
        },
      },
    };
    const media = extractMediaFromGraphql(payload)[0]!;
    expect(media.kind).toBe('image');
    expect(capturedToScraped(media).src).toBe('https://pbs.twimg.com/media/abc.jpg?name=orig');
  });
});

describe('capturedToScraped', () => {
  it('marks HLS-only video as unsupported instead of pretending', () => {
    const payload = {
      data: {
        tweetResult: {
          result: {
            rest_id: '4',
            legacy: {
              extended_entities: {
                media: [
                  {
                    media_key: '13_4',
                    type: 'video',
                    media_url_https: 'https://pbs.twimg.com/thumb/4.jpg',
                    original_info: { width: 1920, height: 1080 },
                    video_info: {
                      variants: [
                        {
                          bitrate: 0,
                          content_type: 'application/x-mpegURL',
                          url: 'https://video.twimg.com/4/master.m3u8',
                        },
                      ],
                    },
                  },
                ],
              },
            },
          },
        },
      },
    };
    const media = extractMediaFromGraphql(payload)[0]!;
    expect(capturedToScraped(media)).toMatchObject({
      unsupported: 'hls-only',
      ext: 'm3u8',
    });
  });

  it('returns a playable mp4 for the best rendition', () => {
    const scraped = capturedToScraped(extractMediaFromGraphql(tweetWithVideo)[0]!, '720');
    expect(scraped.src).toContain('720x1280');
    expect(scraped.ext).toBe('mp4');
    expect(scraped.mimeType).toBe('video/mp4');
    expect(scraped.unsupported).toBeUndefined();
  });
});

describe('formatDuration', () => {
  it('formats milliseconds as m:ss', () => {
    expect(formatDuration(12345)).toBe('0:12');
    expect(formatDuration(125000)).toBe('2:05');
    expect(formatDuration(undefined)).toBe('');
  });
});

describe('syndication fallback', () => {
  const payload = {
    id_str: '1600649710662213632',
    user: { screen_name: 'CTVJLaidlaw' },
    mediaDetails: [
      {
        type: 'video',
        media_url_https: 'https://pbs.twimg.com/ext_tw_video_thumb/1/pu/img/thumb.jpg',
        original_info: { width: 720, height: 1280 },
        video_info: {
          duration_millis: 32200,
          variants: [
            {
              bitrate: 0,
              content_type: 'application/x-mpegURL',
              url: 'https://video.twimg.com/1/pu/pl/master.m3u8',
            },
            {
              bitrate: 2176000,
              content_type: 'video/mp4',
              url: 'https://video.twimg.com/1/pu/vid/720x1280/high.mp4',
            },
          ],
        },
      },
    ],
  };

  it('reads mediaDetails that have no media_key', () => {
    const media = extractMediaFromSyndication(payload, '1600649710662213632');
    expect(media).toHaveLength(1);
    expect(media[0]).toMatchObject({
      kind: 'video',
      tweetId: '1600649710662213632',
      author: 'CTVJLaidlaw',
      durationMs: 32200,
    });
  });

  it('resolves the best playable mp4', () => {
    const [media] = extractMediaFromSyndication(payload, '1');
    expect(capturedToScraped(media!, 'best').src).toContain('720x1280');
  });

  it('derives the documented public token', () => {
    expect(syndicationToken('1600649710662213632')).toBe('3vol7tqmapv');
    expect(syndicationEndpoint('1600649710662213632')).toContain('token=3vol7tqmapv');
  });
});
