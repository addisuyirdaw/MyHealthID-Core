import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SYSTEM_ADMIN_ROLES } from "@/lib/locales/enums";
import Link from "next/link";
import {
  ShieldAlert, LayoutDashboard, Building2, Users,
  ClipboardList, LogOut,
} from "lucide-react";
import { logoutUser } from "@/lib/actions/auth.actions";

export default function SystemAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = cookies();
  const userRole = cookieStore.get("userRole")?.value;
  const userName = cookieStore.get("userName")?.value ?? "Sys Admin";

  if (!userRole || !SYSTEM_ADMIN_ROLES.includes(userRole as any)) {
    redirect("/login");
  }

  const navLinks = [
    { href: "/system-admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/system-admin/facilities", label: "Facilities", icon: Building2 },
    { href: "/system-admin/users", label: "Users", icon: Users },
    { href: "/system-admin/audit-logs", label: "Audit Logs", icon: ClipboardList },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-neutral-100 flex">

      {/* ── SIDEBAR ── */}
      <aside className="hidden lg:flex flex-col w-60 shrink-0 border-r border-neutral-800/60 bg-neutral-900/60 backdrop-blur-md">
        {/* Logo */}
        <div className="px-5 pt-6 pb-5 border-b border-neutral-800/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-rose-600 to-orange-600 flex items-center justify-center shadow-lg shadow-rose-900/40">
              <ShieldAlert className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-white font-black text-sm leading-none tracking-tight">MyHealthID</p>
              <p className="text-rose-400 text-[10px] font-bold uppercase tracking-widest mt-0.5">Sys Admin</p>
            </div>
          </div>
        </div>

        {/* Nav links */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navLinks.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-neutral-400 hover:text-white hover:bg-neutral-800/70 transition-all group"
            >
              <Icon className="w-4 h-4 group-hover:text-rose-400 transition-colors" />
              {label}
            </Link>
          ))}
        </nav>

        {/* User + logout */}
        <div className="px-3 py-4 border-t border-neutral-800/60">
          <div className="flex items-center gap-3 px-3 py-2 mb-2">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-rose-500 to-orange-600 flex items-center justify-center text-[11px] font-black text-white shrink-0">
              {userName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-neutral-200 truncate">{userName}</p>
              <p className="text-[10px] text-rose-400 font-medium">System Administrator</p>
            </div>
          </div>
          <form action={logoutUser}>
            <button
              type="submit"
              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-neutral-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
            >
              <LogOut className="w-4 h-4" />
              Sign out
            </button>
          </form>
        </div>
      </aside>

      {/* ── MOBILE TOP NAV ── */}
      <div className="lg:hidden fixed top-0 inset-x-0 z-50 border-b border-neutral-800 bg-neutral-900/90 backdrop-blur-md px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-rose-600 to-orange-600 flex items-center justify-center">
            <ShieldAlert className="w-4 h-4 text-white" />
          </div>
          <span className="text-white font-black text-sm">Sys Admin</span>
        </div>
        <div className="flex items-center gap-1">
          {navLinks.map(({ href, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition"
            >
              <Icon className="w-4 h-4" />
            </Link>
          ))}
        </div>
      </div>

      {/* ── MAIN CONTENT ── */}
      <main className="flex-1 overflow-auto lg:pt-0 pt-14">
        {children}
      </main>
    </div>
  );
}
