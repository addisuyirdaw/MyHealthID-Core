"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { QrCode, ScanLine } from "lucide-react";

export default function ScanPage() {
  const [scanData, setScanData] = useState("");
  const router = useRouter();

  const handleScan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!scanData.trim()) return;
    router.push(`/doctor/dashboard?search=${encodeURIComponent(scanData.trim())}`);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 relative overflow-hidden flex items-center justify-center p-4">
      {/* Background ambient glows */}
      <div className="absolute top-0 left-1/4 w-[400px] h-[400px] bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
      
      <Card className="w-full max-w-sm border-slate-800 bg-slate-900/40 backdrop-blur-2xl shadow-2xl relative z-10 text-center">
        <form onSubmit={handleScan}>
          <CardHeader className="space-y-1 pb-6">
            <div className="mx-auto bg-blue-500/10 border border-blue-500/20 w-16 h-16 rounded-2xl flex items-center justify-center mb-2 shadow-lg shadow-blue-900/10">
              <ScanLine className="h-8 w-8 text-blue-400 animate-pulse" />
            </div>
            <CardTitle className="text-2xl font-black tracking-tight text-white">Scan Passport</CardTitle>
            <CardDescription className="text-slate-400">Simulate scanning a PatientQR code</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-slate-950/40 p-6 rounded-xl border border-slate-800 border-dashed flex flex-col items-center justify-center h-40">
               <QrCode className="w-12 h-12 text-slate-700 mb-2" />
               <p className="text-sm text-slate-400 font-medium">Camera Feed Active</p>
            </div>
            
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-slate-800" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-slate-900/60 px-2 text-slate-450 font-semibold backdrop-blur-sm">Or Enter Manually</span>
              </div>
            </div>

            <div className="space-y-2">
              <Input 
                value={scanData}
                onChange={(e) => setScanData(e.target.value)}
                placeholder="Health ID or National ID" 
                className="text-center font-mono text-lg bg-slate-950 border-slate-800 text-slate-100 placeholder:text-slate-650 focus:border-blue-500 focus:ring-blue-500/20"
              />
            </div>
          </CardContent>
          <CardFooter>
            <button 
              type="submit" 
              disabled={!scanData.trim()} 
              className="w-full h-12 flex items-center justify-center gap-2 text-base font-bold bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-lg border border-blue-500/20 transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
            >
              Check-In Patient
            </button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
