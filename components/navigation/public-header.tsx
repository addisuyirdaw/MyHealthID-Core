"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Menu, X, ShieldCheck, LayoutDashboard, UserCheck, BotMessageSquare } from "lucide-react";
import { LogoIcon } from "@/components/LogoIcon";
import { useLanguage } from "@/components/LanguageProvider";
import { useChatContext } from "@/components/ai/chat-context";

interface PublicHeaderProps {
  userRole?: string;
  citizenPatientId?: string;
}

export default function PublicHeader({ userRole, citizenPatientId }: PublicHeaderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { language, setLanguage } = useLanguage();
  const { openChat } = useChatContext();

  const toggleMenu = () => setIsOpen(!isOpen);

  // Localized navigation items
  const navItems = [
    { label: language === "EN" ? "Home" : "መነሻ", href: "/" },
    { label: language === "EN" ? "About" : "ስለ እኛ", href: "/#about" },
    { label: language === "EN" ? "Our Services" : "አገልግሎቶቻችን", href: "/#services" },
    { label: language === "EN" ? "System Scope" : "የስርዓት ይዘት", href: "/#scope" },
    { label: language === "EN" ? "Contact" : "እውቂያ", href: "/#contact" },
  ];

  // Dynamic Login / Dashboard Button Logic
  let loginButtonLabel = language === "EN" ? "Portal Login" : "ፖርታል ግባ";
  let loginButtonHref = "/login";
  let LoginIcon = ShieldCheck;

  if (userRole) {
    if (userRole === "CITIZEN" && citizenPatientId) {
      loginButtonLabel = language === "EN" ? "My Health Records" : "የጤና መዝገቦቼ";
      loginButtonHref = `/patients/${citizenPatientId}/clinical-records`;
      LoginIcon = UserCheck;
    } else {
      loginButtonLabel = language === "EN" ? "Dashboard" : "ዳሽቦርድ";
      loginButtonHref = "/portal"; // Staff lands on portal, then picks their login
      LoginIcon = LayoutDashboard;
    }
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-neutral-900 bg-neutral-950/80 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="bg-neutral-900 border border-neutral-800 p-1.5 rounded-xl shadow-md transition duration-300 group-hover:scale-105">
            <LogoIcon className="w-7 h-7" />
          </div>
          <span className="text-xl font-black tracking-tight text-white">
            MyHealth<span className="text-blue-500">ID</span>
          </span>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-8">
          {navItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="text-sm font-semibold text-neutral-400 hover:text-white transition duration-200"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Desktop Actions */}
        <div className="hidden md:flex items-center gap-3">
          {/* Custom Sleek Language Selector */}
          <div className="flex bg-neutral-900 border border-neutral-800 p-0.5 rounded-lg">
            <button
              onClick={() => setLanguage("EN")}
              className={`px-2 py-1 rounded-md text-[10px] font-bold transition-all ${
                language === "EN"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-neutral-400 hover:text-neutral-200"
              }`}
            >
              EN
            </button>
            <button
              onClick={() => setLanguage("AM")}
              className={`px-2 py-1 rounded-md text-[10px] font-bold transition-all ${
                language === "AM"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-neutral-400 hover:text-neutral-200"
              }`}
            >
              አማርኛ
            </button>
          </div>

          {/* AI Assistant Header Trigger */}
          <button
            id="header-ai-assistant-btn"
            onClick={openChat}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold bg-gradient-to-r from-violet-600 to-blue-600 hover:opacity-90 text-white rounded-lg transition-all shadow-md active:scale-95 cursor-pointer"
            aria-label="Open AI Assistant"
          >
            <BotMessageSquare className="w-3.5 h-3.5" />
            AI Assistant
          </button>

          {/* Unified System Actions Button Group */}
          <div className="flex bg-neutral-900 border border-neutral-800 p-0.5 rounded-lg gap-1">
            <Link href="/register">
              <button className="px-2.5 py-1 rounded-md text-[10px] font-bold bg-transparent text-neutral-400 hover:text-white hover:bg-neutral-800 transition-all cursor-pointer">
                Register Citizen
              </button>
            </Link>
            <Link href="/register-facility">
              <button className="px-2.5 py-1 rounded-md text-[10px] font-bold bg-transparent text-neutral-400 hover:text-white hover:bg-neutral-800 transition-all cursor-pointer">
                Onboard Hospital
              </button>
            </Link>
            <Link href={loginButtonHref}>
              <button className="px-2.5 py-1 rounded-md text-[10px] font-bold bg-transparent text-neutral-400 hover:text-white hover:bg-neutral-800 transition-all cursor-pointer">
                {loginButtonLabel}
              </button>
            </Link>
          </div>
        </div>

        {/* Mobile Hamburger Toggle */}
        <button
          onClick={toggleMenu}
          className="md:hidden p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-900 transition"
          aria-label="Toggle navigation menu"
        >
          {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Drawer Overlay & Content */}
      <div
        className={`fixed inset-x-0 top-16 z-40 w-full bg-neutral-950/95 backdrop-blur-md md:hidden transition-all duration-300 ease-in-out border-b border-neutral-900 ${
          isOpen ? "h-[calc(100vh-4rem)] opacity-100 pointer-events-auto" : "h-0 opacity-0 pointer-events-none overflow-hidden"
        }`}
      >
        <div className="flex flex-col p-6 space-y-6">
          <nav className="flex flex-col space-y-4">
            {navItems.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className="text-lg font-bold text-neutral-300 hover:text-white transition"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="border-t border-neutral-900 pt-6 flex flex-col gap-4">
            {/* Language Selector */}
            <div className="flex justify-between items-center bg-neutral-900 border border-neutral-800 p-1.5 rounded-xl">
              <span className="text-xs font-bold text-neutral-400">
                {language === "EN" ? "Select Language" : "ቋንቋ ይምረጡ"}
              </span>
              <div className="flex gap-1.5">
                <button
                  onClick={() => setLanguage("EN")}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                    language === "EN"
                      ? "bg-blue-600 text-white shadow-sm"
                      : "text-neutral-400"
                  }`}
                >
                  EN
                </button>
                <button
                  onClick={() => setLanguage("AM")}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                    language === "AM"
                      ? "bg-blue-600 text-white shadow-sm"
                      : "text-neutral-400"
                  }`}
                >
                  አማርኛ
                </button>
              </div>
            </div>

            {/* Mobile AI Assistant Button */}
            <button
              id="mobile-ai-assistant-btn"
              onClick={() => { openChat(); setIsOpen(false); }}
              className="w-full h-12 flex items-center justify-center gap-2 bg-gradient-to-r from-violet-600 to-blue-600 text-white font-bold rounded-xl transition shadow-lg shadow-violet-900/20"
            >
              <BotMessageSquare className="w-4 h-4" />
              {language === "EN" ? "AI Assistant" : "AI ረዳት"}
            </button>

            <div className="flex flex-col gap-2">
              <Link href="/register" onClick={() => setIsOpen(false)}>
                <button className="w-full h-12 flex items-center justify-center gap-2 bg-neutral-900 hover:bg-neutral-850 text-white font-bold rounded-xl border border-neutral-800 transition cursor-pointer">
                  Register Citizen
                </button>
              </Link>
              <Link href="/register-facility" onClick={() => setIsOpen(false)}>
                <button className="w-full h-12 flex items-center justify-center gap-2 bg-neutral-900 hover:bg-neutral-850 text-white font-bold rounded-xl border border-neutral-800 transition cursor-pointer">
                  Onboard Hospital
                </button>
              </Link>
              <Link href={loginButtonHref} onClick={() => setIsOpen(false)}>
                <button className="w-full h-12 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition cursor-pointer">
                  <LoginIcon className="w-4 h-4 text-white" />
                  {loginButtonLabel}
                </button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
