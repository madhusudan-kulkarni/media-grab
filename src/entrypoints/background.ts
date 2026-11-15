import JSZip from 'jszip';
import { settings } from '~/utils/storage';
import { storeGalleryPayload } from '~/utils/gallery';
import { recordDownloads } from '~/utils/history';
import type { ScrapedImage, BatchDownloadMode, HoverKeyModifier } from '~/utils/storage';
import {
  capturedToScraped,
  extractMediaFromSyndication,
  syndicationEndpoint,
} from '~/utils/media';
import type { ScrapedMedia, VideoQuality } from '~/utils/media';

const ZIP_MAX_FILES = 500;
const ZIP_MAX_BYTES = 500 * 1024 * 1024;
const ZIP_DATA_URL_LIMIT = 32 * 1024 * 1024;
import {
  formatFilename,
  getTimestamp,
  extractDomain,
  getFileExtension,
  getOriginalName,
  sanitizePathSegment,
  getBatchFolderName,
} from '~/utils/filename';

export default defineBackground(() => {
  // Register context menus on install / update to prevent duplicate ID errors
  browser.runtime.onInstalled.addListener((details) => {
    setupContextMenus();

    // Firefox MV3 makes host access opt-in. Nothing runs until it is granted,
    // so a fresh install goes straight to the one-click enable page.
    if (details.reason === 'install') {
      browser.tabs.create({ url: browser.runtime.getURL('/welcome.html') }).catch(() => {});
    }
  });

  // Re-verify context menus on service worker startup safely
  setupContextMenus();

  // Keyboard shortcut listener
  browser.commands?.onCommand?.addListener(async (command) => {
    if (command === 'open-gallery') {
      const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
      if (tab?.id) {
        await openGalleryOnTab(tab.id);
      }
    }
  });

  browser.contextMenus.onClicked.addListener(async (info, tab) => {
    if (info.menuItemId === 'fast-save-image' && info.srcUrl) {
      await downloadImage(info.srcUrl, tab?.title);
      return;
    }

    if (info.menuItemId === 'fast-save-video' && info.srcUrl) {
      if (!info.srcUrl.startsWith('blob:')) {
        await downloadImage(info.srcUrl, tab?.title);
      }
      return;
    }

    if (info.menuItemId === 'fast-save-image-batch' && tab?.id) {
      await openGalleryOnTab(tab.id);
    }
  });

  browser.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.type === 'download-image') {
      downloadImage(message.src, message.pageTitle, message.width, message.height).then(() => {
        sendResponse({ ok: true });
      });
      return true;
    }

    if (message.type === 'download-batch-zip') {
      downloadBatchZip(message.images, message.pageTitle).then((res) => {
        sendResponse(res);
      }).catch((err) => {
        sendResponse({ ok: false, error: String(err) });
      });
      return true;
    }

    if (message.type === 'download-batch') {
      downloadBatchIndividual(message.images, message.pageTitle).then((res) => {
        sendResponse(res);
      }).catch((err) => {
        sendResponse({ ok: false, error: String(err) });
      });
      return true;
    }

    if (message.type === 'mediagrab:open-gallery' && typeof message.tabId === 'number') {
      openGalleryOnTab(message.tabId).then(() => {
        sendResponse({ ok: true });
      }).catch((err) => {
        sendResponse({ ok: false, error: String(err) });
      });
      return true;
    }

    if (message.type === 'mediagrab:download' && message.media) {
      downloadMedia(message.media, message.pageTitle, Number(message.index) || 1).then((res) => {
        sendResponse(res);
      }).catch((err) => {
        sendResponse({ ok: false, error: String(err) });
      });
      return true;
    }

    if (message.type === 'mediagrab:resolve-tweet' && message.tweetId) {
      resolveTweetMedia(String(message.tweetId)).then((items) => {
        sendResponse({ ok: true, items });
      }).catch((err) => {
        sendResponse({ ok: false, error: String(err) });
      });
      return true;
    }

    if (message.type === 'get-settings') {
      Promise.all([
        settings.filenameTemplate.getValue(),
        settings.hoverOverlayEnabled.getValue(),
        settings.batchSubfolder.getValue(),
        settings.minHoverSize.getValue(),
        settings.batchDownloadMode.getValue(),
        settings.hoverKeyModifier.getValue(),
      ]).then(([filenameTemplate, hoverOverlayEnabled, batchSubfolder, minHoverSize, batchDownloadMode, hoverKeyModifier]) => {
        sendResponse({
          filenameTemplate,
          hoverOverlayEnabled,
          batchSubfolder,
          minHoverSize,
          batchDownloadMode,
          hoverKeyModifier,
        });
      });
      return true;
    }
  });
});

function setupContextMenus() {
  browser.contextMenus.removeAll(() => {
    if (browser.runtime.lastError) {
      // Silently ignore
    }

    browser.contextMenus.create(
      {
        id: 'fast-save-image',
        title: 'MediaGrab: Save Image',
        contexts: ['image'],
      },
      () => {
        if (browser.runtime.lastError) {
          // Silently ignore
        }
      }
    );

    browser.contextMenus.create(
      {
        id: 'fast-save-video',
        title: 'MediaGrab: Save Video',
        contexts: ['video'],
      },
      () => {
        if (browser.runtime.lastError) {
          // Silently ignore
        }
      }
    );

    browser.contextMenus.create(
      {
        id: 'fast-save-image-batch',
        title: 'MediaGrab: Open Gallery for This Page',
        contexts: ['page', 'image'],
      },
      () => {
        if (browser.runtime.lastError) {
          // Silently ignore
        }
      }
    );
  });
}

async function downloadImage(
  src: string,
  pageTitle?: string,
  width?: number,
  height?: number
): Promise<void> {
  const template = await settings.filenameTemplate.getValue();
  const domain = extractDomain(src);
  const timestamp = getTimestamp();
  const ext = getFileExtension(src);
  const originalName = getOriginalName(src);

  const filename = formatFilename(template, {
    originalName,
    ext,
    domain,
    timestamp,
    index: 1,
    pageTitle,
    width,
    height,
  });

  await browser.downloads.download({
    url: src,
    filename,
    saveAs: false,
  });

  await recordDownloads([{ url: src, filename, kind: 'image' }]);
}

async function downloadMedia(
  media: ScrapedMedia,
  pageTitle?: string,
  index = 1
): Promise<{ ok: boolean; error?: string }> {
  if (!media?.src) {
    return { ok: false, error: 'No source URL' };
  }
  if (media.unsupported === 'hls-only') {
    return { ok: false, error: 'This post is HLS-only. Support lands in 2.1.' };
  }

  const template = await settings.filenameTemplate.getValue();
  const timestamp = getTimestamp();
  const ext = media.ext || 'mp4';
  const originalName = media.tweetId
    ? `${media.author || 'x'}_${media.tweetId}`
    : getOriginalName(media.src);

  const filename = formatFilename(template, {
    originalName,
    ext,
    domain: extractDomain(media.src),
    timestamp,
    index,
    pageTitle,
    width: media.width,
    height: media.height,
    author: media.author,
    tweetId: media.tweetId,
    mediaId: media.id,
  });

  await browser.downloads.download({
    url: media.src,
    filename,
    saveAs: false,
    conflictAction: 'uniquify',
  });

  await recordDownloads([{ url: media.src, filename, kind: media.kind }]);

  return { ok: true };
}

async function resolveTweetMedia(tweetId: string): Promise<ScrapedMedia[]> {
  const quality = (await settings.videoQuality.getValue()) as VideoQuality;
  const response = await fetch(syndicationEndpoint(tweetId));
  if (!response.ok) return [];
  const payload = await response.json();
  return extractMediaFromSyndication(payload, tweetId).map((media) =>
    capturedToScraped(media, quality, `https://x.com/i/status/${tweetId}`)
  );
}

async function fetchImageBuffer(src: string): Promise<{ data: ArrayBuffer | string; isBase64: boolean } | null> {
  if (src.startsWith('data:')) {
    const match = src.match(/^data:[^;]+;base64,(.+)$/);
    if (match?.[1]) {
      return { data: match[1], isBase64: true };
    }
    return null;
  }

  try {
    const response = await fetch(src);
    if (!response.ok) return null;
    const arrayBuffer = await response.arrayBuffer();
    return { data: arrayBuffer, isBase64: false };
  } catch {
    return null;
  }
}

async function downloadBatchZip(
  images: ScrapedImage[],
  pageTitle?: string
): Promise<{ ok: boolean; count: number }> {
  if (!images || !images.length) {
    return { ok: true, count: 0 };
  }

  if (images.length > ZIP_MAX_FILES) {
    throw new Error(`ZIP is limited to ${ZIP_MAX_FILES} images. Download this batch individually instead.`);
  }

  const zip = new JSZip();
  const template = await settings.filenameTemplate.getValue();
  const domain = extractDomain(images[0]?.src || '');
  const timestamp = getTimestamp();

  const { zipFilename } = getBatchFolderName({
    domain,
    pageTitle,
    timestamp,
  });

  let addedCount = 0;
  let totalBytes = 0;
  const saved: Array<{ url: string; filename: string }> = [];

  for (let i = 0; i < images.length; i++) {
    const img = images[i];
    if (!img) continue;
    const ext = img.ext || getFileExtension(img.src);
    const originalName = img.originalName || getOriginalName(img.src);

    const filename = formatFilename(template, {
      originalName,
      ext,
      domain,
      timestamp,
      index: i + 1,
      pageTitle,
      width: img.width,
      height: img.height,
    });

    const bufferObj = await fetchImageBuffer(img.src);
    if (bufferObj) {
      const size = bufferObj.isBase64
        ? Math.ceil(String(bufferObj.data).length * 0.75)
        : (bufferObj.data as ArrayBuffer).byteLength;

      if (totalBytes + size > ZIP_MAX_BYTES) {
        throw new Error('ZIP is limited to 500 MB. Download this batch individually instead.');
      }

      if (bufferObj.isBase64) {
        zip.file(filename, bufferObj.data as string, { base64: true });
      } else {
        zip.file(filename, bufferObj.data as ArrayBuffer);
      }
      totalBytes += size;
      addedCount++;
      saved.push({ url: img.src, filename });
    }
  }

  if (addedCount === 0) {
    throw new Error('Could not fetch any of the selected images for ZIP bundling.');
  }

  const blob = await zip.generateAsync({ type: 'blob' });

  let downloadUrl: string;
  let revoke = false;

  if (typeof URL.createObjectURL === 'function') {
    downloadUrl = URL.createObjectURL(blob);
    revoke = true;
  } else {
    if (blob.size > ZIP_DATA_URL_LIMIT) {
      throw new Error('ZIP is too large for this browser. Download the batch individually instead.');
    }
    const base64 = await zip.generateAsync({ type: 'base64' });
    downloadUrl = `data:application/zip;base64,${base64}`;
  }

  await browser.downloads.download({
    url: downloadUrl,
    filename: zipFilename,
    saveAs: false,
  });

  if (revoke) {
    setTimeout(() => URL.revokeObjectURL(downloadUrl), 60_000);
  }

  await recordDownloads(saved.map((entry) => ({ ...entry, kind: 'image' })));

  return { ok: true, count: addedCount };
}

async function downloadBatchIndividual(
  images: ScrapedImage[],
  pageTitle?: string
): Promise<{ ok: boolean; count: number }> {
  if (!images || !images.length) {
    return { ok: true, count: 0 };
  }

  const template = await settings.filenameTemplate.getValue();
  const batchSubfolder = await settings.batchSubfolder.getValue();
  const domain = extractDomain(images[0]?.src || '');
  const timestamp = getTimestamp();

  const { folderPath } = getBatchFolderName({
    domain,
    pageTitle,
    timestamp,
  });

  const folderPrefix = batchSubfolder ? folderPath : '';
  const saved: Array<{ url: string; filename: string }> = [];

  for (let i = 0; i < images.length; i++) {
    const img = images[i];
    if (!img) continue;
    const ext = img.ext || getFileExtension(img.src);
    const originalName = img.originalName || getOriginalName(img.src);

    const baseFormatted = formatFilename(template, {
      originalName,
      ext,
      domain,
      timestamp,
      index: i + 1,
      pageTitle,
      width: img.width,
      height: img.height,
    });

    const filename = `${folderPrefix}${baseFormatted}`;

    try {
      await browser.downloads.download({
        url: img.src,
        filename,
        saveAs: false,
      });
      saved.push({ url: img.src, filename });
      // Small throttle delay between downloads
      await new Promise((resolve) => setTimeout(resolve, 150));
    } catch (e) {
      console.warn('Failed to download image in batch:', img.src, e);
    }
  }

  await recordDownloads(saved.map((entry) => ({ ...entry, kind: 'image' })));

  return { ok: true, count: images.length };
}

async function openGalleryOnTab(tabId: number): Promise<void> {
  const tab = await browser.tabs.get(tabId).catch(() => null);
  let items: ScrapedMedia[] = [];

  const collect = async (): Promise<ScrapedMedia[]> => {
    const response = await browser.tabs.sendMessage(tabId, { type: 'mediagrab:collect' });
    return response?.ok ? (response.items as ScrapedMedia[]) : [];
  };

  try {
    items = await collect();
  } catch {
    // Content scripts may be missing on tabs loaded before install.
  }

  if (!items.length) {
    try {
      await browser.scripting.executeScript({
        target: { tabId },
        files: ['/content-scripts/image-scraper.js'],
      });
      items = await collect();
    } catch (err) {
      console.error('Could not collect media from tab:', err);
    }
  }

  await storeGalleryPayload({
    items,
    title: tab?.title,
    url: tab?.url,
    createdAt: Date.now(),
  });
  await browser.tabs.create({ url: browser.runtime.getURL('/gallery.html') });
}
