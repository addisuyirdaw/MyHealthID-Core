import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getPatientClinicalContext } from "@/lib/ai/getPatientClinicalContext";

const ALLOWED_ROLES = new Set([
  "DOCTOR",
  "GENERAL_PRACTITIONER",
  "MEDICAL_SPECIALIST",
  "SUB_SPECIALIST",
  "IT_HIS_ADMIN",
  "HOSPITAL_CEO",
  "ADMIN",
  "HIS_ADMINISTRATOR",
]);

const GEMINI_API_KEY = process.env.GEMINI_API_KEY ?? "";
const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:streamGenerateContent?alt=sse";

const SYSTEM_PROMPT = `You are a clinical AI assistant embedded in MyHealthID, an Ethiopian hospital information system.
You will be given a structured JSON payload containing the COMPLETE and REAL medical history of a patient retrieved directly from the hospital database.

CRITICAL RULES:
1. Base ALL statements EXCLUSIVELY on the data in the attached JSON. Never invent, assume, or extrapolate any clinical facts.
2. If a section has no data, output exactly: "No history recorded in system."
3. Structure your response into exactly these four sections, using these exact markdown headers:
   ## 🚨 Safety Alerts & Allergies
   ## 💊 Active Medications & Adherence
   ## 🔬 Lab Results & Vitals Trends
   ## 📋 Clinical Notes & Timeline Summary
4. Be concise, scannable, and clinically precise. Use bullet points inside each section.
5. Highlight CRITICAL or ABNORMAL values with a ⚠️ prefix.
6. Do NOT include any preamble, greeting, or closing remarks.`;

function buildMockStream(ctx: Awaited<ReturnType<typeof getPatientClinicalContext>>) {
  const p = ctx.patient;
  const name = p?.fullName ?? "the patient";
  const allergies = p?.allergyInformation ?? null;
  const conditions = p?.preExistingConditions ?? null;
  const latestVitals = ctx.vitals[0];
  const activeMeds = ctx.prescriptions.filter((rx) => rx.status === "PENDING" || rx.status === "DISPENSED");
  const criticalLabs = ctx.labResults.filter((l) => l.isCritical || l.isAbnormal);

  const lines = [
    `## 🚨 Safety Alerts & Allergies`,
    allergies ? `- **Known Allergies:** ${allergies}` : "- No history recorded in system.",
    conditions ? `- **Pre-existing Conditions:** ${conditions}` : "",
    p?.emergencyFlag ? `- ⚠️ Emergency Flag is ACTIVE for ${name}.` : "",
    ``,
    `## 💊 Active Medications & Adherence`,
    activeMeds.length > 0
      ? activeMeds
          .slice(0, 8)
          .map((rx) => `- **${rx.drugName}** — ${rx.dosage}, ${rx.frequency} for ${rx.duration} [${rx.status}]`)
          .join("\n")
      : "- No history recorded in system.",
    ``,
    `## 🔬 Lab Results & Vitals Trends`,
    latestVitals
      ? `- **Latest Vitals (${new Date(latestVitals.createdAt).toLocaleDateString()}):** BP ${latestVitals.bp} | Pulse ${latestVitals.pulse} bpm | Temp ${latestVitals.temp}°C | SpO₂ ${latestVitals.spO2}% | RR ${latestVitals.rr}`
      : "- No vitals recorded in system.",
    criticalLabs.length > 0
      ? criticalLabs.map((l) => `- ⚠️ **${l.testName}:** ${l.textValue ?? l.value} (${l.isCritical ? "CRITICAL" : "ABNORMAL"})`).join("\n")
      : ctx.labResults.length > 0
      ? ctx.labResults.slice(0, 5).map((l) => `- **${l.testName}:** ${l.textValue ?? l.value}`).join("\n")
      : "- No lab results recorded in system.",
    ``,
    `## 📋 Clinical Notes & Timeline Summary`,
    ctx.medicalRecords.length > 0
      ? ctx.medicalRecords
          .slice(0, 5)
          .map((r) => `- **[${r.recordType}] ${r.title}** (${new Date(r.recordedAt).toLocaleDateString()}): ${r.content.slice(0, 120)}${r.content.length > 120 ? "…" : ""}`)
          .join("\n")
      : "- No history recorded in system.",
    p?.chiefComplaint ? `- **Chief Complaint on Admission:** ${p.chiefComplaint}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  return lines;
}

export async function POST(req: NextRequest) {
  // RBAC Guard
  const cookieStore = cookies();
  const role = cookieStore.get("userRole")?.value ?? "";
  if (!ALLOWED_ROLES.has(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let patientId: string;
  try {
    const body = await req.json();
    patientId = body.patientId as string;
    if (!patientId) throw new Error("Missing patientId");
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  // Fetch real-time clinical context from database
  const clinicalContext = await getPatientClinicalContext(patientId);

  if (!clinicalContext.patient) {
    return NextResponse.json({ error: "Patient not found" }, { status: 404 });
  }

  const contextJson = JSON.stringify(clinicalContext, null, 2);

  // --- Mock fallback if no real API key is configured ---
  const isMock =
    !GEMINI_API_KEY ||
    GEMINI_API_KEY === "your-api-key" ||
    GEMINI_API_KEY.startsWith("AIzaSy_placeholder");

  if (isMock) {
    const mockText = buildMockStream(clinicalContext);
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const words = mockText.split(/(?<=\s)/);
        for (const word of words) {
          controller.enqueue(encoder.encode(word));
          await new Promise((r) => setTimeout(r, 18));
        }
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "X-AI-Source": "mock",
        "Cache-Control": "no-cache",
      },
    });
  }

  // --- Real Gemini API streaming ---
  const geminiPayload = {
    system_instruction: {
      parts: [{ text: SYSTEM_PROMPT }],
    },
    contents: [
      {
        role: "user",
        parts: [
          {
            text: `Please analyze and summarize the following patient's clinical history.\n\nPATIENT CLINICAL DATA:\n\`\`\`json\n${contextJson}\n\`\`\``,
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 1500,
    },
  };

  try {
    const geminiRes = await fetch(`${GEMINI_URL}&key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(geminiPayload),
    });

    if (!geminiRes.ok || !geminiRes.body) {
      throw new Error(`Gemini API error: ${geminiRes.status}`);
    }

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    // Parse SSE stream from Gemini and re-stream plain text to client
    const stream = new ReadableStream({
      async start(controller) {
        const reader = geminiRes.body!.getReader();
        let buffer = "";

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() ?? "";

            for (const line of lines) {
              if (!line.startsWith("data: ")) continue;
              const jsonStr = line.slice(6).trim();
              if (jsonStr === "[DONE]") continue;
              try {
                const parsed = JSON.parse(jsonStr);
                const text =
                  parsed?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
                if (text) {
                  controller.enqueue(encoder.encode(text));
                }
              } catch {
                // Skip malformed SSE events
              }
            }
          }
        } finally {
          reader.releaseLock();
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "X-AI-Source": "gemini",
        "Cache-Control": "no-cache",
      },
    });
  } catch (err) {
    console.error("[AI Patient Summary] Gemini error:", err);
    // Fall back to mock on Gemini failure
    const mockText = buildMockStream(clinicalContext);
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const words = mockText.split(/(?<=\s)/);
        for (const word of words) {
          controller.enqueue(encoder.encode(word));
          await new Promise((r) => setTimeout(r, 18));
        }
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "X-AI-Source": "mock-fallback",
        "Cache-Control": "no-cache",
      },
    });
  }
}
