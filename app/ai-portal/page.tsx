"use client";

import React, { useState, useTransition } from "react";
import { 
  Sparkles, Search, ShieldCheck, Heart, AlertTriangle, 
  ArrowRight, ShieldAlert, ArrowLeft, RefreshCw, Send, CheckCircle2 
} from "lucide-react";
import { getLifestyleTargets } from "@/lib/ai/dictionary";
import { verifyFaydaCoach, searchOfflineReferenceServer } from "@/lib/actions/patient.actions";

export default function AIPortalPage() {
  const [activeTab, setActiveTab] = useState<"PUBLIC" | "PERSONAL">("PUBLIC");
  
  // Public Mode States
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResult, setSearchResult] = useState<any>(null);

  // Personal Mode States
  const [faydaId, setFaydaId] = useState("");
  const [challenge, setChallenge] = useState("");
  const [patientData, setPatientData] = useState<any>(null);
  const [isVerified, setIsVerified] = useState(false);
  const [verificationError, setVerificationError] = useState("");
  const [isPending, startTransition] = useTransition();

  // Chatbot Widget States
  const [chatMessages, setChatMessages] = useState<Array<{ role: "user" | "coach"; text: string; textAm?: string }>>([
    { role: "coach", text: "Hello! I am your personal wellness companion. Ask me any questions about your lifestyle targets, diets, or activities.", textAm: "ሰላም! እኔ የእርስዎ የግል ጤና ረዳት ነኝ። ስለ አመጋገብዎ፣ የአካል ብቃት እንቅስቃሴዎ ወይም ጤናዎ ማንኛውንም ጥያቄ ይጠይቁኝ።" }
  ]);
  const [chatInput, setChatInput] = useState("");

  // Handle Public Offline Search
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    const res = await searchOfflineReferenceServer(searchQuery);
    setSearchResult(res);
  };

  // Handle 2FA Challenge Authentication
  const handleAuthenticate = async (e: React.FormEvent) => {
    e.preventDefault();
    setVerificationError("");
    
    startTransition(async () => {
      const res = await verifyFaydaCoach(faydaId, challenge);
      if (res.success && res.patient) {
        setPatientData(res.patient);
        setIsVerified(true);
      } else {
        setVerificationError(res.error || "Authentication failed.");
      }
    });
  };

  // Handle Local Chatbot Submissions
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMsg = chatInput;
    setChatMessages(prev => [...prev, { role: "user", text: userMsg }]);
    setChatInput("");

    setTimeout(() => {
      const lower = userMsg.toLowerCase();
      let responseEn = "I am monitoring your health profile. Based on your records, keep following your personalized meal schedules and exercise routines.";
      let responseAm = "የጤና ሁኔታዎን በመከታተል ላይ ነኝ። በተሰጠዎት መመሪያ መሰረት የአካል ብቃት እንቅስቃሴዎን እና የአመጋገብ ስርዓትዎን ይቀጥሉ።";

      if (lower.includes("food") || lower.includes("diet") || lower.includes("eat") || lower.includes("ምግብ") || lower.includes("አመጋገብ")) {
        if (patientData) {
          const targets = getLifestyleTargets(patientData.preExistingConditions);
          responseEn = `For your conditions, you should focus on: ${targets.allowedFoods.join(", ")}. Strictly avoid: ${targets.avoidedFoods.join(", ")}.`;
          responseAm = `ለጤናዎ ሁኔታ የሚመከሩ ምግቦች፡ ${targets.allowedFoodsAm.join(", ")}። የሚከለከሉ ምግቦች፡ ${targets.avoidedFoodsAm.join(", ")}።`;
        }
      } else if (lower.includes("exercise") || lower.includes("activity") || lower.includes("walk") || lower.includes("ስፖርት") || lower.includes("እርምጃ")) {
        if (patientData) {
          const targets = getLifestyleTargets(patientData.preExistingConditions);
          responseEn = `Your daily activity targets: ${targets.activityTarget}`;
          responseAm = `የአካል ብቃት እንቅስቃሴ ግብዎ፡ ${targets.activityTargetAm}`;
        }
      } else if (lower.includes("pain") || lower.includes("chest") || lower.includes("breath") || lower.includes("ህመም") || lower.includes("ደረት") || lower.includes("ትንፋሽ")) {
        responseEn = "🚨 ALERT: High-risk symptom detected! Please seek emergency attention or contact a triage nurse at the clinic immediately.";
        responseAm = "🚨 ማስጠንቀቂያ፡ አደገኛ የህመም ስሜት ታይቷል! እባክዎን በአቅራቢያዎ ወደሚገኝ ድንገተኛ ክፍል ይሂዱ ወይም ሀኪም ያማክሩ።";
      }

      setChatMessages(prev => [...prev, { role: "coach", text: responseEn, textAm: responseAm }]);
    }, 800);
  };

  const logoutCoach = () => {
    setIsVerified(false);
    setPatientData(null);
    setFaydaId("");
    setChallenge("");
  };

  // Pre-conditions targets calculations
  const lifestyleTargets = patientData ? getLifestyleTargets(patientData.preExistingConditions) : null;
  const isHighRiskPatient = patientData && (
    (patientData.preExistingConditions || "").toLowerCase().includes("hypertension") ||
    (patientData.preExistingConditions || "").toLowerCase().includes("diabetes") ||
    (patientData.preExistingConditions || "").toLowerCase().includes("cardiac") ||
    (patientData.preExistingConditions || "").toLowerCase().includes("ልብ") ||
    (patientData.preExistingConditions || "").toLowerCase().includes("ስኳር") ||
    (patientData.preExistingConditions || "").toLowerCase().includes("ደም ግፊት")
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500/30">
      {/* Dynamic Background Effects */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-900/25 rounded-full blur-[140px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-emerald-950/20 rounded-full blur-[140px]" />
      </div>

      {/* Header */}
      <header className="border-b border-slate-800/80 bg-slate-950/70 backdrop-blur-xl shrink-0 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2.5 rounded-xl shadow-lg shadow-indigo-500/20">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-1.5">
                MyHealthID <span className="text-indigo-400 font-extrabold uppercase text-[10px] bg-indigo-500/10 px-2 py-0.5 rounded-full tracking-widest border border-indigo-500/25">AI Portal</span>
              </h1>
              <p className="text-[11px] text-slate-400">Digital Health Assistant • የMyHealthID ዲጂታል ጤና ረዳት</p>
            </div>
          </div>

          {/* Mode Toggles */}
          <div className="flex bg-slate-900/90 p-1.5 rounded-xl border border-slate-800">
            <button
              id="btn-public-mode"
              onClick={() => setActiveTab("PUBLIC")}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                activeTab === "PUBLIC" 
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20" 
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Public Mode (መዝገበ-ቃላት)
            </button>
            <button
              id="btn-personal-mode"
              onClick={() => setActiveTab("PERSONAL")}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                activeTab === "PERSONAL" 
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20" 
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Personal Coach Mode (የግል ረዳት)
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-10 z-10 flex flex-col justify-center">
        
        {/* PUBLIC MODE */}
        {activeTab === "PUBLIC" && (
          <div className="max-w-3xl mx-auto w-full space-y-8 animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="text-center space-y-4">
              <h2 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                Bilingual Medical Guide & Search
              </h2>
              <h3 className="text-xl font-bold text-indigo-400 AmharicText">
                የሆስፒታል መመሪያዎች እና መዝገበ-ቃላት መፈለጊያ
              </h3>
              <p className="text-slate-400 max-w-lg mx-auto text-sm leading-relaxed">
                Search universal hospital guides, available clinical wards, registration queuing logic, and lab tests fully offline in Next.js memory.
              </p>
            </div>

            {/* Offline Search Box */}
            <form onSubmit={handleSearch} className="relative max-w-2xl mx-auto">
              <Search className="absolute left-4 top-4.5 h-5 w-5 text-slate-400" />
              <input
                id="inp-public-query"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search 'registration', 'wards', or 'investigations'..."
                className="w-full h-14 bg-slate-900/90 border border-slate-800 rounded-2xl pl-12 pr-32 font-medium text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all shadow-xl"
              />
              <button 
                type="submit"
                id="btn-public-submit"
                className="absolute right-2 top-2 h-10 px-5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition-colors flex items-center gap-1.5"
              >
                Search <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>

            {/* Search Results Display */}
            {searchResult && (
              <div className="bg-slate-900/50 backdrop-blur-md rounded-3xl border border-slate-800 p-6 md:p-8 space-y-6 shadow-2xl animate-in zoom-in-95 duration-300">
                <div className="flex items-start justify-between border-b border-slate-800/80 pb-4">
                  <div>
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-emerald-500" /> {searchResult.title}
                    </h3>
                    <h4 className="text-md font-semibold text-indigo-400 mt-1">
                      {searchResult.titleAm}
                    </h4>
                  </div>
                  <span className="text-[10px] font-extrabold uppercase tracking-widest bg-indigo-500/10 text-indigo-400 px-3 py-1 rounded-full border border-indigo-500/25">
                    Offline Index
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 leading-relaxed">
                  {/* English Section */}
                  <div className="bg-slate-950/40 p-5 rounded-2xl border border-slate-800/60">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">English Reference</span>
                    <p className="text-slate-300 text-sm whitespace-pre-line">{searchResult.content}</p>
                  </div>

                  {/* Amharic Section */}
                  <div className="bg-slate-950/40 p-5 rounded-2xl border border-slate-800/60 font-medium">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">Amharic Reference (ትርጉም)</span>
                    <p className="text-slate-300 text-sm whitespace-pre-line">{searchResult.contentAm}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* PERSONAL COACH MODE */}
        {activeTab === "PERSONAL" && (
          <div className="max-w-6xl mx-auto w-full space-y-8 animate-in fade-in slide-in-from-top-4 duration-500">
            
            {/* Verification Challenge / Identity Gate */}
            {!isVerified ? (
              <div className="max-w-md mx-auto bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 shadow-2xl relative">
                <div className="flex justify-center mb-6">
                  <div className="bg-indigo-500/10 p-4 rounded-full border border-indigo-500/25">
                    <ShieldCheck className="w-10 h-10 text-indigo-400" />
                  </div>
                </div>

                <div className="text-center mb-6 space-y-2">
                  <h2 className="text-2xl font-bold text-white">Identity Lock Gate</h2>
                  <h3 className="text-sm font-semibold text-indigo-400">የግል ጤና ረዳት ማረጋገጫ</h3>
                  <p className="text-xs text-slate-400">
                    Enter your Fayda National ID and complete the non-medical 2FA challenge (birth year or phone suffix) to unlock your diet & exercise coach dashboard.
                  </p>
                </div>

                {verificationError && (
                  <div className="mb-4 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-xs font-semibold text-red-400 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" /> {verificationError}
                  </div>
                )}

                <form onSubmit={handleAuthenticate} className="space-y-4">
                  <div className="space-y-1.5">
                    <label htmlFor="fayda-id-input" className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Fayda ID / Health ID</label>
                    <input
                      id="fayda-id-input"
                      type="text"
                      required
                      value={faydaId}
                      onChange={(e) => setFaydaId(e.target.value)}
                      placeholder="e.g. MHID-A567CD / fayda digits"
                      className="w-full h-12 bg-slate-950 border border-slate-800 rounded-xl px-4 text-sm font-medium text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="challenge-input" className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Security 2FA Challenge</label>
                    <input
                      id="challenge-input"
                      type="password"
                      required
                      value={challenge}
                      onChange={(e) => setChallenge(e.target.value)}
                      placeholder="Last 4 digits of phone OR Birth Year"
                      className="w-full h-12 bg-slate-950 border border-slate-800 rounded-xl px-4 text-sm font-medium text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                    />
                    <p className="text-[10px] text-slate-500">For mock testing, e.g. Birth Year '1989' or the registered phone suffix.</p>
                  </div>

                  <button
                    id="btn-auth-submit"
                    type="submit"
                    disabled={isPending}
                    className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm transition-all shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2"
                  >
                    {isPending ? (
                      <><RefreshCw className="w-4 h-4 animate-spin" /> Verifying Challenge...</>
                    ) : (
                      <><ShieldCheck className="w-4 h-4" /> Unlock Coach Profile</>
                    )}
                  </button>
                </form>
              </div>
            ) : (
              
              // Unlocked Personal Wellness Dashboard
              <div className="space-y-8 animate-in zoom-in-95 duration-300">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900/40 p-6 rounded-3xl border border-slate-800/80 backdrop-blur-md">
                  <div>
                    <h2 className="text-3xl font-extrabold tracking-tight text-white">
                      Welcome Back, {patientData.fullName}!
                    </h2>
                    <p className="text-sm text-indigo-400 mt-1">
                      Wellness Dashboard for <span className="font-mono text-xs font-bold bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">{patientData.healthId}</span>
                    </p>
                  </div>
                  
                  <button
                    id="btn-coach-logout"
                    onClick={logoutCoach}
                    className="h-10 px-4 border border-slate-800 hover:bg-slate-900 rounded-xl text-xs font-bold text-slate-400 hover:text-white transition-all flex items-center gap-1.5"
                  >
                    <ArrowLeft className="w-4 h-4" /> Lock Profile
                  </button>
                </div>

                {/* Grid Layout: Wellness Cards on Left, Chatbot on Right */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  
                  {/* LEFT: Target Charts */}
                  <div className="lg:col-span-2 space-y-6">

                    {/* Flashing Urgent Risk Alerts (If High Risk) */}
                    {isHighRiskPatient && (
                      <div className="p-5 rounded-2xl bg-gradient-to-r from-red-950/40 to-red-900/20 border border-red-500/30 text-slate-200 shadow-[0_0_20px_rgba(239,68,68,0.1)] flex items-start gap-4 animate-pulse-slow">
                        <div className="bg-red-500/10 p-2.5 rounded-xl border border-red-500/20 text-red-500">
                          <ShieldAlert className="w-6 h-6" />
                        </div>
                        <div className="space-y-2">
                          <h4 className="font-extrabold text-red-400 uppercase tracking-widest text-xs">CRITICAL HEALTH WATCH • የጤና ማስጠንቀቂያ</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="text-xs text-slate-300">
                              <span className="font-bold text-white block">Medical Warning:</span>
                              {lifestyleTargets?.warningAlert}
                            </div>
                            <div className="text-xs text-slate-300 font-semibold AmharicText leading-relaxed">
                              <span className="font-bold text-indigo-400 block">የህክምና ክትትል ማስጠንቀቂያ፡</span>
                              {lifestyleTargets?.warningAlertAm}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Allowed/Avoided Food Charts side-by-side */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      
                      {/* ALLOWED FOODS */}
                      <div className="bg-slate-900/40 border border-emerald-950/80 p-6 rounded-3xl space-y-4">
                        <div className="flex items-center gap-2 border-b border-emerald-950 pb-3">
                          <div className="bg-emerald-500/10 p-1.5 rounded-lg border border-emerald-500/20 text-emerald-400">
                            <Heart className="w-4 h-4" />
                          </div>
                          <h4 className="font-extrabold text-emerald-400 text-xs uppercase tracking-widest">Allowed & Encouraged Foods</h4>
                        </div>

                        <div className="grid grid-cols-1 gap-4 text-xs text-slate-300">
                          <div>
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Recommended Items</span>
                            <ul className="list-disc list-inside space-y-1">
                              {lifestyleTargets?.allowedFoods.map((item, idx) => (
                                <li key={idx} className="text-slate-300">{item}</li>
                              ))}
                            </ul>
                          </div>

                          <div className="pt-2 border-t border-slate-800 font-semibold AmharicText leading-relaxed">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">የሚመከሩ ምግቦች (አማርኛ)</span>
                            <ul className="list-disc list-inside space-y-1">
                              {lifestyleTargets?.allowedFoodsAm.map((item, idx) => (
                                <li key={idx} className="text-slate-300">{item}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>

                      {/* AVOIDED FOODS */}
                      <div className="bg-slate-900/40 border border-red-950/80 p-6 rounded-3xl space-y-4">
                        <div className="flex items-center gap-2 border-b border-red-950 pb-3">
                          <div className="bg-red-500/10 p-1.5 rounded-lg border border-red-500/20 text-red-400">
                            <AlertTriangle className="w-4 h-4" />
                          </div>
                          <h4 className="font-extrabold text-red-400 text-xs uppercase tracking-widest">Strictly Avoided Foods</h4>
                        </div>

                        <div className="grid grid-cols-1 gap-4 text-xs text-slate-300">
                          <div>
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Avoid Items</span>
                            <ul className="list-disc list-inside space-y-1">
                              {lifestyleTargets?.avoidedFoods.map((item, idx) => (
                                <li key={idx} className="text-slate-300">{item}</li>
                              ))}
                            </ul>
                          </div>

                          <div className="pt-2 border-t border-slate-800 font-semibold AmharicText leading-relaxed">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">የሚከለከሉ ምግቦች (አማርኛ)</span>
                            <ul className="list-disc list-inside space-y-1">
                              {lifestyleTargets?.avoidedFoodsAm.map((item, idx) => (
                                <li key={idx} className="text-slate-300">{item}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>

                    </div>

                    {/* Physical Activity targets */}
                    <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-3xl space-y-4">
                      <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                        <span className="text-indigo-400 text-xs uppercase tracking-widest font-extrabold">Active Lifestyle & Fitness Goals</span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-300 leading-relaxed">
                        <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-800/60">
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5">Activity Goal</span>
                          <p>{lifestyleTargets?.activityTarget}</p>
                        </div>

                        <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-800/60 font-semibold AmharicText">
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5">የአካል ብቃት እንቅስቃሴ ግብ (አማርኛ)</span>
                          <p>{lifestyleTargets?.activityTargetAm}</p>
                        </div>
                      </div>
                    </div>

                  </div>

                  {/* RIGHT: Chatbot Screen */}
                  <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 flex flex-col h-[520px] shadow-2xl relative overflow-hidden">
                    <div className="flex items-center gap-2 pb-4 border-b border-slate-800/80 shrink-0">
                      <Sparkles className="w-5 h-5 text-indigo-400 animate-pulse" />
                      <div>
                        <h4 className="font-bold text-white text-sm">Personal Wellness Chat</h4>
                        <p className="text-[10px] text-slate-500">Ask about diets, exercises, or warning alerts</p>
                      </div>
                    </div>

                    {/* Chat Logs */}
                    <div className="flex-1 overflow-y-auto py-4 space-y-3 pr-2 scrollbar-thin">
                      {chatMessages.map((msg, idx) => (
                        <div 
                          key={idx} 
                          className={`flex flex-col max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed ${
                            msg.role === "coach" 
                              ? "bg-slate-800/60 border border-slate-850 text-slate-200 self-start rounded-tl-none mr-auto" 
                              : "bg-indigo-600 text-white self-end rounded-tr-none ml-auto"
                          }`}
                        >
                          <p>{msg.text}</p>
                          {msg.textAm && (
                            <p className="mt-1.5 pt-1.5 border-t border-slate-700/30 text-indigo-200 font-semibold AmharicText">
                              {msg.textAm}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Message Box */}
                    <form onSubmit={handleSendMessage} className="relative mt-2 shrink-0">
                      <input
                        id="chat-widget-input"
                        type="text"
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        placeholder="Type standard food or activity query..."
                        className="w-full h-11 bg-slate-950 border border-slate-800 rounded-xl pl-3 pr-12 text-xs font-medium text-slate-100 placeholder:text-slate-650 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                      />
                      <button
                        type="submit"
                        id="btn-chat-send"
                        className="absolute right-1.5 top-1.5 h-8 w-8 bg-indigo-650 hover:bg-indigo-700 text-white rounded-lg flex items-center justify-center transition-colors"
                      >
                        <Send className="w-3.5 h-3.5" />
                      </button>
                    </form>
                  </div>

                </div>
              </div>
            )}

          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/80 py-6 text-center text-slate-500 text-xs shrink-0">
        <p>© 2026 MyHealthID-Core Platform. All rights reserved. Secured under Ethiopian e-Gov & Fayda Interoperability Standards.</p>
      </footer>
    </div>
  );
}
