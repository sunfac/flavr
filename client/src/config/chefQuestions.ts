import { QuestionConfig } from "@/components/SlideQuizShell";

export const chefQuestions: QuestionConfig[] = [
  {
    id: "intent",
    label: "What's your culinary vision?",
    subtitle: "Describe what you want to create",
    type: "textarea",
    required: true,
    placeholder: "Describe your culinary vision in detail...",
    examples: [
      "A rich chocolate fudge cake for a birthday",
      "An elite BBQ dish for six guests",
      "A romantic vegan dinner with wow factor",
      "Authentic Italian pasta from scratch",
      "Show-stopping dessert for dinner party",
      "Comfort food with a gourmet twist"
    ],
    validation: (value) => {
      if (!value || value.trim().length < 10) {
        return "Please describe your vision in more detail";
      }
      return true;
    }
  },
  {
    id: "dietary",
    label: "Dietary considerations",
    subtitle: "Any restrictions or preferences?",
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
    id: "time",
    label: "Time to create",
    subtitle: "How long can you dedicate to this?",
    type: "slider",
    min: 10,
    max: 90,
    step: 10,
    dynamicLabel: (value: number) => {
      if (value >= 90) return "No time limit";
      return `${value} minutes`;
    }
  },
  {
    id: "budget",
    label: "What's your budget?",
    subtitle: "How much are you looking to spend?",
    type: "cards",
    required: true,
    options: [
      { value: "budget", label: "Budget Friendly", icon: "PoundSterling", desc: "£1–£2 per portion" },
      { value: "moderate", label: "Moderate", icon: "CreditCard", desc: "£2–£4 per portion" },
      { value: "premium", label: "Premium Ingredients", icon: "Crown", desc: "£4–£7 per portion" },
      { value: "luxury", label: "Sky's the Limit", icon: "Star", desc: "£7+ per portion" }
    ]
  },
  {
    id: "ambition",
    label: "Your ambition level",
    subtitle: "How challenging should this be?",
    type: "cards",
    required: true,
    options: [
      { value: "1", label: "Just need something edible", icon: "Coffee", desc: "Simple & quick" },
      { value: "2", label: "Simple but delicious", icon: "Heart", desc: "Easy but tasty" },
      { value: "3", label: "Confident cook", icon: "Sparkles", desc: "Try new techniques" },
      { value: "4", label: "Ambitious home chef", icon: "Target", desc: "Challenge myself" },
      { value: "5", label: "Michelin star effort", icon: "Crown", desc: "Go all out" }
    ]
  },
  {
    id: "equipment",
    label: "Available equipment",
    subtitle: "What tools do you have access to?",
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
      { value: "mixer", label: "Stand Mixer", icon: "RotateCcw" },
      { value: "castiron", label: "Cast Iron", icon: "Utensils" },
      { value: "pizza", label: "Pizza Oven", icon: "Pizza" },
      { value: "bbq", label: "BBQ", icon: "Grill" },
      { value: "kamado", label: "Kamado", icon: "Soup" },
      { value: "basics", label: "Just the basics", icon: "ChefHat" }
    ]
  },
  {
    id: "extras",
    label: "Extra touches",
    subtitle: "Want to make it even more special?",
    type: "cards",
    options: [
      { value: "wine", label: "Wine pairing", icon: "🍷" },
      { value: "sides", label: "Side dish suggestion", icon: "🥗" },
      { value: "dessert", label: "Dessert to match", icon: "🍰" },
      { value: "presentation", label: "Presentation tips", icon: "✨" },
      { value: "prep", label: "Batch/prep suggestions", icon: "📋" },
      { value: "restaurant", label: "Make it restaurant-worthy", icon: "⭐" }
    ]
  }
];