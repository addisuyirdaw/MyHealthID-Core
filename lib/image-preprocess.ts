/**
 * image-preprocess.ts
 *
 * Applies canvas-based transformations to improve QR/barcode decodeability on
 * dense Fayda National ID cards. Dense QR modules on busy backgrounds confuse
 * ZXing — boosting contrast and stripping colour fixes the "No MultiFormat
 * Readers were able to detect the code" failure.
 */

async function canvasToPngFile(canvas: HTMLCanvasElement, name: string): Promise<File> {
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Could not encode image"))),
      "image/png"
    );
  });
  return new File([blob], name, { type: "image/png" });
}

/**
 * Applies contrast(160%) + brightness(110%) + grayscale(100%) to the image.
 * This is the single most effective fix for dense QRs on coloured card stock.
 */
export async function contrastEnhanced(file: File): Promise<File | null> {
  if (typeof createImageBitmap !== "function") return null;
  try {
    const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
    try {
      const canvas = document.createElement("canvas");
      canvas.width = bmp.width;
      canvas.height = bmp.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;

      // Apply CSS-style filter via canvas — dramatically sharpens QR module edges
      ctx.filter = "contrast(160%) brightness(110%) grayscale(100%)";
      ctx.drawImage(bmp, 0, 0);
      ctx.filter = "none";

      return await canvasToPngFile(canvas, "contrast-enhanced.png");
    } finally {
      bmp.close();
    }
  } catch {
    return null;
  }
}

/**
 * Upscales the image if either dimension is below `minShortEdge`, then applies
 * contrast enhancement. Handles tiny thumbnails / compressed camera shots.
 */
export async function upscaleAndEnhance(
  file: File,
  minShortEdge = 960
): Promise<File | null> {
  if (typeof createImageBitmap !== "function") return null;
  try {
    const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
    try {
      const short = Math.min(bmp.width, bmp.height);
      const factor = short < minShortEdge ? Math.min(3, minShortEdge / short) : 1;

      const w = Math.round(bmp.width * factor);
      const h = Math.round(bmp.height * factor);

      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;

      ctx.imageSmoothingEnabled = false; // nearest-neighbour keeps module edges sharp
      ctx.filter = "contrast(160%) brightness(110%) grayscale(100%)";
      ctx.drawImage(bmp, 0, 0, w, h);
      ctx.filter = "none";

      return await canvasToPngFile(canvas, "upscale-enhanced.png");
    } finally {
      bmp.close();
    }
  } catch {
    return null;
  }
}

/**
 * Crops the centre 70% of the image (where the QR typically lives on a held-up
 * card photo) and enhances contrast. Reduces noise from card borders/fingers.
 */
export async function cropCentreAndEnhance(file: File): Promise<File | null> {
  if (typeof createImageBitmap !== "function") return null;
  try {
    const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
    try {
      const cropFactor = 0.72;
      const sx = Math.round(bmp.width * (1 - cropFactor) * 0.5);
      const sy = Math.round(bmp.height * (1 - cropFactor) * 0.5);
      const sw = Math.round(bmp.width * cropFactor);
      const sh = Math.round(bmp.height * cropFactor);

      const canvas = document.createElement("canvas");
      canvas.width = sw;
      canvas.height = sh;
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;

      ctx.filter = "contrast(160%) brightness(110%) grayscale(100%)";
      ctx.drawImage(bmp, sx, sy, sw, sh, 0, 0, sw, sh);
      ctx.filter = "none";

      return await canvasToPngFile(canvas, "crop-enhanced.png");
    } finally {
      bmp.close();
    }
  } catch {
    return null;
  }
}

/**
 * Master function — builds a prioritised candidate list for the decode retry loop.
 * Returns [ original, contrastEnhanced, upscaleEnhanced, cropEnhanced ] (nulls filtered).
 */
export async function buildCandidateFiles(file: File): Promise<File[]> {
  const [enhanced, upscaled, cropped] = await Promise.all([
    contrastEnhanced(file),
    upscaleAndEnhance(file),
    cropCentreAndEnhance(file),
  ]);

  const candidates: File[] = [file];
  if (enhanced) candidates.push(enhanced);
  if (upscaled) candidates.push(upscaled);
  if (cropped) candidates.push(cropped);
  return candidates;
}
