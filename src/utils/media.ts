/**
 * Media model shared by the capture layer, the scraper and the downloader.
 *
 * X delivers three shapes that all end up here:
 *   - photo   -> a pbs.twimg.com image, original size via ?name=orig
 *   - video   -> progressive MP4 variants, sometimes HLS-only
 *   - gif     -> an animated_gif, which X serves as a silent MP4
 */

export type MediaKind = 'image' | 'gif' | 'video';

export type VideoQuality = 'best' | '1080' | '720' | '480' | '360';

export interface MediaVariant {
  url: string;
  mime: string;
  bitrate?: number;
  width?: number;
  height?: number;
}

export interface CapturedMedia {
  /** X media_key, or a URL hash for DOM-scraped media. */
  id: string;
  kind: MediaKind;
  tweetId?: string;
  author?: string;
  poster?: string;
  width: number;
  height: number;
  durationMs?: number;
  alt?: string;
  variants: MediaVariant[];
}

export interface ScrapedMedia {
  id: string;
  kind: MediaKind;
  src: string;
  poster?: string;
  width: number;
  height: number;
  durationMs?: number;
  ext: string;
  mimeType?: string;
  variants?: MediaVariant[];
  alt?: string;
  author?: string;
  tweetId?: string;
  pageUrl?: string;
  source: 'dom' | 'x-capture' | 'syndication';
  unsupported?: 'hls-only' | 'protected';
}

const QUALITY_CAP: Record<VideoQuality, number> = {
  best: Number.POSITIVE_INFINITY,
  '1080': 1080,
  '720': 720,
  '480': 480,
  '360': 360,
};

/** Pull WIDTHxHEIGHT out of an X media URL, e.g. .../avc1/720x1280/clip.mp4. */
export function parseDimensionsFromUrl(url: string): { width: number; height: number } | null {
  const match = url.match(/\/(\d{2,5})x(\d{2,5})\//);
  if (!match) return null;
  const width = Number(match[1]);
  const height = Number(match[2]);
  if (!width || !height) return null;
  return { width, height };
}

export function getMediaKind(typeOrMime: string): MediaKind {
  const value = typeOrMime.toLowerCase();
  if (value === 'animated_gif' || value === 'gif' || value === 'image/gif') return 'gif';
  if (value.startsWith('video/') || value === 'video' || value.includes('mpegurl') || value.includes('mp2t')) {
    return 'video';
  }
  return 'image';
}

export function extFromMime(mime: string): string {
  if (mime.includes('mp4')) return 'mp4';
  if (mime.includes('webm')) return 'webm';
  if (mime.includes('mpegurl') || mime.includes('m3u8')) return 'm3u8';
  if (mime.includes('jpeg') || mime.includes('jpg')) return 'jpg';
  if (mime.includes('png')) return 'png';
  if (mime.includes('webp')) return 'webp';
  if (mime.includes('gif')) return 'gif';
  return 'bin';
}

export function isMp4Variant(variant: MediaVariant): boolean {
  return variant.mime.includes('mp4') || /\.mp4(\?|$)/i.test(variant.url);
}

export function isHlsVariant(variant: MediaVariant): boolean {
  return variant.mime.includes('mpegurl') || /\.m3u8(\?|$)/i.test(variant.url);
}

/**
 * Pick the progressive MP4 to download.
 *
 * Prefers the best bitrate at or below the requested quality, measured by the
 * short side so a 720x1280 portrait clip counts as 720p, not 1280p. If
 * nothing fits under the cap, falls back to the smallest available rendition
 * rather than failing, and only returns null when there is no MP4 at all
 * (HLS-only post).
 */
export function pickMp4Variant(variants: MediaVariant[], quality: VideoQuality = 'best'): MediaVariant | null {
  const mp4s = variants
    .filter(isMp4Variant)
    .map((variant) => {
      const dims = variant.height ? { height: variant.height, width: variant.width } : parseDimensionsFromUrl(variant.url);
      const width = variant.width ?? dims?.width ?? 0;
      const height = variant.height ?? dims?.height ?? 0;
      return {
        ...variant,
        width,
        height,
        // "720p" is the short side: 1280x720 and 720x1280 are both 720p.
        quality: width && height ? Math.min(width, height) : height,
      };
    })
    .filter((variant) => variant.url);

  if (!mp4s.length) return null;

  const cap = QUALITY_CAP[quality];
  const withinCap = mp4s.filter((variant) => !variant.quality || variant.quality <= cap);
  const pool = withinCap.length ? withinCap : mp4s.slice().sort((a, b) => a.quality - b.quality);

  return pool.slice().sort((a, b) => {
    if (b.quality !== a.quality) return b.quality - a.quality;
    return (b.bitrate || 0) - (a.bitrate || 0);
  })[0] ?? null;
}

/**
 * X names its paths by upload type: GIF loops live under /tweet_video/,
 * regular videos under /ext_tw_video/ or /amplify_video/. Trusting the URL
 * fixes payloads that report every mp4 as animated_gif.
 */
export function kindFromVideoUrl(url: string, fallback: MediaKind): MediaKind {
  if (/\/tweet_video\//i.test(url)) return 'gif';
  if (/\/(ext_tw_video|amplify_video)\//i.test(url)) return 'video';
  return fallback;
}

export function formatDuration(durationMs?: number): string {
  if (!durationMs || durationMs < 0) return '';
  const totalSeconds = Math.round(durationMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function hashUrl(url: string): string {
  let hash = 5381;
  for (let i = 0; i < url.length; i++) {
    hash = ((hash << 5) + hash + url.charCodeAt(i)) | 0;
  }
  return `url-${(hash >>> 0).toString(36)}`;
}

export function withOriginalSize(url: string): string {
  if (!url) return url;
  if (/[?&]name=/.test(url)) return url.replace(/([?&])name=[^&]*/, '$1name=orig');
  return `${url}${url.includes('?') ? '&' : '?'}name=orig`;
}

interface RawMediaObject {
  media_key?: string;
  type?: string;
  media_url_https?: string;
  ext_alt_text?: string;
  original_info?: { width?: number; height?: number };
  video_info?: {
    duration_millis?: number;
    variants?: Array<{ bitrate?: number; content_type?: string; url?: string }>;
  };
}

function toCapturedMedia(raw: RawMediaObject, context: { tweetId?: string; author?: string }): CapturedMedia | null {
  if (!raw || typeof raw !== 'object') return null;

  const type = String(raw.type || '').toLowerCase();
  const kind = type === 'video' ? 'video' : type === 'animated_gif' ? 'gif' : 'image';

  const id = raw.media_key || (raw.media_url_https ? hashUrl(raw.media_url_https) : '');
  if (!id) return null;

  const variants: MediaVariant[] = (raw.video_info?.variants || [])
    .filter((variant) => Boolean(variant?.url && variant?.content_type))
    .map((variant) => {
      const dims = parseDimensionsFromUrl(variant.url!);
      return {
        url: variant.url!,
        mime: variant.content_type!,
        bitrate: variant.bitrate,
        width: dims?.width,
        height: dims?.height,
      };
    });

  const firstMp4 = pickMp4Variant(variants, 'best');
  const width = raw.original_info?.width || firstMp4?.width || 0;
  const height = raw.original_info?.height || firstMp4?.height || 0;

  if (kind === 'image') {
    if (!raw.media_url_https) return null;
    return {
      id,
      kind,
      tweetId: context.tweetId,
      author: context.author,
      poster: raw.media_url_https,
      width,
      height,
      alt: raw.ext_alt_text,
      variants: [{ url: withOriginalSize(raw.media_url_https), mime: 'image/jpeg', width, height }],
    };
  }

  if (!variants.length) return null;

  return {
    id,
    kind,
    tweetId: context.tweetId,
    author: context.author,
    poster: raw.media_url_https,
    width,
    height,
    durationMs: raw.video_info?.duration_millis,
    alt: raw.ext_alt_text,
    variants,
  };
}

function authorFromTweet(tweet: any): string | undefined {
  return (
    tweet?.core?.user_results?.result?.legacy?.screen_name ||
    tweet?.core?.user_results?.result?.core?.screen_name ||
    tweet?.user?.screen_name ||
    undefined
  );
}

function mediaArrayFromTweet(tweet: any): RawMediaObject[] {
  const legacy = tweet?.legacy || tweet;
  const extended = legacy?.extended_entities?.media;
  const entities = legacy?.entities?.media;
  return Array.isArray(extended) ? extended : Array.isArray(entities) ? entities : [];
}

/**
 * Walk a GraphQL response and pull out every media object.
 *
 * Handles the tweet envelope (`rest_id` + `legacy.extended_entities.media`)
 * so media keeps its tweet id and author, and falls back to finding bare
 * media objects anywhere in the payload.
 */
export function extractMediaFromGraphql(payload: unknown): CapturedMedia[] {
  const found = new Map<string, CapturedMedia>();
  const seen = new WeakSet<object>();

  const add = (media: CapturedMedia | null) => {
    if (!media) return;
    const existing = found.get(media.id);
    if (!existing) {
      found.set(media.id, media);
      return;
    }
    // Prefer the copy that knows its tweet.
    if (!existing.tweetId && media.tweetId) found.set(media.id, media);
  };

  // Depth-first with the nearest tweet id and author carried down. Quoted and
  // retweeted posts keep their own rest_id, so their media is filed under the
  // post that actually shows it. The same post can carry both a photo and a
  // video; both are returned and separated by the caller.
  const stack: Array<{ node: any; tweetId?: string; author?: string }> = [{ node: payload }];

  while (stack.length) {
    const entry = stack.pop()!;
    const node = entry.node;
    if (!node || typeof node !== 'object' || seen.has(node)) continue;
    seen.add(node);

    if (Array.isArray(node)) {
      for (const child of node) stack.push({ node: child, tweetId: entry.tweetId, author: entry.author });
      continue;
    }

    let tweetId = entry.tweetId;
    if (typeof node.rest_id === 'string' && /^\d+$/.test(node.rest_id)) {
      tweetId = node.rest_id;
    } else if (!tweetId && typeof node.legacy?.id_str === 'string' && /^\d+$/.test(node.legacy.id_str)) {
      tweetId = node.legacy.id_str;
    }

    const author = entry.author || authorFromTweet(node);
    const tweetMedia = mediaArrayFromTweet(node);
    for (const raw of tweetMedia) {
      add(toCapturedMedia(raw, { tweetId, author }));
    }

    for (const key of Object.keys(node)) {
      const value = node[key];
      if (value && typeof value === 'object') {
        stack.push({ node: value, tweetId, author });
      }
    }
  }

  return Array.from(found.values());
}

/** Syndication token used by X's public tweet-result endpoint. */
export function syndicationToken(tweetId: string): string {
  const numeric = Number(tweetId);
  if (!Number.isFinite(numeric) || numeric <= 0) return '';
  return ((numeric / 1e15) * Math.PI).toString(36).replace(/(0+|\.)/g, '');
}

export function syndicationEndpoint(tweetId: string): string {
  return `https://cdn.syndication.twimg.com/tweet-result?id=${encodeURIComponent(tweetId)}&lang=en&token=${syndicationToken(tweetId)}`;
}

/**
 * Public fallback for posts whose GraphQL response was not captured.
 * Works for public posts only; protected and age-gated posts fail upstream.
 */
export function extractMediaFromSyndication(payload: unknown, tweetId: string): CapturedMedia[] {
  const data = payload as any;
  const author: string | undefined = data?.user?.screen_name;
  const list: RawMediaObject[] = Array.isArray(data?.mediaDetails)
    ? data.mediaDetails
    : data?.video
      ? [data.video]
      : [];

  const out: CapturedMedia[] = [];
  const seen = new Set<string>();
  for (const raw of list) {
    const media = toCapturedMedia(raw, { tweetId, author });
    if (media && !seen.has(media.id)) {
      seen.add(media.id);
      out.push(media);
    }
  }
  return out;
}

/** Turn a captured media record into something the downloader can use. */
export function capturedToScraped(
  media: CapturedMedia,
  quality: VideoQuality = 'best',
  pageUrl?: string
): ScrapedMedia {
  const base = {
    id: media.id,
    kind: media.kind,
    poster: media.poster,
    width: media.width,
    height: media.height,
    durationMs: media.durationMs,
    alt: media.alt,
    author: media.author,
    tweetId: media.tweetId,
    pageUrl,
    variants: media.variants,
    source: 'x-capture' as const,
  };

  if (media.kind === 'image') {
    const main = media.variants[0];
    const url = main?.url || media.poster || '';
    return { ...base, kind: 'image', src: url, ext: 'jpg', mimeType: 'image/jpeg' };
  }

  const mp4 = pickMp4Variant(media.variants, quality);
  if (!mp4) {
    return {
      ...base,
      src: media.variants.find(isHlsVariant)?.url || media.poster || '',
      ext: 'm3u8',
      unsupported: 'hls-only',
    };
  }

  return {
    ...base,
    kind: kindFromVideoUrl(mp4.url, media.kind),
    src: mp4.url,
    ext: 'mp4',
    mimeType: mp4.mime || 'video/mp4',
  };
}
