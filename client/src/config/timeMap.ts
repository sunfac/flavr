export interface TimeRange {
  label: string;
  description: string;
  min: number;
  max: number;
}

export const timeRanges: TimeRange[] = [
  {
    label: "Under 15 minutes",
    description: "The entire recipe must take no more than 15 minutes from start to finish, including all prep and cooking. Use rapid-cook ingredients and shortcuts.",
    min: 10,
    max: 15,
  },
  {
    label: "15–30 minutes",
    description: "The recipe must be completed in under 30 minutes. Use efficient prep and quick-cooking methods with minimal downtime.",
    min: 20,
    max: 30,
  },
  {
    label: "30–60 minutes",
    description: "The recipe should take no more than 60 minutes. You may include oven-based cooking, simmering, and basic prep techniques.",
    min: 40,
    max: 60,
  },
  {
    label: "No time limit",
    description: "There are no time restrictions. You may include longer methods like slow roasting, fermentation, marination, or multiple components if they elevate flavour and texture.",
    min: 70,
    max: 90,
  }
];

export function getTimePromptText(timeValue: number): string {
  const timeRange = timeRanges.find(range => timeValue >= range.min && timeValue <= range.max);
  if (!timeRange) {
    return "Cooking time should be reasonable and efficient for the home cook.";
  }

  return `Cooking Time: ${timeRange.label}
${timeRange.description}`;
}