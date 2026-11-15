#!/usr/bin/env node
/**
 * MediaGrab native messaging host.
 *
 * The extension can only reach this process through Firefox's native messaging
 * channel. It validates every request, then runs yt-dlp as an argument array
 * (never a shell) with a fixed set of flags.
 */
import { spawn, spawnSync } from 'node:child_process';
import os from 'node:os';
import {
  HOST_VERSION,
  buildArgs,
  parseLine,
  validateRequest,
} from './lib/args.mjs';

const MAX_FRAME = 1024 * 1024;
const MAX_JOBS = 2;
const JOB_TIMEOUT_MS = 45 * 60 * 1000;
const PROGRESS_INTERVAL_MS = 400;

const jobs = new Map();
const queue = [];
let stdinBuffer = Buffer.alloc(0);
let stdoutBroken = false;

function send(message) {
  if (stdoutBroken) return;
  const body = Buffer.from(JSON.stringify(message), 'utf8');
  const header = Buffer.alloc(4);
  header.writeUInt32LE(body.length, 0);
  try {
    process.stdout.write(Buffer.concat([header, body]));
  } catch {
    stdoutBroken = true;
  }
}

function fail(id, error) {
  send({ id, type: 'error', error: String(error || 'Unknown error') });
}

function versions() {
  const ytDlp = spawnSync('yt-dlp', ['--version'], { encoding: 'utf8', timeout: 5000 });
  const ffmpeg = spawnSync('ffmpeg', ['-version'], { encoding: 'utf8', timeout: 5000 });
  return {
    host: HOST_VERSION,
    ytDlp: ytDlp.status === 0 ? ytDlp.stdout.trim().split('\n')[0] : null,
    ffmpeg: ffmpeg.status === 0 ? ffmpeg.stdout.split('\n')[0] : null,
  };
}

function startJob(request) {
  const job = {
    id: request.id,
    request,
    child: null,
    cancelled: false,
    stderr: '',
    lastProgress: 0,
    file: null,
    timeout: null,
  };
  jobs.set(job.id, job);

  if (jobs.size > MAX_JOBS) {
    queue.push(job);
    send({ id: job.id, type: 'accepted', status: 'queued', position: queue.length });
    return;
  }

  runJob(job);
}

function pump() {
  while (queue.length && activeCount() < MAX_JOBS) {
    const next = queue.shift();
    if (next && !next.cancelled) runJob(next);
  }
}

function activeCount() {
  let count = 0;
  for (const job of jobs.values()) {
    if (job.child) count++;
  }
  return count;
}

function runJob(job) {
  if (job.cancelled) {
    jobs.delete(job.id);
    fail(job.id, 'Cancelled');
    pump();
    return;
  }

  let child;
  try {
    child = spawn('yt-dlp', buildArgs(job.request), {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, PYTHONIOENCODING: 'utf-8' },
    });
  } catch (error) {
    jobs.delete(job.id);
    fail(job.id, `Could not start yt-dlp: ${error.message}`);
    pump();
    return;
  }

  job.child = child;
  send({ id: job.id, type: 'accepted', status: 'downloading' });

  job.timeout = setTimeout(() => {
    job.cancelled = true;
    child.kill('SIGTERM');
    setTimeout(() => child.kill('SIGKILL'), 5000);
  }, JOB_TIMEOUT_MS);

  let stdoutBuffer = '';
  child.stdout.setEncoding('utf8');
  child.stdout.on('data', (chunk) => {
    stdoutBuffer += chunk;
    const lines = stdoutBuffer.split(/\r?\n/);
    stdoutBuffer = lines.pop() || '';
    for (const line of lines) {
      const parsed = parseLine(line);
      if (!parsed) continue;
      if (parsed.kind === 'file') {
        job.file = parsed.path;
        continue;
      }
      const now = Date.now();
      if (now - job.lastProgress < PROGRESS_INTERVAL_MS) continue;
      job.lastProgress = now;
      send({
        id: job.id,
        type: 'progress',
        percent: parsed.percent,
        speed: parsed.speed,
        eta: parsed.eta,
      });
    }
  });

  child.stderr.setEncoding('utf8');
  child.stderr.on('data', (chunk) => {
    job.stderr = (job.stderr + chunk).slice(-4096);
  });

  child.on('error', (error) => {
    clearTimeout(job.timeout);
    jobs.delete(job.id);
    fail(job.id, `yt-dlp failed to start: ${error.message}`);
    pump();
  });

  child.on('close', (code) => {
    clearTimeout(job.timeout);
    job.child = null;
    jobs.delete(job.id);

    if (job.cancelled) {
      fail(job.id, 'Cancelled');
    } else if (code === 0 && job.file) {
      send({ id: job.id, type: 'done', file: job.file });
    } else {
      const tail = job.stderr.trim().split('\n').slice(-3).join(' ').trim();
      fail(job.id, tail || `yt-dlp exited with code ${code}`);
    }

    pump();
  });
}

function cancelJob(id) {
  const job = jobs.get(id);
  if (!job) {
    const index = queue.findIndex((entry) => entry.id === id);
    if (index >= 0) {
      const [removed] = queue.splice(index, 1);
      jobs.delete(id);
      fail(id, 'Cancelled');
      return;
    }
    fail(id, 'No such job');
    return;
  }

  job.cancelled = true;
  if (job.child) {
    job.child.kill('SIGTERM');
    setTimeout(() => job.child?.kill('SIGKILL'), 5000);
  }
}

function handleMessage(raw) {
  if (raw.type === 'ping') {
    send({ id: raw.id, type: 'pong', ...versions() });
    return;
  }

  const result = validateRequest(raw, os.homedir());
  if (!result.ok) {
    fail(raw.id, result.error);
    return;
  }

  if (result.value.type === 'cancel') {
    cancelJob(result.value.id);
    return;
  }

  if (result.value.type === 'download') {
    startJob(result.value);
  }
}

function onFrame(frame) {
  let message;
  try {
    message = JSON.parse(frame.toString('utf8'));
  } catch {
    fail(null, 'Malformed message');
    return;
  }
  if (!message || typeof message !== 'object') {
    fail(null, 'Malformed message');
    return;
  }
  handleMessage(message);
}

process.stdin.on('data', (chunk) => {
  stdinBuffer = Buffer.concat([stdinBuffer, chunk]);

  while (stdinBuffer.length >= 4) {
    const length = stdinBuffer.readUInt32LE(0);
    if (length <= 0 || length > MAX_FRAME) {
      fail(null, 'Message too large');
      process.exit(1);
      return;
    }
    if (stdinBuffer.length < 4 + length) return;
    const frame = stdinBuffer.subarray(4, 4 + length);
    stdinBuffer = stdinBuffer.subarray(4 + length);
    onFrame(frame);
  }
});

process.stdin.on('end', () => {
  for (const job of jobs.values()) {
    job.cancelled = true;
    job.child?.kill('SIGTERM');
  }
  process.exit(0);
});

process.stdout.on('error', () => {
  stdoutBroken = true;
  process.exit(0);
});

// Keep the process alive while the extension holds the port open.
process.stdin.resume();
