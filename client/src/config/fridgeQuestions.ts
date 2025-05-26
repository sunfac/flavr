import { QuestionConfig } from "@/components/SlideQuizShell";

export const fridgeQuestions: QuestionConfig[] = [
  {
    id: "ingredients",
    label: "What's in your fridge?",
    subtitle: "Add ingredients you want to use",
    type: "text",
    required: true,
    placeholder: "e.g., eggs, spinach, tomatoes, chicken...",
    validation: (value) => {
      if (!value || value.trim().length < 10) {
        return "Please add at least a few ingredients";
      }
      return true;
    }
  },
  {
    id: "vibe",
    label: "What's your vibe?",
    subtitle: "How are you feeling about cooking?",
    type: "cards",
    required: true,
    options: [
      { value: "comfort", label: "Comfort food", icon: "Home", desc: "Warm and cozy" },
      { value: "fresh", label: "Fresh & healthy", icon: "Leaf", desc: "Light and nutritious" },
      { value: "decadent", label: "Decadent treat", icon: "Crown", desc: "Indulgent pleasure" },
      { value: "exciting", label: "Something exciting", icon: "Flame", desc: "Bold and adventurous" },
      { value: "minimal", label: "Minimal effort", icon: "Zap", desc: "Quick and easy" },
      { value: "foodie", label: "Foodie moment", icon: "ChefHat", desc: "Restaurant quality" },
      { value: "surprise", label: "Surprise me", icon: "Shuffle", desc: "Let's discover together" }
    ]
  },
  {
    id: "cuisines",
    label: "Cuisine preferences",
    subtitle: "Any particular flavors? (optional)",
    type: "multi-select",
    options: [
      { value: "italian", label: "Italian" },
      { value: "indian", label: "Indian" },
      { value: "thai", label: "Thai" },
      { value: "greek", label: "Greek" },
      { value: "french", label: "French" },
      { value: "korean", label: "Korean" },
      { value: "mexican", label: "Mexican" },
      { value: "chinese", label: "Chinese" },
      { value: "japanese", label: "Japanese" },
      { value: "spanish", label: "Spanish" },
      { value: "lebanese", label: "Lebanese" },
      { value: "vietnamese", label: "Vietnamese" },
      { value: "moroccan", label: "Moroccan" },
      { value: "fusion", label: "Fusion" },
      { value: "other", label: "Other" }
    ]
  },
  {
    id: "time",
    label: "How much time?",
    subtitle: "From quick fixes to weekend projects",
    type: "slider",
    min: 5,
    max: 90,
    step: 5,
    dynamicLabel: (value: number) => {
      if (value <= 15) return "Fast fix";
      if (value <= 45) return "Dinner mode";
      if (value >= 90) return "No time limit";
      return "I'll use it all";
    }
  },
  {
    id: "dietary",
    label: "Dietary preferences",
    subtitle: "Any restrictions or goals?",
    type: "multi-select",
    options: [
      { value: "vegetarian", label: "Vegetarian" },
      { value: "vegan", label: "Vegan" },
      { value: "gluten-free", label: "Gluten-free" },
      { value: "dairy-free", label: "Dairy-free" },
      { value: "low-carb", label: "Low-carb" },
      { value: "low-calorie", label: "Low-calorie" },
      { value: "paleo", label: "Paleo" },
      { value: "keto", label: "Keto" },
      { value: "halal", label: "Halal" },
      { value: "kosher", label: "Kosher" },
      { value: "none", label: "No restrictions" }
    ]
  },
  {
    id: "equipment",
    label: "Available equipment",
    subtitle: "What can you cook with?",
    type: "equipment-grid",
    options: [
      { value: "stovetop", label: "Stovetop", icon: "Flame" },
      { value: "oven", label: "Oven", icon: "Oven" },
      { value: "microwave", label: "Microwave", icon: "Zap" },
      { value: "airfryer", label: "Air Fryer", icon: "Wind" },
      { value: "grill", label: "Grill", icon: "Barbecue" },
      { value: "slowcooker", label: "Slow Cooker", icon: "Clock" },
      { value: "pressure", label: "Pressure Cooker", icon: "Timer" },
      { value: "blender", label: "Blender", icon: "Blend" },
      { value: "rice", label: "Rice Cooker", icon: "Bowl" },
      { value: "bbq", label: "BBQ", icon: "Grill" },
      { value: "basics", label: "Just the basics", icon: "ChefHat" }
    ]
  },
  {
    id: "ambition",
    label: "Ambition level",
    subtitle: "How adventurous are we feeling?",
    type: "slider",
    min: 1,
    max: 5,
    step: 1,
    dynamicLabel: (value: number) => {
      const labels = {
        1: "Just get fed",
        2: "Simple & tasty",
        3: "Confident cook",
        4: "Ambitious home chef",
        5: "Michelin star effort"
      };
      return labels[value as keyof typeof labels] || `Level ${value}`;
    }
  }
];