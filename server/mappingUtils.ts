// === CENTRALIZED MAPPING UTILITIES FOR PROMPT GENERATION ===
// Single source of truth for all mapping logic - NO DUPLICATES

// 🟢 Cooking Time — ensure it's a numeric upper limit
export const getCookTime = (quizData: any): number => {
  return Number(quizData?.time?.value) || Number(quizData?.time) || 30;
};

// 🟢 Equipment Text — map raw selections to readable text
export const formatEquipmentText = (quizData: any): string => {
  const equipment = quizData?.equipment || [];
  return equipment.length > 0
    ? equipment.join(', ')
    : 'Standard kitchen setup';
};

// === CONSOLIDATED MAPPING DATA ===
// Single source of truth for all mapping logic

// Budget mappings for detailed prompt text
const budgetMappings = {
  "budget": {
    label: "Budget-friendly",
    costRange: "£1–£2 per portion",
    guidance: "Focus on affordable staples like pasta, beans, eggs, and seasonal vegetables. Use simple preparation methods and versatile ingredients that provide good value."
  },
  "moderate": {
    label: "Moderate",
    costRange: "£2–£4 per portion", 
    guidance: "Balanced cost-conscious meals with quality ingredients and some flexibility in preparation time or brand. A mix of fresh and pantry ingredients."
  },
  "premium": {
    label: "Premium",
    costRange: "£4–£7 per portion",
    guidance: "Higher-quality ingredients with focus on flavour and presentation. Some specialty items are acceptable."
  },
  "luxury": {
    label: "Luxury",
    costRange: "£7+ per portion",
    guidance: "Premium ingredients, luxury items, specialty cuts, artisanal products, exotic spices, and high-end components."
  }
};

// Ambition mappings - SINGLE SOURCE with both difficulty and prompt text
const ambitionMappings = {
  "Just get fed": {
    label: "Just get fed",
    difficulty: "Easy",
    description: "Simple, quick preparation with minimal effort and basic techniques that anyone can master."
  },
  "Simple & tasty": {
    label: "Simple & tasty", 
    difficulty: "Easy",
    description: "Easy techniques with enhanced flavor using straightforward methods that build confidence in the kitchen."
  },
  "Confident cook": {
    label: "Confident cook",
    difficulty: "Medium",
    description: "Intermediate techniques with balanced complexity, perfect for expanding culinary skills while maintaining achievable results."
  },
  "Ambitious chef": {
    label: "Ambitious chef",
    difficulty: "Hard", 
    description: "Hard techniques with restaurant-level precision, complex flavor development, and professional presentation standards."
  },
  "Michelin effort": {
    label: "Michelin effort",
    difficulty: "Hard",
    description: "Hard techniques with restaurant-level precision, complex flavor development, and professional presentation standards."
  },
  // Quiz camelCase keys for compatibility
  "justFed": {
    label: "Just get fed",
    difficulty: "Easy",
    description: "Simple, quick preparation with minimal effort and basic techniques that anyone can master."
  },
  "simpleTasty": {
    label: "Simple & tasty", 
    difficulty: "Easy",
    description: "Easy techniques with enhanced flavor using straightforward methods that build confidence in the kitchen."
  },
  "confidentCook": {
    label: "Confident cook",
    difficulty: "Medium",
    description: "Intermediate techniques with balanced complexity, perfect for expanding culinary skills while maintaining achievable results."
  },
  "ambitiousChef": {
    label: "Ambitious chef",
    difficulty: "Hard", 
    description: "Hard techniques with restaurant-level precision, complex flavor development, and professional presentation standards."
  },
  "michelinEffort": {
    label: "Michelin effort",
    difficulty: "Hard",
    description: "Hard techniques with restaurant-level precision, complex flavor development, and professional presentation standards."
  }
};

// Mood mappings
const moodMappings = {
  "light": {
    label: "Light & refreshing",
    description: "Focus on vibrant, fresh flavours with citrus, herbs, and vegetables. Emphasize clean, bright tastes that feel energizing rather than heavy."
  },
  "comfort": {
    label: "Comfort & warmth",
    description: "Create hearty, soul-warming dishes that provide emotional satisfaction. Think rich, familiar flavours that feel like a warm hug."
  },
  "luxury": {
    label: "Luxury & indulgence", 
    description: "Seeking luxury with premium ingredients, restaurant-quality plating, and sophisticated flavor layering for an elevated dining experience."
  },
  "adventure": {
    label: "Adventure & excitement",
    description: "Bold, exciting flavours from global cuisines. Incorporate unexpected spice combinations, unique cooking techniques, or fusion elements."
  }
};

// Time range mappings - aligned with quiz slider (0-80 minutes in 10-minute increments)
const timeRanges = [
  {
    min: 0,
    max: 10,
    label: "Lightning fast (10 min)",
    description: "Ultra-quick recipes using minimal prep and instant cooking methods. Perfect for emergencies or when time is extremely limited."
  },
  {
    min: 11,
    max: 20,
    label: "Quick fix (15-20 min)",
    description: "Fast and efficient recipes that don't compromise on taste. Focus on simple techniques and readily available ingredients."
  },
  {
    min: 21,
    max: 30,
    label: "Express cooking (25-30 min)",
    description: "Balanced recipes with streamlined preparation that deliver satisfying results without rushing."
  },
  {
    min: 31,
    max: 45,
    label: "Comfortable pace (35-45 min)",
    description: "Relaxed cooking allowing for proper technique development and flavor building without time pressure."
  },
  {
    min: 46,
    max: 60,
    label: "Leisurely cooking (45-60 min)",
    description: "Take your time to develop complex flavors and enjoy the cooking process with multiple steps if needed."
  },
  {
    min: 61,
    max: 80,
    label: "Extended session (60-80 min)",
    description: "Longer cooking projects perfect for weekends, allowing for advanced techniques and slow-cooked perfection."
  },
  {
    min: 81,
    max: 999,
    label: "No time limit",
    description: "Unlimited time for elaborate preparations, slow cooking, marination, or multi-component dishes. Focus purely on achieving the best possible result."
  }
];

// Diet mappings
const dietMap: Record<string, { label: string; description: string }> = {
  vegan: {
    label: "Vegan",
    description: "Exclude all animal-derived ingredients, including meat, dairy, eggs, honey, and gelatin. Use only plant-based alternatives.",
  },
  vegetarian: {
    label: "Vegetarian",
    description: "Exclude all meat and fish. Dairy and eggs are allowed.",
  },
  glutenFree: {
    label: "Gluten-free",
    description: "Exclude all gluten-containing ingredients including wheat, barley, rye, and soy sauce unless certified gluten-free.",
  },
  dairyFree: {
    label: "Dairy-free",
    description: "Exclude all dairy ingredients including milk, butter, cheese, cream, and yogurt. Use plant-based alternatives.",
  },
  nutFree: {
    label: "Nut-free",
    description: "Strictly exclude all nuts and nut-based products, including nut oils and butters.",
  },
  pescatarian: {
    label: "Pescatarian",
    description: "No meat or poultry. Fish and seafood are allowed.",
  },
  keto: {
    label: "Keto",
    description: "Keep net carbs very low. Avoid sugar, grains, and starchy vegetables. Prioritise fats, protein, and low-carb greens.",
  },
  paleo: {
    label: "Paleo",
    description: "Avoid all processed foods, grains, dairy, and legumes. Focus on whole foods, meats, fish, vegetables, nuts, and seeds.",
  },
  lowCarb: {
    label: "Low-carb",
    description: "Reduce starchy foods and sugars. Focus on non-starchy vegetables, proteins, and healthy fats.",
  },
  highProtein: {
    label: "High-protein",
    description: "Ensure meals are protein-rich using meat, fish, eggs, dairy, or plant-based alternatives. Support muscle recovery and satiety.",
  },
  lowCalorie: {
    label: "Low-calorie",
    description: "Design meals with reduced calorie density using lean proteins, non-starchy vegetables, and minimal added fats.",
  },
  noRestrictions: {
    label: "No restrictions",
    description: "There are no dietary limitations. Use any ingredients freely.",
  }
};

// Equipment mappings - aligned with quiz keys
const equipmentMappings: Record<string, string> = {
  "stovetop": "Stovetop/Hob for sautéing, boiling, and pan-frying",
  "oven": "Oven for baking, roasting, and broiling",
  "microwave": "Microwave for quick reheating and steam-cooking",
  "airfryer": "Air fryer for crispy textures with less oil",
  "grill": "Grill for outdoor cooking and smoky flavors",
  "slowcooker": "Slow cooker for hands-off, tender results",
  "pressure": "Pressure cooker for quick pressure cooking",
  "blender": "Blender/Food processor for smoothies and sauces",
  "rice": "Rice cooker for perfect grains",
  "bbq": "BBQ for authentic barbecue flavors",
  "basics": "Basic kitchen tools and standard cooking methods",
  "all": "Full kitchen setup with all equipment available",
  // Legacy support for any existing keys
  "airFryer": "Air fryer for crispy textures with less oil",
  "slowCooker": "Slow cooker for hands-off, tender results",
  "instantPot": "Instant Pot for quick pressure cooking"
};

// === DERIVED MAPPINGS FOR COMPATIBILITY ===

// 🟢 Difficulty Map - derived from ambitionMappings to avoid conflicts
export const difficultyMap: { [key: string]: string } = Object.fromEntries(
  Object.entries(ambitionMappings).map(([key, value]) => [key, value.difficulty])
);

// 🟢 Budget Label Mapping - derived from budgetMappings  
export const budgetMap: { [key: string]: string } = Object.fromEntries(
  Object.entries(budgetMappings).map(([key, value]) => [key, `${value.label} (${value.costRange})`])
);

// === EXPORTED UTILITY FUNCTIONS ===

// 🟢 Get Difficulty from Ambition
export const getDifficulty = (ambition: string): string => {
  return ambitionMappings[ambition as keyof typeof ambitionMappings]?.difficulty || 'Medium';
};

// 🟢 Get Budget Text
export const getBudgetText = (budget: string): string => {
  return budgetMap[budget] || 'Any budget';
};

// === EXPORTED PROMPT FUNCTIONS ===

export function getBudgetPromptText(budgetLevel: string): string {
  const mapping = budgetMappings[budgetLevel as keyof typeof budgetMappings];
  if (!mapping) {
    return "Budget: Moderate. Please ensure the cost per portion reflects this: £2–£4 per portion. Balanced cost-conscious meals with quality ingredients and some flexibility in preparation time or brand. Currency: GBP (British Pounds). Assume supermarket prices.";
  }

  return `Budget: ${mapping.label}
Please ensure the cost per portion reflects this: ${mapping.costRange} ${mapping.guidance}
Currency: GBP (British Pounds). Assume supermarket prices.`;
}

export function getMoodPromptText(moodKey: string): string {
  const mood = moodMappings[moodKey as keyof typeof moodMappings];
  if (!mood) {
    return "Create a balanced, appealing dish that satisfies the user's preferences.";
  }

  return `Mood: ${mood.label}
${mood.description}`;
}

export function getAmbitionPromptText(ambitionKey: string): string {
  const ambition = ambitionMappings[ambitionKey as keyof typeof ambitionMappings];
  if (!ambition) {
    return "Create a recipe with moderate complexity that balances flavor and achievability.";
  }

  return `Cooking Ambition: ${ambition.label}
${ambition.description}`;
}

export function getTimePromptText(timeValue: number): string {
  const timeRange = timeRanges.find(range => timeValue >= range.min && timeValue <= range.max);
  if (!timeRange) {
    return "Cooking time should be reasonable and efficient for the home cook.";
  }

  return `Cooking Time: ${timeRange.label}
${timeRange.description}`;
}

export function getDietPromptText(dietKeys: string[]): string {
  if (!dietKeys || dietKeys.length === 0 || dietKeys.includes('noRestrictions')) {
    return "Dietary Requirements: No restrictions - use any ingredients freely.";
  }

  const dietDescriptions = dietKeys
    .filter(key => key !== 'noRestrictions')
    .map(key => {
      const diet = dietMap[key];
      return diet ? `${diet.label}: ${diet.description}` : null;
    })
    .filter(Boolean);

  if (dietDescriptions.length === 0) {
    return "Dietary Requirements: No specific restrictions.";
  }

  return `Dietary Requirements: ${dietDescriptions.join(' | ')}`;
}

export function getEquipmentPromptText(equipmentKeys: string[]): string {
  if (!equipmentKeys || equipmentKeys.length === 0) {
    return "Available Equipment: Standard kitchen setup - use basic cooking methods suitable for most home kitchens.";
  }

  const equipmentDescriptions = equipmentKeys
    .map(key => equipmentMappings[key] || key)
    .join(', ');

  return `Available Equipment: ${equipmentDescriptions}`;
}

export function getStrictDietaryInstruction(dietKeys: string[]): string {
  if (!dietKeys || dietKeys.length === 0 || dietKeys.includes('noRestrictions')) {
    return "";
  }

  return `
DIETARY OVERRIDE: If any creative direction conflicts with the user's dietary requirements, the dietary rules take absolute priority.`;
}