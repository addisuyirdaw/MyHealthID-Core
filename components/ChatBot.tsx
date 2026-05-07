"use client";

import React, { useState, useEffect, useRef } from "react";
import { MessageCircle, X, Hospital, Send, Loader2, ShieldCheck, Volume2, VolumeX, Globe } from "lucide-react";
import { useParams } from "next/navigation";

/**
 * ChatBot Component
 * Now features Bilingual Voice Control (TTS) and Identity Gate.
 */
export const ChatBot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{role: string, content: string}[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  // Voice & Language State
  const [isMuted, setIsMuted] = useState(false);
  const [language, setLanguage] = useState<"EN" | "AM">("EN");

  // Identity Gate State
  const [verifiedPatientId, setVerifiedPatientId] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const toggleChat = () => setIsOpen(!isOpen);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Voice Engine (TTS)
  const speak = (text: string) => {
    if (isMuted) return;
    if (typeof window === "undefined" || !window.speechSynthesis) return;

    // Optional: Stop current speech before starting a new one
    window.speechSynthesis.cancel();

    // Prevent English TTS from glitching on Amharic characters
    let spokenText = text;
    if (language === "EN") {
      // Remove Ethiopic script characters so the English voice doesn't break
      spokenText = text.replace(/[\u1200-\u137F]/g, '').trim();
    }

    const utterance = new SpeechSynthesisUtterance(spokenText);
    utterance.lang = language === "AM" ? "am-ET" : "en-US";
    
    // Try to find an Amharic voice if available, otherwise it falls back to default
    if (language === "AM") {
      const voices = window.speechSynthesis.getVoices();
      const amVoice = voices.find(v => v.lang.includes("am") || v.lang.includes("ET"));
      if (amVoice) utterance.voice = amVoice;
    }

    window.speechSynthesis.speak(utterance);
  };

  // Initial Gate Message
  useEffect(() => {
    if (isOpen && messages.length === 0 && !verifiedPatientId) {
      const msg = language === "AM"
        ? "እንኳን ደህና መጡ! እባክዎ መጀመሪያ የብሔራዊ መታወቂያዎን ያስገቡ።"
        : "Welcome! Please enter your National ID to securely access your records.";
      
      setMessages([{ role: "assistant", content: msg }]);
      speak(msg);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, verifiedPatientId]); // Only trigger on open or verification change, avoid speaking on every lang toggle

  const sendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;

    const userInput = input.trim();
    setInput("");

    // Add user message to UI
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
          body: JSON.stringify({
            action: "verify",
            idToVerify: userInput,
            language
          })
        });
        const data = await res.json();
        
        if (data.success) {
          setVerifiedPatientId(data.patientId);
          setMessages([...newMessages, { role: "assistant", content: data.message }]);
          speak(data.message);
        } else {
          const errMsg = data.error || (language === "AM" ? "መታወቂያው አልተገኘም።" : "ID not recognized. Please check your National ID card.");
          setMessages([...newMessages, { role: "assistant", content: errMsg }]);
          speak(errMsg);
        }
      } catch (err) {
        const networkErr = language === "AM" ? "የግንኙነት ችግር አጋጥሟል። እባክዎ እንደገና ይሞክሩ።" : "Network error. Please try again.";
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
          language
        })
      });
      
      const data = await res.json();
      if (data.content) {
        setMessages([...newMessages, { role: "assistant", content: data.content }]);
        speak(data.content);
      } else if (data.error) {
        setMessages([...newMessages, { role: "assistant", content: data.error }]);
        speak(data.error);
      }
    } catch (err) {
      console.error(err);
      const fallbackErr = language === "AM" ? "የግንኙነት ችግር አጋጥሟል።" : "Sorry, I am having trouble connecting.";
      setMessages([...newMessages, { role: "assistant", content: fallbackErr }]);
      speak(fallbackErr);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div 
      id="chatbot-widget"
      className="fixed bottom-6 right-6 z-[9999] flex flex-col items-end"
      style={{ fontFamily: "Inter, sans-serif" }}
    >
      {/* Chat Window Container */}
      {isOpen && (
        <div 
          className="mb-4 bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-200 transition-all duration-300 ease-in-out flex flex-col animate-in fade-in slide-in-from-bottom-4"
          style={{ 
            width: "350px", 
            height: "500px",
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)"
          }}
        >
          {/* Header */}
          <div className="bg-blue-600 p-4 flex justify-between items-center text-white shrink-0">
            <div className="flex items-center gap-2">
              <Hospital size={20} className="text-blue-100" />
              <span className="font-semibold text-sm flex items-center gap-2">
                MyHealthID AI
                {verifiedPatientId && <ShieldCheck size={16} className="text-green-300" title="Identity Verified" />}
              </span>
            </div>
            {/* Header Actions */}
            <div className="flex items-center gap-1">
              <button 
                onClick={() => setLanguage(lang => lang === "EN" ? "AM" : "EN")}
                className="hover:bg-blue-700/50 p-1.5 rounded-full transition-colors flex items-center gap-1"
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
                className="hover:bg-blue-700/50 p-1.5 rounded-full transition-colors"
                title={isMuted ? "Unmute Voice" : "Mute Voice"}
              >
                {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
              </button>
              <button 
                onClick={() => setIsOpen(false)}
                className="hover:bg-blue-700/50 p-1.5 rounded-full transition-colors"
                aria-label="Close Chat"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Chat History */}
          <div className="flex-1 overflow-y-auto p-4 bg-gray-50 flex flex-col gap-3">
            {messages.map((msg, idx) => (
              <div 
                key={idx} 
                className={`max-w-[85%] p-3 rounded-2xl text-sm shadow-sm ${
                  msg.role === "user" 
                    ? "bg-blue-600 text-white self-end rounded-br-sm" 
                    : "bg-white text-gray-800 border border-gray-100 self-start rounded-bl-sm"
                }`}
              >
                {msg.content}
              </div>
            ))}
            {isLoading && (
              <div className="bg-white border border-gray-100 text-gray-800 p-3 rounded-2xl rounded-bl-sm self-start shadow-sm flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                <span className="text-xs text-gray-500">{isVerifying ? (language === "AM" ? "መታወቂያን በማረጋገጥ ላይ..." : "Verifying ID...") : (language === "AM" ? "በማሰብ ላይ..." : "Analyzing...")}</span>
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
                placeholder={verifiedPatientId ? (language === "AM" ? "ምልክቶችዎን ይግለጹ..." : "Describe your symptoms...") : (language === "AM" ? "መታወቂያዎን ያስገቡ..." : "Enter your National ID...")}
                className="flex-1 bg-gray-100 border-none rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                disabled={isLoading}
              />
              <button 
                type="submit" 
                disabled={!input.trim() || isLoading}
                className="bg-blue-600 text-white p-2 rounded-full hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send size={18} />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Floating Trigger Button */}
      <button
        onClick={toggleChat}
        className={`
          flex items-center justify-center rounded-full shadow-lg transition-all duration-300 
          ${isOpen ? 'bg-gray-100 text-gray-600 rotate-90 w-12 h-12' : 'bg-blue-600 text-white hover:bg-blue-700 hover:scale-110 active:scale-95 w-16 h-16'}
          border-4 border-white
        `}
        aria-label={isOpen ? "Close Health Assistant" : "Open Health Assistant"}
      >
        {isOpen ? (
          <X size={24} />
        ) : (
          <div className="relative">
            <MessageCircle size={32} />
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
            </span>
          </div>
        )}
      </button>
    </div>
  );
};
