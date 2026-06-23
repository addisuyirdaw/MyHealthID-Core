"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  X,
  Hospital,
  Send,
  Loader2,
  ShieldCheck,
  Volume2,
  VolumeX,
  Globe,
  Mic,
  BotMessageSquare,
} from "lucide-react";
import { useChatContext } from "@/components/ai/chat-context";

/**
 * FloatingChatBot Component
 * Pill-shaped, high-visibility floating widget with unified context state.
 * Shares open/close state with PublicHeader "AI Assistant" link.
 */
export function FloatingChatBot() {
  const { isOpen, openChat, closeChat, toggleChat } = useChatContext();

  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Voice & Language State
  const [isMuted, setIsMuted] = useState(false);
  const [language, setLanguage] = useState<"EN" | "AM">("EN");
  const [audioUnlocked, setAudioUnlocked] = useState(false);

  // Identity Gate State
  const [verifiedPatientId, setVerifiedPatientId] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Mobile Audio Unlock — must be triggered by a user gesture
  const unlockAudio = () => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      const msg = new SpeechSynthesisUtterance("");
      window.speechSynthesis.speak(msg);
    }
    setAudioUnlocked(true);
    setIsMuted(false);
  };

  // Voice Engine (TTS)
  const speak = (text: string) => {
    if (isMuted) return;
    if (typeof window === "undefined" || !window.speechSynthesis) return;

    window.speechSynthesis.cancel();

    let spokenText = text;
    if (language === "EN") {
      spokenText = text.replace(/[\u1200-\u137F]/g, "").trim();
    }

    const utterance = new SpeechSynthesisUtterance(spokenText);
    utterance.lang = language === "AM" ? "am-ET" : "en-US";

    if (language === "AM") {
      const voices = window.speechSynthesis.getVoices();
      const amVoice = voices.find((v) => v.lang.includes("am") || v.lang.includes("ET"));
      if (amVoice) utterance.voice = amVoice;
    }

    window.speechSynthesis.speak(utterance);
  };

  // Initial Gate Message
  useEffect(() => {
    if (isOpen && messages.length === 0 && !verifiedPatientId) {
      const msg =
        language === "AM"
          ? "እንኳን ደህና መጡ! እባክዎ መጀመሪያ የብሔራዊ መታወቂያዎን ያስገቡ።"
          : "Welcome! Please enter your National ID to securely access your records.";
      setMessages([{ role: "assistant", content: msg }]);
      speak(msg);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, verifiedPatientId]);

  const sendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;

    const userInput = input.trim();
    setInput("");

    const newMessages = [...messages, { role: "user", content: userInput }];
    setMessages(newMessages);
    setIsLoading(true);

    // MODE 1: VERIFICATION
    if (!verifiedPatientId) {
      setIsVerifying(true);
      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "verify", idToVerify: userInput, language }),
        });
        const data = await res.json();

        if (data.success) {
          setVerifiedPatientId(data.patientId);
          setMessages([...newMessages, { role: "assistant", content: data.message }]);
          speak(data.message);
        } else {
          const errMsg =
            data.error ||
            (language === "AM"
              ? "መታወቂያው አልተገኘም።"
              : "ID not recognized. Please check your National ID card.");
          setMessages([...newMessages, { role: "assistant", content: errMsg }]);
          speak(errMsg);
        }
      } catch {
        const networkErr =
          language === "AM"
            ? "የግንኙነት ችግር አጋጥሟል። እባክዎ እንደገና ይሞክሩ።"
            : "Network error. Please try again.";
        setMessages([...newMessages, { role: "assistant", content: networkErr }]);
        speak(networkErr);
      } finally {
        setIsLoading(false);
        setIsVerifying(false);
      }
      return;
    }

    // MODE 2: CHAT
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "chat",
          messages: newMessages,
          verifiedPatientId,
          language,
        }),
      });

      const data = await res.json();
      if (data.content) {
        setMessages([...newMessages, { role: "assistant", content: data.content }]);
        speak(data.content);
      } else if (data.error) {
        setMessages([...newMessages, { role: "assistant", content: data.error }]);
        speak(data.error);
      }
    } catch {
      const fallbackErr =
        language === "AM"
          ? "የግንኙነት ችግር አጋጥሟል።"
          : "Sorry, I am having trouble connecting.";
      setMessages([...newMessages, { role: "assistant", content: fallbackErr }]);
      speak(fallbackErr);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      id="floating-chatbot-widget"
      className="fixed right-6 bottom-6 z-[9999] flex flex-col items-end"
      style={{ fontFamily: "Inter, sans-serif" }}
    >
      {/* ── Chat Window ── */}
      {isOpen && (
        <div
          className="mb-4 bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-200 flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-300"
          style={{
            width: "350px",
            height: "500px",
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.35)",
          }}
        >
          {/* Chat Header */}
          <div className="bg-gradient-to-r from-violet-600 to-blue-600 p-4 flex justify-between items-center text-white shrink-0">
            <div className="flex items-center gap-2">
              <Hospital size={20} className="text-violet-100" />
              <span className="font-semibold text-sm flex items-center gap-2">
                MyHealthID AI
                {verifiedPatientId && (
                  <span title="Identity Verified">
                    <ShieldCheck size={16} className="text-green-300" />
                  </span>
                )}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setLanguage((l) => (l === "EN" ? "AM" : "EN"))}
                className="hover:bg-white/20 p-1.5 rounded-full transition-colors flex items-center gap-1"
                title="Toggle Language"
              >
                <Globe size={18} />
                <span className="text-xs font-bold">{language}</span>
              </button>
              <button
                onClick={() => {
                  setIsMuted(!isMuted);
                  if (!isMuted && window.speechSynthesis) window.speechSynthesis.cancel();
                }}
                className="hover:bg-white/20 p-1.5 rounded-full transition-colors"
                title={isMuted ? "Unmute Voice" : "Mute Voice"}
              >
                {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
              </button>
              <button
                onClick={closeChat}
                className="hover:bg-white/20 p-1.5 rounded-full transition-colors"
                aria-label="Close Chat"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Audio Unlock Overlay (Mobile Fix) */}
          {!audioUnlocked ? (
            <div className="flex-1 flex flex-col items-center justify-center bg-gradient-to-b from-violet-50 to-white p-6 text-center gap-4">
              <div className="w-20 h-20 rounded-full bg-violet-100 flex items-center justify-center animate-pulse">
                <Mic className="w-10 h-10 text-violet-600" />
              </div>
              <h3 className="text-lg font-bold text-slate-800">
                {language === "AM" ? "ድምጽ ለማንቃት ይጫኑ" : "Activate Voice Assistant"}
              </h3>
              <p className="text-sm text-slate-500 max-w-[250px]">
                {language === "AM"
                  ? "ይህን ቁልፍ ይጫኑ የ AI ረዳቱ በድምጽ እንዲነጋገርዎ።"
                  : "Tap the button below to enable the AI to speak responses aloud."}
              </p>
              <button
                onClick={unlockAudio}
                className="bg-gradient-to-r from-violet-600 to-blue-600 hover:opacity-90 text-white font-semibold px-8 py-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 active:scale-95 flex items-center gap-2"
              >
                <Volume2 size={20} />
                {language === "AM" ? "ድምጽ አንቃ" : "Activate Audio"}
              </button>
              <button
                onClick={() => {
                  setAudioUnlocked(true);
                  setIsMuted(true);
                }}
                className="text-xs text-slate-400 hover:text-slate-600 underline mt-1"
              >
                {language === "AM" ? "ያለ ድምጽ ቀጥል" : "Continue without audio"}
              </button>
            </div>
          ) : (
            <>
              {/* Chat History */}
              <div className="flex-1 overflow-y-auto p-4 bg-gray-50 flex flex-col gap-3">
                {messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`max-w-[85%] p-3 rounded-2xl text-sm shadow-sm ${
                      msg.role === "user"
                        ? "bg-gradient-to-br from-violet-600 to-blue-600 text-white self-end rounded-br-sm"
                        : "bg-white text-gray-800 border border-gray-100 self-start rounded-bl-sm"
                    }`}
                  >
                    {msg.content}
                  </div>
                ))}
                {isLoading && (
                  <div className="bg-white border border-gray-100 text-gray-800 p-3 rounded-2xl rounded-bl-sm self-start shadow-sm flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-violet-600" />
                    <span className="text-xs text-gray-500">
                      {isVerifying
                        ? language === "AM"
                          ? "መታወቂያን በማረጋገጥ ላይ..."
                          : "Verifying ID..."
                        : language === "AM"
                        ? "በማሰብ ላይ..."
                        : "Analyzing..."}
                    </span>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div className="p-3 bg-white border-t border-gray-100 shrink-0">
                <form onSubmit={sendMessage} className="flex gap-2">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={
                      verifiedPatientId
                        ? language === "AM"
                          ? "ምልክቶችዎን ይግለጹ..."
                          : "Describe your symptoms..."
                        : language === "AM"
                        ? "መታወቂያዎን ያስገቡ..."
                        : "Enter your National ID..."
                    }
                    className="flex-1 bg-gray-100 border-none rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                    disabled={isLoading}
                  />
                  <button
                    type="submit"
                    disabled={!input.trim() || isLoading}
                    className="bg-gradient-to-r from-violet-600 to-blue-600 text-white p-2 rounded-full hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send size={18} />
                  </button>
                </form>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Pill-Shaped Floating Trigger ── */}
      <button
        id="chatbot-pill-trigger"
        onClick={toggleChat}
        className={`
          flex items-center gap-2.5 rounded-full shadow-2xl transition-all duration-300
          border-2 border-white/30
          ${
            isOpen
              ? "bg-gray-100 text-gray-600 px-4 py-3"
              : "bg-gradient-to-r from-violet-600 to-blue-600 text-white px-5 py-3.5 hover:opacity-95 hover:scale-105 active:scale-95 shadow-violet-900/40"
          }
        `}
        aria-label={isOpen ? "Close Health Assistant" : "Open Health Assistant"}
        style={{
          boxShadow: isOpen
            ? undefined
            : "0 8px 32px -4px rgba(124,58,237,0.5), 0 0 0 1px rgba(255,255,255,0.1)",
        }}
      >
        {isOpen ? (
          <>
            <X size={20} />
            <span className="text-sm font-bold">Close</span>
          </>
        ) : (
          <>
            <BotMessageSquare size={22} className="shrink-0" />
            <span className="text-sm font-bold whitespace-nowrap">Ask MyHealthID AI</span>
            {/* Pulse indicator */}
            <span className="flex h-2.5 w-2.5 shrink-0">
              <span className="animate-ping absolute inline-flex h-2.5 w-2.5 rounded-full bg-blue-300 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-200" />
            </span>
          </>
        )}
      </button>
    </div>
  );
}
