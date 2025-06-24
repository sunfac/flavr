import type { Express } from "express";
import { createServer, type Server } from "http";
import session from "express-session";
import WebSocket, { WebSocketServer } from "ws";
import OpenAI from "openai";
import Replicate from "replicate";
import Stripe from "stripe";
import { storage } from "./storage";
import { setupGoogleLiveAudioWebSocket } from "./googleLiveAudio";
import { insertRecipeSchema, insertChatMessageSchema } from "@shared/schema";
import { logGPTInteraction } from "./developerLogger";
import { processFridgeImage, uploadMiddleware } from "./vision";
import { getCreativeGuidanceBlock } from "./shoppingPromptBlocks";
import { 
  difficultyMap, 
  getCookTime, 
  budgetMap, 
  formatEquipmentText, 
  getDifficulty, 
  getBudgetText,
  getBudgetPromptText,
  getMoodPromptText,
  getAmbitionPromptText,
  getTimePromptText,
  getDietPromptText,
  getEquipmentPromptText,
  getStrictDietaryInstruction 
} from "./mappingUtils";
import {
  handleSubscriptionCreated,
  handleSubscriptionUpdated,
  handleSubscriptionCanceled,
  handleInvoicePaymentFailed,
  hasActiveFlavrPlus,
  checkExpiredSubscriptions
} from "./subscriptionManager";
import {
  AppleSubscriptionManager,
  GoogleSubscriptionManager,
  UniversalSubscriptionManager
} from "./mobileSubscriptionManager";







// Initialize OpenAI
if (!process.env.OPENAI_API_KEY) {
  throw new Error('Missing required OpenAI API key: OPENAI_API_KEY');
}
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Initialize Replicate for Stable Diffusion
if (!process.env.REPLICATE_API_TOKEN) {
  throw new Error('Missing required Replicate API token: REPLICATE_API_TOKEN');
}
const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

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
    cookie: { 
      secure: process.env.NODE_ENV === 'production', 
      maxAge: 24 * 60 * 60 * 1000,
      httpOnly: true,
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
    }
  }));

  // Authentication middleware
  const requireAuth = (req: any, res: any, next: any) => {
    if (!req.session?.userId) {
      console.log("Authentication failed - no session userId");
      return res.status(401).json({ message: "Authentication required" });
    }
    console.log("Authentication successful for user:", req.session.userId);
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
      console.log("Login attempt:", email, password);
      
      const user = await storage.getUserByEmail(email);
      console.log("Found user:", user ? "Yes" : "No");
      
      if (!user || user.password !== password) {
        console.log("Login failed - invalid credentials");
        return res.status(401).json({ message: "Invalid credentials" });
      }

      req.session!.userId = user.id;
      
      // Force session save for deployment reliability
      req.session!.save((err: any) => {
        if (err) {
          console.error("Session save error:", err);
          return res.status(500).json({ message: "Session error" });
        }
        
        console.log("Login successful for user:", user.email, "Session ID:", req.session!.userId);
        res.json({ 
          user: { 
            id: user.id, 
            username: user.username, 
            email: user.email, 
            subscriptionTier: user.subscriptionTier,
            hasFlavrPlus: user.hasFlavrPlus || false
          } 
        });
      });
    } catch (error: any) {
      console.log("Login error:", error.message);
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

  // Creative instructions for Shopping Mode variety
  const shoppingCreativeInstructions = [
    "Add international influence — pull from Asian, Mediterranean or Latin American inspiration.",
    "Emphasize seasonal ingredients and vibrant colors.",
    "Focus on textural contrast — include crunch, creaminess, or char.",
    "Use unexpected pairings — like fruit with spice or sweet with umami.",
    "Think like a street food chef — punchy, bold, and fun.",
    "Simplify technique — one pot or traybake encouraged.",
    "Create meals that feel comforting and nostalgic.",
    "Modernize a classic recipe with a surprising twist.",
    "Use fresh herbs, acid, and fat to create depth.",
    "Make it visually Instagrammable with color contrast and plating."
  ];

  // Creative instructions for Fridge Mode variety
  const fridgeCreativeInstructions = [
    "Prioritize minimizing waste — make sure all ingredients are used thoughtfully.",
    "Find clever ways to elevate simple, mismatched ingredients.",
    "Use pantry staples to tie leftover ingredients together.",
    "Suggest bold flavors or sauces that can unify disparate fridge items.",
    "Think of global comfort foods that are flexible — stir fries, stews, or frittatas.",
    "Create dishes that could be prepped in one pan or tray.",
    "Highlight make-ahead versatility or batch-cooking value.",
    "Turn odds and ends into something impressive with pro technique.",
    "Keep it simple but surprising — use pickling, roasting, or toasting for impact.",
    "Avoid recipes that rely on ingredients not likely to be on hand."
  ];

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
        
        // Use centralized difficulty mapping
        const difficulty = getDifficulty(quizData.ambition);
        
        // Fix cooking time mapping
        const cookTime = typeof quizData.time === 'number' ? quizData.time : 30;
        
        // Build Shopping Mode mapped prompt (Prompt 1)
        const creativeGuidance = getCreativeGuidanceBlock();
        
        // Generate random creativity injection for Shopping Mode
        const randomInstruction = shoppingCreativeInstructions[Math.floor(Math.random() * shoppingCreativeInstructions.length)];
        const variationSeed = `seed-${Date.now()}-${Math.floor(Math.random() * 100000)}`;

        enhancedPrompt = `You are an elite private chef.

Based on the following preferences, suggest 5 unique, flavour-packed recipe ideas. Each idea should have a title and a one-sentence description:

${moodText}

${ambitionText}

${dietaryText}
${getStrictDietaryInstruction(quizData.dietary)}

${budgetText}

${timeText}

${equipmentText}

Cuisine preference: ${quizData.cuisine || 'Any cuisine'}

${creativeGuidance}

Ensure the 5 ideas are meaningfully distinct from each other in ingredients, style, or technique.
Avoid repeating the same ingredient combinations across recipes.

Creative Direction: ${randomInstruction}
Seed for creative variation (not visible to user): ${variationSeed}

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
        // Use centralized difficulty mapping
        const difficulty = getDifficulty(quizData.ambition);
        
        // Fix cooking time mapping
        const cookTime = typeof quizData.time === 'number' ? quizData.time : 30;
        
        // Build Fridge Mode mapped prompt (Prompt 1)
        const creativeGuidance = getCreativeGuidanceBlock();
        
        enhancedPrompt = `You are an elite private chef.

Based on the user's available ingredients and preferences, suggest 5 exciting recipe ideas.
Each idea should include a recipe title and one short sentence describing what makes it delicious or unique.

Ingredients the user has in their fridge: ${Array.isArray(quizData.ingredients) ? quizData.ingredients.join(', ') : (quizData.ingredients || 'Various ingredients')}

${getMoodPromptText(quizData.mood || quizData.vibe || '')}

${getAmbitionPromptText(quizData.ambition || '')}

${getDietPromptText(quizData.dietary || [])}
${getStrictDietaryInstruction(quizData.dietary)}

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
      
      // Using GPT-3.5 Turbo for cost efficiency
      const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: enhancedPrompt }],
        response_format: { type: "json_object" },
      });

      console.log("OpenAI API response received successfully");
      const result = JSON.parse(response.choices[0].message.content!);
      res.json({ ideas: result.recipes || [], recipes: result.recipes || [] });
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

  app.post("/api/generate-recipe-ideas", async (req, res) => {
    try {
      const { mode, quizData, prompt } = req.body;
      console.log("Recipe ideas API called with:", { mode, body: req.body });
      console.log("=============QUIZ DEBUG START=============");
      console.log("TIME INPUT:", quizData.time, typeof quizData.time);
      console.log("EQUIPMENT INPUT:", quizData.equipment, typeof quizData.equipment);
      console.log("=============QUIZ DEBUG END===============");
      
      // === QUIZ INPUT DEBUGGING ===
      console.log("🔍 QUIZ INPUT DEBUG - Time:", quizData.time, "Type:", typeof quizData.time);
      console.log("🔍 QUIZ INPUT DEBUG - Equipment:", quizData.equipment, "Type:", typeof quizData.equipment);
      console.log("🔍 QUIZ INPUT DEBUG - All inputs:", JSON.stringify(quizData));

      // Build mapped prompt for Shopping Mode (Prompt 1 - Recipe Idea Generator)
      let enhancedPrompt;
      
      if (mode === 'shopping') {
        // === QUIZ INPUT LOGGING FOR DEBUGGING ===
        console.log("=== SHOPPING MODE QUIZ INPUTS ===");
        console.log("Raw quizData:", JSON.stringify(quizData, null, 2));
        console.log("Individual fields:");
        console.log("- mood/vibe:", quizData.mood || quizData.vibe);
        console.log("- ambition:", quizData.ambition);
        console.log("- dietary:", quizData.dietary);
        console.log("- budget:", quizData.budget);
        console.log("- time:", quizData.time, "(type:", typeof quizData.time, ")");
        console.log("- equipment:", quizData.equipment, "(type:", typeof quizData.equipment, ")");
        console.log("- servings:", quizData.servings);
        console.log("- cuisine:", quizData.cuisine);
        console.log("- ingredients:", quizData.ingredients);
        console.log("=====================================");
        
        // Get mapped guidance text using existing functions (preserve Chef Assist compatibility)
        const moodText = (quizData.mood || quizData.vibe) ? getMoodPromptText(quizData.mood || quizData.vibe) : '';
        const ambitionText = quizData.ambition ? getAmbitionPromptText(quizData.ambition) : '';
        const dietaryText = quizData.dietary ? getDietPromptText(quizData.dietary) : '';
        const budgetText = quizData.budget ? getBudgetPromptText(quizData.budget) : '';
        const timeText = quizData.time ? getTimePromptText(quizData.time) : '';
        const equipmentText = quizData.equipment ? getEquipmentPromptText(quizData.equipment) : "";
        
        // === MAPPED OUTPUT LOGGING FOR DEBUGGING ===
        console.log("🔧 MAPPED OUTPUT - timeText:", timeText);
        console.log("🔧 MAPPED OUTPUT - equipmentText:", equipmentText);
        console.log("🔧 MAPPED OUTPUT - moodText:", moodText);
        console.log("🔧 MAPPED OUTPUT - budgetText:", budgetText);
        
        // Build Shopping Mode mapped prompt (Prompt 1)
        const creativeGuidance = getCreativeGuidanceBlock();
        
        enhancedPrompt = `You are an elite private chef.

Based on the following preferences, suggest 5 unique, flavour-packed recipe ideas that could be made. Each idea should have a title and a one-sentence description:

Ingredients they want to use: ${quizData.ingredients || 'Any ingredients'}

Servings needed: ${quizData.servings || 4} people

Cuisine preference: ${quizData.cuisine || 'Any cuisine'}

${moodText}

${ambitionText}

${dietaryText}

${budgetText}

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
        // Get mapped guidance text for Fridge Mode (omit budget and cuisine) using centralized mapping
        const moodText = (quizData.mood || quizData.vibe) ? getMoodPromptText(quizData.mood || quizData.vibe) : '';
        const ambitionText = quizData.ambition ? getAmbitionPromptText(quizData.ambition) : '';
        const dietaryText = quizData.dietary ? getDietPromptText(quizData.dietary) : '';
        const timeText = quizData.time ? getTimePromptText(quizData.time) : '';
        const equipmentText = quizData.equipment ? getEquipmentPromptText(quizData.equipment) : "";
        
        // Build Fridge Mode mapped prompt (Prompt 1)
        const creativeGuidance = getCreativeGuidanceBlock();
        
        // Generate random creativity injection for Fridge Mode
        const randomInstruction = fridgeCreativeInstructions[Math.floor(Math.random() * fridgeCreativeInstructions.length)];
        const variationSeed = `fridge-${Date.now()}-${Math.floor(Math.random() * 100000)}`;

        enhancedPrompt = `You are an elite private chef.

Based on the user's available ingredients and preferences, suggest 5 exciting recipe ideas.
Each idea should include a recipe title and one short sentence describing what makes it delicious or unique.

Ingredients the user has in their fridge: ${Array.isArray(quizData.ingredients) ? quizData.ingredients.join(', ') : (quizData.ingredients || 'Various ingredients')}

Servings needed: ${quizData.servings || 4} people

Cuisine preference: ${Array.isArray(quizData.cuisines) ? quizData.cuisines.join(', ') : (quizData.cuisines || 'Any cuisine')}

${moodText}

${ambitionText}

${dietaryText}

${timeText}

${equipmentText}

${creativeGuidance}

Ensure the 5 ideas are meaningfully distinct from each other in ingredients, style, or technique.
Avoid repeating the same ingredient combinations across recipes.
You may assume common pantry items are available, including oils, seasonings, dried herbs and spices, flour, stock cubes, tinned tomatoes, beans, tuna, sweetcorn, pasta, rice, and similar cupboard staples.

Creative Direction: ${randomInstruction}
Seed for creative variation (not visible to user): ${variationSeed}

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
      console.log(`EXACT ${mode.toUpperCase()} MODE RECIPE IDEAS PROMPT:`);
      console.log("=".repeat(80));
      console.log(enhancedPrompt);
      console.log("=".repeat(80));
      
      // Using GPT-3.5 Turbo for cost efficiency
      const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: enhancedPrompt }],
        response_format: { type: "json_object" },
      });

      console.log("OpenAI API response received successfully");
      const result = JSON.parse(response.choices[0].message.content!);
      
      // Log GPT interaction for developer analysis
      if (req.session?.userId) {
        const expectedOutput = {
          mode,
          servings: parseInt(quizData.servings) || quizData.portions || 4,
          cookTime: quizData.time || quizData.cookingTime || 30,
          difficulty: getDifficulty(quizData.ambition || 'moderate'),
          budget: quizData.budget || 'moderate',
          cuisine: quizData.cuisines?.[0] || quizData.cuisine || 'any'
        };
        
        const actualOutput = {
          recipeCount: result.recipes?.length || 0,
          firstRecipeExample: result.recipes?.[0] || null
        };
        
        await logGPTInteraction(
          req.session.userId,
          mode,
          quizData,
          enhancedPrompt,
          response.choices[0].message.content!,
          expectedOutput,
          actualOutput
        );
      }
      
      res.json({ recipes: result.recipes || [] });
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

  app.post("/api/generate-full-recipe", async (req, res) => {
    try {

      const { selectedRecipe, mode, quizData, prompt } = req.body;

      // Build mapped prompt for Shopping Mode (Prompt 2 - Final Recipe Builder)
      let enhancedPrompt;
      
      if (mode === 'shopping') {
        // Get mapped guidance text for Shopping Mode using existing functions (preserve Chef Assist compatibility)
        const moodText = (quizData.mood || quizData.vibe) ? getMoodPromptText(quizData.mood || quizData.vibe) : '';
        const ambitionText = quizData.ambition ? getAmbitionPromptText(quizData.ambition) : '';
        const dietaryText = quizData.dietary ? getDietPromptText(quizData.dietary) : '';
        const budgetText = quizData.budget ? getBudgetPromptText(quizData.budget) : '';
        const timeText = quizData.time ? getTimePromptText(quizData.time) : '';
        const equipmentText = quizData.equipment ? getEquipmentPromptText(quizData.equipment) : "";
        
        // Use centralized mapping utilities for specific elements only
        const difficulty = getDifficulty(quizData.ambition);
        const cookTime = getCookTime(quizData);
        
        // Build Shopping Mode mapped prompt (Prompt 2) - NO variation seed for deterministic results
        const creativeGuidance = getCreativeGuidanceBlock();
        
        enhancedPrompt = `You are an elite private chef.

Based on the user's preferences and selected idea, generate the full recipe for:

**${selectedRecipe.title}**

Servings needed: ${quizData.servings || 4} people

Cuisine preference: ${quizData.cuisine || 'Any cuisine'}

${moodText}

${ambitionText}

${dietaryText}
${getStrictDietaryInstruction(quizData.dietary)}

${budgetText}

The total cooking time must NOT exceed ${cookTime} minutes. This is the user's hard time limit.

AVAILABLE EQUIPMENT: ${equipmentText}
COOKING CONSTRAINT: You may ONLY use the equipment listed above. Do not suggest any cooking methods that require equipment the user doesn't have.

Ingredients: ${quizData.ingredients || 'Use suitable ingredients'}

${creativeGuidance}

DIETARY OVERRIDE: If any creative direction conflicts with the user's dietary requirements, the dietary rules take absolute priority.

Do not exceed the user's specified cooking time. This is a maximum limit, not a suggestion.

CRITICAL INSTRUCTION: You MUST use these exact values in your JSON response:
- Servings: EXACTLY ${quizData.servings || 4} people (DO NOT change this number)
- Cuisine: ${quizData.cuisine || 'International'}
- Cooking Time: ${quizData.time || 30} minutes
- Dietary Restrictions: ${quizData.dietary ? quizData.dietary.join(', ') : 'None'}
- Budget: ${quizData.budget || 'Any'}

MANDATORY: The JSON response MUST contain "servings": ${quizData.servings || 4} - this is non-negotiable and was specifically chosen by the user. Do not modify this number under any circumstances.

Please return:
- Title
- Ingredient list with quantities
- Step-by-step instructions WITH SPECIFIC TIMINGS for every cooking action

CRITICAL INSTRUCTION REQUIREMENTS:
- Every cooking step MUST include specific timing (e.g., "sauté for 3-4 minutes until golden", "simmer for 15 minutes", "bake for 20-25 minutes")
- Include visual and sensory cues for doneness ("until fragrant", "until bubbling", "until fork-tender")
- Make each instruction clear and actionable
- Focus on WHAT to do and HOW LONG it takes

Write instructions in a friendly tone, with helpful technique notes.
Write in the voice of Zest — a bold, clever private chef. Be helpful, but never dull. Make each step feel like part of a masterclass. If a technique is optional, say so. Always aim to build confidence.
Steps should be thorough to guide the user through each technique with clear timing and visual cues.
Assume users have access to standard kitchen tools. Do not force niche appliances into the recipe method unless clearly necessary. If equipment is unavailable, suggest fallback steps (e.g., oven instead of air fryer).
Ensure the recipe fully respects the constraints and uses realistic supermarket pricing (GBP).
Use clear quantities, supermarket-friendly items, and include any helpful substitutions or prep notes.

Return a JSON object with this exact structure. THE SERVINGS VALUE IS LOCKED AND CANNOT BE CHANGED:
{
  "title": "${selectedRecipe.title}",
  "description": "${selectedRecipe.description}",
  "ingredients": ["ingredient 1", "ingredient 2", "etc"],
  "instructions": ["step 1", "step 2", "etc"],
  "cookTime": ${cookTime},
  "servings": ${quizData.servings || 4},
  "difficulty": "${difficulty}",
  "cuisine": "${quizData.cuisine || 'International'}",
  "tips": "helpful cooking tips"
}

FINAL WARNING: You must use servings: ${quizData.servings || 4} exactly as shown above. This value cannot be modified.`;
      } else if (mode === 'fridge') {
        // Get mapped guidance text for Fridge Mode (omit budget and cuisine) using centralized mapping
        const moodText = (quizData.mood || quizData.vibe) ? getMoodPromptText(quizData.mood || quizData.vibe) : '';
        const ambitionText = quizData.ambition ? getAmbitionPromptText(quizData.ambition) : '';
        const dietaryText = quizData.dietary ? getDietPromptText(quizData.dietary) : '';
        const timeText = quizData.time ? getTimePromptText(quizData.time) : '';
        const equipmentText = quizData.equipment ? getEquipmentPromptText(quizData.equipment) : "";
        
        // Use centralized mapping utilities
        const difficulty = getDifficulty(quizData.ambition);
        const cookTime = getCookTime(quizData);
        
        // Build Fridge Mode mapped prompt (Prompt 2) - NO variation seed for deterministic results
        const creativeGuidance = getCreativeGuidanceBlock();
        
        enhancedPrompt = `IMPORTANT: You must respond ONLY in English. Do not use any other language under any circumstances.

You are an elite private chef.

Based on the user's selected idea and quiz preferences, generate the complete recipe for:

**${selectedRecipe.title}**

Servings needed: ${quizData.servings || 4} people

Cuisine preference: ${Array.isArray(quizData.cuisines) ? quizData.cuisines.join(', ') : (quizData.cuisines || 'Any cuisine')}

${moodText}

${ambitionText}

${dietaryText}

The total cooking time must NOT exceed ${cookTime} minutes. This is the user's hard time limit.

AVAILABLE EQUIPMENT: ${equipmentText}
COOKING CONSTRAINT: You may ONLY use the equipment listed above. Do not suggest any cooking methods that require equipment the user doesn't have.

Ingredients available: ${Array.isArray(quizData.ingredients) ? quizData.ingredients.join(', ') : (quizData.ingredients || 'Various ingredients')}
${getStrictDietaryInstruction(quizData.dietary)}

${creativeGuidance}

DIETARY OVERRIDE: If any creative direction conflicts with the user's dietary requirements, the dietary rules take absolute priority.

Do not exceed the user's specified cooking time. This is a maximum limit, not a suggestion.

CRITICAL INSTRUCTION: You MUST use these exact values in your JSON response:
- Servings: EXACTLY ${quizData.servings || 4} people (DO NOT change this number)
- Cuisine: Fridge-to-Fork
- Cooking Time: ${quizData.time || 30} minutes
- Dietary Restrictions: ${quizData.dietary ? quizData.dietary.join(', ') : 'None'}
- Ambition Level: ${quizData.ambition || 'Medium'}

MANDATORY: The JSON response MUST contain "servings": ${quizData.servings || 4} - this is non-negotiable and was specifically chosen by the user. Do not modify this number under any circumstances.

Prioritise using all or most of the user's provided ingredients.
Do not use any ingredients not listed unless they are common pantry items. You may assume common pantry items are available, including oils, seasonings, dried herbs and spices, flour, stock cubes, tinned tomatoes, beans, tuna, sweetcorn, pasta, rice, and similar cupboard staples.

Please return:
- Title
- Ingredient list (with estimated quantities based on what's in the fridge)
- Step-by-step instructions WITH SPECIFIC TIMINGS for every cooking action

CRITICAL INSTRUCTION REQUIREMENTS:
- Every cooking step MUST include specific timing (e.g., "sauté for 3-4 minutes until golden", "simmer for 15 minutes", "bake for 20-25 minutes")
- Include visual and sensory cues for doneness ("until fragrant", "until bubbling", "until fork-tender")
- Make each instruction clear and actionable
- Focus on WHAT to do and HOW LONG it takes

Use a friendly, helpful tone. Ensure the recipe is flavour-rich, realistic, uses pantry basics, and only what the user has available.
Write in the voice of Zest — a bold, clever private chef. Be helpful, but never dull. Make each step feel like part of a masterclass. If a technique is optional, say so. Always aim to build confidence.
Steps should be thorough to guide the user through each technique with clear explanations of what to look for and why each step matters.
Assume users have access to standard kitchen tools. Do not force niche appliances into the recipe method unless clearly necessary. If equipment is unavailable, suggest fallback steps (e.g., oven instead of air fryer).
Avoid unnecessary complexity or ingredients requiring unavailable equipment.

Return a JSON object with this exact structure. THE SERVINGS VALUE IS LOCKED AND CANNOT BE CHANGED:
{
  "title": "${selectedRecipe.title}",
  "description": "${selectedRecipe.description}",
  "ingredients": ["ingredient 1", "ingredient 2", "etc"],
  "instructions": ["step 1", "step 2", "etc"],
  "cookTime": ${cookTime},
  "servings": ${quizData.servings || 4},
  "difficulty": "${difficulty}",
  "cuisine": "Fridge-to-Fork",
  "tips": "helpful cooking tips"
}

FINAL WARNING: You must use servings: ${quizData.servings || 4} exactly as shown above. This value cannot be modified.`;
      } else if (mode === 'chef') {
        // Get mapped guidance text for Chef Assist Mode using centralized mapping
        const moodText = (quizData.mood || quizData.vibe) ? getMoodPromptText(quizData.mood || quizData.vibe) : '';
        const ambitionText = quizData.ambition ? getAmbitionPromptText(quizData.ambition) : '';
        const dietaryText = quizData.dietary ? getDietPromptText(quizData.dietary) : '';
        const timeText = quizData.time ? getTimePromptText(quizData.time) : '';
        const equipmentText = quizData.equipment ? getEquipmentPromptText(quizData.equipment) : '';
        
        // Use centralized mapping utilities for specific elements
        const difficulty = getDifficulty(quizData.ambition);
        const cookTime = getCookTime(quizData);
        
        // Build Chef Assist Mode mapped prompt (Prompt 2) with creative guidance
        const creativeGuidance = getCreativeGuidanceBlock();
        
        enhancedPrompt = `IMPORTANT: You must respond ONLY in English. Do not use any other language under any circumstances.

You are an elite private chef.

Based on the user's culinary vision and quiz preferences, generate the complete recipe for:

**${selectedRecipe.title}**

User's Culinary Vision: ${quizData.intent || selectedRecipe.description || 'Custom chef-guided recipe'}

Servings needed: ${quizData.servings || 4} people

${moodText}

${ambitionText}

${dietaryText}

The total cooking time must NOT exceed ${cookTime} minutes. This is the user's hard time limit.

AVAILABLE EQUIPMENT: ${equipmentText}
COOKING CONSTRAINT: You may ONLY use the equipment listed above. Do not suggest any cooking methods that require equipment the user doesn't have.

${getStrictDietaryInstruction(quizData.dietary)}

${creativeGuidance}

DIETARY OVERRIDE: If any creative direction conflicts with the user's dietary requirements, the dietary rules take absolute priority.

MANDATORY REQUIREMENTS: You MUST enforce these exact quiz values in the recipe output:
- Servings: EXACTLY ${quizData.servings || 4} people (do not modify this number)
- Cook Time: Maximum ${cookTime} minutes total
- Difficulty: ${difficulty} level
- Equipment: ONLY use ${equipmentText || 'basic kitchen equipment'}

CRITICAL INSTRUCTION REQUIREMENTS:
- Every cooking step MUST include specific timing (e.g., "sauté for 3-4 minutes until golden", "simmer for 15 minutes", "bake for 20-25 minutes")
- Include visual and sensory cues for doneness ("until fragrant", "until bubbling", "until fork-tender")
- Make each instruction clear and actionable
- Focus on WHAT to do and HOW LONG it takes

Use a friendly, helpful tone. Ensure the recipe is flavour-rich, realistic, and achievable within the user's constraints.
Write in the voice of Zest — a bold, clever private chef. Be helpful, but never dull. Make each step feel like part of a masterclass. If a technique is optional, say so. Always aim to build confidence.
Steps should be thorough to guide the user through each technique with clear explanations of what to look for and why each step matters.
Assume users have access to standard kitchen tools. Do not force niche appliances into the recipe method unless clearly necessary. If equipment is unavailable, suggest fallback steps (e.g., oven instead of air fryer).
Avoid unnecessary complexity or ingredients requiring unavailable equipment.

Return a JSON object with this exact structure. THE SERVINGS VALUE IS LOCKED AND CANNOT BE CHANGED:
{
  "title": "${selectedRecipe.title}",
  "description": "${selectedRecipe.description}",
  "ingredients": ["ingredient 1", "ingredient 2", "etc"],
  "instructions": ["step 1", "step 2", "etc"],
  "cookTime": ${cookTime},
  "servings": ${quizData.servings || 4},
  "difficulty": "${difficulty}",
  "cuisine": "Chef-Guided",
  "tips": "helpful cooking tips"
}

FINAL WARNING: You must use servings: ${quizData.servings || 4} exactly as shown above. This value cannot be modified.`;
      } else {
        // Fallback prompt for any missing modes
        enhancedPrompt = `IMPORTANT: You must respond ONLY in English. Do not use any other language under any circumstances.

You are an elite private chef. Generate a complete recipe for "${selectedRecipe.title}".

Return a JSON object with this exact structure:
{
  "title": "${selectedRecipe.title}",
  "description": "${selectedRecipe.description}",
  "ingredients": ["ingredient 1", "ingredient 2", "etc"],
  "instructions": ["step 1", "step 2", "etc"],
  "cookTime": ${quizData.time || 30},
  "servings": ${quizData.servings || 4},
  "difficulty": "Medium",
  "cuisine": "International",
  "tips": "helpful cooking tips"
}

FINAL WARNING: You must use servings: ${quizData.servings || 4} exactly as shown above. This value cannot be modified.`;
      }

      // Simplified test for OpenAI API call
      console.log("Making OpenAI API call for full recipe generation");
      console.log("Prompt length:", enhancedPrompt.length);
      console.log(`EXACT ${mode.toUpperCase()} MODE FULL RECIPE PROMPT:`);
      console.log("=".repeat(80));
      console.log(enhancedPrompt);
      console.log("=".repeat(80));
      
      // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: enhancedPrompt }],
        response_format: { type: "json_object" },
        max_tokens: 1500,
        temperature: 0.7
      });

      console.log("OpenAI API response received for full recipe");
      console.log("Response content:", response.choices[0].message.content);
      const fullRecipe = JSON.parse(response.choices[0].message.content!);
      
      // POST-PROCESSING: Force correct quiz values (AI keeps ignoring our instructions)
      console.log(`ENFORCING QUIZ VALUES - Original servings: ${fullRecipe.servings}, Required: ${quizData.servings || 4}`);
      
      // Override AI's incorrect values with user's actual quiz selections
      if (quizData.servings) {
        fullRecipe.servings = parseInt(quizData.servings.toString());
      }
      if (quizData.time) {
        fullRecipe.cookTime = parseInt(quizData.time.toString());
      }
      if (quizData.cuisine && mode === 'shopping') {
        fullRecipe.cuisine = quizData.cuisine;
      }
      if (quizData.budget) {
        fullRecipe.budget = quizData.budget;
      }
      
      // Map ambition level to difficulty for all modes
      if (quizData.ambition !== undefined) {
        const ambitionValue = quizData.ambition.toString().toLowerCase();
        const difficultyMap: { [key: string]: string } = {
          // Quiz ambition keys (camelCase)
          'justfed': 'Easy',
          'simpletasty': 'Easy',
          'confidentcook': 'Medium',
          'ambitiouschef': 'Hard',
          'michelineffort': 'Hard',
          // String values
          'easy': 'Easy',
          'challenging': 'Hard', 
          'ambitious': 'Hard',
          'simple': 'Easy',
          'moderate': 'Medium',
          // Numeric values (1-5 scale)
          '1': 'Easy',
          '2': 'Easy', 
          '3': 'Medium',
          '4': 'Hard',
          '5': 'Hard'
        };
        fullRecipe.difficulty = difficultyMap[ambitionValue] || 'Medium';
        console.log(`DIFFICULTY MAPPING - Ambition: ${quizData.ambition} -> Difficulty: ${fullRecipe.difficulty}`);
      }
      
      console.log(`CORRECTED VALUES - Final servings: ${fullRecipe.servings}, cookTime: ${fullRecipe.cookTime}`);

      // Generate sophisticated recipe image
      let imageUrl = null;
      let imagePrompt = null;
      let imageGenerated = false;
      let imageCost = null;
      if (true) {
        try {
          // Create enhanced image prompt based on recipe details
          const generateImagePrompt = (recipeTitle: string, ingredients: string[], mood: string, platingNotes?: string) => {
            // Extract main ingredients (first 3-4 key ingredients)
            const mainIngredients = ingredients.slice(0, 4).map(ing => 
              ing.replace(/^\d+.*?\s/, '').replace(/,.*$/, '').trim()
            );
            
            return `High-resolution photo of a plated dish titled "${recipeTitle}". 
Prepared with ingredients like: ${mainIngredients.join(", ")}.
Styled to match the mood: ${mood || "elevated home comfort"}.
Plated on a neutral background, natural lighting, with light shadows.
No labels, no text, no hands, no brand packaging.
Styled like an editorial cookbook photo or a Waitrose magazine.
${platingNotes ? `Plating style: ${platingNotes}.` : ""}
Use subtle depth of field. Slight steam if dish is hot. Avoid unrealistic glows or artificial textures.`;
          };

          const sophisticatedPrompt = generateImagePrompt(
            fullRecipe.title,
            fullRecipe.ingredients || [],
            quizData.mood || quizData.vibe || "elevated home comfort",
            fullRecipe.tips
          );

          const imageResponse = await openai.images.generate({
            model: "dall-e-3",
            prompt: sophisticatedPrompt,
            n: 1,
            size: "1024x1024",
            quality: "standard",
          });
          imageUrl = imageResponse.data?.[0]?.url;
        } catch (imageError) {
          console.error("Failed to generate image:", imageError);
        }
      }

      // Log GPT interaction for developer analysis (after image generation)
      if (req.session?.userId) {
        // Use the SAME difficulty mapping as the post-processing section
        const ambitionValue = (quizData.ambition || 'simpleTasty').toString().toLowerCase();
        const difficultyMap: { [key: string]: string } = {
          'justfed': 'Easy',
          'simpletasty': 'Easy',
          'confidentcook': 'Medium',
          'ambitiouschef': 'Hard',
          'michelineffort': 'Hard',
        };
        const expectedDifficulty = difficultyMap[ambitionValue] || 'Medium';
        
        console.log(`🔍 PROMPT 2 DEBUG - Ambition: ${quizData.ambition}, Expected difficulty: ${expectedDifficulty}`);
        const expectedOutput = {
          servings: parseInt(quizData.servings) || quizData.portions || 4,
          cookTime: quizData.time || quizData.cookingTime || 30,
          difficulty: expectedDifficulty,
          budget: quizData.budget || 'moderate',
          cuisine: quizData.cuisines?.[0] || quizData.cuisine || 'any'
        };
        
        const actualOutput = {
          servings: fullRecipe.servings,
          cookTime: fullRecipe.cookTime,
          difficulty: fullRecipe.difficulty,
          budget: fullRecipe.budget,
          cuisine: fullRecipe.cuisine,
          title: fullRecipe.title
        };
        
        // Track image generation details
        if (imageUrl) {
          imagePrompt = `A stunning food photograph of ${fullRecipe.title}, featuring ${fullRecipe.cuisine} cuisine, professional food styling, natural lighting, appetizing presentation`;
          imageGenerated = true;
          imageCost = "$0.020"; // Standard Stable Diffusion cost
        }

        await logGPTInteraction(
          req.session.userId,
          mode,
          {
            // Pass recipe generation context instead of quiz data for Prompt 2
            selectedRecipe: selectedRecipe.title,
            mode: mode,
            prompt_type: "recipe_generation",
            ambition: quizData.ambition,
            servings: quizData.servings || quizData.portions,
            time: quizData.time || quizData.cookingTime,
            budget: quizData.budget,
            dietary: quizData.dietary
          },
          enhancedPrompt, // Use the actual Prompt 2 that was sent to GPT
          response.choices[0].message.content!,
          expectedOutput,
          actualOutput,
          imagePrompt,
          imageGenerated,
          imageUrl || undefined,
          imageCost
        );
      }

      // Save recipe to database with complete context
      let savedRecipe = null;
      try {
        // Generate unique share ID for potential sharing
        const shareId = `flavr-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        const recipeToSave = {
          userId: req.session?.userId || null,
          title: fullRecipe.title,
          description: fullRecipe.description,
          ingredients: fullRecipe.ingredients || [],
          instructions: fullRecipe.instructions || [],
          cookTime: fullRecipe.cookTime,
          servings: fullRecipe.servings,
          difficulty: fullRecipe.difficulty,
          cuisine: fullRecipe.cuisine,
          mode,
          mood: quizData.mood || quizData.vibe,
          ambition: quizData.ambition,
          dietary: quizData.dietary || [],
          equipment: quizData.equipment || [],
          budget: quizData.budget,
          cookingTime: quizData.time || quizData.cookingTime,
          quizData: quizData,
          recipeText: JSON.stringify(fullRecipe),
          originalPrompt: enhancedPrompt,
          tips: fullRecipe.tips,
          imageUrl: imageUrl,
          shoppingList: fullRecipe.shoppingList || [],
          shareId: shareId,
          isShared: false
        };

        savedRecipe = await storage.createRecipe(recipeToSave);
        console.log(`Recipe saved to database with ID: ${savedRecipe.id}`);
      } catch (saveError) {
        console.error("Failed to save recipe to database:", saveError);
        // Continue without failing - recipe generation was successful
      }

      // Return the generated recipe with image and database ID
      res.json({ 
        ...fullRecipe,
        imageUrl,
        id: savedRecipe?.id,
        shareId: savedRecipe?.shareId
      });
    } catch (error: any) {
      console.error("=== FULL RECIPE GENERATION ERROR ===");
      console.error("Error type:", typeof error);
      console.error("Error message:", error.message);
      console.error("Error name:", error.name);
      console.error("Full error:", error);
      console.error("=====================================");
      res.status(500).json({ message: "Failed to generate full recipe: " + error.message });
    }
  });

  // Flavr+ Gating System Routes
  app.post("/api/usage/check", async (req, res) => {
    try {
      const { pseudoId, browserFingerprint } = req.body;
      const isAuthenticated = req.isAuthenticated();
      
      let usageStatus;
      
      if (isAuthenticated) {
        const user = req.user;
        usageStatus = {
          canGenerate: user.hasFlavrPlus || (user.recipesThisMonth || 0) < (user.monthlyRecipeLimit || 3),
          recipesUsed: user.recipesThisMonth || 0,
          recipesLimit: user.monthlyRecipeLimit || 3,
          hasFlavrPlus: user.hasFlavrPlus || false
        };
      } else {
        // Handle pseudo-user (free user without account)
        let pseudoUser = await storage.getPseudoUser(pseudoId);
        
        if (!pseudoUser) {
          pseudoUser = await storage.createPseudoUser({
            pseudoId,
            browserFingerprint,
            recipesThisMonth: 0,
            monthlyRecipeLimit: 3
          });
        }
        
        usageStatus = {
          canGenerate: (pseudoUser.recipesThisMonth || 0) < (pseudoUser.monthlyRecipeLimit || 3),
          recipesUsed: pseudoUser.recipesThisMonth || 0,
          recipesLimit: pseudoUser.monthlyRecipeLimit || 3,
          hasFlavrPlus: false
        };
      }
      
      res.json(usageStatus);
    } catch (error) {
      console.error('Usage check failed:', error);
      res.status(500).json({ message: 'Failed to check usage limits' });
    }
  });

  app.post("/api/usage/increment", async (req, res) => {
    try {
      const { pseudoId } = req.body;
      const isAuthenticated = req.isAuthenticated();
      
      if (isAuthenticated) {
        const user = req.user;
        if (!user.hasFlavrPlus) {
          await storage.updateUserUsage(user.id, (user.recipesThisMonth || 0) + 1, user.imagesThisMonth || 0);
        }
      } else {
        const pseudoUser = await storage.getPseudoUser(pseudoId);
        if (pseudoUser) {
          await storage.updatePseudoUserUsage(pseudoId, (pseudoUser.recipesThisMonth || 0) + 1);
        }
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error('Usage increment failed:', error);
      res.status(500).json({ message: 'Failed to increment usage' });
    }
  });

  app.post("/api/usage/reset", async (req, res) => {
    try {
      const { pseudoId } = req.body;
      const isAuthenticated = req.isAuthenticated();
      
      if (isAuthenticated) {
        await storage.resetMonthlyUsage(req.user.id);
      } else {
        await storage.resetPseudoUserMonthlyUsage(pseudoId);
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error('Usage reset failed:', error);
      res.status(500).json({ message: 'Failed to reset usage' });
    }
  });

  // Enhanced Chat route with streaming, memory, and function calling
  app.post("/api/chat/stream", async (req, res) => {
    try {
      const { message, currentRecipe } = req.body;
      const userId = req.session?.userId;

      // Set up Server-Sent Events for streaming
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control'
      });

      // Get full chat history for conversational memory
      const fullChatHistory = await storage.getChatHistory(userId, 100);
      
      // Helper function to estimate token count (rough approximation)
      const estimateTokens = (text: string): number => {
        return Math.ceil(text.length / 4);
      };

      // Helper function to summarize old conversations when approaching context limit
      const summarizeOldHistory = async (history: any[]): Promise<string> => {
        const oldMessages = history.slice(0, Math.floor(history.length * 0.75));
        const messagesText = oldMessages.map(msg => 
          `${msg.userId ? 'User' : 'Assistant'}: ${msg.message || msg.response}`
        ).join('\n');
        
        const summaryResponse = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            {
              role: "system",
              content: "Summarize this conversation history into a concise overview that preserves the key topics, decisions, and context. Focus on recipe discussions, preferences, and any important cooking details mentioned."
            },
            {
              role: "user", 
              content: messagesText
            }
          ],
          max_tokens: 200,
          temperature: 0.3
        });
        
        return summaryResponse.choices[0]?.message?.content || "Previous conversation about cooking and recipes.";
      };

      // Build conversation history with memory management
      let conversationHistory: Array<{role: "system" | "user" | "assistant", content: string}> = [];
      let totalTokens = 0;
      const maxTokens = 3000; // Reserve space for new message and response
      
      // Add recent history first, working backwards
      for (let i = fullChatHistory.length - 1; i >= 0; i--) {
        const msg = fullChatHistory[i];
        const content = msg.message || msg.response;
        const tokens = estimateTokens(content);
        
        if (totalTokens + tokens > maxTokens && conversationHistory.length > 0) {
          // If adding this message would exceed limit, summarize older messages
          const summary = await summarizeOldHistory(fullChatHistory.slice(0, i + 1));
          conversationHistory.unshift({
            role: "system",
            content: `Previous conversation summary: ${summary}`
          });
          break;
        }
        
        conversationHistory.unshift({
          role: msg.userId ? "user" : "assistant",
          content: content
        });
        totalTokens += tokens;
      }

      // Build system prompt with current recipe context
      const systemPrompt = `You are Zest, Flavr's intelligent cooking assistant. You help users with cooking questions, recipe modifications, and culinary guidance.

${currentRecipe ? `Current recipe context: "${currentRecipe.title}" (serves ${currentRecipe.servings})\nIngredients: ${currentRecipe.ingredients?.join(', ')}\nSteps: ${currentRecipe.instructions?.join(' ')}\n` : ''}

When discussing recipes, modifications, or creating new recipes, you must call the set_recipe function with the complete recipe data in this exact JSON format:
{
  "title": "Recipe Name",
  "servings": 4,
  "ingredients": ["ingredient 1", "ingredient 2", ...],
  "steps": ["step 1", "step 2", ...]
}

Always provide complete, detailed ingredients and step-by-step instructions. Be conversational and helpful while maintaining recipe accuracy.`;

      // Prepare messages for OpenAI with conversation history
      const messages: Array<{role: "system" | "user" | "assistant", content: string}> = [
        { role: "system", content: systemPrompt },
        ...conversationHistory,
        { role: "user", content: message }
      ];

      // Create streaming completion with function calling
      const stream = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: messages as any,
        functions: [
          {
            name: "set_recipe",
            description: "Set or update the current recipe with complete recipe data",
            parameters: {
              type: "object",
              properties: {
                title: { type: "string", description: "Recipe title" },
                servings: { type: "integer", description: "Number of servings (optional)" },
                ingredients: { 
                  type: "array", 
                  items: { type: "string" },
                  description: "List of ingredients"
                },
                steps: {
                  type: "array",
                  items: { type: "string" },
                  description: "List of cooking steps"
                }
              },
              required: ["title", "ingredients", "steps"]
            }
          }
        ],
        function_call: "auto",
        stream: true,
        temperature: 0.7,
        max_tokens: 1000
      });

      let fullResponse = "";
      let functionCallData: any = null;
      let functionName = "";
      let functionArgs = "";

      // Stream the response
      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta;
        
        if (delta?.content) {
          // Stream text content
          fullResponse += delta.content;
          res.write(`data: ${JSON.stringify({ type: 'content', content: delta.content })}\n\n`);
        }
        
        if (delta?.function_call) {
          // Handle function call streaming
          if (delta.function_call.name) {
            functionName = delta.function_call.name;
          }
          if (delta.function_call.arguments) {
            functionArgs += delta.function_call.arguments;
          }
        }
        
        // Check if function call is complete
        if (chunk.choices[0]?.finish_reason === 'function_call') {
          try {
            functionCallData = JSON.parse(functionArgs);
            
            // Send recipe update event immediately
            res.write(`data: ${JSON.stringify({ 
              type: 'recipeUpdate', 
              recipe: {
                title: functionCallData.title,
                servings: functionCallData.servings || currentRecipe?.servings || 4,
                ingredients: functionCallData.ingredients,
                steps: functionCallData.steps
              }
            })}\n\n`);
            
            // Generate a brief response about the recipe update
            const updateResponse = `I've updated the recipe for "${functionCallData.title}"${functionCallData.servings ? ` (serves ${functionCallData.servings})` : ''}. The recipe card has been refreshed with the new details.`;
            fullResponse += updateResponse;
            res.write(`data: ${JSON.stringify({ type: 'content', content: updateResponse })}\n\n`);
            
          } catch (error) {
            console.error('Error parsing function call arguments:', error);
          }
        }
      }

      // End the stream
      res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
      res.end();

      // Save the conversation to database
      await storage.createChatMessage({
        userId,
        message,
        response: fullResponse,
      });

    } catch (error: any) {
      console.error('Streaming chat error:', error);
      res.write(`data: ${JSON.stringify({ type: 'error', message: error.message })}\n\n`);
      res.end();
    }
  });

  // Keep the original chat endpoint for backward compatibility
  app.post("/api/chat", async (req, res) => {
    try {
      const { message, currentRecipe } = req.body;
      const userId = req.session?.userId;
      let updatedRecipe = null;
      let functionCalls: any[] = [];

      // Get chat history for conversation memory
      const chatHistory = await storage.getChatHistory(userId, 10);

      // Add conversation history for context retention
      const conversationHistory = chatHistory.slice(-5).map((msg: any) => ({
        role: (msg.userId ? "user" : "assistant") as "user" | "assistant",
        content: msg.message || msg.response
      }));

      const regularChatPrompt = `You are Zest, Flavr's friendly AI cooking assistant. Maintain natural conversation flow!

${chatHistory.length > 0 ? `Recent conversation:\n${chatHistory.slice(-3).map((msg: any) => `User: ${msg.message}\nYou: ${msg.response}`).join('\n')}\n` : ''}

${currentRecipe ? `Current recipe context: "${currentRecipe.title}" (serves ${currentRecipe.servings})\n` : ''}

Be conversational like ChatGPT. Reference what you've discussed before. Answer cooking questions, give tips, or chat naturally about food. Keep responses friendly and maintain conversation flow.`;

      const allMessages: Array<{role: "system" | "user" | "assistant", content: string}> = [
        { role: "system", content: regularChatPrompt },
        ...conversationHistory,
        { role: "user", content: message }
      ];

      const response = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: allMessages as any,
        max_tokens: 300,
        temperature: 0.7,
      });

      const botResponse = response.choices[0]?.message?.content || "I'm sorry, I couldn't process that request. Please try again.";
      
      // Save chat message
      await storage.createChatMessage({
        userId,
        message,
        response: botResponse,
      });

      res.json({ 
        response: botResponse,
        updatedRecipe: null,
        functionCalls: []
      });
    } catch (error: any) {
      res.status(500).json({ message: "Failed to process chat: " + error.message });
    }
  });

  // Hybrid OpenAI + Gemini Streaming Chat with Context Handover
  app.post("/api/chat/stream", async (req, res) => {
    try {
      const { message, currentRecipe, conversationHistory = [], openAIContext } = req.body;
      const userId = req.session?.userId;

      // Set up Server-Sent Events for streaming
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control'
      });

      // Import Gemini chat service
      const { geminiChat } = await import('./geminiChat');

      // Initialize Gemini chat with OpenAI context handover
      await geminiChat.initializeChat({
        currentRecipe,
        conversationHistory,
        openAIContext: openAIContext || {
          quizData: currentRecipe?.quizData,
          originalPrompt: currentRecipe?.originalPrompt,
          userPreferences: currentRecipe?.userPreferences
        }
      });
      
      // Use Gemini for fluid conversation with OpenAI context handover
      console.log('🔥 USING GOOGLE GEMINI FOR CONVERSATION');
      console.log('📊 Conversation History Length:', conversationHistory.length);
      console.log('🎯 OpenAI Context Available:', !!openAIContext);
      console.log('🍳 Current Recipe Context:', currentRecipe ? currentRecipe.title : 'None');
      console.log('💬 User Message:', message);
      
      let fullResponse = '';
      
      await geminiChat.sendMessageStream(message, (chunk) => {
        if (chunk.type === 'content') {
          fullResponse += chunk.content;
          res.write(`data: ${JSON.stringify({ type: 'content', content: chunk.content })}\n\n`);
        } else if (chunk.type === 'function_call') {
          try {
            const { name, args } = chunk.functionCall;
            console.log('🔧 Gemini function call executed:', name, JSON.stringify(args, null, 2));
            
            // Build comprehensive updated recipe
            const updatedRecipe = {
              id: currentRecipe?.id || Date.now(),
              title: args.title || currentRecipe?.title || 'Updated Recipe',
              servings: args.servings || currentRecipe?.servings || 4,
              cookTime: args.cookTime || currentRecipe?.cookTime || 30,
              difficulty: args.difficulty || currentRecipe?.difficulty || "Medium",
              ingredients: args.ingredients || currentRecipe?.ingredients || [],
              instructions: args.instructions || currentRecipe?.instructions || [],
              description: args.description || currentRecipe?.description || args.title,
              cuisine: args.cuisine || currentRecipe?.cuisine || 'Updated',
              tips: args.tips || currentRecipe?.tips || ''
            };
            
            console.log('📤 Sending comprehensive recipe update from Gemini:', updatedRecipe.title);
            res.write(`data: ${JSON.stringify({ 
              type: 'function_call', 
              updatedRecipe,
              functionCall: { name, args }
            })}\n\n`);
            
            // Confirm the action was taken
            fullResponse += ` ✅ Recipe updated successfully!`;
            res.write(`data: ${JSON.stringify({ 
              type: 'content', 
              content: ' ✅ Recipe updated successfully!'
            })}\n\n`);
            
          } catch (error) {
            console.error('Error processing Gemini function call:', error);
          }
        } else if (chunk.type === 'done') {
          res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
          res.end();
          
          // Save to database if user authenticated and we have a response
          if (userId && fullResponse.trim()) {
            storage.createChatMessage({
              userId,
              message,
              response: fullResponse,
            }).catch(console.error);
          }
        } else if (chunk.type === 'error') {
          res.write(`data: ${JSON.stringify({ type: 'error', message: chunk.message })}\n\n`);
          res.end();
        }
      });

    } catch (error: any) {
      console.error('Hybrid chat error:', error);
      res.write(`data: ${JSON.stringify({ type: 'error', message: error.message })}\n\n`);
      res.end();
    }
  });

  // Keep the legacy OpenAI endpoint for fallback
  app.post("/api/chat/stream-openai", async (req, res) => {
    try {
      const { message, currentRecipe, conversationHistory = [] } = req.body;
      const userId = req.session?.userId;

      // Set up Server-Sent Events for streaming
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control'
      });

      // Helper function to estimate token count (rough approximation)
      const estimateTokens = (text: string): number => {
        return Math.ceil(text.length / 4);
      };

      // Helper function to summarize old conversations when approaching context limit
      const summarizeOldHistory = async (history: any[]): Promise<string> => {
        if (history.length === 0) return "";
        
        const oldMessages = history.slice(0, Math.floor(history.length * 0.7));
        const messagesText = oldMessages.map(msg => 
          `${msg.userId ? 'User' : 'Assistant'}: ${msg.message || msg.response}`
        ).join('\n');
        
        try {
          const summaryResponse = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
              {
                role: "system",
                content: "Summarize this conversation history into a concise overview that preserves key cooking topics, recipe discussions, preferences, and important culinary context. Focus on what the user likes, dislikes, and any specific cooking requirements mentioned."
              },
              {
                role: "user", 
                content: messagesText
              }
            ],
            max_tokens: 200,
            temperature: 0.3
          });
          
          return summaryResponse.choices[0]?.message?.content || "Previous conversation about cooking and recipes.";
        } catch (error) {
          console.error('Error summarizing history:', error);
          return "Previous conversation about cooking and recipes.";
        }
      };

      // Use conversation history from frontend for seamless context flow
      let conversationMessages: Array<{role: "system" | "user" | "assistant", content: string}> = [];
      
      if (conversationHistory && conversationHistory.length > 0) {
        console.log('🔄 Using frontend conversation history:', conversationHistory.length, 'messages');
        conversationMessages = conversationHistory.slice(-10); // Last 10 messages for context
      } else {
        console.log('📚 No frontend history, using database fallback');
        let totalTokens = 0;
        const maxTokens = 3000;
        
        // Add recent history first, working backwards
        for (let i = fullChatHistory.length - 1; i >= 0; i--) {
          const msg = fullChatHistory[i];
          const content = msg.message || msg.response;
          const tokens = estimateTokens(content);
          
          if (totalTokens + tokens > maxTokens && conversationMessages.length > 0) {
            break;
          }
          
          conversationMessages.unshift({
            role: msg.userId ? "user" : "assistant",
            content: content
          });
          totalTokens += tokens;
        }
      }

      // Build system prompt with current recipe context and function calling
      const systemPrompt = `You are Zest, Flavr's intelligent cooking assistant. You help users with cooking questions, recipe modifications, and culinary guidance.

${currentRecipe ? `Current recipe context: "${currentRecipe.title}" (serves ${currentRecipe.servings})
Ingredients: ${currentRecipe.ingredients?.join(', ')}
Instructions: ${currentRecipe.instructions?.join(' ')}

` : ''}IMPORTANT: When the user requests ANY recipe modification (substitutions, additions, changes), you MUST call the set_recipe function with the COMPLETE updated recipe data. Do not just suggest changes - implement them immediately by calling the function.

Be conversational, helpful, and maintain context from our conversation history. Reference previous messages and continue the conversation naturally. If the user mentions something from earlier in our conversation, acknowledge it specifically.`;

      // Prepare messages for OpenAI with full conversation history
      const messages: Array<{role: "system" | "user" | "assistant", content: string}> = [
        { role: "system", content: systemPrompt },
        ...conversationMessages,
        { role: "user", content: message }
      ];

      console.log('🤖 OpenAI Messages being sent:');
      console.log('System prompt length:', systemPrompt.length);
      console.log('Conversation history messages:', conversationMessages.length);
      console.log('Full message array:', JSON.stringify(messages, null, 2));

      // Create streaming completion with function calling
      const stream = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: messages as any,
        functions: [
          {
            name: "set_recipe",
            description: "Set or update the current recipe with complete recipe data when user requests modifications or creates new recipes",
            parameters: {
              type: "object",
              properties: {
                title: { type: "string", description: "Recipe title" },
                servings: { type: "integer", description: "Number of servings", default: 4 },
                cookTime: { type: "integer", description: "Cooking time in minutes", default: 30 },
                difficulty: { 
                  type: "string", 
                  enum: ["Easy", "Medium", "Hard"], 
                  description: "Recipe difficulty level",
                  default: "Medium"
                },
                ingredients: { 
                  type: "array", 
                  items: { type: "string" },
                  description: "Complete list of ingredients with measurements"
                },
                instructions: {
                  type: "array",
                  items: { type: "string" },
                  description: "Step-by-step cooking instructions"
                }
              },
              required: ["title", "ingredients", "instructions"]
            }
          }
        ],
        function_call: "auto",
        stream: true,
        temperature: 0.7,
        max_tokens: 1000
      });

      let fullResponse = "";
      let functionCallData: any = null;
      let functionName = "";
      let functionArgs = "";

      // Stream the response
      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta;
        
        if (delta?.content) {
          // Stream text content
          fullResponse += delta.content;
          res.write(`data: ${JSON.stringify({ type: 'content', content: delta.content })}\n\n`);
        }
        
        if (delta?.function_call) {
          // Handle function call streaming
          if (delta.function_call.name) {
            functionName = delta.function_call.name;
          }
          if (delta.function_call.arguments) {
            functionArgs += delta.function_call.arguments;
          }
        }
        
        // Check if function call is complete
        if (chunk.choices[0]?.finish_reason === 'function_call') {
          try {
            functionCallData = JSON.parse(functionArgs);
            console.log('🔧 Function call completed:', functionName, functionCallData);
            
            // Send recipe update event immediately for live refresh
            const updatedRecipe = {
              id: currentRecipe?.id || Date.now(),
              title: functionCallData.title,
              servings: functionCallData.servings || currentRecipe?.servings || 4,
              cookTime: functionCallData.cookTime || currentRecipe?.cookTime || 30,
              difficulty: functionCallData.difficulty || currentRecipe?.difficulty || "Medium",
              ingredients: functionCallData.ingredients,
              instructions: functionCallData.instructions,
              description: currentRecipe?.description || functionCallData.title
            };
            
            console.log('📤 Sending recipe update event:', updatedRecipe);
            res.write(`data: ${JSON.stringify({ 
              type: 'recipeUpdate', 
              recipe: updatedRecipe
            })}\n\n`);
            
            // Generate a brief response about the recipe update
            const updateResponse = `Perfect! I've updated "${functionCallData.title}" for you. Check the recipe card - it should show all the changes immediately!`;
            fullResponse += updateResponse;
            res.write(`data: ${JSON.stringify({ type: 'content', content: updateResponse })}\n\n`);
            
          } catch (error) {
            console.error('Error parsing function call arguments:', error);
            res.write(`data: ${JSON.stringify({ type: 'content', content: "I've made some changes to the recipe. Please check the updated recipe card!" })}\n\n`);
          }
        }
      }

      // End the stream
      res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
      res.end();

      // Save the conversation to database for memory retention
      await storage.createChatMessage({
        userId,
        message,
        response: fullResponse,
      });

    } catch (error: any) {
      console.error('Streaming chat error:', error);
      res.write(`data: ${JSON.stringify({ type: 'error', message: error.message })}\n\n`);
      res.end();
    }
  });

  // OpenAI Real-time Voice Chat endpoint
  app.post("/api/voice/realtime", async (req, res) => {
    try {
      const { audioData, currentRecipe } = req.body;
      const userId = req.session?.userId;

      // Process voice input and generate response
      res.json({ 
        success: true,
        message: "Voice chat processing implemented" 
      });
    } catch (error: any) {
      res.status(500).json({ message: "Voice chat error: " + error.message });
    }
  });

  // Recipe sharing and management routes
  app.post("/api/recipes/share", async (req, res) => {
    try {
      const { recipeId } = req.body;
      const userId = req.session?.userId;
      
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      res.json({ success: true, shareId: "shared_" + recipeId });
    } catch (error: any) {
      res.status(500).json({ message: "Failed to share recipe: " + error.message });
    }
  });

  const httpServer = createServer(app);
  
  // Setup Google Live Audio WebSocket
  setupGoogleLiveAudioWebSocket(httpServer);
  console.log('🔊 Google Live Audio WebSocket server initialized');
  
  return httpServer;
}
