import type { Express } from "express";
import OpenAI from "openai";
import Replicate from "replicate";
import multer from 'multer';
import { storage } from "../storage";
import { requireAuth } from "./authRoutes";
import { insertRecipeSchema } from "@shared/schema";
import { logGPTInteraction, logSimpleGPTInteraction } from "../developerLogger";
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

// Generate recipe image using DALL-E 3
async function generateRecipeImage(recipeTitle: string, cuisine: string): Promise<string | null> {
  try {
    console.log('🎨 Generating recipe image with DALL-E 3...');
    
    const imagePrompt = `A beautifully plated ${recipeTitle} dish, ${cuisine} cuisine style, professional food photography, appetizing, vibrant colors, restaurant quality presentation, overhead view, natural lighting`;
    
    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt: imagePrompt,
      n: 1,
      size: "1024x1024",
      quality: "standard",
    });

    if (response.data && response.data[0] && response.data[0].url) {
      console.log('✅ Recipe image generated successfully');
      return response.data[0].url;
    }
    
    return null;
  } catch (error) {
    console.error('❌ Failed to generate recipe image:', error);
    return null;
  }
}

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
      await logSimpleGPTInteraction({
        endpoint: 'recipe-ideas',
        prompt: basePrompt,
        response: responseContent,
        model: 'gpt-4o',
        duration,
        inputTokens: completion.usage?.prompt_tokens || 0,
        outputTokens: completion.usage?.completion_tokens || 0,
        cost: ((completion.usage?.prompt_tokens || 0) * 0.03 + (completion.usage?.completion_tokens || 0) * 0.06) / 1000,
        success: true,
        userId: req.session?.userId?.toString() || 'anonymous',
        sessionId: req.session?.id || 'no-session'
      });

      // Enhanced behavioral tracking
      try {
        const userId = req.session?.userId?.toString() || 'anonymous';
        await logUserInteractionData(userId, {
          mode,
          sessionId: req.session?.id,
          action: 'recipe_ideas_generated',
          quizData: req.body,
          recipeCount: recipeData.recipes?.length || 0,
          recipeTitles: recipeData.recipes?.map((r: any) => r.title) || [],
          duration,
          timestamp: new Date().toISOString(),
          // Purchase intent indicators
          customerProfile: {
            supermarket: req.body.supermarket,
            budget: req.body.budget,
            portions: req.body.portions || req.body.servings,
            timeConstraints: req.body.time,
            dietaryNeeds: req.body.dietary,
            cookingAmbition: req.body.ambition,
            equipment: req.body.equipment,
          }
        });
      } catch (trackingError) {
        console.error('Behavioral tracking failed:', trackingError);
      }

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
      // Extract data from either direct params or nested quizData object
      const quizData = req.body.quizData || req.body;
      const {
        portions = quizData.servings,
        timeAvailable = quizData.time,
        equipment = quizData.equipment,
        mood = quizData.mood,
        ambition = quizData.ambition,
        budget = quizData.budget,
        cuisines = quizData.cuisine,
        dietaryRestrictions = quizData.dietary,
        supermarket = quizData.supermarket
      } = req.body;

      console.log('🔥 Generate Recipe Ideas Request:', { portions, timeAvailable, equipment, mood, ambition, budget, cuisines, dietaryRestrictions, supermarket });
      console.log('🔥 Quiz Data:', quizData);
      console.log('🛒 Supermarket extracted:', supermarket, 'from quizData.supermarket:', quizData.supermarket);

      // Build dynamic prompt components
      const timePrompt = getTimePromptText(timeAvailable);
      const moodPrompt = getMoodPromptText(mood);
      const ambitionPrompt = getAmbitionPromptText(ambition);
      const budgetPrompt = getBudgetPromptText(budget);
      const dietPrompt = getDietPromptText(dietaryRestrictions);
      const equipmentPrompt = getEquipmentPromptText(equipment);

      // Get supermarket-specific context - now using proper UK supermarkets
      let supermarketContext = "";
      if (supermarket && supermarket !== "any") {
        const getSupermarketPromptText = (market: string) => {
          const prompts = {
            "tesco": "Shopping at Tesco: Consider their wide range of value, standard, and premium options. Tesco offers good variety in international ingredients and their Finest range for premium items. Focus on accessible pricing with quality options.",
            "sainsburys": "Shopping at Sainsbury's: Take advantage of their Taste the Difference range for quality ingredients and their good selection of organic and specialty items. Known for fresh produce and premium own-brand products.",
            "asda": "Shopping at ASDA: Focus on their Smart Price range for budget ingredients and their Extra Special line for premium touches. Great for bulk buying and family portions at competitive prices.",
            "morrisons": "Shopping at Morrisons: Utilize their fresh markets and butcher counters for quality meat and fish. Their Signature range offers premium ingredients at competitive prices with focus on British sourcing.",
            "waitrose": "Shopping at Waitrose: Take advantage of their premium quality ingredients, extensive organic range, and unique specialty items. Their own-brand products are consistently high quality with artisanal options.",
            "aldi": "Shopping at Aldi: Focus on their excellent value basics and rotating special buys. Their Simply Nature range offers good organic options at budget-friendly prices. Great for cost-effective quality ingredients.",
            "lidl": "Shopping at Lidl: Make use of their great value ingredients and special weekly offers. Their Deluxe range provides premium options without the premium price tag.",
            "marks": "Shopping at M&S: Leverage their premium prepared ingredients and exceptional quality own-brand products. Perfect for special occasion ingredients and time-saving gourmet options.",
            "iceland": "Shopping at Iceland: Great for frozen ingredients that maintain quality. Their premium frozen ranges can provide restaurant-quality ingredients at home with convenient storage.",
            "coop": "Shopping at Co-op: Focus on their ethical and local sourcing. Good for last-minute shopping and their Irresistible range offers quality specialty ingredients with community focus.",
            "local": "Shopping at Local shops: Emphasize seasonal, local ingredients and build relationships with independent suppliers. Focus on fresh, regional specialties and artisanal products.",
            "online": "Online delivery shopping: Consider ingredients that travel well and have good shelf life. Focus on pantry staples, quality proteins, and items that maintain freshness during delivery."
          };
          return prompts[market.toLowerCase()] || `Shopping at ${market}: Choose ingredients that match your selected supermarket's strengths and available product ranges.`;
        };
        
        supermarketContext = `\n\nSUPERMARKET FOCUS: ${getSupermarketPromptText(supermarket)}`;
        console.log('🛒 Supermarket context added:', supermarketContext);
      } else {
        console.log('🛒 No supermarket context - supermarket value:', supermarket);
      }

      const creativityGuidance = getCreativeGuidanceBlock();

      // Add randomization factor to prevent repetitive results
      const randomSeed = Math.random();
      const diversityPrompts = [
        "Explore regional variations and lesser-known traditional dishes.",
        "Include both comfort food classics and restaurant-style presentations.",
        "Mix familiar favorites with adventurous traditional recipes.",
        "Focus on seasonal ingredients and contemporary interpretations.",
        "Blend rustic home cooking with refined culinary techniques."
      ];
      const selectedDiversityPrompt = diversityPrompts[Math.floor(randomSeed * diversityPrompts.length)];

      // Check if a custom prompt was provided (for fridge mode)
      const cuisineList = Array.isArray(cuisines) ? cuisines.join(', ') : cuisines;
      const prompt = req.body.prompt || `You are Zest, Flavr's AI culinary expert. Create exactly 5 DIVERSE and UNIQUE recipe suggestions from ONLY the following cuisine(s): ${cuisineList}

USER PREFERENCES:
• Portions: ${portions}
• ${timePrompt}
• ${moodPrompt}  
• ${ambitionPrompt}
• ${budgetPrompt}
• Selected Cuisine(s): ${cuisineList}
• Equipment: ${formatEquipmentText(equipment)}
${dietPrompt ? `• ${dietPrompt}` : ''}${supermarketContext}

${creativityGuidance}

DIVERSITY MANDATE: ${selectedDiversityPrompt}

CRITICAL INSTRUCTIONS:
When user selects "Mexican" - provide ONLY authentic Mexican recipes (tacos, enchiladas, pozole, mole, etc.)
When user selects "Italian" - provide ONLY Italian recipes (pasta, risotto, pizza, etc.)
Do NOT mix cuisines or create fusion dishes unless specifically requested.

UNIQUENESS REQUIREMENTS:
- Generate exactly 5 COMPLETELY DIFFERENT recipes
- Each recipe must use DIFFERENT primary proteins (chicken, beef, pork, seafood, vegetarian)
- Each recipe must use DIFFERENT cooking techniques (grilling, braising, roasting, sautéing, etc.)
- Each recipe must represent DIFFERENT meal types or regional styles
- ALL recipes MUST be authentic dishes from: ${cuisineList}
- Avoid basic/common dishes - include both familiar AND adventurous options
- Ensure maximum variety in ingredients, complexity, and presentation

RANDOMIZATION SEED: ${randomSeed.toFixed(3)} - Use this to ensure unique results on each generation

Return JSON with this exact structure:
{
  "recipes": [
    {
      "name": "Specific dish name",
      "cuisine": "${Array.isArray(cuisines) ? cuisines[0] : cuisines}",
      "ingredients": ["ingredient 1", "ingredient 2", "ingredient 3", "etc"]
    }
  ]
}`;

      console.log('🎯 Sending prompt to OpenAI...');
      
      // Use the custom prompt or the constructed prompt
      const finalPrompt = req.body.prompt || prompt;
      
      // Log the actual prompt being sent
      console.log('📋 Final prompt being sent:', finalPrompt.substring(0, 500) + '...');
      
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: "You are a JSON API. Respond ONLY with valid JSON - no explanations, no markdown, no text outside the JSON object." },
          { role: "user", content: finalPrompt + "\n\nIMPORTANT: Return ONLY the JSON object, nothing else." }
        ],
        temperature: 0.9,
        max_tokens: 2500,
        response_format: { type: "json_object" }
      });

      const responseContent = completion.choices[0]?.message?.content;
      if (!responseContent) {
        throw new Error("Empty response from OpenAI");
      }

      console.log('📝 Raw OpenAI response preview:', responseContent.substring(0, 200) + '...');

      let recipeData;
      try {
        // Clean the response by removing markdown code blocks if present
        let cleanedResponse = responseContent;
        if (cleanedResponse.includes('```json')) {
          cleanedResponse = cleanedResponse.replace(/```json\n?/g, '').replace(/\n?```/g, '');
        }
        if (cleanedResponse.includes('```')) {
          cleanedResponse = cleanedResponse.replace(/```\n?/g, '');
        }
        
        recipeData = JSON.parse(cleanedResponse.trim());
      } catch (parseError) {
        console.error("❌ JSON parsing failed:", parseError);
        console.log("Raw response:", responseContent);
        throw new Error("Invalid JSON response from AI");
      }

      const duration = Date.now() - startTime;

      // Log successful interaction
      await logSimpleGPTInteraction({
        endpoint: 'generate-recipe-ideas',
        prompt: finalPrompt,
        response: responseContent,
        model: 'gpt-4o',
        duration,
        inputTokens: completion.usage?.prompt_tokens || 0,
        outputTokens: completion.usage?.completion_tokens || 0,
        cost: ((completion.usage?.prompt_tokens || 0) * 0.03 + (completion.usage?.completion_tokens || 0) * 0.06) / 1000,
        success: true,
        userId: req.session?.userId?.toString() || 'anonymous',
        sessionId: req.session?.id || 'no-session'
      });

      // Enhanced behavioral tracking for recipe ideas
      try {
        const userId = req.session?.userId?.toString() || 'anonymous';
        await logUserInteractionData(userId, {
          mode: 'shopping',
          sessionId: req.session?.id,
          action: 'recipe_ideas_generated', 
          quizData: {
            portions: portions || quizData.servings,
            timeAvailable: timeAvailable || quizData.time,
            equipment,
            mood,
            ambition,
            budget,
            cuisines,
            dietaryRestrictions,
            supermarket
          },
          recipeCount: recipeData.recipes?.length || 0,
          recipeTitles: recipeData.recipes?.map((r: any) => r.title) || [],
          recipeCuisines: recipeData.recipes?.map((r: any) => r.cuisine) || [],
          duration,
          timestamp: new Date().toISOString(),
          // Enhanced purchase intent
          customerProfile: {
            supermarketPreference: supermarket,
            budgetSegment: budget,
            householdSize: portions || quizData.servings,
            cookingTime: timeAvailable || quizData.time,
            skillLevel: ambition,
            dietaryProfile: dietaryRestrictions,
            equipmentOwnership: equipment,
            moodContext: mood,
            cuisinePreferences: cuisines
          }
        });
      } catch (trackingError) {
        console.error('Behavioral tracking failed:', trackingError);
      }

      console.log('✅ Recipe ideas generated successfully:', recipeData.recipes?.length || 0, 'recipes');
      res.json(recipeData);

    } catch (error) {
      console.error("❌ Recipe ideas generation failed:", error);
      
      // Log failed interaction
      await logSimpleGPTInteraction({
        endpoint: 'generate-recipe-ideas',
        prompt: 'Error occurred before prompt completion',
        response: '',
        model: 'gpt-4o',
        duration: 0,
        inputTokens: 0,
        outputTokens: 0,
        cost: 0,
        success: false,
        userId: req.session?.userId?.toString() || 'anonymous',
        sessionId: req.session?.id || 'no-session'
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
  "servings": ${parseInt(portions) || 4},
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
        console.log('✅ Recipe JSON parsed successfully');
        console.log('🍽️ Recipe structure:', JSON.stringify(recipeData, null, 2));
        console.log('📋 Ingredients array:', recipeData.ingredients);
        console.log('📝 Instructions array:', recipeData.instructions);
      } catch (parseError) {
        console.error("❌ Recipe JSON parsing failed:", parseError);
        console.log("Raw response:", responseContent);
        throw new Error("Invalid JSON response from recipe AI");
      }

      // Add metadata
      recipeData.mode = mode;
      recipeData.id = Date.now().toString();
      recipeData.createdAt = new Date().toISOString();

      // Generate recipe image
      try {
        const imageUrl = await generateRecipeImage(recipeData.title, recipeData.cuisine || 'international');
        if (imageUrl) {
          recipeData.imageUrl = imageUrl;
        }
      } catch (imageError) {
        console.error('Image generation failed:', imageError);
        // Continue without image - not critical
      }

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

      // Log successful interaction with simplified logging
      await logSimpleGPTInteraction({
        endpoint: 'generate-full-recipe',
        prompt,
        response: responseContent,
        model: 'gpt-4o',
        duration,
        inputTokens: completion.usage?.prompt_tokens || 0,
        outputTokens: completion.usage?.completion_tokens || 0,
        cost: ((completion.usage?.prompt_tokens || 0) * 0.03 + (completion.usage?.completion_tokens || 0) * 0.06) / 1000,
        success: true,
        userId: req.session?.userId?.toString() || 'anonymous',
        sessionId: req.session?.id || 'no-session'
      });

      // Enhanced behavioral tracking for full recipe
      try {
        const userId = req.session?.userId?.toString() || 'anonymous';
        await logUserInteractionData(userId, {
          mode,
          sessionId: req.session?.id,
          interactionType: 'full_recipe_generated',
          page: '/recipe-generation',
          component: 'recipe_generator',
          action: 'recipe_completed',
          selectedRecipe,
          recipeData: {
            title: recipeData.title,
            cuisine: recipeData.cuisine,
            difficulty: recipeData.difficulty,
            cookTime: recipeData.cookTime,
            servings: recipeData.servings,
            ingredientCount: recipeData.ingredients?.length || 0,
            instructionSteps: recipeData.instructions?.length || 0,
            hasImage: !!recipeData.imageUrl
          },
          quizData: {
            portions,
            timeAvailable,
            equipment,
            mood,
            ambition,
            budget,
            cuisines,
            dietaryRestrictions,
            supermarket
          },
          duration,
          timestamp: new Date().toISOString(),
          // Comprehensive purchase intent
          customerProfile: {
            supermarketPreference: supermarket,
            budgetSegment: budget,
            householdSize: parseInt(portions) || 4,
            cookingTime: timeAvailable,
            skillLevel: ambition,
            dietaryProfile: dietaryRestrictions,
            equipmentOwnership: equipment,
            moodContext: mood,
            cuisineSelection: cuisines,
            // Recipe selection behavior
            selectedRecipeTitle: selectedRecipe.title,
            selectedRecipeDifficulty: selectedRecipe.difficulty,
            selectedRecipeCuisine: selectedRecipe.cuisine,
            recipeSelectionTime: duration
          }
        });
      } catch (trackingError) {
        console.error('Behavioral tracking failed:', trackingError);
      }

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

  // Chef Assist Recipe Generation - contextual titles and images
  app.post("/api/chef-assist-recipe", async (req, res) => {
    try {
      const startTime = Date.now();
      const { intent, dietary, time, ambition, equipment, servings } = req.body;

      console.log('👨‍🍳 Chef Assist Recipe Generation:', { intent, servings, time });

      if (!intent) {
        return res.status(400).json({ error: "Intent is required for chef assist mode" });
      }

      // Build context prompts
      const timePrompt = getTimePromptText(time);
      const ambitionPrompt = getAmbitionPromptText(ambition);
      const dietPrompt = getDietPromptText(dietary);
      const equipmentPrompt = getEquipmentPromptText(equipment);
      const strictDietaryInstruction = getStrictDietaryInstruction(dietary);

      const prompt = `You are Zest, Flavr's expert culinary AI. Create a complete recipe based on this cooking intent: "${intent}"

USER PREFERENCES:
• Cooking Intent: ${intent}
• Servings: ${servings}
• Available Time: ${timePrompt}
• Cooking Level: ${ambitionPrompt}
• Equipment Available: ${formatEquipmentText(equipment)}
${dietPrompt ? `• Dietary Requirements: ${dietPrompt}` : ''}

${strictDietaryInstruction}

REQUIREMENTS:
- Generate an appropriate, creative recipe title that matches the intent
- Create a complete recipe with precise measurements for ${servings} servings
- Include comprehensive ingredient list with specific quantities
- Provide detailed, step-by-step cooking instructions
- Add helpful cooking tips and techniques
- Match the complexity to the user's cooking ambition level
- Ensure the recipe can be completed within the available time
- Choose appropriate cuisine style that fits the intent

Return valid JSON only:
{
  "title": "Creative, descriptive recipe name that captures the intent",
  "description": "Appetizing 2-3 sentence description of the finished dish",
  "cuisine": "Most appropriate cuisine style for this recipe",
  "servings": ${parseInt(servings) || 4},
  "cookTime": ${time || 60},
  "difficulty": "Easy/Medium/Hard based on ambition level",
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

      console.log('🤖 Sending prompt to OpenAI for chef assist recipe...');
      
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.8,
        max_tokens: 2000
      });

      const recipeContent = completion.choices[0]?.message?.content;
      if (!recipeContent) {
        throw new Error("No recipe content received from OpenAI");
      }

      console.log('📋 Raw OpenAI response for chef assist:', recipeContent.substring(0, 200));

      let recipeData;
      try {
        // Try to parse the JSON response
        const jsonMatch = recipeContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          recipeData = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error("No JSON found in response");
        }
      } catch (parseError) {
        console.error('JSON parse error for chef assist:', parseError);
        throw new Error("Failed to parse recipe JSON from OpenAI response");
      }

      // Add unique ID and timestamp
      recipeData.id = Date.now().toString();
      recipeData.createdAt = new Date().toISOString();

      // Generate contextual recipe image based on the generated title and cuisine
      try {
        const imageUrl = await generateRecipeImage(recipeData.title, recipeData.cuisine || 'international');
        if (imageUrl) {
          recipeData.imageUrl = imageUrl;
        }
      } catch (imageError) {
        console.error('Image generation failed for chef assist:', imageError);
        // Continue without image - not critical
      }

      // Store recipe in database
      try {
        const userId = req.session?.userId;
        if (userId) {
          await storage.createRecipe({
            userId,
            title: recipeData.title,
            description: recipeData.description,
            ingredients: recipeData.ingredients,
            instructions: recipeData.instructions,
            cookTime: recipeData.cookTime,
            servings: recipeData.servings,
            difficulty: recipeData.difficulty,
            cuisine: recipeData.cuisine,
            imageUrl: recipeData.imageUrl,
            isShared: false,
            mode: 'chef'
          });
          
          console.log('✅ Chef assist recipe saved to database');
        }
      } catch (dbError) {
        console.error('Database save failed for chef assist:', dbError);
        // Continue without database save
      }

      // Log the interaction
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      try {
        const userId = req.session?.userId;
        await logUserInteractionData(userId || 'anonymous', {
          mode: 'chef',
          intent,
          dietary,
          time,
          ambition,
          equipment,
          servings,
          generatedTitle: recipeData.title,
          generatedCuisine: recipeData.cuisine,
          hasImage: !!recipeData.imageUrl,
          duration,
          timestamp: new Date().toISOString()
        });
      } catch (logError) {
        console.error('Failed to log chef assist interaction:', logError);
      }

      console.log(`✅ Chef assist recipe generation completed in ${duration}ms:`, recipeData.title);

      res.json({ recipe: recipeData });

    } catch (error) {
      console.error('❌ Chef assist recipe generation failed:', error);
      res.status(500).json({ 
        error: "Failed to generate chef assist recipe", 
        details: error.message 
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

  // Ingredient substitution endpoint
  app.post("/api/ingredient-substitute", async (req, res) => {
    try {
      const { ingredient, recipeContext } = req.body;
      
      if (!ingredient) {
        return res.status(400).json({ error: "Ingredient is required" });
      }

      console.log('🔄 Processing ingredient substitution:', { ingredient, recipeContext });

      // Generate a simple, contextual substitute using OpenAI
      const prompt = `You are a culinary expert. Suggest a direct 1:1 substitute for "${ingredient}" ${recipeContext?.cuisine ? `in ${recipeContext.cuisine} cooking` : ''}. 
      
      Consider:
      - Recipe title: ${recipeContext?.title || 'General recipe'}
      - Other ingredients: ${recipeContext?.allIngredients?.slice(0, 5).join(', ') || 'Not specified'}
      
      Provide only the substitute ingredient name with appropriate quantity/measurement. Be concise and practical.
      
      Examples:
      - "2 tablespoons bourbon" → "2 tablespoons apple juice"  
      - "1 cup heavy cream" → "1 cup coconut cream"
      - "2 cloves garlic" → "1/2 teaspoon garlic powder"
      
      Substitute for "${ingredient}":`;

      const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
        max_tokens: 50
      });

      const substitute = completion.choices[0]?.message?.content?.trim();
      
      if (!substitute) {
        throw new Error("No substitute suggestion received");
      }

      console.log('✅ Ingredient substitution generated:', { original: ingredient, substitute });

      // Log the substitution for analytics
      await logSimpleGPTInteraction('ingredient_substitution', {
        originalIngredient: ingredient,
        substitute,
        recipeTitle: recipeContext?.title,
        cuisine: recipeContext?.cuisine
      });

      res.json({ 
        substitute: substitute,
        original: ingredient,
        suggestion: substitute
      });

    } catch (error) {
      console.error('❌ Ingredient substitution failed:', error);
      res.status(500).json({ 
        error: "Failed to generate substitute",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
}