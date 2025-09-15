import { OpenAI } from "openai";
import { UserInputAnalyzer, UserInputAnalysis } from './userInputAnalyzer';
import { AdaptivePromptBuilder, AdaptivePromptResult } from './adaptivePromptBuilder';
import { smartProfilingService, type RecipeGenerationContext } from './services/smartProfilingService';
import { AIService } from './aiProvider';
import type { RecipeInput, RecipeLLM } from '@shared/aiSchemas';

const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY 
});

// Add all the necessary style packs and helper functions from original
const TECHNIQUE_PACK = [
  "rustic-braise", "quick-sear-roast", "pan-sauce-reduction", "grill-marinade",
  "shallow-fry-crisp", "steam-then-sear", "gentle-poach", "emulsion-building",
  "sheet-pan-oven", "pressure-cooker", "confit-style-fat", "sous-vide-then-sear",
  "smoker-style-rub(oven-alt)", "dough/lamination", "cure-then-cook(fast)"
];

const SIMPLICITY_PACK = [
  "one-pan", "≤30-min-target", "6–10-ingredients-prefer", "batch-friendly", "minimal-chop",
  "low-mess", "child-friendly-heat", "make-ahead-marinade", "freezer-friendly",
  "salad-plus-protein", "carb-base-rotation", "sauce-led", "broth-led",
  "grilling-bias", "sheet-tray-bias"
];

const CREATIVITY_PACK = [
  "strictly-classic", "classic-with-garnish-twist", "classic-with-sauce-twist", "herb/aroma-experimentation",
  "spice-driven", "acidity-forward", "smoke/char-emphasis", "modern-plating-logic"
];

const SEASON_PACK = [
  "spring-greens/herbs", "summer-grill/fresh-veg", "early-autumn-roasts", "winter-braise/roots",
  "shoulder-season-light-roast", "year-round-neutral"
];

const TEXTURE_PACK = [
  "crisp-vs-tender", "creamy-vs-crunchy", "layered-crisp+silky", "juicy-with-crackling",
  "glazed-sticky+fresh-bite", "charred-edges+soft-centre", "crumbed-crust+smooth-purée",
  "brothy+crunchy-topping", "light/aerated", "pastry/flaky-emphasis"
];

const FLAVOUR_PACK = [
  "umami-layering", "heat-ladder(mild→med)", "citrus-acid-balance", "herbaceous-lift",
  "nutty-browning", "aromatic-spice-base", "garlicky-comfort", "sweet-salty-contrast",
  "smoke&char", "pickled-accent", "fermented-depth", "peppery-bite"
];

interface SeedPacks {
  randomSeed: number;
  complexityLevel: number;
  simpleStyle: number;
  creativityMode: number;
  seasonalFocus: number;
  textureTheme: number;
  flavorProfile: number;
}

// Anti-repetition memory - rolling window of last 5 outputs
let recentOutputs: Array<{protein: string, technique: string, flavour: string}> = [];

// Word variety tracking for Inspire Me titles
const titleWordTracker = new Map<string, string[]>(); // clientId -> recent words
const MAX_TRACKED_WORDS = 15; // Track last 15 descriptive words per user

function trackTitleWords(clientId: string, title: string) {
  if (!clientId) return;
  
  // Extract descriptive words and phrases (ignore common words)
  const commonWords = new Set(['with', 'and', 'the', 'a', 'an', 'in', 'on', 'for', 'to', 'of', 'by']);
  const titleLower = title.toLowerCase();
  
  // Track both individual words and common culinary phrases
  const words = titleLower.split(/[\s-]+/)
    .filter(word => word.length > 2 && !commonWords.has(word))
    .filter(word => /^[a-z]+$/.test(word)); // Only alphabetic words
  
  // Track common culinary phrases that get overused
  const phrases = [];
  if (titleLower.includes('herb-infused') || titleLower.includes('herb infused')) phrases.push('herb-infused');
  if (titleLower.includes('bliss')) phrases.push('bliss');
  if (titleLower.includes('golden')) phrases.push('golden');
  if (titleLower.includes('crispy')) phrases.push('crispy');
  if (titleLower.includes('rustic')) phrases.push('rustic');
  if (titleLower.includes('silky')) phrases.push('silky');
  if (titleLower.includes('heavenly')) phrases.push('heavenly');
  if (titleLower.includes('divine')) phrases.push('divine');
  if (titleLower.includes('perfect')) phrases.push('perfect');
  if (titleLower.includes('ultimate')) phrases.push('ultimate');
  
  // Track specific classic dishes that are over-suggested
  if (titleLower.includes('osso buco')) phrases.push('osso-buco');
  if (titleLower.includes('coq au vin')) phrases.push('coq-au-vin');
  if (titleLower.includes('wellington')) phrases.push('wellington');
  if (titleLower.includes('beef wellington')) phrases.push('beef-wellington');
  if (titleLower.includes('rogan josh')) phrases.push('rogan-josh');
  if (titleLower.includes('bourguignon')) phrases.push('bourguignon');
  if (titleLower.includes('cassoulet')) phrases.push('cassoulet');
  if (titleLower.includes('bouillabaisse')) phrases.push('bouillabaisse');
  if (titleLower.includes('tagine')) phrases.push('tagine');
  if (titleLower.includes('carbonara')) phrases.push('carbonara');
  
  if (!titleWordTracker.has(clientId)) {
    titleWordTracker.set(clientId, []);
  }
  
  const userWords = titleWordTracker.get(clientId)!;
  userWords.push(...words, ...phrases); // Track both words and phrases
  
  // Keep only the most recent words
  if (userWords.length > MAX_TRACKED_WORDS) {
    userWords.splice(0, userWords.length - MAX_TRACKED_WORDS);
  }
}

function getRecentWords(clientId: string): string[] {
  return titleWordTracker.get(clientId) || [];
}

function getAvoidWords(clientId: string): string[] {
  const recentWords = getRecentWords(clientId);
  const wordCounts = new Map<string, number>();
  
  // Count frequency of recent words
  recentWords.forEach(word => {
    wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
  });
  
  // Return words that appear 2+ times recently
  return Array.from(wordCounts.entries())
    .filter(([word, count]) => count >= 2)
    .map(([word]) => word);
}

// Add helper functions from original
function selectStylePacks(seeds: SeedPacks, userIntent: string, clientId: string) {
  const seededRandom = (seed: number, array: any[]) => {
    const random = Math.abs((seed * 9301 + 49297) % 233280) / 233280;
    return array[Math.floor(random * array.length)];
  };

  return {
    techniquePack: seededRandom(seeds.complexityLevel, TECHNIQUE_PACK),
    simplicityPack: seededRandom(seeds.simpleStyle, SIMPLICITY_PACK),
    creativityPack: seededRandom(seeds.creativityMode, CREATIVITY_PACK),
    seasonPack: seededRandom(seeds.seasonalFocus, SEASON_PACK),
    texturePack: seededRandom(seeds.textureTheme, TEXTURE_PACK),
    flavourPack: seededRandom(seeds.flavorProfile, FLAVOUR_PACK)
  };
}

function applyCoherenceGuardrails(packs: any, timeBudget: number | null) {
  const newPacks = { ...packs };
  const adjustments: string[] = [];
  
  if (timeBudget && timeBudget <= 30) {
    if (["rustic-braise", "confit-style-fat", "cure-then-cook(fast)"].includes(packs.techniquePack)) {
      newPacks.techniquePack = "quick-sear-roast";
      adjustments.push("Adjusted to quick technique due to time limit");
    }
  }
  
  return { packs: newPacks, adjustments };
}

function getDynamicTargetRange(simplicityPack: string): string {
  if (["one-pan", "≤30-min-target", "6–10-ingredients-prefer"].includes(simplicityPack)) {
    return "6–10 items";
  }
  return "8–16 items";
}

export class ChefAssistGPT5 {
  
  // Simple in-memory cache for performance optimization
  private static recipeCache = new Map<string, any>();
  private static cacheMaxSize = 100;
  
  // Cache key generator
  static generateCacheKey(data: any): string {
    const keyParts = [
      data.userIntent.toLowerCase().trim(),
      data.servings || '4',
      data.timeBudget || 'flexible',
      (data.dietaryNeeds || []).sort().join(','),
      (data.mustUse || []).sort().join(','),
      (data.avoid || []).sort().join(',')
    ];
    return keyParts.join('|');
  }
  
  // Cache management
  static getCachedRecipe(key: string) {
    return this.recipeCache.get(key);
  }
  
  static setCachedRecipe(key: string, recipe: any) {
    if (this.recipeCache.size >= this.cacheMaxSize) {
      const firstKey = this.recipeCache.keys().next().value;
      if (firstKey) {
        this.recipeCache.delete(firstKey);
      }
    }
    this.recipeCache.set(key, recipe);
  }

  // Enhanced JSON cleaning utility for GPT-4o-mini responses
  static cleanAndValidateJSON(content: string): string {
    // First, clean basic formatting issues
    let cleaned = content
      .replace(/[\x00-\x1F\x7F-\x9F]/g, ' ')  // Remove control characters
      .replace(/\n/g, ' ')                     // Remove newlines
      .replace(/\t/g, ' ')                     // Remove tabs
      .replace(/\s+/g, ' ')                    // Normalize whitespace
      .trim();

    // Find the JSON object boundaries more reliably
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      cleaned = cleaned.substring(firstBrace, lastBrace + 1);
    }

    // Fix common GPT-4o-mini JSON issues
    cleaned = cleaned
      .replace(/,\s*}/g, '}')                    // Remove trailing commas before }
      .replace(/,\s*]/g, ']')                    // Remove trailing commas before ]
      .replace(/:\s*"[^"]*$/, ': ""')            // Fix unterminated strings at end
      .replace(/"[^"]*$/, '""')                  // Fix incomplete strings at end
      .replace(/,\s*$/, '')                      // Remove trailing comma at end
      .replace(/([}\]]),?\s*$/, '$1');           // Ensure proper ending

    return cleaned;
  }
  
  // Smart model selection based on complexity
  static selectOptimalModel(userIntent: string, dietaryNeeds?: string[], mustUse?: string[]): { model: string, tokens: number } {
    const complexityIndicators = [
      'sauce', 'side', 'complex', 'advanced', 'multi-course', 'elaborate',
      'restaurant', 'sophisticated', 'technique', 'molecular', 'fusion'
    ];
    
    const isComplex = complexityIndicators.some(indicator => userIntent.toLowerCase().includes(indicator)) ||
                      (dietaryNeeds && dietaryNeeds.length > 1) ||
                      (mustUse && mustUse.length > 3);
    
    return isComplex 
      ? { model: "gpt-4o-mini", tokens: 3500 }
      : { model: "gpt-4o-mini", tokens: 2048 };
  }

  // Generate complete recipe with optimizations
  static async generateFullRecipe(data: {
    userIntent: string;
    servings: number;
    timeBudget?: number;
    dietaryNeeds?: string[];
    mustUse?: string[];
    avoid?: string[];
    equipment?: string[];
    budgetNote?: string;
    cuisinePreference?: string;
    seeds: SeedPacks;
    clientId?: string;
    userId?: number; // Keep for analytics/logging but not used for smart profiling
    forcedTitle?: string; // Force specific title instead of generating new one
  }): Promise<any> {
    
    // Check cache first for performance
    const cacheKey = this.generateCacheKey(data);
    const cachedRecipe = this.getCachedRecipe(cacheKey);
    if (cachedRecipe) {
      console.log('Returning cached recipe for:', data.userIntent.substring(0, 50) + '...');
      return cachedRecipe;
    }
    
    // NEW: Intelligent Input Analysis
    const inputAnalysis = await UserInputAnalyzer.analyzeUserInput(
      data.userIntent,
      data.clientId,
      data.dietaryNeeds,
      data.equipment
    );
    
    console.log(`Input specificity: ${inputAnalysis.specificity}, Model: ${inputAnalysis.promptStrategy.modelRecommendation}`);
    
    // Get variety guidance for vague prompts
    const varietyGuidance = UserInputAnalyzer.getVarietyGuidance(inputAnalysis, data.clientId);
    
    // RECIPE AUTHENTICITY: Use original user intent to preserve dish authenticity
    // Smart profiling should only be applied in title generation phase, not full recipe creation
    const enhancedUserIntent = data.userIntent;
    console.log(`🍽️ Recipe Generation: Using authentic approach for "${data.userIntent}" - no preference interference`);
    
    // Build adaptive prompt based on analysis (now using enhanced intent)
    const promptResult = AdaptivePromptBuilder.buildOptimizedPrompt(
      inputAnalysis,
      {
        userIntent: enhancedUserIntent, // Using potentially enhanced version
        servings: data.servings,
        timeBudget: data.timeBudget,
        dietaryNeeds: data.dietaryNeeds,
        mustUse: data.mustUse,
        avoid: data.avoid,
        equipment: data.equipment,
        budgetNote: data.budgetNote,
        cuisinePreference: data.cuisinePreference
      },
      varietyGuidance
    );
    
    // Legacy style pack integration (only for vague prompts that need creative variety)
    const stylePacks = selectStylePacks(data.seeds, data.userIntent, data.clientId || "");
    const { packs: adjustedPacks, adjustments } = applyCoherenceGuardrails(stylePacks, data.timeBudget || null);

    // Use the optimized adaptive prompts
    console.log(`Using ${promptResult.speedExpected} generation (est. cost: $${promptResult.estimatedCost.toFixed(4)})`);
    
    const systemMessage = promptResult.systemMessage;
    const userMessage = promptResult.userMessage;

    try {
      console.log(`🍳 [ChefAssistGPT5] Generating recipe via AIProvider with ${promptResult.modelRecommendation}, tokens: ${promptResult.maxTokens}`);
      const startTime = Date.now();
      
      // Map current parameters to AIProvider RecipeInput format
      const recipeInput: RecipeInput = {
        request: data.userIntent,
        preferences: {
          difficulty: promptResult.speedExpected === "fast" ? "Easy" : "Medium",
          cuisine: data.cuisinePreference,
          servings: data.servings,
          timeConstraint: data.timeBudget,
          dietaryRestrictions: data.dietaryNeeds || [],
          equipment: data.equipment || []
        },
        quizData: {
          systemMessage,
          userMessage,
          stylePacks: adjustedPacks,
          seeds: data.seeds,
          mustUse: data.mustUse,
          avoid: data.avoid,
          budgetNote: data.budgetNote
        },
        mode: "chef_assist",
        model: promptResult.modelRecommendation as any, // Type assertion for model compatibility
        variant: "michelin_quality"
      };

      // Call AIProvider with timeout handling
      let aiProviderResponse: RecipeLLM;
      try {
        const aiProviderPromise = AIService.generateRecipe(recipeInput, {
          maxTokens: promptResult.maxTokens,
          timeoutMs: 35000,
          userId: data.clientId ? parseInt(data.clientId, 10) : undefined,
          traceId: `chef-assist-${Date.now()}`
        });
        
        aiProviderResponse = await Promise.race([
          aiProviderPromise,
          new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error('Timeout after 35s')), 35000)
          )
        ]);
      } catch (timeoutError) {
        console.log("🔄 [ChefAssistGPT5] First attempt timed out, retrying with fallback model...");
        
        // Fallback with gpt-4o-mini
        const fallbackInput: RecipeInput = {
          ...recipeInput,
          model: "gpt-4o-mini"
        };
        
        aiProviderResponse = await AIService.generateRecipe(fallbackInput, {
          maxTokens: 4096,
          timeoutMs: 30000,
          userId: data.clientId ? parseInt(data.clientId, 10) : undefined,
          traceId: `chef-assist-fallback-${Date.now()}`
        });
      }
      
      console.log(`🍳 Recipe response received in ${Date.now() - startTime}ms`);

      // Convert AIProvider structured response back to JSON format for existing code compatibility
      const recipeJson = {
        title: data.forcedTitle || aiProviderResponse.title,
        description: aiProviderResponse.description || "",
        cuisine: aiProviderResponse.cuisine || data.cuisinePreference || "British",
        difficulty: aiProviderResponse.difficulty,
        cookTime: aiProviderResponse.cookTime,
        servings: aiProviderResponse.servings,
        ingredients: Array.isArray(aiProviderResponse.ingredients) 
          ? aiProviderResponse.ingredients.map(ing => typeof ing === 'string' ? ing : ing.text)
          : [],
        instructions: Array.isArray(aiProviderResponse.instructions)
          ? aiProviderResponse.instructions.map((instr, index) => 
              typeof instr === 'string' 
                ? { step: index + 1, instruction: instr }
                : { step: instr.step || index + 1, instruction: instr.instruction, timing: instr.timing }
            )
          : [],
        tips: aiProviderResponse.tips,
        variations: aiProviderResponse.variations || [],
        equipment: aiProviderResponse.equipment || data.equipment || [],
        tags: aiProviderResponse.tags || [],
        dietary: aiProviderResponse.dietary || data.dietaryNeeds || [],
        metadata: {
          provider: aiProviderResponse.metadata.provider,
          model: aiProviderResponse.metadata.model,
          processingTimeMs: Date.now() - startTime,
          estimatedCost: aiProviderResponse.metadata.estimatedCostUsd
        }
      };

      // Convert back to JSON string for existing parsing logic
      let content = JSON.stringify(recipeJson);
      
      if (!content) {
        throw new Error("Empty response from AI model");
      }

      // Enhanced JSON cleaning and validation
      content = this.cleanAndValidateJSON(content);
      
      let recipe;
      try {
        recipe = JSON.parse(content);
      } catch (parseError) {
        console.error("JSON parse error, attempting advanced repair:", parseError);
        
        // Advanced JSON repair - fix common GPT-4o-mini issues
        console.log("Attempting advanced JSON repair...");
        
        // Fix unterminated strings first (most common issue)
        content = content.replace(/"[^"]*$/g, '""');  // Fix strings that don't end with quote
        content = content.replace(/:\s*"[^"]*$/g, ': ""'); // Fix values that start with quote but don't end
        
        // Fix array and object structure issues
        content = content
          .replace(/,\s*}/g, '}')                    // Remove trailing commas before }
          .replace(/,\s*]/g, ']')                    // Remove trailing commas before ]
          .replace(/([^"]),(\s*[}\]])/g, '$1$2')     // Fix comma spacing issues
          .replace(/}\s*{/g, '},{')                  // Fix missing commas between objects
          .replace(/]\s*\[/g, '],[')                 // Fix missing commas between arrays
          .replace(/:\s*,/g, ': "",')                // Fix missing values
          .replace(/,\s*,/g, ',')                    // Remove duplicate commas
          .replace(/,\s*$/, '')                      // Remove trailing comma at end
          .replace(/([}\]]),?\s*$/, '$1');           // Ensure proper ending
        
        // Ensure the JSON is properly closed
        const openBraces = (content.match(/\{/g) || []).length;
        const closeBraces = (content.match(/\}/g) || []).length;
        const openBrackets = (content.match(/\[/g) || []).length;
        const closeBrackets = (content.match(/\]/g) || []).length;
        
        // Add missing closing braces/brackets
        for (let i = 0; i < openBraces - closeBraces; i++) {
          content += '}';
        }
        for (let i = 0; i < openBrackets - closeBrackets; i++) {
          content += ']';
        }
          
        try {
          recipe = JSON.parse(content);
        } catch (secondError) {
          console.error("Advanced repair failed, trying fallback:", secondError);
          
          // Final fallback: Create a minimal valid recipe structure based on user intent
          console.log("Creating fallback recipe structure based on user request:", data.userIntent);
          
          // Try to match the user's request for a relevant fallback
          let fallbackRecipe;
          const userIntentLower = data.userIntent.toLowerCase();
          
          if (userIntentLower.includes('pork') && userIntentLower.includes('skewer')) {
            fallbackRecipe = {
              title: data.forcedTitle || data.userIntent,
              description: "Tender grilled pork skewers with aromatic seasonings",
              cuisine: "Asian",
              difficulty: "Medium",
              cookTime: 25,
              servings: data.servings || 4,
              ingredients: [
                "600g pork shoulder, cut into chunks",
                "2 tbsp tamarind paste",
                "3 tbsp soy sauce",
                "2 tbsp brown sugar",
                "3 cloves garlic, minced",
                "1 tsp ginger, grated",
                "2 tbsp vegetable oil",
                "Wooden skewers"
              ],
              method: [
                {
                  step: 1,
                  instruction: "Marinate pork chunks in tamarind, soy sauce, and spices for 30 minutes.",
                  timing: "30 minutes"
                },
                {
                  step: 2,
                  instruction: "Thread pork onto skewers and grill over medium-high heat.",
                  timing: "12 minutes"
                },
                {
                  step: 3,
                  instruction: "Baste with remaining marinade and cook until caramelized.",
                  timing: "8 minutes"
                }
              ]
            };
          } else {
            // Generic fallback for other requests
            fallbackRecipe = {
              title: data.forcedTitle || data.userIntent,
              description: "A delicious recipe tailored to your request",
              cuisine: "International",
              difficulty: "Medium",
              cookTime: 30,
              servings: data.servings || 4,
              ingredients: [
                "Main ingredient as requested",
                "Supporting ingredients",
                "Seasonings and spices",
                "Additional components"
              ],
              method: [
                {
                  step: 1,
                  instruction: "Prepare your main ingredients according to the recipe requirements.",
                  timing: "10 minutes"
                },
                {
                  step: 2,
                  instruction: "Cook using the appropriate method for your dish.",
                  timing: "15 minutes"
                },
                {
                  step: 3,
                  instruction: "Finish and serve as described in the full recipe.",
                  timing: "5 minutes"
                }
              ]
            };
          }
          
          recipe = fallbackRecipe;
        }
      }
      
      console.log("Recipe parsed successfully:", recipe.title);
      
      // Override title if forced title is provided (for Inspire Me consistency)
      if (data.forcedTitle) {
        console.log(`🎯 Overriding recipe title: "${recipe.title}" → "${data.forcedTitle}"`);
        recipe.title = data.forcedTitle;
      }
      
      // Record generation for variety tracking
      if (inputAnalysis.vaguePromptSignature && data.clientId) {
        UserInputAnalyzer.recordGeneration(
          inputAnalysis, 
          data.clientId, 
          recipe.cuisine || 'British',
          recipe.method?.[0]?.instruction?.toLowerCase()?.includes('roast') ? 'roasting' :
          recipe.method?.[0]?.instruction?.toLowerCase()?.includes('fry') ? 'frying' :
          recipe.method?.[0]?.instruction?.toLowerCase()?.includes('braise') ? 'braising' :
          recipe.method?.[0]?.instruction?.toLowerCase()?.includes('grill') ? 'grilling' :
          'general'
        );
      }
      
      // Cache the generated recipe for performance
      this.setCachedRecipe(cacheKey, recipe);
      
      return recipe;
      
    } catch (error) {
      console.error("Recipe generation error:", error);
      throw new Error("Failed to generate recipe");
    }
  }

  // Optimized Inspire Me title generation  
  static async generateInspireTitle(data: {
    seeds: SeedPacks;
    userIntent?: string;
    cuisinePreference?: string;
    avoid?: string[];
    clientId?: string;
    userId?: number; // Added for smart profiling
  }): Promise<{ title: string }> {
    
    // NEW: Use input analysis for Inspire Me optimization
    const inspirationAnalysis = await UserInputAnalyzer.analyzeUserInput(
      data.userIntent || 'inspire me',
      data.clientId,
      [],
      []
    );
    
    // Get variety guidance to avoid repetition
    const varietyGuidance = UserInputAnalyzer.getVarietyGuidance(inspirationAnalysis, data.clientId);
    
    console.log(`Inspire Me - Input specificity: ${inspirationAnalysis.specificity}, Model: ${inspirationAnalysis.promptStrategy.modelRecommendation}`);
    
    // SMART PROFILING: Enhance Inspire Me with user preferences
    let smartProfileLog = "No user profiling applied (Inspire Me)";
    let enhancedCuisinePreference = data.cuisinePreference;
    
    if (data.userId) {
      try {
        const generationContext: RecipeGenerationContext = {
          mode: 'inspire-me',
          originalPrompt: data.userIntent || 'inspire me',
          userPreferences: {
            cuisinePreference: data.cuisinePreference
          }
        };
        
        const smartEnhancement = await smartProfilingService.enhanceRecipeGeneration(
          data.userId,
          generationContext
        );
        
        // For Inspire Me, we use profiling more conservatively to maintain discovery
        if (smartEnhancement.confidenceLevel === 'high') {
          // Extract cuisine suggestions from the enhanced prompt
          const cuisineMatch = smartEnhancement.enhancedPrompt.match(/cuisine.*?:?\s*(\w+)/i);
          if (cuisineMatch) {
            enhancedCuisinePreference = cuisineMatch[1];
          }
          smartProfileLog = `Profile lightly applied (${smartEnhancement.confidenceLevel} confidence): ${smartEnhancement.reasoning.slice(0, 2).join(', ')}`;
        } else {
          smartProfileLog = `Profile not used for discovery: ${smartEnhancement.reasoning[0]}`;
        }
        
        console.log(`🧠 Inspire Me Smart Profiling: ${smartProfileLog}`);
        
      } catch (error) {
        console.error("Smart profiling failed for Inspire Me:", error);
        smartProfileLog = "Profiling error - using random inspiration";
      }
    }
    
    // Enhanced cuisine selection for variety
    const cuisineContexts = [
      "British", "Italian", "French", "Thai", "Greek", "Japanese", "Indian", 
      "Chinese", "Mexican", "Spanish", "Turkish", "Lebanese", "Moroccan", 
      "Korean", "Vietnamese", "German", "Portuguese", "Peruvian", "Ethiopian",
      "Brazilian", "Argentinian", "Russian", "Polish", "Hungarian"
    ];
    
    // Use variety guidance if available, otherwise use smart randomization
    let selectedCuisine: string;
    
    if (varietyGuidance.suggestCuisine) {
      selectedCuisine = varietyGuidance.suggestCuisine;
      console.log(`Using variety guidance cuisine: ${selectedCuisine} (avoiding: ${varietyGuidance.avoidCuisines.join(', ')})`);
    } else if (enhancedCuisinePreference) {
      selectedCuisine = cuisineContexts.find(c => c.toLowerCase().includes(enhancedCuisinePreference!.toLowerCase())) || "British";
    } else {
      // Smart randomization for first-time or non-tracked requests
      const hashCode = (s: string) => s.split('').reduce((a, b) => (((a << 5) - a) + b.charCodeAt(0)) | 0, 0);
      const userIntentHash = hashCode((data.userIntent || "").toLowerCase());
      const sessionSalt = hashCode(data.clientId || "") ^ hashCode(new Date().toDateString());
      const timeBasedSeed = Date.now() + Math.floor(Math.random() * 10000);
      const rngSeed = data.seeds.randomSeed ^ userIntentHash ^ sessionSalt ^ timeBasedSeed;
      
      const seededRandom = (seed: number, max: number) => Math.abs((seed * 9301 + 49297) % 233280) % max;
      selectedCuisine = cuisineContexts[seededRandom(rngSeed, cuisineContexts.length)];
    }

    // Enhanced inspiration categories with chef/restaurant focus
    // 50% chef, 35% restaurant, 15% occasion for better chef/restaurant visibility
    const rand = Math.random();
    const inspirationType = rand < 0.5 ? 0 : (rand < 0.85 ? 1 : 2);
    
    let inspirationPrompt = "";
    
    if (inspirationType === 0) {
      // Chef-inspired with global variety
      const chefStyles = [
        // Popular UK TV Chefs
        "Gordon Ramsay's bold techniques", "Jamie Oliver's approachable classics", "Nigella Lawson's comfort elegance",
        "Rick Stein's seafood expertise", "Mary Berry's reliable techniques", "Tom Kerridge's pub refinement", 
        "Marcus Wareing's precision", "Michel Roux Jr's French mastery", "Angela Hartnett's Italian sophistication",
        "James Martin's hearty comfort", "Ainsley Harriott's vibrant flavors", "Delia Smith's reliable classics",
        "Hugh Fearnley-Whittingstall's seasonal cooking", "Heston Blumenthal's innovative techniques",
        "Raymond Blanc's French elegance", "Gino D'Acampo's Italian passion", "Paul Hollywood's baking mastery",
        "Nadiya Hussain's creative baking", "John Torode's bold flavors", "Gregg Wallace's comfort cooking",
        
        // London Restaurant Chefs
        "José Pizarro's Spanish tapas", "Aktar Islam's modern Indian", "Francesco Mazzei's Southern Italian",
        "Asma Khan's Bengali heritage", "Rohit Ghai's contemporary Indian", "Paul Ainsworth's Cornish creativity",
        "Tommy Banks's Yorkshire ingredients", "Atul Kochhar's Indian spices", "Vivek Singh's modern Indian",
        "Antonio Carluccio's Italian simplicity", "Theo Randall's Italian classics", "Russell Norman's Venetian cuisine",
        
        // International Favorites (Known in UK)
        "Yotam Ottolenghi's vibrant Mediterranean", "José Andrés' Spanish mastery", "Julia Child's French fundamentals",
        "Anthony Bourdain's global insights", "Nobu Matsuhisa's Japanese-Peruvian", "Wolfgang Puck's innovation",
        "Marco Pierre White's culinary intensity", "Jean-Christophe Novelli's French flair", "Aldo Zilli's Italian warmth",
        "Ken Hom's Chinese expertise", "Madhur Jaffrey's Indian heritage", "Claudia Roden's Middle Eastern wisdom",
        
        // Celebrity Guest Chefs (UK TV Appearances)
        "Martin Blunos's culinary artistry", "Jun Tanaka's Japanese-French fusion", "Monica Galetti's refined techniques",
        "Matt Tebbutt's Welsh cooking", "Si King's hearty comfort food", "Dave Myers's bold flavors",
        "Valentine Warner's rustic cooking", "Nick Nairn's Scottish cuisine", "Galton Blackiston's Norfolk ingredients",
        "Cyrus Todiwala's Parsee cuisine", "Peter Gordon's fusion mastery", "Bryn Williams's Welsh heritage"
      ];
      const selectedStyle = chefStyles[Math.floor(Math.random() * chefStyles.length)];
      
      // Extract chef name from the selected style for proper formatting
      const chefName = selectedStyle.split("'s")[0]; // "Gordon Ramsay's bold techniques" -> "Gordon Ramsay"
      
      // Match chef to appropriate cuisine for authenticity
      const chefCuisineMap: Record<string, string[]> = {
        // Popular UK TV Chefs
        "Gordon Ramsay": ["British", "French"],
        "Jamie Oliver": ["British", "Italian"],
        "Nigella Lawson": ["British"],
        "Rick Stein": ["British", "French"],
        "Mary Berry": ["British"],
        "Tom Kerridge": ["British"],
        "Marcus Wareing": ["British", "French"],
        "Michel Roux Jr": ["French", "British"],
        "Angela Hartnett": ["Italian", "British"],
        "James Martin": ["British"],
        "Ainsley Harriott": ["British", "Caribbean"],
        "Delia Smith": ["British"],
        "Hugh Fearnley-Whittingstall": ["British"],
        "Heston Blumenthal": ["British", "French"],
        "Raymond Blanc": ["French"],
        "Gino D'Acampo": ["Italian"],
        "Paul Hollywood": ["British"],
        "Nadiya Hussain": ["British"],
        "John Torode": ["British"],
        "Gregg Wallace": ["British"],
        
        // London Restaurant Chefs
        "José Pizarro": ["Spanish"],
        "Aktar Islam": ["Indian", "British"],
        "Francesco Mazzei": ["Italian"],
        "Asma Khan": ["Indian"],
        "Rohit Ghai": ["Indian"],
        "Paul Ainsworth": ["British"],
        "Tommy Banks": ["British"],
        "Atul Kochhar": ["Indian"],
        "Vivek Singh": ["Indian"],
        "Antonio Carluccio": ["Italian"],
        "Theo Randall": ["Italian"],
        "Russell Norman": ["Italian"],
        
        // International Favorites (Known in UK)
        "Yotam Ottolenghi": ["Mediterranean", "Lebanese", "Israeli"],
        "José Andrés": ["Spanish"],
        "Julia Child": ["French"],
        "Anthony Bourdain": ["British", "French", "Vietnamese", "Chinese"],
        "Nobu Matsuhisa": ["Japanese"],
        "Wolfgang Puck": ["French"],
        "Marco Pierre White": ["British", "French"],
        "Jean-Christophe Novelli": ["French"],
        "Aldo Zilli": ["Italian"],
        "Ken Hom": ["Chinese"],
        "Madhur Jaffrey": ["Indian"],
        "Claudia Roden": ["Lebanese", "Turkish"],
        
        // Celebrity Guest Chefs (UK TV Appearances)
        "Martin Blunos": ["British", "French"],
        "Jun Tanaka": ["Japanese", "French"],
        "Monica Galetti": ["British", "French"],
        "Matt Tebbutt": ["British"],
        "Si King": ["British"],
        "Dave Myers": ["British"],
        "Valentine Warner": ["British"],
        "Nick Nairn": ["British"],
        "Galton Blackiston": ["British"],
        "Cyrus Todiwala": ["Indian"],
        "Peter Gordon": ["British"],
        "Bryn Williams": ["British"]
      };
      
      // Check if the selected chef matches the cuisine, if not pick appropriate chef for cuisine
      const appropriateCuisines = chefCuisineMap[chefName] || ["British"];
      const shouldMatchChefToCuisine = !appropriateCuisines.includes(selectedCuisine);
      
      if (shouldMatchChefToCuisine) {
        // Find chefs that match the selected cuisine
        const matchingChefs = Object.entries(chefCuisineMap)
          .filter(([_, cuisines]) => cuisines.includes(selectedCuisine))
          .map(([chef, _]) => chef);
          
        if (matchingChefs.length > 0) {
          const newChef = matchingChefs[Math.floor(Math.random() * matchingChefs.length)];
          console.log(`🔄 Switched from ${chefName} to ${newChef} for ${selectedCuisine} cuisine authenticity`);
          const newChefName = newChef;
          
          inspirationPrompt = `Create a ${selectedCuisine} recipe title inspired by ${newChef}'s signature techniques.
      
FOCUS: Authentic ${selectedCuisine} dishes with professional flavor techniques that ${newChef} is known for.
MANDATORY FORMAT: MUST start with "${newChefName}-Inspired" - THIS IS REQUIRED, NOT OPTIONAL!
EXACT FORMAT: "${newChefName}-Inspired [Recipe Name]"
CRITICAL: If the title doesn't start with "${newChefName}-Inspired", it will be rejected.
MEAT PREFERENCE: Unless specifically vegan/vegetarian, strongly favor meat-based dishes as the main protein.`;
        } else {
          // Fallback to restaurant style if no matching chef
          inspirationPrompt = `Create an authentic ${selectedCuisine} recipe title inspired by traditional restaurant techniques.
      
FOCUS: Professional ${selectedCuisine} cooking methods and authentic flavor combinations.
STYLE: Traditional restaurant-quality dishes adapted for home cooking.
MEAT PREFERENCE: Unless specifically vegan/vegetarian, strongly favor meat-based dishes as the main protein.`;
        }
      } else {
        inspirationPrompt = `Create a ${selectedCuisine} recipe title inspired by ${selectedStyle}.
      
FOCUS: Signature techniques and flavor combinations that create memorable, delicious dishes for home cooks.
MANDATORY FORMAT: MUST start with "${chefName}-Inspired" - THIS IS REQUIRED, NOT OPTIONAL!
EXACT FORMAT: "${chefName}-Inspired [Recipe Name]"
CRITICAL: If the title doesn't start with "${chefName}-Inspired", it will be rejected.
MEAT PREFERENCE: Unless specifically vegan/vegetarian, strongly favor meat-based dishes as the main protein.`;
      }

    } else if (inspirationType === 1) {
      // Restaurant-style excellence - match restaurants to appropriate cuisines
      const restaurantCuisineMap = {
        // British Cuisine Restaurants
        "British": [
          "Hawksmoor's premium steakhouse", "Rules' traditional British game", "The Ivy's British institution", 
          "Coal Office's modern British", "St. JOHN's nose-to-tail British", "Mayfair Chippy's elevated fish & chips", 
          "Bentley's Oyster Bar seafood", "The Ledbury's modern European", "British gastropub classics"
        ],
        // Italian Cuisine Restaurants  
        "Italian": [
          "Bancone's fresh pasta perfection", "Italian trattoria warmth", "Novikov's Asian-Italian fusion"
        ],
        // Japanese Cuisine Restaurants
        "Japanese": [
          "Zuma's contemporary Japanese", "Nobu's Japanese-Peruvian fusion", "Roka's robatayaki grilling", 
          "Koya Bar's Japanese comfort", "Japanese izakaya comfort"
        ],
        // Indian/South Asian Cuisine Restaurants
        "Indian": [
          "Dishoom's Bombay café culture", "Hoppers' Sri Lankan street food", "Indian restaurant spices"
        ],
        // Thai Cuisine Restaurants
        "Thai": [
          "Kiln's Thai fire cooking", "Thai street food authenticity"
        ],
        // Spanish Cuisine Restaurants
        "Spanish": [
          "Sabor's authentic Spanish tapas", "Barrafina's Spanish counter dining", "Spanish tapas creativity"
        ],
        // Chinese Cuisine Restaurants
        "Chinese": [
          "China Tang's Cantonese classics", "Bao's Taiwanese street food"
        ],
        // French Cuisine Restaurants
        "French": [
          "French bistro elegance", "Sketch's artistic innovation"
        ],
        // Middle Eastern Cuisine Restaurants
        "Middle Eastern": [
          "Oma's Middle Eastern flavours", "Lebanese meze selections"
        ],
        // Seafood Restaurants (for various cuisines)
        "Seafood": [
          "Sexy Fish's glamorous seafood", "Bentley's Oyster Bar seafood"
        ],
        // International/Other
        "Mexican": ["Mexican cantina flavors"],
        "Greek": ["Greek taverna traditions"],
        "Korean": ["Korean BBQ techniques"],
        "Vietnamese": ["Vietnamese pho mastery"],
        "Moroccan": ["Moroccan tagine houses"],
        "Turkish": ["Turkish kebab mastery"],
        "Peruvian": ["Peruvian cevicheria freshness"],
        "Argentinian": ["Argentinian parrilla grilling"],
        "Brazilian": ["Brazilian churrascaria cuts"],
        "Ethiopian": ["Ethiopian injera sharing"],
        "Portuguese": ["Portuguese seafood tavernas"],
        "German": ["German beer hall heartiness"],
        "Austrian": ["Austrian schnitzel houses"],
        "Swiss": ["Swiss fondue alpine warmth"],
        "Belgian": ["Belgian brasserie classics"]
      };
      
      // Find restaurants that match the selected cuisine
      let suitableRestaurants = (restaurantCuisineMap as any)[selectedCuisine] || [];
      
      // If no specific restaurants for the cuisine, use general restaurant styles
      if (suitableRestaurants.length === 0) {
        suitableRestaurants = [
          `authentic ${selectedCuisine} restaurant traditions`,
          `traditional ${selectedCuisine} cooking techniques`,
          `professional ${selectedCuisine} kitchen methods`
        ];
      }
      
      const selectedType = suitableRestaurants[Math.floor(Math.random() * suitableRestaurants.length)];
      
      inspirationPrompt = `Create a ${selectedCuisine} recipe title inspired by ${selectedType}.
      
FOCUS: Restaurant-quality flavor techniques adapted for confident home cooking.
RESTAURANT STYLE: Include restaurant name or style in the title when possible (e.g., "Hawksmoor-Style Steak", "Dishoom-Style Curry", "Zuma-Style Sushi").
MEAT PREFERENCE: Unless specifically vegan/vegetarian, strongly favor meat-based dishes as the main protein.`;

    } else {
      // Occasion and mood-based creativity
      const occasions = [
        "cozy weekend cooking", "impressive dinner parties", "quick weeknight solutions",
        "comfort food cravings", "seasonal celebrations", "romantic evenings", 
        "family gatherings", "outdoor entertaining", "winter warmth", "spring freshness",
        "summer lightness", "autumn harvest", "nostalgic comfort", "elegant sophistication"
      ];
      const selectedOccasion = occasions[Math.floor(Math.random() * occasions.length)];
      
      inspirationPrompt = `Create a ${selectedCuisine} recipe title perfect for ${selectedOccasion}.
      
FOCUS: Dishes that create the right mood and satisfy the specific craving or occasion.
STYLE: Emphasize what makes this dish special and appealing.
MEAT PREFERENCE: Unless specifically vegan/vegetarian, strongly favor meat-based dishes as the main protein.`;
    }

    // Get words to avoid for variety
    const avoidWords = getAvoidWords(data.clientId || '');
    const recentWords = getRecentWords(data.clientId || '');
    
    let varietyNotes = '';
    if (avoidWords.length > 0) {
      varietyNotes = `\nVARIETY NOTES: Avoid overused words: ${avoidWords.join(', ')}. Use fresh, creative descriptors.`;
    } else if (recentWords.length > 3) {
      // If we have history but no repeated words, still encourage variety
      const recentSample = recentWords.slice(-5);
      varietyNotes = `\nVARIETY NOTES: Recent words used: ${recentSample.join(', ')}. Use different descriptive language.`;
    }

    const systemMessage = `You are Zest, a creative culinary inspiration expert. Create enticing, flavorful recipe titles that spark foodie excitement while remaining approachable for home cooks.

CRITICAL CHEF NAME RULE: When creating chef-inspired titles, you MUST start with "[Chef Name]-Inspired" - this is MANDATORY, not optional! For example: "Gordon Ramsay-Inspired Beef Wellington", "Jamie Oliver-Inspired Pasta", "Nigella Lawson-Inspired Chocolate Cake".

CORE MISSION:
- Generate cookbook-worthy titles that maximize flavor and cooking techniques
- Balance sophistication with accessibility - inspire without intimidating  
- Create dishes that make home cooks feel proud to cook and serve
- Focus on authentic flavor development and proper cooking methods

CRITICAL AUTHENTICITY RULES:
- ONLY use dishes that authentically exist in the specified cuisine
- Italian: pasta, risotto, osso buco, saltimbocca, bruschetta, polenta - NOT beef pies, fish & chips
- British: shepherd's pie, beef wellington, fish & chips, bangers & mash - NOT tacos, pad thai
- French: coq au vin, bouillabaisse, cassoulet, ratatouille - NOT curry, stir-fry, pho-infused anything
- Thai: pad thai, tom yum, green curry, som tam - NOT fish & chips, shepherd's pie
- Indian: curry, biryani, dal, tandoori - NOT pizza, fish & chips
- Chinese: stir-fry, dumplings, hot pot, kung pao - NOT shepherd's pie, cassoulet
- Vietnamese: pho, banh mi, spring rolls - NOT bourguignon, fish & chips
- NEVER mix cuisine styles: no "pho-infused" French dishes, no "curry" Italian pasta, no "kimchi" Mexican tacos
- NEVER create impossible combinations like "Italian beef pie", "Thai shepherd's pie", or "Pho-Infused Beef Bourguignon"
- Each dish must be authentically from ONE cuisine tradition

CREATIVE FREEDOM:
- Draw from authentic global cuisines, chef techniques, and restaurant inspirations
- Use traditional dishes with modern flavor twists and ingredient upgrades
- Emphasize flavor-building techniques: caramelization, browning, layering
- Include seasonal ingredients and complementary flavor pairings
- Use varied, creative descriptors - avoid repetitive adjectives${varietyNotes}

AVOID OVERUSED WORDS:
- Instead of "herb-infused": use aromatic, fragrant, scented, perfumed, botanical
- Instead of "bliss": use delight, heaven, paradise, nirvana, euphoria
- Instead of "golden": use amber, burnished, caramelized, bronzed, sun-kissed
- Instead of "crispy": use crunchy, crackling, brittle, crisp, textured
- Instead of "rustic": use farmhouse, country-style, traditional, homestyle, artisanal
- Instead of "heavenly/divine": use sublime, exquisite, magnificent, extraordinary

OUTPUT FORMAT: JSON with "title" field only. Keep titles 4-8 words, appetizing and clear.`;

    const userMessage = `USER INSPIRATION: "${data.userIntent || 'delicious cooking'}"
CUISINE CONTEXT: ${selectedCuisine}
${data.avoid && data.avoid.length > 0 ? `AVOID: ${data.avoid.join(", ")}` : ""}

${inspirationPrompt}

CREATE A RECIPE TITLE THAT:
- Sounds delicious and makes people want to cook it
- Uses varied, appetizing descriptors (avoid overused words like "golden")
- Showcases the main ingredient and key cooking technique
- Feels special but achievable for home cooks
- Respects any ingredient restrictions

JSON OUTPUT: {"title": "Your Creative Recipe Title"}`;

    try {
      console.log(`🎯 [ChefAssistGPT5] Generating inspire title via AIProvider with ${inspirationAnalysis.promptStrategy.modelRecommendation}`);
      
      // Use AIService.chat for title generation since it's a creative conversational task
      const chatInput = {
        message: userMessage,
        context: {
          mode: "inspire_title",
          userPreferences: {
            cuisine: data.cuisinePreference,
            clientId: data.clientId
          }
        },
        model: inspirationAnalysis.promptStrategy.modelRecommendation as any
      };

      const aiProviderResponse = await AIService.chat(chatInput, {
        maxTokens: 150,
        userId: data.clientId ? parseInt(data.clientId, 10) : undefined,
        traceId: `inspire-title-${Date.now()}`,
        timeoutMs: 20000
      });

      // The chat response contains the JSON content in the message field
      const content = aiProviderResponse.message;
      if (!content) {
        throw new Error("No content received from AI model");
      }

      console.log("🎯 Raw inspire response via AIProvider:", content);
      const parsedResult = JSON.parse(content);
      const generatedTitle = parsedResult.title || "Delicious Home-Cooked Recipe";
      
      // Track words for variety (before returning)
      if (data.clientId) {
        trackTitleWords(data.clientId, generatedTitle);
      }
      
      // Record inspire title generation for variety tracking
      if (inspirationAnalysis.vaguePromptSignature && data.clientId) {
        UserInputAnalyzer.recordGeneration(
          inspirationAnalysis,
          data.clientId,
          selectedCuisine,
          'inspire_me'
        );
      }
      
      return {
        title: generatedTitle
      };

    } catch (error) {
      console.error("Inspire title generation error:", error);
      
      // Fallback title generation with variety
      const fallbackTitles = [
        "Pan-Seared Chicken with Aromatic Crust",
        "Bronzed Salmon with Lemon Butter", 
        "Slow-Braised Beef with Rich Gravy",
        "Fresh Pasta with Garlic and Parmesan",
        "Fragrant Spiced Rice with Vegetables",
        "Traditional Mushroom and Thyme Risotto",
        "Tender Lamb with Mint and Cumin",
        "Smoky Paprika-Rubbed Pork Chops"
      ];
      const fallbackTitle = fallbackTitles[Math.floor(Math.random() * fallbackTitles.length)];
      
      return { title: fallbackTitle };
    }
  }
}