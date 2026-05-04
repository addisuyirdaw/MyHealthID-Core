"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signInCitizen } from "@/lib/actions/patient.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { User, Activity, AlertCircle } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";
import Link from "next/link";

export default function SignInPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [identifier, setIdentifier] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim()) return;
    
    setLoading(true);
    setError(false);
    
    try {
      const result = await signInCitizen(identifier);
      if (result.success && result.patientId) {
        // "If Found: Redirect them immediately to /patients/[id]/clinical-records"
        router.push(`/patients/${result.patientId}/clinical-records`);
      } else {
        setError(true);
        setLoading(false);
      }
    } catch (err) {
      setError(true);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 relative overflow-hidden flex items-center justify-center p-4">
      <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] rounded-full bg-blue-500/10 blur-3xl" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-emerald-500/10 blur-3xl" />
      
      <Card className="w-full max-w-md border-white/40 bg-white/80 backdrop-blur-2xl shadow-xl relative z-10">
        <form onSubmit={handleSignIn}>
          <CardHeader className="space-y-1 pb-6 text-center">
            <div className="mx-auto bg-blue-50 w-16 h-16 rounded-2xl flex items-center justify-center mb-2 shadow-inner border border-blue-100">
              <User className="h-8 w-8 text-blue-600" />
            </div>
            <CardTitle className="text-2xl font-bold tracking-tight text-slate-900">{t.signin.title}</CardTitle>
            <CardDescription className="text-slate-500">{t.signin.subtitle}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start shadow-sm animate-in fade-in slide-in-from-top-2">
                <AlertCircle className="w-5 h-5 text-red-600 mr-3 shrink-0 mt-0.5" />
                <div className="text-left text-red-800 text-sm">
                   <p className="font-bold mb-1">{t.signin.notFoundTitle}</p>
                   <p className="font-medium text-red-700/90">{t.signin.notFoundDesc}</p>
                   <Link href="/register" className="inline-block mt-2 font-bold text-blue-600 hover:text-blue-800 underline underline-offset-2">
                     {t.signin.registerLink}
                   </Link>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="identifier" className="text-sm font-bold text-slate-700 block">
                {t.signin.idLabel}
              </label>
              <Input 
                id="identifier"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder={t.signin.idPlaceholder} 
                className="text-center font-mono text-lg h-14 bg-slate-50 border-slate-300 focus:border-blue-500 focus:ring-blue-500 rounded-xl"
                required
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={loading || !identifier.trim()} className="w-full h-14 text-lg font-bold bg-blue-600 hover:bg-blue-700 shadow-lg text-white rounded-xl">
              {loading ? <Activity className="w-5 h-5 mr-2 animate-spin" /> : <User className="w-5 h-5 mr-2" />}
              {t.signin.accessButton}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
