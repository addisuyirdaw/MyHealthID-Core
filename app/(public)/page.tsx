export const dynamic = 'force-dynamic';
export const revalidate = 0;

import prisma from "@/lib/prisma";
import Link from "next/link";
import { 
  ShieldCheck, 
  Users, 
  Building, 
  Mail, 
  Phone, 
  MapPin,
  Globe,
  LayoutDashboard
} from "lucide-react";
import { LocalizedText } from "@/components/LocalizedText";

export default async function Home() {
  // Count all digitized citizens: registered Patients + User accounts with CITIZEN role.
  let patientCount = 0;
  try {
    const [patientRecords, citizenUsers] = await Promise.all([
      prisma.patient.count(),
      prisma.user.count({ where: { role: "CITIZEN" } }),
    ]);
    patientCount = patientRecords + citizenUsers;
  } catch (error: any) {
    console.error("METRIC_FETCH_ERROR:", error.message);
    console.error("[Home] DB unreachable, showing fallback count:", error);
  }

  // Fetch Carousel Media from Prisma
  let dbCarouselItems: any[] = [];
  try {
    dbCarouselItems = await prisma.carouselSlide.findMany({
      orderBy: { sortOrder: "asc" },
    });
  } catch (error) {
    console.error("Failed to load landing media:", error);
  }

  const fallbackItems = [
    {
      id: "fallback-1",
      imageUrl: "/front.jpg",
      headingEn: "National Digital Health ID",
      headingAm: "ሀገራዊ ዲጂታል ጤና መታወቂያ",
      textEn: "Securing identity and enabling health records nationwide.",
      textAm: "ለእያንዳንዱ ዜጋ ማንነትን ጥበቃ ማድረግ እና ተረጋግጦ የጤና መዝገቦችን ማንቃት።",
      sortOrder: 0,
    },
    {
      id: "fallback-2",
      imageUrl: "/back.jpg",
      headingEn: "Verified Health Profile",
      headingAm: "ተረጋግጦ የጤና መገለጫ",
      textEn: "Clinical-integrity and administrative verification for every citizen.",
      textAm: "ለእያንዳንዱ ታካሚ ክሊኒካዊ ትክክለኛነት እና አስተዳደራዊ ማረጋገጫ፣ በፋይዳ ውህደት የተሰጠ።",
      sortOrder: 1,
    }
  ];

  const carouselItems = dbCarouselItems.length > 0 ? dbCarouselItems : fallbackItems;

  return (
    <div className="bg-gradient-to-b from-slate-50 via-white to-slate-50 text-slate-900 flex flex-col relative overflow-hidden">

      {/* Subtle ambient glows */}
      <div className="pointer-events-none absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-blue-500/8 blur-[160px] z-0" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 w-[500px] h-[500px] rounded-full bg-indigo-500/6 blur-[140px] z-0" />

      {/* ── Hero Section — 2-column split layout ─────────────────────────────── */}
      <section className="w-full relative z-10 border-b border-slate-200/60">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 lg:pt-40 pb-20">

          {/* Left Column — 7 cols: Headline + CTAs */}
          <div className="lg:col-span-7 space-y-6">
            {/* Trust Badge */}
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
              <ShieldCheck className="w-3.5 h-3.5" />
              Fayda Sandbox · Privacy-focused architecture · Multi-Lingual
            </span>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-slate-900 tracking-tight leading-tight mb-6">
              <LocalizedText tKey="landing.heroTitle" />
            </h1>

            {/* Subtitle */}
            <p className="text-lg md:text-xl text-slate-600 font-medium mb-10 max-w-2xl text-center md:text-left mx-auto md:mx-0">
              <LocalizedText tKey="landing.heroSubtitle" />
            </p>

            {/* Stat chip */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl shadow-sm text-sm">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <span className="text-slate-600 text-xs font-medium"><LocalizedText tKey="landing.faydaReady" /></span>
              </div>
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl shadow-sm text-sm">
                <Users className="w-4 h-4 text-blue-500" />
                <span className="text-slate-600 text-xs font-medium"><LocalizedText tKey="landing.identityIntegration" /></span>
              </div>
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl shadow-sm text-sm">
                <Building className="w-4 h-4 text-purple-500" />
                <span className="text-slate-600 text-xs font-medium"><LocalizedText tKey="landing.multiFacilityArch" /></span>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Link href="/login">
                <button className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-lg shadow-sm transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer">
                  <ShieldCheck className="w-4 h-4" />
                  Access Staff Portals
                </button>
              </Link>
              <Link href="/register-facility">
                <button className="w-full sm:w-auto bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 font-semibold px-6 py-3 rounded-lg shadow-sm transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer">
                  <Building className="w-4 h-4 text-purple-500" />
                  Register Facility
                </button>
              </Link>
            </div>
          </div>

          {/* Right Column — 5 cols: Action Hub Card */}
          <div className="lg:col-span-5">
            <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-xl shadow-slate-200/50">
              <h2 className="text-xl font-bold text-slate-900 mb-1"><LocalizedText tKey="landing.whatToDo" /></h2>
              <p className="text-xs text-slate-500 mb-6"><LocalizedText tKey="landing.selectPortal" /></p>

              <div className="space-y-3">
                {/* Register Citizen */}
                <Link href="/register" className="block">
                  <div className="p-4 rounded-xl border border-slate-200 hover:border-blue-500 hover:bg-blue-50/50 transition-all duration-200 cursor-pointer group">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0 group-hover:bg-blue-100 transition-colors">
                        <Users className="w-5 h-5 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-900 text-sm group-hover:text-blue-700 transition-colors">
                          <LocalizedText tKey="landing.registerCitizen" />
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5"><LocalizedText tKey="landing.startPatientIntake" /></p>
                      </div>
                      <div className="text-sm font-semibold text-blue-600 group-hover:translate-x-1 transition-transform opacity-0 group-hover:opacity-100">
                        <LocalizedText tKey="landing.open" />
                      </div>
                    </div>
                  </div>
                </Link>

                {/* Portal Sign-In */}
                <Link href="/login" className="block">
                  <div className="p-4 rounded-xl border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/50 transition-all duration-200 cursor-pointer group">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0 group-hover:bg-emerald-100 transition-colors">
                        <ShieldCheck className="w-5 h-5 text-emerald-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-900 text-sm group-hover:text-emerald-700 transition-colors"><LocalizedText tKey="landing.portalSignIn" /></p>
                        <p className="text-xs text-slate-500 mt-0.5"><LocalizedText tKey="landing.accessWorkspace" /></p>
                      </div>
                      <div className="text-sm font-semibold text-emerald-600 group-hover:translate-x-1 transition-transform opacity-0 group-hover:opacity-100">
                        <LocalizedText tKey="landing.open" />
                      </div>
                    </div>
                  </div>
                </Link>

                {/* Onboard Hospital */}
                <Link href="/register-facility" className="block">
                  <div className="p-4 rounded-xl border border-slate-200 hover:border-purple-500 hover:bg-purple-50/50 transition-all duration-200 cursor-pointer group">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-purple-50 border border-purple-100 flex items-center justify-center shrink-0 group-hover:bg-purple-100 transition-colors">
                        <Building className="w-5 h-5 text-purple-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-900 text-sm group-hover:text-purple-700 transition-colors"><LocalizedText tKey="landing.onboardHospital" /></p>
                        <p className="text-xs text-slate-500 mt-0.5"><LocalizedText tKey="landing.registerHospital" /></p>
                      </div>
                      <div className="text-sm font-semibold text-purple-600 group-hover:translate-x-1 transition-transform opacity-0 group-hover:opacity-100">
                        <LocalizedText tKey="landing.open" />
                      </div>
                    </div>
                  </div>
                </Link>
              </div>

              {/* Footer trust note */}
              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span className="text-[11px] text-slate-400">National Health Portal Initiative · Fayda-Ready Sandbox</span>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ── Product Story ────────────────────────────────────────────── */}
      <section className="bg-white border-b border-slate-200/60 py-16 relative z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-sm font-bold text-blue-600 uppercase tracking-widest mb-2"><LocalizedText tKey="landing.fromFirstVisit" /></h2>
          <h3 className="text-2xl sm:text-3xl font-black text-slate-900 mb-12"><LocalizedText tKey="landing.howItWorks" /></h3>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 mb-4">
                <Users className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-slate-900 mb-2"><LocalizedText tKey="landing.identify" /></h4>
              <p className="text-sm text-slate-500 leading-relaxed"><LocalizedText tKey="landing.identifyDesc" /></p>
            </div>
            
            <div className="flex flex-col items-center relative">
              <div className="hidden md:block absolute top-6 -left-[50%] w-full h-[2px] bg-gradient-to-r from-blue-100 to-emerald-100 z-0"></div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 mb-4 relative z-10">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-slate-900 mb-2"><LocalizedText tKey="landing.triage" /></h4>
              <p className="text-sm text-slate-500 leading-relaxed"><LocalizedText tKey="landing.triageDesc" /></p>
            </div>
            
            <div className="flex flex-col items-center relative">
              <div className="hidden md:block absolute top-6 -left-[50%] w-full h-[2px] bg-gradient-to-r from-emerald-100 to-purple-100 z-0"></div>
              <div className="w-12 h-12 rounded-2xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600 mb-4 relative z-10">
                <Building className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-slate-900 mb-2"><LocalizedText tKey="landing.care" /></h4>
              <p className="text-sm text-slate-500 leading-relaxed"><LocalizedText tKey="landing.careDesc" /></p>
            </div>
            
            <div className="flex flex-col items-center relative">
              <div className="hidden md:block absolute top-6 -left-[50%] w-full h-[2px] bg-gradient-to-r from-purple-100 to-blue-100 z-0"></div>
              <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 mb-4 relative z-10">
                <Globe className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-slate-900 mb-2"><LocalizedText tKey="landing.coordinate" /></h4>
              <p className="text-sm text-slate-500 leading-relaxed"><LocalizedText tKey="landing.coordinateDesc" /></p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Below-the-fold Content Sections ────────────────────────────────── */}
      <div className="relative z-10">

        {/* Product Value Cards Section */}
        <section id="about" className="max-w-6xl mx-auto px-4 md:px-8 py-20 md:py-28 space-y-12 scroll-mt-16">
          <div className="text-center space-y-4">
            <h2 className="text-xs font-bold text-blue-600 uppercase tracking-widest"><LocalizedText tKey="landing.aboutInitiative" /></h2>
            <h3 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight leading-tight">
              <LocalizedText tKey="landing.unifyingIdentity" />
            </h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 mb-4">
                <Users className="w-5 h-5" />
              </div>
              <h4 className="text-lg font-bold text-slate-900 mb-2"><LocalizedText tKey="landing.persistentIdentity" /></h4>
              <p className="text-sm text-slate-500 leading-relaxed">
                <LocalizedText tKey="landing.persistentIdentityDesc" />
              </p>
            </div>

            <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 mb-4">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h4 className="text-lg font-bold text-slate-900 mb-2"><LocalizedText tKey="landing.captureVitals" /></h4>
              <p className="text-sm text-slate-500 leading-relaxed">
                <LocalizedText tKey="landing.captureVitalsDesc" />
              </p>
            </div>

            <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center text-purple-600 mb-4">
                <LayoutDashboard className="w-5 h-5" />
              </div>
              <h4 className="text-lg font-bold text-slate-900 mb-2"><LocalizedText tKey="landing.coordinateWorkflows" /></h4>
              <p className="text-sm text-slate-500 leading-relaxed">
                <LocalizedText tKey="landing.coordinateWorkflowsDesc" />
              </p>
            </div>

            <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 mb-4">
                <Building className="w-5 h-5" />
              </div>
              <h4 className="text-lg font-bold text-slate-900 mb-2"><LocalizedText tKey="landing.supportContinuity" /></h4>
              <p className="text-sm text-slate-500 leading-relaxed">
                <LocalizedText tKey="landing.supportContinuityDesc" />
              </p>
            </div>
          </div>
        </section>

        {/* Contact & Support Section */}
        <section id="contact" className="max-w-5xl mx-auto px-4 md:px-8 py-16 md:py-24 border-t border-slate-200/60 scroll-mt-16">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center md:text-left">
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-blue-600 uppercase tracking-widest">Contact Support</h4>
              <h5 className="text-lg font-bold text-slate-900">We are here to assist you</h5>
              <p className="text-xs text-slate-500 leading-relaxed">
                Reach out to our unified administrative desk for technical assistance, facility registration inquiries, or record credentials verification.
              </p>
            </div>

            <div className="space-y-4 md:pl-8 border-t md:border-t-0 md:border-l border-slate-200 pt-6 md:pt-0">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Official Channels</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-center md:justify-start gap-3">
                  <Phone className="w-4 h-4 text-blue-500 shrink-0" />
                  <span className="text-xs font-semibold text-slate-700">+251 11 123 4567</span>
                </div>
                <div className="flex items-center justify-center md:justify-start gap-3">
                  <Mail className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span className="text-xs font-semibold text-slate-700">support@myhealthid.gov.et</span>
                </div>
                <div className="flex items-center justify-center md:justify-start gap-3">
                  <MapPin className="w-4 h-4 text-purple-500 shrink-0" />
                  <span className="text-xs font-semibold text-slate-700">Ministry of Health, Addis Ababa</span>
                </div>
              </div>
            </div>

            <div className="space-y-4 md:pl-8 border-t md:border-t-0 md:border-l border-slate-200 pt-6 md:pt-0">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Institutional Markers</h4>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Designed for Ethiopian health information security and encryption protocols.
              </p>
              <div className="text-[10px] font-bold text-slate-600 flex items-center justify-center md:justify-start gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> Fayda-Ready Architecture
              </div>
            </div>
          </div>
        </section>

      </div>

    </div>
  );
}
