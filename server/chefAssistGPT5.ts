import { OpenAI } from "openai";

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
      this.recipeCache.delete(firstKey);
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
    
    const stylePacks = selectStylePacks(data.seeds, data.userIntent, data.clientId || "");
    const { packs: adjustedPacks, adjustments } = applyCoherenceGuardrails(stylePacks, data.timeBudget || null);
    
    const dynamicTargetRange = getDynamicTargetRange(adjustedPacks.simplicityPack);
    
    // Use smart model selection
    const modelConfig = this.selectOptimalModel(data.userIntent, data.dietaryNeeds, data.mustUse);
    const fallbackTokens = 4096;

    const systemMessage = `You are "Zest," a cookbook-quality recipe expert. Create authentic, flavorful recipes in the style of established chefs like Rick Stein, Jamie Oliver, Nigella Lawson, Yotam Ottolenghi.

CORE REQUIREMENTS:
- British English, metric measurements, UK ingredients
- Professional techniques with clear instructions
- Complete methods from prep to plating
- Authentic flavor development and seasoning
- Output JSON only, match schema exactly

RECIPE STANDARDS:
- Use supermarket ingredients, avoid making basics from scratch
- Focus on technique and flavor layering
- Include proper timing and temperature guidance
- Ensure dietary requirements are strictly followed

OUTPUT: Return ONLY JSON matching the provided schema. No extra text.`;

    const userMessage = `Generate complete recipe JSON immediately. Focus on flavor and clear instructions.

USER REQUEST: "${data.userIntent}"

RECIPE PARAMETERS:
- Servings: ${data.servings}
- Time budget: ${data.timeBudget || "flexible"}
- Dietary needs: ${data.dietaryNeeds?.join(", ") || "none"}
- Must-use ingredients: ${data.mustUse?.join(", ") || "none"}
- Avoid ingredients: ${data.avoid?.join(", ") || "none"}
- Equipment: ${data.equipment?.join(", ") || "standard kitchen"}
- Budget: ${data.budgetNote || "standard"}
- Cuisine preference: ${data.cuisinePreference || "flexible"}

RECIPE REQUIREMENTS:
- Target ingredient count: ${dynamicTargetRange}
- Include complete cooking method with timing
- Add finishing touches and flavor enhancement tips
- Provide side dish suggestions
- Respect all dietary restrictions strictly

JSON SCHEMA:
{
  "title": "4-8 words, appetizing and clear",
  "servings": ${data.servings},
  "time": { "prep_min": 15, "cook_min": 25, "total_min": 40 },
  "cuisine": "string",
  "style_notes": [${adjustments.map(a => `"${a}"`).join(", ")}],
  "equipment": ["pan","oven"],
  "ingredients": [
    { "section": "Main", "items": [{ "item": "...", "qty": 0, "unit": "g|ml|tbsp", "notes": "" }] }
  ],
  "method": [
    { "step": 1, "instruction": "Clear step", "why_it_matters": "Brief reason" }
  ],
  "finishing_touches": ["..."],
  "flavour_boosts": ["..."],
  "make_ahead_leftovers": "Brief note",
  "allergens": ["..."],
  "shopping_list": [{ "item": "...", "qty": 0, "unit": "..." }],
  "side_dishes": [{ "name": "...", "description": "...", "quick_method": "..." }]
}`;

    try {
      console.log(`Calling ${modelConfig.model} for full recipe with max_completion_tokens: ${modelConfig.tokens}`);
      const startTime = Date.now();
      
      const completionPromise = openai.chat.completions.create({
        model: modelConfig.model,
        messages: [
          { role: "system", content: systemMessage },
          { role: "user", content: userMessage }
        ],
        max_tokens: modelConfig.tokens,
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
          max_tokens: fallbackTokens,
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
        
        // Advanced JSON repair
        content = content
          .replace(/,\s*}/g, '}')
          .replace(/,\s*]/g, ']')
          .replace(/([^"]),( s*[}\]])/g, '$1$2')
          .replace(/}\ s*{/g, '},{')
          .replace(/]\ s*\[/g, '],[');
          
        recipe = JSON.parse(content);
      }
      
      console.log("Recipe parsed successfully:", recipe.title);
      
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
    
    // Use optimized model selection for cost efficiency
    const modelConfig = this.selectOptimalModel(data.userIntent || 'inspire me', [], []);
    
    // Enhanced cuisine selection for variety
    const cuisineContexts = [
      "British", "Italian", "French", "Thai", "Greek", "Japanese", "Indian", 
      "Chinese", "Mexican", "Spanish", "Turkish", "Lebanese", "Moroccan", 
      "Korean", "Vietnamese", "German", "Portuguese", "Peruvian", "Ethiopian",
      "Brazilian", "Argentinian", "Russian", "Polish", "Hungarian"
    ];
    
    // Smart randomization for variety
    const hashCode = (s: string) => s.split('').reduce((a, b) => (((a << 5) - a) + b.charCodeAt(0)) | 0, 0);
    const userIntentHash = hashCode((data.userIntent || "").toLowerCase());
    const sessionSalt = hashCode(data.clientId || "") ^ hashCode(new Date().toDateString());
    const timeBasedSeed = Date.now() + Math.floor(Math.random() * 10000);
    const rngSeed = data.seeds.randomSeed ^ userIntentHash ^ sessionSalt ^ timeBasedSeed;
    
    const seededRandom = (seed: number, max: number) => Math.abs((seed * 9301 + 49297) % 233280) % max;
    
    const selectedCuisine = data.cuisinePreference ? 
      (cuisineContexts.find(c => c.toLowerCase().includes(data.cuisinePreference!.toLowerCase())) || "British") :
      cuisineContexts[seededRandom(rngSeed, cuisineContexts.length)];

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
      const selectedStyle = chefStyles[seededRandom(rngSeed + 1000, chefStyles.length)];
      
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
      const selectedType = restaurantTypes[seededRandom(rngSeed + 2000, restaurantTypes.length)];
      
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
      const selectedOccasion = occasions[seededRandom(rngSeed + 3000, occasions.length)];
      
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
      console.log(`Calling ${modelConfig.model} for inspire title generation`);
      
      const result = await openai.chat.completions.create({
        model: modelConfig.model,
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