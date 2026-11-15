import type { ScrapedMedia } from './media';

export interface GalleryPayload {
  items: ScrapedMedia[];
  title?: string;
  url?: string;
  createdAt: number;
}

export const GALLERY_KEY = 'mediagrab:gallery';

export async function storeGalleryPayload(payload: GalleryPayload): Promise<void> {
  try {
    await browser.storage.session.set({ [GALLERY_KEY]: payload });
  } catch {
    await browser.storage.local.set({ [GALLERY_KEY]: payload });
  }
}

export async function loadGalleryPayload(): Promise<GalleryPayload | null> {
  try {
    const fromSession = await browser.storage.session.get(GALLERY_KEY);
    if (fromSession?.[GALLERY_KEY]) return fromSession[GALLERY_KEY] as GalleryPayload;
  } catch {
    // storage.session is unavailable on some builds
  }
  const fromLocal = await browser.storage.local.get(GALLERY_KEY);
  return (fromLocal?.[GALLERY_KEY] as GalleryPayload) || null;
}

export async function clearGalleryPayload(): Promise<void> {
  try {
    await browser.storage.session.remove(GALLERY_KEY);
  } catch {
    // ignore
  }
  await browser.storage.local.remove(GALLERY_KEY);
}

export function countMedia(items: ScrapedMedia[]) {
  return {
    total: items.length,
    images: items.filter((item) => item.kind === 'image').length,
    gifs: items.filter((item) => item.kind === 'gif').length,
    videos: items.filter((item) => item.kind === 'video').length,
  };
}
