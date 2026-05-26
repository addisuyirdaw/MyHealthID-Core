import React, { useRef, useState } from "react";
import { Camera } from "lucide-react";
import { convertPdfToImages } from "@/lib/pdf-helper";

export function FrontIdCapture({ onCapture }: { onCapture: (f: File) => void }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const handlePickFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setBusy(true);
    try {
      const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
      if (isPdf) {
        const pages = await convertPdfToImages(file);
        if (pages.length === 0) {
          throw new Error("The uploaded PDF has no pages.");
        }
        // Use the first page of the PDF as the Front ID image
        onCapture(pages[0]);
      } else {
        onCapture(file);
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to read the document.");
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4 p-4 border rounded-xl bg-slate-50">
      <div className="text-sm text-slate-600 text-center">
        <p>Please take a clear photo or upload a PDF of the <strong>FRONT</strong> of your ID card.</p>
        <p className="mt-1 text-xs opacity-80">Ensure the name and photo are clearly visible.</p>
      </div>
      <div className="flex gap-3 justify-center">
        <input ref={fileInputRef} type="file" accept="image/*,.pdf" capture="environment" className="hidden" onChange={handlePickFile} />
        <button
          type="button"
          disabled={busy}
          onClick={() => fileInputRef.current?.click()}
          className="w-full max-w-sm flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-600 text-white font-medium shadow-md hover:bg-blue-700 disabled:opacity-50 transition-all"
        >
          {busy ? (
            <span className="animate-pulse">Processing OCR...</span>
          ) : (
            <>
              <Camera className="w-5 h-5" />
              Capture Front ID or Upload PDF
            </>
          )}
        </button>
      </div>
    </div>
  );
}
