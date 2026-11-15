import { settings } from './storage';
import { NATIVE_HOST, normalizeYoutubeUrl } from './ytdlp';
import type { YtdlpJob, YtdlpPing, YtdlpQuality } from './ytdlp';

const JOBS_KEY = 'mediagrab:ytdlpJobs';
const MAX_JOBS = 20;
const PING_TIMEOUT = 6000;
const QUALITIES: YtdlpQuality[] = ['best', '1080', '720', '480'];

type NativePort = ReturnType<typeof browser.runtime.connectNative>;

let port: NativePort | null = null;
let portError: string | null = null;
let loaded = false;
let keepalive: ReturnType<typeof setInterval> | null = null;

const jobs = new Map<string, YtdlpJob>();
const pendingPings = new Map<string, (message: Record<string, unknown>) => void>();

/* -------------------------------------------------------------------------
   Persistence
   ---------------------------------------------------------------------- */

async function persistJobs(): Promise<void> {
  const list = Array.from(jobs.values())
    .sort((a, b) => b.startedAt - a.startedAt)
    .slice(0, MAX_JOBS);
  try {
    await browser.storage.local.set({ [JOBS_KEY]: list });
  } catch {
    // Storage is best effort; an in-memory job list still works.
  }
}

async function loadJobs(): Promise<void> {
  if (loaded) return;
  loaded = true;
  try {
    const stored = await browser.storage.local.get(JOBS_KEY);
    const list = stored?.[JOBS_KEY];
    if (!Array.isArray(list)) return;

    for (const entry of list as YtdlpJob[]) {
      if (!entry?.id) continue;
      if (entry.status === 'starting' || entry.status === 'queued' || entry.status === 'downloading') {
        entry.status = 'error';
        entry.error = 'Interrupted when the extension restarted';
        entry.finishedAt = Date.now();
      }
      jobs.set(entry.id, entry);
    }
  } catch {
    // ignore
  }
}

/* -------------------------------------------------------------------------
   Native port
   ---------------------------------------------------------------------- */

function ensurePort(): NativePort | null {
  if (port) return port;

  try {
    const next = browser.runtime.connectNative(NATIVE_HOST);
    next.onMessage.addListener(handleHostMessage);
    next.onDisconnect.addListener(() => {
      const message = browser.runtime.lastError?.message || 'Native host disconnected';
      port = null;
      portError = message;
      failRunningJobs(message);
      for (const [id, resolve] of pendingPings) {
        resolve({ id, type: 'error', error: message });
      }
      pendingPings.clear();
    });
    port = next;
    portError = null;
    return next;
  } catch (error) {
    portError = error instanceof Error ? error.message : String(error);
    return null;
  }
}

function failRunningJobs(reason: string): void {
  let changed = false;
  for (const job of jobs.values()) {
    if (job.status === 'starting' || job.status === 'queued' || job.status === 'downloading') {
      job.status = 'error';
      job.error = reason;
      job.finishedAt = Date.now();
      changed = true;
      broadcast(job);
    }
  }
  if (changed) {
    void persistJobs();
    void notify('yt-dlp disconnected', reason);
  }
}

function handleHostMessage(message: any): void {
  if (!message || typeof message !== 'object') return;

  if (message.type === 'pong' || (message.type === 'error' && pendingPings.has(message.id))) {
    const resolve = pendingPings.get(message.id);
    if (resolve) {
      pendingPings.delete(message.id);
      resolve(message);
    }
    return;
  }

  const job = jobs.get(message.id);
  if (!job) return;

  if (message.type === 'accepted') {
    job.status = message.status === 'queued' ? 'queued' : 'downloading';
  } else if (message.type === 'progress') {
    job.status = 'downloading';
    job.percent = message.percent;
    job.speed = message.speed;
    job.eta = message.eta;
  } else if (message.type === 'done') {
    job.status = 'done';
    job.percent = 100;
    job.file = message.file;
    job.finishedAt = Date.now();
    void notify('Download finished', basename(message.file) || job.title || job.url);
  } else if (message.type === 'error') {
    job.status = 'error';
    job.error = message.error;
    job.finishedAt = Date.now();
    void notify('Download failed', message.error || job.url);
  } else {
    return;
  }

  broadcast(job);
  void persistJobs();
}

function isRunning(job: YtdlpJob): boolean {
  return job.status === 'starting' || job.status === 'queued' || job.status === 'downloading';
}

function updateKeepalive(): void {
  const active = Array.from(jobs.values()).some(isRunning);

  if (active && !keepalive) {
    keepalive = setInterval(() => {
      try {
        port?.postMessage({ id: `keepalive-${Date.now()}`, type: 'ping' });
      } catch {
        // The disconnect handler cleans up.
      }
    }, 20_000);
  } else if (!active && keepalive) {
    clearInterval(keepalive);
    keepalive = null;
  }
}

function broadcast(job: YtdlpJob): void {
  browser.runtime
    .sendMessage({ type: 'mediagrab:ytdlp-update', job })
    .catch(() => {
      // No popup or gallery open.
    });
}

function basename(file: string | undefined): string {
  if (!file) return '';
  return file.split('/').pop() || '';
}

async function notify(title: string, message: string): Promise<void> {
  try {
    await browser.notifications.create({
      type: 'basic',
      iconUrl: browser.runtime.getURL('/icon-128.png'),
      title,
      message: message.slice(0, 300),
    });
  } catch {
    // Notifications can be disabled by the user.
  }
}

/* -------------------------------------------------------------------------
   Public operations
   ---------------------------------------------------------------------- */

export function pingHost(): Promise<YtdlpPing> {
  const activePort = ensurePort();
  if (!activePort) {
    return Promise.resolve({ ok: false, error: portError || 'Native host is not installed' });
  }

  const id = crypto.randomUUID();
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      pendingPings.delete(id);
      resolve({ ok: false, error: 'Native host did not respond' });
    }, PING_TIMEOUT);

    pendingPings.set(id, (message) => {
      clearTimeout(timer);
      if (message.type !== 'pong') {
        resolve({ ok: false, error: String(message.error || 'Native host error') });
        return;
      }
      resolve({
        ok: true,
        host: message.host as string,
        ytDlp: (message.ytDlp as string | null) ?? null,
        ffmpeg: (message.ffmpeg as string | null) ?? null,
      });
    });

    try {
      activePort.postMessage({ id, type: 'ping' });
    } catch (error) {
      clearTimeout(timer);
      pendingPings.delete(id);
      resolve({ ok: false, error: error instanceof Error ? error.message : String(error) });
    }
  });
}

export async function startYtdlpDownload(input: {
  url: string;
  quality?: string;
  title?: string;
  tabId?: number;
}): Promise<{ ok: boolean; id?: string; error?: string }> {
  const normalized = normalizeYoutubeUrl(input.url) || input.url;
  let parsed: URL;
  try {
    parsed = new URL(normalized);
  } catch {
    return { ok: false, error: 'That page does not have a downloadable video URL.' };
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { ok: false, error: 'Only http and https URLs are supported.' };
  }

  const activePort = ensurePort();
  if (!activePort) {
    return { ok: false, error: portError || 'Native host is not installed' };
  }

  const [outputDir, cookiesBrowser, qualitySetting] = await Promise.all([
    settings.ytdlpOutputDir.getValue(),
    settings.ytdlpCookies.getValue(),
    settings.videoQuality.getValue(),
  ]);

  const quality = (QUALITIES.includes(input.quality as YtdlpQuality)
    ? input.quality
    : qualitySetting) as YtdlpQuality;

  const job: YtdlpJob = {
    id: crypto.randomUUID(),
    url: normalized,
    title: input.title,
    tabId: input.tabId,
    status: 'starting',
    startedAt: Date.now(),
  };

  jobs.set(job.id, job);
  await persistJobs();
  broadcast(job);
  updateKeepalive();

  try {
    activePort.postMessage({
      id: job.id,
      type: 'download',
      url: normalized,
      quality: QUALITIES.includes(quality) ? quality : 'best',
      cookiesBrowser,
      outputDir,
    });
  } catch (error) {
    job.status = 'error';
    job.error = error instanceof Error ? error.message : String(error);
    job.finishedAt = Date.now();
    broadcast(job);
    updateKeepalive();
    await persistJobs();
    return { ok: false, error: job.error };
  }

  return { ok: true, id: job.id };
}

export function cancelYtdlpJob(id: string): void {
  try {
    port?.postMessage({ id, type: 'cancel' });
  } catch {
    // The host is gone; the job will be marked failed on disconnect.
  }
}

export function listYtdlpJobs(): YtdlpJob[] {
  return Array.from(jobs.values()).sort((a, b) => b.startedAt - a.startedAt);
}

/* -------------------------------------------------------------------------
   Message bridge
   ---------------------------------------------------------------------- */

export function registerYtdlpBridge(): void {
  void loadJobs();

  browser.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (!message || typeof message !== 'object') return;

    if (message.type === 'mediagrab:ytdlp-ping') {
      pingHost().then(sendResponse);
      return true;
    }

    if (message.type === 'mediagrab:ytdlp-start') {
      startYtdlpDownload({
        url: String(message.url || ''),
        quality: message.quality,
        title: message.title,
        tabId: message.tabId,
      }).then(sendResponse);
      return true;
    }

    if (message.type === 'mediagrab:ytdlp-jobs') {
      sendResponse({ ok: true, jobs: listYtdlpJobs() });
      return true;
    }

    if (message.type === 'mediagrab:ytdlp-cancel' && message.id) {
      cancelYtdlpJob(String(message.id));
      sendResponse({ ok: true });
      return true;
    }
  });
}
