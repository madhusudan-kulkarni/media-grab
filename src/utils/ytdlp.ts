export const NATIVE_HOST = 'dev.madhusudan.mediagrab';

export type YtdlpQuality = 'best' | '1080' | '720' | '480';
export type YtdlpCookies = 'none' | 'firefox' | 'chrome' | 'safari' | 'edge' | 'brave';

export type YtdlpJobStatus = 'starting' | 'queued' | 'downloading' | 'done' | 'error';

export interface YtdlpJob {
  id: string;
  url: string;
  title?: string;
  tabId?: number;
  status: YtdlpJobStatus;
  percent?: number;
  speed?: string;
  eta?: string;
  file?: string;
  error?: string;
  startedAt: number;
  finishedAt?: number;
}

export interface YtdlpPing {
  ok: boolean;
  error?: string;
  host?: string;
  ytDlp?: string | null;
  ffmpeg?: string | null;
}

const YOUTUBE_HOSTS = new Set([
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'music.youtube.com',
  'youtu.be',
  'www.youtu.be',
]);

export function isYoutubeUrl(raw: string | undefined): boolean {
  if (!raw) return false;
  try {
    const url = new URL(raw);
    return YOUTUBE_HOSTS.has(url.hostname.toLowerCase());
  } catch {
    return false;
  }
}

/**
 * Reduce every YouTube URL shape to a single canonical watch URL, dropping
 * playlist and timestamp parameters so yt-dlp cannot wander into a playlist.
 */
export function normalizeYoutubeUrl(raw: string): string | null {
  if (!isYoutubeUrl(raw)) return null;
  const url = new URL(raw);
  let id = '';

  if (url.hostname === 'youtu.be' || url.hostname === 'www.youtu.be') {
    id = url.pathname.split('/').filter(Boolean)[0] || '';
  } else if (url.pathname === '/watch') {
    id = url.searchParams.get('v') || '';
  } else {
    const match = url.pathname.match(/^\/(?:shorts|live|embed)\/([\w-]+)/);
    if (match) id = match[1] || '';
  }

  if (!/^[\w-]{6,20}$/.test(id)) return null;
  return `https://www.youtube.com/watch?v=${id}`;
}

export function qualityLabel(quality: YtdlpQuality): string {
  return quality === 'best' ? 'Best available' : `${quality}p`;
}
