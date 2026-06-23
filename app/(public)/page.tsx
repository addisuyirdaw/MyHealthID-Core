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
  MapPin
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
      
      {/* Ambient glow blobs - softened and pushed back */}
      <div className="pointer-events-none absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-blue-600/4 blur-[140px] z-0" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 w-[600px] h-[600px] rounded-full bg-emerald-600/4 blur-[140px] z-0" />
      <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] rounded-full bg-blue-900/3 blur-[120px] z-0" />

      {/* Hero / Main Marketing Section — presentation-optimised layout */}
      <section className="w-full relative z-10">
        <LandingCarousel items={carouselItems}>
          {/* Unified System Actions Button Group — overlayed on the carousel */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center max-w-3xl mx-auto">
            <Link href="/register" className="w-full sm:w-auto">
              <button className="w-full sm:px-8 h-13 flex items-center justify-center gap-2.5 text-sm font-bold bg-neutral-900/90 backdrop-blur-sm border border-neutral-800 hover:border-blue-500 hover:bg-neutral-850 text-neutral-200 hover:text-white rounded-xl transition-all duration-300 shadow-xl active:scale-95 cursor-pointer">
                <Users className="w-4.5 h-4.5 text-blue-500" />
                <LocalizedText tKey="landing.registerCitizen" />
              </button>
            </Link>
            <Link href="/login" className="w-full sm:w-auto">
              <button className="w-full sm:px-8 h-13 flex items-center justify-center gap-2.5 text-sm font-bold bg-neutral-900/90 backdrop-blur-sm border border-neutral-800 hover:border-blue-500 hover:bg-neutral-850 text-neutral-200 hover:text-white rounded-xl transition-all duration-300 shadow-xl active:scale-95 cursor-pointer">
                <ShieldCheck className="w-4.5 h-4.5 text-emerald-500" />
                Portal Sign In
              </button>
            </Link>
            <Link href="/register-facility" className="w-full sm:w-auto">
              <button className="w-full sm:px-8 h-13 flex items-center justify-center gap-2.5 text-sm font-bold bg-neutral-900/90 backdrop-blur-sm border border-neutral-800 hover:border-blue-500 hover:bg-neutral-850 text-neutral-200 hover:text-white rounded-xl transition-all duration-300 shadow-xl active:scale-95 cursor-pointer">
                <Building className="w-4.5 h-4.5 text-purple-500" />
                Onboard Hospital
              </button>
            </Link>
          </div>

          {/* Trust badges */}
          <div className="flex items-center justify-center gap-6 pt-5 flex-wrap">
            {[
              { label: "Fayda-Integrated", color: "text-blue-400" },
              { label: "HIPAA-Aligned", color: "text-emerald-400" },
              { label: "Multi-Lingual", color: "text-purple-400" },
            ].map(({ label, color }) => (
              <span key={label} className={`text-[11px] font-bold ${color} flex items-center gap-1 bg-neutral-950/60 backdrop-blur-sm px-3 py-1 rounded-full border border-neutral-800/40`}>
                <ShieldCheck className="w-3.5 h-3.5" /> {label}
              </span>
            ))}
          </div>
        </LandingCarousel>
      </section>

      {/* Below-the-fold Content Sections */}
      <div className="border-t border-neutral-900 bg-neutral-950/20 relative z-10">
        
        {/* About MyHealthID Section */}
        <section id="about" className="max-w-4xl mx-auto px-4 md:px-8 py-24 md:py-32 space-y-8 scroll-mt-16 text-center">
          <h2 className="text-xs font-bold text-blue-500 uppercase tracking-widest">About the Initiative</h2>
          <h3 className="text-3xl sm:text-4xl font-black text-white tracking-tight leading-tight">
            Unifying Identity and Health Delivery Across Ethiopia
          </h3>
          <p className="text-neutral-400 text-base md:text-lg leading-relaxed font-medium max-w-3xl mx-auto">
            MyHealthID is a next-generation clinical information network designed to establish a verified, secure, and unified national digital health identification standard. By bridging medical history directly with the <strong>National Fayda ID</strong>, the platform ensures seamless record portability across public and private hospitals.
          </p>
          <p className="text-neutral-500 text-sm leading-relaxed max-w-2xl mx-auto">
            Our infrastructure maintains the highest clinical integrity and administrative privacy, enabling authorized practitioners to access life-saving records dynamically while citizen privacy remains strictly safeguarded.
          </p>
        </section>

        {/* Contact & Support Section */}
        <section id="contact" className="max-w-5xl mx-auto px-4 md:px-8 py-20 md:py-28 border-t border-neutral-900/60 scroll-mt-16">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center md:text-left">
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-blue-500 uppercase tracking-widest">Contact Support</h4>
              <h5 className="text-lg font-bold text-white">We are here to assist you</h5>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Reach out to our unified administrative desk for technical assistance, facility registration inquiries, or record credentials verification.
              </p>
            </div>
            
            <div className="space-y-4 md:pl-8 border-t md:border-t-0 md:border-l border-neutral-900/60 pt-6 md:pt-0">
              <h4 className="text-xs font-bold text-neutral-550 uppercase tracking-widest">Official Channels</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-center md:justify-start gap-3">
                  <Phone className="w-4 h-4 text-blue-400 shrink-0" />
                  <span className="text-xs font-semibold text-neutral-350">+251 11 123 4567</span>
                </div>
                <div className="flex items-center justify-center md:justify-start gap-3">
                  <Mail className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="text-xs font-semibold text-neutral-355">support@myhealthid.gov.et</span>
                </div>
                <div className="flex items-center justify-center md:justify-start gap-3">
                  <MapPin className="w-4 h-4 text-purple-400 shrink-0" />
                  <span className="text-xs font-semibold text-neutral-350">Ministry of Health, Addis Ababa</span>
                </div>
              </div>
            </div>

            <div className="space-y-4 md:pl-8 border-t md:border-t-0 md:border-l border-neutral-900/60 pt-6 md:pt-0">
              <h4 className="text-xs font-bold text-neutral-550 uppercase tracking-widest">Institutional Markers</h4>
              <p className="text-[11px] text-neutral-500 leading-relaxed">
                Authorized by the Ministry of Health, Federal Democratic Republic of Ethiopia. Secured in accordance with national health information security and encryption protocols.
              </p>
              <div className="text-[10px] font-bold text-neutral-400 flex items-center justify-center md:justify-start gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> Fayda-Verified Authority
              </div>
            </div>
          </div>
        </section>

      </div>

    </div>
  );
}
