// Budget mappings for realistic GBP per-portion cost guidance
export const budgetMappings = {
  "budget": {
    label: "Budget Friendly",
    costRange: "£1–£2 per portion",
    guidance: "using basic, widely available supermarket ingredients only. Avoid excess packaging and ingredient waste."
  },
  "moderate": {
    label: "Moderate", 
    costRange: "£2–£4 per portion",
    guidance: "Balanced cost-conscious meals with quality ingredients and some flexibility in preparation time or brand."
  },
  "premium": {
    label: "Premium Ingredients",
    costRange: "£4–£7 per portion", 
    guidance: "Use higher quality ingredients like fresh herbs, good cuts of meat, artisanal products, but keep portions reasonable."
  },
  "luxury": {
    label: "Sky's the Limit",
    costRange: "£7+ per portion",
    guidance: "Prioritise flavour and ingredient quality without concern for price. Use premium cuts, luxury items, or rare produce."
  }
} as const;

export type BudgetLevel = keyof typeof budgetMappings;

export function getBudgetPromptText(budgetLevel: string): string {
  const mapping = budgetMappings[budgetLevel as BudgetLevel];
  if (!mapping) {
    return "Budget: Moderate. Please ensure the cost per portion reflects this: £2–£4 per portion. Balanced cost-conscious meals with quality ingredients and some flexibility in preparation time or brand. Currency: GBP (British Pounds). Assume supermarket prices.";
  }

  return `Budget: ${mapping.label}
Please ensure the cost per portion reflects this: ${mapping.costRange} ${mapping.guidance}
Currency: GBP (British Pounds). Assume supermarket prices.`;
}