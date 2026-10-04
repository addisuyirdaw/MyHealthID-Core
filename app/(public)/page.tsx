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

      {/* HERO SECTION - Image Immersive */}
      <section className="relative w-full bg-[#FBF9F5] dark:bg-neutral-950 pt-12 pb-24 lg:pt-20 lg:pb-32 lg:min-h-[750px] flex items-center overflow-hidden transition-colors duration-300">

        {/* Background Image (Real Healthcare Show) */}
        <div className="absolute inset-0 z-0">
          <Image
            src="/images/hero-bg.jpg"
            alt="Ethiopian Healthcare Professionals"
            fill
            className="object-cover opacity-15 dark:opacity-20"
            priority
          />
          {/* Gradient Overlays to ensure text remains readable */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#FBF9F5] via-[#FBF9F5]/80 to-transparent dark:from-neutral-950 dark:via-neutral-950/80 dark:to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#FBF9F5] dark:to-neutral-950" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 lg:gap-8 items-center">

            {/* Left: Text & Actions */}
            <div className="lg:col-span-6 flex flex-col items-start text-left relative z-10 pt-8 lg:pt-0">
              <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-white/90 dark:bg-neutral-900/90 backdrop-blur-md border border-stone-200 dark:border-neutral-700 shadow-sm mb-10 overflow-hidden relative">
                <div className="absolute inset-0 bg-teal-500/10 dark:bg-teal-500/20 animate-pulse" />
                <div className="relative flex items-center gap-2">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-teal-500"></span>
                  </span>
                  <span className="text-xs font-bold tracking-wide text-slate-800 dark:text-neutral-200 uppercase">
                    {language === 'EN' ? 'Live: Multi-Tenant Network' : 'በቀጥታ፡ የብዙ ተቋማት ኔትወርክ'}
                  </span>
                </div>
              </div>

              <h1 className="text-6xl lg:text-[5.5rem] font-black tracking-tight leading-[1] mb-2 drop-shadow-sm text-transparent bg-clip-text bg-gradient-to-r from-slate-900 via-teal-700 to-slate-900 dark:from-white dark:via-teal-300 dark:to-white animate-gradient-x">
                {language === 'EN' ? 'One identity.' : 'አንድ ማንነት።'}
              </h1>
              
              <h2 className="text-4xl lg:text-5xl font-black tracking-tight leading-[1.1] mb-8 drop-shadow-sm flex flex-wrap items-center gap-x-3 text-transparent bg-clip-text bg-gradient-to-r from-slate-800 via-teal-600 to-slate-800 dark:from-neutral-200 dark:via-teal-400 dark:to-neutral-200 animate-gradient-x" style={{ animationDelay: '1s' }}>
                {language === 'EN' ? 'Connecting care seamlessly.' : 'እንክብካቤን ያለምንም እንከን ያገናኛል።'}
              </h2>

              {/* Dynamic Health UI: Animated Heartbeat / EKG Line */}
              <div className="w-full max-w-sm h-12 mb-10 relative overflow-hidden flex items-center">
                <svg className="w-full h-full" viewBox="0 0 400 40" preserveAspectRatio="none">
                  <path
                    d="M 0,20 L 100,20 L 120,0 L 140,40 L 160,10 L 170,20 L 400,20"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    className="text-teal-500/50 dark:text-teal-400/50"
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
                    className="text-teal-600 dark:text-teal-400 animate-[dash_3s_linear_infinite]"
                  />
                </svg>
                <div className="absolute right-0 w-24 h-full bg-gradient-to-l from-[#FBF9F5] dark:from-neutral-950 to-transparent" />
                <div className="absolute left-0 w-8 h-full bg-gradient-to-r from-[#FBF9F5] dark:from-neutral-950 to-transparent" />
              </div>

              <div className="flex flex-wrap items-center gap-4 mt-8">
                <Link
                  href="/register"
                  className="inline-flex items-center justify-center px-8 py-4 text-base font-bold rounded-full bg-teal-700 dark:bg-teal-500 text-white hover:bg-teal-800 dark:hover:bg-teal-400 transition-all shadow-lg shadow-teal-900/20 dark:shadow-teal-900/40 hover:shadow-xl hover:-translate-y-1"
                >
                  {language === 'EN' ? 'Get Started' : 'ይጀምሩ'}
                </Link>
                <Link
                  href="/signin"
                  className="inline-flex items-center justify-center px-8 py-4 text-base font-bold rounded-full bg-white dark:bg-neutral-800/80 backdrop-blur-sm text-slate-900 dark:text-white border border-stone-200 dark:border-neutral-600 hover:border-stone-300 dark:hover:border-neutral-500 hover:bg-stone-50 dark:hover:bg-neutral-800 transition-all shadow-sm hover:shadow hover:-translate-y-1"
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
                    stroke="#0f766e"
                    strokeWidth="2.5"
                    strokeDasharray="6 6"
                    className="animate-dash opacity-40 dark:stroke-[#2dd4bf] dark:opacity-50"
                  />
                  <path
                    d="M 100,450 Q 250,450 300,300 T 450,150"
                    fill="none"
                    stroke="#78716c"
                    strokeWidth="2"
                    strokeDasharray="4 8"
                    className="animate-dash opacity-40 dark:stroke-[#52525b]"
                  />
                </svg>
              )}

              {/* Main Identity Card (Center) */}
              <div className="absolute z-20 animate-float bg-white/95 dark:bg-white backdrop-blur-2xl p-6 rounded-[2rem] shadow-2xl dark:shadow-[0_0_40px_rgba(45,212,191,0.15)] border border-white/50 dark:border-neutral-100 w-72 flex flex-col items-center text-center transform scale-100 lg:scale-110">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-500 to-teal-700 flex items-center justify-center shadow-inner mb-5">
                  <Fingerprint className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-black text-slate-900">Abebe Kebede</h3>
                <p className="text-teal-700 font-mono font-bold mt-1 tracking-widest text-sm">MH-2048-8912</p>
                <div className="mt-5 inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs font-bold">
                  <Check className="w-3.5 h-3.5" />
                  {language === 'EN' ? 'Identity Verified' : 'ማንነት ተረጋግጧል'}
                </div>
              </div>

              {/* Facility A Card (Top Left) */}
              <div className="absolute z-10 top-10 left-0 lg:-left-4 animate-float-delayed bg-white/90 dark:bg-white backdrop-blur-xl p-4 rounded-2xl shadow-xl border border-stone-200 dark:border-neutral-100 w-56">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-lg bg-stone-100 dark:bg-neutral-100">
                    <Hospital className="w-4 h-4 text-stone-600 dark:text-neutral-600" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-stone-500 dark:text-neutral-400 uppercase tracking-wider">
                      {language === 'EN' ? 'Source' : 'ምንጭ'}
                    </p>
                    <p className="text-sm font-bold text-slate-900">Facility A</p>
                  </div>
                </div>
                <div className="h-1.5 w-full bg-stone-100 dark:bg-neutral-100 rounded-full overflow-hidden">
                  <div className="h-full bg-stone-300 dark:bg-neutral-300 w-full" />
                </div>
              </div>

              {/* Facility B Card (Bottom Right) */}
              <div className="absolute z-10 bottom-10 right-0 lg:-right-4 animate-float-delayed bg-white/90 dark:bg-white backdrop-blur-xl p-4 rounded-2xl shadow-xl border border-stone-200 dark:border-neutral-100 w-56" style={{ animationDelay: '2s' }}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-lg bg-teal-50">
                    <Stethoscope className="w-4 h-4 text-teal-600" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-teal-600 uppercase tracking-wider">
                      {language === 'EN' ? 'Destination' : 'መዳረሻ'}
                    </p>
                    <p className="text-sm font-bold text-slate-900">Facility B</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-2 text-xs font-bold text-slate-700">
                  <div className="w-2 h-2 rounded-full bg-teal-500" />
                  {language === 'EN' ? 'Patient Recognized' : 'ታካሚው ታውቋል'}
                </div>
              </div>



            </div>
          </div>
        </div>
      </section>

      {/* VISUAL PRODUCT STORY (IDENTIFY -> AUTHORIZE -> CONNECT) */}
      <section className="py-24 bg-white dark:bg-[#0a0a0a] relative transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          <div className="text-center mb-16">
            <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              {language === 'EN' ? 'The Healthcare Journey' : 'የጤና እንክብካቤ ጉዞ'}
            </h2>
          </div>

          {/* Visual Pipeline */}
          <div className="relative flex flex-col md:flex-row items-center justify-between gap-8 max-w-5xl mx-auto">
            {/* Connecting Line Desktop */}
            <div className="hidden md:block absolute top-1/2 left-0 w-full h-0.5 bg-stone-200 dark:bg-neutral-800 -translate-y-1/2 z-0" />

            {/* Step 1 */}
            <div className="relative z-10 flex flex-col items-center text-center group w-full md:w-1/3">
              <div className="w-16 h-16 rounded-2xl bg-[#FBF9F5] dark:bg-neutral-900 border border-stone-200 dark:border-neutral-800 flex items-center justify-center shadow-sm group-hover:scale-110 group-hover:border-teal-300 dark:group-hover:border-teal-700 transition-all duration-300 mb-4">
                <Fingerprint className="w-7 h-7 text-teal-700 dark:text-teal-400" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {language === 'EN' ? 'Identify' : 'ማንነት መለየት'}
              </h3>
              <p className="text-sm text-stone-500 dark:text-neutral-400 mt-1 font-medium">
                {language === 'EN' ? 'Locate patient identity.' : 'የታካሚውን ማንነት ያግኙ።'}
              </p>
            </div>

            {/* Step 2 */}
            <div className="relative z-10 flex flex-col items-center text-center group w-full md:w-1/3">
              <div className="w-16 h-16 rounded-2xl bg-[#FBF9F5] dark:bg-neutral-900 border border-stone-200 dark:border-neutral-800 flex items-center justify-center shadow-sm group-hover:scale-110 group-hover:border-teal-300 dark:group-hover:border-teal-700 transition-all duration-300 mb-4">
                <ShieldCheck className="w-7 h-7 text-teal-700 dark:text-teal-400" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {language === 'EN' ? 'Authorize' : 'ፍቃድ መስጠት'}
              </h3>
              <p className="text-sm text-stone-500 dark:text-neutral-400 mt-1 font-medium">
                {language === 'EN' ? 'Control record access.' : 'የመዝገብ መዳረሻን ይቆጣጠሩ።'}
              </p>
            </div>

            {/* Step 3 */}
            <div className="relative z-10 flex flex-col items-center text-center group w-full md:w-1/3">
              <div className="w-16 h-16 rounded-2xl bg-[#FBF9F5] dark:bg-neutral-900 border border-stone-200 dark:border-neutral-800 flex items-center justify-center shadow-sm group-hover:scale-110 group-hover:border-teal-300 dark:group-hover:border-teal-700 transition-all duration-300 mb-4">
                <Activity className="w-7 h-7 text-teal-700 dark:text-teal-400" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {language === 'EN' ? 'Connect' : 'ማገናኘት'}
              </h3>
              <p className="text-sm text-stone-500 dark:text-neutral-400 mt-1 font-medium">
                {language === 'EN' ? 'Deliver coordinated care.' : 'የተቀናጀ እንክብካቤን ያቅርቡ።'}
              </p>
            </div>
          </div>

        </div>
      </section>

      {/* CROSS-FACILITY STORY (BREAK-GLASS VISUAL) */}
      <section className="py-24 bg-stone-50 dark:bg-neutral-950 border-t border-stone-200/60 dark:border-neutral-900 relative overflow-hidden transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

            {/* Left: Interactive-looking UI representation */}
            <div className="relative p-6 sm:p-8 bg-white dark:bg-[#0a0a0a] rounded-[2rem] border border-stone-200 dark:border-neutral-800 shadow-xl group">
              <div className="flex items-center justify-between mb-8 pb-6 border-b border-stone-100 dark:border-neutral-800">
                <div className="flex items-center gap-3">
                  <FileText className="w-6 h-6 text-stone-400 dark:text-neutral-500" />
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    {language === 'EN' ? 'Medical Record Access' : 'የህክምና መዝገብ መዳረሻ'}
                  </h3>
                </div>
                <span className="px-3 py-1 bg-stone-100 dark:bg-neutral-800 border border-stone-200 dark:border-neutral-700 text-stone-600 dark:text-neutral-300 rounded-full text-xs font-bold">
                  Facility B
                </span>
              </div>

              <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/50 rounded-2xl p-6 mb-6 transition-colors group-hover:border-rose-200 dark:group-hover:border-rose-800">
                <div className="flex items-center gap-3 mb-2">
                  <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-500" />
                  <p className="text-sm font-bold text-rose-900 dark:text-rose-200">
                    {language === 'EN' ? 'Authorization Required' : 'ማረጋገጫ ያስፈልጋል'}
                  </p>
                </div>
                <p className="text-sm text-rose-700/90 dark:text-rose-300/80 font-medium">
                  {language === 'EN'
                    ? 'Patient was registered at Facility A. Emergency access requires justification and will be permanently audited.'
                    : 'ታካሚው በሌላ ተቋም ተመዝግቧል። አስቸኳይ መዳረሻ ምክንያት ይፈልጋል እና በቋሚነት ይመዘገባል።'}
                </p>
              </div>

              <div className="w-full py-4 rounded-xl bg-slate-900 dark:bg-neutral-800 text-white flex items-center justify-center gap-2 font-bold text-sm shadow-md hover:bg-slate-800 dark:hover:bg-neutral-700 transition-colors cursor-default">
                <LockKeyhole className="w-4 h-4" />
                {language === 'EN' ? 'Request Access' : 'መዳረሻ ይጠይቁ'}
              </div>
            </div>

            {/* Right: Explanation */}
            <div className="flex flex-col items-start text-left">
              <div className="w-14 h-14 rounded-2xl bg-teal-50 dark:bg-teal-950 border border-teal-100 dark:border-teal-900 flex items-center justify-center mb-6 shadow-sm">
                <LockKeyhole className="w-7 h-7 text-teal-700 dark:text-teal-400" />
              </div>
              <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight mb-4">
                {language === 'EN' ? 'Finding identity ≠ Accessing records.' : 'ማንነትን ማግኘት ≠ መዝገቦችን መድረስ።'}
              </h2>
              <p className="text-lg text-stone-600 dark:text-neutral-400 mb-8 font-medium leading-relaxed">
                {language === 'EN'
                  ? 'MyHealthID enforces strict data sovereignty. Recognizing a patient across facilities is seamless, but accessing their clinical history requires explicit, audited Break-Glass authorization.'
                  : 'ማይሄልዝአይዲ ጥብቅ የመረጃ ደህንነትን ያስከብራል። ታካሚን ማወቅ ቀላል ቢሆንም፣ የህክምና ታሪካቸውን ለመድረስ ጥብቅ ማረጋገጫ ያስፈልጋል።'}
              </p>
              <div className="flex flex-col gap-5">
                <div className="flex items-center gap-4 text-sm font-bold text-slate-800 dark:text-neutral-200">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-teal-100 dark:bg-teal-900/50">
                    <Check className="w-4 h-4 text-teal-700 dark:text-teal-400" />
                  </div>
                  {language === 'EN' ? 'Patient identity is portable.' : 'የታካሚ ማንነት ከቦታ ቦታ ሊንቀሳቀስ ይችላል።'}
                </div>
                <div className="flex items-center gap-4 text-sm font-bold text-slate-800 dark:text-neutral-200">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-teal-100 dark:bg-teal-900/50">
                    <Check className="w-4 h-4 text-teal-700 dark:text-teal-400" />
                  </div>
                  {language === 'EN' ? 'Medical records are isolated.' : 'የህክምና መዝገቦች ተነጥለው ተቀምጠዋል።'}
                </div>
                <div className="flex items-center gap-4 text-sm font-bold text-slate-800 dark:text-neutral-200">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-teal-100 dark:bg-teal-900/50">
                    <Check className="w-4 h-4 text-teal-700 dark:text-teal-400" />
                  </div>
                  {language === 'EN' ? 'Cross-facility access is logged.' : 'የተቋማት መካከል መዳረሻ ይመዘገባል።'}
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ABOUT US SECTION */}
      <section id="about" className="py-24 bg-[#FBF9F5] dark:bg-neutral-900 relative transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight mb-6">
            {language === 'EN' ? 'About Us' : 'ስለ እኛ'}
          </h2>
          <p className="max-w-3xl mx-auto text-lg text-stone-600 dark:text-neutral-400 font-medium leading-relaxed">
            {language === 'EN'
              ? 'MyHealthID is Ethiopia’s National Electronic Health Record (EHR) Identity system. We are committed to modernizing the healthcare sector by creating a secure, interoperable platform where patients own their medical identity and facilities can share critical information safely.'
              : 'ማይሄልዝአይዲ የኢትዮጵያ ብሄራዊ የኤሌክትሮኒክ የጤና መዝገብ (EHR) የማንነት ስርዓት ነው። ታካሚዎች የራሳቸውን የህክምና ማንነት በባለቤትነት የሚይዙበት እና ተቋማት ደህንነቱ በተጠበቀ ሁኔታ መረጃ የሚለዋወጡበትን ስርዓት ለመፍጠር ቆርጠናል።'}
          </p>
        </div>
      </section>

      {/* CONTACT US SECTION */}
      <section id="contact" className="py-24 bg-white dark:bg-neutral-950 relative transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight mb-6">
            {language === 'EN' ? 'Contact Us' : 'ያግኙን'}
          </h2>
          <p className="max-w-xl mx-auto text-lg text-stone-600 dark:text-neutral-400 font-medium leading-relaxed mb-8">
            {language === 'EN'
              ? 'Have questions about MyHealthID or need support for your facility? Reach out to our technical team.'
              : 'ስለ ማይሄልዝአይዲ ጥያቄዎች ካሉዎት ወይም ለተቋምዎ ድጋፍ ከፈለጉ፣ የቴክኒክ ቡድናችንን ያነጋግሩ።'}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-teal-50 dark:bg-teal-900/50 flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-teal-700 dark:text-teal-400" />
              </div>
              <span className="text-slate-900 dark:text-white font-bold">support@myhealthid.gov.et</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-teal-50 dark:bg-teal-900/50 flex items-center justify-center">
                <Activity className="w-5 h-5 text-teal-700 dark:text-teal-400" />
              </div>
              <span className="text-slate-900 dark:text-white font-bold">+251 11 111 1111</span>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
