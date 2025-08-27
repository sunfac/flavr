import { QuestionConfig } from "@/components/SlideQuizShell";

export const chefQuestions: QuestionConfig[] = [
  {
    id: "intent",
    label: "What's your culinary vision?",
    subtitle: "Describe what you want to create today",
    type: "textarea",
    required: true,
    placeholder: "Tell me about the dish you have in mind...",
    examples: [
      "I want to recreate peri-peri chicken like Nando's",
      "I want to make a Zinger Tower Burger like the one from KFC",
      "I want to cook a Greggs-style steak bake at home",
      "I want to make a teriyaki chicken donburi like Itsu",
      "I want to bake a luxurious chocolate and salted caramel celebration cake",
      "I want to make sourdough pizza from scratch with honey and Nduja",
      "I want to cook a Michelin-style mushroom risotto with truffle oil",
      "I want to make a romantic date-night steak dinner with chimichurri",
      "I want to cook a dish using seasonal UK ingredients this month",
      "I want to make a vibrant summer salad with strawberries and feta",
      "I want to make a 15-minute garlic and chilli prawn pasta",
      "I want to make a comforting mac & cheese with three cheeses",
      "I want to bring an amazing BBQ dish to a summer party",
      "I want to make something impressive for a dinner party",
      "I want to make a vegan lentil shepherd's pie with crispy mash",
      "I want to cook a Korean-inspired beef bulgogi rice bowl",
      "I want to make a cosy dish for a cold, rainy evening",
      "I'm craving something spicy that wakes up my taste buds",
      "I want a light and refreshing meal for a hot summer day",
      "I need a comforting dish after a stressful day",
      "I want to treat myself with something rich and indulgent",
      "I want a colourful, feel-good dinner that lifts my mood",
      "I want to slow-cook something that fills the house with delicious smells",
      "I want to cook something fun and playful with the kids",
      "A light summery meal",
      "I want to make a healthy weeknight dinner that's still exciting",
      "I want to cook something warming and hearty for winter",
      "I want to create a fresh and zesty dish with citrus flavours",
      "I want to make a one-pot wonder that's both filling and flavourful"
    ]
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
    id: "ambition",
    label: "Ambition level",
    subtitle: "How adventurous are we feeling?",
    type: "cards",
    required: true,
    options: [
      { value: "justFed", label: "Just get fed", icon: "User", desc: "Minimal effort" },
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
      { value: "any", label: "Any equipment", icon: "ChefHat" },
      { value: "basics", label: "Just the basics", icon: "ChefHat" }
    ]
  }
];