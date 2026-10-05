"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ShieldCheck,
  UserPlus,
  Building2,
  Check,
  Fingerprint,
  Hospital,
  Stethoscope,
  LockKeyhole,
  Activity,
  FileText,
  AlertCircle
} from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";

// Inline styles for custom animations
const customStyles = `
  @keyframes float {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-10px); }
  }
  @keyframes float-delayed {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-15px); }
  }
  @keyframes dash {
    to { stroke-dashoffset: -20; }
  }
  .animate-float { animation: float 6s ease-in-out infinite; }
  .animate-float-delayed { animation: float-delayed 8s ease-in-out infinite 1s; }
  .animate-dash { animation: dash 1s linear infinite; }
  
  @keyframes gradient-x {
    0% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
  }
  .animate-gradient-x {
    background-size: 200% auto;
    animation: gradient-x 4s linear infinite;
  }
  
  @keyframes slide-up {
    0% { transform: translateY(10px); opacity: 0; }
    100% { transform: translateY(0); opacity: 1; }
  }
  .animate-slide-up {
    animation: slide-up 0.4s ease-out forwards;
  }

  @keyframes grid-background {
    0% { background-position: 0 0; }
    100% { background-position: 40px 40px; }
  }
  .grid-background {
    background-image: 
      linear-gradient(rgba(20, 184, 166, 0.05) 1px, transparent 1px),
      linear-gradient(90deg, rgba(20, 184, 166, 0.05) 1px, transparent 1px);
    background-size: 40px 40px;
    animation: grid-background 20s linear infinite;
  }

  .glow-orb {
    filter: blur(120px);
  }
`;

export default function LandingPage() {
  const [mounted, setMounted] = useState(false);
  const { language } = useLanguage();

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="w-full font-sans overflow-x-hidden selection:bg-teal-200 dark:selection:bg-teal-500/30">
      <style dangerouslySetInnerHTML={{ __html: customStyles }} />

      {/* HERO SECTION - Full Viewport Drama */}
      <section className="relative w-full min-h-screen bg-gradient-to-br from-slate-900 via-slate-900 to-slate-900 dark:from-slate-950 dark:via-slate-950 dark:to-slate-950 flex items-center overflow-hidden transition-colors duration-300">

        {/* Animated Grid Background */}
        <div className="absolute inset-0 opacity-10 grid-background z-0" />

        {/* Animated Glowing Orbs */}
        <div className="absolute top-20 -left-48 w-96 h-96 rounded-full bg-teal-500 glow-orb opacity-20 animate-pulse z-1" />
        <div className="absolute bottom-40 right-0 w-96 h-96 rounded-full bg-emerald-600 glow-orb opacity-15 animate-pulse z-1" style={{ animationDelay: '2s' }} />

        {/* Background Image with Dark Overlay */}
        <div className="absolute inset-0 z-0">
          <Image
            src="/images/hero-bg.jpg"
            alt="Ethiopian Healthcare Professionals"
            fill
            className="object-cover opacity-30 dark:opacity-35"
            priority
          />
          {/* Dark Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-slate-900 via-slate-900/80 to-slate-900/60 dark:from-slate-950 dark:via-slate-950/80 dark:to-slate-950/60" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-slate-900/80 dark:to-slate-950/80" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full py-20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 lg:gap-8 items-center">

            {/* Left: Text & Actions */}
            <div className="lg:col-span-6 flex flex-col items-start text-left relative z-10">
              {/* Badge with Glow */}
              <div className="inline-flex items-center gap-2.5 px-5 py-3 rounded-full bg-white/10 dark:bg-white/5 backdrop-blur-md border border-teal-400/50 dark:border-teal-400/30 shadow-[0_0_20px_rgba(20,184,166,0.3)] mb-10 overflow-hidden relative">
                <div className="absolute inset-0 bg-teal-500/10 dark:bg-teal-500/5 animate-pulse" />
                <div className="relative flex items-center gap-2">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-teal-400"></span>
                  </span>
                  <span className="text-xs font-black tracking-widest text-teal-200 dark:text-teal-300 uppercase">
                    {language === 'EN' ? 'Live: Multi-Tenant Network' : 'በቀጥታ፡ የብዙ ተቋማት ኔትወርክ'}
                  </span>
                </div>
              </div>

              {/* Main Headline - Dramatic Size & Gradient */}
              <h1 className="text-7xl lg:text-8xl font-black tracking-tight leading-[1] mb-4 text-transparent bg-clip-text bg-gradient-to-r from-white via-teal-200 to-teal-400 animate-gradient-x">
                {language === 'EN' ? 'One identity.' : 'አንድ ማንነት።'}
              </h1>
              
              {/* Subheading - Bold Gradient */}
              <h2 className="text-5xl lg:text-6xl font-black tracking-tight leading-[1.1] mb-6 text-transparent bg-clip-text bg-gradient-to-r from-teal-200 via-teal-300 to-emerald-300 animate-gradient-x" style={{ animationDelay: '1s' }}>
                {language === 'EN' ? 'Connecting care seamlessly.' : 'እንክብካቤን ያለምንም እንከን ያገናኛል።'}
              </h2>

              {/* Tagline Subtitle */}
              <p className="text-xl text-teal-200/80 dark:text-teal-300/80 font-bold mb-8 max-w-lg">
                {language === 'EN' ? 'Ethiopia\'s secure, interoperable healthcare identity platform.' : 'የኢትዮጵያ ደህንነቱ የተጠበቀ የጤና እንክብካቤ ማንነት መድረጃ።'}
              </p>

              {/* Dynamic Health UI: Animated Heartbeat / EKG Line */}
              <div className="w-full max-w-sm h-12 mb-10 relative overflow-hidden flex items-center">
                <svg className="w-full h-full" viewBox="0 0 400 40" preserveAspectRatio="none">
                  <path
                    d="M 0,20 L 100,20 L 120,0 L 140,40 L 160,10 L 170,20 L 400,20"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    className="text-teal-500/30 dark:text-teal-400/30"
                  />
                  <path
                    d="M 0,20 L 100,20 L 120,0 L 140,40 L 160,10 L 170,20 L 400,20"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeDasharray="400"
                    strokeDashoffset="400"
                    className="text-teal-300 dark:text-teal-300 animate-[dash_3s_linear_infinite]"
                  />
                </svg>
                <div className="absolute right-0 w-24 h-full bg-gradient-to-l from-slate-900 dark:from-slate-950 to-transparent" />
                <div className="absolute left-0 w-8 h-full bg-gradient-to-r from-slate-900 dark:from-slate-950 to-transparent" />
              </div>

              {/* CTA Buttons - Large & Glowing */}
              <div className="flex flex-wrap items-center gap-4">
                <Link
                  href="/register"
                  className="inline-flex items-center justify-center px-10 py-5 text-base font-black rounded-2xl bg-gradient-to-r from-teal-400 to-emerald-400 text-slate-900 hover:scale-105 transition-all shadow-[0_0_30px_rgba(20,184,166,0.5)] hover:shadow-[0_0_50px_rgba(20,184,166,0.7)] duration-300"
                >
                  {language === 'EN' ? 'Get Started' : 'ይጀምሩ'}
                </Link>
                <Link
                  href="/signin"
                  className="inline-flex items-center justify-center px-10 py-5 text-base font-black rounded-2xl bg-transparent border-2 border-teal-400/60 text-teal-300 hover:border-teal-300 hover:bg-teal-400/10 transition-all shadow-[0_0_20px_rgba(20,184,166,0.3)] hover:shadow-[0_0_30px_rgba(20,184,166,0.5)] duration-300"
                >
                  {language === 'EN' ? 'Portal Sign-In' : 'ፖርታል ግባ'}
                </Link>
              </div>
            </div>

            {/* Right: Immersive Product Visual */}
            <div className="lg:col-span-6 relative h-[500px] lg:h-[600px] w-full flex items-center justify-center">

              {/* Visual SVG Connecting Lines */}
              {mounted && (
                <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }}>
                  <path
                    d="M 100,150 Q 250,150 300,300 T 500,450"
                    fill="none"
                    stroke="#14b8a6"
                    strokeWidth="2.5"
                    strokeDasharray="6 6"
                    className="animate-dash opacity-40 dark:opacity-50"
                  />
                  <path
                    d="M 100,450 Q 250,450 300,300 T 450,150"
                    fill="none"
                    stroke="#0d9488"
                    strokeWidth="2"
                    strokeDasharray="4 8"
                    className="animate-dash opacity-30 dark:opacity-40"
                  />
                </svg>
              )}

              {/* Main Identity Card (Center) - With Glow Ring */}
              <div className="absolute z-20 animate-float bg-white/95 dark:bg-slate-900/80 backdrop-blur-2xl p-6 rounded-[2rem] shadow-2xl dark:shadow-[0_0_40px_rgba(45,212,191,0.25)] border border-white/50 dark:border-teal-400/30 ring-2 ring-teal-400/50 shadow-[0_0_40px_rgba(20,184,166,0.25)] w-72 flex flex-col items-center text-center transform scale-100 lg:scale-110 transition-all hover:ring-teal-400/70">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center shadow-inner mb-5">
                  <Fingerprint className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white">Abebe Kebede</h3>
                <p className="text-teal-700 dark:text-teal-400 font-mono font-black mt-1 tracking-widest text-sm">MH-2048-8912</p>
                <div className="mt-5 inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 text-xs font-black">
                  <Check className="w-3.5 h-3.5" />
                  {language === 'EN' ? 'Identity Verified' : 'ማንነት ተረጋግጧል'}
                </div>
              </div>

              {/* Facility A Card (Top Left) - With Glow */}
              <div className="absolute z-10 top-10 left-0 lg:-left-4 animate-float-delayed bg-white/90 dark:bg-slate-900/80 backdrop-blur-xl p-4 rounded-2xl shadow-xl dark:shadow-[0_0_20px_rgba(20,184,166,0.1)] border border-teal-400/20 dark:border-teal-400/40 hover:shadow-[0_0_30px_rgba(20,184,166,0.25)] transition-all w-56">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-lg bg-gradient-to-br from-teal-100 dark:from-teal-900/50 to-teal-50 dark:to-teal-950/50">
                    <Hospital className="w-4 h-4 text-teal-700 dark:text-teal-400" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-teal-600 dark:text-teal-400 uppercase tracking-wider">
                      {language === 'EN' ? 'Source' : 'ምንጭ'}
                    </p>
                    <p className="text-sm font-black text-slate-900 dark:text-white">Facility A</p>
                  </div>
                </div>
                <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-teal-400 to-emerald-400 w-full" />
                </div>
              </div>

              {/* Facility B Card (Bottom Right) - With Glow */}
              <div className="absolute z-10 bottom-10 right-0 lg:-right-4 animate-float-delayed bg-white/90 dark:bg-slate-900/80 backdrop-blur-xl p-4 rounded-2xl shadow-xl dark:shadow-[0_0_20px_rgba(20,184,166,0.1)] border border-teal-400/20 dark:border-teal-400/40 hover:shadow-[0_0_30px_rgba(20,184,166,0.25)] transition-all w-56" style={{ animationDelay: '2s' }}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-lg bg-gradient-to-br from-teal-100 dark:from-teal-900/50 to-teal-50 dark:to-teal-950/50">
                    <Stethoscope className="w-4 h-4 text-teal-700 dark:text-teal-400" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-teal-600 dark:text-teal-400 uppercase tracking-wider">
                      {language === 'EN' ? 'Destination' : 'መዳረሻ'}
                    </p>
                    <p className="text-sm font-black text-slate-900 dark:text-white">Facility B</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-2 text-xs font-black text-teal-700 dark:text-teal-300">
                  <div className="w-2 h-2 rounded-full bg-teal-500" />
                  {language === 'EN' ? 'Patient Recognized' : 'ታካሚው ታውቋል'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* STATS BAR SECTION - New */}
      <section className="py-12 bg-slate-900 dark:bg-slate-950 border-y border-teal-900/50 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            
            {/* Stat 1: Patients */}
            <div className="flex flex-col items-center text-center group">
              <div className="text-5xl lg:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-emerald-400 mb-2 animate-shimmer bg-[length:200%_auto]">
                10,000+
              </div>
              <p className="text-slate-400 text-sm font-bold uppercase tracking-widest">
                {language === 'EN' ? 'Patients Connected' : 'ታካሚዎች ተገናኝተዋል'}
              </p>
            </div>

            {/* Stat 2: Facilities */}
            <div className="flex flex-col items-center text-center group">
              <div className="text-5xl lg:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-emerald-400 mb-2 animate-shimmer bg-[length:200%_auto]">
                50+
              </div>
              <p className="text-slate-400 text-sm font-bold uppercase tracking-widest">
                {language === 'EN' ? 'Health Facilities' : 'የጤና ተቋማት'}
              </p>
            </div>

            {/* Stat 3: Uptime */}
            <div className="flex flex-col items-center text-center group">
              <div className="text-5xl lg:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-emerald-400 mb-2 animate-shimmer bg-[length:200%_auto]">
                99.9%
              </div>
              <p className="text-slate-400 text-sm font-bold uppercase tracking-widest">
                {language === 'EN' ? 'System Uptime' : 'የስርዓት አስፈጻሚነት'}
              </p>
            </div>

            {/* Stat 4: Audit Trail */}
            <div className="flex flex-col items-center text-center group">
              <div className="text-5xl lg:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-emerald-400 mb-2 animate-shimmer bg-[length:200%_auto]">
                100%
              </div>
              <p className="text-slate-400 text-sm font-bold uppercase tracking-widest">
                {language === 'EN' ? 'Audit Trail' : 'ምልልስ መለያ'}
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* JOURNEY SECTION (Identify → Authorize → Connect) */}
      <section className="py-24 bg-slate-950 dark:bg-slate-950 relative transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-black text-white tracking-tight mb-4 relative inline-block">
              {language === 'EN' ? 'The Healthcare Journey' : 'የጤና እንክብካቤ ጉዞ'}
              <div className="h-1.5 bg-gradient-to-r from-teal-400 to-emerald-400 rounded-full w-3/4 mx-auto mt-4" />
            </h2>
          </div>

          {/* Visual Pipeline */}
          <div className="relative flex flex-col md:flex-row items-center justify-between gap-8 max-w-5xl mx-auto">
            {/* Connecting Line Desktop */}
            <div className="hidden md:block absolute top-1/2 left-0 w-full h-1 bg-gradient-to-r from-transparent via-teal-500/50 to-transparent -translate-y-1/2 z-0" />

            {/* Step 1 */}
            <div className="relative z-10 flex flex-col items-center text-center group w-full md:w-1/3">
              <div className="text-6xl font-black text-teal-500/30 mb-4">01</div>
              <div className="w-16 h-16 rounded-2xl bg-slate-900 border-2 border-teal-800/50 flex items-center justify-center shadow-sm group-hover:scale-110 group-hover:border-teal-500/70 group-hover:shadow-[0_0_30px_rgba(20,184,166,0.25)] transition-all duration-300 mb-4">
                <Fingerprint className="w-7 h-7 text-teal-400" />
              </div>
              <h3 className="text-lg font-black text-white">
                {language === 'EN' ? 'Identify' : 'ማንነት መለየት'}
              </h3>
              <p className="text-sm text-slate-400 mt-1 font-bold">
                {language === 'EN' ? 'Locate patient identity.' : 'የታካሚውን ማንነት ያግኙ።'}
              </p>
            </div>

            {/* Step 2 */}
            <div className="relative z-10 flex flex-col items-center text-center group w-full md:w-1/3">
              <div className="text-6xl font-black text-teal-500/30 mb-4">02</div>
              <div className="w-16 h-16 rounded-2xl bg-slate-900 border-2 border-teal-800/50 flex items-center justify-center shadow-sm group-hover:scale-110 group-hover:border-teal-500/70 group-hover:shadow-[0_0_30px_rgba(20,184,166,0.25)] transition-all duration-300 mb-4">
                <ShieldCheck className="w-7 h-7 text-teal-400" />
              </div>
              <h3 className="text-lg font-black text-white">
                {language === 'EN' ? 'Authorize' : 'ፍቃድ መስጠት'}
              </h3>
              <p className="text-sm text-slate-400 mt-1 font-bold">
                {language === 'EN' ? 'Control record access.' : 'የመዝገብ መዳረሻን ይቆጣጠሩ።'}
              </p>
            </div>

            {/* Step 3 */}
            <div className="relative z-10 flex flex-col items-center text-center group w-full md:w-1/3">
              <div className="text-6xl font-black text-teal-500/30 mb-4">03</div>
              <div className="w-16 h-16 rounded-2xl bg-slate-900 border-2 border-teal-800/50 flex items-center justify-center shadow-sm group-hover:scale-110 group-hover:border-teal-500/70 group-hover:shadow-[0_0_30px_rgba(20,184,166,0.25)] transition-all duration-300 mb-4">
                <Activity className="w-7 h-7 text-teal-400" />
              </div>
              <h3 className="text-lg font-black text-white">
                {language === 'EN' ? 'Connect' : 'ማገናኘት'}
              </h3>
              <p className="text-sm text-slate-400 mt-1 font-bold">
                {language === 'EN' ? 'Deliver coordinated care.' : 'የተቀናጀ እንክብካቤን ያቅርቡ።'}
              </p>
            </div>
          </div>

        </div>
      </section>

      {/* BREAK-GLASS SECTION (Medical Record Access) */}
      <section className="py-24 bg-slate-950 border-t border-slate-900 relative overflow-hidden transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

            {/* Left: Interactive-looking UI representation - Dark Card with Glow */}
            <div className="relative p-6 sm:p-8 bg-slate-900 dark:bg-slate-900/80 rounded-[2rem] border border-slate-700 dark:border-slate-700 shadow-2xl group hover:shadow-[0_0_30px_rgba(20,184,166,0.1)] transition-all">
              <div className="flex items-center justify-between mb-8 pb-6 border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <FileText className="w-6 h-6 text-teal-400" />
                  <h3 className="text-lg font-black text-white">
                    {language === 'EN' ? 'Medical Record Access' : 'የህክምና መዝገብ መዳረሻ'}
                  </h3>
                </div>
                <span className="px-3 py-1 bg-slate-800 dark:bg-slate-700 border border-slate-700 dark:border-slate-600 text-slate-300 rounded-full text-xs font-black">
                  Facility B
                </span>
              </div>

              <div className="bg-rose-950/40 dark:bg-rose-950/50 border border-rose-900/60 dark:border-rose-900/70 rounded-2xl p-6 mb-6 transition-colors group-hover:border-rose-800">
                <div className="flex items-center gap-3 mb-2">
                  <AlertCircle className="w-5 h-5 text-rose-400" />
                  <p className="text-sm font-black text-rose-300">
                    {language === 'EN' ? 'Authorization Required' : 'ማረጋገጫ ያስፈልጋል'}
                  </p>
                </div>
                <p className="text-sm text-rose-200/80 font-bold">
                  {language === 'EN'
                    ? 'Patient was registered at Facility A. Emergency access requires justification and will be permanently audited.'
                    : 'ታካሚው በሌላ ተቋም ተመዝግቧል። አስቸኳይ መዳረሻ ምክንያት ይፈልጋል እና በቋሚነት ይመዘገባል።'}
                </p>
              </div>

              <div className="w-full py-4 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 text-white flex items-center justify-center gap-2 font-black text-sm shadow-lg hover:shadow-[0_0_20px_rgba(20,184,166,0.3)] transition-all cursor-default">
                <LockKeyhole className="w-4 h-4" />
                {language === 'EN' ? 'Request Access' : 'መዳረሻ ይጠይቁ'}
              </div>
            </div>

            {/* Right: Explanation */}
            <div className="flex flex-col items-start text-left">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center mb-6 shadow-lg shadow-teal-500/30">
                <LockKeyhole className="w-7 h-7 text-white" />
              </div>
              <h2 className="text-4xl lg:text-5xl font-black text-white tracking-tight mb-4">
                {language === 'EN' ? 'Finding identity ≠ Accessing records.' : 'ማንነትን ማግኘት ≠ መዝገቦችን መድረስ።'}
              </h2>
              <p className="text-lg text-slate-300 mb-8 font-bold leading-relaxed">
                {language === 'EN'
                  ? 'MyHealthID enforces strict data sovereignty. Recognizing a patient across facilities is seamless, but accessing their clinical history requires explicit, audited Break-Glass authorization.'
                  : 'ማይሄልዝአይዲ ጥብቅ የመረጃ ደህንነትን ያስከብራል። ታካሚን ማወቅ ቀላል ቢሆንም፣ የህክምና ታሪካቸውን ለመድረስ ጥብቅ ማረጋገጫ ያስፈልጋል።'}
              </p>
              <div className="flex flex-col gap-5">
                <div className="flex items-center gap-4 text-base font-black text-slate-200">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-teal-500/20 border border-teal-500/50">
                    <Check className="w-4 h-4 text-teal-400" />
                  </div>
                  {language === 'EN' ? 'Patient identity is portable.' : 'የታካሚ ማንነት ከቦታ ቦታ ሊንቀሳቀስ ይችላል።'}
                </div>
                <div className="flex items-center gap-4 text-base font-black text-slate-200">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-teal-500/20 border border-teal-500/50">
                    <Check className="w-4 h-4 text-teal-400" />
                  </div>
                  {language === 'EN' ? 'Medical records are isolated.' : 'የህክምና መዝገቦች ተነጥለው ተቀምጠዋል።'}
                </div>
                <div className="flex items-center gap-4 text-base font-black text-slate-200">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-teal-500/20 border border-teal-500/50">
                    <Check className="w-4 h-4 text-teal-400" />
                  </div>
                  {language === 'EN' ? 'Cross-facility access is logged.' : 'የተቋማት መካከል መዳረሻ ይመዘገባል።'}
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ABOUT US SECTION */}
      <section id="about" className="py-24 bg-gradient-to-b from-slate-900 to-teal-950 relative transition-colors duration-300">
        <div className="absolute inset-0 opacity-5" style={{
          backgroundImage: 'radial-gradient(circle at 20% 50%, #14b8a6 0%, transparent 50%)',
          pointerEvents: 'none'
        }} />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          {/* Decorative Line */}
          <div className="w-20 h-1 bg-gradient-to-r from-transparent via-teal-400 to-transparent mx-auto mb-8" />
          
          <h2 className="text-4xl lg:text-5xl font-black text-white tracking-tight mb-8">
            {language === 'EN' ? 'About Us' : 'ስለ እኛ'}
          </h2>
          <p className="max-w-3xl mx-auto text-xl text-slate-300 font-bold leading-relaxed">
            {language === 'EN'
              ? 'MyHealthID is Ethiopia\'s National Electronic Health Record (EHR) Identity system. We are committed to modernizing the healthcare sector by creating a secure, interoperable platform where patients own their medical identity and facilities can share critical information safely.'
              : 'ማይሄልዝአይዲ የኢትዮጵያ ብሄራዊ የኤሌክትሮኒክ የጤና መዝገብ (EHR) የማንነት ስርዓት ነው። ታካሚዎች የራሳቸውን የህክምና ማንነት በባለቤትነት የሚይዙበት እና ተቋማት ደህንነቱ በተጠበቀ ሁኔታ መረጃ የሚለዋወጡበትን ስርዓት ለመፍጠር ቆርጠናል።'}
          </p>
        </div>
      </section>

      {/* CONTACT SECTION */}
      <section id="contact" className="py-24 bg-slate-950 relative transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-12">
            <h2 className="text-4xl lg:text-5xl font-black text-white tracking-tight mb-6">
              {language === 'EN' ? 'Contact Us' : 'ያግኙን'}
            </h2>
            <p className="max-w-xl mx-auto text-lg text-slate-300 font-bold leading-relaxed">
              {language === 'EN'
                ? 'Have questions about MyHealthID or need support for your facility? Reach out to our technical team.'
                : 'ስለ ማይሄልዝአይዲ ጥያቄዎች ካሉዎት ወይም ለተቋምዎ ድጋፍ ከፈለጉ፣ የቴክኒክ ቡድናችንን ያነጋግሩ።'}
            </p>
          </div>

          {/* CTA Card */}
          <div className="max-w-2xl mx-auto bg-slate-900 border border-teal-700/50 p-12 rounded-3xl shadow-[0_0_60px_rgba(20,184,166,0.1)] hover:shadow-[0_0_80px_rgba(20,184,166,0.15)] transition-all">
            <div className="flex flex-col sm:flex-row items-center justify-center gap-8 mb-8">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center">
                  <AlertCircle className="w-6 h-6 text-white" />
                </div>
                <div className="text-left">
                  <p className="text-xs text-slate-400 font-bold uppercase">Email</p>
                  <span className="text-white font-black">support@myhealthid.gov.et</span>
                </div>
              </div>
              <div className="hidden sm:block w-px h-12 bg-teal-700/30" />
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center">
                  <Activity className="w-6 h-6 text-white" />
                </div>
                <div className="text-left">
                  <p className="text-xs text-slate-400 font-bold uppercase">Phone</p>
                  <span className="text-white font-black">+251 11 111 1111</span>
                </div>
              </div>
            </div>
            
            <Link
              href="/partnership"
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-teal-500 to-emerald-600 text-white font-black text-center shadow-lg shadow-teal-500/30 hover:shadow-[0_0_30px_rgba(20,184,166,0.5)] transition-all hover:scale-105"
            >
              {language === 'EN' ? 'Partner With Us' : 'አብረን እንስራ'}
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
}
