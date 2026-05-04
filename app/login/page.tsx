import { loginUser } from "@/lib/actions/auth.actions";
import { Button } from "@/components/ui/button";
import { ShieldCheck } from "lucide-react";
import { LocalizedText } from "@/components/LocalizedText";

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center relative overflow-hidden p-6">
      {/* Background Decor */}
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-white/80 backdrop-blur-xl border border-slate-200 shadow-2xl rounded-3xl p-8 relative z-10">
        <div className="flex justify-center mb-6">
          <div className="bg-blue-50 p-4 rounded-full">
            <ShieldCheck className="w-12 h-12 text-blue-600" />
          </div>
        </div>

        <h1 className="text-3xl font-extrabold text-center text-slate-900 mb-2">
          <LocalizedText tKey="login.title" />
        </h1>
        <p className="text-center text-slate-500 font-medium mb-8">
          <LocalizedText tKey="login.subtitlePre" /><span className="text-blue-600 font-bold">ID</span><LocalizedText tKey="login.subtitlePost" />
        </p>

        <form action={loginUser} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-bold text-slate-700 uppercase tracking-wider block">
              <LocalizedText tKey="login.emailLabel" />
            </label>
            <input 
              type="text" 
              id="email" 
              name="email"
              placeholder="dr.name@myhealthid.gov.et" 
              className="w-full h-12 rounded-xl border border-slate-300 bg-slate-50 px-4 font-medium text-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="role" className="text-sm font-bold text-slate-700 uppercase tracking-wider block">
              <LocalizedText tKey="login.roleLabel" />
            </label>
            <select 
              id="role" 
              name="role" 
              required
              defaultValue=""
              className="w-full h-12 rounded-xl border border-slate-300 bg-slate-50 px-4 font-medium text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
            >
              <option value="" disabled>Select your credentials...</option>
              <option value="ADMIN">Medical Director (Admin)</option>
              <option value="DOCTOR">Attending Doctor</option>
              <option value="PHARMACIST">Head Pharmacist</option>
              <option value="LAB_TECH">Lab Technician</option>
              <option value="NURSE">Triage Nurse</option>
              <option value="RECEPTIONIST">Receptionist</option>
            </select>
          </div>

          <div className="space-y-2 mb-2">
            <label htmlFor="password" className="text-sm font-bold text-slate-700 uppercase tracking-wider block">
              <LocalizedText tKey="login.passwordLabel" />
            </label>
            <input 
              type="password" 
              id="password" 
              name="password"
              placeholder="••••••••" 
              className="w-full h-12 rounded-xl border border-slate-300 bg-slate-50 px-4 font-medium text-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
            />
            <p className="text-xs text-slate-400 mt-1"><LocalizedText tKey="login.simNote" /></p>
          </div>

          <Button type="submit" className="w-full h-12 text-lg font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg shadow-blue-200 mt-4">
            <LocalizedText tKey="login.secureLogin" />
          </Button>
        </form>
      </div>
    </div>
  );
}
