"use client";

import { useState } from "react";
import { getPatientQueueStatus } from "@/lib/actions/patient.actions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function PatientQueuePage() {
  const [identifier, setIdentifier] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<any>(null);
  const [error, setError] = useState("");

  const handleCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setStatus(null);

    try {
      const res = await getPatientQueueStatus(identifier.trim());
      if (!res) {
        setError("Patient not found. Please check your ID or Phone Number.");
      } else {
        setStatus(res);
      }
    } catch (err: any) {
      setError("Failed to fetch queue status. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center p-6 font-sans">
      <div className="w-full max-w-md mt-12 bg-zinc-900 rounded-2xl p-8 shadow-2xl border border-zinc-800">
        <h1 className="text-3xl font-bold text-center mb-2">Smart Queue</h1>
        <p className="text-zinc-400 text-center mb-8 text-sm">Check your live position and wait time</p>
        
        <form onSubmit={handleCheck} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2 text-zinc-300">
              National ID, Health ID or Phone
            </label>
            <Input 
              autoFocus
              className="w-full bg-black border-zinc-700 text-white text-lg h-14 rounded-xl focus:ring-blue-500 focus:border-blue-500" 
              placeholder="e.g. HID-1234 or 09..." 
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              required
            />
          </div>
          <Button 
            className="w-full h-14 text-lg font-bold bg-blue-600 hover:bg-blue-700 rounded-xl"
            type="submit"
            disabled={loading || !identifier}
          >
            {loading ? "Checking..." : "Check Status"}
          </Button>
        </form>

        {error && (
          <div className="mt-6 p-4 bg-red-900/50 border border-red-500 rounded-xl text-red-200 text-center">
            {error}
          </div>
        )}

        {status && (
          <div className="mt-8 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-zinc-950 rounded-xl p-6 border border-zinc-800 text-center shadow-inner">
              <p className="text-zinc-400 text-sm font-semibold uppercase tracking-wider mb-2">Your Position</p>
              <p className="text-7xl font-black text-white">#{status.queuePosition}</p>
            </div>
            
            <div className="bg-zinc-950 rounded-xl p-6 border border-zinc-800 text-center shadow-inner">
              <p className="text-zinc-400 text-sm font-semibold uppercase tracking-wider mb-2">Est. Wait Time</p>
              <p className="text-5xl font-bold text-yellow-400">{status.estimatedWait} <span className="text-xl">mins</span></p>
            </div>

            <div className="text-center pt-2">
              <p className="text-zinc-300 text-lg">Phase: <span className="font-semibold text-white">{status.status}</span></p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
