import { settings } from '~/utils/storage';
import type { ScrapedImage, HoverKeyModifier } from '~/utils/storage';
import { getFileExtension, getOriginalName } from '~/utils/filename';
import { imageToMedia, scrapeVideos } from '~/utils/dom-media';

export default defineContentScript({
  matches: ['<all_urls>'],
  async main(ctx) {
    let hoverOverlayEnabled = await settings.hoverOverlayEnabled.getValue();
    let minHoverSize = await settings.minHoverSize.getValue();
    let hoverKeyModifier = await settings.hoverKeyModifier.getValue();

    // Watch for reactive settings updates
    settings.hoverOverlayEnabled.watch((val) => {
      hoverOverlayEnabled = Boolean(val);
      if (!hoverOverlayEnabled) {
        hoverController.hide();
      }
    });

    settings.minHoverSize.watch((val) => {
      minHoverSize = Number(val) || 150;
    });


    settings.hoverKeyModifier.watch((val) => {
      hoverKeyModifier = val as HoverKeyModifier;
    });

    const ui = await createShadowRootUi(ctx, {
      name: 'mediagrab-ui-root',
      position: 'inline',
      anchor: 'html',
      onMount: (container) => {
        // Inject styles directly into shadow root
        const style = document.createElement('style');
        style.textContent = getShadowStyles();
        container.appendChild(style);

        const hoverBtn = createFloatingHoverButton(
          container,
          async (src, width, height) => {
            await browser.runtime.sendMessage({
              type: 'download-image',
              src,
              pageTitle: document.title || '',
              width,
              height,
            });
          },
          async (src) => {
            return await browser.runtime.sendMessage({ type: 'mediagrab:copy-image', src });
          }
        );

        const onMessage = (message: { type?: string }, _sender: unknown, sendResponse: (response: unknown) => void) => {
          if (message.type === 'mediagrab:collect') {
            // On X the dedicated bridge owns collection; answering here would
            // race it and lose captured videos.
            if (/(^|\.)(x|twitter)\.com$/i.test(window.location.hostname)) return;

            const items = [
              ...scrapeImages().map(imageToMedia),
              ...scrapeVideos(),
            ];
            sendResponse({ ok: true, items });
            return true;
          }
        };

        browser.runtime.onMessage.addListener(onMessage);

        return { hoverBtn, onMessage };
      },
      onRemove: (mounted) => {
        if (!mounted) return;
        browser.runtime.onMessage.removeListener(mounted.onMessage);
        mounted.hoverBtn.destroy();
      },
    });

    ui.mount();

    // Floating hover controller attached safely without DOM mutation
    const hoverController = setupHoverTracker(
      () => hoverOverlayEnabled,
      () => minHoverSize,
      () => hoverKeyModifier,
      (imgInfo, rect) => {
        if (ui.mounted) {
          ui.mounted.hoverBtn.show(imgInfo, rect);
        }
      },
      () => {
        if (ui.mounted) {
          ui.mounted.hoverBtn.hide();
        }
      }
    );
  },
});

/* ==========================================================================
   IMAGE SCRAPING ENGINE
   ========================================================================== */

function calculateOrientation(width: number, height: number): 'landscape' | 'portrait' | 'square' {
  if (!width || !height) return 'square';
  const ratio = width / height;
  if (ratio > 1.2) return 'landscape';
  if (ratio < 0.83) return 'portrait';
  return 'square';
}

function scrapeImages(): ScrapedImage[] {
  const results: ScrapedImage[] = [];
  const seen = new Set<string>();

  const addImage = (
    src: string | null | undefined,
    width: number,
    height: number,
    alt: string = ''
  ) => {
    if (!src || typeof src !== 'string') return;
    const trimmed = src.trim();
    if (!trimmed || trimmed.startsWith('javascript:')) return;

    let href = trimmed;
    if (!trimmed.startsWith('data:') && !trimmed.startsWith('blob:')) {
      try {
        href = new URL(trimmed, window.location.href).href;
      } catch {
        return;
      }
    }

    if (seen.has(href)) return;
    seen.add(href);

    const ext = getFileExtension(href);
    const originalName = getOriginalName(href);
    const format = ext.toUpperCase();
    const cleanW = Math.max(width, 0);
    const cleanH = Math.max(height, 0);
    const orientation = calculateOrientation(cleanW, cleanH);

    results.push({
      src: href,
      originalName,
      ext,
      width: cleanW,
      height: cleanH,
      format,
      alt: alt.trim(),
      orientation,
    });
  };

  const parseSrcset = (value: string) => {
    return value
      .split(',')
      .map((part) => part.trim().split(/\s+/)[0])
      .filter(Boolean);
  };

  // 1. Scan <img> elements
  document.querySelectorAll('img').forEach((img) => {
    const width = img.naturalWidth || img.width || Math.round(img.getBoundingClientRect().width);
    const height = img.naturalHeight || img.height || Math.round(img.getBoundingClientRect().height);
    const alt = img.alt || '';

    const srcCandidates = [
      img.currentSrc,
      img.src,
      img.getAttribute('src'),
      img.dataset.src,
      img.dataset.lazySrc,
      img.dataset.originalSrc,
      img.dataset.highres,
      img.dataset.full,
      img.dataset.zoomSrc,
    ].filter(Boolean) as string[];

    srcCandidates.forEach((src) => addImage(src, width, height, alt));

    const srcset = img.getAttribute('srcset') || img.dataset.srcset || '';
    if (srcset) {
      parseSrcset(srcset).forEach((src) => addImage(src, width, height, alt));
    }
  });

  // 2. Scan <picture> and <source> elements
  document.querySelectorAll('picture source').forEach((source) => {
    const srcset = source.getAttribute('srcset') || source.getAttribute('data-srcset') || '';
    if (srcset) {
      parseSrcset(srcset).forEach((src) => addImage(src, 999, 999));
    }
  });

  // 3. Scan <video poster="...">
  document.querySelectorAll('video[poster]').forEach((video) => {
    const poster = video.getAttribute('poster');
    const rect = video.getBoundingClientRect();
    if (poster) {
      addImage(poster, Math.round(rect.width), Math.round(rect.height));
    }
  });

  // 4. Scan CSS background-image on elements
  document.querySelectorAll('*').forEach((el) => {
    if (el instanceof HTMLImageElement || el instanceof HTMLSourceElement) return;
    const style = window.getComputedStyle(el);
    const bg = style.backgroundImage;
    if (bg && bg !== 'none') {
      const match = bg.match(/url\(["']?([^"')]+)["']?\)/);
      if (match?.[1]) {
        const rect = el.getBoundingClientRect();
        if (rect.width >= 30 && rect.height >= 30) {
          addImage(match[1], Math.round(rect.width), Math.round(rect.height));
        }
      }
    }
  });

  // 5. Scan <canvas> elements
  document.querySelectorAll('canvas').forEach((canvas) => {
    if (canvas.width >= 50 && canvas.height >= 50) {
      try {
        const dataUrl = canvas.toDataURL('image/png');
        addImage(dataUrl, canvas.width, canvas.height, 'Canvas Render');
      } catch {
        // Tainted canvas
      }
    }
  });

  // Sort by resolution (largest first)
  return results.sort((a, b) => (b.width * b.height) - (a.width * a.height));
}

/* ==========================================================================
   DEEP SCAN (Auto-Scroll to trigger lazy loading)
   ========================================================================== */

/* ==========================================================================
   FLOATING HOVER SAVE BUTTON (Zero host DOM mutation)
   ========================================================================== */

const ICON_SAVE = `<svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>`;
const ICON_COPY = `<svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor"><path d="M16 1H4a2 2 0 0 0-2 2v12h2V3h12V1Zm3 4H8a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2Zm0 16H8V7h11v14Z"/></svg>`;
const ICON_CHECK = `<svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor"><path d="M9.6 16.8 5.8 13l-1.4 1.4 5.2 5.2L21 8.2 19.6 6.8z"/></svg>`;
const ICON_FAIL = `<svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor"><path d="M12 2 1 21h22L12 2Zm0 5.5 7.5 12.5h-15L12 7.5ZM11 10v5h2v-5h-2Zm0 6.5v2h2v-2h-2Z"/></svg>`;

function createFloatingHoverButton(
  root: HTMLElement,
  onDownload: (src: string, width: number, height: number) => Promise<void>,
  onCopy: (src: string) => Promise<{ ok: boolean; error?: string }>
) {
  const wrap = document.createElement('div');
  wrap.className = 'ig-hover-actions';

  const saveBtn = document.createElement('button');
  saveBtn.type = 'button';
  saveBtn.className = 'ig-floating-btn';
  saveBtn.title = 'Save image (MediaGrab)';
  saveBtn.innerHTML = `${ICON_SAVE}<span>Save</span>`;

  const copyBtn = document.createElement('button');
  copyBtn.type = 'button';
  copyBtn.className = 'ig-floating-btn';
  copyBtn.title = 'Copy image to clipboard (MediaGrab)';
  copyBtn.innerHTML = `${ICON_COPY}<span>Copy</span>`;

  let currentTarget: { src: string; width: number; height: number } | null = null;
  let isHovered = false;

  wrap.addEventListener('mouseenter', () => {
    isHovered = true;
  });

  wrap.addEventListener('mouseleave', () => {
    isHovered = false;
    wrap.classList.remove('visible');
  });

  saveBtn.addEventListener('click', async (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (!currentTarget) return;

    saveBtn.innerHTML = `${ICON_CHECK}<span>Saved</span>`;
    try {
      await onDownload(currentTarget.src, currentTarget.width, currentTarget.height);
    } finally {
      setTimeout(() => {
        saveBtn.innerHTML = `${ICON_SAVE}<span>Save</span>`;
      }, 1500);
    }
  });

  copyBtn.addEventListener('click', async (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (!currentTarget) return;

    copyBtn.disabled = true;
    copyBtn.innerHTML = `${ICON_COPY}<span>Copying…</span>`;
    try {
      const result = await onCopy(currentTarget.src);
      copyBtn.innerHTML = result.ok
        ? `${ICON_CHECK}<span>Copied</span>`
        : `${ICON_FAIL}<span>Failed</span>`;
      copyBtn.title = result.ok ? 'Copied to clipboard' : result.error || 'Copy failed';
    } finally {
      setTimeout(() => {
        copyBtn.disabled = false;
        copyBtn.innerHTML = `${ICON_COPY}<span>Copy</span>`;
        copyBtn.title = 'Copy image to clipboard (MediaGrab)';
      }, 1500);
    }
  });

  wrap.append(saveBtn, copyBtn);
  root.appendChild(wrap);

  return {
    show(target: { src: string; width: number; height: number }, rect: DOMRect) {
      currentTarget = target;
      wrap.style.top = `${Math.max(rect.top + 8, 8)}px`;
      wrap.style.left = `${Math.min(rect.right - 160, window.innerWidth - 172)}px`;
      wrap.classList.add('visible');
    },
    hide() {
      if (!isHovered) wrap.classList.remove('visible');
    },
    destroy() {
      wrap.remove();
    },
  };
}

function setupHoverTracker(
  isEnabled: () => boolean,
  getMinSize: () => number,
  getModifier: () => HoverKeyModifier,
  onShow: (info: { src: string; width: number; height: number }, rect: DOMRect) => void,
  onHide: () => void
) {
  let activeElement: HTMLElement | null = null;
  let hideTimeout: number | undefined;

  const handlePointerOver = (e: MouseEvent) => {
    if (!isEnabled()) return;

    // Check modifier key
    const modifier = getModifier();
    if (modifier === 'alt' && !e.altKey) return;
    if (modifier === 'ctrl' && (!e.ctrlKey && !e.metaKey)) return;

    const target = e.target;
    if (!(target instanceof HTMLElement)) return;

    let imgElement: HTMLImageElement | null = null;
    let src = '';

    if (target instanceof HTMLImageElement) {
      imgElement = target;
      src = target.currentSrc || target.src || target.dataset.src || '';
    } else {
      const computed = window.getComputedStyle(target);
      const bg = computed.backgroundImage;
      if (bg && bg !== 'none') {
        const match = bg.match(/url\(["']?([^"')]+)["']?\)/);
        if (match?.[1]) {
          src = match[1];
        }
      }
    }

    if (!src || src.startsWith('data:image/svg')) return;

    const rect = target.getBoundingClientRect();
    const minSize = getMinSize();
    const width = imgElement ? (imgElement.naturalWidth || rect.width) : rect.width;
    const height = imgElement ? (imgElement.naturalHeight || rect.height) : rect.height;

    if (rect.width < minSize || rect.height < minSize || width < minSize || height < minSize) {
      return;
    }

    clearTimeout(hideTimeout);
    activeElement = target;
    onShow({ src, width: Math.round(width), height: Math.round(height) }, rect);
  };

  const handlePointerOut = (e: MouseEvent) => {
    if (e.target === activeElement) {
      hideTimeout = window.setTimeout(() => {
        onHide();
        activeElement = null;
      }, 250);
    }
  };

  const handleScrollOrResize = () => {
    if (activeElement) {
      const rect = activeElement.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > window.innerHeight) {
        onHide();
        activeElement = null;
      } else {
        const src = (activeElement as HTMLImageElement).currentSrc || (activeElement as HTMLImageElement).src || '';
        onShow({ src, width: Math.round(rect.width), height: Math.round(rect.height) }, rect);
      }
    }
  };

  document.addEventListener('mouseover', handlePointerOver, { passive: true });
  document.addEventListener('mouseout', handlePointerOut, { passive: true });
  window.addEventListener('scroll', handleScrollOrResize, { passive: true });
  window.addEventListener('resize', handleScrollOrResize, { passive: true });

  return {
    hide: onHide,
  };
}

/* ==========================================================================
   BATCH DOWNLOADER MODAL (Full Featured)
   ========================================================================== */

/* ==========================================================================
   SHADOW DOM CSS STYLES
   ========================================================================== */

function getShadowStyles(): string {
  return `
    :host {
      all: initial;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }

    /* Floating Save Button */
    .ig-hover-actions {
      position: fixed;
      display: flex;
      gap: 6px;
      z-index: 2147483646;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.18s ease;
    }

    .ig-hover-actions.visible {
      opacity: 1;
      pointer-events: auto;
    }

    .ig-floating-btn {
      position: static;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      background: rgba(15, 23, 42, 0.85);
      backdrop-filter: blur(8px);
      color: #ffffff;
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: transform 0.15s ease, background 0.15s ease;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.25);
    }
    .ig-floating-btn:hover {
      background: rgba(15, 23, 42, 0.97);
      transform: translateY(-1px);
    }

    .ig-floating-btn:active {
      transform: scale(0.97);
    }

    .ig-floating-btn:disabled {
      cursor: default;
      opacity: 0.75;
    }
    .ig-floating-btn svg {
      flex-shrink: 0;
    }

    /* Modal Backdrop */
    .ig-modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.65);
      backdrop-filter: blur(4px);
      display: none;
      align-items: center;
      justify-content: center;
      z-index: 2147483647;
      padding: 20px;
      box-sizing: border-box;
    }

    /* Modal Card */
    .ig-modal-card {
      width: 100%;
      max-width: 980px;
      height: 88vh;
      max-height: 860px;
      background: #ffffff;
      border-radius: 16px;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.1);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      border: 1px solid #e2e8f0;
      animation: ig-scale-in 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }

    @keyframes ig-scale-in {
      from { transform: scale(0.96); opacity: 0; }
      to { transform: scale(1); opacity: 1; }
    }

    /* Modal Header */
    .ig-modal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 24px;
      background: #ffffff;
      border-bottom: 1px solid #e2e8f0;
    }
    .ig-modal-title-wrap {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .ig-logo-badge {
      width: 36px;
      height: 36px;
      border-radius: 10px;
      background: #eff6ff;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .ig-modal-title {
      margin: 0;
      font-size: 17px;
      font-weight: 700;
      color: #0f172a;
    }
    .ig-modal-subtitle {
      font-size: 12px;
      color: #64748b;
    }
    .ig-action-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      color: #2563eb;
      font-size: 12px;
      font-weight: 600;
      padding: 6px 12px;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .ig-action-btn:hover {
      background: #dbeafe;
      border-color: #93c5fd;
    }
    .ig-action-btn-loading {
      opacity: 0.7;
      cursor: wait;
    }
    .ig-icon-btn {
      background: transparent;
      border: none;
      color: #64748b;
      cursor: pointer;
      padding: 6px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.15s ease, color 0.15s ease;
    }
    .ig-icon-btn:hover {
      background: #f1f5f9;
      color: #0f172a;
    }

    /* Toolbar */
    .ig-modal-toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 24px;
      background: #f8fafc;
      border-bottom: 1px solid #e2e8f0;
      gap: 16px;
      flex-wrap: wrap;
    }
    .ig-toolbar-left {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
    }
    .ig-toolbar-right {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .ig-format-filters, .ig-orientation-filters {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
    }
    .ig-chip {
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 20px;
      padding: 4px 10px;
      font-size: 11px;
      font-weight: 600;
      color: #475569;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .ig-chip:hover {
      border-color: #94a3b8;
      background: #f1f5f9;
    }
    .ig-chip-active {
      background: #2563eb;
      color: #ffffff;
      border-color: #2563eb;
    }
    .ig-chip-active:hover {
      background: #1d4ed8;
      border-color: #1d4ed8;
    }
    .ig-select {
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      padding: 5px 10px;
      font-size: 12px;
      color: #334155;
      cursor: pointer;
      outline: none;
    }
    .ig-search-input {
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      padding: 5px 12px;
      font-size: 12px;
      color: #1e293b;
      outline: none;
      width: 150px;
      transition: width 0.2s ease, border-color 0.2s ease;
    }
    .ig-search-input:focus {
      border-color: #2563eb;
      width: 180px;
    }
    .ig-action-link-btn {
      background: transparent;
      border: none;
      color: #2563eb;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      padding: 4px 6px;
      border-radius: 4px;
    }
    .ig-action-link-btn:hover {
      text-decoration: underline;
    }

    /* Grid Wrap */
    .ig-grid-wrap {
      flex: 1;
      overflow-y: auto;
      padding: 20px 24px;
      background: #f8fafc;
    }
    .ig-image-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
      gap: 16px;
    }

    /* Empty State */
    .ig-empty-state {
      grid-column: 1 / -1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 60px 20px;
      color: #64748b;
      font-size: 14px;
    }

    /* Card */
    .ig-card {
      background: #ffffff;
      border: 2px solid #e2e8f0;
      border-radius: 12px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      cursor: pointer;
      transition: all 0.15s ease;
      position: relative;
      user-select: none;
    }
    .ig-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.08);
      border-color: #cbd5e1;
    }
    .ig-card-selected {
      border-color: #2563eb;
      background: #eff6ff;
    }
    .ig-card-selected:hover {
      border-color: #2563eb;
    }

    /* Card Topbar */
    .ig-card-topbar {
      position: absolute;
      top: 6px;
      left: 6px;
      right: 6px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      z-index: 2;
    }
    .ig-checkbox {
      width: 18px;
      height: 18px;
      border-radius: 4px;
      cursor: pointer;
      accent-color: #2563eb;
    }
    .ig-card-quick-actions {
      display: flex;
      align-items: center;
      gap: 4px;
      opacity: 0;
      transition: opacity 0.15s ease;
    }
    .ig-card:hover .ig-card-quick-actions {
      opacity: 1;
    }
    .ig-quick-btn {
      width: 24px;
      height: 24px;
      background: rgba(15, 23, 42, 0.75);
      backdrop-filter: blur(4px);
      border: none;
      border-radius: 6px;
      color: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: background 0.15s ease;
    }
    .ig-quick-btn:hover {
      background: #2563eb;
    }

    /* Thumbnail */
    .ig-thumb-wrap {
      width: 100%;
      height: 130px;
      background: #f1f5f9;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
    }
    .ig-thumb {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: transform 0.2s ease;
    }
    .ig-card:hover .ig-thumb {
      transform: scale(1.03);
    }

    /* Card Meta */
    .ig-card-meta {
      padding: 8px 10px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #ffffff;
      border-top: 1px solid #f1f5f9;
    }
    .ig-badge {
      font-size: 10px;
      font-weight: 600;
      border-radius: 4px;
      padding: 2px 5px;
    }
    .ig-badge-size {
      color: #64748b;
      background: #f1f5f9;
    }
    .ig-badge-format {
      color: #2563eb;
      background: #eff6ff;
    }

    /* Modal Footer */
    .ig-modal-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 24px;
      background: #ffffff;
      border-top: 1px solid #e2e8f0;
      gap: 16px;
    }
    .ig-footer-status {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .ig-counter-badge {
      font-size: 13px;
      font-weight: 600;
      color: #1e293b;
    }
    .ig-progress-label {
      font-size: 12px;
      color: #2563eb;
      font-weight: 500;
    }
    .ig-footer-actions {
      display: flex;
      gap: 10px;
      align-items: center;
    }
    .ig-btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;
      border: 1px solid transparent;
      outline: none;
    }
    .ig-btn-secondary {
      background: #ffffff;
      border-color: #cbd5e1;
      color: #475569;
    }
    .ig-btn-secondary:hover {
      background: #f8fafc;
      border-color: #94a3b8;
    }
    .ig-btn-outline {
      background: #ffffff;
      border-color: #94a3b8;
      color: #334155;
    }
    .ig-btn-outline:hover:not(:disabled) {
      background: #f1f5f9;
      border-color: #64748b;
    }
    .ig-btn-primary {
      background: #2563eb;
      color: #ffffff;
    }
    .ig-btn-primary:hover:not(:disabled) {
      background: #1d4ed8;
      box-shadow: 0 4px 12px rgba(37, 99, 235, 0.25);
    }
    .ig-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    /* Toast Notification */
    .ig-toast {
      position: absolute;
      bottom: 80px;
      left: 50%;
      transform: translateX(-50%) translateY(20px);
      background: rgba(15, 23, 42, 0.9);
      color: #ffffff;
      padding: 8px 16px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
      opacity: 0;
      pointer-events: none;
      transition: all 0.2s ease;
      z-index: 20;
    }
    .ig-toast-visible {
      opacity: 1;
      transform: translateX(-50%) translateY(0);
    }

    /* Lightbox Preview */
    .ig-lightbox {
      position: absolute;
      inset: 0;
      background: rgba(15, 23, 42, 0.85);
      backdrop-filter: blur(6px);
      display: none;
      align-items: center;
      justify-content: center;
      z-index: 30;
      padding: 40px;
      box-sizing: border-box;
    }
    .ig-lightbox-content {
      position: relative;
      max-width: 90%;
      max-height: 90%;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
    }
    .ig-lightbox-close {
      position: absolute;
      top: -36px;
      right: 0;
      background: transparent;
      border: none;
      color: #ffffff;
      font-size: 28px;
      cursor: pointer;
      line-height: 1;
    }
    .ig-lightbox-img {
      max-width: 100%;
      max-height: 70vh;
      object-fit: contain;
      border-radius: 8px;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
    }
    .ig-lightbox-info {
      color: #f1f5f9;
      font-size: 13px;
      display: flex;
      gap: 16px;
      background: rgba(0, 0, 0, 0.4);
      padding: 6px 14px;
      border-radius: 20px;
    }
  `;
}
