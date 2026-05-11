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

  let bestScore = 0;
  let bestRegion = { left: 0, top: 0, width, height }; // fallback = full image

  const raw = await sharp(buffer)
    .resize(width, height)
    .grayscale()
    .raw()
    .toBuffer();

  for (let gy = 0; gy < N; gy++) {
    for (let gx = 0; gx < N; gx++) {
      const x0 = gx * cellW;
      const y0 = gy * cellH;
      let sum = 0, sumSq = 0, count = 0;

      for (let py = y0; py < y0 + cellH; py++) {
        for (let px = x0; px < x0 + cellW; px++) {
          const val = raw[py * width + px];
          sum += val;
          sumSq += val * val;
          count++;
        }
      }
      const mean = sum / count;
      const variance = sumSq / count - mean * mean;
      if (variance > bestScore) {
        bestScore = variance;
        // Expand region 10% to avoid clipping finder patterns
        const pad = 0.1;
        bestRegion = {
          left: Math.max(0, Math.floor(x0 - cellW * pad)),
          top: Math.max(0, Math.floor(y0 - cellH * pad)),
          width: Math.min(width - x0, Math.floor(cellW * (1 + 2 * pad))),
          height: Math.min(height - y0, Math.floor(cellH * (1 + 2 * pad))),
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
    const meta = await sharp(buffer).metadata();
    const W = meta.width ?? 1024;
    const H = meta.height ?? 1024;

    // Step 1: Find the QR region via variance grid
    const region = await findQrRegion(buffer, W, H);

    // Step 2: Crop, upscale 4x, sharpen, high contrast
    const processed = await sharp(buffer)
      .extract(region)
      .resize(Math.min(region.width * 4, 2400), undefined, { kernel: "lanczos3" })
      .sharpen({ sigma: 1.2, m1: 2, m2: 8 })
      .linear(1.8, -(0.8 * 128)) // strong contrast boost
      .grayscale()
      .normalize()
      .png()
      .toBuffer();

    return new NextResponse(processed, {
      headers: { "Content-Type": "image/png", "X-Region": JSON.stringify(region) },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
