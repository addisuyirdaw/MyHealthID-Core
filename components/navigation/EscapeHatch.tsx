"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

interface EscapeHatchProps {
  /** Destination path on navigate (e.g. "/", "/login") */
  href: string;
  /** Link label text. Defaults to "Back to Home" */
  label?: string;
  /**
   * When true, a browser confirm() dialog fires before navigating.
   * Use this when the page holds unsaved user input that would be lost.
   */
  isDirty?: boolean;
  /** Optional extra Tailwind classes for overrides */
  className?: string;
}

/**
 * EscapeHatch - lightweight fixed escape-hatch navigation anchor.
 *
 * Renders a subtle ArrowLeft + text link anchored to the top-left corner of the
 * viewport, outside and independent of the page's centered card layout.
 * Designed for full-screen focused views (/register-facility, /register, /signin)
 * where no global navigation header is present.
 */
export function EscapeHatch({
  href,
  label = "Back to Home",
  isDirty = false,
  className = "",
}: EscapeHatchProps) {
  const router = useRouter();

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();

    if (isDirty) {
      const confirmed = window.confirm(
        "Are you sure you want to cancel? Unsaved registration data will be lost."
      );
      if (!confirmed) return;
    }

    router.push(href);
  };

  return (
    <div
      className={`fixed top-5 left-5 z-50 sm:top-6 sm:left-6 ${className}`}
    >
      <button
        type="button"
        onClick={handleClick}
        aria-label={label}
        className={[
          "group",
          "flex items-center gap-2",
          "text-xs font-semibold",
          "text-slate-400 hover:text-white",
          "transition-colors duration-200",
          "cursor-pointer",
          "px-2.5 py-1.5 rounded-lg",
          "hover:bg-white/5",
          "active:scale-95",
        ].join(" ")}
      >
        <ArrowLeft
          className="w-3.5 h-3.5 transition-transform duration-200 group-hover:-translate-x-0.5"
          aria-hidden="true"
        />
        <span>{label}</span>
      </button>
    </div>
  );
}
