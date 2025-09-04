import { OpenAI } from "openai";
import { UserInputAnalyzer, UserInputAnalysis } from './userInputAnalyzer';
import { AdaptivePromptBuilder, AdaptivePromptResult } from './adaptivePromptBuilder';

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

  // JSON cleaning utility
  static cleanAndValidateJSON(content: string): string {
    return content
      .replace(/[\x00-\x1F\x7F-\x9F]/g, ' ')
      .replace(/,\s*}/g, '}')
      .replace(/,\s*]/g, ']')
      .replace(/\n/g, ' ')
      .replace(/\t/g, ' ')
      .trim();
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
      ? { model: "gpt-4o", tokens: 3500 }
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
    
    // Build adaptive prompt based on analysis
    const promptResult = AdaptivePromptBuilder.buildOptimizedPrompt(
      inputAnalysis,
      {
        userIntent: data.userIntent,
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
      console.log(`Calling ${promptResult.modelRecommendation} for full recipe with max_completion_tokens: ${promptResult.maxTokens}`);
      const startTime = Date.now();
      
      const completionPromise = openai.chat.completions.create({
        model: promptResult.modelRecommendation,
        messages: [
          { role: "system", content: systemMessage },
          { role: "user", content: userMessage }
        ],
        max_tokens: promptResult.maxTokens,
        response_format: { type: "json_object" }
      });
      
      let completion: any;
      try {
        completion = await Promise.race([
          completionPromise, 
          new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout after 35s')), 35000))
        ]);
      } catch (timeoutError) {
        console.log("First attempt timed out, retrying with fallback model...");
        
        completion = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            { role: "system", content: systemMessage },
            { role: "user", content: userMessage }
          ],
          max_tokens: 4096,
          response_format: { type: "json_object" }
        });
      }
      
      console.log(`Recipe response received in ${Date.now() - startTime}ms`);

      let content = completion.choices[0]?.message?.content;
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
        
        // Advanced JSON repair - fix common AI JSON issues
        content = content
          .replace(/,\s*}/g, '}')                    // Remove trailing commas before }
          .replace(/,\s*]/g, ']')                    // Remove trailing commas before ]
          .replace(/([^"]),(\s*[}\]])/g, '$1$2')     // Fix comma spacing issues
          .replace(/}\s*{/g, '},{')                  // Fix missing commas between objects
          .replace(/]\s*\[/g, '],[')                 // Fix missing commas between arrays
          .replace(/:\s*"([^"]*[^\\])"\s*([,}\]])/g, ': "$1"$2') // Fix quote issues
          .replace(/"\s*:\s*""/g, '": ""')           // Fix empty string values
          .replace(/:\s*,/g, ': "",')                // Fix missing values
          .replace(/,\s*,/g, ',');                   // Remove duplicate commas
          
        try {
          recipe = JSON.parse(content);
        } catch (secondError) {
          console.error("Advanced repair failed, trying fallback:", secondError);
          
          // Extract just the JSON part if there's extra text
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            recipe = JSON.parse(jsonMatch[0]);
          } else {
            throw new Error("Could not repair JSON response");
          }
        }
      }
      
      console.log("Recipe parsed successfully:", recipe.title);
      
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
    } else if (data.cuisinePreference) {
      selectedCuisine = cuisineContexts.find(c => c.toLowerCase().includes(data.cuisinePreference!.toLowerCase())) || "British";
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

    // Enhanced inspiration categories with creative freedom
    const inspirationType = Math.floor(Math.random() * 3); // Equal distribution
    
    let inspirationPrompt = "";
    
    if (inspirationType === 0) {
      // Chef-inspired with global variety
      const chefStyles = [
        "Gordon Ramsay's bold techniques", "Jamie Oliver's approachable classics", "Nigella Lawson's comfort elegance",
        "Yotam Ottolenghi's vibrant Mediterranean", "José Andrés' Spanish mastery", "Rick Stein's seafood expertise", 
        "Mary Berry's reliable techniques", "Tom Kerridge's pub refinement", "David Chang's Korean-American fusion",
        "Julia Child's French fundamentals", "Anthony Bourdain's global street food", "Marcus Wareing's precision"
      ];
      const selectedStyle = chefStyles[Math.floor(Math.random() * chefStyles.length)];
      
      inspirationPrompt = `Create a ${selectedCuisine} recipe title inspired by ${selectedStyle}.
      
FOCUS: Signature techniques and flavor combinations that create memorable, delicious dishes for home cooks.
STYLE: Use "Chef Name-Inspired" format to show inspiration without claiming authenticity.`;

    } else if (inspirationType === 1) {
      // Restaurant-style excellence  
      const restaurantTypes = [
        "British gastropub classics", "Italian trattoria warmth", "French bistro elegance", 
        "Spanish tapas creativity", "Thai street food authenticity", "Japanese izakaya comfort",
        "Indian restaurant spices", "Mexican cantina flavors", "Greek taverna traditions",
        "Lebanese meze selections", "Korean BBQ techniques", "Vietnamese pho mastery"
      ];
      const selectedType = restaurantTypes[Math.floor(Math.random() * restaurantTypes.length)];
      
      inspirationPrompt = `Create a ${selectedCuisine} recipe title inspired by ${selectedType}.
      
FOCUS: Restaurant-quality flavor techniques adapted for confident home cooking.
STYLE: Capture the essence of professional cooking in accessible format.`;

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
STYLE: Emphasize what makes this dish special and appealing.`;
    }

    const systemMessage = `You are Zest, a creative culinary inspiration expert. Create enticing, flavorful recipe titles that spark foodie excitement while remaining approachable for home cooks.

CORE MISSION:
- Generate cookbook-worthy titles that maximize flavor and cooking techniques
- Balance sophistication with accessibility - inspire without intimidating  
- Create dishes that make home cooks feel proud to cook and serve
- Focus on authentic flavor development and proper cooking methods

CREATIVE FREEDOM:
- Draw from global cuisines, chef techniques, and restaurant inspirations
- Combine traditional dishes with modern twists when appropriate
- Emphasize flavor-building techniques: caramelization, browning, layering
- Include seasonal ingredients and complementary flavor pairings

OUTPUT FORMAT: JSON with "title" field only. Keep titles 4-8 words, appetizing and clear.`;

    const userMessage = `USER INSPIRATION: "${data.userIntent || 'delicious cooking'}"
CUISINE CONTEXT: ${selectedCuisine}
${data.avoid && data.avoid.length > 0 ? `AVOID: ${data.avoid.join(", ")}` : ""}

${inspirationPrompt}

CREATE A RECIPE TITLE THAT:
- Sounds delicious and makes people want to cook it
- Uses clear, appetizing language ("golden", "crispy", "tender", "aromatic")
- Showcases the main ingredient and key cooking technique
- Feels special but achievable for home cooks
- Respects any ingredient restrictions

JSON OUTPUT: {"title": "Your Creative Recipe Title"}`;

    try {
      console.log(`Calling ${inspirationAnalysis.promptStrategy.modelRecommendation} for inspire title generation`);
      
      const result = await openai.chat.completions.create({
        model: inspirationAnalysis.promptStrategy.modelRecommendation,
        messages: [
          { role: "system", content: systemMessage },
          { role: "user", content: userMessage }
        ],
        max_tokens: 150,
        response_format: { type: "json_object" }
      });

      const content = result.choices[0]?.message?.content;
      if (!content) {
        throw new Error("No content received from OpenAI");
      }

      console.log("Raw inspire response:", content);
      const parsedResult = JSON.parse(content);
      
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
        title: parsedResult.title || "Delicious Home-Cooked Recipe"
      };

    } catch (error) {
      console.error("Inspire title generation error:", error);
      
      // Fallback title generation
      const fallbackTitles = [
        "Golden Pan-Seared Chicken with Herbs",
        "Crispy-Skinned Salmon with Lemon Butter", 
        "Slow-Braised Beef with Rich Gravy",
        "Fresh Pasta with Garlic and Parmesan",
        "Aromatic Spiced Rice with Vegetables"
      ];
      const fallbackTitle = fallbackTitles[Math.floor(Math.random() * fallbackTitles.length)];
      
      return { title: fallbackTitle };
    }
  }
}