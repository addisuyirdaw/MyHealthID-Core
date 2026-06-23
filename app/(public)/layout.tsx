import React from "react";
import { cookies } from "next/headers";
import PublicHeader from "@/components/navigation/public-header";
import { FloatingChatBot } from "@/components/ai/floating-chat-bot";
import { ChatProvider } from "@/components/ai/chat-context";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = cookies();
  const userRole = cookieStore.get("userRole")?.value;
  const citizenPatientId = cookieStore.get("citizenPatientId")?.value;

  return (
    <ChatProvider>
      <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col justify-between">
        {/* Sticky Navigation Header */}
        <PublicHeader userRole={userRole} citizenPatientId={citizenPatientId} />
        
        {/* Main Content Area */}
        <main className="flex-1 w-full relative">
          {children}
        </main>
        
        {/* Below-the-fold Footer */}
        <footer className="border-t border-neutral-900 bg-neutral-950 py-12 text-center text-xs text-neutral-500">
          <div className="max-w-5xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
            <p>© {new Date().getFullYear()} MyHealthID. All rights reserved. Ethiopia&apos;s National Health Portal.</p>
            <div className="flex gap-6 font-semibold">
              <a href="#about" className="hover:text-neutral-300 transition">About</a>
              <a href="#services" className="hover:text-neutral-300 transition">Services</a>
              <a href="#contact" className="hover:text-neutral-300 transition">Contact</a>
            </div>
          </div>
        </footer>

        {/* Floating AI Chatbot Widget — always visible on public pages */}
        <FloatingChatBot />
      </div>
    </ChatProvider>
  );
}
