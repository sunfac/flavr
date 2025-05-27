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
      { value: "stovetop", label: "Stovetop only", icon: "🔥" },
      { value: "oven", label: "Oven only", icon: "🏠" },
      { value: "airfryer", label: "Air fryer", icon: "💨" },
      { value: "microwave", label: "Microwave", icon: "📻" },
      { value: "grill", label: "BBQ/Grill", icon: "🔥" },
      { value: "slowcooker", label: "Slow cooker", icon: "⏰" },
      { value: "blender", label: "Blender", icon: "🌪️" },
      { value: "any", label: "Any equipment", icon: "🔪" }
    ]
  }
];