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
    min: 5,
    max: 120,
    step: 5,
    dynamicLabel: (value: number) => {
      if (value <= 15) return "Quick win";
      if (value <= 45) return "Weeknight dinner";
      if (value <= 90) return "Take your time";
      return "No time limit — chef's adventure";
    }
  },
  {
    id: "ambition",
    label: "Your ambition level",
    subtitle: "How challenging should this be?",
    type: "slider",
    min: 1,
    max: 5,
    step: 1,
    dynamicLabel: (value: number) => {
      const labels = {
        1: "Just need something edible",
        2: "Simple but delicious",
        3: "Confident cook",
        4: "Ambitious home chef",
        5: "Michelin star effort"
      };
      return labels[value as keyof typeof labels] || `Level ${value}`;
    }
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