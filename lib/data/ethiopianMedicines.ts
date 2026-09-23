export interface EthiopianMedicine {
  name: string;
  category: string;
  defaultDose: string;
  availableDoses: string[];
  defaultRoute: 'PO' | 'IV' | 'IM' | 'SC' | 'Topical' | 'Inhalation' | 'PR';
  defaultFrequency: 'OD' | 'BID' | 'TID' | 'QID' | 'PRN' | 'STAT';
  defaultDuration: string;
  defaultQuantity: string;
  instructions: string;
}

export const ethiopianMedicines: EthiopianMedicine[] = [
  // Analgesics & Antipyretics
  {
    name: "Paracetamol",
    category: "Analgesic",
    defaultDose: "500mg",
    availableDoses: ["500mg", "1000mg", "125mg/5ml", "250mg/5ml"],
    defaultRoute: "PO",
    defaultFrequency: "QID",
    defaultDuration: "3 days",
    defaultQuantity: "12 tabs",
    instructions: "Take after meals. Do not exceed 4g per day."
  },
  {
    name: "Ibuprofen",
    category: "NSAID",
    defaultDose: "400mg",
    availableDoses: ["200mg", "400mg", "100mg/5ml"],
    defaultRoute: "PO",
    defaultFrequency: "TID",
    defaultDuration: "5 days",
    defaultQuantity: "15 tabs",
    instructions: "Take with food to avoid stomach upset."
  },
  {
    name: "Diclofenac Sodium",
    category: "NSAID",
    defaultDose: "50mg",
    availableDoses: ["25mg", "50mg", "75mg (IM)"],
    defaultRoute: "PO",
    defaultFrequency: "BID",
    defaultDuration: "3 days",
    defaultQuantity: "6 tabs",
    instructions: "Take with meals."
  },
  // Antibiotics
  {
    name: "Amoxicillin",
    category: "Antibiotic",
    defaultDose: "500mg",
    availableDoses: ["250mg", "500mg", "125mg/5ml", "250mg/5ml"],
    defaultRoute: "PO",
    defaultFrequency: "TID",
    defaultDuration: "7 days",
    defaultQuantity: "21 caps",
    instructions: "Complete the full course of treatment."
  },
  {
    name: "Ciprofloxacin",
    category: "Antibiotic",
    defaultDose: "500mg",
    availableDoses: ["250mg", "500mg", "200mg/100ml (IV)"],
    defaultRoute: "PO",
    defaultFrequency: "BID",
    defaultDuration: "5 days",
    defaultQuantity: "10 tabs",
    instructions: "Take with plenty of water. Avoid dairy products around the time of dose."
  },
  {
    name: "Ceftriaxone",
    category: "Antibiotic",
    defaultDose: "1g",
    availableDoses: ["250mg", "500mg", "1g", "2g"],
    defaultRoute: "IV",
    defaultFrequency: "OD",
    defaultDuration: "3 days",
    defaultQuantity: "3 vials",
    instructions: "To be administered by a healthcare professional."
  },
  // Antimalarials
  {
    name: "Artemether/Lumefantrine (AL)",
    category: "Antimalarial",
    defaultDose: "20/120mg (4 tabs)",
    availableDoses: ["20/120mg", "40/240mg", "80/480mg"],
    defaultRoute: "PO",
    defaultFrequency: "BID",
    defaultDuration: "3 days",
    defaultQuantity: "24 tabs",
    instructions: "Take with fatty food or milk for better absorption."
  },
  // Antidiabetics
  {
    name: "Metformin",
    category: "Antidiabetic",
    defaultDose: "500mg",
    availableDoses: ["500mg", "850mg", "1000mg"],
    defaultRoute: "PO",
    defaultFrequency: "BID",
    defaultDuration: "30 days",
    defaultQuantity: "60 tabs",
    instructions: "Take with meals."
  },
  {
    name: "Glibenclamide",
    category: "Antidiabetic",
    defaultDose: "5mg",
    availableDoses: ["2.5mg", "5mg"],
    defaultRoute: "PO",
    defaultFrequency: "OD",
    defaultDuration: "30 days",
    defaultQuantity: "30 tabs",
    instructions: "Take in the morning with breakfast."
  },
  // Cardiovascular / Antihypertensives
  {
    name: "Enalapril",
    category: "Antihypertensive",
    defaultDose: "5mg",
    availableDoses: ["5mg", "10mg", "20mg"],
    defaultRoute: "PO",
    defaultFrequency: "OD",
    defaultDuration: "30 days",
    defaultQuantity: "30 tabs",
    instructions: "Take at the same time each day."
  },
  {
    name: "Amlodipine",
    category: "Antihypertensive",
    defaultDose: "5mg",
    availableDoses: ["5mg", "10mg"],
    defaultRoute: "PO",
    defaultFrequency: "OD",
    defaultDuration: "30 days",
    defaultQuantity: "30 tabs",
    instructions: "Take at the same time each day."
  },
  // Gastrointestinal
  {
    name: "Omeprazole",
    category: "PPI",
    defaultDose: "20mg",
    availableDoses: ["20mg", "40mg"],
    defaultRoute: "PO",
    defaultFrequency: "OD",
    defaultDuration: "14 days",
    defaultQuantity: "14 caps",
    instructions: "Take 30 minutes before breakfast."
  },
  // Respiratory
  {
    name: "Salbutamol",
    category: "Bronchodilator",
    defaultDose: "100mcg/puff (2 puffs)",
    availableDoses: ["100mcg/puff", "2mg tab", "4mg tab", "2mg/5ml syrup"],
    defaultRoute: "Inhalation",
    defaultFrequency: "PRN",
    defaultDuration: "30 days",
    defaultQuantity: "1 inhaler",
    instructions: "Use as needed for shortness of breath."
  },
];
