export const QUALITIES: readonly string[];
export const COOKIE_SOURCES: readonly string[];
export const HOST_VERSION: string;

export interface DownloadRequest {
  id: string;
  type: 'download';
  url: string;
  quality: 'best' | '1080' | '720' | '480';
  cookiesBrowser: 'none' | 'firefox' | 'chrome' | 'safari' | 'edge' | 'brave';
  outputDir: string;
}

export type ValidatedRequest =
  | DownloadRequest
  | { id: string; type: 'ping' }
  | { id: string; type: 'cancel' };

export type ValidationResult =
  | { ok: true; value: ValidatedRequest }
  | { ok: false; error: string };

export type ParsedLine =
  | { kind: 'progress'; percent: number; speed: string; eta: string }
  | { kind: 'file'; path: string };

export function stripAnsi(input: unknown): string;
export function expandHome(value: string, home: string): string;
export function defaultOutputDir(home: string): string;
export function validateRequest(raw: unknown, home: string): ValidationResult;
export function buildArgs(request: DownloadRequest): string[];
export function parseLine(line: string): ParsedLine | null;
