import { NextResponse } from "next/server";
import { loginPatientSession } from "@/lib/actions/patient.actions";

export async function POST(request: Request) {
  try {
    const { patientId, healthId } = await request.json();
    if (!patientId || !healthId) {
      return NextResponse.json({ error: "Missing patientId or healthId" }, { status: 400 });
    }
    const result = await loginPatientSession({ patientId, healthId });
    if (result.success) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ error: result.error || "Failed to login patient" }, { status: 500 });
    }
  } catch (error: any) {
    console.error("❌ auto-login API error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
