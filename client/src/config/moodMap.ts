export type MoodKey =
  | "comfort"
  | "impressive"
  | "light"
  | "family"
  | "romantic"
  | "indulgent"
  | "quick"
  | "clean";

export const moodMap: Record<MoodKey, { label: string; description: string }> = {
  comfort: {
    label: "Comfort food",
    description: "The meal should feel warm, nostalgic, and hearty — like a hug in a bowl. Lean into familiar, satisfying flavours and soft textures.",
  },
  impressive: {
    label: "Impressive for guests",
    description: "Design the dish with visual impact and elevated flavour layers. Prioritise presentation and restaurant-level quality.",
  },
  light: {
    label: "Light & refreshing",
    description: "The dish should be bright, vibrant, and easy to digest. Use fresh herbs, citrus, or cooling elements to keep it lively.",
  },
  family: {
    label: "Family-friendly",
    description: "Appeal to a variety of tastes including children. Keep it approachable, with minimal spice and simple presentation.",
  },
  romantic: {
    label: "Romantic",
    description: "The meal should feel intimate, indulgent, and sensorial. Use elegant plating, rich ingredients, and warm, candlelit-friendly colours.",
  },
  indulgent: {
    label: "Indulgent",
    description: "This is an unapologetically rich, flavour-packed dish. Prioritise taste over health — think bold sauces, melted textures, and crave-worthy ingredients.",
  },
  quick: {
    label: "Quick & energetic",
    description: "The dish should be bold, punchy, and fast to prepare. Use high-impact flavours with low fuss and minimal prep.",
  },
  clean: {
    label: "Clean & nourishing",
    description: "Prioritise health, digestion, and natural ingredients. Use lean proteins, grains, and greens with minimal processing or added fat.",
  }
};

export function getMoodPromptText(moodKey: string): string {
  const mood = moodMap[moodKey as MoodKey];
  if (!mood) {
    return "Create a balanced, appealing dish that satisfies the user's preferences.";
  }

  return `Mood: ${mood.label}
${mood.description}`;
}