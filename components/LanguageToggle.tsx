"use client";
import { useLanguage } from "./LanguageProvider";

export function LanguageToggle() {
  const { language, setLanguage } = useLanguage();
  return (
    <div className="flex items-center gap-1 mt-2 bg-slate-800 p-1 rounded-lg w-fit">
      <button 
        onClick={() => setLanguage('EN')}
        className={`px-2 py-1 rounded text-xs font-bold transition-colors ${language === 'EN' ? 'bg-slate-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
      >
        EN
      </button>
      <button 
        onClick={() => setLanguage('AM')}
        className={`px-2 py-1 rounded text-xs font-bold transition-colors ${language === 'AM' ? 'bg-slate-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
      >
        አማርኛ
      </button>
    </div>
  );
}
