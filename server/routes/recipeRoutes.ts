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
import { MichelinChefAI } from "../openaiService";
import { ChefAssistGPT5 } from "../chefAssistGPT5";
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
import { 
  FLAVOR_MAXIMIZATION_CORE, 
  FLAVOR_BALANCE_REQUIREMENTS, 
  UK_CONSUMER_FLAVOR_PREFERENCES, 
  PROFESSIONAL_TECHNIQUE_INTEGRATION,
  AUTHENTICITY_ENHANCEMENT 
} from "../flavorMaximizationPrompts";
import { ImageStorage } from "../imageStorage";

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
      if (user) {
        // Check if this is the developer account - grant unlimited access
        const isDeveloper = user.email === "william@blycontracting.co.uk";
        const hasUnlimitedAccess = user.hasFlavrPlus || isDeveloper;
        

        
        if (!hasUnlimitedAccess && (user.recipesThisMonth || 0) >= 3) {
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
      if (user) {
        // Check if this is the developer account - don't increment for unlimited users
        const isDeveloper = user.email === "william@blycontracting.co.uk";
        const hasUnlimitedAccess = user.hasFlavrPlus || isDeveloper;
        
        if (!hasUnlimitedAccess) {
          await storage.updateUserUsage(userId, (user.recipesThisMonth || 0) + 1, user.imagesThisMonth || 0);
        }
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

// Generate recipe image using DALL-E 3 and store locally
async function generateRecipeImage(recipeTitle: string, cuisine: string, recipeId?: number): Promise<string | null> {
  try {
    console.log('🎨 Generating recipe image with DALL-E 3...');
    
    // Enhanced prompt to avoid whole animals unless specifically mentioned
    const shouldShowWholeAnimal = recipeTitle.toLowerCase().includes('whole') || 
                                  recipeTitle.toLowerCase().includes('roast chicken') ||
                                  recipeTitle.toLowerCase().includes('whole fish') ||
                                  recipeTitle.toLowerCase().includes('roasted duck');
    
    const animalGuidance = shouldShowWholeAnimal ? 
      '' : 
      'Show prepared, portioned pieces (fillets, cuts, portions) rather than whole animals. Focus on the cooked, plated dish as served.';
    
    const imagePrompt = `A realistic photograph of ${recipeTitle} as it would be expertly plated and served by an accomplished chef. Show the complete dish with all components mentioned in the title, beautifully presented with professional plating techniques. ${cuisine} cuisine style. ${animalGuidance} The food should display excellent knife skills, proper cooking techniques, and thoughtful garnishing - the work of someone with culinary training. Professional presentation with attention to color, texture, and composition. Include any sides, sauces, or accompaniments mentioned in the dish name, artfully arranged. Natural lighting, 45-degree angle view showing restaurant-quality execution while remaining true to the actual dish described.`;
    
    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt: imagePrompt,
      n: 1,
      size: "1024x1024",
      quality: "standard",
    });

    if (response.data && response.data[0] && response.data[0].url) {
      console.log('✅ Recipe image generated successfully');
      const dalleUrl = response.data[0].url;
      
      // If we have a recipe ID, download and store the image locally
      if (recipeId) {
        console.log('📥 Downloading and storing image locally...');
        const localImagePath = await ImageStorage.downloadAndStoreImage(dalleUrl, recipeId);
        
        if (localImagePath) {
          console.log('✅ Image stored locally:', localImagePath);
          // Update the recipe with the local image path
          await storage.updateRecipeImage(recipeId, localImagePath);
          return localImagePath;
        } else {
          console.log('⚠️ Failed to store image locally, using DALL-E URL');
          return dalleUrl;
        }
      }
      
      return dalleUrl;
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

      const prompt = `You are an accomplished chef designing restaurant-quality dishes that showcase available ingredients. Create COMPLETE, COHERENT MENU-WORTHY MEALS that demonstrate professional culinary expertise.

${FLAVOR_MAXIMIZATION_CORE}

${FLAVOR_BALANCE_REQUIREMENTS}

${UK_CONSUMER_FLAVOR_PREFERENCES}

${PROFESSIONAL_TECHNIQUE_INTEGRATION}

CHEF'S CREATIVE FREEDOM:
- Build dishes naturally as a professional chef would, using culinary instinct and technique
- Focus on maximizing flavor through proper technique, seasoning, and ingredient harmony
- Create accessible dishes that showcase professional skills without forced complexity
- Let the dish composition flow organically - not every dish needs a sauce or multiple sides
- Prioritize what makes culinary sense for the specific ingredients and cuisine
- Use chef techniques to elevate simple ingredients into exceptional dishes

VARIATION SEED: ${randomSeed}
UK CONSUMER FOCUS: Design sophisticated dishes for UK palates using available ingredients with professional presentation.

${selectedVariationPrompt ? `REROLL MANDATE: ${selectedVariationPrompt}` : `
SEED-BASED CHEF INSPIRATION (use ${randomSeed} to influence):
- Cuisine Style: ${selectedCuisine}
- Primary Technique: ${selectedTechnique}
- Starch Component: ${selectedCarb}
- Signature Sauce: ${selectedSauce}
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

DISH COMPOSITION PHILOSOPHY:
- Create dishes that make culinary sense for the available ingredients and cuisine
- Some dishes shine with simplicity (perfectly grilled fish with lemon)
- Others benefit from complexity (layered flavors and multiple components)
- Let the ingredients and cuisine tradition guide the dish structure
- Focus on flavor balance and accessibility over forced complexity

AVAILABLE INGREDIENTS BY CUISINE COMPATIBILITY:
${cuisineNotes.join("\n")}

${AUTHENTICITY_ENHANCEMENT}

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

      // Use GPT-5 with MichelinChefAI for enhanced recipe generation
      const response = await MichelinChefAI.generateRecipeIdeas({
        ingredients,
        servings,
        cookingTime,
        budget,
        equipment,
        dietary: dietaryRestrictions,
        ingredientFlexibility
      }, "Fridge Mode");

      // GPT-5 response is already parsed JSON
      console.log('🍽️ Fridge2Fork recipes generated via GPT-5:', response.recipes?.length || 0);
      
      // Log the interaction using simplified logging
      await logSimpleGPTInteraction({
        endpoint: "generate-fridge-recipe",
        prompt: "GPT-5 MichelinChefAI Fridge Mode",
        response: JSON.stringify(response),
        model: "gpt-5", // Using GPT-5 as primary model
        duration: 0,
        inputTokens: 500, // Estimated for GPT-5
        outputTokens: Math.ceil(JSON.stringify(response).length / 4),
        cost: 0.002, // Higher cost for GPT-5
        success: true,
        userId: req.session?.userId?.toString() || "anonymous"
      });

      res.json({ recipes: response.recipes || [] });

      // Increment usage counter after successful generation
      incrementUsageCounter(req).catch(err => console.error('Failed to increment usage:', err));
    } catch (error: any) {
      console.error('Fridge recipe generation error:', error);
      res.status(500).json({ error: error.message || "Failed to generate recipes" });
    }
  });

  // Chef Assist inspiration - GPT-5 Implementation
  app.post("/api/chef-assist/inspire", async (req, res) => {
    try {
      // Generate random seeds for ultra-maximum variation
      const randomSeed = Math.floor(Math.random() * 10000);
      const complexityLevel = (randomSeed % 15) + 1;
      const simpleStyle = (randomSeed % 15) + 1;
      const creativityMode = (randomSeed % 8) + 1;
      const seasonalFocus = (randomSeed % 6) + 1;
      const textureTheme = (randomSeed % 10) + 1;
      const flavorProfile = (randomSeed % 12) + 1;
      
      const seeds = {
        randomSeed,
        complexityLevel,
        simpleStyle,
        creativityMode,
        seasonalFocus,
        textureTheme,
        flavorProfile
      };
      
      const clientId = req.session?.userId?.toString() || req.ip || "anonymous";
      
      const result = await ChefAssistGPT5.generateInspireTitle({
        seeds,
        userIntent: req.body.userIntent || "",
        cuisinePreference: req.body.cuisinePreference,
        avoid: req.body.avoid || [],
        clientId
      });
      
      // Log the interaction for developer insights
      logSimpleGPTInteraction({
        endpoint: "chef-assist-inspire",
        prompt: "GPT-5 inspire generation",
        response: result.title,
        model: "gpt-5",
        duration: 0,
        inputTokens: 200, // Estimated
        outputTokens: Math.ceil(result.title.length / 4),
        cost: 0.004,
        success: true,
        userId: req.session?.userId?.toString()
      }).catch(err => console.error('Background logging failed:', err));
      
      res.json({ suggestion: result.title });
    } catch (error: any) {
      console.error('Inspire error:', error);
      
      // Log the failed interaction
      logSimpleGPTInteraction({
        endpoint: "chef-assist-inspire",
        prompt: "",
        response: "",
        model: "gpt-5",
        duration: 0,
        inputTokens: 0,
        outputTokens: 0,
        cost: 0,
        success: false,
        userId: req.session?.userId?.toString()
      }).catch(err => console.error('Background logging failed:', err));
      
      res.status(500).json({ error: 'Failed to generate inspiration' });
    }
  });

  // Chef Assist recipe generation - GPT-5 Implementation
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

      // Generate random seeds for ultra-maximum variation
      const randomSeed = Math.floor(Math.random() * 10000);
      const complexityLevel = (randomSeed % 15) + 1;
      const simpleStyle = (randomSeed % 15) + 1;
      const creativityMode = (randomSeed % 8) + 1;
      const seasonalFocus = (randomSeed % 6) + 1;
      const textureTheme = (randomSeed % 10) + 1;
      const flavorProfile = (randomSeed % 12) + 1;
      
      const seeds = {
        randomSeed,
        complexityLevel,
        simpleStyle,
        creativityMode,
        seasonalFocus,
        textureTheme,
        flavorProfile
      };
      
      const clientId = req.session?.userId?.toString() || req.ip || "anonymous";
      
      const result = await ChefAssistGPT5.generateFullRecipe({
        userIntent: userPrompt,
        servings,
        timeBudget: req.body.timeBudget,
        dietaryNeeds: req.body.dietaryNeeds || [],
        mustUse: req.body.mustUse || [],
        avoid: req.body.avoid || [],
        equipment: req.body.equipment || [],
        budgetNote: req.body.budgetNote,
        cuisinePreference: req.body.cuisinePreference,
        seeds,
        clientId
      });

      // Send recipe immediately to user for faster response
      res.json({ recipe: result.recipe });

      // Increment usage counter after successful generation
      incrementUsageCounter(req).catch(err => console.error('Failed to increment usage:', err));

      // Generate image and log in background (don't await)
      generateRecipeImage(result.recipe.title, result.recipe.cuisine, result.recipe.id).then(imageUrl => {
        if (imageUrl) {
          console.log('🎨 Background image generated for GPT-5 Chef Assist:', result.recipe.title);
        }
      }).catch(err => console.error('Background image generation failed:', err));

      // Log the interaction for developer insights
      logSimpleGPTInteraction({
        endpoint: "chef-assist-generate",
        prompt: "GPT-5 full recipe generation",
        response: JSON.stringify(result.recipe),
        model: "gpt-5",
        duration: 0,
        inputTokens: 1500, // Estimated for full recipe generation
        outputTokens: Math.ceil(JSON.stringify(result.recipe).length / 4),
        cost: 0.008,
        success: true,
        userId: req.session?.userId?.toString()
      }).catch(err => console.error('Background logging failed:', err));
    } catch (error: any) {
      console.error('Chef assist generation error:', error);
      
      // Log the failed interaction
      logSimpleGPTInteraction({
        endpoint: "chef-assist-generate",
        prompt: "",
        response: "",
        model: "gpt-5",
        duration: 0,
        inputTokens: 0,
        outputTokens: 0,
        cost: 0,
        success: false,
        userId: req.session?.userId?.toString()
      }).catch(err => console.error('Background logging failed:', err));
      
      res.status(500).json({ error: 'Failed to generate recipe' });
    }
  });
}
