"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import jsQR from "jsqr";
import { buildCandidateFiles, adaptiveThreshold } from "@/lib/image-preprocess";

type Props = {
  onDecodedText: (text: string, sourceFile?: File) => void;
  onError?: (message: string) => void;
  onCodeRead?: (rawText: string) => void;
};

/**
 * Disable Chrome's native BarcodeDetector — it cannot read dense Fayda QRs.
 * Force the ZXing engine inside html5-qrcode instead.
 */
const SCANNER_CONFIG = {
  verbose: false as const,
  useBarCodeDetectorIfSupported: false,
};

// ─── jsQR helpers (primary engine for uploaded files) ────────────────────────

/**
 * Server-side pre-process: calls /api/qr-preprocess which uses sharp (Lanczos3 resize,
 * linear contrast boost, variance-based QR region detection). Returns the enhanced
 * image as a File ready for jsQR, or null if the API fails.
 */
async function serverPreprocess(file: File): Promise<File | null> {
  try {
    const form = new FormData();
    form.append("image", file);
    const res = await fetch("/api/qr-preprocess", { method: "POST", body: form });
    if (!res.ok) return null;
    const blob = await res.blob();
    return new File([blob], "server-enhanced.png", { type: "image/png" });
  } catch {
    return null;
  }
}

/**
 * Try jsQR with multiple upscale + rotation attempts on raw image data.
 * jsQR handles dense QR modules better than ZXing for file scans.
 */
async function tryJsQrOnFile(file: File): Promise<string | null> {
  if (typeof createImageBitmap !== "function") return null;

  // Try at multiple scale targets: 1000px, 1600px, 2400px short edge
  const scales = [1000, 1600, 2400];
  const rotations = [0, 90, 180, 270];

  for (const shortEdge of scales) {
    try {
      const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
      const factor = Math.min(4, shortEdge / Math.min(bmp.width, bmp.height));
      const w = Math.round(bmp.width * factor);
      const h = Math.round(bmp.height * factor);

      const baseCanvas = document.createElement("canvas");
      baseCanvas.width = w; baseCanvas.height = h;
      const baseCtx = baseCanvas.getContext("2d", { willReadFrequently: true })!;
      baseCtx.imageSmoothingEnabled = false;
      baseCtx.drawImage(bmp, 0, 0, w, h);
      bmp.close();

      for (const deg of rotations) {
        let canvas = baseCanvas;
        if (deg !== 0) {
          // Rotate
          const rot = document.createElement("canvas");
          const swap = deg === 90 || deg === 270;
          rot.width = swap ? h : w;
          rot.height = swap ? w : h;
          const rCtx = rot.getContext("2d", { willReadFrequently: true })!;
          rCtx.translate(rot.width / 2, rot.height / 2);
          rCtx.rotate((deg * Math.PI) / 180);
          rCtx.drawImage(canvas, -w / 2, -h / 2);
          canvas = rot;
        }

        const cw = canvas.width, ch = canvas.height;
        const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
        const crops = [
          { x: 0, y: 0, w: cw, h: ch }, // full
          { x: 0, y: 0, w: Math.floor(cw / 2), h: Math.floor(ch / 2) }, // TL
          { x: Math.floor(cw / 2), y: 0, w: Math.floor(cw / 2), h: Math.floor(ch / 2) }, // TR
          { x: 0, y: Math.floor(ch / 2), w: Math.floor(cw / 2), h: Math.floor(ch / 2) }, // BL
          { x: Math.floor(cw / 2), y: Math.floor(ch / 2), w: Math.floor(cw / 2), h: Math.floor(ch / 2) }, // BR
          { x: Math.floor(cw * 0.15), y: Math.floor(ch * 0.15), w: Math.floor(cw * 0.7), h: Math.floor(ch * 0.7) }, // Center
        ];

        for (const crop of crops) {
          const imgData = ctx.getImageData(crop.x, crop.y, crop.w, crop.h);

          // Attempt 1: normal
          let res = jsQR(imgData.data, crop.w, crop.h, { inversionAttempts: "attemptBoth" });
          if (res?.data) return res.data;

          // Attempt 2: adaptive binarisation then jsQR
          const grayData = new Uint8ClampedArray(imgData.data.length / 4);
          for (let i = 0; i < grayData.length; i++) {
            grayData[i] = Math.round(
              0.299 * imgData.data[i * 4] +
              0.587 * imgData.data[i * 4 + 1] +
              0.114 * imgData.data[i * 4 + 2]
            );
          }
          const binGray = adaptiveThreshold(grayData, crop.w, crop.h, 21, 10);

          const binRgba = new Uint8ClampedArray(crop.w * crop.h * 4);
          for (let i = 0; i < grayData.length; i++) {
            const v = binGray[i];
            binRgba[i * 4] = binRgba[i * 4 + 1] = binRgba[i * 4 + 2] = v;
            binRgba[i * 4 + 3] = 255;
          }
          res = jsQR(binRgba, crop.w, crop.h, { inversionAttempts: "attemptBoth" });
          if (res?.data) return res.data;
        }
      }
    } catch { /* try next scale */ }
  }
  return null;
}

// ─── ZXing helpers (secondary engine, good for 1D barcodes) ──────────────────

async function canvasToPngFile(canvas: HTMLCanvasElement, name: string): Promise<File> {
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), "image/png");
  });
  return new File([blob], name, { type: "image/png" });
}

async function tryScanFile(regionId: string, file: File): Promise<string> {
  const scanner = new Html5Qrcode(regionId, SCANNER_CONFIG);
  try {
    return await scanner.scanFile(file, false);
  } finally {
    try { scanner.clear(); } catch { /* ignore */ }
  }
}

/**
 * Full decode pipeline for uploaded files:
 *  Round 1 — jsQR with inline Otsu binarisation at 3 scales × 4 rotations (12 attempts)
 *  Round 2 — preprocessed candidate files through ZXing (handles 1D barcodes)
 *  Round 3 — ZXing on original file
 */
async function decodeUploadWithRetries(regionId: string, file: File): Promise<string> {
  // Round 0: server-side sharp enhancement (region detect + 4x Lanczos + contrast)
  const enhanced = await serverPreprocess(file);
  if (enhanced) {
    const enhancedResult = await tryJsQrOnFile(enhanced);
    if (enhancedResult) return enhancedResult;
  }

  // Round 1: jsQR — most reliable for dense 2D QRs
  const jsQrResult = await tryJsQrOnFile(file);
  if (jsQrResult) return jsQrResult;

  // Round 2: ZXing on preprocessed Otsu-binarised variants + originals
  const candidates = await buildCandidateFiles(file);
  let lastErr: unknown = null;
  for (const f of candidates) {
    try {
      const text = await tryScanFile(regionId, f);
      if (text) return text;
    } catch (e) {
      lastErr = e;
    }
  }

  // Round 3: ZXing on raw original (last resort)
  try {
    const text = await tryScanFile(regionId, file);
    if (text) return text;
  } catch (e) {
    lastErr = e;
  }

  const hint = lastErr instanceof Error ? lastErr.message : "Could not detect a QR or barcode.";
  throw new Error(
    `${hint} — The scanner tried 12+ image variants (Adaptive Thresholding, 3x Bicubic Upscale, rotated ×4). Tips: ` +
    `photograph only the QR in bright, even light; avoid glare; export as PNG; hold the camera steady.`
  );
}

function friendlyCameraMessage(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  const lower = msg.toLowerCase();
  if (lower.includes("permission") || lower.includes("denied") || lower.includes("notallowed"))
    return "Camera access was blocked. Use Upload photo, or allow the camera in your browser settings.";
  if (lower.includes("notfound") || lower.includes("no device") || lower.includes("devices not found"))
    return "No camera found (common on desktop). Use Upload photo with an image of your QR or barcode.";
  if (lower.includes("in use") || lower.includes("busy"))
    return "Camera is in use by another app. Close it or use Upload photo.";
  return "Could not start the camera. Use Upload photo instead.";
}

// ─── Component ────────────────────────────────────────────────────────────────

export function FaydaQrScanner({ onDecodedText, onError, onCodeRead }: Props) {
  const regionId = useRef(`qr-reader-${Math.random().toString(16).slice(2)}`);
  const qrRef = useRef<Html5Qrcode | null>(null);
  const lastEmitRef = useRef<{ text: string; at: number } | null>(null);
  const [cameraPhase, setCameraPhase] = useState<"idle" | "starting" | "live" | "failed">("idle");
  const [cameraHint, setCameraHint] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [busyStage, setBusyStage] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
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

  useEffect(() => { return () => { void stopCamera(); }; }, [stopCamera]);

  const handlePickFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || busy) return;

    lastFileRef.current = file;
    setBusy(true);
    setBusyStage("Binarising + multi-scale decode (jsQR)…");
    setCameraHint(null);
    try {
      await stopCamera();
      setCameraPhase("idle");
      const text = await decodeUploadWithRetries(regionId.current, file);
      setBusyStage("");
      emitDecoded(text);
    } catch (err: unknown) {
      setBusyStage("");
      onError?.(
        err instanceof Error
          ? err.message
          : "Could not read that image. Try a sharper, well-lit photo of just the QR code."
      );
    } finally {
      setBusy(false);
    }
  };

  const previewMuted = cameraPhase !== "live";

  return (
    <div className="space-y-3">
      <div className="text-sm text-slate-600">
        <strong>Upload</strong> a clear photo of the <strong>QR on the back</strong> or the{" "}
        <strong>barcode on the front</strong>. The scanner applies Adaptive Thresholding + 12 image variants
        automatically. Optionally use <strong>Use camera</strong> on a phone.
      </div>
      <div className="flex flex-wrap gap-2">
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePickFile} />
        <button
          type="button"
          disabled={busy}
          onClick={() => fileInputRef.current?.click()}
          className="text-xs font-medium px-3 py-1.5 rounded-lg bg-blue-600 text-white border border-blue-700 hover:bg-blue-700 disabled:opacity-50"
        >
          {busy ? "Processing…" : "Upload photo of QR / barcode"}
        </button>
        <button
          type="button"
          disabled={busy || cameraPhase === "starting"}
          onClick={handleUseCamera}
          className="text-xs font-medium px-3 py-1.5 rounded-lg bg-slate-100 border border-slate-200 hover:bg-slate-200 disabled:opacity-50"
        >
          {cameraPhase === "starting" ? "Starting camera…" : cameraPhase === "live" ? "Camera running" : "Use camera"}
        </button>
      </div>

      {busy && (
        <div className="flex items-center gap-2 text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
          <svg className="animate-spin h-3.5 w-3.5 shrink-0 text-blue-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          {busyStage || "Processing…"}
        </div>
      )}

      {cameraHint && (
        <div className="text-xs rounded-lg border border-amber-200 bg-amber-50 text-amber-900 px-3 py-2">{cameraHint}</div>
      )}

      <div
        id={regionId.current}
        className={`w-full rounded-xl overflow-hidden border bg-black transition-opacity ${previewMuted ? "opacity-40 border-slate-300" : "border-slate-200"}`}
        style={{ minHeight: cameraPhase === "live" ? 300 : 160 }}
      />

      {cameraPhase === "idle" && !busy && (
        <div className="text-xs text-slate-500">
          Camera is off. For uploads: photograph <strong>only the QR</strong> in bright, even light — the scanner
          runs Adaptive Thresholding at 3 resolutions × 4 rotations (12 attempts). JPEG/PNG;
          export as PNG if HEIC fails.
        </div>
      )}
    </div>
  );
}
