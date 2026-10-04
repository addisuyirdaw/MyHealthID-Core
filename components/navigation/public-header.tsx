"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { 
  ChevronDown, 
  Menu, 
  X, 
  ShieldCheck, 
  LayoutDashboard, 
  UserCheck, 
  Building,
  Users,
  Moon,
  Sun
} from "lucide-react";
import { LogoIcon } from "@/components/LogoIcon";
import { useLanguage } from "@/components/LanguageProvider";

interface PublicHeaderProps {
  userRole?: string;
  citizenPatientId?: string;
}

export default function PublicHeader({ userRole, citizenPatientId }: PublicHeaderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isMobileAccordionOpen, setIsMobileAccordionOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isDark, setIsDark] = useState(false);
  
  const { language, setLanguage } = useLanguage();
  const dropdownRef = useRef<HTMLDivElement>(null);

  const toggleMenu = () => setIsOpen(!isOpen);

  // Initialize theme from document element
  useEffect(() => {
    setIsDark(document.documentElement.classList.contains('dark'));
  }, []);

  const toggleTheme = () => {
    if (isDark) {
      document.documentElement.classList.remove('dark');
      setIsDark(false);
    } else {
      document.documentElement.classList.add('dark');
      setIsDark(true);
    }
  };

  // Scroll handler to make the header background solid and add shadow on scroll
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 0);
    };
    
    handleScroll();
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Localized navigation items
  const navItems = [
    { label: language === "EN" ? "Home" : "መነሻ", href: "/" },
    { label: language === "EN" ? "About Us" : "ስለ እኛ", href: "/#about" },
    { label: language === "EN" ? "Contact Us" : "እውቂያ", href: "/#contact" },
  ];

  // Dynamic Login / Dashboard Button Logic
  let loginButtonLabel = language === "EN" ? "Portal Sign In" : "ፖርታል ግባ";
  let loginButtonHref = "/login";
  let LoginIcon = ShieldCheck;

  if (userRole) {
    if (userRole === "CITIZEN" && citizenPatientId) {
      loginButtonLabel = language === "EN" ? "My Health Records" : "የጤና መዝገቦቼ";
      loginButtonHref = `/patients/${citizenPatientId}/clinical-records`;
      LoginIcon = UserCheck;
    } else {
      loginButtonLabel = language === "EN" ? "Dashboard" : "ዳሽቦርድ";
      loginButtonHref = "/portal";
      LoginIcon = LayoutDashboard;
    }
  }

  return (
    <header className={`fixed top-0 left-0 z-50 w-full transition-all duration-200 ${
      isScrolled 
        ? "bg-white/95 dark:bg-neutral-950/95 backdrop-blur-xl border-b border-stone-200 dark:border-neutral-800 shadow-sm" 
        : "bg-[#FBF9F5]/80 dark:bg-neutral-950/80 backdrop-blur-md border-b border-transparent dark:border-transparent"
    }`}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="bg-teal-700 p-1.5 rounded-xl shadow-md shadow-teal-900/20 transition duration-300 group-hover:scale-105">
            <LogoIcon className="w-7 h-7 text-white" />
          </div>
          <span className="text-xl font-black tracking-tight text-slate-900 dark:text-white">
            MyHealth<span className="text-teal-600">ID</span>
          </span>
        </Link>

        {/* Desktop Navigation links & Portal dropdown */}
        <nav className="hidden md:flex items-center gap-8">
          {navItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="text-sm font-semibold text-stone-600 dark:text-neutral-300 hover:text-slate-900 dark:hover:text-white transition duration-200"
            >
              {item.label}
            </Link>
          ))}

          {/* Access Portals Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              onMouseEnter={() => setIsDropdownOpen(true)}
              className="flex items-center gap-1.5 text-sm font-semibold text-stone-600 dark:text-neutral-300 hover:text-slate-900 dark:hover:text-white transition duration-205 cursor-pointer"
            >
              <span>{language === "EN" ? "Access Portals" : "ፖርታል ግባ"}</span>
              <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isDropdownOpen ? "rotate-180" : ""}`} />
            </button>

            {/* Dropdown Panel */}
            {isDropdownOpen && (
              <div 
                className="absolute left-0 mt-2.5 w-56 rounded-xl bg-white dark:bg-neutral-900 border border-stone-200 dark:border-neutral-800 shadow-2xl p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-205"
                onMouseLeave={() => setIsDropdownOpen(false)}
              >
                <Link href="/register" className="block">
                  <span className="flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-bold text-slate-700 dark:text-neutral-300 hover:text-teal-700 dark:hover:text-white hover:bg-stone-50 dark:hover:bg-neutral-800 rounded-lg transition-colors cursor-pointer">
                    <Users className="w-4 h-4 text-teal-600 dark:text-blue-500" />
                    {language === "EN" ? "Register Citizen" : "ዜጋ መዝግብ"}
                  </span>
                </Link>
                <Link href="/apply-for-facility" className="block">
                  <span className="flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-bold text-slate-700 dark:text-neutral-300 hover:text-teal-700 dark:hover:text-white hover:bg-stone-50 dark:hover:bg-neutral-800 rounded-lg transition-colors cursor-pointer">
                    <Building className="w-4 h-4 text-teal-600 dark:text-purple-500" />
                    {language === "EN" ? "Onboard Hospital" : "ሆስፒታል መዝግብ"}
                  </span>
                </Link>
                <div className="border-t border-stone-100 dark:border-neutral-800 my-1.5" />
                <Link href={loginButtonHref} className="block">
                  <span className="flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-bold text-slate-700 dark:text-neutral-200 hover:text-teal-700 dark:hover:text-white hover:bg-stone-50 dark:hover:bg-teal-900/40 rounded-lg transition-colors cursor-pointer">
                    <LoginIcon className="w-4 h-4 text-teal-600 dark:text-emerald-500" />
                    {loginButtonLabel}
                  </span>
                </Link>
              </div>
            )}
          </div>
        </nav>

        {/* Desktop Right Actions: Theme Toggle + Language Selector */}
        <div className="hidden md:flex items-center gap-3">
          <button 
            onClick={toggleTheme}
            className="p-1.5 rounded-lg text-stone-500 dark:text-neutral-400 hover:bg-stone-200 dark:hover:bg-neutral-800 transition-colors"
            aria-label="Toggle theme"
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <div className="flex bg-stone-100 dark:bg-neutral-900 border border-stone-200 dark:border-neutral-800 p-0.5 rounded-lg shadow-sm">
            <button
              onClick={() => setLanguage("EN")}
              className={`px-2 py-1 rounded-md text-[10px] font-bold transition-all ${
                language === "EN"
                  ? "bg-white dark:bg-blue-600 text-slate-900 dark:text-white shadow-sm border border-stone-200 dark:border-transparent"
                  : "text-stone-500 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-neutral-200"
              }`}
            >
              EN
            </button>
            <button
              onClick={() => setLanguage("AM")}
              className={`px-2 py-1 rounded-md text-[10px] font-bold transition-all ${
                language === "AM"
                  ? "bg-white dark:bg-blue-600 text-slate-900 dark:text-white shadow-sm border border-stone-200 dark:border-transparent"
                  : "text-stone-500 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-neutral-200"
              }`}
            >
              አማርኛ
            </button>
          </div>
        </div>

        {/* Mobile Actions Zone */}
        <div className="flex items-center gap-2.5 md:hidden">
          <button 
            onClick={toggleTheme}
            className="p-1.5 rounded-lg text-stone-500 dark:text-neutral-400 hover:bg-stone-200 dark:hover:bg-neutral-800 transition-colors"
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <div className="flex bg-stone-100 dark:bg-neutral-900 border border-stone-200 dark:border-neutral-800 p-0.5 rounded-md text-[9px] font-bold">
            <button 
              onClick={() => setLanguage(language === "EN" ? "AM" : "EN")}
              className="px-1.5 py-0.5 text-stone-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
            >
              {language}
            </button>
          </div>

          <button
            onClick={toggleMenu}
            className="p-2 rounded-lg text-stone-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-neutral-900 transition cursor-pointer"
            aria-label="Toggle navigation menu"
          >
            {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

      </div>

      {/* Mobile Drawer Overlay & Content */}
      {isOpen && (
        <div className="fixed inset-x-0 top-16 z-40 w-full bg-white/95 dark:bg-neutral-950/95 backdrop-blur-md md:hidden border-b border-stone-200 dark:border-neutral-900 animate-in fade-in duration-200">
          <div className="flex flex-col p-6 space-y-6">
            <nav className="flex flex-col space-y-4">
              {navItems.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className="text-lg font-bold text-slate-900 dark:text-neutral-300 hover:text-teal-700 dark:hover:text-white transition"
                >
                  {item.label}
                </Link>
              ))}

              {/* Mobile Collapsible Accordion for Portals */}
              <div className="border-t border-stone-200 dark:border-neutral-900 pt-4 space-y-3">
                <button
                  onClick={() => setIsMobileAccordionOpen(!isMobileAccordionOpen)}
                  className="flex items-center justify-between w-full text-left text-lg font-bold text-slate-900 dark:text-neutral-300 hover:text-teal-700 dark:hover:text-white cursor-pointer"
                >
                  <span>{language === "EN" ? "Access Portals" : "ፖርታል ግባ"}</span>
                  <ChevronDown className={`w-5 h-5 transition-transform duration-200 ${isMobileAccordionOpen ? "rotate-180" : ""}`} />
                </button>

                {isMobileAccordionOpen && (
                  <div className="pl-4 flex flex-col gap-3.5 pt-2 animate-in slide-in-from-top-1 duration-200">
                    <Link href="/register" onClick={() => setIsOpen(false)}>
                      <span className="flex items-center gap-2.5 text-sm font-semibold text-stone-600 dark:text-neutral-400 hover:text-teal-700 dark:hover:text-white cursor-pointer">
                        <Users className="w-4 h-4 text-teal-600 dark:text-blue-500" />
                        {language === "EN" ? "Register Citizen" : "ዜጋ መዝግብ"}
                      </span>
                    </Link>
                    <Link href="/apply-for-facility" onClick={() => setIsOpen(false)}>
                      <span className="flex items-center gap-2.5 text-sm font-semibold text-stone-600 dark:text-neutral-400 hover:text-teal-700 dark:hover:text-white cursor-pointer">
                        <Building className="w-4 h-4 text-teal-600 dark:text-purple-500" />
                        {language === "EN" ? "Onboard Hospital" : "ሆስፒታል መዝግብ"}
                      </span>
                    </Link>
                    <Link href={loginButtonHref} onClick={() => setIsOpen(false)}>
                      <span className="flex items-center gap-2.5 text-sm font-semibold text-slate-900 dark:text-neutral-200 hover:text-teal-700 dark:hover:text-white cursor-pointer">
                        <LoginIcon className="w-4 h-4 text-teal-600 dark:text-emerald-500" />
                        {loginButtonLabel}
                      </span>
                    </Link>
                  </div>
                )}
              </div>
            </nav>
          </div>
        </div>
      )}
    </header>
  );
}
