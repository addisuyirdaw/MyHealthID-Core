import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// High-risk conditions map to look for in history
const HIGH_RISK_HISTORY = [
  "hypertension", "diabetes", "cardiac", "heart", "stroke", "asthma", "copd", "cancer", "blood pressure"
];

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
            { nationalId: idToVerify }
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

    const latestMessage = messages[messages.length - 1].content.toLowerCase();
    
    // Deep Fetch Patient Context
    const patient = await prisma.patient.findUnique({
      where: { id: verifiedPatientId },
      include: {
        vitals: { orderBy: { createdAt: 'desc' }, take: 1 },
        prescriptions: { orderBy: { createdAt: 'desc' }, take: 5 }
      }
    });

    const firstName = patient?.fullName ? patient.fullName.split(" ")[0] : "Patient";

    const pastHistoryStr = [
      patient?.preExistingConditions,
      patient?.surgicalHistory,
      patient?.familyHistory
    ].filter(Boolean).join(", ");

    // Small Talk / ID Re-entry Bypass
    const trimmedMessage = latestMessage.trim();
    const isSmallTalk = ["hi", "hello", "hey", "howdy", "morning", "afternoon", "evening", "thanks", "thank you", "ok", "okay"].includes(trimmedMessage);
    const isNumber = /^\d+$/.test(trimmedMessage);

    if (isSmallTalk) {
      return NextResponse.json({ 
        content: language === "AM" 
          ? `ሰላም ${firstName}! እባክዎ ዛሬ የሚሰማዎትን የህክምና ምልክቶች ይግለጹልኝ።`
          : `Hello ${firstName}! Please describe the medical symptoms you are experiencing today. ምን ልርዳዎት?`,
        role: "assistant"
      });
    }

    if (isNumber) {
      return NextResponse.json({
        content: language === "AM"
          ? `መታወቂያዎ አስቀድሞ ተረጋግጧል፣ ${firstName}! እባክዎ ህመምዎን ይግለጹ።`
          : `Your identity is already verified, ${firstName}! Please describe any medical symptoms you are feeling. እባክዎ ህመምዎን ይግለጹ።`,
        role: "assistant"
      });
    }

    let responseContent = "";

    const isPositive = ["good", "fine", "finish", "ok", "better", "great", "okay"].some(word => latestMessage.includes(word));
    const riskTriggers = ["pain", "dizzy", "cool", "hot", "breath", "ህመም", "ማዞር", "ብርድ", "ትኩሳት", "ትንፋሽ"];
    const isHighRiskSymptom = riskTriggers.some(sym => latestMessage.includes(sym));
    
    // Symptom-Only Logic (Short/Positive)
    if (isPositive && trimmedMessage.length < 30) {
      responseContent = language === "AM"
        ? `ተረድቻለሁ ${firstName}። ደህና በመሆንዎ ደስ ብሎኛል። ሪከርድዎን መከታተል እቀጥላለሁ። በደንብ ይረፉ።`
        : `Understood, ${firstName}. I'm glad you're feeling okay. I'll keep monitoring your records. በደንብ ይረፉ።`;
    } else {
      // Risk-Only Logic
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

    // 2. Self-Updating Summary
    const generatedSummary = `[ID VERIFIED] Patient reported: "${messages[messages.length - 1].content}". AI linked symptom to history (${pastHistoryStr || 'None'}). Risk level: ${isHighRiskSymptom ? 'HIGH - Urgent Triage Recommended' : 'Standard'}.`;
    
    await prisma.patientJournal.create({
      data: {
        patientId: verifiedPatientId,
        symptoms: messages[messages.length - 1].content.substring(0, 100),
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
