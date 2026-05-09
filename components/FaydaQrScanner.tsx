"use client";

import React, { useEffect, useRef, useState } from "react";

type Props = {
  onDecodedText: (text: string) => void;
  onError?: (message: string) => void;
};

declare global {
  // html5-qrcode exposes UMD globals when loaded via script tag.
  // eslint-disable-next-line no-var
  var Html5Qrcode: any;
}

async function loadHtml5Qrcode(onError?: (message: string) => void) {
  if (typeof window === "undefined") return null;
  if ((window as any).Html5Qrcode) return (window as any).Html5Qrcode;

  // Load UMD bundle from CDN to avoid Next chunking issues.
  // (This is also friendlier for mobile Safari.)
  const src = "https://unpkg.com/html5-qrcode";

  await new Promise<void>((resolve, reject) => {
    const existing = document.querySelector(`script[data-html5-qrcode="true"]`) as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Failed to load scanner library.")), { once: true });
      // If it already loaded earlier, resolve immediately.
      if ((window as any).Html5Qrcode) resolve();
      return;
    }

    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.defer = true;
    script.dataset.html5Qrcode = "true";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load scanner library."));
    document.head.appendChild(script);
  }).catch((e: any) => {
    onError?.(e?.message || "Failed to load scanner library.");
    return;
  });

  return (window as any).Html5Qrcode ?? null;
}

export function FaydaQrScanner({ onDecodedText, onError }: Props) {
  const regionId = useRef(`qr-reader-${Math.random().toString(16).slice(2)}`);
  const qrRef = useRef<any>(null);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const start = async () => {
      try {
        const Html5Qrcode = await loadHtml5Qrcode(onError);
        if (!Html5Qrcode) throw new Error("Scanner library not available.");

        if (cancelled) return;

        const qr = new Html5Qrcode(regionId.current, /* verbose */ false);
        qrRef.current = qr;

        await qr.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0,
          },
          (decodedText: string) => {
            onDecodedText(decodedText);
          },
          () => {
            // ignore per-frame decode errors to reduce noise
          }
        );

        if (!cancelled) setStarted(true);
      } catch (e: any) {
        onError?.(e?.message || "Unable to start camera. Please allow camera permission and retry.");
      }
    };

    start();

    return () => {
      cancelled = true;
      const qr = qrRef.current;
      qrRef.current = null;
      if (qr) {
        // stop() may throw if start failed; swallow safely.
        Promise.resolve()
          .then(() => qr.stop())
          .catch(() => {})
          .finally(() => {
            try {
              qr.clear();
            } catch {}
          });
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-3">
      <div className="text-sm text-slate-600">
        Point the camera at the QR on the back of the Fayda ID.
      </div>
      <div
        id={regionId.current}
        className="w-full rounded-xl overflow-hidden border border-slate-200 bg-black"
        style={{ minHeight: 280 }}
      />
      {!started && (
        <div className="text-xs text-slate-500">
          Starting camera… If prompted, allow camera access.
        </div>
      )}
    </div>
  );
}

