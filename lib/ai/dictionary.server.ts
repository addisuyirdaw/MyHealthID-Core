import fs from "fs";
import path from "path";

export function searchOfflineReference(query: string): { found: boolean; title: string; content: string; titleAm: string; contentAm: string } {
  const q = (query || "").toLowerCase();

  // Load local files safely to incorporate them in the search response
  let data1 = "";
  let wards = "";
  let investigations = "";

  try {
    data1 = fs.readFileSync(path.join(process.cwd(), "data_1.txt"), "utf8");
  } catch (e) {}

  try {
    wards = fs.readFileSync(path.join(process.cwd(), "ward_drop_down.txt"), "utf8");
  } catch (e) {}

  try {
    investigations = fs.readFileSync(path.join(process.cwd(), "investigation_list.txt"), "utf8");
  } catch (e) {}

  if (q.includes("register") || q.includes("intake") || q.includes("መመዝገብ") || q.includes("ምዝገባ")) {
    return {
      found: true,
      title: "Patient Registration & Queuing Procedures",
      titleAm: "የታካሚዎች ምዝገባ እና የስማርት ወረፋ ሂደት",
      content: `Registration allows intake under Fayda (Verified ID), No-ID, or Manual modes. The priority weight dictates queue positions (Emergency is routed to highest priority). Specs from guide:\n\n${data1.substring(0, 800)}...`,
      contentAm: `ታካሚዎች በፋይዳ (የተረጋገጠ መታወቂያ)፣ መታወቂያ በሌላቸው ወይም በእጅ ምዝገባ አማራጮች መመዝገብ ይችላሉ። የአደጋ ጊዜ ታካሚዎች ወዲያውኑ ከፍተኛ ቅድሚያ ይሰጣቸዋል። ከሆስፒታል መመሪያ የተወሰደ መረጃ፡\n\n${data1.substring(0, 500)}...`
    };
  }

  if (q.includes("ward") || q.includes("department") || q.includes("ክፍል") || q.includes("ዋርድ")) {
    return {
      found: true,
      title: "Universal Hospital Wards Index",
      titleAm: "የሆስፒታል ክፍሎች እና ዋርዶች ዝርዝር",
      content: `Available wards for routing clinical care:\n\n${wards}`,
      contentAm: `ሕክምና ለመስጠት የሚገኙ የሆስፒታል ክፍሎች ዝርዝር፡\n\n${wards}`
    };
  }

  if (q.includes("test") || q.includes("lab") || q.includes("investigation") || q.includes("ምርመራ") || q.includes("ላብራቶሪ")) {
    return {
      found: true,
      title: "Clinical Investigation & Lab Test Codes",
      titleAm: "የክሊኒካል ምርመራዎች እና የላብራቶሪ ኮዶች ዝርዝር",
      content: `Universal test codes and pricing list:\n\n${investigations.substring(0, 1000)}...`,
      contentAm: `በስርዓቱ ውስጥ የሚገኙ የላብራቶሪ ምርመራዎች እና ዋጋዎች ዝርዝር፡\n\n${investigations.substring(0, 800)}...`
    };
  }

  // General fallback search
  return {
    found: false,
    title: "General Medical Inquiry Notice",
    titleAm: "አጠቃላይ የህክምና መረጃ",
    content: "The offline dictionary can search for: 'registration', 'wards', or 'investigations'. For clinical diagnosis, please consult our attending doctor.",
    contentAm: "ከመስመር ውጭ መዝገበ-ቃላቱ፡ 'ምዝገባ'፣ 'ክፍሎች' ወይም 'ምርመራዎች' ብለው ሲፈልጉ ዝርዝር መረጃ ይሰጣል። ለክሊኒካዊ ምርመራ እባክዎን ሀኪም ያማክሩ።"
  };
}
