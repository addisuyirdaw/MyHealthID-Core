"use client";

import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Mic, Square, Loader2, Share, Save, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { savePatientScribeDraft } from "@/lib/actions/scribe.actions";

export function PatientScribeClient({ patient }: { patient: any }) {
  const [isRecording, setIsRecording] = useState(false);
  const [status, setStatus] = useState<"" | "transcribing" | "analyzing" | "ready" | "error" | "saving">("");
  const [draft, setDraft] = useState<any>(null);
  const [textContent, setTextContent] = useState("");
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.start(1000);
      setIsRecording(true);
      setStatus("");
      setDraft(null);
    } catch (err) {
      console.error("Microphone access denied:", err);
      alert("Could not access microphone.");
    }
  };

  const processAudio = async () => {
    const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
    const formData = new FormData();
    formData.append("audio", audioBlob);
    formData.append("patientId", patient.id);

    setStatus("transcribing");
    try {
      const transRes = await fetch("/api/ai/transcribe", { method: "POST", body: formData });
      if (!transRes.ok) {
        const errorData = await transRes.json().catch(() => ({}));
        throw new Error(errorData.error || "Transcription failed");
      }
      const transData = await transRes.json();

      setStatus("analyzing");
      const scribeRes = await fetch("/api/ai/scribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          transcript: transData.transcript, 
          patientId: patient.id 
        }),
      });
      if (!scribeRes.ok) throw new Error("Extraction failed");
      const scribeData = await scribeRes.json();
      setDraft(scribeData.draft);
      setStatus("ready");
    } catch (err: any) {
      console.error(err);
      setStatus("error");
      alert("AI Scribe processing failed: " + (err.message || "Unknown error"));
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.onstop = processAudio;
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
    }
  };

  const processText = async () => {
    if (!textContent.trim()) return;
    setStatus("analyzing");
    setDraft(null);
    try {
      const scribeRes = await fetch("/api/ai/scribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          transcript: textContent, 
          patientId: patient.id 
        }),
      });
      if (!scribeRes.ok) {
        const errorData = await scribeRes.json().catch(() => ({}));
        throw new Error(errorData.error || "Extraction failed");
      }
      const scribeData = await scribeRes.json();
      setDraft(scribeData.draft);
      setStatus("ready");
    } catch (err: any) {
      console.error(err);
      setStatus("error");
      alert("AI Scribe processing failed: " + (err.message || "Unknown error"));
    }
  };

  const handleShare = async () => {
    if (!draft) return;
    setStatus("saving");
    const res = await savePatientScribeDraft(patient.id, draft);
    if (res.success) {
      alert("Note saved and shared with your doctor successfully.");
      setStatus("ready");
    } else {
      alert(res.error || "Failed to share note.");
      setStatus("ready");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Link href={`/patients/${patient.id}/dashboard`} className="hover:text-purple-600 transition-colors">
              <ArrowLeft className="w-6 h-6" />
            </Link>
            AI Medical Scribe
          </h1>
          <p className="text-slate-600 text-sm mt-1">Tell us what you want to record for your doctor.</p>
        </div>
      </div>

      <Card className="shadow-sm border-t-4 border-t-purple-500">
        <CardHeader>
          <CardTitle>Record Your Health Note</CardTitle>
          <CardDescription>
            Speak naturally or type about how you are feeling, any symptoms you have, and how long they've been occurring.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-10 space-y-6">
          {!isRecording && status === "" && (
            <div className="w-full flex flex-col items-center gap-6">
              <Button 
                onClick={startRecording} 
                size="lg" 
                className="rounded-full w-24 h-24 bg-purple-600 hover:bg-purple-700 text-white shadow-lg flex flex-col gap-2 transition-transform hover:scale-105"
              >
                <Mic className="w-8 h-8" />
                <span className="text-xs font-semibold">Record Voice</span>
              </Button>
              <div className="w-full max-w-lg space-y-3">
                <div className="flex items-center gap-4">
                  <div className="h-px bg-slate-200 flex-1"></div>
                  <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">or type instead</span>
                  <div className="h-px bg-slate-200 flex-1"></div>
                </div>
                <textarea
                  value={textContent}
                  onChange={(e) => setTextContent(e.target.value)}
                  placeholder="I have been experiencing a headache and mild fever since yesterday morning..."
                  className="w-full h-32 p-4 rounded-xl border border-slate-300 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 text-slate-700 resize-none"
                />
                <Button 
                  onClick={processText} 
                  disabled={!textContent.trim()} 
                  className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-2 rounded-xl"
                >
                  Process Text
                </Button>
              </div>
            </div>
          )}

          {isRecording && (
            <div className="flex flex-col items-center gap-4">
              <div className="w-24 h-24 rounded-full bg-red-100 flex items-center justify-center animate-pulse">
                <Mic className="w-10 h-10 text-red-600 animate-bounce" />
              </div>
              <p className="text-red-600 font-semibold text-lg">Listening...</p>
              <Button 
                onClick={stopRecording} 
                variant="destructive"
                className="mt-4 font-bold px-8 shadow-md"
              >
                <Square className="w-4 h-4 mr-2" /> Stop & Process
              </Button>
            </div>
          )}

          {(status === "transcribing" || status === "analyzing") && (
            <div className="flex flex-col items-center gap-4 text-purple-600">
              <Loader2 className="w-12 h-12 animate-spin" />
              <p className="font-semibold text-lg">
                {status === "transcribing" ? "Transcribing audio..." : "AI is structuring your note..."}
              </p>
            </div>
          )}

          {status === "error" && (
            <div className="text-red-500 font-medium">An error occurred. Please try again.</div>
          )}
        </CardContent>
      </Card>

      {draft && (
        <Card className="shadow-sm border-purple-200 bg-purple-50/30">
          <CardHeader>
            <CardTitle className="text-purple-900 flex items-center gap-2">
              <Save className="w-5 h-5" /> Structured Draft Note
            </CardTitle>
            <CardDescription>Review the information extracted by AI before sharing with your doctor.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(draft).map(([key, value]) => {
              if (key === "symptoms" && Array.isArray(value)) {
                return (
                  <div key={key} className="bg-white p-4 rounded-xl border border-purple-100 shadow-sm">
                    <h3 className="font-semibold text-purple-800 capitalize mb-2">{key}</h3>
                    <div className="flex flex-wrap gap-2">
                      {value.length > 0 ? value.map((s, i) => (
                        <span key={i} className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-medium">
                          {s}
                        </span>
                      )) : <span className="text-slate-500 italic">Not reported</span>}
                    </div>
                  </div>
                );
              }
              
              if (typeof value === "string") {
                return (
                  <div key={key} className="bg-white p-4 rounded-xl border border-purple-100 shadow-sm">
                    <h3 className="font-semibold text-purple-800 capitalize mb-1 text-sm">
                      {key.replace(/([A-Z])/g, ' $1').trim()}
                    </h3>
                    <p className="text-slate-700">{value || <span className="text-slate-400 italic">Not reported</span>}</p>
                  </div>
                );
              }
              return null;
            })}

            <div className="flex justify-end mt-6">
              <Button 
                onClick={handleShare} 
                disabled={status === "saving"}
                className="bg-purple-600 hover:bg-purple-700 text-white font-bold px-8 shadow-md flex items-center gap-2"
              >
                {status === "saving" ? <Loader2 className="w-5 h-5 animate-spin" /> : <Share className="w-5 h-5" />}
                Share with Doctor
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
