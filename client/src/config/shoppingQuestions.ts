import { QuestionConfig } from "@/components/SlideQuizShell";

export const shoppingQuestions: QuestionConfig[] = [
  {
    id: "mood",
    label: "What's your mood?",
    subtitle: "How are you feeling about cooking today?",
    type: "cards",
    required: true,
    options: [
      { value: "comfort", label: "Comfort food", icon: "Home", desc: "Warm and cozy vibes" },
      { value: "healthy", label: "Fresh & healthy", icon: "Leaf", desc: "Light and nutritious" },
      { value: "indulgent", label: "Pure indulgence", icon: "Crown", desc: "Treat yourself" },
      { value: "adventurous", label: "Something new", icon: "Target", desc: "Bold and exciting" },
      { value: "quick", label: "Quick & easy", icon: "Zap", desc: "Minimal effort" },
      { value: "impressive", label: "Impress someone", icon: "Star", desc: "Show off your skills" },
      { value: "surprise", label: "Surprise me", icon: "Shuffle", desc: "Let's discover together" }
    ]
  },
  {
    id: "cuisine",
    label: "Cuisine preference",
    subtitle: "Any particular flavors calling to you?",
    type: "multi-select",
    options: [
      { value: "italian", label: "Italian" },
      { value: "indian", label: "Indian" },
      { value: "thai", label: "Thai" },
      { value: "mexican", label: "Mexican" },
      { value: "chinese", label: "Chinese" },
      { value: "japanese", label: "Japanese" },
      { value: "greek", label: "Greek" },
      { value: "french", label: "French" },
      { value: "korean", label: "Korean" },
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
    max: 120,
    step: 5,
    dynamicLabel: (value: number) => {
      if (value <= 15) return "Fast fix";
      if (value <= 45) return "Dinner mode";
      if (value >= 90) return "No time limit";
      return "I'll use it all";
    }
  },
  {
    id: "budget",
    label: "What's your budget?",
    subtitle: "How much are you looking to spend?",
    type: "cards",
    required: true,
    options: [
      { value: "budget", label: "Budget-friendly", icon: "DollarSign", desc: "Under $15 total" },
      { value: "moderate", label: "Moderate", icon: "CreditCard", desc: "$15-30 range" },
      { value: "premium", label: "Premium ingredients", icon: "Crown", desc: "$30+ is fine" },
      { value: "no-limit", label: "Sky's the limit", icon: "Star", desc: "Best ingredients only" }
    ]
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
      { value: "stovetop", label: "Stovetop", icon: "🔥" },
      { value: "oven", label: "Oven", icon: "🏠" },
      { value: "microwave", label: "Microwave", icon: "📻" },
      { value: "airfryer", label: "Air Fryer", icon: "💨" },
      { value: "grill", label: "Grill", icon: "🔥" },
      { value: "slowcooker", label: "Slow Cooker", icon: "⏰" },
      { value: "pressure", label: "Pressure Cooker", icon: "⚡" },
      { value: "blender", label: "Blender", icon: "🌪️" },
      { value: "rice", label: "Rice Cooker", icon: "🍚" },
      { value: "bbq", label: "BBQ", icon: "🔥" },
      { value: "basics", label: "Just the basics", icon: "🔪" }
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
        4: "Ambitious chef",
        5: "Michelin effort"
      };
      return labels[value as keyof typeof labels] || `Level ${value}`;
    }
  },
  {
    id: "supermarket",
    label: "Preferred supermarket",
    subtitle: "Where do you usually shop?",
    type: "cards",
    options: [
      { value: "whole-foods", label: "Whole Foods", icon: "🌿", desc: "Premium organic focus" },
      { value: "trader-joes", label: "Trader Joe's", icon: "🛒", desc: "Unique specialty items" },
      { value: "kroger", label: "Kroger", icon: "🏪", desc: "Wide selection" },
      { value: "safeway", label: "Safeway", icon: "🛍️", desc: "Fresh & convenient" },
      { value: "walmart", label: "Walmart", icon: "💰", desc: "Budget-friendly" },
      { value: "target", label: "Target", icon: "🎯", desc: "Trendy selections" },
      { value: "costco", label: "Costco", icon: "📦", desc: "Bulk buying" },
      { value: "local", label: "Local market", icon: "🏘️", desc: "Community stores" },
      { value: "online", label: "Online delivery", icon: "📱", desc: "Convenient ordering" },
      { value: "any", label: "Any store works", icon: "🤷", desc: "Flexible shopper" }
    ]
  }
];