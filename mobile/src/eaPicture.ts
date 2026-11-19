/**
 * Compress EA pictures so localStorage can keep key + image without QuotaExceeded.
 * Target: ~256px JPEG data URL (typically 20–60KB).
 */

const MAX_EDGE = 256;
const JPEG_QUALITY = 0.62;
/** Soft cap — re-encode harder if still over this. */
const MAX_DATA_URL_CHARS = 90_000;

function isDataUrl(uri: string | null | undefined): uri is string {
  return !!uri && uri.startsWith('data:');
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('image load failed'));
    img.src = src;
  });
}

function canvasToJpeg(
  canvas: HTMLCanvasElement,
  quality: number,
): string {
  return canvas.toDataURL('image/jpeg', quality);
}

/**
 * Resize + JPEG-encode a data URL (web). Non-data URIs and native paths pass through.
 */
export async function compressEaPicture(
  uri: string | null,
): Promise<string | null> {
  if (!uri) return null;
  if (!uri.startsWith('data:')) return uri;

  // Already small enough — keep.
  if (uri.length <= MAX_DATA_URL_CHARS && uri.startsWith('data:image/jpeg')) {
    return uri;
  }

  if (typeof document === 'undefined') {
    // Native / no DOM: trim only if absurdly large PNG/JPEG data URL by leaving as-is;
    // native AsyncStorage has higher limits than browser localStorage.
    return uri;
  }

  try {
    const img = await loadImage(uri);
    const w = img.naturalWidth || img.width;
    const h = img.naturalHeight || img.height;
    if (!w || !h) return uri;

    const scale = Math.min(1, MAX_EDGE / Math.max(w, h));
    const tw = Math.max(1, Math.round(w * scale));
    const th = Math.max(1, Math.round(h * scale));

    const canvas = document.createElement('canvas');
    canvas.width = tw;
    canvas.height = th;
    const ctx = canvas.getContext('2d');
    if (!ctx) return uri;
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, tw, th);
    ctx.drawImage(img, 0, 0, tw, th);

    let out = canvasToJpeg(canvas, JPEG_QUALITY);
    if (out.length > MAX_DATA_URL_CHARS) {
      out = canvasToJpeg(canvas, 0.45);
    }
    if (out.length > MAX_DATA_URL_CHARS) {
      // Smaller edge
      const s2 = Math.min(1, 160 / Math.max(w, h));
      canvas.width = Math.max(1, Math.round(w * s2));
      canvas.height = Math.max(1, Math.round(h * s2));
      ctx.fillStyle = '#0a0a0a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      out = canvasToJpeg(canvas, 0.4);
    }
    return out || uri;
  } catch {
    return uri;
  }
}

/** Compress every EA / key data-URL picture in a catalog. */
export async function compressCatalogPictures<
  TEa extends { pictureUri: string | null },
  TKey extends { eaPictureUri: string | null },
>(eas: TEa[], keys: TKey[]): Promise<{ eas: TEa[]; keys: TKey[] }> {
  const nextEas = await Promise.all(
    eas.map(async (e) => ({
      ...e,
      pictureUri: isDataUrl(e.pictureUri)
        ? await compressEaPicture(e.pictureUri)
        : e.pictureUri,
    })),
  );
  const nextKeys = await Promise.all(
    keys.map(async (k) => ({
      ...k,
      eaPictureUri: isDataUrl(k.eaPictureUri)
        ? await compressEaPicture(k.eaPictureUri)
        : k.eaPictureUri,
    })),
  );
  return { eas: nextEas, keys: nextKeys };
}
