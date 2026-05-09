"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";

type Props = {
  onDecodedText: (text: string) => void;
  onError?: (message: string) => void;
  /** Fires as soon as the library decodes a payload (before parent parsing / verify). */
  onCodeRead?: (rawText: string) => void;
};

type Html5QrcodeCtor = new (elementId: string, config?: boolean | { verbose?: boolean }) => {
  start: (
    cameraIdOrConfig: MediaTrackConstraints | string,
    configuration: Record<string, unknown>,
    success: (decodedText: string) => void,
    error: () => void
  ) => Promise<void>;
  stop: () => Promise<void>;
  clear: () => void;
  scanFile: (file: File, showImage: boolean) => Promise<string>;
};

declare global {
  // eslint-disable-next-line no-var
  var Html5Qrcode: Html5QrcodeCtor | undefined;
}

const HTML5_QRCODE_SRC = "https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js";

async function loadHtml5Qrcode(onError?: (message: string) => void): Promise<Html5QrcodeCtor | null> {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { Html5Qrcode?: Html5QrcodeCtor };
  if (w.Html5Qrcode) {
    return w.Html5Qrcode;
  }

  await new Promise<void>((resolve, reject) => {
    const existing = document.querySelector(`script[data-html5-qrcode="true"]`) as HTMLScriptElement | null;
    if (existing) {
      if ((window as unknown as { Html5Qrcode?: Html5QrcodeCtor }).Html5Qrcode) {
        resolve();
        return;
      }
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Failed to load scanner library.")), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = HTML5_QRCODE_SRC;
    script.async = true;
    script.defer = true;
    script.dataset.html5Qrcode = "true";
    script.crossOrigin = "anonymous";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load scanner library."));
    document.head.appendChild(script);
  }).catch((e: unknown) => {
    onError?.(e instanceof Error ? e.message : "Failed to load scanner library.");
  });

  return (window as unknown as { Html5Qrcode?: Html5QrcodeCtor }).Html5Qrcode ?? null;
}

export function FaydaQrScanner({ onDecodedText, onError, onCodeRead }: Props) {
  const regionId = useRef(`qr-reader-${Math.random().toString(16).slice(2)}`);
  const qrRef = useRef<{ stop: () => Promise<void>; clear: () => void; scanFile: (f: File, show: boolean) => Promise<string> } | null>(null);
  const lastEmitRef = useRef<{ text: string; at: number } | null>(null);
  const [started, setStarted] = useState(false);
  const [busy, setBusy] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const emitDecoded = useCallback(
    (text: string) => {
      const now = Date.now();
      const prev = lastEmitRef.current;
      if (prev && prev.text === text && now - prev.at < 1200) return;
      lastEmitRef.current = { text, at: now };
      onCodeRead?.(text);
      onDecodedText(text);
    },
    [onDecodedText, onCodeRead]
  );

  const startCamera = useCallback(async () => {
    const Html5Qrcode = await loadHtml5Qrcode(onError);
    if (!Html5Qrcode) throw new Error("Scanner library not available.");

    const qr = new Html5Qrcode(regionId.current, { verbose: false });
    qrRef.current = qr;

    // Full-frame scan (no qrbox) — best for dense Fayda QR and 1D barcodes.
    await qr.start(
      { facingMode: "environment" },
      {
        fps: 12,
        aspectRatio: 1.333334,
      },
      (decodedText: string) => {
        emitDecoded(decodedText);
      },
      () => {}
    );
  }, [emitDecoded, onError]);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        await startCamera();
        if (!cancelled) setStarted(true);
      } catch (e: unknown) {
        onError?.(e instanceof Error ? e.message : "Unable to start camera. Allow permission and retry.");
      }
    };

    run();

    return () => {
      cancelled = true;
      const qr = qrRef.current;
      qrRef.current = null;
      if (qr) {
        Promise.resolve()
          .then(() => qr.stop())
          .catch(() => {})
          .finally(() => {
            try {
              qr.clear();
            } catch {
              /* ignore */
            }
          });
      }
    };
  }, [onError, startCamera]);

  const handlePickFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || busy) return;

    setBusy(true);
    try {
      const Html5Qrcode = await loadHtml5Qrcode(onError);
      if (!Html5Qrcode) throw new Error("Scanner library not available.");

      if (qrRef.current) {
        try {
          await qrRef.current.stop();
        } catch {
          /* ignore */
        }
        try {
          qrRef.current.clear();
        } catch {
          /* ignore */
        }
        qrRef.current = null;
      }

      const oneShot = new Html5Qrcode(regionId.current, { verbose: false });
      const text = await oneShot.scanFile(file, false);
      oneShot.clear();
      emitDecoded(text);

      const live = new Html5Qrcode(regionId.current, { verbose: false });
      qrRef.current = live;
      await live.start(
        { facingMode: "environment" },
        { fps: 12, aspectRatio: 1.333334 },
        (decodedText: string) => emitDecoded(decodedText),
        () => {}
      );
    } catch (err: unknown) {
      onError?.(err instanceof Error ? err.message : "Could not read that image. Try another photo.");
      try {
        await startCamera();
      } catch {
        /* ignore */
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="text-sm text-slate-600">
        Scan the <strong>QR on the back</strong> (hold steady, good light) or the <strong>barcode on the front</strong> (FCN). If the camera struggles, use{" "}
        <strong>Upload photo</strong>.
      </div>
      <div className="flex flex-wrap gap-2">
        <input ref={fileInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePickFile} />
        <button
          type="button"
          disabled={busy}
          onClick={() => fileInputRef.current?.click()}
          className="text-xs font-medium px-3 py-1.5 rounded-lg bg-slate-100 border border-slate-200 hover:bg-slate-200 disabled:opacity-50"
        >
          {busy ? "Reading…" : "Upload photo of QR / barcode"}
        </button>
      </div>
      <div
        id={regionId.current}
        className="w-full rounded-xl overflow-hidden border border-slate-200 bg-black"
        style={{ minHeight: 300 }}
      />
      {!started && (
        <div className="text-xs text-slate-500">Starting camera… If prompted, allow camera access.</div>
      )}
    </div>
  );
}
