"use client";

import { useTransition, useState } from "react";
import { checkInToQueue } from "@/lib/actions/queue.actions";
import { Button } from "@/components/ui/button";
import { CheckCircle, DoorOpen } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export function CheckInButton({ patientId }: { patientId: string }) {
  const [isPending, startTransition] = useTransition();
  const [success, setSuccess] = useState(false);
  // Optional: If you use the shadcn/ui toast, you could uncomment the hook below
  // const { toast } = useToast();

  const handleCheckIn = () => {
    startTransition(async () => {
      const result = await checkInToQueue(patientId);
      if (result.success) {
        setSuccess(true);
        // toast({ title: "Checked In", description: "Patient has been added to the queue." });
      } else {
        alert(result.message); // Fallback if toast isn't hooked up here locally
      }
    });
  };

  if (success) {
    return (
      <Button disabled variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 gap-2">
        <CheckCircle className="w-4 h-4" />
        Checked-In
      </Button>
    );
  }

  return (
    <Button 
      onClick={handleCheckIn} 
      disabled={isPending}
      className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2 shadow-lg hover:shadow-indigo-500/25 transition-all"
    >
      <DoorOpen className="w-4 h-4" />
      {isPending ? "Processing..." : "Check-In to Queue"}
    </Button>
  );
}
