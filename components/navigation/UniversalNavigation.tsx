"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Home } from "lucide-react";

export function UniversalNavigation({ isFloating = false }: { isFloating?: boolean }) {
  const router = useRouter();

  const containerClasses = isFloating
    ? "fixed top-4 left-4 z-[9999] bg-slate-900/80 backdrop-blur-md border border-slate-700/50 rounded-xl p-1 shadow-lg flex items-center gap-1"
    : "flex items-center gap-1 bg-slate-800/40 border border-slate-700/50 rounded-lg p-1";

  const btnClasses =
    "p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/50 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-500";

  return (
    <div className={containerClasses}>
      <button
        onClick={() => router.back()}
        className={btnClasses}
        aria-label="Go Back"
        title="Go Back"
      >
        <ArrowLeft className="w-4 h-4" />
      </button>
      
      <button
        onClick={() => router.forward()}
        className={btnClasses}
        aria-label="Go Forward"
        title="Go Forward"
      >
        <ArrowRight className="w-4 h-4" />
      </button>
      
      <button
        onClick={() => router.push("/")}
        className={btnClasses}
        aria-label="Go to Home"
        title="Go to Home"
      >
        <Home className="w-4 h-4" />
      </button>
    </div>
  );
}
