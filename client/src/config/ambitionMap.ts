export type AmbitionKey =
  | "justFed"
  | "simpleTasty"
  | "confidentCook"
  | "ambitiousChef"
  | "michelinEffort";

export const ambitionMap: Record<AmbitionKey, { label: string; description: string }> = {
  justFed: {
    label: "Just get fed",
    description: "Prioritise absolute simplicity. Use minimal ingredients, very few steps, and get food on the table with the least effort possible.",
  },
  simpleTasty: {
    label: "Simple & tasty",
    description: "Balance speed with flavour. Stick to straightforward methods, common ingredients, and tasty results without complexity.",
  },
  confidentCook: {
    label: "Confident cook",
    description: "The user is comfortable with moderate prep and some layering of flavour. Use quality ingredients and clear steps with a touch of flair.",
  },
  ambitiousChef: {
    label: "Ambitious chef",
    description: "Include multi-step prep, sauce work, marinades, and thoughtful plating. Use techniques like roasting, reductions, and resting.",
  },
  michelinEffort: {
    label: "Michelin effort",
    description: "Design a refined, beautifully plated, restaurant-quality dish. Emphasise creative presentation, rich layers of flavour, and elite culinary techniques. Assume this user is ready to go all-in.",
  }
};

export function getAmbitionPromptText(ambitionKey: string): string {
  const ambition = ambitionMap[ambitionKey as AmbitionKey];
  if (!ambition) {
    return "Create a recipe with moderate complexity that balances flavor and achievability.";
  }

  return `Cooking Ambition: ${ambition.label}
${ambition.description}`;
}