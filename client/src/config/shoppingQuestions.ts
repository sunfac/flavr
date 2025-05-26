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
      { value: "tesco", label: "Tesco", icon: "ShoppingCart", desc: "Every little helps" },
      { value: "sainsburys", label: "Sainsbury's", icon: "Store", desc: "Quality & value" },
      { value: "asda", label: "ASDA", icon: "PoundSterling", desc: "Save money, live better" },
      { value: "morrisons", label: "Morrisons", icon: "ShoppingBag", desc: "Makes it fresh" },
      { value: "aldi", label: "Aldi", icon: "Coins", desc: "Amazing quality, unbeatable prices" },
      { value: "lidl", label: "Lidl", icon: "Banknote", desc: "Big on quality, Lidl on price" },
      { value: "waitrose", label: "Waitrose", icon: "Crown", desc: "Premium quality" },
      { value: "coop", label: "Co-op", icon: "Users", desc: "Community focused" },
      { value: "iceland", label: "Iceland", icon: "Snowflake", desc: "Frozen food specialist" },
      { value: "marks", label: "M&S Food", icon: "Star", desc: "Simply better food" },
      { value: "local", label: "Local shops", icon: "Home", desc: "Independent stores" },
      { value: "online", label: "Online delivery", icon: "Smartphone", desc: "Convenient ordering" }
    ]
  }
];