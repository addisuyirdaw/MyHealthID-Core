/**
 * image-preprocess.ts
 *
 * Manual pixel-level preprocessing for dense Fayda National ID QR codes.
 *
 * WHY: CSS ctx.filter is silently ignored on many browsers/OS combinations.
 * We process pixel ImageData directly instead.
 *
 * Pipeline:
 *  1. Correct EXIF orientation
 *  2. Convert to grayscale using luminance formula (not CSS filter)
 *  3. Apply Otsu's method to compute an adaptive binarisation threshold
 *  4. Build a pure black/white image — ZXing / jsQR handle this best
 *  5. Also produce a 2× upscaled variant for small/compressed photos
 */

// ─── helpers ─────────────────────────────────────────────────────────────────

async function canvasToPngFile(canvas: HTMLCanvasElement, name: string): Promise<File> {
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("toBlob failed"))),
      "image/png"
    );
  });
  return new File([blob], name, { type: "image/png" });
}

/**
 * Convert raw RGBA ImageData to a grayscale Uint8ClampedArray using the
 * standard luminance formula: Y = 0.299R + 0.587G + 0.114B.
 */
function toGrayscale(data: Uint8ClampedArray): Uint8ClampedArray {
  const gray = new Uint8ClampedArray(data.length / 4);
  for (let i = 0; i < gray.length; i++) {
    const r = data[i * 4];
    const g = data[i * 4 + 1];
    const b = data[i * 4 + 2];
    gray[i] = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
  }
  return gray;
}

export function adaptiveThreshold(
  gray: Uint8ClampedArray,
  width: number,
  height: number,
  windowSize = 15,
  C = 10
): Uint8ClampedArray {
  const out = new Uint8ClampedArray(gray.length);
  const half = Math.floor(windowSize / 2);
  
  // Integral image for fast O(1) sum
  const integral = new Uint32Array(width * height);
  for (let y = 0; y < height; y++) {
    let sum = 0;
    for (let x = 0; x < width; x++) {
      sum += gray[y * width + x];
      integral[y * width + x] = (y > 0 ? integral[(y - 1) * width + x] : 0) + sum;
    }
  }

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const x1 = Math.max(0, x - half);
      const y1 = Math.max(0, y - half);
      const x2 = Math.min(width - 1, x + half);
      const y2 = Math.min(height - 1, y + half);

      const count = (x2 - x1 + 1) * (y2 - y1 + 1);
      
      const A = integral[y2 * width + x2];
      const B = x1 > 0 ? integral[y2 * width + (x1 - 1)] : 0;
      const C_val = y1 > 0 ? integral[(y1 - 1) * width + x2] : 0;
      const D = (x1 > 0 && y1 > 0) ? integral[(y1 - 1) * width + (x1 - 1)] : 0;
      
      const sum = A - B - C_val + D;
      const mean = sum / count;
      
      out[y * width + x] = gray[y * width + x] < mean - C ? 0 : 255;
    }
  }
  return out;
}

/**
 * Build a new RGBA ImageData where every pixel is either pure white (255) or
 * pure black (0) based on the adaptive threshold of the grayscale image.
 */
function binarise(
  data: Uint8ClampedArray,
  width: number,
  height: number
): ImageData {
  const gray = toGrayscale(data);
  const thresholded = adaptiveThreshold(gray, width, height, 21, 10); // Window 21, C=10

  const out = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < thresholded.length; i++) {
    const v = thresholded[i];
    out[i * 4] = v;
    out[i * 4 + 1] = v;
    out[i * 4 + 2] = v;
    out[i * 4 + 3] = 255;
  }
  return new ImageData(out, width, height);
}

/** Rotate a canvas 90° clockwise and return a new canvas. */
function rotateCanvas90(src: HTMLCanvasElement): HTMLCanvasElement {
  const dst = document.createElement("canvas");
  dst.width = src.height;
  dst.height = src.width;
  const ctx = dst.getContext("2d")!;
  ctx.translate(dst.width, 0);
  ctx.rotate(Math.PI / 2);
  ctx.drawImage(src, 0, 0);
  return dst;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Core transform: decode EXIF orientation → convert to grayscale → Otsu binarise.
 * Returns a pure black/white PNG File ready for ZXing / jsQR.
 */
export async function binarisedPng(file: File, suffix = ""): Promise<File | null> {
  if (typeof createImageBitmap !== "function") return null;
  try {
    const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
    try {
      const { width, height } = bmp;
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
      ctx.drawImage(bmp, 0, 0);
      const raw = ctx.getImageData(0, 0, width, height);
      const bin = binarise(raw.data, width, height);
      ctx.putImageData(bin, 0, 0);
      return await canvasToPngFile(canvas, `binarised${suffix}.png`);
    } finally {
      bmp.close();
    }
  } catch {
    return null;
  }
}

/**
 * Upscale to at least `minShortEdge` px (nearest-neighbour) then binarise.
 * Critical for low-res scans where QR modules are < 3px wide.
 */
export async function upscaleThenBinarise(
  file: File,
  _minShortEdge = 1200 // ignored, forcing 3x
): Promise<File | null> {
  if (typeof createImageBitmap !== "function") return null;
  try {
    const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
    try {
      const factor = 3;
      const w = Math.round(bmp.width * factor);
      const h = Math.round(bmp.height * factor);

      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
      
      // 3x Bicubic Upscale Fallback
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      
      ctx.drawImage(bmp, 0, 0, w, h);

      const raw = ctx.getImageData(0, 0, w, h);
      const bin = binarise(raw.data, w, h);
      ctx.putImageData(bin, 0, 0);
      return await canvasToPngFile(canvas, "upscale-bin.png");
    } finally {
      bmp.close();
    }
  } catch {
    return null;
  }
}

/**
 * Crop the centre 70% (where the QR sits on a held-up card photo) + binarise.
 */
export async function cropAndBinarise(file: File): Promise<File | null> {
  if (typeof createImageBitmap !== "function") return null;
  try {
    const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
    try {
      const cf = 0.70;
      const sx = Math.round(bmp.width * (1 - cf) * 0.5);
      const sy = Math.round(bmp.height * (1 - cf) * 0.5);
      const sw = Math.round(bmp.width * cf);
      const sh = Math.round(bmp.height * cf);

      const canvas = document.createElement("canvas");
      canvas.width = sw;
      canvas.height = sh;
      const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
      ctx.drawImage(bmp, sx, sy, sw, sh, 0, 0, sw, sh);

      const raw = ctx.getImageData(0, 0, sw, sh);
      const bin = binarise(raw.data, sw, sh);
      ctx.putImageData(bin, 0, 0);
      return await canvasToPngFile(canvas, "crop-bin.png");
    } finally {
      bmp.close();
    }
  } catch {
    return null;
  }
}

/**
 * Returns binarised RGBA ImageData + rotated copies (0°,90°,180°,270°) as Files.
 * Rotation handles cards photographed in landscape by accident.
 */
export async function rotatedBinarisedFiles(file: File): Promise<File[]> {
  if (typeof createImageBitmap !== "function") return [];
  const results: File[] = [];
  try {
    const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
    try {
      const { width, height } = bmp;
      const base = document.createElement("canvas");
      base.width = width; base.height = height;
      const ctx = base.getContext("2d", { willReadFrequently: true })!;
      ctx.drawImage(bmp, 0, 0);
      const raw = ctx.getImageData(0, 0, width, height);
      const bin = binarise(raw.data, width, height);
      ctx.putImageData(bin, 0, 0);

      // 0° (already done above)
      results.push(await canvasToPngFile(base, "rot0.png"));

      // 90°, 180°, 270°
      let prev = base;
      for (let r = 1; r <= 3; r++) {
        prev = rotateCanvas90(prev);
        results.push(await canvasToPngFile(prev, `rot${r * 90}.png`));
      }
    } finally {
      bmp.close();
    }
  } catch { /* ignore */ }
  return results;
}

/**
 * Master function: build the full candidate set for the decode retry loop.
 * Order: original → binarised → upscaled+binarised → cropped+binarised → rotations
 */
export async function buildCandidateFiles(file: File): Promise<File[]> {
  const [bin, upscaled, cropped, ...rotated] = await Promise.all([
    binarisedPng(file),
    upscaleThenBinarise(file),
    cropAndBinarise(file),
    rotatedBinarisedFiles(file).then((r) => r),
  ]);

  // rotatedBinarisedFiles returns an array, Promise.all flattens weirdly — fix:
  const rotations = await rotatedBinarisedFiles(file);

  const candidates: File[] = [file];
  if (bin) candidates.push(bin);
  if (upscaled) candidates.push(upscaled);
  if (cropped) candidates.push(cropped);
  candidates.push(...rotations.slice(1)); // skip rot0 (already bin)
  return candidates;
}

/**
 * Extract raw grayscale + binarised ImageData for jsQR (avoids double encode/decode).
 * Returns { imageData, width, height } ready to pass to jsQR().
 */
export async function getJsQrImageData(
  file: File,
  targetShortEdge = 1000
): Promise<{ data: Uint8ClampedArray; width: number; height: number } | null> {
  if (typeof createImageBitmap !== "function") return null;
  try {
    const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
    try {
      const short = Math.min(bmp.width, bmp.height);
      const factor = short < targetShortEdge ? Math.min(4, targetShortEdge / short) : 1;
      const w = Math.round(bmp.width * factor);
      const h = Math.round(bmp.height * factor);

      const canvas = document.createElement("canvas");
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(bmp, 0, 0, w, h);

      const raw = ctx.getImageData(0, 0, w, h);
      // For jsQR we pass RGBA — it handles grayscale internally
      return { data: raw.data, width: w, height: h };
    } finally {
      bmp.close();
    }
  } catch {
    return null;
  }
}
