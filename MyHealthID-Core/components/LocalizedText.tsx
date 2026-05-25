"use client";

import { useLanguage } from "./LanguageProvider";

export function LocalizedText({ tKey }: { tKey: string }) {
  const { t } = useLanguage();
  
  const keys = tKey.split('.');
  let value: any = t;
  for (const k of keys) {
    if (value && value[k]) {
      value = value[k];
    } else {
      return <>{tKey}</>; // fallback
    }
  }
  return <>{value}</>;
}
