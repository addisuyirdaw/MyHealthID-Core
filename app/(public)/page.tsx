export const dynamic = 'force-dynamic';
export const revalidate = 0;

import prisma from "@/lib/prisma";
import Link from "next/link";
import { 
  HeartPulse, 
  ShieldCheck, 
  Activity, 
  Users, 
  ArrowRight, 
  UserCheck, 
  FlaskConical, 
  Pill, 
  Building, 
  Mail, 
  Phone, 
  MapPin,
  Lock,
  Globe
} from "lucide-react";
import { LocalizedText } from "@/components/LocalizedText";
import { getLandingMedia } from "@/lib/actions/media.actions";
import LandingCarousel from "@/components/LandingCarousel";

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

  // Fetch Carousel Media from Prisma (cached)
  let dbCarouselItems: any[] = [];
  try {
    dbCarouselItems = await getLandingMedia();
  } catch (error) {
    console.error("Failed to load landing media:", error);
  }

  const fallbackItems = [
    {
      id: "fallback-1",
      imageUrl: "/front.jpg",
      altText: "MyHealthID Front Identification Showcase",
      title: "National Digital Health ID",
      description: "Securing identity and enabling health records nationwide.",
    },
    {
      id: "fallback-2",
      imageUrl: "/back.jpg",
      altText: "MyHealthID Back System Information",
      title: "Verified Health Profile",
      description: "Clinical-integrity and administrative verification for every citizen.",
    }
  ];

  const carouselItems = dbCarouselItems.length > 0 ? dbCarouselItems : fallbackItems;

  return (
    <div className="bg-neutral-950 text-neutral-100 flex flex-col justify-center relative overflow-hidden">
      
      {/* Ambient glow blobs */}
      <div className="pointer-events-none absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-blue-600/8 blur-[120px]" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 w-[600px] h-[600px] rounded-full bg-emerald-600/8 blur-[120px]" />
      <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] rounded-full bg-blue-900/5 blur-[100px]" />

      {/* Hero / Main Marketing Section */}
      <section className="max-w-7xl mx-auto px-4 md:px-8 w-full relative z-10 py-16 md:py-24 text-center space-y-12">
        
        {/* Hero headline & badge */}
        <div className="space-y-6 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-xs font-bold text-blue-400">
            <Globe className="w-3.5 h-3.5 animate-pulse" />
            <span>Ethiopian Digital Health Initiative</span>
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-white tracking-tight leading-none">
            <LocalizedText tKey="landing.title" />
          </h1>
          <p className="text-lg md:text-xl text-neutral-400 font-medium max-w-2xl mx-auto leading-relaxed">
            <LocalizedText tKey="landing.subtitle" />
          </p>
        </div>

        {/* Unified System Actions Button Group */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center max-w-3xl mx-auto pt-2 pb-6">
          <Link href="/register" className="w-full sm:w-auto">
            <button className="w-full sm:px-8 h-13 flex items-center justify-center gap-2.5 text-sm font-bold bg-neutral-900 border border-neutral-800 hover:border-blue-500 hover:bg-neutral-850 text-neutral-200 hover:text-white rounded-xl transition-all duration-300 shadow-lg active:scale-95 cursor-pointer">
              <Users className="w-4.5 h-4.5 text-blue-500" />
              <LocalizedText tKey="landing.registerCitizen" />
            </button>
          </Link>
          <Link href="/login" className="w-full sm:w-auto">
            <button className="w-full sm:px-8 h-13 flex items-center justify-center gap-2.5 text-sm font-bold bg-neutral-900 border border-neutral-800 hover:border-blue-500 hover:bg-neutral-850 text-neutral-200 hover:text-white rounded-xl transition-all duration-300 shadow-lg active:scale-95 cursor-pointer">
              <ShieldCheck className="w-4.5 h-4.5 text-emerald-500" />
              Portal Sign In
            </button>
          </Link>
          <Link href="/register-facility" className="w-full sm:w-auto">
            <button className="w-full sm:px-8 h-13 flex items-center justify-center gap-2.5 text-sm font-bold bg-neutral-900 border border-neutral-800 hover:border-blue-500 hover:bg-neutral-850 text-neutral-200 hover:text-white rounded-xl transition-all duration-300 shadow-lg active:scale-95 cursor-pointer">
              <Building className="w-4.5 h-4.5 text-purple-500" />
              Onboard Hospital
            </button>
          </Link>
        </div>

        {/* Interactive Image Carousel */}
        <div className="my-10 w-full max-w-6xl md:max-w-7xl mx-auto">
          <LandingCarousel items={carouselItems} />
        </div>

        {/* Trust badges */}
        <div className="flex items-center justify-center gap-6 pt-4 flex-wrap">
          {[
            { label: "Fayda-Integrated", color: "text-blue-400" },
            { label: "HIPAA-Aligned", color: "text-emerald-400" },
            { label: "Multi-Lingual", color: "text-purple-400" },
          ].map(({ label, color }) => (
            <span key={label} className={`text-[11px] font-bold ${color} flex items-center gap-1`}>
              <ShieldCheck className="w-3.5 h-3.5" /> {label}
            </span>
          ))}
        </div>
      </section>

      {/* Below-the-fold Content Sections */}
      <div className="border-t border-neutral-900 bg-neutral-950/20 relative z-10">
        
        {/* About Section */}
        <section id="about" className="max-w-5xl mx-auto px-4 md:px-8 py-20 md:py-28 scroll-mt-16">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-12 items-center">
            <div className="md:col-span-7 space-y-6">
              <h2 className="text-xs font-bold text-blue-500 uppercase tracking-widest">About MyHealthID</h2>
              <h3 className="text-3xl sm:text-4xl font-black text-white tracking-tight leading-tight">
                Ethiopia's Unified Digital Health Identification Network
              </h3>
              <p className="text-neutral-400 text-base leading-relaxed">
                MyHealthID is the official platform designed to bridge identity management and medical record keeping across all healthcare facilities in Ethiopia. Integrated with the <strong>National Fayda ID</strong>, our platform ensures patients are verified dynamically, records remain tamper-proof, and doctors gain real-time clinical access safely.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4">
                <div className="flex gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
                    <Lock className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-sm">Encrypted Storage</h4>
                    <p className="text-xs text-neutral-500 mt-0.5">Strict HIPAA compliance and data integrity guardrails.</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                    <UserCheck className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-sm">Fayda ID Sync</h4>
                    <p className="text-xs text-neutral-500 mt-0.5">Instant identity reconciliation and biometric verification.</p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Visual Callout Graphic Card */}
            <div className="md:col-span-5 bg-gradient-to-br from-neutral-900 to-neutral-950 border border-neutral-850 rounded-3xl p-8 shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-blue-500/5 blur-2xl group-hover:bg-blue-500/10 transition duration-500" />
              <HeartPulse className="w-12 h-12 text-blue-500 mb-6" />
              <h4 className="text-xl font-bold text-white mb-3">Security & Privacy</h4>
              <p className="text-xs text-neutral-400 leading-relaxed mb-6">
                Our systems protect sensitive medical information with advanced cryptography, audit trails, and strict authorization levels. Citizens maintain ownership and can view their full access history.
              </p>
              <div className="text-[10px] font-bold text-neutral-500 tracking-wider uppercase flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> Active Protection Enabled
              </div>
            </div>
          </div>
        </section>

        {/* Services Section */}
        <section id="services" className="max-w-5xl mx-auto px-4 md:px-8 py-20 md:py-28 border-t border-neutral-900/60 scroll-mt-16">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-xs font-bold text-blue-500 uppercase tracking-widest">Our Services</h2>
            <h3 className="text-3xl sm:text-4xl font-black text-white tracking-tight">Comprehensive Healthcare Workspace</h3>
            <p className="text-neutral-400 max-w-xl mx-auto text-sm leading-relaxed">
              Explore the four core pillars of the MyHealthID network, providing seamless data integration across clinics, labs, and pharmacies.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            
            {/* Patient Profiles */}
            <div className="bg-neutral-900/30 hover:bg-neutral-900/50 border border-neutral-900 rounded-2xl p-6 transition duration-300 hover:-translate-y-1 group">
              <div className="w-11 h-11 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-5 group-hover:bg-blue-500/25 transition">
                <UserCheck className="w-5 h-5 text-blue-400" />
              </div>
              <h4 className="font-bold text-white text-base mb-2">Patient Profiles</h4>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Centralized medical history synced directly with Fayda National ID for zero-mistake citizen diagnostics.
              </p>
            </div>

            {/* Triage Queues */}
            <div className="bg-neutral-900/30 hover:bg-neutral-900/50 border border-neutral-900 rounded-2xl p-6 transition duration-300 hover:-translate-y-1 group">
              <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-5 group-hover:bg-emerald-500/25 transition">
                <Activity className="w-5 h-5 text-emerald-400" />
              </div>
              <h4 className="font-bold text-white text-base mb-2">Triage Queues</h4>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Smart vital sign logs and dynamic clinic triage routing for reduced wait times and automated priority queues.
              </p>
            </div>

            {/* Laboratory Diagnostics */}
            <div className="bg-neutral-900/30 hover:bg-neutral-900/50 border border-neutral-900 rounded-2xl p-6 transition duration-300 hover:-translate-y-1 group">
              <div className="w-11 h-11 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mb-5 group-hover:bg-purple-500/25 transition">
                <FlaskConical className="w-5 h-5 text-purple-400" />
              </div>
              <h4 className="font-bold text-white text-base mb-2">Laboratory Work</h4>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Instant digital diagnostic order routing and test results synchronization directly with EMR timelines.
              </p>
            </div>

            {/* Pharmacy Management */}
            <div className="bg-neutral-900/30 hover:bg-neutral-900/50 border border-neutral-900 rounded-2xl p-6 transition duration-300 hover:-translate-y-1 group">
              <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-5 group-hover:bg-amber-500/25 transition">
                <Pill className="w-5 h-5 text-amber-400" />
              </div>
              <h4 className="font-bold text-white text-base mb-2">Pharmacy Suite</h4>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Secure digital prescription verification, dosage logs, and direct automated dispensary fulfillment keys.
              </p>
            </div>

          </div>
        </section>

        {/* System Scope Section */}
        <section id="scope" className="max-w-5xl mx-auto px-4 md:px-8 py-20 md:py-28 border-t border-neutral-900/60 scroll-mt-16">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-xs font-bold text-blue-500 uppercase tracking-widest">System Scope</h2>
            <h3 className="text-3xl sm:text-4xl font-black text-white tracking-tight">Integrated Clinical Ecosystem</h3>
            <p className="text-neutral-400 max-w-xl mx-auto text-sm leading-relaxed">
              A comprehensive look at our internal platform layers designed to digitize the entire healthcare journey.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Triage Management */}
            <div className="bg-neutral-900/30 hover:bg-neutral-900/50 border border-neutral-900 hover:border-blue-500/30 rounded-3xl p-8 transition duration-300 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-blue-500/5 blur-2xl group-hover:bg-blue-500/10 transition duration-500" />
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-6 group-hover:bg-blue-500/25 transition">
                <Activity className="w-6 h-6 text-blue-400 animate-pulse" />
              </div>
              <h4 className="text-xl font-bold text-white mb-3">Triage Management & Vital Signs Log</h4>
              <p className="text-sm text-neutral-400 leading-relaxed">
                Facilitates immediate citizen arrival check-ins, automated clinical queue assignment, and precise vital signs logging. Enables healthcare workers to prioritize critical cases through real-time triage status updates.
              </p>
            </div>

            {/* Doctor Clinical Diagnostic Console */}
            <div className="bg-neutral-900/30 hover:bg-neutral-900/50 border border-neutral-900 hover:border-emerald-500/30 rounded-3xl p-8 transition duration-300 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-emerald-500/5 blur-2xl group-hover:bg-emerald-500/10 transition duration-500" />
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-6 group-hover:bg-emerald-500/25 transition">
                <HeartPulse className="w-6 h-6 text-emerald-400" />
              </div>
              <h4 className="text-xl font-bold text-white mb-3">Doctor Clinical Diagnostic Console & Patient Timeline</h4>
              <p className="text-sm text-neutral-400 leading-relaxed">
                Empowers physicians with an interactive, longitudinal medical history console. View historical diagnoses, past clinical notes, allergy alerts, and referral pathways in a single, high-security diagnostic environment.
              </p>
            </div>

            {/* Laboratory Panels */}
            <div className="bg-neutral-900/30 hover:bg-neutral-900/50 border border-neutral-900 hover:border-purple-500/30 rounded-3xl p-8 transition duration-300 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-purple-500/5 blur-2xl group-hover:bg-purple-500/10 transition duration-500" />
              <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mb-6 group-hover:bg-purple-500/25 transition">
                <FlaskConical className="w-6 h-6 text-purple-400" />
              </div>
              <h4 className="text-xl font-bold text-white mb-3">Laboratory Panels & Biometric Sync</h4>
              <p className="text-sm text-neutral-400 leading-relaxed">
                Bridges the gap between clinical orders and laboratory execution. Syncs diagnostic test panels, hematology/biochemistry reports, and lab results directly back to the patient’s unified digital identification profile.
              </p>
            </div>

            {/* Automated Pharmacy */}
            <div className="bg-neutral-900/30 hover:bg-neutral-900/50 border border-neutral-900 hover:border-amber-500/30 rounded-3xl p-8 transition duration-300 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-amber-500/5 blur-2xl group-hover:bg-amber-500/10 transition duration-500" />
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-6 group-hover:bg-amber-500/25 transition">
                <Pill className="w-6 h-6 text-amber-400" />
              </div>
              <h4 className="text-xl font-bold text-white mb-3">Automated Pharmacy Prescription Fulfilment</h4>
              <p className="text-sm text-neutral-400 leading-relaxed">
                Secures the dispensing pipeline with end-to-end digital prescription tracking. Minimizes dosage errors and provides pharmacists with real-time verification mechanisms to issue medication and record patient adherence.
              </p>
            </div>
          </div>
        </section>

        {/* Contact Section */}
        <section id="contact" className="max-w-3xl mx-auto px-4 md:px-8 py-20 md:py-28 border-t border-neutral-900/60 scroll-mt-16 text-center space-y-8">
          <div className="space-y-4">
            <h2 className="text-xs font-bold text-blue-500 uppercase tracking-widest">Contact & Support</h2>
            <h3 className="text-3xl font-black text-white tracking-tight">We are here to assist you</h3>
            <p className="text-neutral-400 text-sm leading-relaxed max-w-xl mx-auto">
              If you are a citizen looking to update your health records, a healthcare professional facing portal access issues, or a clinic administrator hoping to register a new facility, please contact our support team.
            </p>
          </div>
          
          <div className="flex flex-col md:flex-row items-center justify-center gap-6 pt-4">
            <div className="flex items-center gap-3 bg-neutral-900/30 border border-neutral-900/60 rounded-2xl px-5 py-4 w-full md:w-auto">
              <Phone className="w-5 h-5 text-blue-400 shrink-0" />
              <span className="text-sm font-semibold text-neutral-300">+251 11 123 4567</span>
            </div>
            <div className="flex items-center gap-3 bg-neutral-900/30 border border-neutral-900/60 rounded-2xl px-5 py-4 w-full md:w-auto">
              <Mail className="w-5 h-5 text-emerald-400 shrink-0" />
              <span className="text-sm font-semibold text-neutral-300">support@myhealthid.gov.et</span>
            </div>
            <div className="flex items-center gap-3 bg-neutral-900/30 border border-neutral-900/60 rounded-2xl px-5 py-4 w-full md:w-auto">
              <MapPin className="w-5 h-5 text-purple-400 shrink-0" />
              <span className="text-sm font-semibold text-neutral-300">Ministry of Health, Addis Ababa</span>
            </div>
          </div>
        </section>

      </div>

    </div>
  );
}
