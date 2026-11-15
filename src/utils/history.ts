export interface HistoryEntry {
  key: string;
  url: string;
  filename?: string;
  kind?: string;
  at: number;
}

const HISTORY_KEY = 'mediagrab:history';
const LIMIT = 800;

/** Stable identity for a media URL: host + path, ignoring tokens and size params. */
export function mediaKey(url: string): string {
  if (!url) return '';
  try {
    const parsed = new URL(url);
    return `${parsed.host}${parsed.pathname}`;
  } catch {
    return url.split(/[?#]/)[0] || url;
  }
}

export async function getHistory(): Promise<HistoryEntry[]> {
  const stored = await browser.storage.local.get(HISTORY_KEY);
  const list = stored?.[HISTORY_KEY];
  return Array.isArray(list) ? (list as HistoryEntry[]) : [];
}

export async function recordDownloads(
  entries: Array<{ url: string; filename?: string; kind?: string }>
): Promise<void> {
  if (!entries.length) return;

  const history = await getHistory();
  const byKey = new Map(history.map((entry) => [entry.key, entry]));
  const now = Date.now();

  for (const entry of entries) {
    if (!entry.url) continue;
    const key = mediaKey(entry.url);
    if (!key) continue;
    byKey.set(key, {
      key,
      url: entry.url,
      filename: entry.filename,
      kind: entry.kind,
      at: now,
    });
  }

  const next = Array.from(byKey.values())
    .sort((a, b) => b.at - a.at)
    .slice(0, LIMIT);

  await browser.storage.local.set({ [HISTORY_KEY]: next });
}

export async function clearHistory(): Promise<void> {
  await browser.storage.local.remove(HISTORY_KEY);
}
