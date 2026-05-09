/**
 * Parse Fayda QR / barcode / payload text into FIN (12) and/or FCN (16).
 * Physical cards: back = dense QR; front = CODE_128 often yields FCN only.
 */

export type FaydaScanParse =
  | { kind: "pair"; fin: string; fcn: string }
  | { kind: "fcn_only"; fcn: string }
  | { kind: "fin_only"; fin: string };

const DIGITS_12 = /\d{12}/g;
const DIGITS_16 = /\d{16}/g;

function onlyDigits(s: string) {
  return s.replace(/\D/g, "");
}

function collectDigitsRuns(text: string) {
  const twelves = [...text.matchAll(DIGITS_12)].map((m) => m[0]);
  const sixteens = [...text.matchAll(DIGITS_16)].map((m) => m[0]);
  return { twelves, sixteens };
}

function walkJsonForDigits(obj: unknown, twelves: Set<string>, sixteens: Set<string>) {
  if (obj == null) return;
  if (typeof obj === "string") {
    for (const m of obj.matchAll(DIGITS_12)) twelves.add(m[0]);
    for (const m of obj.matchAll(DIGITS_16)) sixteens.add(m[0]);
    return;
  }
  if (typeof obj === "number") {
    const s = String(obj);
    if (/^\d{12}$/.test(s)) twelves.add(s);
    if (/^\d{16}$/.test(s)) sixteens.add(s);
    return;
  }
  if (Array.isArray(obj)) {
    obj.forEach((x) => walkJsonForDigits(x, twelves, sixteens));
    return;
  }
  if (typeof obj === "object") {
    Object.values(obj as Record<string, unknown>).forEach((x) => walkJsonForDigits(x, twelves, sixteens));
  }
}

function tryParseJson(text: string): unknown | null {
  const t = text.trim();
  if (t.startsWith("{") || t.startsWith("[")) {
    try {
      return JSON.parse(t);
    } catch {
      return null;
    }
  }
  return null;
}

function tryDecodeBase64Json(text: string): unknown | null {
  const t = text.trim();
  if (t.length < 32) return null;
  if (!/^[A-Za-z0-9+/=_-]+$/.test(t)) return null;
  try {
    const normalized = t.replace(/-/g, "+").replace(/_/g, "/");
    const pad = normalized.length % 4 === 0 ? "" : "=".repeat(4 - (normalized.length % 4));
    const dec = atob(normalized + pad);
    const trimmed = dec.trim();
    if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
      return JSON.parse(trimmed);
    }
    return null;
  } catch {
    return null;
  }
}

function fromLabeledText(text: string): FaydaScanParse | null {
  const finL =
    text.match(/\bFIN\b\D{0,24}(\d{4}\s\d{4}\s\d{4}|\d{12})/i)?.[1] ?? text.match(/\bFIN\b\D{0,24}(\d{12})/i)?.[1];
  const fcnL = text.match(/\bFCN\b\D{0,24}(\d{16}|\d{4}\s\d{4}\s\d{4}\s\d{4})/i)?.[1];
  const fin = finL ? onlyDigits(finL) : null;
  const fcn = fcnL ? onlyDigits(fcnL) : null;
  if (fin && fcn && fin.length === 12 && fcn.length === 16) return { kind: "pair", fin, fcn };
  return null;
}

function fromRuns(text: string): FaydaScanParse | null {
  const { twelves, sixteens } = collectDigitsRuns(text);
  if (twelves.length && sixteens.length) {
    return { kind: "pair", fin: twelves[0], fcn: sixteens[0] };
  }
  if (sixteens.length === 1 && !twelves.length) return { kind: "fcn_only", fcn: sixteens[0] };
  if (twelves.length === 1 && !sixteens.length) return { kind: "fin_only", fin: twelves[0] };
  return null;
}

export function parseFaydaScanPayload(raw: string): FaydaScanParse | null {
  const text = raw?.trim() ?? "";
  if (!text) return null;

  const only = onlyDigits(text);
  if (only.length === 16 && /^\d{16}$/.test(only)) return { kind: "fcn_only", fcn: only };
  if (only.length === 12 && /^\d{12}$/.test(only)) return { kind: "fin_only", fin: only };

  const labeled = fromLabeledText(text);
  if (labeled) return labeled;

  const j = tryParseJson(text);
  if (j != null) {
    const tw = new Set<string>();
    const sx = new Set<string>();
    walkJsonForDigits(j, tw, sx);
    const twelves = [...tw];
    const sixteens = [...sx];
    if (twelves.length && sixteens.length) return { kind: "pair", fin: twelves[0], fcn: sixteens[0] };
    if (sixteens.length) return { kind: "fcn_only", fcn: sixteens[0] };
    if (twelves.length) return { kind: "fin_only", fin: twelves[0] };
  }

  const b64 = tryDecodeBase64Json(text);
  if (b64 != null) {
    const tw = new Set<string>();
    const sx = new Set<string>();
    walkJsonForDigits(b64, tw, sx);
    const twelves = [...tw];
    const sixteens = [...sx];
    if (twelves.length && sixteens.length) return { kind: "pair", fin: twelves[0], fcn: sixteens[0] };
    if (sixteens.length) return { kind: "fcn_only", fcn: sixteens[0] };
    if (twelves.length) return { kind: "fin_only", fin: twelves[0] };
  }

  try {
    if (text.includes("://")) {
      const u = new URL(text);
      const blob = [...u.searchParams.entries()]
        .map(([k, v]) => `${k} ${v}`)
        .join(" ");
      const sub = fromRuns(blob);
      if (sub) return sub;
    }
  } catch {
    /* not a URL */
  }

  return fromRuns(text);
}
