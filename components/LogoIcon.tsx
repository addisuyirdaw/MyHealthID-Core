import React from 'react';

export function LogoIcon({ className = "w-10 h-10" }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Base Blue Shield */}
      <path d="M50 95C50 95 10 75 10 30V15L50 5L90 15V30C90 75 50 95 50 95Z" fill="#0052cc" />
      
      {/* Green Swoosh Overlap */}
      <path d="M50 95C50 95 90 75 90 30V25C70 40 40 70 15 70C25 85 50 95 50 95Z" fill="#00a859" />

      {/* White Cross */}
      <path d="M42 32H58V68H42V32Z" fill="#FFFFFF" />
      <path d="M32 42H68V58H32V42Z" fill="#FFFFFF" />

      {/* Orbit */}
      <ellipse cx="50" cy="50" rx="36" ry="14" transform="rotate(-35 50 50)" stroke="#FFFFFF" strokeWidth="2" fill="none" opacity="0.9" />
      <ellipse cx="50" cy="50" rx="36" ry="14" transform="rotate(35 50 50)" stroke="#FFFFFF" strokeWidth="2" fill="none" opacity="0.9" />

      {/* Nodes / Dots */}
      <circle cx="22" cy="30" r="5" fill="#00a859" stroke="#FFFFFF" strokeWidth="1.5" />
      <circle cx="78" cy="70" r="5" fill="#0052cc" stroke="#FFFFFF" strokeWidth="1.5" />
      <circle cx="75" cy="30" r="4" fill="#00a859" stroke="#FFFFFF" strokeWidth="1" />
      <circle cx="25" cy="70" r="4" fill="#0052cc" stroke="#FFFFFF" strokeWidth="1" />
    </svg>
  );
}
