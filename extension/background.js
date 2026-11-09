/**
 * Anti-WebP Image Saver — Background Service Worker (Manifest V3)
 * Frictionless "Set and Forget" Architecture
 */

const DEFAULT_PREFERENCES = {
  format: 'png',  // 'png' or 'jpg'
  quality: 0.92   // 0.40 to 1.00 (JPG only)
};

// 1. Initialize default preference & register exactly ONE context menu item
chrome.runtime.onInstalled.addListener(async () => {
  const current = await chrome.storage.sync.get(DEFAULT_PREFERENCES);
  await chrome.storage.sync.set(current);

  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: 'anti-webp-save-image',
      title: 'Anti-WebP: Save Image',
      contexts: ['image']
    });
  });
});

// 2. Sanitize filename: strip previous extension (.webp, etc.) and append target extension
function sanitizeFilename(srcUrl, targetExt) {
  try {
    const url = new URL(srcUrl);
    let name = url.pathname.substring(url.pathname.lastIndexOf('/') + 1) || 'image';
    name = name.split('?')[0].split('#')[0];
    name = name.replace(/\.(webp|png|jpe?g|avif|gif|bmp|tiff|heic|svg)$/i, '');
    name = decodeURIComponent(name).replace(/[<>:"/\\|?*\x00-\x1F]/g, '_').trim();
    if (!name || name === '_') {
      name = `image_${Date.now()}`;
    }
    return `${name}.${targetExt}`;
  } catch (err) {
    return `image_${Date.now()}.${targetExt}`;
  }
}

// 3. Convert ArrayBuffer to Data URL safely in Service Worker context (Zero DOM dependencies)
async function blobToDataURL(blob) {
  const buffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 8192;
  const len = bytes.length;
  for (let i = 0; i < len; i += chunkSize) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, Math.min(i + chunkSize, len)));
  }
  return `data:${blob.type};base64,${btoa(binary)}`;
}

// 4. Handle context menu click: fetch, convert via OffscreenCanvas, and download
chrome.contextMenus.onClicked.addListener(async (info) => {
  if (info.menuItemId !== 'anti-webp-save-image' || !info.srcUrl) return;

  try {
    // Read user's saved preference
    const { format, quality } = await chrome.storage.sync.get(DEFAULT_PREFERENCES);
    const isJpg = format === 'jpg';
    const targetMime = isJpg ? 'image/jpeg' : 'image/png';
    const targetExt = isJpg ? 'jpg' : 'png';
    const targetQuality = typeof quality === 'number' ? quality : 0.92;

    // Fetch the image as a Blob
    const response = await fetch(info.srcUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: HTTP ${response.status}`);
    }
    const sourceBlob = await response.blob();

    // Decode into ImageBitmap
    const bitmap = await createImageBitmap(sourceBlob);

    // OffscreenCanvas API (Strictly NO document.createElement('canvas'))
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const ctx = canvas.getContext('2d');

    // Solid white fill for JPG to preserve transparency legibility
    if (isJpg) {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, bitmap.width, bitmap.height);
    }

    ctx.drawImage(bitmap, 0, 0);
    bitmap.close();

    // Convert via canvas.convertToBlob()
    const convertedBlob = await canvas.convertToBlob({
      type: targetMime,
      quality: isJpg ? targetQuality : undefined
    });

    // Generate clean filename and trigger download with native Save As dialog
    const dataUrl = await blobToDataURL(convertedBlob);
    const filename = sanitizeFilename(info.srcUrl, targetExt);

    try {
      await chrome.downloads.download({
        url: dataUrl,
        filename: filename,
        saveAs: true
      });
    } catch (downloadErr) {
      // User cancelling the "Save As" file picker throws a specific error message/cancellation
      const errMsg = downloadErr?.message || String(downloadErr);
      if (
        errMsg.includes('User canceled') ||
        errMsg.includes('USER_CANCELED') ||
        errMsg.includes('canceled') ||
        errMsg.includes('cancelled')
      ) {
        // Silently ignore user cancellations to avoid polluting service worker logs
        return;
      }
      throw downloadErr;
    }
  } catch (error) {
    const errMsg = error?.message || String(error);
    if (
      errMsg.includes('User canceled') ||
      errMsg.includes('USER_CANCELED') ||
      errMsg.includes('canceled') ||
      errMsg.includes('cancelled')
    ) {
      return;
    }
    console.error('[Anti-WebP] Conversion/Download error:', error);
  }
});
