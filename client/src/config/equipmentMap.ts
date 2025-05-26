// config/equipmentMap.ts

export type EquipmentKey =
  | "stovetop"
  | "oven"
  | "microwave"
  | "airFryer"
  | "grill"
  | "slowCooker"
  | "pressureCooker"
  | "blender"
  | "riceCooker"
  | "bbq";

export const equipmentLabels: Record<EquipmentKey, string> = {
  stovetop: "Stovetop / Hob",
  oven: "Oven",
  microwave: "Microwave",
  airFryer: "Air Fryer",
  grill: "Grill / Broiler",
  slowCooker: "Slow Cooker",
  pressureCooker: "Pressure Cooker (e.g. Instant Pot)",
  blender: "Blender / Food Processor",
  riceCooker: "Rice Cooker",
  bbq: "BBQ / Outdoor Grill",
};

export const equipmentMap: Record<EquipmentKey, { label: string; description: string }> = {
  stovetop: {
    label: "Stovetop / Hob",
    description: "Use stovetop cooking methods like sautéing, boiling, simmering, and pan-frying. Focus on recipes that require direct heat control.",
  },
  oven: {
    label: "Oven",
    description: "Utilize baking, roasting, and broiling techniques. Perfect for dishes that need even heat distribution and longer cooking times.",
  },
  microwave: {
    label: "Microwave",
    description: "Quick reheating and simple cooking methods. Focus on steam-cooking vegetables, melting, and rapid preparation techniques.",
  },
  airFryer: {
    label: "Air Fryer",
    description: "Crispy textures with minimal oil using circulated hot air. Excellent for achieving fried-like results with healthier cooking.",
  },
  grill: {
    label: "Grill / Broiler",
    description: "High-heat cooking for char marks and smoky flavors. Perfect for meats, vegetables, and dishes requiring direct intense heat.",
  },
  slowCooker: {
    label: "Slow Cooker",
    description: "Long, gentle cooking for tender results. Ideal for stews, braised dishes, and hands-off cooking methods.",
  },
  pressureCooker: {
    label: "Pressure Cooker",
    description: "Fast cooking under pressure for quick, tender results. Perfect for beans, tough cuts of meat, and rapid meal preparation.",
  },
  blender: {
    label: "Blender / Food Processor",
    description: "Smoothies, soups, sauces, and ingredient processing. Essential for recipes requiring smooth textures or chopped ingredients.",
  },
  riceCooker: {
    label: "Rice Cooker",
    description: "Perfect rice and grain cooking with hands-off convenience. Can also steam vegetables and cook one-pot grain dishes.",
  },
  bbq: {
    label: "BBQ / Outdoor Grill",
    description: "Outdoor cooking with wood, charcoal, or gas for authentic BBQ flavors. Focus on grilled and smoked preparations.",
  }
};

export function getEquipmentPromptText(equipmentKeys: string[]): string {
  if (!equipmentKeys || equipmentKeys.length === 0) {
    return "Available Equipment: Standard kitchen setup - use basic cooking methods suitable for most home kitchens.";
  }

  const equipmentDescriptions = equipmentKeys
    .map(key => {
      const equipment = equipmentMap[key as EquipmentKey];
      return equipment ? `${equipment.label}: ${equipment.description}` : null;
    })
    .filter(Boolean);

  if (equipmentDescriptions.length === 0) {
    return "Available Equipment: Standard kitchen setup - use basic cooking methods.";
  }

  return `Available Equipment: ${equipmentDescriptions.join(' | ')}`;
}