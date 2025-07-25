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
import { convertToUKIngredients, convertToUKMeasurements, ukRecipePromptAdditions } from "../ukIngredientMappings";

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

// Initialize global recipe image cache
declare global {
  var recipeImageCache: Map<string, string> | undefined;
}

if (!global.recipeImageCache) {
  global.recipeImageCache = new Map();
}

// Helper function to convert recipe text to UK English
function convertRecipeToUKEnglish(recipe: any): any {
  if (!recipe) return recipe;
  
  const convertedRecipe = { ...recipe };
  
  // Convert recipe title
  if (convertedRecipe.title) {
    convertedRecipe.title = convertToUKIngredients(convertedRecipe.title);
  }
  
  // Convert description
  if (convertedRecipe.description) {
    convertedRecipe.description = convertToUKIngredients(convertedRecipe.description);
  }
  
  // Convert ingredients
  if (convertedRecipe.ingredients && Array.isArray(convertedRecipe.ingredients)) {
    convertedRecipe.ingredients = convertedRecipe.ingredients.map((ingredient: any) => {
      if (typeof ingredient === 'string') {
        return convertToUKIngredients(convertToUKMeasurements(ingredient));
      } else if (ingredient.name && ingredient.amount) {
        return {
          ...ingredient,
          name: convertToUKIngredients(ingredient.name),
          amount: convertToUKMeasurements(ingredient.amount)
        };
      }
      return ingredient;
    });
  }
  
  // Convert instructions
  if (convertedRecipe.instructions && Array.isArray(convertedRecipe.instructions)) {
    convertedRecipe.instructions = convertedRecipe.instructions.map((instruction: any) => {
      if (typeof instruction === 'string') {
        return convertToUKIngredients(convertToUKMeasurements(instruction));
      } else if (instruction.instruction) {
        return {
          ...instruction,
          instruction: convertToUKIngredients(convertToUKMeasurements(instruction.instruction))
        };
      }
      return instruction;
    });
  }
  
  // Convert tips
  if (convertedRecipe.tips && Array.isArray(convertedRecipe.tips)) {
    convertedRecipe.tips = convertedRecipe.tips.map((tip: string) => 
      convertToUKIngredients(convertToUKMeasurements(tip))
    );
  }
  
  return convertedRecipe;
}

// Initialize Replicate for Stable Diffusion
if (!process.env.REPLICATE_API_TOKEN) {
  throw new Error('Missing required Replicate API token: REPLICATE_API_TOKEN');
}
const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

// Helper function to check and enforce usage limits
async function checkAndEnforceUsageLimit(req: any): Promise<{ allowed: boolean; error?: any }> {
  const userId = req.session?.userId;
  const pseudoId = req.headers['x-pseudo-user-id'] as string || req.session?.id || 'anonymous';
  
  try {
    if (userId) {
      const user = await storage.getUser(userId);
      if (user && !user.hasFlavrPlus && (user.recipesThisMonth || 0) >= 3) {
        return { 
          allowed: false, 
          error: { 
            error: "You have no free recipes remaining this month. Sign up for Flavr+ to get unlimited recipes!", 
            recipesUsed: user.recipesThisMonth || 0,
            recipesLimit: 3,
            hasFlavrPlus: false
          }
        };
      }
      return { allowed: true };
    } else {
      let pseudoUser = await storage.getPseudoUser(pseudoId);
      if (!pseudoUser) {
        pseudoUser = await storage.createPseudoUser({ pseudoId });
      }
      
      if ((pseudoUser.recipesThisMonth || 0) >= 3) {
        return { 
          allowed: false, 
          error: { 
            error: "You have no free recipes remaining this month. Sign up for Flavr+ to get unlimited recipes!", 
            recipesUsed: pseudoUser.recipesThisMonth || 0,
            recipesLimit: 3,
            hasFlavrPlus: false
          }
        };
      }
      return { allowed: true };
    }
  } catch (error) {
    console.error("Error checking usage limit:", error);
    return { allowed: true }; // Allow if check fails
  }
}

// Helper function to increment usage after successful generation
async function incrementUsageCounter(req: any): Promise<void> {
  const userId = req.session?.userId;
  const pseudoId = req.headers['x-pseudo-user-id'] as string || req.session?.id || 'anonymous';
  
  console.log('Increment usage - userId:', userId, 'pseudoId:', pseudoId, 'headers:', req.headers['x-pseudo-user-id']);
  
  try {
    if (userId) {
      const user = await storage.getUser(userId);
      if (user && !user.hasFlavrPlus) {
        await storage.updateUserUsage(userId, (user.recipesThisMonth || 0) + 1, user.imagesThisMonth || 0);
      }
    } else {
      const pseudoUser = await storage.getPseudoUser(pseudoId);
      if (pseudoUser) {
        await storage.updatePseudoUserUsage(pseudoId, (pseudoUser.recipesThisMonth || 0) + 1);
      }
    }
  } catch (error) {
    console.error("Error updating usage counter:", error);
  }
}

// Generate recipe image using DALL-E 3
async function generateRecipeImage(recipeTitle: string, cuisine: string): Promise<string | null> {
  try {
    console.log('🎨 Generating recipe image with DALL-E 3...');
    
    const imagePrompt = `A realistic photograph of ${recipeTitle} as it would be expertly plated and served by an accomplished chef. Show the complete dish with all components mentioned in the title, beautifully presented with professional plating techniques. ${cuisine} cuisine style. The food should display excellent knife skills, proper cooking techniques, and thoughtful garnishing - the work of someone with culinary training. Professional presentation with attention to color, texture, and composition. Include any sides, sauces, or accompaniments mentioned in the dish name, artfully arranged. Natural lighting, 45-degree angle view showing restaurant-quality execution while remaining true to the actual dish described.`;
    
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

  // Vision API - Analyze ingredients from image
  app.post("/api/vision/analyze-ingredients", upload.single('image'), processFridgeImage);

  // Helper function to group ingredients by cuisine compatibility
  const groupIngredientsByCuisine = (ingredients: string[]): { [key: string]: string[] } => {
    const asianIngredients = ingredients.filter(ing => 
      ['kimchi', 'gochujang', 'soy sauce', 'sesame oil', 'miso', 'rice wine', 'fish sauce', 'sriracha', 'sweet chili sauce'].some(asian => ing.toLowerCase().includes(asian.toLowerCase()))
    );
    
    const mediterraneanIngredients = ingredients.filter(ing =>
      ['olive oil', 'basil', 'oregano', 'tomato', 'cheese', 'garlic', 'lemon', 'olives', 'balsamic'].some(med => ing.toLowerCase().includes(med.toLowerCase()))
    );
    
    const britishIngredients = ingredients.filter(ing =>
      ['butter', 'cream', 'cheddar', 'ham', 'mustard', 'horseradish', 'pickles'].some(brit => ing.toLowerCase().includes(brit.toLowerCase()))
    );
    
    const neutralIngredients = ingredients.filter(ing =>
      !asianIngredients.includes(ing) && !mediterraneanIngredients.includes(ing) && !britishIngredients.includes(ing)
    );
    
    return {
      asian: asianIngredients,
      mediterranean: mediterraneanIngredients,
      british: britishIngredients,
      neutral: neutralIngredients
    };
  };

  // Fridge2Fork recipe generation
  app.post("/api/generate-fridge-recipe", async (req, res) => {
    try {
      // Support both direct parameters and legacy quizData format
      const data = req.body.quizData || req.body;
      const { 
        ingredients, 
        servings = 4, 
        cookingTime = 30,
        budget = 4.5,
        equipment = ["oven", "stovetop", "basic kitchen tools"],
        dietaryRestrictions = [],
        ingredientFlexibility = "pantry"
      } = data;

      if (!ingredients || ingredients.length === 0) {
        return res.status(400).json({ error: "No ingredients provided" });
      }

      // Check usage limit before generating
      const limitCheck = await checkAndEnforceUsageLimit(req);
      if (!limitCheck.allowed) {
        return res.status(403).json(limitCheck.error);
      }

      // Add random seed for recipe variation with UK consumer-focused enhancement
      const randomSeed = Math.floor(Math.random() * 1000);
      const isReroll = req.body.isReroll || false;
      
      // UK Consumer-focused variation system for Fridge2Fork
      const ukConsumerVariations = {
        cuisines: [
          "British Contemporary", "Italian", "French Bistro", "Mediterranean", "Indian", "Thai", "Chinese", 
          "Mexican", "Spanish", "Greek", "Middle Eastern", "Japanese", "American BBQ", "Moroccan"
        ],
        techniques: [
          "pan-seared", "roasted", "grilled", "braised", "slow-cooked", "sautéed", "poached", "baked", 
          "flash-fried", "confit", "smoked", "char-grilled", "steamed", "caramelised"
        ],
        carbs: [
          "new potatoes", "basmati rice", "pasta", "crusty bread", "quinoa", "couscous", 
          "wild rice", "sweet potato", "polenta", "orzo", "risotto rice", "sourdough"
        ],
        sauces: [
          "herb butter", "lemon vinaigrette", "garlic aioli", "red wine jus", "hollandaise", 
          "pesto", "chimichurri", "tahini drizzle", "balsamic glaze", "curry sauce", "gravy"
        ]
      };
      
      // Use seed to determine UK-focused variations
      const selectedCuisine = ukConsumerVariations.cuisines[randomSeed % ukConsumerVariations.cuisines.length];
      const selectedTechnique = ukConsumerVariations.techniques[Math.floor(randomSeed/100) % ukConsumerVariations.techniques.length];
      const selectedCarb = ukConsumerVariations.carbs[Math.floor(randomSeed/50) % ukConsumerVariations.carbs.length];
      const selectedSauce = ukConsumerVariations.sauces[Math.floor(randomSeed/25) % ukConsumerVariations.sauces.length];
      
      // Enhanced variation prompts for rerolls with UK consumer focus
      const rerollVariationPrompts = [
        `Create ${selectedCuisine} dishes using ${selectedTechnique} technique with ${selectedCarb} base and ${selectedSauce} - ensure meat/fish focus where possible`,
        `Design ${selectedTechnique} recipes with ${selectedCuisine} influences, featuring ${selectedCarb} and ${selectedSauce} for balanced flavor profiles`,
        `Craft ${selectedCuisine}-inspired meals using ${selectedTechnique} cooking method, paired with ${selectedCarb} and enhanced with ${selectedSauce}`,
        `Generate complete dishes using ${selectedTechnique} technique, drawing from ${selectedCuisine} traditions with ${selectedCarb} and ${selectedSauce}`,
        `Create balanced ${selectedCuisine} meals featuring ${selectedTechnique} cooking alongside ${selectedCarb} with ${selectedSauce} for optimal harmony`
      ];
      
      const selectedVariationPrompt = isReroll ? rerollVariationPrompts[randomSeed % rerollVariationPrompts.length] : "";

      // Group ingredients by cuisine compatibility
      const groupedIngredients = groupIngredientsByCuisine(ingredients);
      console.log('Grouped ingredients:', groupedIngredients);

      // Create enhanced prompt using cuisine groups
      const cuisineNotes = [];
      if (groupedIngredients.asian.length > 0) {
        cuisineNotes.push(`Asian ingredients: ${groupedIngredients.asian.join(", ")}`);
      }
      if (groupedIngredients.mediterranean.length > 0) {
        cuisineNotes.push(`Mediterranean ingredients: ${groupedIngredients.mediterranean.join(", ")}`);
      }
      if (groupedIngredients.british.length > 0) {
        cuisineNotes.push(`British/Western ingredients: ${groupedIngredients.british.join(", ")}`);
      }
      if (groupedIngredients.neutral.length > 0) {
        cuisineNotes.push(`Neutral ingredients: ${groupedIngredients.neutral.join(", ")}`);
      }

      const prompt = `You are a creative chef specializing in making delicious COMPLETE MEALS from available ingredients for UK consumers.

VARIATION SEED: ${randomSeed}
UK CONSUMER FOCUS: Prioritize meat, fish, or shellfish proteins with popular cooking techniques and balanced flavor profiles.

${selectedVariationPrompt ? `REROLL MANDATE: ${selectedVariationPrompt}` : `
SEED-BASED PREFERENCES (use ${randomSeed} to influence):
- Cuisine Style: ${selectedCuisine}
- Cooking Technique: ${selectedTechnique}
- Carbohydrate Base: ${selectedCarb}
- Sauce/Dressing: ${selectedSauce}
`}

FLAVOR BALANCE MANDATE: Every dish must achieve harmony between:
- SWEETNESS: Natural sweetness from caramelisation, roasting, or fruit/vegetable elements
- ACIDITY: Citrus, vinegar, wine, or fermented elements for brightness  
- SALTINESS/UMAMI: Proper seasoning plus umami depth from cheese, mushrooms, anchovies, or stocks
- FAT: Richness from oils, butter, nuts, or naturally fatty proteins for mouthfeel and satisfaction

UK CONSUMER CUISINE PREFERENCE - POPULARITY-BASED SELECTION:
When creating recipes, select from cuisines popular with UK consumers:
1. **PRIMARY UK FAVORITES** (Seeds 1-400): Italian, Indian, Chinese, Thai, French, Mediterranean, Greek, Spanish
2. **SECONDARY POPULAR** (Seeds 401-700): Mexican, Japanese, Middle Eastern, Turkish, American, Korean  
3. **EMERGING FAVORITES** (Seeds 701-1000): Vietnamese, Moroccan, Peruvian, Lebanese, Malaysian

**PROTEIN PRIORITIZATION**: 80% of dishes should feature meat, fish, or shellfish as the main component
**COOKING TECHNIQUE FOCUS**: Emphasize popular UK methods - roasting, grilling, pan-frying, slow-cooking, braising

IMPORTANT: Always create COMPLETE DISHES that include:
- Main component using the available ingredients
- At least 1-2 side dishes or accompaniments that complement the main
- Proper sauces, dressings, or condiments
- Garnishes and finishing touches
- A complete balanced meal, not just a single element

AVAILABLE INGREDIENTS BY CUISINE COMPATIBILITY:
${cuisineNotes.join("\n")}

RECIPE CREATION RULES - STRICT INGREDIENT RESTRICTIONS:
- **PRIMARY RULE**: Use ONLY the ingredients provided by the user above
- **ALLOWED ADDITIONS**: Basic pantry staples only (salt, pepper, cooking oil, water, flour, sugar)
- **FORBIDDEN**: Do NOT suggest expensive or specialty ingredients like prawns, lobster, truffle, exotic spices, or proteins not provided by the user
- Create each recipe using ingredients from ONE cuisine group + neutral ingredients from the provided list
- DO NOT mix Asian ingredients (kimchi, gochujang) with Mediterranean/Western ingredients
- Keep cuisine styles separate and authentic
- Use 3-6 compatible ingredients per recipe from the PROVIDED LIST that work together harmoniously
- Each recipe should have a clear cuisine identity based on the available ingredients

CONSTRAINTS:
- Servings: ${servings} people
- Budget per serving: £${(budget / servings).toFixed(2)}
- Equipment: ${equipment.join(", ")}
${dietaryRestrictions.length > 0 ? `- Dietary restrictions: ${dietaryRestrictions.join(", ")}` : ""}

Create 3 DIVERSE recipe suggestions that:
1. Each uses ingredients from ONE cuisine group (don't mix incompatible styles)
2. Focus on proven, traditional flavor combinations
3. Create authentic dishes within each cuisine tradition
4. Use neutral ingredients to support the main cuisine flavors
5. Ensure each recipe makes culinary sense and tastes harmonious

**CRITICAL: Use UK English throughout:**
${ukRecipePromptAdditions.ingredientGuidance}
${ukRecipePromptAdditions.spellingsGuidance}

For each recipe, provide:
- Title
- Brief description (2 sentences max)
- Main cuisine type
- Realistic cooking time based on recipe requirements
- Difficulty level (easy/medium/hard)
- Key ingredients from the provided list

Return a JSON object with this structure:
{
  "recipes": [
    {
      "title": "Recipe Name",
      "description": "Brief description",
      "cuisine": "Cuisine Type",
      "cookTime": "30 minutes",
      "difficulty": "easy",
      "keyIngredients": ["ingredient1", "ingredient2"]
    }
  ]
}`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          { 
            role: "system", 
            content: "You are a culinary expert specializing in ingredient compatibility. Group ingredients by cuisine style and create harmonious flavor combinations. Return only valid JSON, no explanations." 
          },
          { role: "user", content: prompt }
        ],
        temperature: 0.9 // Increased temperature for more creative variation
      });

      let response;
      try {
        const content = completion.choices[0].message.content || "{}";
        // Clean up any potential markdown or extra text
        let cleanContent = content.replace(/```json\n?/g, '').replace(/\n?```/g, '').trim();
        
        // Fix common JSON errors: trailing commas
        cleanContent = cleanContent.replace(/,(\s*[}\]])/g, '$1');
        
        response = JSON.parse(cleanContent);
      } catch (parseError) {
        console.error('JSON parsing error for Fridge2Fork:', parseError);
        console.error('Raw content:', completion.choices[0].message.content);
        
        // Create fallback response
        response = {
          recipes: [
            {
              title: "Quick Ingredient Sauté",
              description: "A simple dish using your available ingredients.",
              cuisine: "International",
              cookTime: "20 minutes",
              difficulty: "easy",
              keyIngredients: ingredients.slice(0, 3)
            }
          ]
        };
      }
      
      // Log the interaction using simplified logging
      await logSimpleGPTInteraction({
        endpoint: "generate-fridge-recipe",
        prompt: prompt,
        response: JSON.stringify(response),
        model: "gpt-3.5-turbo",
        duration: 0,
        inputTokens: Math.ceil(prompt.length / 4),
        outputTokens: Math.ceil(JSON.stringify(response).length / 4),
        cost: 0.001,
        success: true,
        userId: req.session?.userId || undefined
      });

      console.log('🍽️ Fridge2Fork recipes generated:', response.recipes?.length || 0);
      res.json({ recipes: response.recipes || [] });

      // Increment usage counter after successful generation
      incrementUsageCounter(req).catch(err => console.error('Failed to increment usage:', err));
    } catch (error: any) {
      console.error('Fridge recipe generation error:', error);
      res.status(500).json({ error: error.message || "Failed to generate recipes" });
    }
  });

  // Chef Assist inspiration
  app.post("/api/chef-assist/inspire", async (req, res) => {
    try {
      // Add random seed for maximum variation like in recipe generation
      const randomSeed = Math.floor(Math.random() * 10000); // 0-9999 for maximum diversity
      const complexityLevel = Math.floor(Math.random() * 10) + 1; // 1-10 for complexity approaches
      const simpleStyle = Math.floor(Math.random() * 10) + 1; // 1-10 for simple styles
      
      // Complex cooking approaches (1-10)
      let complexityPrompt = "";
      switch (complexityLevel) {
        case 1: // Regional authenticity
          complexityPrompt = "Focus on authentic regional specialties with traditional techniques.";
          break;
        case 2: // Advanced techniques  
          complexityPrompt = "Use sophisticated cooking techniques like confit or professional plating.";
          break;
        case 3: // Fermentation & preservation
          complexityPrompt = "Incorporate fermented ingredients or preserved components for deep flavors.";
          break;
        case 4: // Texture layering
          complexityPrompt = "Focus on multiple textural contrasts in one dish.";
          break;
        case 5: // Umami maximization  
          complexityPrompt = "Build intense umami through browning, reducing, or combining savory elements.";
          break;
        case 6: // Seasonal showcase
          complexityPrompt = "Highlight peak seasonal ingredients with enhancing techniques.";
          break;
        case 7: // Restaurant techniques
          complexityPrompt = "Apply restaurant-quality techniques like proper sauce-making.";
          break;
        case 8: // International mastery
          complexityPrompt = "Master authentic international techniques within one cuisine tradition.";
          break;
        case 9: // Comfort food elevation
          complexityPrompt = "Elevate classic comfort foods with better ingredients and refined methods.";
          break;
        case 10: // Visual artistry
          complexityPrompt = "Create visually stunning presentations with professional plating.";
          break;
      }

      // Simple cooking styles (1-10)
      let simplePrompt = "";
      switch (simpleStyle) {
        case 1: // One-pot simplicity
          simplePrompt = "Create everything in one pot or pan for easy cooking.";
          break;
        case 2: // Fresh and raw
          simplePrompt = "Focus on fresh, minimally cooked ingredients.";
          break;
        case 3: // Quick weeknight
          simplePrompt = "Design for 30 minutes or less total time.";
          break;
        case 4: // Pantry staples
          simplePrompt = "Use common pantry ingredients most people have.";
          break;
        case 5: // Grilled simplicity
          simplePrompt = "Center around simple grilling or roasting techniques.";
          break;
        case 6: // Fresh herb focus
          simplePrompt = "Let fresh herbs be the star with simple preparation.";
          break;
        case 7: // Rustic homestyle
          simplePrompt = "Create rustic, homestyle dishes focused on comfort.";
          break;
        case 8: // Minimal ingredients
          simplePrompt = "Use only 5-7 high-quality ingredients for maximum impact.";
          break;
        case 9: // No-cook assembly
          simplePrompt = "Focus on assembly dishes requiring no actual cooking.";
          break;
        case 10: // Simple but elegant
          simplePrompt = "Create elegantly simple dishes using basic techniques.";
          break;
      }

      // Cuisine selection based on seed ranges for maximum diversity
      let cuisineCategory = "";
      let specificCuisines = [];
      
      const seedRange = randomSeed % 1000;
      if (seedRange < 200) {
        cuisineCategory = "Asian";
        specificCuisines = ["Thai: Street food, curries, salads, noodle dishes", "Vietnamese: Fresh herbs, pho variations, grilled specialties", "Korean: Fermented foods, grilled dishes, comfort foods", "Japanese: Authentic techniques, seasonal dishes, comfort foods", "Chinese: Regional styles, wok dishes, dumplings, noodles", "Indonesian: Curry dishes, grilled specialties, rice preparations", "Malaysian: Curry variations, noodle dishes, coconut-based dishes"];
      } else if (seedRange < 400) {
        cuisineCategory = "Middle Eastern";
        specificCuisines = ["Lebanese: Mezze dishes, grilled meats, rice preparations", "Persian: Rice dishes, stews, grilled specialties", "Turkish: Grilled meats, rice dishes, Mediterranean flavors", "Moroccan: Tagines, couscous dishes, spiced preparations", "Egyptian: Grain dishes, vegetable preparations, spiced specialties"];
      } else if (seedRange < 600) {
        cuisineCategory = "European";
        specificCuisines = ["Italian: Regional specialties, pasta innovations, risottos", "Spanish: Tapas, paellas, regional specialties", "Greek: Traditional dishes, grilled meats, fresh preparations", "Portuguese: Seafood dishes, rice preparations, grilled specialties", "Hungarian: Stews, meat dishes, paprika-based preparations"];
      } else if (seedRange < 800) {
        cuisineCategory = "Latin American";
        specificCuisines = ["Peruvian: Ceviche variations, potato dishes, grilled specialties", "Mexican: Traditional preparations, regional specialties, street food", "Argentinian: Grilled specialties, meat dishes, empanadas", "Brazilian: Rice dishes, grilled meats, tropical preparations"];
      } else {
        cuisineCategory = "Indian Subcontinent";
        specificCuisines = ["Indian: Regional curries, biryanis, tandoor dishes, dals", "Sri Lankan: Curry dishes, rice preparations, coconut-based dishes"];
      }
      
      const selectedCuisine = specificCuisines[randomSeed % specificCuisines.length];
      
      // Combine approaches with seed variation
      const inspirationPrompt = `${complexityPrompt} ${simplePrompt}`;
      
      const prompt = `VARIATION SEED: ${randomSeed}
      
${inspirationPrompt}

SEED-BASED VARIATION REQUIREMENTS:
Use seed ${randomSeed} to ensure maximum diversity. This number must influence:
- Protein selection (seafood, poultry, beef, pork, lamb, game, legumes, grains, vegetables)
- Cooking technique variation (grilled, braised, roasted, sautéed, steamed, fried, slow-cooked)
- Regional authenticity within chosen cuisine
- Ingredient complexity (simple pantry vs specialty ingredients)
- Seasonal influence and ingredient selection
- Preparation style (quick vs elaborate, rustic vs refined)

MANDATORY CUISINE FOCUS: ${cuisineCategory}
SPECIFIC CUISINE: ${selectedCuisine}

IGNORE any previous suggestions you may have given. Generate something COMPLETELY DIFFERENT each time based on the variation seed.

Choose ONE authentic cuisine and create an exciting dish within that tradition:
• Italian: Regional specialties, pasta innovations, risottos, focaccia variations
• French: Provincial classics, bistro favorites, elegant techniques
• Thai: Street food, curries, salads, noodle dishes
• Indian: Regional curries, biryanis, tandoor dishes, dals
• Mexican: Traditional preparations, regional specialties, street food
• Japanese: Authentic techniques, seasonal dishes, comfort foods
• Chinese: Regional styles, wok dishes, dumplings, noodles
• Middle Eastern: Mezze, tagines, kebabs, rice dishes
• Spanish: Tapas, paellas, regional specialties
• Greek: Traditional dishes, grilled meats, fresh preparations
• Korean: Fermented foods, grilled dishes, comfort foods
• Vietnamese: Fresh herbs, pho variations, grilled specialties
• Moroccan: Tagines, couscous dishes, spiced preparations
• Turkish: Grilled meats, rice dishes, Mediterranean flavors
• British: Pub classics, roasts, pies, comfort foods
• German: Hearty stews, sausages, bread specialties
• Russian: Warming soups, dumplings, preserved foods

CREATIVE GUIDELINES:
• Vary protein types: seafood, poultry, beef, pork, lamb, game, legumes, grains, vegetables
• Consider seasonal ingredients and cooking methods
• Balance flavor, texture, and visual appeal

DO NOT mix cuisines or create fusion dishes. Stay authentic to ONE cuisine tradition.

Return only the recipe name in 4-8 words. Be wildly creative and diverse.
Complexity #${complexityLevel} + Style #${simpleStyle}`;

      const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          { role: "system", content: `You are a creative chef who creates authentic dishes from single cuisine traditions. Use variation seed ${randomSeed} to ensure maximum diversity - every click should produce completely different suggestions. Return ONLY the recipe name in 4-8 words using UK English terminology (aubergine not eggplant, courgette not zucchini, chilli not chili, prawns not shrimp). NEVER include difficulty levels. NEVER mix cuisines. Choose ONE authentic cuisine and stay within that tradition. SEED: ${randomSeed}` },
          { role: "user", content: prompt }
        ],
        temperature: 0.9,
        max_tokens: 25
      });

      let suggestion = completion.choices[0].message.content?.trim().replace(/"/g, '') || "Creative fusion surprise";
      
      // Strip out any difficulty level references
      suggestion = suggestion
        .replace(/^(Beginner|Intermediate|Advanced)[:.\s-]*/gi, '')
        .replace(/\s*(Beginner|Intermediate|Advanced)\s*[:.\s-]*/gi, ' ')
        .replace(/^-\s*\*?\*?(Beginner|Intermediate|Advanced)\*?\*?\s*[:.\s-]*/gi, '')
        .replace(/^\s*[-•]\s*/g, '')
        .replace(/\n.*$/g, '') // Remove any additional lines
        .trim();
      
      // Apply UK English conversions to the suggestion text
      suggestion = convertToUKIngredients(suggestion);
      
      res.json({ suggestion });
    } catch (error: any) {
      console.error('Inspire error:', error);
      res.status(500).json({ error: "Failed to generate inspiration" });
    }
  });

  // Chef Assist recipe generation - direct to full recipe
  app.post("/api/chef-assist/generate", async (req, res) => {
    try {
      const { prompt: userPrompt, servings = 4 } = req.body;

      if (!userPrompt) {
        return res.status(400).json({ error: "No prompt provided" });
      }

      // Check usage limit before generating
      const limitCheck = await checkAndEnforceUsageLimit(req);
      if (!limitCheck.allowed) {
        return res.status(403).json(limitCheck.error);
      }

      // Add random seed for recipe variation with reroll-specific enhancement
      const randomSeed = Math.floor(Math.random() * 1000);
      const isReroll = req.body.isReroll || false;
      
      // UK Consumer-focused variation system using seed for targeted preferences
      const ukConsumerVariations = {
        // Popular UK cuisines (seed-based selection)
        cuisines: [
          "British Contemporary", "Italian", "French Bistro", "Mediterranean", "Indian", "Thai", "Chinese", 
          "Mexican", "Spanish", "Greek", "Middle Eastern", "Japanese", "American BBQ", "Moroccan"
        ],
        
        // Popular proteins for UK consumers (weighted for frequency)
        proteins: [
          "chicken breast", "chicken thighs", "lamb chops", "lamb shoulder", "fish", "shellfish", 
          "beef mince", "beef steaks", "pork tenderloin", "pork chops", "fish", "fish",
          "halloumi", "chicken breast", "lamb leg", "shellfish", "fish", "beef joints", "pork belly",
          "fish", "fish", "turkey breast", "duck breast", "fish", "shellfish", "shellfish",
          "venison", "game birds"
        ],
        
        // Popular cooking techniques
        techniques: [
          "pan-seared", "roasted", "grilled", "braised", "slow-cooked", "sautéed", "poached", "baked", 
          "flash-fried", "confit", "smoked", "char-grilled", "steamed", "caramelised"
        ],
        
        // Popular carbohydrate bases
        carbs: [
          "new potatoes", "basmati rice", "pasta", "crusty bread", "quinoa", "couscous", 
          "wild rice", "sweet potato", "polenta", "orzo", "risotto rice", "sourdough"
        ],
        
        // Sauce/dressing styles
        sauces: [
          "herb butter", "lemon vinaigrette", "garlic aioli", "red wine jus", "hollandaise", 
          "pesto", "chimichurri", "tahini drizzle", "balsamic glaze", "curry sauce", "gravy"
        ]
      };
      
      // Use seed to determine UK-focused variations
      const selectedCuisine = ukConsumerVariations.cuisines[randomSeed % ukConsumerVariations.cuisines.length];
      const selectedProtein = ukConsumerVariations.proteins[Math.floor(randomSeed/10) % ukConsumerVariations.proteins.length];
      const selectedTechnique = ukConsumerVariations.techniques[Math.floor(randomSeed/100) % ukConsumerVariations.techniques.length];
      const selectedCarb = ukConsumerVariations.carbs[Math.floor(randomSeed/50) % ukConsumerVariations.carbs.length];
      const selectedSauce = ukConsumerVariations.sauces[Math.floor(randomSeed/25) % ukConsumerVariations.sauces.length];
      
      // Enhanced variation prompts for rerolls with UK consumer focus
      const rerollVariationPrompts = [
        `Create a ${selectedCuisine} dish featuring ${selectedProtein} using ${selectedTechnique} technique with ${selectedCarb} and ${selectedSauce} - ensure complete flavor balance`,
        `Design a ${selectedTechnique} ${selectedProtein} dish with ${selectedCuisine} influences, served with ${selectedCarb} and complemented by ${selectedSauce}`,
        `Craft a ${selectedCuisine}-inspired meal centered on ${selectedTechnique} ${selectedProtein}, paired with ${selectedCarb} and enhanced with ${selectedSauce}`,
        `Generate a complete ${selectedProtein} dish using ${selectedTechnique} method, drawing from ${selectedCuisine} traditions with ${selectedCarb} and ${selectedSauce}`,
        `Create a balanced ${selectedCuisine} meal featuring ${selectedTechnique} ${selectedProtein} alongside ${selectedCarb} with ${selectedSauce} for optimal flavor harmony`
      ];
      
      const selectedVariationPrompt = isReroll ? rerollVariationPrompts[randomSeed % rerollVariationPrompts.length] : "";

      // Generate complete recipe directly with UK consumer focus
      const systemPrompt = `You are an expert chef specializing in dishes popular with UK consumers. Create a complete dish with suitable accompaniments based on the user's request.

VARIATION SEED: ${randomSeed}
UK CONSUMER FOCUS: Prioritize meat, fish, or shellfish proteins with popular cooking techniques and balanced flavor profiles.

${selectedVariationPrompt ? `REROLL MANDATE: ${selectedVariationPrompt}` : `
SEED-BASED PREFERENCES (use ${randomSeed} to influence):
- Cuisine Style: ${selectedCuisine}
- Primary Protein: ${selectedProtein} 
- Cooking Technique: ${selectedTechnique}
- Carbohydrate Base: ${selectedCarb}
- Sauce/Dressing: ${selectedSauce}
`}

FLAVOR BALANCE MANDATE: Every dish must achieve harmony between:
- SWEETNESS: Natural sweetness from caramelisation, roasting, or fruit/vegetable elements
- ACIDITY: Citrus, vinegar, wine, or fermented elements for brightness  
- SALTINESS/UMAMI: Proper seasoning plus umami depth from cheese, mushrooms, anchovies, or stocks
- FAT: Richness from oils, butter, nuts, or naturally fatty proteins for mouthfeel and satisfaction

UK CONSUMER PREFERENCE INTEGRATION: Use variation seed ${randomSeed} to influence the entire output through:

- Main protein selection prioritizing meat, fish, or shellfish preferred by UK consumers
- Popular UK cooking techniques (roasting, grilling, braising, pan-searing, slow-cooking)
- Carbohydrate bases commonly enjoyed (potatoes, rice, pasta, bread)  
- Sauce and dressing styles that complement British palates
- Regional authenticity within chosen cuisine tradition
- Balance of richness vs. freshness appropriate for UK preferences
- Seasoning and spice levels suited to mainstream UK tastes
- Presentation style from rustic comfort to refined restaurant quality

UK CONSUMER CUISINE PREFERENCE - POPULARITY-BASED SELECTION:
When the user request is vague or open-ended, select from cuisines popular with UK consumers using the variation seed:

1. **PRIMARY UK FAVORITES** (Seeds 1-400): Italian, Indian, Chinese, Thai, French, Mediterranean, Greek, Spanish
2. **SECONDARY POPULAR** (Seeds 401-700): Mexican, Japanese, Middle Eastern, Turkish, American, Korean  
3. **EMERGING FAVORITES** (Seeds 701-1000): Vietnamese, Moroccan, Peruvian, Lebanese, Malaysian

**PROTEIN PRIORITIZATION**: 80% of dishes should feature meat, fish, or shellfish as the main component
**COOKING TECHNIQUE FOCUS**: Emphasize popular UK methods - roasting, grilling, pan-frying, slow-cooking, braising
**FLAVOR BALANCE**: Ensure each dish achieves the four-pillar balance (sweet, acid, salt/umami, fat)
**CARBOHYDRATE INTEGRATION**: Include popular bases like potatoes, rice, pasta, or quality bread
**SAUCE/DRESSING**: Feature complementary sauces that enhance rather than mask the main protein

IMPORTANT: Always create COMPLETE DISHES that include:
- Main component (protein, vegetable, or grain-based centrepiece)
- At least 1–2 complementary side dishes
- Proper sauces, dressings, or condiments to enhance flavour
- Garnishes and visual/textural contrasts for plating appeal
- A fully balanced meal — not just a main on its own

User request: ${userPrompt}
Servings: ${servings}

Create a complete recipe based on this request: "${userPrompt}"

REQUIREMENTS:
- Servings: ${servings}
- Calculate a realistic cooking time based on actual recipe steps
- Use ingredients commonly available in UK supermarkets
- UK measurement units ONLY (e.g. grams, ml, tbsp, tsp, litres) — DO NOT use cups or ounces
- Make it achievable for a home cook
- Stay completely authentic to ONE cuisine tradition (e.g., Italian, French, Thai, Indian, Mexican, Japanese, Chinese, etc.)
  - No fusion or cross-cuisine blends
  - Stay regionally consistent within that cuisine if appropriate
- Ensure at least 3 clear differences in dish structure or flavour if the same prompt is used with different variation seeds
- Include at least one visual or textural contrast element

**CRITICAL: Use UK English throughout this recipe:**
${ukRecipePromptAdditions.ingredientGuidance}
${ukRecipePromptAdditions.measurementGuidance}
${ukRecipePromptAdditions.spellingsGuidance}

Return ONLY a valid JSON object with this exact structure (NO markdown, no explanations, and no trailing commas):

{
  "title": "Recipe Name",
  "description": "Brief description of the dish, including any regional focus and standout flavours",
  "cuisine": "Cuisine Type",
  "difficulty": "[easy | medium | hard] (determine based on actual complexity)",
  "prepTime": 15,
  "cookTime": [REALISTIC total cooking time in minutes],
  "servings": ${servings},
  "ingredients": [
    {"name": "ingredient name only", "amount": "UK quantity (e.g. '2 tbsp', '400g', '250ml')"}
  ],
  "instructions": [
    {"step": 1, "instruction": "Detailed instruction"},
    {"step": 2, "instruction": "Continue in this format"}
  ],
  "tips": [
    "Helpful tip that improves flavour, speed, or presentation"
  ],
  "nutritionalHighlights": [
    "Nutritional benefit (e.g. 'High in fibre', 'Rich in omega-3')"
  ]
}`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4o", // Keep quality model but use async operations for speed
        messages: [
          { role: "system", content: "You are a JSON API. Return only valid JSON, no explanations." },
          { role: "user", content: systemPrompt }
        ],
        temperature: 0.8 // Increased temperature for more recipe variation
      });

      let recipe;
      try {
        const content = completion.choices[0].message.content || "{}";
        // Clean up any potential markdown, extra text, and trailing commas
        let cleanContent = content.replace(/```json\n?/g, '').replace(/\n?```/g, '').trim();
        
        // Fix common JSON errors: trailing commas in arrays and objects
        cleanContent = cleanContent.replace(/,(\s*[}\]])/g, '$1');
        // Fix trailing commas specifically after object entries in arrays
        cleanContent = cleanContent.replace(/},(\s*\])/g, '}$1');
        
        recipe = JSON.parse(cleanContent);
      } catch (parseError) {
        console.error('JSON parsing error:', parseError);
        console.error('Raw content:', completion.choices[0].message.content);
        throw new Error('Failed to parse recipe JSON from AI response');
      }
      
      // Apply UK English conversions to recipe text
      recipe = convertRecipeToUKEnglish(recipe);
      
      // Send recipe immediately to user for faster response
      res.json({ recipe });

      // Increment usage counter after successful generation
      incrementUsageCounter(req).catch(err => console.error('Failed to increment usage:', err));

      // Generate image and log in background (don't await)
      generateRecipeImage(recipe.title, recipe.cuisine).then(imageUrl => {
        if (imageUrl) {
          console.log('🎨 Background image generated for:', recipe.title);
          // Store the image URL in a simple memory cache for retrieval
          if (!global.recipeImageCache) {
            global.recipeImageCache = new Map();
          }
          global.recipeImageCache.set(recipe.title, imageUrl);
        }
      }).catch(err => console.error('Background image generation failed:', err));

      // Log the interaction in background
      logSimpleGPTInteraction({
        endpoint: "chef-assist-generate", 
        prompt: systemPrompt,
        response: JSON.stringify(recipe),
        model: "gpt-4o",
        duration: 0,
        inputTokens: Math.ceil(systemPrompt.length / 4),
        outputTokens: Math.ceil(JSON.stringify(recipe).length / 4),
        cost: 0.001,
        success: true,
        userId: req.session?.userId || undefined
      }).catch(err => console.error('Background logging failed:', err));
    } catch (error: any) {
      console.error('Chef assist generation error:', error);
      res.status(500).json({ error: error.message || "Failed to generate recipe" });
    }
  });

  // Generate full recipe from recipe idea (for Fridge2Fork)
  app.post("/api/generate-full-recipe", async (req, res) => {
    try {
      const { recipeIdea, quizData } = req.body;

      if (!recipeIdea) {
        return res.status(400).json({ error: "No recipe idea provided" });
      }

      // Check usage limit before generating
      const limitCheck = await checkAndEnforceUsageLimit(req);
      if (!limitCheck.allowed) {
        return res.status(403).json(limitCheck.error);
      }

      const { 
        ingredients = [],
        servings = 4,
        cookingTime = 30,
        budget = 4.5,
        equipment = ["oven", "stovetop"],
        dietaryRestrictions = []
      } = quizData || {};

      // Add UK consumer-focused reroll variation logic for shopping mode
      const isReroll = req.body.isReroll || false;
      const randomSeed = Math.floor(Math.random() * 1000);
      
      // UK Consumer-focused variation system for Shopping Mode
      const ukConsumerVariations = {
        cuisines: [
          "British Contemporary", "Italian", "French Bistro", "Mediterranean", "Indian", "Thai", "Chinese", 
          "Mexican", "Spanish", "Greek", "Middle Eastern", "Japanese", "American BBQ", "Moroccan"
        ],
        proteins: [
          "chicken breast", "chicken thighs", "lamb chops", "lamb shoulder", "fish", "shellfish", 
          "beef mince", "beef steaks", "pork tenderloin", "pork chops", "fish", "fish",
          "halloumi", "chicken breast", "lamb leg", "shellfish", "fish", "beef joints", "pork belly",
          "fish", "fish", "turkey breast", "duck breast", "fish", "shellfish", "shellfish",
          "venison", "game birds"
        ],
        techniques: [
          "pan-seared", "roasted", "grilled", "braised", "slow-cooked", "sautéed", "poached", "baked", 
          "flash-fried", "confit", "smoked", "char-grilled", "steamed", "caramelised"
        ],
        carbs: [
          "new potatoes", "basmati rice", "pasta", "crusty bread", "quinoa", "couscous", 
          "wild rice", "sweet potato", "polenta", "orzo", "risotto rice", "sourdough"
        ],
        sauces: [
          "herb butter", "lemon vinaigrette", "garlic aioli", "red wine jus", "hollandaise", 
          "pesto", "chimichurri", "tahini drizzle", "balsamic glaze", "curry sauce", "gravy"
        ]
      };
      
      // Use seed to determine UK-focused variations
      const selectedCuisine = ukConsumerVariations.cuisines[randomSeed % ukConsumerVariations.cuisines.length];
      const selectedProtein = ukConsumerVariations.proteins[Math.floor(randomSeed/10) % ukConsumerVariations.proteins.length];
      const selectedTechnique = ukConsumerVariations.techniques[Math.floor(randomSeed/100) % ukConsumerVariations.techniques.length];
      const selectedCarb = ukConsumerVariations.carbs[Math.floor(randomSeed/50) % ukConsumerVariations.carbs.length];
      const selectedSauce = ukConsumerVariations.sauces[Math.floor(randomSeed/25) % ukConsumerVariations.sauces.length];
      
      // Enhanced variation prompts for rerolls with UK consumer focus
      const rerollVariationPrompts = [
        `Create a ${selectedCuisine} version of this concept featuring ${selectedProtein} using ${selectedTechnique} technique with ${selectedCarb} and ${selectedSauce}`,
        `Design a ${selectedTechnique} interpretation with ${selectedCuisine} influences, featuring ${selectedProtein} served with ${selectedCarb} and ${selectedSauce}`,
        `Craft a ${selectedCuisine}-inspired version centered on ${selectedTechnique} ${selectedProtein}, paired with ${selectedCarb} and enhanced with ${selectedSauce}`,
        `Generate a complete ${selectedProtein} dish using ${selectedTechnique} method, drawing from ${selectedCuisine} traditions with ${selectedCarb} and ${selectedSauce}`,
        `Create a balanced ${selectedCuisine} interpretation featuring ${selectedTechnique} ${selectedProtein} alongside ${selectedCarb} with ${selectedSauce}`
      ];
      
      const selectedVariationPrompt = isReroll ? rerollVariationPrompts[randomSeed % rerollVariationPrompts.length] : "";

      // Generate complete recipe from the idea with UK consumer focus
      const systemPrompt = `You are an expert chef creating a complete recipe based on this concept for UK consumers:

RECIPE CONCEPT: ${recipeIdea.title}
DESCRIPTION: ${recipeIdea.description || "A delicious dish using your available ingredients"}
CUISINE: ${recipeIdea.cuisine || "International"}

VARIATION SEED: ${randomSeed}
UK CONSUMER FOCUS: Prioritize meat, fish, or shellfish proteins with popular cooking techniques and balanced flavor profiles.

${selectedVariationPrompt ? `REROLL MANDATE: ${selectedVariationPrompt}` : `
SEED-BASED PREFERENCES (use ${randomSeed} to influence):
- Cuisine Style: ${selectedCuisine}
- Primary Protein: ${selectedProtein}
- Cooking Technique: ${selectedTechnique}
- Carbohydrate Base: ${selectedCarb}
- Sauce/Dressing: ${selectedSauce}
`}

FLAVOR BALANCE MANDATE: Every dish must achieve harmony between:
- SWEETNESS: Natural sweetness from caramelisation, roasting, or fruit/vegetable elements
- ACIDITY: Citrus, vinegar, wine, or fermented elements for brightness  
- SALTINESS/UMAMI: Proper seasoning plus umami depth from cheese, mushrooms, anchovies, or stocks
- FAT: Richness from oils, butter, nuts, or naturally fatty proteins for mouthfeel and satisfaction

AVAILABLE INGREDIENTS: ${ingredients.join(", ")}
CONSTRAINTS:
- Servings: ${servings}
- Budget per serving: £${(budget / servings).toFixed(2)}
- Equipment: ${equipment.join(", ")}
${dietaryRestrictions.length > 0 ? `- Dietary restrictions: ${dietaryRestrictions.join(", ")}` : ""}

STRICT INGREDIENT CONSTRAINTS:
- **PRIMARY RULE**: Use ONLY the ingredients provided by the user above
- **ALLOWED ADDITIONS**: Basic pantry staples only (salt, pepper, cooking oil, water, flour, sugar, common dried herbs/spices)
- **FORBIDDEN**: Do NOT add expensive ingredients like prawns, specialty cheeses, exotic spices, or proteins not provided by the user

Create a COMPLETE recipe that:
1. Uses ONLY ingredients from the available list plus basic pantry staples
2. Focus on making the best possible dish with what's actually available
3. Substitute intelligently within the provided ingredients only (e.g., if pasta and tomatoes available, make pasta dish)
4. Add only common pantry basics for proper seasoning and cooking
5. Prioritize authentic preparation using the available ingredients
6. Include exact measurements and clear instructions within the time and equipment constraints

**CRITICAL: Use UK English throughout this recipe:**
${ukRecipePromptAdditions.ingredientGuidance}
${ukRecipePromptAdditions.measurementGuidance}
${ukRecipePromptAdditions.spellingsGuidance}

Return ONLY a valid JSON object with this exact structure (NO trailing commas):
{
  "title": "${recipeIdea.title}",
  "description": "Enhanced description",
  "cuisine": "${recipeIdea.cuisine}",
  "difficulty": "${recipeIdea.difficulty}",
  "prepTime": [Calculate realistic prep time based on recipe complexity],
  "cookTime": [Calculate REALISTIC total cooking time in minutes based on all recipe steps including baking/braising/marinating],
  "servings": ${servings},
  "ingredients": [{"name": "ingredient name", "amount": "UK measurement"}],
  "instructions": [{"step": 1, "instruction": "detailed step"}],
  "tips": ["helpful cooking tip"],
  "nutritionalHighlights": ["nutritional benefit"]
}

CRITICAL: Ensure NO trailing commas after the last item in any array or object. Return ONLY the JSON object, no markdown, no explanations.`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4o", // Keep quality model but use async operations for speed
        messages: [
          { role: "system", content: "You are a JSON API. Return only valid JSON, no explanations." },
          { role: "user", content: systemPrompt }
        ],
        temperature: 0.7
      });

      // Clean and parse the JSON response for Fridge2Fork
      let recipe;
      try {
        let content = completion.choices[0].message.content || "{}";
        
        // Remove any markdown code blocks
        content = content.replace(/```json\n?/g, '').replace(/\n?```/g, '').trim();
        
        // Remove any leading/trailing text that's not JSON
        const jsonStart = content.indexOf('{');
        const jsonEnd = content.lastIndexOf('}');
        if (jsonStart !== -1 && jsonEnd !== -1) {
          content = content.substring(jsonStart, jsonEnd + 1);
        }
        
        // Fix common JSON errors
        content = content.replace(/,(\s*[}\]])/g, '$1'); // trailing commas before closing brackets
        content = content.replace(/},(\s*\])/g, '}$1'); // trailing commas in object arrays
        content = content.replace(/,(\s*$)/g, ''); // trailing commas at end of string
        
        recipe = JSON.parse(content);
      } catch (parseError) {
        console.error('Fridge2Fork JSON parsing error:', parseError);
        console.error('Raw content:', completion.choices[0].message.content);
        throw new Error('Failed to parse AI recipe response. Please try again.');
      }
      
      // Apply UK English conversions to recipe text
      recipe = convertRecipeToUKEnglish(recipe);
      
      // Send recipe immediately to user for faster response
      res.json({ recipe });

      // Increment usage counter after successful generation
      incrementUsageCounter(req).catch(err => console.error('Failed to increment usage:', err));

      // Generate image and log in background (don't await)
      generateRecipeImage(recipe.title, recipe.cuisine).then(imageUrl => {
        if (imageUrl) {
          console.log('🎨 Background image generated for Fridge2Fork:', recipe.title);
        }
      }).catch(err => console.error('Background image generation failed:', err));

      // Log in background
      logSimpleGPTInteraction({
        endpoint: "generate-full-recipe",
        prompt: systemPrompt,
        response: JSON.stringify(recipe),
        model: "gpt-4o", 
        duration: 0,
        inputTokens: Math.ceil(systemPrompt.length / 4),
        outputTokens: Math.ceil(JSON.stringify(recipe).length / 4),
        cost: 0.001,
        success: true,
        userId: req.session?.userId || undefined
      }).catch(err => console.error('Background logging failed:', err));
    } catch (error: any) {
      console.error('Chef assist generation error:', error);
      res.status(500).json({ error: error.message || "Failed to generate recipe" });
    }
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

      // Check usage limit before generating
      const limitCheck = await checkAndEnforceUsageLimit(req);
      if (!limitCheck.allowed) {
        return res.status(403).json(limitCheck.error);
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
          return prompts[market as keyof typeof prompts] || "";
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

      // Increment usage counter after successful generation
      incrementUsageCounter(req).catch(err => console.error('Failed to increment usage:', err));
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
      
      // Check usage limit before generating
      const limitCheck = await checkAndEnforceUsageLimit(req);
      if (!limitCheck.allowed) {
        return res.status(403).json(limitCheck.error);
      }

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

      // Increment usage counter after successful generation
      incrementUsageCounter(req).catch(err => console.error('Failed to increment usage:', err));

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
          return prompts[market as keyof typeof prompts] || "";
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
- Calculate REALISTIC total cooking time based on all recipe steps (including marination, baking, braising etc.)

Return valid JSON only:
{
  "title": "${selectedRecipe.title}",
  "description": "Appetizing 2-3 sentence description of the finished dish",
  "cuisine": "${selectedRecipe.cuisine}",
  "servings": ${parseInt(portions) || 4},
  "cookTime": [Calculate REALISTIC total minutes based on all cooking steps],
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

      // Start image generation in background (don't await)
      generateRecipeImage(recipeData.title, recipeData.cuisine || 'international').then(imageUrl => {
        if (imageUrl) {
          console.log('🎨 Background image generated for fridge mode:', recipeData.title);
          // Store in cache for retrieval
          if (!global.recipeImageCache) {
            global.recipeImageCache = new Map();
          }
          global.recipeImageCache.set(recipeData.title, imageUrl);
        }
      }).catch(err => console.error('Background image generation failed:', err));

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

      // Check usage limit before generating
      const limitCheck = await checkAndEnforceUsageLimit(req);
      if (!limitCheck.allowed) {
        return res.status(403).json(limitCheck.error);
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

      // Start image generation in background (don't await)
      generateRecipeImage(recipeData.title, recipeData.cuisine || 'international').then(imageUrl => {
        if (imageUrl) {
          console.log('🎨 Background image generated for shopping mode:', recipeData.title);
          // Store in cache for retrieval
          if (!global.recipeImageCache) {
            global.recipeImageCache = new Map();
          }
          global.recipeImageCache.set(recipeData.title, imageUrl);
        }
      }).catch(err => console.error('Background image generation failed:', err));

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

      // Increment usage counter after successful generation
      incrementUsageCounter(req).catch(err => console.error('Failed to increment usage:', err));

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

  // Save recipe endpoint (favorite)
  app.post("/api/save-recipe", requireAuth, async (req, res) => {
    try {
      const { 
        title, 
        description, 
        cuisine, 
        difficulty, 
        cookTime, 
        servings, 
        ingredients, 
        instructions, 
        tips, 
        mode, 
        imageUrl 
      } = req.body;
      
      if (!req.session?.userId) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const recipeData = {
        title,
        description,
        cuisine,
        difficulty,
        cookTime,
        servings,
        ingredients,
        instructions,
        tips,
        mode,
        imageUrl,
        userId: req.session.userId,
        shareId: null
      };

      const recipe = await storage.createRecipe(recipeData);
      
      res.json({ 
        success: true, 
        recipeId: recipe.id,
        message: "Recipe saved to My Cookbook" 
      });
    } catch (error) {
      console.error('Failed to save recipe:', error);
      res.status(500).json({ error: 'Failed to save recipe' });
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

  // Get quota status for current user
  app.get("/api/quota-status", async (req, res) => {
    try {
      const pseudoUserId = req.headers['x-pseudo-user-id'] as string;
      
      // Check if authenticated user
      if (req.session?.userId) {
        const user = await storage.getUser(req.session.userId);
        if (user?.hasFlavrPlus || user?.email === 'william@blycontracting.co.uk') {
          return res.json({ remainingRecipes: -1, isUnlimited: true }); // Unlimited
        }
        // Regular authenticated users get database usage count
        const usage = await storage.getUserUsageCount(req.session.userId);
        return res.json({ remainingRecipes: Math.max(0, 3 - usage) });
      }
      
      // For pseudo users
      if (pseudoUserId) {
        const usage = await storage.getPseudoUserUsageCount(pseudoUserId);
        return res.json({ remainingRecipes: Math.max(0, 3 - usage) });
      }
      
      // New user
      res.json({ remainingRecipes: 3 });
    } catch (error) {
      console.error('Quota status error:', error);
      res.json({ remainingRecipes: 3 }); // Default to 3 on error
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

  // AI-powered step timing endpoint
  app.post("/api/get-step-timing", async (req, res) => {
    try {
      const { instruction } = req.body;

      if (!instruction) {
        return res.status(400).json({ error: "Instruction is required" });
      }

      const prompt = `As a professional chef and cooking instructor, determine the optimal cooking time for this specific step:

"${instruction}"

Consider:
- The specific cooking method being used
- The type and quantity of ingredients mentioned
- Food safety requirements for proteins
- Typical cooking times for the technique described
- Any contextual clues about doneness or completion

IMPORTANT: Respond with ONLY a number representing the time in MINUTES. If the instruction mentions hours, convert to minutes first.

Examples:
- "Sear chicken breast until golden" → 4
- "Cook spaghetti until al dente" → 10
- "Bake at 200°C until golden brown" → 25
- "Simmer tomato sauce" → 15
- "Rest the meat" → 5
- "Braise for 1.5 hours" → 90
- "Cook for 2 hours" → 120

Response (number in minutes only):`;

      const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.3,
        max_tokens: 10,
      });

      const content = response.choices[0].message.content?.trim();
      const duration = parseInt(content || "5");

      // Validate the response is a reasonable number
      const finalDuration = isNaN(duration) || duration < 1 || duration > 480 
        ? 5 // Default to 5 minutes for invalid responses
        : duration;

      console.log(`🕒 AI Step Timing: "${instruction}" → AI returned: ${content} → Final: ${finalDuration} minutes`);

      res.json({ duration: finalDuration });
    } catch (error) {
      console.error("Error getting AI step timing:", error);
      res.status(500).json({ error: "Failed to get step timing", duration: 5 });
    }
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
      const prompt = `You are a culinary expert helping with ingredient substitutions. Return ONLY valid JSON.

Recipe: ${recipeContext?.title || 'General recipe'}
Cuisine: ${recipeContext?.cuisine || 'General'}
Ingredient to substitute: "${ingredient}"
All ingredients: ${recipeContext?.allIngredients?.join(', ') || 'Not specified'}
Current instructions: 
${recipeContext?.instructions?.map((step, i) => `Step ${i + 1}: ${step}`).join('\n') || 'Not provided'}

Provide a JSON response with:
1. "substitute" - the replacement ingredient with quantity/measurement
2. "updatedInstructions" - array of cooking steps with the original ingredient references updated

Format:
{
  "substitute": "replacement ingredient with quantity",
  "updatedInstructions": ["updated step 1", "updated step 2", ...]
}

If no instruction updates are needed, return the original instructions unchanged.

Important: Return each instruction as a separate array element, do not combine multiple steps into one.`;

      const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
        max_tokens: 300
      });

      const content = completion.choices[0]?.message?.content?.trim();
      let result;
      
      try {
        result = JSON.parse(content || '{}');
        // Ensure updatedInstructions is an array
        if (!Array.isArray(result.updatedInstructions)) {
          console.log('⚠️ updatedInstructions is not an array, using original instructions');
          result.updatedInstructions = recipeContext?.instructions || [];
        }
      } catch (parseError) {
        // Fallback to simple substitution if JSON parsing fails
        console.log('⚠️ JSON parsing failed, using fallback');
        result = {
          substitute: content || ingredient,
          updatedInstructions: recipeContext?.instructions || []
        };
      }
      
      console.log('✅ Ingredient substitution generated:', { 
        original: ingredient, 
        substitute: result.substitute,
        instructionsUpdated: result.updatedInstructions?.length || 0
      });

      // Log the substitution for analytics
      await logSimpleGPTInteraction('ingredient_substitution', {
        originalIngredient: ingredient,
        substitute: result.substitute,
        recipeTitle: recipeContext?.title,
        cuisine: recipeContext?.cuisine
      });

      res.json({ 
        substitute: result.substitute,
        original: ingredient,
        suggestion: result.substitute,
        updatedInstructions: result.updatedInstructions
      });

    } catch (error) {
      console.error('❌ Ingredient substitution failed:', error);
      res.status(500).json({ 
        error: "Failed to generate substitute",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Nutritional Analysis endpoint
  app.post("/api/nutrition/analyze", async (req, res) => {
    try {
      const { title, ingredients, servings } = req.body;

      if (!ingredients || !Array.isArray(ingredients) || ingredients.length === 0) {
        return res.status(400).json({ error: "Ingredients array is required" });
      }

      console.log('🔬 Analyzing nutrition for:', { title, ingredientCount: ingredients.length, servings });

      const prompt = `Analyze the nutritional content of this recipe and provide detailed nutritional information per serving.

Recipe: ${title}
Ingredients: ${ingredients.join(", ")}
Servings: ${servings}

Please calculate and return the following nutritional information PER SERVING:

1. Calories per serving
2. Protein (grams) per serving
3. Carbohydrates (grams) per serving
4. Total fat (grams) per serving
5. Fiber (grams) per serving
6. Sugar (grams) per serving
7. Sodium (milligrams) per serving

Consider typical serving sizes and nutritional values for each ingredient. Be realistic and accurate.

Return the data in this exact JSON format (all values are per serving):
{
  "calories": [calories_per_serving],
  "protein": [protein_per_serving],
  "carbs": [carbs_per_serving],
  "fat": [fat_per_serving],
  "fiber": [fiber_per_serving],
  "sugar": [sugar_per_serving],
  "sodium": [sodium_per_serving]
}`;

      const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          { 
            role: "system", 
            content: "You are a nutrition expert. Analyze recipes and provide accurate nutritional information. Return only valid JSON."
          },
          { role: "user", content: prompt }
        ],
        temperature: 0.3 // Lower temperature for more consistent results
      });

      let nutritionData;
      try {
        const content = completion.choices[0].message.content || "{}";
        const cleanContent = content.replace(/```json\n?/g, '').replace(/\n?```/g, '').trim();
        nutritionData = JSON.parse(cleanContent);
      } catch (parseError) {
        console.error('Failed to parse nutrition data:', parseError);
        return res.status(500).json({ error: "Failed to parse nutritional analysis" });
      }

      // Validate the nutrition data structure
      if (!nutritionData.calories || !nutritionData.protein || !nutritionData.carbs || !nutritionData.fat) {
        console.error('Invalid nutrition data structure:', nutritionData);
        return res.status(500).json({ error: "Invalid nutritional data received" });
      }

      console.log('✅ Nutrition analysis complete:', nutritionData);

      // Log the nutrition analysis for developer analytics
      console.log('🔍 API LOG - nutrition_analysis: ✅ | Recipe:', title, '| Ingredients:', ingredients.length, '| Calories per serving:', nutritionData.calories);

      res.json(nutritionData);

    } catch (error) {
      console.error('❌ Nutritional analysis failed:', error);
      res.status(500).json({ 
        error: "Failed to analyze nutrition",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
  // API endpoint to get recipe image by title
  app.get("/api/recipe-image/:title", (req, res) => {
    try {
      const title = decodeURIComponent(req.params.title);
      console.log('🖼️ Image request for title:', title);
      
      if (!global.recipeImageCache) {
        console.log('🖼️ Global cache not initialized');
        return res.status(404).json({ error: "Image cache not initialized" });
      }
      
      console.log('🖼️ Cache contents:', Array.from(global.recipeImageCache.keys()));
      
      const imageUrl = global.recipeImageCache.get(title);
      if (imageUrl) {
        console.log('🖼️ Image found in cache:', imageUrl);
        res.json({ imageUrl });
      } else {
        console.log('🖼️ Image not found in cache for:', title);
        res.status(404).json({ error: "Image not ready yet" });
      }
    } catch (error) {
      console.error("Error retrieving recipe image:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
}

