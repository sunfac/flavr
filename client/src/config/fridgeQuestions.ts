import { QuestionConfig } from "@/components/SlideQuizShell";

export const fridgeQuestions: QuestionConfig[] = [
  {
    id: "ingredients",
    label: "What's in your fridge?",
    subtitle: "Add ingredients you want to use",
    type: "ingredient-list",
    required: true,
    placeholder: "e.g., eggs, spinach, tomatoes, chicken...",
    validation: (value) => {
      if (!value || (Array.isArray(value) ? value.length === 0 : value.trim().length === 0)) {
        return "Please add at least one ingredient";
      }
      return true;
    }
  },
  {
    id: "ingredientFlexibility",
    label: "Ingredient approach",
    subtitle: "Work with what you have or add some extras?",
    type: "cards",
    required: true,
    options: [
      { value: "strict", label: "Use What I Have", icon: "Shield", desc: "Only my ingredients + pantry basics" },
      { value: "flexible", label: "Add A Few Extras", icon: "Plus", desc: "Include 2-4 complementary ingredients" }
    ]
  },
  {
    id: "vibe",
    label: "What's your vibe?",
    subtitle: "How are you feeling about cooking?",
    type: "cards",
    required: true,
    options: [
      { value: "comfort", label: "Comfort food", icon: "Home", desc: "Warm & nostalgic" },
      { value: "impressive", label: "Impressive for guests", icon: "Star", desc: "Restaurant-level" },
      { value: "light", label: "Light & refreshing", icon: "Leaf", desc: "Bright & vibrant" },
      { value: "family", label: "Family-friendly", icon: "Users", desc: "Appeals to all" },
      { value: "romantic", label: "Romantic", icon: "Heart", desc: "Intimate & indulgent" },
      { value: "indulgent", label: "Indulgent", icon: "Crown", desc: "Rich & bold" },
      { value: "quick", label: "Quick & energetic", icon: "Zap", desc: "Fast & punchy" },
      { value: "clean", label: "Clean & nourishing", icon: "Sparkles", desc: "Healthy & natural" }
    ]
  },
  {
    id: "cuisines",
    label: "Cuisine preferences",
    subtitle: "Any particular flavors? (optional)",
    type: "multi-select",
    options: [
      { value: "any", label: "Any" },
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
    min: 10,
    max: 90,
    step: 10,
    dynamicLabel: (value: number) => {
      if (value >= 90) return "No time limit";
      return `${value} minutes`;
    }
  },
  {
    id: "dietary",
    label: "Dietary requirements",
    subtitle: "Any dietary restrictions or preferences?",
    type: "toggle-grid",
    options: [
      { value: "noRestrictions", label: "No restrictions", icon: "Check", desc: "Eat everything" },
      { value: "vegan", label: "Vegan", icon: "Leaf", desc: "Plant-based only" },
      { value: "vegetarian", label: "Vegetarian", icon: "Carrot", desc: "No meat or fish" },
      { value: "pescatarian", label: "Pescatarian", icon: "Fish", desc: "Fish but no meat" },
      { value: "glutenFree", label: "Gluten-free", icon: "WheatOff", desc: "No wheat/gluten" },
      { value: "dairyFree", label: "Dairy-free", icon: "MilkOff", desc: "No dairy products" },
      { value: "nutFree", label: "Nut-free", icon: "NutOff", desc: "No nuts or seeds" },
      { value: "halal", label: "Halal", icon: "Moon", desc: "Islamic dietary laws" },
      { value: "kosher", label: "Kosher", icon: "Star", desc: "Jewish dietary laws" }
    ]
  },
  {
    id: "nutritionalGoals",
    label: "Nutritional goals",
    subtitle: "What are your health and fitness priorities?",
    type: "toggle-grid",
    options: [
      { value: "balanced", label: "Balanced nutrition", icon: "Scale", desc: "Well-rounded meals" },
      { value: "highProtein", label: "High protein", icon: "Zap", desc: "Build & maintain muscle" },
      { value: "lowCarb", label: "Low carb", icon: "Minus", desc: "Reduce carbohydrates" },
      { value: "lowCalorie", label: "Low calorie", icon: "Target", desc: "Weight management" },
      { value: "keto", label: "Ketogenic", icon: "Flame", desc: "Very low carb, high fat" },
      { value: "paleo", label: "Paleo", icon: "Mountain", desc: "Whole foods, no processed" },
      { value: "lowSodium", label: "Low sodium", icon: "Heart", desc: "Heart-healthy" },
      { value: "highFiber", label: "High fiber", icon: "Wheat", desc: "Digestive health" },
      { value: "antioxidantRich", label: "Antioxidant-rich", icon: "Sparkles", desc: "Colorful, nutrient-dense" }
    ]
  },
  {
    id: "equipment",
    label: "Available equipment",
    subtitle: "What can you cook with?",
    type: "equipment-grid",
    options: [
      { value: "hob", label: "Hob", icon: "Flame" },
      { value: "oven", label: "Oven", icon: "Building" },
      { value: "microwave", label: "Microwave", icon: "Waves" },
      { value: "airfryer", label: "Air Fryer", icon: "Wind" },
      { value: "grill", label: "Grill", icon: "Beef" },
      { value: "slowcooker", label: "Slow Cooker", icon: "Clock" },
      { value: "pressure", label: "Pressure Cooker", icon: "Timer" },
      { value: "blender", label: "Blender", icon: "Blend" },
      { value: "rice", label: "Rice Cooker", icon: "Star" },
      { value: "bbq", label: "BBQ", icon: "Flame" },
      { value: "basics", label: "Just the basics", icon: "ChefHat" }
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
    id: "ambition",
    label: "Ambition level",
    subtitle: "How adventurous are we feeling?",
    type: "cards",
    required: true,
    options: [
      { value: "justFed", label: "Just get fed", icon: "Coffee", desc: "Minimal effort" },
      { value: "simpleTasty", label: "Simple & tasty", icon: "Heart", desc: "Easy but delicious" },
      { value: "confidentCook", label: "Confident cook", icon: "Sparkles", desc: "Touch of flair" },
      { value: "ambitiousChef", label: "Ambitious chef", icon: "Target", desc: "Multi-step prep" },
      { value: "michelinEffort", label: "Michelin effort", icon: "Crown", desc: "Restaurant quality" }
    ]
  }
];