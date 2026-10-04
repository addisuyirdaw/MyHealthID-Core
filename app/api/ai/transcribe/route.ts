import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/session";
import prisma from "@/lib/prisma";
import { CROSS_FACILITY } from "@/lib/utils/tenantContext";

export async function POST(req: Request) {
  try {
    // 1. Session validation
    const cookieStore = cookies();
    const sessionToken = cookieStore.get("session_token")?.value;
    const citizenToken = cookieStore.get("citizenSessionToken")?.value;
    let userId = null;
    let userRole = null;
    
    if (sessionToken) {
      const payload = verifyToken(sessionToken);
      if (payload) {
        userId = payload.patientId;
        userRole = payload.role;
      }
    } else if (citizenToken) {
      const payload = verifyToken(citizenToken);
      if (payload) {
        userId = payload.patientId;
        userRole = payload.role;
      }
    }

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    let user = null;
    if (userRole !== "CITIZEN") {
      // Verify user exists and is a clinician/staff
      user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) {
        return NextResponse.json({ error: "Unauthorized access" }, { status: 403 });
      }
    }

    const formData = await req.formData();
    const file = formData.get("audio") as Blob;
    const appointmentId = formData.get("appointmentId") as string;
    const patientId = formData.get("patientId") as string;
    console.log("Transcribe request:", { appointmentId, patientId });

    if (!file || (!appointmentId && !patientId)) {
      return NextResponse.json({ error: "Missing audio or identifiers" }, { status: 400 });
    }

    // 2. Validate authorization
    if (userRole === "CITIZEN") {
      if (!patientId || patientId !== userId) {
        return NextResponse.json({ error: "Unauthorized patient access" }, { status: 403 });
      }
      // Citizens cannot transcribe an appointment's audio directly if it belongs to a facility, unless we want to allow it.
      // But they transcribe for themselves.
      if (appointmentId) {
         // Optionally, we could let them transcribe against their own appointment if they want, but let's restrict to just patientId for now
      }
    } else if (appointmentId) {
      const appointment = await prisma.appointment.findUnique({ where: { id: appointmentId } });
      if (!appointment || appointment.facilityId !== user?.organizationId) {
        return NextResponse.json({ error: "Unauthorized appointment access" }, { status: 403 });
      }
    } else if (patientId) {
      // If no appointment, just verify patient exists
      console.log("Looking up patient:", patientId);
      const patient = await prisma.patient.findFirst({ where: { ...CROSS_FACILITY, id: patientId } as any });
      if (!patient) {
        console.log("Patient not found!");
        return NextResponse.json({ error: "Patient not found" }, { status: 404 });
      }
    }

    // 3. Prepare audio for Gemini
    const arrayBuffer = await file.arrayBuffer();
    const base64Audio = Buffer.from(arrayBuffer).toString("base64");
    const mimeType = file.type || "audio/webm";

    // 4. Call Gemini 1.5 Flash for transcription
    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) {
      return NextResponse.json({ error: "Transcription service unavailable" }, { status: 503 });
    }

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`;
    
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              { text: "You are a professional medical transcriber. Transcribe the following audio into a CLEAN, readable transcript. Remove all stutters, false starts, and filler words (like 'uh', 'um'). It may be in English, Amharic, or a mix of both. Do not add any extra text, only the cleaned transcription." },
              {
                inlineData: {
                  mimeType: mimeType,
                  data: base64Audio
                }
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.1, // low temperature for accurate transcription
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gemini Transcription Error:", errorText);
      return NextResponse.json({ error: "Transcription failed" }, { status: 502 });
    }

    const data = await response.json();
    const transcript = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!transcript) {
      return NextResponse.json({ error: "Empty transcription result" }, { status: 500 });
    }

    // 5. Return transcript (do not save audio anywhere)
    return NextResponse.json({ transcript });

  } catch (error) {
    console.error("Transcribe route error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
