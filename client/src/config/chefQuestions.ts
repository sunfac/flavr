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
      { value: "vegan", label: "Vegan" },
      { value: "vegetarian", label: "Vegetarian" },
      { value: "glutenFree", label: "Gluten-free" },
      { value: "dairyFree", label: "Dairy-free" },
      { value: "nutFree", label: "Nut-free" },
      { value: "pescatarian", label: "Pescatarian" },
      { value: "keto", label: "Keto" },
      { value: "paleo", label: "Paleo" },
      { value: "lowCarb", label: "Low-carb" },
      { value: "highProtein", label: "High-protein" },
      { value: "lowCalorie", label: "Low-calorie" },
      { value: "noRestrictions", label: "No restrictions" }
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
      { value: "justFed", label: "Just get fed", icon: "Coffee", desc: "Minimal effort" },
      { value: "simpleTasty", label: "Simple & tasty", icon: "Heart", desc: "Easy but delicious" },
      { value: "confidentCook", label: "Confident cook", icon: "Sparkles", desc: "Touch of flair" },
      { value: "ambitiousChef", label: "Ambitious chef", icon: "Target", desc: "Multi-step prep" },
      { value: "michelinEffort", label: "Michelin effort", icon: "Crown", desc: "Restaurant quality" }
    ]
  },
  {
    id: "servings",
    label: "How many servings?",
    subtitle: "Planning for how many people?",
    type: "cards",
    required: true,
    options: [
      { value: "1", label: "Just me", icon: "User", desc: "1 serving" },
      { value: "2", label: "For two", icon: "Users", desc: "2 servings" },
      { value: "4", label: "Small family", icon: "Home", desc: "4 servings" },
      { value: "6", label: "Large family", icon: "Users2", desc: "6 servings" },
      { value: "8", label: "Party time", icon: "PartyPopper", desc: "8+ servings" }
    ]
  },
  {
    id: "equipment",
    label: "Available equipment",
    subtitle: "What tools do you have access to?",
    type: "equipment-grid",
    options: [
      { value: "hob", label: "Hob", icon: "Flame" },
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