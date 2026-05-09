"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import jsQR from "jsqr";
import { buildCandidateFiles } from "@/lib/image-preprocess";

type Props = {
  onDecodedText: (text: string, sourceFile?: File) => void;
  onError?: (message: string) => void;
  /** Fires as soon as the library detects a payload (before parent parsing/verify). */
  onCodeRead?: (rawText: string) => void;
};

/**
 * Force ZXing — Chrome's native BarcodeDetector cannot read dense Fayda QRs.
 * useBarCodeDetectorIfSupported: false is the single most important setting.
 */
const SCANNER_CONFIG = {
  verbose: false as const,
  useBarCodeDetectorIfSupported: false,
};

async function canvasToPngFile(canvas: HTMLCanvasElement, name: string): Promise<File> {
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Could not encode image"))), "image/png");
  });
  return new File([blob], name, { type: "image/png" });
}

/** Apply EXIF orientation so phone photos decode right-way-up. */
async function normalizeExifToPngFile(file: File): Promise<File | null> {
  if (typeof createImageBitmap !== "function") return null;
  try {
    const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
    try {
      const canvas = document.createElement("canvas");
      canvas.width = bmp.width;
      canvas.height = bmp.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;
      ctx.drawImage(bmp, 0, 0);
      return await canvasToPngFile(canvas, "oriented.png");
    } finally {
      bmp.close();
    }
  } catch {
    return null;
  }
}

async function tryScanFile(regionId: string, file: File): Promise<string> {
  const scanner = new Html5Qrcode(regionId, SCANNER_CONFIG);
  try {
    return await scanner.scanFile(file, false);
  } finally {
    try { scanner.clear(); } catch { /* ignore */ }
  }
}

async function tryJsQrFromFile(file: File): Promise<string | null> {
  if (typeof createImageBitmap !== "function") return null;
  try {
    const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
    try {
      const run = (w: number, h: number, drawFn: (c: HTMLCanvasElement) => void) => {
        const c = document.createElement("canvas");
        c.width = w; c.height = h;
        drawFn(c);
        const ctx = c.getContext("2d", { willReadFrequently: true });
        if (!ctx) return null;
        const im = ctx.getImageData(0, 0, w, h);
        return jsQR(im.data, w, h, { inversionAttempts: "attemptBoth" });
      };

      // Try original size
      let res = run(bmp.width, bmp.height, (c) => {
        c.getContext("2d")!.drawImage(bmp, 0, 0);
      });
      if (res?.data) return res.data;

      // Try 3× upscale if small
      const short = Math.min(bmp.width, bmp.height);
      if (short < 900) {
        const f = Math.min(3, 900 / short);
        const w = Math.round(bmp.width * f), h = Math.round(bmp.height * f);
        res = run(w, h, (c) => {
          const ctx = c.getContext("2d", { willReadFrequently: true })!;
          ctx.imageSmoothingEnabled = false;
          ctx.drawImage(bmp, 0, 0, w, h);
        });
        if (res?.data) return res.data;
      }
      return null;
    } finally {
      bmp.close();
    }
  } catch {
    return null;
  }
}

/**
 * Full retry pipeline:
 * 1. Build contrast-enhanced + upscaled + cropped variants via image-preprocess
 * 2. Try each with ZXing (Html5Qrcode)
 * 3. Fallback: try each with jsQR
 */
async function decodeUploadWithRetries(regionId: string, file: File): Promise<string> {
  // Build candidate set: original + contrast-enhanced + EXIF-oriented + upscaled
  const preprocessed = await buildCandidateFiles(file);
  const oriented = await normalizeExifToPngFile(file);

  const candidates: File[] = [...preprocessed];
  if (oriented && !candidates.some((f) => f.size === oriented.size)) {
    candidates.push(oriented);
  }

  const seen = new Set<string>();
  let lastErr: unknown = null;

  // Round 1: ZXing (html5-qrcode with ZXing engine forced on)
  for (let i = 0; i < candidates.length; i++) {
    const f = candidates[i];
    const key = `${i}|${f.size}`;
    if (seen.has(key)) continue;
    seen.add(key);
    try {
      const text = await tryScanFile(regionId, f);
      if (text) return text;
    } catch (e) {
      lastErr = e;
    }
  }

  // Round 2: jsQR fallback on same candidates
  for (const f of candidates) {
    const j = await tryJsQrFromFile(f);
    if (j) return j;
  }

  const hint =
    lastErr instanceof Error
      ? lastErr.message
      : "No MultiFormat Readers were able to detect the code.";
  throw new Error(
    `${hint} Tips: use a straight-on photo in bright light, include the entire QR or barcode, avoid glare, and try exporting as PNG.`
  );
}

function friendlyCameraMessage(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  const lower = msg.toLowerCase();
  if (lower.includes("permission") || lower.includes("denied") || lower.includes("notallowed")) {
    return "Camera access was blocked. Use Upload photo, or allow the camera in your browser settings.";
  }
  if (lower.includes("notfound") || lower.includes("no device") || lower.includes("devices not found")) {
    return "No camera found (common on desktop). Use Upload photo with an image of your QR or barcode.";
  }
  if (lower.includes("in use") || lower.includes("busy")) {
    return "Camera is in use by another app. Close it or use Upload photo.";
  }
  return "Could not start the camera. Use Upload photo instead.";
}

export function FaydaQrScanner({ onDecodedText, onError, onCodeRead }: Props) {
  const regionId = useRef(`qr-reader-${Math.random().toString(16).slice(2)}`);
  const qrRef = useRef<Html5Qrcode | null>(null);
  const lastEmitRef = useRef<{ text: string; at: number } | null>(null);
  const [cameraPhase, setCameraPhase] = useState<"idle" | "starting" | "live" | "failed">("idle");
  const [cameraHint, setCameraHint] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Keep a ref to the last uploaded File so the parent can run OCR on it
  const lastFileRef = useRef<File | null>(null);

  const emitDecoded = useCallback(
    (text: string) => {
      const now = Date.now();
      const prev = lastEmitRef.current;
      if (prev && prev.text === text && now - prev.at < 1200) return;
      lastEmitRef.current = { text, at: now };
      onCodeRead?.(text);
      onDecodedText(text, lastFileRef.current ?? undefined);
    },
    [onDecodedText, onCodeRead]
  );

  const stopCamera = useCallback(async () => {
    const qr = qrRef.current;
    qrRef.current = null;
    if (!qr) return;
    try { await qr.stop(); } catch { /* ignore */ }
    try { qr.clear(); } catch { /* ignore */ }
  }, []);

  const startCamera = useCallback(async () => {
    await stopCamera();
    const qr = new Html5Qrcode(regionId.current, SCANNER_CONFIG);
    qrRef.current = qr;
    await qr.start(
      { facingMode: "environment" },
      { fps: 12, aspectRatio: 1.333334 },
      (decodedText: string) => { emitDecoded(decodedText); },
      () => {}
    );
  }, [emitDecoded, stopCamera]);

  const handleUseCamera = async () => {
    setCameraHint(null);
    setCameraPhase("starting");
    try {
      await startCamera();
      setCameraPhase("live");
    } catch (e: unknown) {
      setCameraPhase("failed");
      setCameraHint(friendlyCameraMessage(e));
    }
  };

  useEffect(() => {
    return () => { void stopCamera(); };
  }, [stopCamera]);

  const handlePickFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || busy) return;

    lastFileRef.current = file;
    setBusy(true);
    setCameraHint(null);
    try {
      await stopCamera();
      setCameraPhase("idle");
      const text = await decodeUploadWithRetries(regionId.current, file);
      emitDecoded(text);
    } catch (err: unknown) {
      onError?.(
        err instanceof Error
          ? err.message
          : "Could not read that image. Try a sharper, well-lit photo of the full QR or barcode."
      );
    } finally {
      setBusy(false);
    }
  };

  const previewMuted = cameraPhase !== "live";

  return (
    <div className="space-y-3">
      <div className="text-sm text-slate-600">
        <strong>Upload</strong> a clear photo or screenshot of the{" "}
        <strong>QR on the back</strong> or the <strong>barcode on the front</strong> (FCN). On a
        desktop without a camera, upload is the primary way to verify. Optionally use{" "}
        <strong>Use camera</strong> on a phone or laptop with a webcam.
      </div>
      <div className="flex flex-wrap gap-2">
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePickFile} />
        <button
          type="button"
          disabled={busy}
          onClick={() => fileInputRef.current?.click()}
          className="text-xs font-medium px-3 py-1.5 rounded-lg bg-blue-600 text-white border border-blue-700 hover:bg-blue-700 disabled:opacity-50"
        >
          {busy ? "Processing image…" : "Upload photo of QR / barcode"}
        </button>
        <button
          type="button"
          disabled={busy || cameraPhase === "starting"}
          onClick={handleUseCamera}
          className="text-xs font-medium px-3 py-1.5 rounded-lg bg-slate-100 border border-slate-200 hover:bg-slate-200 disabled:opacity-50"
        >
          {cameraPhase === "starting"
            ? "Starting camera…"
            : cameraPhase === "live"
            ? "Camera running (tap to restart)"
            : "Use camera"}
        </button>
      </div>
      {busy && (
        <div className="flex items-center gap-2 text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
          <svg className="animate-spin h-3.5 w-3.5 text-blue-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          Applying contrast enhancement + multi-engine decode…
        </div>
      )}
      {cameraHint && (
        <div className="text-xs rounded-lg border border-amber-200 bg-amber-50 text-amber-900 px-3 py-2">{cameraHint}</div>
      )}
      <div
        id={regionId.current}
        className={`w-full rounded-xl overflow-hidden border bg-black transition-opacity ${
          previewMuted ? "opacity-40 border-slate-300" : "border-slate-200"
        }`}
        style={{ minHeight: cameraPhase === "live" ? 300 : 160 }}
      />
      {cameraPhase === "idle" && !busy && (
        <div className="text-xs text-slate-500">
          Camera is off. For uploads, use a <strong>high-resolution</strong> image with the code filling most of the
          frame — the scanner automatically applies contrast enhancement and retries with multiple engines. JPEG/PNG
          preferred; export as PNG if HEIC fails.
        </div>
      )}
    </div>
  );
}
