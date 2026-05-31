"use client";

import { useState } from "react";
import { Plus, Trash2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

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

const AVAILABLE_VITALS = [
  { name: "BP Systolic", unit: "mmHg", type: "number" as const },
  { name: "BP Diastolic", unit: "mmHg", type: "number" as const },
  { name: "Temperature", unit: "°C", type: "number" as const },
  { name: "Pulse Rate", unit: "bpm", type: "number" as const },
  { name: "Respiratory Rate", unit: "breaths/min", type: "number" as const },
  { name: "SpO2", unit: "%", type: "number" as const },
  { name: "Weight", unit: "kg", type: "number" as const },
  { name: "Height", unit: "cm", type: "number" as const },
  { name: "Pain Level", unit: "/10", type: "number" as const },
  { name: "Blood Glucose", unit: "mg/dL", type: "number" as const },
  { name: "Notes", unit: "", type: "text" as const },
];

export function DynamicVitalsForm({
  patientId,
  patientName,
  onSave,
  onClose,
}: {
  patientId: string;
  patientName: string;
  onSave: (vitals: VitalRow[]) => Promise<void>;
  onClose: () => void;
}) {
  const [rows, setRows] = useState<VitalRow[]>([
    {
      id: "row-1",
      fields: [
        { id: "1", name: "BP Systolic", value: "", unit: "mmHg", type: "number" },
        { id: "2", name: "BP Diastolic", value: "", unit: "mmHg", type: "number" },
        { id: "3", name: "Temperature", value: "", unit: "°C", type: "number" },
        { id: "4", name: "Pulse Rate", value: "", unit: "bpm", type: "number" },
      ],
      timestamp: new Date().toISOString(),
    },
  ]);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  const addVitalRow = () => {
    const newRow: VitalRow = {
      id: `row-${Date.now()}`,
      fields: [
        { id: `${Date.now()}-1`, name: "BP Systolic", value: "", unit: "mmHg", type: "number" },
        { id: `${Date.now()}-2`, name: "BP Diastolic", value: "", unit: "mmHg", type: "number" },
        { id: `${Date.now()}-3`, name: "Temperature", value: "", unit: "°C", type: "number" },
        { id: `${Date.now()}-4`, name: "Pulse Rate", value: "", unit: "bpm", type: "number" },
      ],
      timestamp: new Date().toISOString(),
    };
    setRows([...rows, newRow]);
  };

  const removeRow = (rowId: string) => {
    setRows(rows.filter((r) => r.id !== rowId));
  };

  const addFieldToRow = (rowId: string, vitalType: string) => {
    const vitalDef = AVAILABLE_VITALS.find((v) => v.name === vitalType);
    if (!vitalDef) return;

    setRows(
      rows.map((row) => {
        if (row.id === rowId) {
          // Check if field already exists
          if (row.fields.some((f) => f.name === vitalType)) {
            return row;
          }
          return {
            ...row,
            fields: [
              ...row.fields,
              {
                id: `field-${Date.now()}`,
                name: vitalType,
                value: "",
                unit: vitalDef.unit,
                type: vitalDef.type,
              },
            ],
          };
        }
        return row;
      })
    );
  };

  const removeFieldFromRow = (rowId: string, fieldId: string) => {
    setRows(
      rows.map((row) => {
        if (row.id === rowId) {
          return {
            ...row,
            fields: row.fields.filter((f) => f.id !== fieldId),
          };
        }
        return row;
      })
    );
  };

  const updateFieldValue = (rowId: string, fieldId: string, value: string) => {
    setRows(
      rows.map((row) => {
        if (row.id === rowId) {
          return {
            ...row,
            fields: row.fields.map((f) =>
              f.id === fieldId ? { ...f, value } : f
            ),
          };
        }
        return row;
      })
    );
  };

  const handleSave = async () => {
    // Validate at least one field is filled
    const hasData = rows.some((row) =>
      row.fields.some((field) => field.value.trim() !== "")
    );

    if (!hasData) {
      alert("Please enter at least one vital measurement");
      return;
    }

    setSaving(true);
    try {
      await onSave(rows);
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 2000);
    } catch (error) {
      console.error(error);
      alert("Error saving vitals");
    } finally {
      setSaving(false);
    }
  };

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <CheckCircle2 className="h-12 w-12 text-green-500 mb-4" />
        <p className="text-lg font-medium">Vitals Recorded Successfully!</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-semibold text-slate-900 mb-2">Patient: {patientName}</h3>
        <p className="text-sm text-slate-600">Add vitals and observations dynamically</p>
      </div>

      {/* Vital Rows */}
      <div className="space-y-4 max-h-96 overflow-y-auto">
        {rows.map((row, rowIdx) => (
          <div
            key={row.id}
            className="border border-slate-200 rounded-lg p-4 bg-slate-50 space-y-3"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-700">
                Observation #{rowIdx + 1}
              </p>
              {rows.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeRow(row.id)}
                  className="text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>

            {/* Fields Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {row.fields.map((field) => (
                <div key={field.id} className="relative">
                  <div className="flex items-end gap-2">
                    <div className="flex-1">
                      <label className="text-xs font-medium text-slate-600">
                        {field.name}
                      </label>
                      <input
                        type={field.type}
                        step={field.type === "number" ? "0.1" : undefined}
                        value={field.value}
                        onChange={(e) =>
                          updateFieldValue(row.id, field.id, e.target.value)
                        }
                        placeholder={`e.g. 120${field.unit ? " " + field.unit : ""}`}
                        className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    {field.unit && (
                      <span className="text-xs text-slate-500 pb-1.5">
                        {field.unit}
                      </span>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFieldFromRow(row.id, field.id)}
                      className="text-slate-400 hover:text-red-600 pb-1"
                    >
                      ✕
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {/* Add Field Dropdown */}
            <div className="pt-2 border-t border-slate-200">
              <select
                onChange={(e) => {
                  if (e.target.value) {
                    addFieldToRow(row.id, e.target.value);
                    e.target.value = "";
                  }
                }}
                className="w-full text-sm px-2 py-1.5 border border-slate-300 rounded bg-white text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">+ Add field to this observation</option>
                {AVAILABLE_VITALS.filter(
                  (v) => !row.fields.some((f) => f.name === v.name)
                ).map((vital) => (
                  <option key={vital.name} value={vital.name}>
                    + {vital.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        ))}
      </div>

      {/* Add New Row Button */}
      <Button
        type="button"
        variant="outline"
        onClick={addVitalRow}
        className="w-full border-dashed border-slate-300"
      >
        <Plus className="w-4 h-4 mr-2" /> Add Another Observation
      </Button>

      {/* Save Button */}
      <div className="flex gap-2 pt-4 border-t border-slate-200">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          disabled={saving}
        >
          Cancel
        </Button>
        <Button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="flex-1"
        >
          {saving ? "Saving..." : "Save All Vitals"}
        </Button>
      </div>
    </div>
  );
}
