/**
 * fayda-ocr.ts
 *
 * Uses tesseract.js (WASM, 100% client-side) to read the printed Name and FIN
 * from an uploaded Fayda National ID photo and cross-reference them against the
 * values decoded from the QR/barcode.
 *
 * Matching is intentionally fuzzy:
 *  - FIN: exact 12-digit comparison after stripping spaces
 *  - Name: normalised token overlap ≥ 0.60 (handles OCR noise on Ethiopic names)
 */

export type OcrExtract = {
  ocrName: string;
  ocrFin: string;
  rawText: string;
};

export type OcrMatchResult = {
  match: boolean;
  confidence: "high" | "low" | "none";
  reason: string;
  extract: OcrExtract;
};

// ─── Text normalisation helpers ───────────────────────────────────────────────

function normalise(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // strip diacritics
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenOverlap(a: string, b: string): number {
  const ta = new Set(normalise(a).split(" ").filter(Boolean));
  const tb = new Set(normalise(b).split(" ").filter(Boolean));
  if (ta.size === 0 || tb.size === 0) return 0;
  let hits = 0;
  ta.forEach((t) => { if (tb.has(t)) hits++; });
  return hits / Math.max(ta.size, tb.size);
}

// ─── Extraction from raw OCR text ────────────────────────────────────────────

function extractFin(text: string): string {
  // Look for 12-digit runs (possibly space-separated in groups of 4)
  const spacedMatch = text.match(/\b(\d{4}[\s\-]?\d{4}[\s\-]?\d{4})\b/);
  if (spacedMatch) return spacedMatch[1].replace(/\D/g, "");

  // Fallback: any 12-digit run
  const plain = text.match(/\b\d{12}\b/);
  return plain ? plain[0] : "";
}

function extractName(text: string): string {
  // Strategy 1: look for a line after "Name" / "Full Name" / "ስም" label
  const labeled = text.match(
    /(?:full\s*name|name|ስም)[:\s]+([A-Za-z\u1200-\u137F][\w\s\u1200-\u137F]{2,50})/i
  );
  if (labeled) return labeled[1].trim();

  // Strategy 2: longest capitalised multi-word run
  const lines = text.split(/\n/).map((l) => l.trim()).filter(Boolean);
  let best = "";
  for (const line of lines) {
    // Skip lines that are mostly digits (FIN, FCN, dates)
    if (/\d{4,}/.test(line)) continue;
    const wordCount = (line.match(/[A-Za-z\u1200-\u137F]+/g) ?? []).length;
    if (wordCount >= 2 && line.length > best.length) best = line;
  }
  return best;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Runs Tesseract.js on `file` and returns the raw OCR text plus extracted
 * FIN and Name fields. Throws if the WASM worker fails to initialise.
 */
export async function runFaydaOcr(file: File): Promise<OcrExtract> {
  // Dynamically import so the WASM bundle is never loaded on the server side
  const { createWorker } = await import("tesseract.js");

  const worker = await createWorker("eng", 1, {
    // Suppress verbose Tesseract logs in production
    logger: process.env.NODE_ENV === "development"
      ? (m: { status: string; progress: number }) => {
          if (m.status === "recognizing text") {
            console.debug(`[OCR] ${Math.round(m.progress * 100)}%`);
          }
        }
      : () => {},
  });

  try {
    await worker.setParameters({
      // PSM 6: assume uniform block of text — good for ID cards
      tessedit_pageseg_mode: "6" as any,
      // Only digits + Latin + some punctuation — reduces spurious Ethiopic matches
      tessedit_char_whitelist:
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 .,:-/",
    });

    const { data } = await worker.recognize(file);
    const rawText = data.text ?? "";

    return {
      ocrName: extractName(rawText),
      ocrFin: extractFin(rawText),
      rawText,
    };
  } finally {
    await worker.terminate();
  }
}

/**
 * Cross-references OCR extract against QR-decoded `qrFin` / `qrName`.
 * Returns a match result with confidence level and human-readable reason.
 */
export function matchOcrVsQr(
  extract: OcrExtract,
  qrFin: string,
  qrName: string
): OcrMatchResult {
  const finMatch =
    extract.ocrFin.length === 12 && extract.ocrFin === qrFin.replace(/\D/g, "");

  const nameScore = tokenOverlap(extract.ocrName, qrName);
  const nameMatch = nameScore >= 0.6;

  // Both must match for high confidence
  if (finMatch && nameMatch) {
    return {
      match: true,
      confidence: "high",
      reason: `FIN matches exactly and name overlap is ${Math.round(nameScore * 100)}%.`,
      extract,
    };
  }

  // FIN alone is the stronger signal
  if (finMatch && !nameMatch) {
    return {
      match: true,
      confidence: "low",
      reason: `FIN matches but printed name could not be read clearly (overlap ${Math.round(nameScore * 100)}%). Possible glare or font issue.`,
      extract,
    };
  }

  if (!finMatch && nameMatch) {
    return {
      match: false,
      confidence: "low",
      reason: `Name appears to match (${Math.round(nameScore * 100)}%) but the FIN could not be confirmed from the image. Staff review recommended.`,
      extract,
    };
  }

  // Nothing matches
  return {
    match: false,
    confidence: "none",
    reason: `Neither FIN nor name could be confirmed from the card image. The photo may be blurry, have glare, or this may be the wrong card.`,
    extract,
  };
}
