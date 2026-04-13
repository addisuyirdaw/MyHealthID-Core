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
    // Simulate instantaneous "scan" redirect
    router.push(`/dashboard?search=${encodeURIComponent(scanData.trim())}`);
  };

  return (
    <div className="min-h-screen bg-slate-50 relative overflow-hidden flex items-center justify-center p-4">
      <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] rounded-full bg-primary/20 blur-3xl" />
      
      <Card className="w-full max-w-sm border-white/40 bg-white/60 backdrop-blur-2xl shadow-xl relative z-10 text-center">
        <form onSubmit={handleScan}>
          <CardHeader className="space-y-1 pb-6">
            <div className="mx-auto bg-slate-900 w-16 h-16 rounded-2xl flex items-center justify-center mb-2 shadow-inner">
              <ScanLine className="h-8 w-8 text-white animate-pulse" />
            </div>
            <CardTitle className="text-2xl font-bold tracking-tight">Scan Passport</CardTitle>
            <CardDescription>Simulate scanning a PatientQR code</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-slate-100/50 p-6 rounded-xl border border-slate-200 border-dashed flex flex-col items-center justify-center h-40">
               <QrCode className="w-12 h-12 text-slate-300 mb-2" />
               <p className="text-sm text-slate-500 font-medium">Camera Feed Active</p>
            </div>
            
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white/60 px-2 text-slate-500 font-semibold backdrop-blur-sm">Or Enter Manually</span>
              </div>
            </div>

            <div className="space-y-2">
              <Input 
                value={scanData}
                onChange={(e) => setScanData(e.target.value)}
                placeholder="Health ID or National ID" 
                className="text-center font-mono text-lg bg-white"
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={!scanData.trim()} className="w-full" size="lg">
              Check-In Patient
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
