import type { Express } from "express";
import OpenAI from "openai";
import Replicate from "replicate";
import multer from 'multer';
import { storage } from "../storage";
import { requireAuth } from "./authRoutes";
import { insertRecipeSchema } from "@shared/schema";
import { logGPTInteraction } from "../developerLogger";
import { processFridgeImage } from "../vision";
import { getCreativeGuidanceBlock } from "../shoppingPromptBlocks";
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
} from "../mappingUtils";
import { processConversationalInput, generateRecipeFromConversation, logUserInteractionData } from "../conversationalProcessor";

// Configure multer for file uploads
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

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

export function registerRecipeRoutes(app: Express) {
  // Test endpoint
  app.get("/api/test", (req, res) => {
    res.json({ 
      message: "Recipe API is working!",
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development'
    });
  });

  // Recipe ideas generation (Shopping Mode)
  app.post("/api/recipe-ideas", async (req, res) => {
    try {
      const startTime = Date.now();
      const { 
        portions, 
        timeAvailable, 
        equipment, 
        mood, 
        ambition, 
        budget, 
        cuisines, 
        dietaryRestrictions, 
        supermarket 
      } = req.body;

      if (!portions || !timeAvailable || !equipment || !mood || !ambition || !budget || !cuisines) {
        return res.status(400).json({ 
          error: "Missing required fields: portions, timeAvailable, equipment, mood, ambition, budget, cuisines" 
        });
      }

      const creativityGuidance = getCreativeGuidanceBlock();
      
      // Get supermarket-specific guidance if provided
      let supermarketContext = "";
      if (supermarket && supermarket !== "any") {
        const getSupermarketPromptText = (market: string) => {
          const prompts = {
            "whole-foods": "Focus on organic, artisanal, and premium ingredients available at Whole Foods Market. Include specialty items, fresh produce, and high-quality proteins.",
            "trader-joes": "Emphasize Trader Joe's unique products, affordable gourmet items, and their famous pre-made components that can elevate home cooking.",
            "costco": "Design for bulk shopping and family-style meals. Include ingredients that work well when bought in larger quantities.",
            "kroger": "Focus on accessible, mainstream ingredients with good value. Include both name-brand and store-brand options.",
            "safeway": "Emphasize fresh, quality ingredients available at Safeway with focus on their produce and deli sections.",
            "target": "Include Good & Gather and Market Pantry products along with accessible, everyday ingredients from Target's grocery section."
          };
          return prompts[market] || "";
        };
        
        supermarketContext = `\n\nSUPERMARKET CONTEXT: ${getSupermarketPromptText(supermarket)}`;
      }

      const basePrompt = `You are Zest, a culinary genius and the creative mind behind Flavr. Generate 4-6 diverse, exciting recipe suggestions for a shopping list based on these preferences:

REQUIREMENTS:
- Portions: ${portions}
- Time Available: ${timeAvailable}
- Equipment: ${Array.isArray(equipment) ? equipment.join(', ') : equipment}
- Mood: ${mood}
- Ambition Level: ${ambition}
- Budget: ${budget}
- Preferred Cuisines: ${Array.isArray(cuisines) ? cuisines.join(', ') : cuisines}
${dietaryRestrictions ? `- Dietary Restrictions: ${Array.isArray(dietaryRestrictions) ? dietaryRestrictions.join(', ') : dietaryRestrictions}` : ''}${supermarketContext}

${creativityGuidance}

RESPONSE FORMAT:
Return a JSON object with a "recipes" array containing 4-6 recipe objects. Each recipe must have:
{
  "title": "Specific dish name",
  "description": "2-3 sentence appetizing description focusing on flavors and appeal",
  "estimatedTime": "Cooking time (e.g., '45 minutes')",
  "difficulty": "Beginner/Intermediate/Advanced",
  "cuisine": "Primary cuisine type",
  "highlights": ["Key appeal point 1", "Key appeal point 2", "Key appeal point 3"]
}

Make each recipe distinctly different in style, technique, and flavor profile. Focus on what makes each dish special and craveable.`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: basePrompt }],
        temperature: 0.8,
        max_tokens: 2000,
      });

      const responseContent = completion.choices[0]?.message?.content;
      if (!responseContent) {
        throw new Error("No response from OpenAI");
      }

      let recipeData;
      try {
        recipeData = JSON.parse(responseContent);
      } catch (parseError) {
        console.error("JSON parsing error:", parseError);
        throw new Error("Invalid JSON response from AI");
      }

      const duration = Date.now() - startTime;
      
      // Log the interaction
      await logGPTInteraction({
        endpoint: 'recipe-ideas',
        prompt: basePrompt,
        response: responseContent,
        model: 'gpt-4o',
        duration,
        inputTokens: 0,
        outputTokens: 0,
        cost: 0,
        success: true,
        userId: req.session?.userId || 'anonymous',
        sessionId: req.session?.id || 'no-session'
      });

      res.json(recipeData);
    } catch (error) {
      console.error("Recipe ideas error:", error);
      res.status(500).json({ 
        error: "Failed to generate recipe ideas",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Generate recipe ideas (Alternative endpoint)
  app.post("/api/generate-recipe-ideas", async (req, res) => {
    try {
      const startTime = Date.now();
      const { 
        portions, 
        timeAvailable, 
        equipment, 
        mood, 
        ambition, 
        budget, 
        cuisines, 
        dietaryRestrictions,
        supermarket 
      } = req.body;

      console.log('🔥 Generate Recipe Ideas Request:', { portions, timeAvailable, equipment, mood, ambition, budget, cuisines, dietaryRestrictions, supermarket });

      // Build dynamic prompt components
      const timePrompt = getTimePromptText(timeAvailable);
      const moodPrompt = getMoodPromptText(mood);
      const ambitionPrompt = getAmbitionPromptText(ambition);
      const budgetPrompt = getBudgetPromptText(budget);
      const dietPrompt = getDietPromptText(dietaryRestrictions);
      const equipmentPrompt = getEquipmentPromptText(equipment);

      // Get supermarket-specific context
      let supermarketContext = "";
      if (supermarket && supermarket !== "any") {
        const getSupermarketPromptText = (market: string) => {
          const prompts = {
            "whole-foods": "Focus on organic, artisanal, and premium ingredients available at Whole Foods Market. Include specialty items, fresh produce, and high-quality proteins.",
            "trader-joes": "Emphasize Trader Joe's unique products, affordable gourmet items, and their famous pre-made components that can elevate home cooking.",
            "costco": "Design for bulk shopping and family-style meals. Include ingredients that work well when bought in larger quantities.",
            "kroger": "Focus on accessible, mainstream ingredients with good value. Include both name-brand and store-brand options.",
            "safeway": "Emphasize fresh, quality ingredients available at Safeway with focus on their produce and deli sections.",
            "target": "Include Good & Gather and Market Pantry products along with accessible, everyday ingredients from Target's grocery section."
          };
          return prompts[market] || "";
        };
        
        supermarketContext = `\n\nSUPERMARKET FOCUS: ${getSupermarketPromptText(supermarket)}`;
      }

      const creativityGuidance = getCreativeGuidanceBlock();

      const prompt = `You are Zest, Flavr's AI culinary expert. Create 4-6 diverse recipe suggestions for shopping mode.

USER PREFERENCES:
• Portions: ${portions}
• ${timePrompt}
• ${moodPrompt}  
• ${ambitionPrompt}
• ${budgetPrompt}
• Cuisines: ${Array.isArray(cuisines) ? cuisines.join(', ') : cuisines}
• Equipment: ${formatEquipmentText(equipment)}
${dietPrompt ? `• ${dietPrompt}` : ''}${supermarketContext}

${creativityGuidance}

REQUIREMENTS:
- Each recipe must be distinctly different in cuisine, technique, and flavor profile
- Include a mix of difficulty levels appropriate for the ambition level
- Ensure recipes fit the time constraint and equipment availability
- Make descriptions appetizing and specific to build excitement

Return valid JSON only:
{
  "recipes": [
    {
      "title": "Specific dish name (not generic)",
      "description": "2-3 sentences highlighting flavors, technique, and appeal",
      "estimatedTime": "X minutes",
      "difficulty": "Beginner/Intermediate/Advanced", 
      "cuisine": "Specific cuisine type",
      "highlights": ["Unique aspect 1", "Flavor highlight 2", "Technique or ingredient 3"]
    }
  ]
}`;

      console.log('🎯 Sending prompt to OpenAI...');
      
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.8,
        max_tokens: 2500,
      });

      const responseContent = completion.choices[0]?.message?.content;
      if (!responseContent) {
        throw new Error("Empty response from OpenAI");
      }

      console.log('📝 Raw OpenAI response preview:', responseContent.substring(0, 200) + '...');

      let recipeData;
      try {
        recipeData = JSON.parse(responseContent);
      } catch (parseError) {
        console.error("❌ JSON parsing failed:", parseError);
        console.log("Raw response:", responseContent);
        throw new Error("Invalid JSON response from AI");
      }

      const duration = Date.now() - startTime;

      // Log successful interaction
      await logGPTInteraction({
        endpoint: 'generate-recipe-ideas',
        prompt,
        response: responseContent,
        model: 'gpt-4o',
        duration,
        inputTokens: completion.usage?.prompt_tokens || 0,
        outputTokens: completion.usage?.completion_tokens || 0,
        cost: ((completion.usage?.prompt_tokens || 0) * 0.03 + (completion.usage?.completion_tokens || 0) * 0.06) / 1000,
        success: true,
        userId: req.session?.userId || 'anonymous',
        sessionId: req.session?.id || 'no-session'
      });

      console.log('✅ Recipe ideas generated successfully:', recipeData.recipes?.length || 0, 'recipes');
      res.json(recipeData);

    } catch (error) {
      console.error("❌ Recipe ideas generation failed:", error);
      
      // Log failed interaction
      await logGPTInteraction({
        endpoint: 'generate-recipe-ideas',
        prompt: 'Error occurred before prompt completion',
        response: '',
        model: 'gpt-4o',
        duration: 0,
        inputTokens: 0,
        outputTokens: 0,
        cost: 0,
        success: false,
        userId: req.session?.userId || 'anonymous',
        sessionId: req.session?.id || 'no-session',
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      res.status(500).json({ 
        error: "Failed to generate recipe ideas",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Generate full recipe
  app.post("/api/generate-full-recipe", async (req, res) => {
    try {
      const startTime = Date.now();
      const { 
        selectedRecipe, 
        portions, 
        timeAvailable, 
        equipment, 
        mood, 
        ambition, 
        budget, 
        cuisines, 
        dietaryRestrictions,
        supermarket,
        mode = "Shopping Mode"
      } = req.body;

      console.log('🍳 Full Recipe Generation Request:', { 
        selectedRecipe: selectedRecipe?.title, 
        portions, 
        mode 
      });

      if (!selectedRecipe?.title) {
        return res.status(400).json({ error: "Selected recipe title is required" });
      }

      // Build context from original preferences
      const timePrompt = getTimePromptText(timeAvailable);
      const moodPrompt = getMoodPromptText(mood);
      const ambitionPrompt = getAmbitionPromptText(ambition);
      const budgetPrompt = getBudgetPromptText(budget);
      const dietPrompt = getDietPromptText(dietaryRestrictions);
      const equipmentPrompt = getEquipmentPromptText(equipment);

      // Get supermarket context
      let supermarketInstructions = "";
      if (supermarket && supermarket !== "any") {
        const getSupermarketPromptText = (market: string) => {
          const prompts = {
            "whole-foods": "Specify premium, organic ingredients available at Whole Foods. Include artisanal brands and specialty items.",
            "trader-joes": "Use Trader Joe's specific products where applicable. Mention their unique items and affordable gourmet options.",
            "costco": "Focus on bulk-friendly ingredients and family-size portions. Consider Kirkland brand alternatives.",
            "kroger": "Include accessible, mainstream ingredients. Mention store brands like Simple Truth when relevant.",
            "safeway": "Focus on fresh ingredients from Safeway's produce and deli sections. Include Signature SELECT options.",
            "target": "Incorporate Good & Gather and Market Pantry products. Focus on accessible, everyday ingredients."
          };
          return prompts[market] || "";
        };
        
        supermarketInstructions = `\n\nSHOPPING GUIDANCE: ${getSupermarketPromptText(supermarket)}`;
      }

      const strictDietaryInstruction = getStrictDietaryInstruction(dietaryRestrictions);

      const prompt = `You are Zest, Flavr's expert culinary AI. Create a complete, detailed recipe for "${selectedRecipe.title}" based on the user's preferences and shopping context.

ORIGINAL PREFERENCES:
• Portions: ${portions}
• ${timePrompt}
• ${moodPrompt}
• ${ambitionPrompt}
• ${budgetPrompt}
• Equipment: ${formatEquipmentText(equipment)}
${dietPrompt ? `• ${dietPrompt}` : ''}${supermarketInstructions}

SELECTED RECIPE CONCEPT:
• Title: ${selectedRecipe.title}
• Description: ${selectedRecipe.description}
• Estimated Time: ${selectedRecipe.estimatedTime}
• Difficulty: ${selectedRecipe.difficulty}
• Cuisine: ${selectedRecipe.cuisine}

${strictDietaryInstruction}

REQUIREMENTS:
- Create a complete recipe with precise measurements for ${portions} servings
- Include comprehensive ingredient list with specific quantities
- Provide detailed, step-by-step cooking instructions
- Add helpful cooking tips and techniques
- Ensure the recipe matches the selected concept while fitting all preferences
- Make ingredients accessible for the specified supermarket context

Return valid JSON only:
{
  "title": "${selectedRecipe.title}",
  "description": "Appetizing 2-3 sentence description of the finished dish",
  "cuisine": "${selectedRecipe.cuisine}",
  "servings": ${portions},
  "cookTime": "${selectedRecipe.estimatedTime}",
  "difficulty": "${selectedRecipe.difficulty}",
  "ingredients": [
    "Specific quantity and ingredient (e.g., '2 tablespoons olive oil')",
    "Another ingredient with exact measurement"
  ],
  "instructions": [
    "Step 1: Detailed first instruction with technique",
    "Step 2: Next instruction with timing and visual cues",
    "Continue with clear, actionable steps"
  ],
  "tips": [
    "Professional tip for better results",
    "Ingredient substitution or technique advice",
    "Storage or serving suggestion"
  ],
  "nutritionHighlights": [
    "Key nutritional benefit 1",
    "Key nutritional benefit 2",
    "Key nutritional benefit 3"
  ]
}`;

      console.log('📝 Generating full recipe with OpenAI...');

      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        max_tokens: 3000,
      });

      const responseContent = completion.choices[0]?.message?.content;
      if (!responseContent) {
        throw new Error("Empty response from OpenAI");
      }

      let recipeData;
      try {
        // Clean up response content - remove markdown code blocks if present
        let cleanContent = responseContent.trim();
        if (cleanContent.startsWith('```json')) {
          cleanContent = cleanContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        } else if (cleanContent.startsWith('```')) {
          cleanContent = cleanContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
        }
        
        recipeData = JSON.parse(cleanContent);
      } catch (parseError) {
        console.error("❌ Recipe JSON parsing failed:", parseError);
        console.log("Raw response:", responseContent);
        throw new Error("Invalid JSON response from recipe AI");
      }

      // Add metadata
      recipeData.mode = mode;
      recipeData.id = Date.now().toString();
      recipeData.createdAt = new Date().toISOString();

      // Save recipe to database if user is authenticated
      if (req.session?.userId) {
        try {
          await storage.createRecipe({
            ...recipeData,
            userId: req.session.userId,
            shareId: null
          });
          console.log('💾 Recipe saved to database for user:', req.session.userId);
        } catch (dbError) {
          console.error('Database save error:', dbError);
          // Continue without throwing - recipe generation succeeded
        }
      }

      const duration = Date.now() - startTime;

      // Log successful interaction
      await logGPTInteraction({
        endpoint: 'generate-full-recipe',
        prompt,
        response: responseContent,
        model: 'gpt-4o',
        duration,
        inputTokens: completion.usage?.prompt_tokens || 0,
        outputTokens: completion.usage?.completion_tokens || 0,
        cost: ((completion.usage?.prompt_tokens || 0) * 0.03 + (completion.usage?.completion_tokens || 0) * 0.06) / 1000,
        success: true,
        userId: req.session?.userId || 'anonymous',
        sessionId: req.session?.id || 'no-session'
      });

      console.log('✅ Full recipe generated successfully for:', recipeData.title);
      res.json({ recipe: recipeData });

    } catch (error) {
      console.error("❌ Full recipe generation failed:", error);

      res.status(500).json({ 
        error: "Failed to generate full recipe",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Conversational recipe generation
  app.post("/api/conversational-recipe", async (req, res) => {
    try {
      const { message, conversationHistory = [], currentData = {} } = req.body;
      
      console.log('🗣️ Conversational Recipe Request:', { message, currentData });

      if (!message) {
        return res.status(400).json({ error: "Message is required" });
      }

      // Process the conversational input
      const result = await processConversationalInput(message, conversationHistory, currentData);
      
      if (result.complete) {
        // Generate the actual recipe
        const recipe = await generateRecipeFromConversation(result.data);
        
        // Log user interaction data for B2B insights
        logUserInteractionData(result.data);
        
        // Save recipe if user is authenticated
        if (req.session?.userId) {
          try {
            await storage.createRecipe({
              ...recipe,
              userId: req.session.userId,
              shareId: null
            });
            console.log('💾 Conversational recipe saved for user:', req.session.userId);
          } catch (dbError) {
            console.error('Database save error:', dbError);
          }
        }
        
        return res.json({
          recipe,
          response: null,
          complete: true
        });
      } else {
        // Continue conversation
        return res.json({
          response: result.response,
          suggestions: result.suggestions || [],
          updatedData: result.data,
          complete: false
        });
      }
      
    } catch (error) {
      console.error("❌ Conversational recipe error:", error);
      res.status(500).json({
        error: "Failed to process conversational recipe request",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Analyze fridge image
  app.post("/api/analyze-fridge", upload.single('image'), async (req, res) => {
    try {
      console.log('📷 Fridge analysis request received');
      
      if (!req.file) {
        return res.status(400).json({ error: "No image file provided" });
      }

      const result = await processFridgeImage(req.file.buffer);
      console.log('✅ Fridge analysis completed:', result);
      
      res.json(result);
    } catch (error) {
      console.error("❌ Fridge analysis error:", error);
      res.status(500).json({ 
        error: "Failed to analyze fridge image",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Share recipe
  app.post("/api/recipes/share", async (req, res) => {
    try {
      const { recipeId } = req.body;
      
      if (!recipeId) {
        return res.status(400).json({ error: "Recipe ID is required" });
      }

      // Generate a unique share ID
      const shareId = `share_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Update recipe with share ID
      await storage.updateRecipeShareId(recipeId, shareId);
      
      res.json({ shareId });
    } catch (error) {
      console.error("Share recipe error:", error);
      res.status(500).json({ error: "Failed to share recipe" });
    }
  });

  // Get Gemini API key (for client-side usage)
  app.get("/api/gemini-key", (req, res) => {
    const geminiKey = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
    if (!geminiKey) {
      return res.status(500).json({ error: "Gemini API key not configured" });
    }
    res.json({ key: geminiKey });
  });
}