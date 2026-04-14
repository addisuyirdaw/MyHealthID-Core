"use client";

import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

export function PrintButton() {
  return (
    <Button 
      onClick={() => window.print()}
      className="bg-slate-900 hover:bg-slate-800 text-white shadow-md print:hidden"
    >
      <Download className="w-4 h-4 mr-2" /> Download Medical Summary
    </Button>
  );
}
