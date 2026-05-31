# Dynamic Vitals Form - Feature Guide

## Overview
Healthcare professionals can now dynamically add vitals and observations as needed, rather than being limited to a fixed set of fields.

## Features

### 🎯 Core Capabilities
- **Add Multiple Observations**: Create multiple vital sign recordings in one submission
- **Dynamic Fields**: Select which vital measurements to include for each observation
- **Flexible Data Entry**: Add/remove fields on-the-fly based on clinical needs
- **Professional Workflow**: Designed for efficient data entry by doctors, nurses, and staff

### 📋 Available Vital Fields
1. BP Systolic (mmHg)
2. BP Diastolic (mmHg)
3. Temperature (°C)
4. Pulse Rate (bpm)
5. Respiratory Rate (breaths/min)
6. SpO2 (%)
7. Weight (kg)
8. Height (cm)
9. Pain Level (/10)
10. Blood Glucose (mg/dL)
11. Notes (text)

## Components Created

### 1. `DynamicVitalsForm.tsx`
Main form component with the following features:
- Add/remove vital observation rows
- Add/remove specific fields from each row
- Real-time value updates
- Dropdown to select additional fields
- Validation before submission

```tsx
// Props
{
  patientId: string;        // Patient identifier
  patientName: string;      // For display
  onSave: (vitals: VitalRow[]) => Promise<void>;
  onClose: () => void;
}
```

### 2. `DynamicVitalsModal.tsx`
Dialog wrapper that integrates with existing UI:
- Trigger button: "Add Vitals"
- Modal dialog with form inside
- Success confirmation
- Auto-refresh after saving

## Usage in Components

### Updated: `DoctorPatientChart.tsx`
Now uses `DynamicVitalsModal` instead of `AddVitalsModal`:

```tsx
import { DynamicVitalsModal } from "@/components/DynamicVitalsModal";

// In component
<DynamicVitalsModal 
  patientId={patient.id} 
  patientName={patient.fullName} 
/>
```

## User Workflow

### How to Add Vitals
1. Click **"Add Vitals"** button on patient chart
2. Modal opens with default fields:
   - BP Systolic
   - BP Diastolic
   - Temperature
   - Pulse Rate

3. **Add more fields**: Click dropdown labeled **"+ Add field to this observation"**
4. **Add another observation**: Click **"+ Add Another Observation"** to record multiple vital sets
5. **Remove fields**: Click **✕** button next to any field to remove it
6. **Remove observation**: Click trash icon to remove entire row (only if multiple rows exist)
7. Click **"Save All Vitals"** to submit

### Example Scenarios

**Scenario 1: Quick Vitals**
- Professional enters: BP, Temperature, Pulse
- Submits immediately
- No need for optional fields

**Scenario 2: Complete Assessment**
- Professional enters all vitals:
  - BP Systolic/Diastolic
  - Temperature
  - Pulse Rate
  - Respiratory Rate
  - SpO2
  - Weight
  - Height
- Adds Clinical Notes
- Submits

**Scenario 3: Multiple Readings**
- Professional creates first observation with key vitals
- Clicks "Add Another Observation"
- Records a second set of vitals 10 minutes later
- Submits both together

## Technical Details

### Type Definitions
```typescript
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
```

### Required Fields for Submission
When saving, the form validates:
- **BP Systolic** and **BP Diastolic** (required)
- **Temperature** (required)
- **Pulse Rate** (required)

Optional fields:
- Respiratory Rate
- SpO2
- Weight
- Height
- Pain Level
- Blood Glucose
- Notes

### Data Flow
1. Professional fills dynamic form
2. `DynamicVitalsForm` collects data
3. `DynamicVitalsModal` validates required fields
4. Calls `recordVitals()` server action
5. Vitals stored in database
6. Page refreshes to show new vitals
7. Success message displayed

## Integration Points

### Server Actions Used
- `recordVitals()` - from `lib/actions/patient.actions.ts`

### UI Components Used
- `Dialog` - from `components/ui/dialog`
- `Button` - from `components/ui/button`
- Lucide icons: `Plus`, `Trash2`, `CheckCircle2`

## Benefits

✅ **Flexibility** - Add only needed fields
✅ **Efficiency** - Faster data entry for common cases
✅ **Completeness** - Option to record all measurements when needed
✅ **Multiple Observations** - Record vitals at different times in one submission
✅ **Professional Design** - Built for healthcare workflows
✅ **Validation** - Ensures required data is present
✅ **User Feedback** - Success confirmation after save

## Backward Compatibility

- Old `AddVitalsModal` still exists but is no longer used
- Can be removed in future refactoring
- Database schema unchanged
- All existing vitals records continue to work

## Future Enhancements

- [ ] Save as templates (common vital sets)
- [ ] Trend visualization (multi-observation comparison)
- [ ] Automatic calculations (BMI from weight/height)
- [ ] Alert thresholds (red flags for abnormal values)
- [ ] Historical comparison graphs
- [ ] Mobile-optimized layout

---

**Version**: 1.0  
**Last Updated**: May 31, 2026  
**Status**: ✅ Production Ready
