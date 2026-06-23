"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { selfRegisterCitizen, directCitizenSignIn } from "@/lib/actions/patient.actions";
import { useLanguage } from "@/components/LanguageProvider";
import { LanguageToggle } from "@/components/LanguageToggle";
import Link from "next/link";
import {
  User,
  Activity,
  AlertCircle,
  HeartPulse,
  ArrowRight,
  Shield,
  ShieldCheck,
  Key,
  CheckCircle2,
  Phone,
  Info,
  Calendar,
  Lock,
} from "lucide-react";

export default function SignUpPage() {
  const router = useRouter();
  const { t } = useLanguage();

  const [fullName, setFullName] = useState("");
  const [sex, setSex] = useState("MALE");
  const [age, setAge] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [registeredId, setRegisteredId] = useState<string | null>(null);

  // Unified Registration Goal & Security Verification State
  const [registrationGoal, setRegistrationGoal] = useState<"PROFILE_ONLY" | "PROFILE_AND_APPOINTMENT">("PROFILE_ONLY");
  const [showSecurityVerification, setShowSecurityVerification] = useState(false);
  const [faydaId, setFaydaId] = useState("");

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!fullName.trim() || !age.trim() || !phone.trim() || !password.trim()) {
      setError("All fields are required.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    const parsedAge = parseInt(age, 10);
    if (isNaN(parsedAge) || parsedAge < 0 || parsedAge > 130) {
      setError("Please enter a valid age.");
      return;
    }

    setLoading(true);

    try {
      const result = await selfRegisterCitizen({
        fullName: fullName.trim(),
        sex,
        age: parsedAge,
        phone: phone.trim(),
        password,
      });

      if (result.success && result.healthId) {
        if (registrationGoal === "PROFILE_AND_APPOINTMENT") {
          // Log them in immediately so the appointment page can access the session token
          const loginResult = await directCitizenSignIn(phone.trim(), password);
          if (loginResult.success) {
            router.push(`/citizen/appointments?newPatient=true&healthId=${result.healthId}`);
          } else {
            setError(loginResult.error || "Auto sign-in failed. Please sign in manually.");
            setLoading(false);
          }
        } else {
          setRegisteredId(result.healthId);
        }
      } else {
        setError(result.error || "Registration failed.");
        setLoading(false);
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
      setLoading(false);
    }
  };

  if (registeredId) {
    return (
      <div className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center p-4 relative overflow-hidden">
        {/* Ambient glows */}
        <div className="pointer-events-none absolute -top-32 -left-32 w-[480px] h-[480px] rounded-full bg-emerald-600/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -right-24 w-[400px] h-[400px] rounded-full bg-emerald-800/10 blur-3xl" />

        <div className="w-full max-w-lg relative z-10">
          <div className="bg-neutral-900/80 border border-neutral-800 rounded-3xl p-8 shadow-2xl backdrop-blur-xl ring-1 ring-white/5 text-center space-y-6">
            <div className="mx-auto w-20 h-20 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10 text-emerald-400" />
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl font-black text-white tracking-tight">
                Pre-Registration Successful!
              </h1>
              <p className="text-neutral-400 text-sm max-w-sm mx-auto">
                Your profile has been created. Use your new Temporary Health ID and password to sign in.
              </p>
            </div>

            {/* Health ID card style */}
            <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-5 font-mono text-center space-y-2">
              <p className="text-[10px] text-neutral-500 uppercase tracking-widest font-bold">Temporary Health ID</p>
              <p className="text-2xl font-black text-emerald-400 select-all">{registeredId}</p>
            </div>

            <div className="bg-amber-950/20 border border-amber-900/35 rounded-2xl p-5 text-left flex gap-3.5">
              <Info className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-200/80 space-y-1">
                <p className="font-bold text-amber-300">Identity Verification Required</p>
                <p className="leading-relaxed">
                  To unlock your full clinical records timeline and medical history sync, please present this ID `[{registeredId}]` to a front-desk receptionist during your next visit.
                </p>
              </div>
            </div>

            <div className="pt-2">
              <Link
                href="/signin"
                className="w-full h-14 flex items-center justify-center gap-2 text-base font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition-all shadow-lg shadow-emerald-900/30 active:scale-[0.98]"
              >
                Proceed to Sign In <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Language toggle */}
      <div className="absolute top-4 right-4 z-50">
        <LanguageToggle />
      </div>

      {/* Ambient glows */}
      <div className="pointer-events-none absolute -top-32 -left-32 w-[480px] h-[480px] rounded-full bg-blue-600/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 w-[400px] h-[400px] rounded-full bg-indigo-600/10 blur-3xl" />

      <div className="w-full max-w-md relative z-10 py-8">
        {/* Brand */}
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-900/40">
            <HeartPulse className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-white font-black text-base leading-none">MyHealthID</p>
            <p className="text-neutral-500 text-[11px] font-medium">National Health Network</p>
          </div>
        </div>

        {/* Card */}
        <div className="bg-neutral-900/70 border border-neutral-800 rounded-3xl p-8 shadow-2xl backdrop-blur-xl ring-1 ring-white/5">
          {/* Header */}
          <div className="flex flex-col items-center mb-6">
            <div className="w-14 h-14 rounded-2xl bg-blue-600/15 border border-blue-500/25 flex items-center justify-center mb-3">
              <User className="w-7 h-7 text-blue-400" />
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight text-center">
              Create Patient Profile
            </h1>
            <p className="text-neutral-500 text-xs mt-1 text-center leading-relaxed">
              Register a temporary record and verify at the facility to unlock history.
            </p>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="flex items-start gap-3 rounded-2xl bg-red-950/40 border border-red-500/25 px-4 py-3.5 text-xs text-red-200/90 mb-5 animate-in fade-in-50 duration-200">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-red-300">Registration Failed</p>
                <p className="mt-0.5 leading-relaxed">{error}</p>
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSignUp} className="space-y-4">
            {/* Registration Goal Segmented Control */}
            <div className="space-y-2">
              <label className="block text-[10px] font-bold uppercase tracking-widest text-blue-400">
                Select Registration Goal
              </label>
              <div className="grid grid-cols-2 p-1 bg-neutral-950 border border-neutral-800 rounded-xl">
                <button
                  type="button"
                  onClick={() => setRegistrationGoal("PROFILE_ONLY")}
                  className={`py-2 px-3 text-xs font-semibold rounded-lg transition-all ${
                    registrationGoal === "PROFILE_ONLY"
                      ? "bg-blue-600 text-white shadow-sm"
                      : "text-neutral-400 hover:text-white"
                  }`}
                >
                  Create Profile Only
                </button>
                <button
                  type="button"
                  onClick={() => setRegistrationGoal("PROFILE_AND_APPOINTMENT")}
                  className={`py-2 px-3 text-xs font-semibold rounded-lg transition-all ${
                    registrationGoal === "PROFILE_AND_APPOINTMENT"
                      ? "bg-blue-600 text-white shadow-sm"
                      : "text-neutral-400 hover:text-white"
                  }`}
                >
                  Profile &amp; Appointment
                </button>
              </div>
            </div>

            {/* Full Name */}
            <div className="space-y-1.5">
              <label htmlFor="signup-fullname" className="block text-[10px] font-bold uppercase tracking-widest text-blue-400">
                Full Name
              </label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500" />
                <input
                  id="signup-fullname"
                  type="text"
                  value={fullName}
                  onChange={(e) => { setFullName(e.target.value); setError(null); }}
                  placeholder="e.g. Dawit Kebede"
                  required
                  className="w-full bg-neutral-950 border border-neutral-700 text-white text-sm h-12 rounded-xl pl-10 pr-4 outline-none focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/30 transition-all placeholder:text-neutral-600"
                />
              </div>
            </div>

            {/* Sex & Age Row */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label htmlFor="signup-sex" className="block text-[10px] font-bold uppercase tracking-widest text-blue-400">
                  Sex
                </label>
                <select
                  id="signup-sex"
                  value={sex}
                  onChange={(e) => setSex(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-700 text-white text-sm h-12 rounded-xl px-4 outline-none focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/30 transition-all"
                >
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="signup-age" className="block text-[10px] font-bold uppercase tracking-widest text-blue-400">
                  Age
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500" />
                  <input
                    id="signup-age"
                    type="number"
                    min="0"
                    max="125"
                    value={age}
                    onChange={(e) => { setAge(e.target.value); setError(null); }}
                    placeholder="Yrs"
                    required
                    className="w-full bg-neutral-950 border border-neutral-700 text-white text-sm h-12 rounded-xl pl-10 pr-4 outline-none focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/30 transition-all placeholder:text-neutral-600"
                  />
                </div>
              </div>
            </div>

            {/* Phone Number */}
            <div className="space-y-1.5">
              <label htmlFor="signup-phone" className="block text-[10px] font-bold uppercase tracking-widest text-blue-400">
                Phone Number
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500" />
                <input
                  id="signup-phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => { setPhone(e.target.value); setError(null); }}
                  placeholder="e.g. 0911223344"
                  required
                  className="w-full bg-neutral-950 border border-neutral-700 text-white text-sm h-12 rounded-xl pl-10 pr-4 outline-none focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/30 transition-all placeholder:text-neutral-600"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label htmlFor="signup-password" className="block text-[10px] font-bold uppercase tracking-widest text-blue-400">
                Password
              </label>
              <div className="relative">
                <Key className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500" />
                <input
                  id="signup-password"
                  type="password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(null); }}
                  placeholder="Choose a password"
                  required
                  className="w-full bg-neutral-950 border border-neutral-700 text-white text-sm h-12 rounded-xl pl-10 pr-4 outline-none focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/30 transition-all placeholder:text-neutral-600"
                />
              </div>
            </div>

            {/* Confirm Password */}
            <div className="space-y-1.5">
              <label htmlFor="signup-confirm-password" className="block text-[10px] font-bold uppercase tracking-widest text-blue-400">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500" />
                <input
                  id="signup-confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => { setConfirmPassword(e.target.value); setError(null); }}
                  placeholder="Re-enter your password"
                  required
                  className="w-full bg-neutral-950 border border-neutral-700 text-white text-sm h-12 rounded-xl pl-10 pr-4 outline-none focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/30 transition-all placeholder:text-neutral-600"
                />
              </div>
            </div>

            {/* Collapsible Security Verification Section */}
            <div className="border border-neutral-800 rounded-xl overflow-hidden bg-neutral-950/40">
              <button
                type="button"
                onClick={() => setShowSecurityVerification(!showSecurityVerification)}
                className="w-full px-4 py-3 flex items-center justify-between text-xs font-bold uppercase tracking-widest text-blue-400 hover:bg-neutral-800/20 transition-all"
              >
                <span className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-blue-400" />
                  Security Verification (Optional)
                </span>
                <span className="text-[10px] text-neutral-500 font-normal">
                  {showSecurityVerification ? "Collapse" : "Expand"}
                </span>
              </button>
              
              {showSecurityVerification && (
                <div className="p-4 border-t border-neutral-800 space-y-3.5 bg-neutral-950/60 animate-in fade-in duration-200">
                  <div className="space-y-1.5">
                    <label htmlFor="signup-fayda" className="block text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                      Fayda National ID (FIN)
                    </label>
                    <input
                      id="signup-fayda"
                      type="text"
                      value={faydaId}
                      onChange={(e) => setFaydaId(e.target.value)}
                      placeholder="Enter 12 or 16 digit FIN"
                      className="w-full bg-neutral-950 border border-neutral-800 text-white text-xs h-10 rounded-lg px-3 outline-none focus:border-blue-500/60 transition-all placeholder:text-neutral-700"
                    />
                    <p className="text-[10px] text-neutral-500 leading-normal">
                      Linking your Fayda ID validates your health profile instantly and skips manual clinic verification.
                    </p>
                  </div>
                  
                  <div className="pt-2 border-t border-neutral-900 flex items-center justify-between">
                    <span className="text-[10px] text-neutral-500 font-semibold">Verification Mode:</span>
                    <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-950/35 px-2.5 py-0.5 rounded border border-emerald-900/30">
                      Manual Entry Enabled
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Submit */}
            <button
              id="signup-submit-btn"
              type="submit"
              disabled={loading}
              className="w-full h-12 flex items-center justify-center gap-2 text-sm font-bold bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl transition-all shadow-lg shadow-emerald-900/30 active:scale-[0.98] mt-2 cursor-pointer"
            >
              {loading ? (
                <><Activity className="w-4 h-4 animate-spin" /> Registering Profile…</>
              ) : (
                <><ShieldCheck className="w-4 h-4" /> Register &amp; Get Tracking ID</>
              )}
            </button>
          </form>

          {/* Divider + Sign In */}
          <div className="relative flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-neutral-800" />
            <span className="text-neutral-600 text-xs">or</span>
            <div className="flex-1 h-px bg-neutral-800" />
          </div>
          <Link
            href="/signin"
            className="flex items-center justify-center gap-2 w-full h-11 text-xs font-semibold border border-neutral-700 hover:border-neutral-600 text-neutral-300 hover:text-white rounded-xl transition-all hover:bg-neutral-800/60"
          >
            Already pre-registered? Sign In
          </Link>
        </div>

        <p className="text-center text-[10px] text-neutral-700 mt-6">
          MyHealthID · Secure National Health Information System
        </p>
      </div>
    </div>
  );
}
