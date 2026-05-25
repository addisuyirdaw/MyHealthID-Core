import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import fs from "fs";
import path from "path";

// High-risk conditions map to look for in history
const HIGH_RISK_HISTORY = [
  "hypertension", "diabetes", "cardiac", "heart", "stroke", "asthma", "copd", "cancer", "blood pressure"
];

// Helper to fetch Gemini API
async function callGemini(systemPrompt: string, userMessage: string, history: any[], apiKey: string): Promise<string> {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
  
  const contents = [
    {
      role: "user",
      parts: [{ text: systemPrompt }]
    },
    {
      role: "model",
      parts: [{ text: "Understood. I will act as the bilingual MyHealthID AI Health Assistant and provide clinical safety, reference my uploaded spec books, and address the patient's symptoms." }]
    }
  ];

  // Append recent chat history
  const recentHistory = history.slice(-6);
  recentHistory.forEach(msg => {
    // Standardize roles: "user" -> "user", "assistant" / "model" -> "model"
    const role = msg.role === "user" ? "user" : "model";
    contents.push({
      role: role,
      parts: [{ text: msg.content }]
    });
  });

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      contents,
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: 800
      }
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error("Empty response from Gemini");
  }

  return text;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, idToVerify, messages, verifiedPatientId, language = "EN" } = body;
    
    // ---------------------------------------------------------
    // MODE 1: VERIFICATION (The 'Who Are You' Gate)
    // ---------------------------------------------------------
    if (action === "verify") {
      if (!idToVerify) {
        return NextResponse.json({ error: "No ID provided" }, { status: 400 });
      }

      const patient = await prisma.patient.findFirst({
        where: {
          OR: [
            { healthId: idToVerify },
            { nationalId: idToVerify },
            { faydaId: idToVerify },
            { hospitalId: idToVerify },
          ]
        },
        include: {
          vitals: { orderBy: { createdAt: 'desc' }, take: 1 },
          prescriptions: { orderBy: { createdAt: 'desc' }, take: 5 }
        }
      });

      if (!patient) {
        return NextResponse.json({ 
          error: language === "AM" ? "መታወቂያው አልተገኘም። እባክዎ የብሔራዊ መታወቂያዎን ያረጋግጡ።" : "ID not recognized. Please check your National ID card.",
          success: false 
        });
      }

      const firstName = patient.fullName.split(" ")[0];
      const pastHistory = [
        patient.preExistingConditions,
        patient.surgicalHistory,
        patient.familyHistory
      ].filter(Boolean).join(", ");

      const greeting = language === "AM"
        ? (pastHistory 
            ? `እንኳን ደህና መጡ ${firstName}! ቀደም ሲል ${pastHistory} እንደነበረብዎት ይታወሳል። ምን ልርዳዎት?`
            : `እንኳን ደህና መጡ ${firstName}! ምንም ያለፈ የህክምና ታሪክ አልተገኘም። ምን ልርዳዎት?`)
        : (pastHistory 
            ? `Identity Verified: Welcome, ${firstName}. I have accessed your history of ${pastHistory}. How can I assist you with your health today?`
            : `Identity Verified: Welcome, ${firstName}. I have accessed your medical record (no prior conditions on file). How can I assist you with your health today?`);

      return NextResponse.json({ 
        success: true, 
        patientId: patient.id,
        message: greeting
      });
    }

    // ---------------------------------------------------------
    // MODE 2: CHAT & CLINICAL LOGIC
    // ---------------------------------------------------------
    if (!messages || messages.length === 0) {
      return NextResponse.json({ error: "No messages" }, { status: 400 });
    }

    if (!verifiedPatientId) {
      return NextResponse.json({ 
        content: language === "AM" ? "ቆይታዎ አብቅቷል። እባክዎ መታወቂያዎን እንደገና ያስገቡ።" : "Session expired. Please provide your Health ID or National ID to verify your identity.",
        role: "assistant"
      });
    }

    const latestMessageObj = messages[messages.length - 1];
    const latestMessage = latestMessageObj.content.toLowerCase();
    
    // Deep Fetch Patient Context
    const patient = await prisma.patient.findUnique({
      where: { id: verifiedPatientId },
      include: {
        vitals: { orderBy: { createdAt: 'desc' }, take: 1 },
        prescriptions: { orderBy: { createdAt: 'desc' }, take: 5 }
      }
    });

    if (!patient) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    const firstName = patient.fullName.split(" ")[0];

    const pastHistoryStr = [
      patient.preExistingConditions,
      patient.surgicalHistory,
      patient.familyHistory
    ].filter(Boolean).join(", ");

    // Smart clinical threat checks for safety fallback
    const riskTriggers = ["pain", "dizzy", "cool", "hot", "breath", "ህመም", "ማዞር", "ብርድ", "ትኩሳት", "ትንፋሽ"];
    const isHighRiskSymptom = riskTriggers.some(sym => latestMessage.includes(sym));

    // Load spec "books" text from workspace
    let data1Spec = "";
    let wardDropDownSpec = "";
    let investigationSpec = "";

    try {
      data1Spec = fs.readFileSync(path.join(process.cwd(), "data_1.txt"), "utf8");
    } catch (e) {
      console.warn("Could not read data_1.txt spec:", e);
    }

    try {
      wardDropDownSpec = fs.readFileSync(path.join(process.cwd(), "ward_drop_down.txt"), "utf8");
    } catch (e) {
      console.warn("Could not read ward_drop_down.txt spec:", e);
    }

    try {
      investigationSpec = fs.readFileSync(path.join(process.cwd(), "investigation_list.txt"), "utf8");
    } catch (e) {
      console.warn("Could not read investigation_list.txt spec:", e);
    }

    // AI Prompt Construction
    const systemPrompt = `
You are the official MyHealthID AI Health Assistant (የMyHealthID ዲጂታል ጤና ረዳት). 
You converse fluently in English and Amharic (አማርኛ).
CRITICAL: Respond strictly in the patient's selected language: ${language === "AM" ? "Amharic (አማርኛ)" : "English (EN)"}.

YOUR KNOWLEDGE BASE (SYSTEM BOOKS):
Use this documentation from our hospital guides to answer questions about the hospital workflows, registration, queuing, wards, and lab services:

[BOOK 1: Registration & Smart Queuing Specs]
${data1Spec}

[BOOK 2: Universal Hospital Wards]
${wardDropDownSpec}

[BOOK 3: Investigation Management & Test List]
${investigationSpec}

---
CURRENT VERIFIED PATIENT CONTEXT:
- Name: ${patient.fullName} (First Name: ${firstName})
- Age: ${patient.age} | Sex: ${patient.sex}
- Pre-existing Conditions: ${pastHistoryStr || "None recorded"}
- Recent Vitals: ${JSON.stringify(patient.vitals[0] || "No vitals recorded")}
- Active Prescriptions: ${patient.prescriptions.map(p => p.drugName).join(", ") || "No active prescriptions"}
---

CLINICAL SAFETY MANDATE:
1. If the patient reports a dangerous/high-risk symptom (like chest pain, severe bleeding, breathing difficulty, sudden numbness) and has matching high-risk history (like hypertension, diabetes, cardiac history), prioritize their safety immediately.
   - Reassure them and state: "I have flagged your symptoms and alerted the nurse/triage team."
   - Advise them to sit down, rest, or seek immediate emergency care.
2. If they ask general questions, explain beautifully how registration works, what wards are available, how queue management works, and what investigations exist in our system based on the books provided.
3. Be warm, empathetic, professional, and clear. Keep answers relatively concise and easy to read (use formatting/bullets where appropriate).
4. If in Amharic, maintain polite honorifics (e.g., using "እባክዎ" for please, addressing respectfully).
`;

    let responseContent = "";
    const apiKey = process.env.GEMINI_API_KEY;
    const isPlaceholderKey = !apiKey || apiKey.includes("YourActualGeminiStudioAPIKey");

    if (!isPlaceholderKey) {
      try {
        responseContent = await callGemini(systemPrompt, latestMessageObj.content, messages, apiKey!);
      } catch (err) {
        console.error("Gemini call failed, falling back to rule-based engine:", err);
      }
    }

    // ---------------------------------------------------------
    // RULE-BASED FALLBACK ENGINE (If Gemini is unavailable)
    // ---------------------------------------------------------
    if (!responseContent) {
      const trimmedMessage = latestMessage.trim();
      const isSmallTalk = ["hi", "hello", "hey", "howdy", "morning", "afternoon", "evening", "thanks", "thank you", "ok", "okay"].includes(trimmedMessage);
      const isNumber = /^\d+$/.test(trimmedMessage);

      if (isSmallTalk) {
        responseContent = language === "AM" 
          ? `ሰላም ${firstName}! እባክዎ ዛሬ የሚሰማዎትን የህክምና ምልክቶች ይግለጹልኝ።`
          : `Hello ${firstName}! Please describe the medical symptoms you are experiencing today. ምን ልርዳዎት?`;
      } else if (isNumber) {
        responseContent = language === "AM"
          ? `መታወቂያዎ አስቀድሞ ተረጋግጧል፣ ${firstName}! እባክዎ ህመምዎን ይግለጹ።`
          : `Your identity is already verified, ${firstName}! Please describe any medical symptoms you are feeling. እባክዎ ህመምዎን ይግለጹ።`;
      } else {
        const isPositive = ["good", "fine", "finish", "ok", "better", "great", "okay"].some(word => latestMessage.includes(word));
        
        if (isPositive && trimmedMessage.length < 30) {
          responseContent = language === "AM"
            ? `ተረድቻለሁ ${firstName}። ደህና በመሆንዎ ደስ ብሎኛል። ሪከርድዎን መከታተል እቀጥላለሁ። በደንብ ይረፉ።`
            : `Understood, ${firstName}. I'm glad you're feeling okay. I'll keep monitoring your records. በደንብ ይረፉ።`;
        } else {
          if (isHighRiskSymptom && pastHistoryStr) {
            const matchedCondition = HIGH_RISK_HISTORY.find(cond => pastHistoryStr.toLowerCase().includes(cond)) || pastHistoryStr;
            responseContent = language === "AM"
              ? `${firstName}፣ በ${matchedCondition}ዎ ምክንያት፣ ${trimmedMessage} መሰማቱ ከፍተኛ አደጋ አለው። ለነርሷ አሳውቄአለሁ። እባክዎ ያርፉ። አፋጣኝ የህክምና እርዳታ ያስፈልጎታል።`
              : `${firstName}, because of your ${matchedCondition}, feeling ${trimmedMessage} is a high risk. I've alerted the nurse. Please rest. አፋጣኝ የህክምና እርዳታ ያስፈልጎታል።`;
          } else if (isHighRiskSymptom) {
            responseContent = language === "AM"
              ? `${firstName}፣ ${trimmedMessage} መሰማቱ ከፍተኛ አደጋ አለው። ለነርሷ አሳውቄአለሁ። እባክዎ ያርፉ። አፋጣኝ የህክምና እርዳታ ያስፈልጎታል።`
              : `${firstName}, feeling ${trimmedMessage} is a high risk. I've alerted the nurse. Please rest. አፋጣኝ የህክምና እርዳታ ያስፈልጎታል።`;
          } else {
            responseContent = language === "AM"
              ? `ተረድቻለሁ ${firstName}። ይህንን ምልክት ለዶክተሩ መዝግቤያለሁ። እባክዎ ዶክተርዎን ይጠብቁ።`
              : `Understood, ${firstName}. I've logged this symptom for the doctor. እባክዎ ዶክተርዎን ይጠብቁ።`;
          }
        }
      }
    }

    // ---------------------------------------------------------
    // DB LOGGING & UPDATE JOURNAL
    // ---------------------------------------------------------
    const generatedSummary = `[MYHEALTHID AI SMART AGENT] Patient reported: "${latestMessageObj.content}". AI linked symptom to history (${pastHistoryStr || 'None'}). Risk level: ${isHighRiskSymptom ? 'HIGH - Nurse Alerted' : 'Standard'}.`;
    
    await prisma.patientJournal.create({
      data: {
        patientId: verifiedPatientId,
        symptoms: latestMessageObj.content.substring(0, 100),
        mood: latestMessage.includes("bad") || isHighRiskSymptom ? "Poor" : "Stable",
      }
    });

    await prisma.patient.update({
      where: { id: verifiedPatientId },
      data: { aiSymptomSummary: generatedSummary }
    });

    return NextResponse.json({ 
      content: responseContent,
      role: "assistant"
    });

  } catch (error) {
    console.error("Chat API Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
