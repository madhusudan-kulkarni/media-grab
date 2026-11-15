import type { ScrapedImage } from './storage';
import type { ScrapedMedia } from './media';
import { getFileExtension, getOriginalName } from './filename';

function absolute(url: string): string | null {
  if (!url) return null;
  if (url.startsWith('data:') || url.startsWith('blob:')) return null;
  try {
    return new URL(url, window.location.href).href;
  } catch {
    return null;
  }
}

export function imageToMedia(image: ScrapedImage): ScrapedMedia {
  return {
    id: image.src,
    kind: image.ext === 'gif' ? 'gif' : 'image',
    src: image.src,
    width: image.width,
    height: image.height,
    ext: image.ext,
    mimeType: image.format ? `image/${image.format.toLowerCase()}` : undefined,
    alt: image.alt,
    pageUrl: window.location.href,
    source: 'dom',
  };
}

/**
 * Generic page videos: direct <video> sources, <source> children and links to
 * media files. blob: and MSE streams cannot be downloaded, so they are skipped
 * rather than silently saving nothing.
 */
export function scrapeVideos(): ScrapedMedia[] {
  const out = new Map<string, ScrapedMedia>();

  const add = (raw: string | null | undefined, poster?: string, width = 0, height = 0) => {
    const url = absolute(raw || '');
    if (!url || out.has(url)) return;

    const lower = url.toLowerCase();
    const isHls = lower.includes('.m3u8');
    const ext = isHls ? 'm3u8' : getFileExtension(url);
    if (!isHls && !['mp4', 'webm', 'mov', 'm4v', 'gif'].includes(ext)) return;

    out.set(url, {
      id: url,
      kind: ext === 'gif' ? 'gif' : 'video',
      src: url,
      poster: poster ? absolute(poster) || undefined : undefined,
      width,
      height,
      ext,
      mimeType: isHls ? 'application/x-mpegURL' : `video/${ext}`,
      pageUrl: window.location.href,
      source: 'dom',
      unsupported: isHls ? 'hls-only' : undefined,
    });
  };

  document.querySelectorAll('video').forEach((video) => {
    const poster = video.getAttribute('poster') || undefined;
    const sources = [
      video.currentSrc,
      video.getAttribute('src'),
      ...Array.from(video.querySelectorAll('source')).map((source) => source.getAttribute('src')),
    ];
    sources.forEach((src) => add(src, poster, video.videoWidth, video.videoHeight));
  });

  document.querySelectorAll('a[href]').forEach((anchor) => {
    const href = anchor.getAttribute('href');
    if (href && /\.(mp4|webm|mov|m4v|m3u8|gif)(\?|#|$)/i.test(href)) {
      add(href);
    }
  });

  return Array.from(out.values());
}

export function mediaName(media: ScrapedMedia): string {
  return media.tweetId ? `${media.author || 'x'}_${media.tweetId}` : getOriginalName(media.src);
}
