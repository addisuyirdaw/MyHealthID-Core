"use client";

import React, { useState } from "react";
import { MessageCircle, X, Hospital } from "lucide-react";

/**
 * ChatBot Component
 * A floating AI Chatbot widget that stays fixed to the bottom-right corner.
 * Triggers an iframe containing the Streamlit-based AI Assistant.
 */
export const ChatBot = () => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleChat = () => setIsOpen(!isOpen);

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
              <span className="font-semibold text-sm">MyHealthID AI Assistant</span>
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              className="hover:bg-blue-700/50 p-1.5 rounded-full transition-colors"
              aria-label="Close Chat"
            >
              <X size={18} />
            </button>
          </div>

          {/* Iframe Content */}
          <div className="flex-1 bg-gray-50 relative">
            <iframe
              src="https://chatbot-fnfupzdr3cudxznaljjezd.streamlit.app/?embed=true"
              className="w-full h-full border-none"
              title="AI Chatbot"
              loading="lazy"
            />
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
