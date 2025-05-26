// shoppingPromptBlocks.ts

const creativeVariations = [
  "Emphasise contrast in texture or temperature using the available ingredients.",
  "Add a seasonal element using a common fresh ingredient typical for the time of year.",
  "Suggest a creative topping or finish using pantry staples or fridge condiments.",
  "Use an elevated cooking technique that intensifies flavour (e.g. charring, glazing, toasting).",
  "Highlight one core ingredient by preparing it two ways in the same dish.",
  "Include a bold or balanced flavour element using allowed herbs, spices, or acid.",
  "Lean into a classic dish but give it a modern or lighter interpretation.",
  "Focus on minimal waste by making clever use of scraps or ends.",
  "Design the dish with visual appeal in mind using only what's available."
];

// Function to return full Creative Guidance block
export function getCreativeGuidanceBlock(): string {
  const random = creativeVariations[Math.floor(Math.random() * creativeVariations.length)];
  return `
Creative Guidance:
Add a subtle variation or elevated element that enhances the recipe without violating any of the user's dietary, time, ingredient, or equipment constraints. Do not introduce new tools or ingredients the user hasn't approved. Stay within the defined limits while maximizing flavour variety and originality.

${random}

Always prioritise maximising flavour to the highest possible level while keeping outputs efficient to generate.
  `.trim();
}