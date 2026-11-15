import { Button, cn, Select } from '~/ui/primitives';
import type { VideoQuality } from '~/utils/storage';
import type { YtdlpJob, YtdlpPing } from '~/utils/ytdlp';

const SETUP_URL =
  'https://github.com/madhusudan-kulkarni/media-grab/blob/main/docs/NATIVE.md';

export function YoutubeCard({
  videoPage,
  ping,
  job,
  quality,
  starting,
  onQuality,
  onStart,
  onRefresh,
  onDismissJob,
}: {
  videoPage: boolean;
  ping: YtdlpPing | null;
  job: YtdlpJob | null;
  quality: VideoQuality;
  starting: boolean;
  onQuality: (quality: VideoQuality) => void;
  onStart: () => void;
  onRefresh: () => void;
  onDismissJob: () => void;
}) {
  const missingTools = ping?.ok && (!ping.ytDlp || !ping.ffmpeg);
  const ready = Boolean(ping?.ok && ping.ytDlp && ping.ffmpeg);
  const active = job && (job.status === 'starting' || job.status === 'queued' || job.status === 'downloading');

  return (
    <div className="rounded-2xl border border-line bg-surface-2 px-4 py-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="m-0 text-[13px] font-semibold">YouTube video</p>
          <p className="m-0 mt-0.5 text-[11px] leading-snug text-ink-soft">
            yt-dlp downloads the video and audio, then ffmpeg merges them.
          </p>
        </div>
        <StatusPill ping={ping} />
      </div>

      {!videoPage ? (
        <p className="m-0 mt-3 text-[11.5px] leading-relaxed text-ink-soft">
          Open a video to download it. Home, search and channel pages have no single video.
        </p>
      ) : job && active ? (
        <div className="mt-3">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-medium">
              {job.status === 'queued' ? 'Waiting for the current download' : 'Downloading'}
            </span>
            <span className="tabular-nums text-ink-soft">{Math.round(job.percent || 0)}%</span>
          </div>
          <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-line">
            <div
              className="h-full rounded-full bg-ink transition-[width] duration-300 ease-[var(--ease-out)]"
              style={{ width: `${Math.max(2, job.percent || 2)}%` }}
            />
          </div>
          <p className="m-0 mt-1.5 truncate text-[10.5px] text-ink-soft">
            {[job.speed, job.eta && `ETA ${job.eta}`].filter(Boolean).join(' · ') || 'Starting…'}
          </p>
        </div>
      ) : job?.status === 'done' ? (
        <div className="mt-3">
          <p className="m-0 text-[12px] font-medium">Saved</p>
          <p className="m-0 mt-0.5 break-all text-[10.5px] leading-snug text-ink-soft">
            {basename(job.file) || job.title || job.url}
          </p>
          <Button variant="secondary" size="sm" className="mt-2.5" onClick={onDismissJob}>
            Download another
          </Button>
        </div>
      ) : job?.status === 'error' ? (
        <div className="mt-3">
          <p className="m-0 text-[11.5px] leading-relaxed text-danger">{job.error || 'Download failed.'}</p>
          <Button variant="secondary" size="sm" className="mt-2.5" onClick={onDismissJob}>
            Try again
          </Button>
        </div>
      ) : !ping ? (
        <p className="m-0 mt-3 text-[11.5px] text-ink-soft">Checking the helper…</p>
      ) : ready ? (
        <div className="mt-3 flex items-center gap-2">
          <Select
            aria-label="Download quality"
            wrapperClassName="flex-1"
            className="h-9 w-full"
            value={quality}
            onChange={(event) => onQuality(event.target.value as VideoQuality)}
          >
            <option value="best">Best available</option>
            <option value="1080">1080p</option>
            <option value="720">720p</option>
            <option value="480">480p</option>
          </Select>
          <Button variant="primary" className="h-9 flex-1" onClick={onStart} disabled={starting}>
            {starting ? 'Starting…' : 'Download'}
          </Button>
        </div>
      ) : (
        <div className="mt-3">
          <p className="m-0 text-[11.5px] leading-relaxed text-ink-soft">
            {missingTools
              ? `Missing ${[!ping?.ytDlp && 'yt-dlp', !ping?.ffmpeg && 'ffmpeg'].filter(Boolean).join(' and ')}. Install with brew, then check again.`
              : ping?.error || 'The yt-dlp helper is not installed.'}
          </p>
          <div className="mt-2 flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={onRefresh}>
              Check again
            </Button>
            <a
              href={SETUP_URL}
              target="_blank"
              rel="noreferrer"
              className="rounded-md px-1.5 py-1 text-[11.5px] font-medium text-ink-soft underline-offset-2 transition-colors hover:text-ink hover:underline"
            >
              Setup guide
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusPill({ ping }: { ping: YtdlpPing | null }) {
  if (!ping) return <span className="text-[10.5px] text-ink-soft">checking…</span>;
  const ok = Boolean(ping.ok && ping.ytDlp && ping.ffmpeg);
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1.5 text-[10.5px] font-medium',
        ok ? 'text-ink-soft' : 'text-danger'
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', ok ? 'bg-ink-soft' : 'bg-danger')} />
      {ok ? 'helper ready' : 'helper missing'}
    </span>
  );
}

function basename(file?: string): string {
  if (!file) return '';
  return file.split('/').pop() || '';
}
