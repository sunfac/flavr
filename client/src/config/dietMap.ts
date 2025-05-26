// config/dietMap.ts

export type DietKey =
  | "vegan"
  | "vegetarian"
  | "glutenFree"
  | "dairyFree"
  | "nutFree"
  | "pescatarian"
  | "keto"
  | "paleo"
  | "lowCarb"
  | "highProtein"
  | "lowCalorie"
  | "noRestrictions";

export const dietMap: Record<DietKey, { label: string; description: string }> = {
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

export function getDietPromptText(dietKeys: string[]): string {
  if (!dietKeys || dietKeys.length === 0 || dietKeys.includes('none')) {
    return "Dietary Requirements: No restrictions - use any ingredients freely.";
  }

  const dietDescriptions = dietKeys
    .filter(key => key !== 'none')
    .map(key => {
      const diet = dietMap[key as DietKey];
      return diet ? `${diet.label}: ${diet.description}` : null;
    })
    .filter(Boolean);

  if (dietDescriptions.length === 0) {
    return "Dietary Requirements: No specific restrictions.";
  }

  return `Dietary Requirements: ${dietDescriptions.join(' | ')}`;
}