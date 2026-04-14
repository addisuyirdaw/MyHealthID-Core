import { loginUser } from "@/lib/actions/auth.actions";
import { Button } from "@/components/ui/button";
import { ShieldCheck } from "lucide-react";

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center relative overflow-hidden p-6">
      {/* Background Decor */}
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-white/80 backdrop-blur-xl border border-slate-200 shadow-2xl rounded-3xl p-8 relative z-10">
        <div className="flex justify-center mb-6">
          <div className="bg-indigo-50 p-4 rounded-full">
            <ShieldCheck className="w-12 h-12 text-indigo-600" />
          </div>
        </div>

        <h1 className="text-3xl font-extrabold text-center text-slate-900 mb-2">Staff Portal</h1>
        <p className="text-center text-slate-500 font-medium mb-8">
          Authenticate to access the MyHealth<span className="text-indigo-600 font-bold">ID</span> secure clinical network.
        </p>

        <form action={loginUser} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="role" className="text-sm font-bold text-slate-700 uppercase tracking-wider block">Access Role</label>
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
            <label htmlFor="password" className="text-sm font-bold text-slate-700 uppercase tracking-wider block">Security Pin</label>
            <input 
              type="password" 
              id="password" 
              placeholder="••••••••" 
              className="w-full h-12 rounded-xl border border-slate-300 bg-slate-50 px-4 font-medium text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
            />
            <p className="text-xs text-slate-400 mt-1">Note: Simulation mode enabled. Any PIN is accepted.</p>
          </div>

          <Button type="submit" className="w-full h-12 text-lg font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-lg shadow-indigo-200 mt-4">
            Secure Login
          </Button>
        </form>
      </div>
    </div>
  );
}
