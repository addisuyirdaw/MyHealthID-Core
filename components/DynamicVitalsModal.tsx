"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { recordVitals } from "@/lib/actions/patient.actions";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { DynamicVitalsForm } from "./DynamicVitalsForm";

interface VitalField {
  id: string;
  name: string;
  value: string;
  unit: string;
  type: "number" | "text";
}

interface VitalRow {
  id: string;
  fields: VitalField[];
  timestamp?: string;
}

export function DynamicVitalsModal({
  patientId,
  patientName,
}: {
  patientId: string;
  patientName: string;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const handleSave = async (rows: VitalRow[]) => {
    // Extract vitals from the first row (main observation)
    if (!rows || rows.length === 0) {
      throw new Error("No vitals to save");
    }

    const mainRow = rows[0];
    const getFieldValue = (name: string): number | undefined => {
      const field = mainRow.fields.find((f) => f.name === name);
      return field && field.value ? parseFloat(field.value) : undefined;
    };

    // Build BP string from systolic/diastolic
    const systolic = getFieldValue("BP Systolic");
    const diastolic = getFieldValue("BP Diastolic");
    
    if (systolic === undefined || diastolic === undefined) {
      throw new Error("BP Systolic and Diastolic are required");
    }

    const bp = `${Math.round(systolic)}/${Math.round(diastolic)}`;
    const temp = getFieldValue("Temperature");
    const pulse = getFieldValue("Pulse Rate");

    if (temp === undefined || pulse === undefined) {
      throw new Error("Temperature and Pulse Rate are required");
    }

    try {
      await recordVitals({
        patientId,
        bp,
        temp,
        pulse,
        rr: getFieldValue("Respiratory Rate"),
        spO2: getFieldValue("SpO2"),
        weight: getFieldValue("Weight"),
      });

      setOpen(false);
      router.refresh();
    } catch (error) {
      console.error(error);
      throw error;
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="text-slate-600 border-slate-300 gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Vitals
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>Record Patient Vitals</DialogTitle>
          <DialogDescription>
            Add vital signs and observations. Click the + button to add additional fields as needed.
          </DialogDescription>
        </DialogHeader>

        <DynamicVitalsForm
          patientId={patientId}
          patientName={patientName}
          onSave={handleSave}
          onClose={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
