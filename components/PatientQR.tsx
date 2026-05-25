"use client";

import { QRCodeSVG } from 'qrcode.react';

interface PatientQRProps {
  value: string;
  size?: number;
}

export function PatientQR({ value, size = 128 }: PatientQRProps) {
  return (
    <div className="p-2 bg-white rounded-xl shadow-sm border border-slate-200 inline-flex items-center justify-center">
      <QRCodeSVG 
        value={value} 
        size={size}
        level="Q"
        includeMargin={false}
      />
    </div>
  );
}
