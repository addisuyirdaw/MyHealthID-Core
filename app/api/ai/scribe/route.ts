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

    const { transcript, appointmentId, patientId } = await req.json();

    if (!transcript || (!appointmentId && !patientId)) {
      return NextResponse.json({ error: "Missing transcript or identifiers" }, { status: 400 });
    }

    // 2. Validate authorization
    if (userRole === "CITIZEN") {
      if (!patientId || patientId !== userId) {
        return NextResponse.json({ error: "Unauthorized patient access" }, { status: 403 });
      }
    } else if (appointmentId) {
      const appointment = await prisma.appointment.findUnique({ where: { id: appointmentId } });
      if (!appointment || appointment.facilityId !== user?.organizationId) {
        return NextResponse.json({ error: "Unauthorized appointment access" }, { status: 403 });
      }
    } else if (patientId) {
      // If no appointment, just verify patient exists
      const patient = await prisma.patient.findFirst({ where: { ...CROSS_FACILITY, id: patientId } as any });
      if (!patient) {
        return NextResponse.json({ error: "Patient not found" }, { status: 404 });
      }
    }

    // 3. Call Gemini 1.5 Flash for JSON extraction
    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) {
      return NextResponse.json({ error: "Scribe service unavailable" }, { status: 503 });
    }

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    
    let systemPrompt = "";
    if (userRole === "CITIZEN") {
      systemPrompt = `You are a Patient AI Scribe. 
Your task is to analyze the patient's report (text or transcribed audio) and produce a structured DRAFT note.

CRITICAL RULES:
- The AI must NOT invent missing information.
- If the patient does not provide something, mark it as: "Not provided" or "Not reported."
- Do not infer medical facts.
- Do not diagnose conditions or prescribe medication.
- This is a patient-generated health note to be shared with their doctor.

STRICT JSON SCHEMA REQUIRED:
{
  "mainConcern": "string",
  "whenStarted": "string",
  "duration": "string",
  "symptoms": ["string"],
  "aggravatingOrAlleviatingFactors": "string",
  "relevantHistory": "string",
  "patientQuestions": "string",
  "missingInformation": "string"
}

If a field is not supported by the transcript, return "Not reported." for strings and [] for arrays.
Do not return markdown. Do not return explanations outside JSON. Return ONLY the JSON object.`;
    } else {
      systemPrompt = `You are an AI Clinical Scribe assisting a clinician.
Your task is to analyze the provided doctor-patient transcript and produce a documentation DRAFT.

CRITICAL RULES:
- Produce a documentation DRAFT, not a diagnosis.
- Never invent information that was not present in the transcript.
- If information is absent, return an empty value.
- Preserve uncertainty.
- Do not turn guesses into facts.
- Do not generate prescriptions or orders.
- Do not modify historical records.
- Do not claim that a clinician performed an action unless stated in the transcript.
- Support both English and Amharic transcripts.
- If the conversation contains mixed Amharic/English, preserve the meaning and produce structured clinical documentation suitable for the existing form (prefer English for standard medical terms unless Amharic is heavily used).

STRICT JSON SCHEMA REQUIRED:
{
  "chiefComplaint": "string",
  "historyOfPresentIllness": "string",
  "symptoms": ["string"],
  "relevantHistory": "string",
  "assessmentDraft": "string",
  "planDraft": "string"
}

If a field is not supported by the transcript, return "" for string and [] for arrays.
Do not return markdown. Do not return explanations outside JSON. Return ONLY the JSON object.`;
    }

    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: systemPrompt }]
        },
        contents: [
          {
            role: "user",
            parts: [{ text: `Transcript:\n\n${transcript}` }]
          }
        ],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: "application/json",
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gemini Scribe Error:", errorText);
      return NextResponse.json({ error: "Scribe extraction failed" }, { status: 502 });
    }

    const data = await response.json();
    const resultText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!resultText) {
      return NextResponse.json({ error: "Empty scribe result" }, { status: 500 });
    }

    let parsedJson;
    try {
      parsedJson = JSON.parse(resultText);
    } catch (e) {
      console.error("Failed to parse Gemini output as JSON", resultText);
      return NextResponse.json({ error: "Malformed AI response" }, { status: 500 });
    }

    // Return the parsed JSON draft (never write to DB here)
    return NextResponse.json({ draft: parsedJson });

  } catch (error) {
    console.error("Scribe route error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
