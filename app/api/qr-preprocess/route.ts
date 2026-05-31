/**
 * Server-side QR pre-processor: uses edge detection on a grid of sub-regions
 * to find the densest dark-module cluster (likely the QR code).
 * Returns a cropped, sharpened, high-contrast version of just the QR zone.
 */
import sharp from "sharp";
import { NextRequest, NextResponse } from "next/server";

async function findQrRegion(buffer: Buffer, width: number, height: number) {
  // Divide image into NxN grid and find the cell with highest variance
  // (QR modules create high local variance between black/white)
  const N = 6; // 6x6 grid
  const cellW = Math.floor(width / N);
  const cellH = Math.floor(height / N);

  if (cellW <= 0 || cellH <= 0 || width <= 0 || height <= 0) {
    throw new Error(`Invalid dimensions: width=${width}, height=${height}, cellW=${cellW}, cellH=${cellH}`);
  }

  let bestScore = 0;
  let bestRegion = { left: 0, top: 0, width, height }; // fallback = full image

  const raw = await sharp(buffer)
    .resize(width, height)
    .grayscale()
    .raw()
    .toBuffer();

  if (raw.length !== width * height) {
    console.warn(`[findQrRegion] raw buffer size mismatch: expected ${width * height}, got ${raw.length}`);
    return bestRegion; // return fallback
  }

  for (let gy = 0; gy < N; gy++) {
    for (let gx = 0; gx < N; gx++) {
      const x0 = gx * cellW;
      const y0 = gy * cellH;
      let sum = 0, sumSq = 0, count = 0;

      for (let py = y0; py < y0 + cellH && py < height; py++) {
        for (let px = x0; px < x0 + cellW && px < width; px++) {
          const idx = py * width + px;
          if (idx < raw.length) {
            const val = raw[idx];
            sum += val;
            sumSq += val * val;
            count++;
          }
        }
      }

      if (count === 0) continue;
      const mean = sum / count;
      const variance = sumSq / count - mean * mean;
      if (variance > bestScore) {
        bestScore = variance;
        // Expand region 10% to avoid clipping finder patterns
        const pad = 0.1;
        const expandedLeft = Math.max(0, Math.floor(x0 - cellW * pad));
        const expandedTop = Math.max(0, Math.floor(y0 - cellH * pad));
        const expandedRight = Math.min(width, Math.ceil(x0 + cellW * (1 + pad)));
        const expandedBottom = Math.min(height, Math.ceil(y0 + cellH * (1 + pad)));
        bestRegion = {
          left: expandedLeft,
          top: expandedTop,
          width: expandedRight - expandedLeft,
          height: expandedBottom - expandedTop,
        };
      }
    }
  }
  return bestRegion;
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("image") as File;
    if (!file) return NextResponse.json({ error: "No image" }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    let meta: any;
    try {
      meta = await sharp(buffer).metadata();
    } catch (metaErr) {
      console.error("[qr-preprocess] sharp.metadata() failed", metaErr);
      meta = {};
    }
    const W = meta?.width ?? 1024;
    const H = meta?.height ?? 1024;

    // Step 1: Find the QR region via variance grid (with fallback)
    let region = { left: 0, top: 0, width: W, height: H }; // fallback = full image
    try {
      region = await findQrRegion(buffer, W, H);
    } catch (regionErr) {
      console.error("[qr-preprocess] findQrRegion() failed, using full image", regionErr);
      // Already have fallback region, continue
    }

    // Step 2: Crop, upscale 4x, sharpen, high contrast
    try {
      const processed = await sharp(buffer)
        .extract({ left: region.left, top: region.top, width: region.width, height: region.height })
        .resize(Math.min(region.width * 4, 2400), undefined, { kernel: "lanczos3" })
        .sharpen({ sigma: 1.2, m1: 2, m2: 8 })
        .linear(1.8, -(0.8 * 128)) // strong contrast boost
        .grayscale()
        .normalize()
        .png()
        .toBuffer();

      return new NextResponse(processed as any, {
        headers: { "Content-Type": "image/png", "X-Region": JSON.stringify(region) },
      });
    } catch (processErr) {
      console.error("[qr-preprocess] processing failed", processErr);
      // Fallback: return original image as PNG
      const fallback = await sharp(buffer).png().toBuffer();
      return new NextResponse(fallback as any, {
        headers: { "Content-Type": "image/png" },
      });
    }
  } catch (err: any) {
    console.error("[qr-preprocess] unhandled error", err);
    return NextResponse.json({ error: err.message || "Processing failed" }, { status: 500 });
  }
}
