import type { Express } from "express";
import { createServer, type Server } from "http";
import session from "express-session";
import OpenAI from "openai";
import Stripe from "stripe";
import { storage } from "./storage";
import { insertRecipeSchema, insertChatMessageSchema } from "@shared/schema";
import { getCreativeGuidanceBlock } from "./shoppingPromptBlocks";

// Budget mapping functions for GPT prompts
const budgetMappings = {
  "budget": {
    label: "Budget Friendly",
    costRange: "£1–£2 per portion",
    guidance: "using basic, widely available supermarket ingredients only. Avoid excess packaging and ingredient waste."
  },
  "moderate": {
    label: "Moderate", 
    costRange: "£2–£4 per portion",
    guidance: "Balanced cost-conscious meals with quality ingredients and some flexibility in preparation time or brand."
  },
  "premium": {
    label: "Premium Ingredients",
    costRange: "£4–£7 per portion", 
    guidance: "Use higher quality ingredients like fresh herbs, good cuts of meat, artisanal products, but keep portions reasonable."
  },
  "luxury": {
    label: "Sky's the Limit",
    costRange: "£7+ per portion",
    guidance: "Prioritise flavour and ingredient quality without concern for price. Use premium cuts, luxury items, or rare produce."
  }
} as const;

// Mood mapping functions for GPT prompts
const moodMappings = {
  "comfort": {
    label: "Comfort food",
    description: "The meal should feel warm, nostalgic, and hearty — like a hug in a bowl. Lean into familiar, satisfying flavours and soft textures."
  },
  "impressive": {
    label: "Impressive for guests",
    description: "Design the dish with visual impact and elevated flavour layers. Prioritise presentation and restaurant-level quality."
  },
  "light": {
    label: "Light & refreshing",
    description: "The dish should be bright, vibrant, and easy to digest. Use fresh herbs, citrus, or cooling elements to keep it lively."
  },
  "family": {
    label: "Family-friendly",
    description: "Appeal to a variety of tastes including children. Keep it approachable, with minimal spice and simple presentation."
  },
  "romantic": {
    label: "Romantic",
    description: "The meal should feel intimate, indulgent, and sensorial. Use elegant plating, rich ingredients, and warm, candlelit-friendly colours."
  },
  "indulgent": {
    label: "Indulgent",
    description: "This is an unapologetically rich, flavour-packed dish. Prioritise taste over health — think bold sauces, melted textures, and crave-worthy ingredients."
  },
  "quick": {
    label: "Quick & energetic",
    description: "The dish should be bold, punchy, and fast to prepare. Use high-impact flavours with low fuss and minimal prep."
  },
  "clean": {
    label: "Clean & nourishing",
    description: "Prioritise health, digestion, and natural ingredients. Use lean proteins, grains, and greens with minimal processing or added fat."
  }
} as const;

// Ambition mapping functions for GPT prompts
const ambitionMappings = {
  "justFed": {
    label: "Just get fed",
    description: "Prioritise absolute simplicity. Use minimal ingredients, very few steps, and get food on the table with the least effort possible."
  },
  "simpleTasty": {
    label: "Simple & tasty",
    description: "Balance speed with flavour. Stick to straightforward methods, common ingredients, and tasty results without complexity."
  },
  "confidentCook": {
    label: "Confident cook",
    description: "The user is comfortable with moderate prep and some layering of flavour. Use quality ingredients and clear steps with a touch of flair."
  },
  "ambitiousChef": {
    label: "Ambitious chef",
    description: "Include multi-step prep, sauce work, marinades, and thoughtful plating. Use techniques like roasting, reductions, and resting."
  },
  "michelinEffort": {
    label: "Michelin effort",
    description: "Design a refined, beautifully plated, restaurant-quality dish. Emphasise creative presentation, rich layers of flavour, and elite culinary techniques. Assume this user is ready to go all-in."
  }
} as const;

// Time mapping functions for GPT prompts
const timeRanges = [
  {
    label: "Under 15 minutes",
    description: "The entire recipe must take no more than 15 minutes from start to finish, including all prep and cooking. Use rapid-cook ingredients and shortcuts.",
    min: 10,
    max: 15,
  },
  {
    label: "15–30 minutes",
    description: "The recipe must be completed in under 30 minutes. Use efficient prep and quick-cooking methods with minimal downtime.",
    min: 20,
    max: 30,
  },
  {
    label: "30–60 minutes",
    description: "The recipe should take no more than 60 minutes. You may include oven-based cooking, simmering, and basic prep techniques.",
    min: 40,
    max: 60,
  },
  {
    label: "No time limit",
    description: "There are no time restrictions. You may include longer methods like slow roasting, fermentation, marination, or multiple components if they elevate flavour and texture.",
    min: 70,
    max: 90,
  }
];

function getBudgetPromptText(budgetLevel: string): string {
  const mapping = budgetMappings[budgetLevel as keyof typeof budgetMappings];
  if (!mapping) {
    return "Budget: Moderate. Please ensure the cost per portion reflects this: £2–£4 per portion. Balanced cost-conscious meals with quality ingredients and some flexibility in preparation time or brand. Currency: GBP (British Pounds). Assume supermarket prices.";
  }

  return `Budget: ${mapping.label}
Please ensure the cost per portion reflects this: ${mapping.costRange} ${mapping.guidance}
Currency: GBP (British Pounds). Assume supermarket prices.`;
}

function getMoodPromptText(moodKey: string): string {
  const mood = moodMappings[moodKey as keyof typeof moodMappings];
  if (!mood) {
    return "Create a balanced, appealing dish that satisfies the user's preferences.";
  }

  return `Mood: ${mood.label}
${mood.description}`;
}

function getAmbitionPromptText(ambitionKey: string): string {
  const ambition = ambitionMappings[ambitionKey as keyof typeof ambitionMappings];
  if (!ambition) {
    return "Create a recipe with moderate complexity that balances flavor and achievability.";
  }

  return `Cooking Ambition: ${ambition.label}
${ambition.description}`;
}

function getTimePromptText(timeValue: number): string {
  const timeRange = timeRanges.find(range => timeValue >= range.min && timeValue <= range.max);
  if (!timeRange) {
    return "Cooking time should be reasonable and efficient for the home cook.";
  }

  return `Cooking Time: ${timeRange.label}
${timeRange.description}`;
}

function getDietPromptText(dietKeys: string[]): string {
  const dietMap: Record<string, { label: string; description: string }> = {
    vegan: {
      label: "Vegan",
      description: "Exclude all animal-derived ingredients, including meat, dairy, eggs, honey, and gelatin. Use only plant-based alternatives.",
    },
    vegetarian: {
      label: "Vegetarian",
      description: "Exclude all meat and fish. Dairy and eggs are allowed.",
    },
    glutenFree: {
      label: "Gluten-free",
      description: "Exclude all gluten-containing ingredients including wheat, barley, rye, and soy sauce unless certified gluten-free.",
    },
    dairyFree: {
      label: "Dairy-free",
      description: "Exclude all dairy ingredients including milk, butter, cheese, cream, and yogurt. Use plant-based alternatives.",
    },
    nutFree: {
      label: "Nut-free",
      description: "Strictly exclude all nuts and nut-based products, including nut oils and butters.",
    },
    pescatarian: {
      label: "Pescatarian",
      description: "No meat or poultry. Fish and seafood are allowed.",
    },
    keto: {
      label: "Keto",
      description: "Keep net carbs very low. Avoid sugar, grains, and starchy vegetables. Prioritise fats, protein, and low-carb greens.",
    },
    paleo: {
      label: "Paleo",
      description: "Avoid all processed foods, grains, dairy, and legumes. Focus on whole foods, meats, fish, vegetables, nuts, and seeds.",
    },
    lowCarb: {
      label: "Low-carb",
      description: "Reduce starchy foods and sugars. Focus on non-starchy vegetables, proteins, and healthy fats.",
    },
    highProtein: {
      label: "High-protein",
      description: "Ensure meals are protein-rich using meat, fish, eggs, dairy, or plant-based alternatives. Support muscle recovery and satiety.",
    },
    lowCalorie: {
      label: "Low-calorie",
      description: "Design meals with reduced calorie density using lean proteins, non-starchy vegetables, and minimal added fats.",
    },
    noRestrictions: {
      label: "No restrictions",
      description: "There are no dietary limitations. Use any ingredients freely.",
    }
  };

  if (!dietKeys || dietKeys.length === 0 || dietKeys.includes('noRestrictions')) {
    return "Dietary Requirements: No restrictions - use any ingredients freely.";
  }

  const dietDescriptions = dietKeys
    .filter(key => key !== 'noRestrictions')
    .map(key => {
      const diet = dietMap[key];
      return diet ? `${diet.label}: ${diet.description}` : null;
    })
    .filter(Boolean);

  if (dietDescriptions.length === 0) {
    return "Dietary Requirements: No specific restrictions.";
  }

  return `Dietary Requirements: ${dietDescriptions.join(' | ')}`;
}

function getEquipmentPromptText(equipmentKeys: string[]): string {
  const equipmentMap: Record<string, { label: string; description: string }> = {
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

  if (!equipmentKeys || equipmentKeys.length === 0) {
    return "Available Equipment: Standard kitchen setup - use basic cooking methods suitable for most home kitchens.";
  }

  const equipmentDescriptions = equipmentKeys
    .map(key => {
      const equipment = equipmentMap[key];
      return equipment ? `${equipment.label}: ${equipment.description}` : null;
    })
    .filter(Boolean);

  if (equipmentDescriptions.length === 0) {
    return "Available Equipment: Standard kitchen setup - use basic cooking methods.";
  }

  return `Available Equipment: ${equipmentDescriptions.join(' | ')}`;
}

// Initialize OpenAI
if (!process.env.OPENAI_API_KEY) {
  throw new Error('Missing required OpenAI API key: OPENAI_API_KEY');
}
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Initialize Stripe
if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing required Stripe secret: STRIPE_SECRET_KEY');
}
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2023-10-16",
});

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Setup session middleware
  app.use(session({
    secret: process.env.SESSION_SECRET || 'flavr-dev-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 } // 24 hours
  }));

  // Authentication middleware
  const requireAuth = (req: any, res: any, next: any) => {
    if (!req.session?.userId) {
      return res.status(401).json({ message: "Authentication required" });
    }
    next();
  };

  // Auth routes
  app.post("/api/register", async (req, res) => {
    try {
      const { username, email, password } = req.body;
      
      // Check if user exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "User already exists" });
      }

      const user = await storage.createUser({ username, email, password });
      req.session!.userId = user.id;
      res.json({ user: { id: user.id, username: user.username, email: user.email, isPlus: user.isPlus } });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      const user = await storage.getUserByEmail(email);
      
      if (!user || user.password !== password) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      req.session!.userId = user.id;
      res.json({ user: { id: user.id, username: user.username, email: user.email, isPlus: user.isPlus } });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/logout", (req, res) => {
    req.session?.destroy(() => {
      res.json({ message: "Logged out" });
    });
  });

  app.get("/api/me", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session!.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json({ user: { id: user.id, username: user.username, email: user.email, isPlus: user.isPlus, recipesThisMonth: user.recipesThisMonth } });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Test endpoint to verify routing
  app.get("/api/test", (req, res) => {
    console.log("Test endpoint hit successfully!");
    res.json({ message: "Backend routing works!", timestamp: new Date().toISOString() });
  });

  // Recipe generation routes (no auth required for ideas)
  app.post("/api/recipe-ideas", async (req, res) => {
    console.log("Recipe ideas endpoint hit with:", { mode: req.body.mode, quizData: req.body.quizData });
    try {
      const { mode, quizData, prompt } = req.body;

      // Build mapped prompt for Shopping Mode (Prompt 1 - Recipe Idea Generator)
      let enhancedPrompt;
      
      if (mode === 'shopping') {
        // Get mapped guidance text
        const moodText = (quizData.mood || quizData.vibe) ? getMoodPromptText(quizData.mood || quizData.vibe) : '';
        const ambitionText = quizData.ambition ? getAmbitionPromptText(quizData.ambition) : '';
        const dietaryText = quizData.dietary ? getDietPromptText(quizData.dietary) : '';
        const budgetText = quizData.budget ? getBudgetPromptText(quizData.budget) : '';
        const timeText = quizData.time ? getTimePromptText(quizData.time) : '';
        const equipmentText = quizData.equipment ? getEquipmentPromptText(quizData.equipment) : '';
        
        // Build Shopping Mode mapped prompt (Prompt 1)
        const creativeGuidance = getCreativeGuidanceBlock();
        
        enhancedPrompt = `You are an elite private chef.

Based on the following preferences, suggest 5 unique, flavour-packed recipe ideas. Each idea should have a title and a one-sentence description:

${moodText}

${ambitionText}

${dietaryText}

${budgetText}

${timeText}

${equipmentText}

Cuisine preference: ${quizData.cuisine || 'Any cuisine'}

${creativeGuidance}

Ensure the 5 ideas are meaningfully distinct from each other in ingredients, style, or technique.
Avoid repeating the same ingredient combinations across recipes.

Return a JSON object with this exact structure:
{
  "recipes": [
    {
      "title": "Recipe Name", 
      "description": "Brief appealing description in one sentence"
    }
  ]
}`;
      } else if (mode === 'fridge') {
        // Build Fridge Mode mapped prompt (Prompt 1)
        const creativeGuidance = getCreativeGuidanceBlock();
        
        enhancedPrompt = `You are an elite private chef.

Based on the user's available ingredients and preferences, suggest 5 exciting recipe ideas.
Each idea should include a recipe title and one short sentence describing what makes it delicious or unique.

Ingredients the user has in their fridge: ${quizData.ingredients || 'Various ingredients'}

${getMoodPromptText(quizData.mood || quizData.vibe || '')}

${getAmbitionPromptText(quizData.ambition || '')}

${getDietPromptText(quizData.dietary || [])}

${getTimePromptText(quizData.time || 30)}

${getEquipmentPromptText(quizData.equipment || [])}

${creativeGuidance}

Ensure the 5 ideas are meaningfully distinct from each other in ingredients, style, or technique.
You may assume common pantry items are available, including oils, seasonings, dried herbs and spices, flour, stock cubes, tinned tomatoes, beans, tuna, sweetcorn, pasta, rice, and similar cupboard staples.

Return a JSON object with this exact structure:
{
  "recipes": [
    {
      "title": "Recipe Name", 
      "description": "Brief appealing description in one sentence"
    }
  ]
}`;
      } else {
        // Fallback for other modes
        enhancedPrompt = `Generate exactly 5 diverse recipe suggestions based on these preferences:

Mode: ${mode}
Quiz Data: ${JSON.stringify(quizData)}

Return a JSON object with this exact structure:
{
  "recipes": [
    {
      "title": "Recipe Name",
      "description": "Brief appealing description in one sentence"
    }
  ]
}

Make each recipe unique and appealing. Focus on variety in cooking styles, flavors, and techniques.`;
      }

      console.log("Making OpenAI API call with prompt length:", enhancedPrompt.length);
      
      // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: enhancedPrompt }],
        response_format: { type: "json_object" },
      });

      console.log("OpenAI API response received successfully");
      const result = JSON.parse(response.choices[0].message.content!);
      res.json({ ideas: result.recipes || [] });
    } catch (error: any) {
      console.error("Recipe ideas generation error details:", {
        message: error.message,
        status: error.status,
        type: error.type,
        code: error.code
      });
      res.status(500).json({ message: "Failed to generate recipe ideas: " + error.message });
    }
  });

  app.post("/api/generate-recipe-ideas", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session!.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const { mode, quizData, prompt } = req.body;

      // Build mapped prompt for Shopping Mode (Prompt 1 - Recipe Idea Generator)
      let enhancedPrompt;
      
      if (mode === 'shopping') {
        // Get mapped guidance text
        const moodText = (quizData.mood || quizData.vibe) ? getMoodPromptText(quizData.mood || quizData.vibe) : '';
        const ambitionText = quizData.ambition ? getAmbitionPromptText(quizData.ambition) : '';
        const dietaryText = quizData.dietary ? getDietPromptText(quizData.dietary) : '';
        const budgetText = quizData.budget ? getBudgetPromptText(quizData.budget) : '';
        const timeText = quizData.time ? getTimePromptText(quizData.time) : '';
        const equipmentText = quizData.equipment ? getEquipmentPromptText(quizData.equipment) : '';
        
        // Build Shopping Mode mapped prompt (Prompt 1)
        const creativeGuidance = getCreativeGuidanceBlock();
        
        enhancedPrompt = `You are an elite private chef.

Based on the following preferences, suggest 5 unique, flavour-packed recipe ideas that could be made. Each idea should have a title and a one-sentence description:

Ingredients they want to use: ${quizData.ingredients || 'Any ingredients'}

${moodText}

${ambitionText}

${dietaryText}

${budgetText}

Cuisine preference: ${quizData.cuisine || 'Any cuisine'}

${timeText}

${equipmentText}

${creativeGuidance}

Ensure the 5 recipe ideas are meaningfully distinct from one another in style, technique, or core ingredients.

Only return a list of 5 recipe titles and short, enticing one-liners for each.
Do not include ingredient lists or steps yet.

Return a JSON object with this exact structure:
{
  "recipes": [
    {
      "title": "Recipe Name", 
      "description": "Brief appealing description in one sentence"
    }
  ]
}`;
      } else if (mode === 'fridge') {
        // Get mapped guidance text for Fridge Mode (omit budget and cuisine)
        const moodText = (quizData.mood || quizData.vibe) ? getMoodPromptText(quizData.mood || quizData.vibe) : '';
        const ambitionText = quizData.ambition ? getAmbitionPromptText(quizData.ambition) : '';
        const dietaryText = quizData.dietary ? getDietPromptText(quizData.dietary) : '';
        const timeText = quizData.time ? getTimePromptText(quizData.time) : '';
        const equipmentText = quizData.equipment ? getEquipmentPromptText(quizData.equipment) : '';
        
        // Build Fridge Mode mapped prompt (Prompt 1)
        const creativeGuidance = getCreativeGuidanceBlock();
        
        enhancedPrompt = `You are an elite private chef.

Based on the user's available ingredients and preferences, suggest 5 exciting recipe ideas.
Each idea should include a recipe title and one short sentence describing what makes it delicious or unique.

Ingredients the user has in their fridge: ${quizData.ingredients || 'Various ingredients'}

${moodText}

${ambitionText}

${dietaryText}

${timeText}

${equipmentText}

${creativeGuidance}

Ensure the 5 ideas are meaningfully distinct from each other in ingredients, style, or technique.
Avoid repeating the same ingredient combinations across recipes.
You may assume common pantry items are available, including oils, seasonings, dried herbs and spices, flour, stock cubes, tinned tomatoes, beans, tuna, sweetcorn, pasta, rice, and similar cupboard staples.

Only return 5 distinct recipe ideas in the format:
- [Recipe Title]: [One-line description]

Do not include ingredients or instructions yet.

Return a JSON object with this exact structure:
{
  "recipes": [
    {
      "title": "Recipe Name", 
      "description": "Brief appealing description in one sentence"
    }
  ]
}`;
      } else {
        // Fallback to existing enhanced prompt for other modes
        const budgetGuidance = quizData.budget ? getBudgetPromptText(quizData.budget) : '';
        const moodGuidance = (quizData.mood || quizData.vibe) ? getMoodPromptText(quizData.mood || quizData.vibe) : '';
        const ambitionGuidance = quizData.ambition ? getAmbitionPromptText(quizData.ambition) : '';
        const timeGuidance = quizData.time ? getTimePromptText(quizData.time) : '';
        const dietaryGuidance = quizData.dietary ? getDietPromptText(quizData.dietary) : '';
        const equipmentGuidance = quizData.equipment ? getEquipmentPromptText(quizData.equipment) : '';
        
        enhancedPrompt = `Generate exactly 6 diverse recipe suggestions based on these preferences:

Mode: ${mode}
Quiz Data: ${JSON.stringify(quizData)}

${moodGuidance}

${ambitionGuidance}

${timeGuidance}

${budgetGuidance}

${dietaryGuidance}

${equipmentGuidance}

Return a JSON object with this exact structure:
{
  "recipes": [
    {
      "title": "Recipe Name",
      "description": "Brief appealing description in one sentence"
    }
  ]
}

Make each recipe unique and appealing. Focus on variety in cooking styles, flavors, and techniques. Ensure all suggestions align with the specified mood, ambition level, time constraints, and budget constraints.`;
      }

      console.log("Making OpenAI API call with prompt length:", enhancedPrompt.length);
      
      // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: enhancedPrompt }],
        response_format: { type: "json_object" },
      });

      console.log("OpenAI API response received successfully");
      const result = JSON.parse(response.choices[0].message.content!);
      res.json({ ideas: result.recipes || [] });
    } catch (error: any) {
      console.error("Recipe ideas generation error details:", {
        message: error.message,
        status: error.status,
        type: error.type,
        code: error.code
      });
      res.status(500).json({ message: "Failed to generate recipe ideas: " + error.message });
    }
  });

  app.post("/api/generate-full-recipe", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session!.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Check usage limits for non-Plus users (bypass in development)
      const isDevelopment = process.env.NODE_ENV === 'development';
      if (!isDevelopment && !user.isPlus && user.recipesThisMonth >= 5) {
        return res.status(403).json({ message: "Recipe limit reached. Upgrade to Flavr+ for unlimited access." });
      }

      const { selectedRecipe, mode, quizData, prompt } = req.body;

      // Build mapped prompt for Shopping Mode (Prompt 2 - Final Recipe Builder)
      let enhancedPrompt;
      
      if (mode === 'shopping') {
        // Get mapped guidance text for Shopping Mode
        const moodText = (quizData.mood || quizData.vibe) ? getMoodPromptText(quizData.mood || quizData.vibe) : '';
        const ambitionText = quizData.ambition ? getAmbitionPromptText(quizData.ambition) : '';
        const dietaryText = quizData.dietary ? getDietPromptText(quizData.dietary) : '';
        const budgetText = quizData.budget ? getBudgetPromptText(quizData.budget) : '';
        const timeText = quizData.time ? getTimePromptText(quizData.time) : '';
        const equipmentText = quizData.equipment ? getEquipmentPromptText(quizData.equipment) : '';
        
        // Build Shopping Mode mapped prompt (Prompt 2)
        const creativeGuidance = getCreativeGuidanceBlock();
        
        enhancedPrompt = `You are an elite private chef.

Based on the user's preferences and selected idea, generate the full recipe for:

**${selectedRecipe.title}**

${moodText}

${ambitionText}

${dietaryText}

${budgetText}

Cuisine preference: ${quizData.cuisine || 'Any cuisine'}

${timeText}

${equipmentText}

Ingredients: ${quizData.ingredients || 'Use suitable ingredients'}

Servings: ${quizData.servings || '4 servings'}

${creativeGuidance}

Please return:
- Title
- Ingredient list with quantities
- Step-by-step instructions

Write instructions in a friendly tone, with helpful technique notes.
Ensure the recipe fully respects the constraints and uses realistic supermarket pricing (GBP).
Use clear quantities, supermarket-friendly items, and include any helpful substitutions or prep notes.

Return a JSON object with this exact structure:
{
  "title": "${selectedRecipe.title}",
  "description": "${selectedRecipe.description}",
  "ingredients": ["ingredient 1", "ingredient 2", "etc"],
  "instructions": ["step 1", "step 2", "etc"],
  "cookTime": 30,
  "servings": 4,
  "difficulty": "Medium",
  "cuisine": "cuisine type",
  "tips": "helpful cooking tips"
}`;
      } else if (mode === 'fridge') {
        // Get mapped guidance text for Fridge Mode (omit budget and cuisine)
        const moodText = (quizData.mood || quizData.vibe) ? getMoodPromptText(quizData.mood || quizData.vibe) : '';
        const ambitionText = quizData.ambition ? getAmbitionPromptText(quizData.ambition) : '';
        const dietaryText = quizData.dietary ? getDietPromptText(quizData.dietary) : '';
        const timeText = quizData.time ? getTimePromptText(quizData.time) : '';
        const equipmentText = quizData.equipment ? getEquipmentPromptText(quizData.equipment) : '';
        
        // Build Fridge Mode mapped prompt (Prompt 2)
        const creativeGuidance = getCreativeGuidanceBlock();
        
        enhancedPrompt = `You are an elite private chef.

Based on the user's selected idea and quiz preferences, generate the complete recipe for:

**${selectedRecipe.title}**

${moodText}

${ambitionText}

${dietaryText}

${timeText}

${equipmentText}

Ingredients available: ${quizData.ingredients || 'Various ingredients'}

Servings: ${quizData.servings || '4 servings'}

${creativeGuidance}

Prioritise using all or most of the user's provided ingredients.
Do not use any ingredients not listed unless they are common pantry items. You may assume common pantry items are available, including oils, seasonings, dried herbs and spices, flour, stock cubes, tinned tomatoes, beans, tuna, sweetcorn, pasta, rice, and similar cupboard staples.

Please return:
- Title
- Ingredient list (with estimated quantities based on what's in the fridge)
- Step-by-step instructions

Use a friendly, helpful tone. Ensure the recipe is flavour-rich, realistic, uses pantry basics, and only what the user has available.
Avoid unnecessary complexity or ingredients requiring unavailable equipment.

Return a JSON object with this exact structure:
{
  "title": "${selectedRecipe.title}",
  "description": "${selectedRecipe.description}",
  "ingredients": ["ingredient 1", "ingredient 2", "etc"],
  "instructions": ["step 1", "step 2", "etc"],
  "cookTime": 30,
  "servings": 4,
  "difficulty": "Medium",
  "cuisine": "cuisine type",
  "tips": "helpful cooking tips"
}`;
      } else if (mode === 'chef') {
        // Get mapped guidance text for Chef Assist Mode (omit budget and cuisine)
        const moodText = (quizData.mood || quizData.vibe) ? getMoodPromptText(quizData.mood || quizData.vibe) : '';
        const ambitionText = quizData.ambition ? getAmbitionPromptText(quizData.ambition) : '';
        const dietaryText = quizData.dietary ? getDietPromptText(quizData.dietary) : '';
        const timeText = quizData.time ? getTimePromptText(quizData.time) : '';
        const equipmentText = quizData.equipment ? getEquipmentPromptText(quizData.equipment) : '';
        
        // Build Chef Assist Mode mapped prompt (Prompt 2 only)
        enhancedPrompt = `You are an elite private chef.

Based on the user's intent and quiz preferences, generate a detailed, flavour-rich recipe for:

**${selectedRecipe.title}**

${moodText}

${ambitionText}

${dietaryText}

${timeText}

${equipmentText}

Please return:
- Title
- Ingredient list (with specific quantities)
- Step-by-step instructions

Use a confident and friendly tone. The recipe should feel tailored, aspirational, and achievable.
Always prioritise maximising flavour to the highest possible level while respecting the user's time, skill level, and equipment.

Avoid unnecessary complexity or inaccessible ingredients unless clearly aligned with ambition level and user skill.

Return a JSON object with this exact structure:
{
  "title": "${selectedRecipe.title}",
  "description": "${selectedRecipe.description}",
  "ingredients": ["ingredient 1", "ingredient 2", "etc"],
  "instructions": ["step 1", "step 2", "etc"],
  "cookTime": 30,
  "servings": 4,
  "difficulty": "Medium",
  "cuisine": "cuisine type",
  "tips": "helpful cooking tips"
}`;
      } else {
        // Fallback to existing enhanced prompt for other modes
        const budgetGuidance = quizData.budget ? getBudgetPromptText(quizData.budget) : '';
        const moodGuidance = (quizData.mood || quizData.vibe) ? getMoodPromptText(quizData.mood || quizData.vibe) : '';
        const ambitionGuidance = quizData.ambition ? getAmbitionPromptText(quizData.ambition) : '';
        const timeGuidance = quizData.time ? getTimePromptText(quizData.time) : '';
        const dietaryGuidance = quizData.dietary ? getDietPromptText(quizData.dietary) : '';
        const equipmentGuidance = quizData.equipment ? getEquipmentPromptText(quizData.equipment) : '';
        
        enhancedPrompt = `Generate a complete, detailed recipe for "${selectedRecipe.title}" based on these preferences:

Mode: ${mode}
Quiz Data: ${JSON.stringify(quizData)}
Recipe Description: ${selectedRecipe.description}

${moodGuidance}

${ambitionGuidance}

${timeGuidance}

${budgetGuidance}

${dietaryGuidance}

${equipmentGuidance}

Return a JSON object with this exact structure:
{
  "title": "${selectedRecipe.title}",
  "description": "${selectedRecipe.description}",
  "ingredients": ["ingredient 1", "ingredient 2", "etc"],
  "instructions": ["step 1", "step 2", "etc"],
  "cookTime": 30,
  "servings": 4,
  "difficulty": "Medium",
  "cuisine": "cuisine type",
  "tips": "helpful cooking tips"
}

Make the ingredients specific with quantities and the instructions detailed and clear. Ensure all ingredient selections and quantities align with the specified mood, ambition level, time constraints, and budget constraints.`;
      }

      // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: enhancedPrompt }],
        response_format: { type: "json_object" },
      });

      const fullRecipe = JSON.parse(response.choices[0].message.content!);

      // Generate image if user has remaining credits
      let imageUrl = null;
      if (user.isPlus || user.imagesThisMonth < 5) {
        try {
          const imageResponse = await openai.images.generate({
            model: "dall-e-3",
            prompt: `A beautiful, appetizing photo of ${fullRecipe.title}, professional food photography, high quality`,
            n: 1,
            size: "1024x1024",
            quality: "standard",
          });
          imageUrl = imageResponse.data[0].url;
          
          // Update image usage
          if (!user.isPlus) {
            await storage.updateUserUsage(user.id, 0, 1);
          }
        } catch (imageError) {
          console.error("Failed to generate image:", imageError);
        }
      }

      // Save recipe to database
      const recipe = await storage.createRecipe({
        userId: user.id,
        title: fullRecipe.title,
        description: fullRecipe.description,
        cookTime: fullRecipe.cookTime,
        servings: fullRecipe.servings,
        difficulty: fullRecipe.difficulty,
        cuisine: quizData.cuisine,
        mood: quizData.mood,
        mode,
        ingredients: fullRecipe.ingredients,
        instructions: fullRecipe.instructions,
        tips: fullRecipe.tips,
        imageUrl,
        shoppingList: fullRecipe.shoppingList,
        originalPrompt: prompt,
      });

      // Update recipe usage for non-Plus users
      if (!user.isPlus) {
        await storage.updateUserUsage(user.id, 1, 0);
      }

      res.json({ recipe });
    } catch (error: any) {
      res.status(500).json({ message: "Failed to generate full recipe: " + error.message });
    }
  });

  // Enhanced Chat routes with recipe context
  app.post("/api/chat", requireAuth, async (req, res) => {
    try {
      const { message, currentRecipe, mode } = req.body;
      const userId = req.session!.userId;

      // Build context-aware system prompt
      let systemPrompt = "You are a friendly, creative private chef who helps users adjust, enhance, and understand their AI-generated recipes. Provide cooking advice, substitutions, and modifications. Keep responses concise and practical.";
      
      if (mode) {
        const modeContext = {
          shopping: "The user is in shopping mode, planning meals and creating shopping lists.",
          fridge: "The user is in fridge-to-fork mode, working with ingredients they already have.",
          chef: "The user is in chef assist mode, looking for expert culinary guidance."
        };
        systemPrompt += ` ${modeContext[mode as keyof typeof modeContext] || ''}`;
      }

      if (currentRecipe) {
        systemPrompt += ` The user is currently working with this recipe: "${currentRecipe.title}". Ingredients: ${currentRecipe.ingredients?.join(', ')}. Instructions: ${currentRecipe.instructions?.join(' ')}`;
      }

      // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: systemPrompt
          },
          { role: "user", content: message }
        ],
        response_format: { type: "json_object" },
      });

      const aiResponse = JSON.parse(response.choices[0].message.content!);
      const botResponse = aiResponse.response || response.choices[0].message.content!;
      
      // Check if AI provided an updated recipe
      let updatedRecipe = null;
      if (aiResponse.updatedRecipe && currentRecipe) {
        updatedRecipe = {
          ...currentRecipe,
          ...aiResponse.updatedRecipe
        };
      }
      
      // Save chat message
      await storage.createChatMessage({
        userId,
        message,
        response: botResponse,
      });

      res.json({ 
        response: botResponse,
        updatedRecipe
      });
    } catch (error: any) {
      res.status(500).json({ message: "Failed to process chat: " + error.message });
    }
  });

  app.get("/api/chat/history", requireAuth, async (req, res) => {
    try {
      const userId = req.session!.userId;
      const history = await storage.getChatHistory(userId, 20);
      res.json({ history });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Recipe routes
  app.get("/api/recipes", requireAuth, async (req, res) => {
    try {
      const userId = req.session!.userId;
      const recipes = await storage.getRecipesByUser(userId);
      res.json({ recipes });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/recipes/:id", requireAuth, async (req, res) => {
    try {
      const recipe = await storage.getRecipe(parseInt(req.params.id));
      if (!recipe) {
        return res.status(404).json({ message: "Recipe not found" });
      }
      if (recipe.userId !== req.session!.userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      res.json({ recipe });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Stripe subscription routes
  app.post('/api/create-subscription', requireAuth, async (req, res) => {
    try {
      const userId = req.session!.userId;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      if (user.stripeSubscriptionId) {
        const subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
        const invoice = await stripe.invoices.retrieve(subscription.latest_invoice as string, {
          expand: ['payment_intent']
        });

        res.json({
          subscriptionId: subscription.id,
          clientSecret: (invoice.payment_intent as any)?.client_secret,
        });
        return;
      }

      if (!user.email) {
        throw new Error('No user email on file');
      }

      let customer;
      if (user.stripeCustomerId) {
        customer = await stripe.customers.retrieve(user.stripeCustomerId);
      } else {
        customer = await stripe.customers.create({
          email: user.email,
          name: user.username,
        });
        await storage.updateUserStripeInfo(user.id, customer.id);
      }

      const subscription = await stripe.subscriptions.create({
        customer: customer.id,
        items: [{
          price: process.env.STRIPE_PRICE_ID || 'price_test', // This needs to be set by user
        }],
        payment_behavior: 'default_incomplete',
        expand: ['latest_invoice.payment_intent'],
      });

      await storage.updateUserStripeInfo(user.id, customer.id, subscription.id);

      const invoice = subscription.latest_invoice as any;
      res.json({
        subscriptionId: subscription.id,
        clientSecret: invoice.payment_intent.client_secret,
      });
    } catch (error: any) {
      res.status(400).json({ error: { message: error.message } });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
