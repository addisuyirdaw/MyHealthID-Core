export type Language = 'EN' | 'AM';

export const TRANSLATIONS = {
  EN: {
    nav: {
      citizenRegistration: "Citizen Registration",
      healthcareProfessionalPortal: "Healthcare Professional Portal",
      loggedInAs: "Logged in as",
    },
    landing: {
      title: "Universal Healthcare Access",
      subtitle: "Secure clinical network for all citizens.",
      registerCitizen: "Register Citizen",
      healthcareLogin: "Healthcare Professional Login"
    },
    registration: {
      title: "Citizen Registration",
      subtitle: "Initialize a new secure citizen health record — Hybrid Identity Bridge",
      identityVerification: "Identity Verification",
      identitySelectionDesc: "How would you like to identify this citizen?",
      faydaIdTitle: "Fayda National ID",
      faydaIdDesc: "Citizen has a 12-digit Fayda ID",
      faydaPathTitle: "Fayda National ID Path",
      faydaPathDesc: "Enter and verify the citizen's 12-digit Fayda ID below",
      faydaVerificationRequired: "Fayda Verification Required",
      faydaUnlockText: "Please verify the Fayda National ID above to unlock the full registration form.",
      noIdTitle: "No National ID",
      noIdDesc: "Generate a unique MyHealthID — no citizen excluded",
      noIdPathTitle: "Auto-Generated MyHealthID Path",
      noIdPathDesc: "A unique internal UUID will be generated automatically",
      noIdBadgeText: "A unique MyHealthID will be auto-generated for this citizen upon registration. No ID required.",
      change: "Change",
      completeRegistration: "Complete Citizen Registration",
      registering: "Registering Citizen...",
      demographicsTitle: "1. Citizen Demographics",
      addressTitle: "2. Address & Contact Information",
      visitTitle: "3. Reason for Visit"
    },
    login: {
      title: "Healthcare Professional Portal",
      subtitlePre: "Authenticate to access the MyHealth",
      subtitlePost: " secure clinical network.",
      emailLabel: "Professional Email / Username",
      passwordLabel: "Password",
      roleLabel: "Access Role",
      secureLogin: "Secure Login",
      selectCreds: "Select your credentials...",
      simNote: "Note: Simulation mode enabled. Any credentials accepted for demo."
    }
  },
  AM: {
    nav: {
      citizenRegistration: "የዜጎች ምዝገባ",
      healthcareProfessionalPortal: "የጤና ባለሙያዎች ፖርታል",
      loggedInAs: "በዚህ ገብተዋል",
    },
    landing: {
      title: "ሁለንተናዊ የጤና እንክብካቤ ተደራሽነት",
      subtitle: "ደህንነቱ የተጠበቀ የክሊኒክ ኔትወርክ ለሁሉም ዜጎች",
      registerCitizen: "የዜጎች ምዝገባ",
      healthcareLogin: "የጤና ባለሙያዎች መግቢያ"
    },
    registration: {
      title: "የዜጎች ምዝገባ",
      subtitle: "አዲስ ደህንነቱ የተጠበቀ የዜጎች የጤና መዝገብ ይክፈቱ — Hybrid Identity Bridge",
      identityVerification: "የማንነት ማረጋገጫ",
      identitySelectionDesc: "ይህን ዜጋ እንዴት መለየት ይፈልጋሉ?",
      faydaIdTitle: "ፋይዳ ብሔራዊ መታወቂያ",
      faydaIdDesc: "ዜጋው የ12-ዲጂት ፋይዳ መታወቂያ አለው",
      faydaPathTitle: "የፋይዳ ብሔራዊ መታወቂያ መንገድ",
      faydaPathDesc: "የዜጋውን የ12-ዲጂት ፋይዳ መታወቂያ ከታች ያስገቡና ያረጋግጡ",
      faydaVerificationRequired: "የፋይዳ ማረጋገጫ ያስፈልጋል",
      faydaUnlockText: "ሙሉ የምዝገባ ፎርሙን ለመክፈት እባክዎ ከላይ ያለውን የፋይዳ መታወቂያ ያረጋግጡ።",
      noIdTitle: "ብሔራዊ መታወቂያ የለኝም",
      noIdDesc: "ልዩ MyHealthID ይፍጠሩ — ማንም ዜጋ አይገለልም",
      noIdPathTitle: "በራስ-ሰር የሚፈጠር የMyHealthID መንገድ",
      noIdPathDesc: "ልዩ የውስጥ መለያ (UUID) በራስ-ሰር ይፈጠራል",
      noIdBadgeText: "በምዝገባ ወቅት ለዚህ ዜጋ ልዩ MyHealthID በራስ-ሰር ይፈጠራል። መታወቂያ አያስፈልግም።",
      change: "ቀይር",
      completeRegistration: "የዜጎች ምዝገባን ያጠናቅቁ",
      registering: "ዜጋውን በመመዝገብ ላይ...",
      demographicsTitle: "1. የዜጋው ግላዊ መረጃ",
      addressTitle: "2. አድራሻ እና የመገናኛ መረጃ",
      visitTitle: "3. የመጡበት ምክንያት"
    },
    login: {
      title: "የጤና ባለሙያዎች ፖርታል",
      subtitlePre: "ወደ MyHealth",
      subtitlePost: " ክሊኒክ ኔትወርክ ለመግባት ያረጋግጡ",
      emailLabel: "የሙያ ኢሜይል / የተጠቃሚ ስም",
      passwordLabel: "የይለፍ ቃል",
      roleLabel: "የመዳረሻ ሚና",
      secureLogin: "በአስተማማኝ ሁኔታ ይግቡ",
      selectCreds: "መረጃዎን ይምረጡ...",
      simNote: "ማሳሰቢያ፡ የማስመሰል ሁነታ ነቅቷል። ለማሳያ ማንኛውም መረጃ ተቀባይነት አለው።"
    }
  }
};
