import React from "react";
import prisma from "@/lib/prisma";
import BootstrapClient from "./BootstrapClient";
import { ShieldAlert } from "lucide-react";
import Link from "next/link";

export default async function SystemBootstrapPage() {
  const existingCount = await prisma.user.count({
    where: { role: "SYSTEM_ADMINISTRATOR" },
  });

  if (existingCount > 0) {
    return (
      <div className="min-h-screen bg-[#06060a] flex items-center justify-center p-6 text-center">
        <div className="max-w-md w-full bg-neutral-900/60 border border-neutral-800/60 rounded-2xl p-8 backdrop-blur-md">
          <div className="w-16 h-16 rounded-full bg-red-500/15 border border-red-500/30 flex items-center justify-center mx-auto mb-5">
            <ShieldAlert className="w-8 h-8 text-red-400" />
          </div>
          <h1 className="text-2xl font-black text-white mb-2">Access Denied</h1>
          <p className="text-neutral-400 text-sm mb-6">
            A System Administrator already exists. The bootstrap mechanism is permanently disabled for security reasons.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-semibold text-sm transition-all"
          >
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  return <BootstrapClient />;
}
