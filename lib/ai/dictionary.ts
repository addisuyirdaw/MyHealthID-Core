export interface LifestyleRecommendation {
  allowedFoods: string[];
  avoidedFoods: string[];
  activityTarget: string;
  warningAlert: string;
  allowedFoodsAm: string[];
  avoidedFoodsAm: string[];
  activityTargetAm: string;
  warningAlertAm: string;
}

export function getLifestyleTargets(preExistingConditionsStr: string): LifestyleRecommendation {
  const conditions = (preExistingConditionsStr || "").toLowerCase();
  
  let allowedFoods = ["Fresh vegetables", "Whole grains (brown rice, oats)", "Lean proteins (skinless chicken, fish)", "Water (hydration)"];
  let avoidedFoods = ["Excessive refined sugars", "Deep-fried / processed items", "High sodium snacks", "Sweetened soft drinks"];
  let activityTarget = "Moderate walking for 30 minutes, 5 days a week.";
  let warningAlert = "General wellness: Monitor hydration levels and schedule annual physical checkups.";

  let allowedFoodsAm = ["ትኩስ አትክልቶች", "ሙሉ እህል (ቡናማ ሩዝ፣ አጃ)", "የዶሮ ስጋ፣ አሳ", "ንጹህ ውሃ (በቂ መጠጣት)"];
  let avoidedFoodsAm = ["ከመጠን በላይ የስኳር ምግቦች", "በዘይት የተጠበሱ / ፕሮሰስ የተደረጉ ምግቦች", "ጨዋማ ምግቦች", "ጣፋጭ ለስላሳ መጠጦች"];
  let activityTargetAm = "በሳምንት 5 ቀናት፣ በቀን 30 ደቂቃ መካከለኛ የእግር ጉዞ።";
  let warningAlertAm = "አጠቃላይ ጤና፡ የሰውነትዎን ፈሳሽ መጠን ይከታተሉ እና አመታዊ አጠቃላይ ምርመራ ያድርጉ።";

  if (conditions.includes("diabetes") || conditions.includes("ስኳር")) {
    allowedFoods = ["Non-starchy vegetables (spinach, broccoli)", "High-fiber legumes", "Lean turkey/fish", "Unsweetened herbal tea"];
    avoidedFoods = ["Refined white bread/pasta", "Sugary pastries and juices", "High-fat dairy products", "Trans fats"];
    activityTarget = "Daily aerobic steps (8,000+ steps) and light resistance exercise.";
    warningAlert = "Blood Sugar Watch: Promptly report unexplained foot numbness, extreme thirst, or blurred vision.";

    allowedFoodsAm = ["ስታርች የሌላቸው አትክልቶች (ስፒናች፣ ጎመን)", "ከፍተኛ ፋይበር ያላቸው ጥራጥሬዎች", "አሳ እና የዶሮ ስጋ", "ያለ ስኳር የተዘጋጀ የእፅዋት ሻይ"];
    avoidedFoodsAm = ["ነጭ ዳቦ / ፓስታ", "ጣፋጭ ኬኮች እና ጭማቂዎች", "ከፍተኛ ቅባት ያላቸው የወተት ተዋጽኦዎች", "ትራንስ ፋትስ"];
    activityTargetAm = "የእለት ተእለት የኤሮቢክ እርምጃዎች (8,000+ እርምጃዎች) እና ቀላል የስፖርት እንቅስቃሴዎች።";
    warningAlertAm = "የስኳር መጠን ክትትል፡ ያልታወቀ የእግር መደንዘዝ፣ ከፍተኛ ጥማት ወይም የዓይን ብዥታ ካለ ወዲያውኑ ለሀኪም ያሳውቁ።";
  } else if (conditions.includes("hypertension") || conditions.includes("cardiac") || conditions.includes("ደም ግፊት") || conditions.includes("ልብ")) {
    allowedFoods = ["DASH diet: Potassium-rich bananas, leafy greens", "Oatmeal", "Low-fat yogurt", "Garlic and berries"];
    avoidedFoods = ["Canned soups/sauces", "Red meats and butter", "Highly salted packaged chips", "Pickled condiments"];
    activityTarget = "Structured brisk walking or swimming, aiming for 150 minutes weekly.";
    warningAlert = "Cardiac Warning: Alert triage nurse immediately if chest pressure, left arm pain, or sudden shortness of breath occurs.";

    allowedFoodsAm = ["DASH አመጋገብ፡ በፖታስየም የበለፀጉ ሙዝ፣ ቅጠላቅጠል አትክልቶች", "አጃ (ኦትሚል)", "ቅባት የሌለው እርጎ", "ነጭ ሽንኩርት እና እንጆሪ"];
    avoidedFoodsAm = ["የታሸጉ ሾርባዎች/ሳውሶች", "ቀይ ስጋ እና ቅቤ", "ከፍተኛ ጨው ያላቸው ድንች ቺፕስ", "የተቀመሙ ኮንዲመንቶች"];
    activityTargetAm = "በሳምንት 150 ደቂቃ ፈጣን የእግር ጉዞ ወይም ዋና።";
    warningAlertAm = "የልብ ህመም ማስጠንቀቂያ፡ የደረት መጫን፣ የግራ እጅ ህመም ወይም ድንገተኛ የትንፋሽ ማጠር ካለ በአስቸኳይ ለነርስ ያሳውቁ።";
  } else if (conditions.includes("asthma") || conditions.includes("copd") || conditions.includes("ትንፋሽ")) {
    allowedFoods = ["Antioxidant-rich citrus fruits", "Omega-3 rich seeds (chia, flax)", "Vitamin D foods (salmon, eggs)", "Warm broths"];
    avoidedFoods = ["Sulfites containing dried fruits/processed potatoes", "Ice-cold carbonated beverages", "Deep fried allergens", "Excessive dairy"];
    activityTarget = "Low-impact indoor yoga or controlled pacing walks. Avoid cold-weather outdoor running.";
    warningAlert = "Pulmonary Caution: Carry emergency inhaler at all times; note pollen counts and dust triggers.";

    allowedFoodsAm = ["በአንቲኦክሲዳንት የበለፀጉ የሎሚ ፍራፍሬዎች", "በኦሜጋ-3 የበለፀጉ ፍሬዎች", "በቫይታሚን ዲ የበለፀጉ ምግቦች (ሳልሞን ፣ እንቁላል)", "ሙቅ ሾርባዎች"];
    avoidedFoodsAm = ["ሰልፋይት ያለባቸው የደረቁ ፍራፍሬዎች", "በጣም የቀዘቀዙ ለስላሳ መጠጦች", "በዘይት የተጠበሱ አለርጂ ምግቦች", "የወተት ተዋጽኦዎች"];
    activityTargetAm = "ቀላል የቤት ውስጥ ዮጋ ወይም ቁጥጥር የሚደረግበት የእግር ጉዞ። በቀዝቃዛ አየር ውስጥ ከቤት ውጭ መሮጥን ያስወግዱ።";
    warningAlertAm = "የሳንባ ማስጠንቀቂያ፡ ሁል ጊዜ የአደጋ ጊዜ መተንፈሻ (ኢንሄለር) ይያዙ፤ የአበባ ብናኝ እና አቧራ ያስወግዱ።";
  }

  return {
    allowedFoods,
    avoidedFoods,
    activityTarget,
    warningAlert,
    allowedFoodsAm,
    avoidedFoodsAm,
    activityTargetAm,
    warningAlertAm
  };
}
