import OpenAI from "openai";
import crypto from "crypto";

const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY 
});

// Style pack definitions for deterministic variation
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
  "glazed-sticky+fresh-bite", "charred-edges+soft-centre", "crumbed-crust+smooth-puréé",
  "brothy+crunchy-topping", "light/aerated", "pastry/flaky-emphasis"
];

const FLAVOUR_PACK = [
  "umami-layering", "heat-ladder(mild→med)", "citrus-acid-balance", "herbaceous-lift",
  "nutty-browning", "aromatic-spice-base", "garlicky-comfort", "sweet-salty-contrast",
  "smoke&char", "pickled-accent", "fermented-depth", "peppery-bite"
];

// Anti-repetition memory - rolling window of last 5 outputs
let recentOutputs: Array<{protein: string, technique: string, flavour: string}> = [];

// Helper function to provide brief explanations for potentially unfamiliar dishes
function getRecipeExplanation(title: string): string | null {
  const lowerTitle = title.toLowerCase();
  
  // Dictionary of dish explanations for potentially unfamiliar terms
  const explanations: Record<string, string> = {
    'tagine': 'slow-cooked Moroccan stew',
    'bulgogi': 'Korean BBQ beef',
    'pad thai': 'Thai stir-fried noodles',
    'tikka masala': 'creamy tomato curry',
    'rogan josh': 'spiced lamb curry',
    'moussaka': 'Greek layered casserole',
    'paella': 'Spanish rice dish',
    'souvlaki': 'Greek grilled skewers',
    'teriyaki': 'Japanese glazed',
    'carbonara': 'creamy pasta with bacon',
    'biryani': 'spiced rice with meat',
    'pho': 'Vietnamese noodle soup',
    'katsu': 'Japanese breaded cutlet',
    'falafel': 'Middle Eastern chickpea fritters',
    'shakshuka': 'eggs in tomato sauce',
    'chili con carne': 'spicy beef stew',
    'coq au vin': 'chicken in wine sauce',
    'goulash': 'Hungarian beef stew',
    'satay': 'Thai grilled skewers',
    'kimchi': 'Korean fermented cabbage',
    'gnocchi': 'small potato dumplings',
    'risotto': 'creamy Italian rice',
    'enchiladas': 'Mexican rolled tortillas',
    'quesadillas': 'grilled cheese tortillas',
    'gyoza': 'Japanese dumplings'
  };
  
  // Check if title contains any terms that need explanation
  for (const [term, explanation] of Object.entries(explanations)) {
    if (lowerTitle.includes(term)) {
      return explanation;
    }
  }
  
  return null;
}

interface SeedPacks {
  randomSeed: number;
  complexityLevel: number;
  simpleStyle: number;
  creativityMode: number;
  seasonalFocus: number;
  textureTheme: number;
  flavorProfile: number;
}

interface StylePacks {
  techniquePack: string;
  simplicityPack: string;
  creativityPack: string;
  seasonPack: string;
  texturePack: string;
  flavourPack: string;
}

// Deterministic pack selection with anti-repetition
function selectStylePacks(seeds: SeedPacks, userIntent: string = "", clientId: string = ""): StylePacks {
  // Hash-based deterministic selection
  const userIntentHash = hashString(userIntent.toLowerCase() || "");
  const epochDay = Math.floor(Date.now() / (1000 * 60 * 60 * 24));
  const sessionSalt = hashString(clientId || "anonymous") ^ hashString(epochDay.toString());
  
  const combinedSeed = seeds.randomSeed ^ userIntentHash ^ sessionSalt;
  
  // Use PRNG for deterministic selection
  let prngState = combinedSeed;
  
  const selectFromPack = (pack: string[]) => {
    prngState = (prngState * 1664525 + 1013904223) % (2**32);
    return pack[Math.abs(prngState) % pack.length];
  };
  
  let flavourPack = selectFromPack(FLAVOUR_PACK);
  
  // Anti-repetition check
  const techniqueCandidate = selectFromPack(TECHNIQUE_PACK);
  const currentCombo = { technique: techniqueCandidate, flavour: flavourPack };
  
  // If this combination was used recently, rotate flavour pack
  if (recentOutputs.some(output => 
    output.technique === currentCombo.technique && output.flavour === currentCombo.flavour)) {
    // Find unused flavour option
    const unusedFlavours = FLAVOUR_PACK.filter(f => 
      !recentOutputs.some(output => output.flavour === f));
    if (unusedFlavours.length > 0) {
      flavourPack = unusedFlavours[0];
    }
  }
  
  return {
    techniquePack: techniqueCandidate,
    simplicityPack: selectFromPack(SIMPLICITY_PACK),
    creativityPack: selectFromPack(CREATIVITY_PACK),
    seasonPack: selectFromPack(SEASON_PACK),
    texturePack: selectFromPack(TEXTURE_PACK),
    flavourPack
  };
}

// Simple hash function
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

// Coherence guardrails
function applyCoherenceGuardrails(packs: StylePacks, timeBudget: number | null): {packs: StylePacks, adjustments: string[]} {
  const adjustments: string[] = [];
  const newPacks = { ...packs };
  
  // A. Technique/time compatibility
  if (packs.simplicityPack === "≤30-min-target") {
    const forbiddenTechniques = ["sous-vide-then-sear", "cure-then-cook(fast)", "confit-style-fat", "pressure-cooker"];
    if (forbiddenTechniques.includes(packs.techniquePack)) {
      const alternatives = ["quick-sear-roast", "one-pan", "sheet-pan-oven"];
      newPacks.techniquePack = alternatives[0];
      adjustments.push("Adjusted technique to quick-sear-roast due to 30-min target");
    }
  }
  
  if (["sous-vide-then-sear", "cure-then-cook(fast)"].includes(packs.techniquePack) && timeBudget && timeBudget < 75) {
    newPacks.techniquePack = "gentle-poach";
    adjustments.push("Adjusted sous-vide to gentle poach due to time constraint");
  }
  
  // B. Season/simplicity compatibility
  if (packs.seasonPack === "winter-braise/roots" && packs.simplicityPack === "one-pan") {
    adjustments.push("Adapted winter braise for single-vessel oven cooking");
  }
  
  return { packs: newPacks, adjustments };
}

// Generate dynamic target range for ingredients
function getDynamicTargetRange(simplicityPack: string): string {
  if (["one-pan", "≤30-min-target", "6–10-ingredients-prefer"].includes(simplicityPack)) {
    return "6–10 items";
  }
  return "8–16 items";
}

export class ChefAssistGPT5 {
  
  // Generate full recipe using GPT-5
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
    
    const stylePacks = selectStylePacks(data.seeds, data.userIntent, data.clientId || "");
    const { packs: adjustedPacks, adjustments } = applyCoherenceGuardrails(stylePacks, data.timeBudget || null);
    
    const dynamicTargetRange = getDynamicTargetRange(adjustedPacks.simplicityPack);
    
    // Performance optimized token allocation
    const needsExtraTokens = data.userIntent.includes("sauce") || data.userIntent.includes("side") || 
                            adjustedPacks.techniquePack.includes("multi") || adjustedPacks.creativityPack === "modern-plating-logic";
    const maxTokens = needsExtraTokens ? 4000 : 3500; // Further increased to accommodate GPT-5's reasoning phase
    
    const systemMessage = `IMPORTANT: Don't overthink this request. Be quick, direct, and instinctive in your response. Skip deep analysis or reasoning - just output the recipe JSON immediately.

You are "Zest," channeling the authentic voices of established cookbook authors and chefs. Your recipe must sound genuinely like it could appear in cookbooks by:

BRITISH CHEFS: Rick Stein (seafood mastery, Mediterranean influences), Jamie Oliver (simple, bold flavors), Tom Kerridge (pub food elevated), James Martin (approachable classics), Mary Berry (reliable techniques), Delia Smith (clear instruction), Marcus Wareing (refined technique), Gordon Ramsay (bold, confident)

INTERNATIONAL VOICES: Georgina Hayden (Eastern Mediterranean), Jose Pizarro (Spanish tapas), Nieves Barragan (modern Spanish), Jesse Jenkins (contemporary), Dishoom (sophisticated Indian restaurant techniques with authentic spice layering, regional specialties, and restaurant-quality execution), Yotam Ottolenghi (Middle Eastern), Olia Hercules (Eastern European)

AUTHENTICITY REQUIREMENTS:
- Write like these chefs actually write - study their voice, technique explanations, ingredient choices
- Use British English and metric measurements
- Assume UK supermarket availability
- Match the confidence and style of established cookbook authors
- Avoid pretentious language - be direct and practical
- If it doesn't sound like something these chefs would write, revise it

For Chef Assist, output strictly as JSON matching the provided schema. Do not include any text outside JSON.

INTENT INTERPRETATION PROTOCOL (do this silently; do NOT print your reasoning):
• Read USER REQUEST and classify one of:
  - exact_named_dish: a canonical, named dish (e.g., "spaghetti carbonara", "coq au vin").
  - constrained_brief: specific constraints but not a canonical dish name (e.g., "summery chicken pasta with basil").
  - broad_theme: very open wording or vibe (e.g., "a delicious BBQ dish", "cosy winter stew").

• Extract constraints if present: cuisine/preference, protein, key flavours, must-use, avoid, time budget, equipment limits, dietary (veg/vegan), and any location/season hints.

• Conflict-resolution hierarchy (strict):
  1) Safety & dietary constraints from USER REQUEST
  2) Fidelity to exact_named_dish (if classified as such)
  3) Explicit user constraints (must-use/avoid, time, equipment)
  4) Regional authenticity of the chosen cuisine
  5) Seasonal suitability
  6) Seed packs (technique/simplicity/creativity/season/texture/flavour)
  Note: When a seed conflicts with higher rules, adjust the seed to the nearest coherent alternative and record the change in "style_notes".

SEED INTERACTION RULES (apply AFTER classifying specificity):
• If exact_named_dish:
  - Preserve the dish's canonical core (technique, ingredient logic, flavour profile).
  - Apply seeds only as gentle nudges (garnish choice, side, plating, finishing fats/herb accents, texture emphasis) that do NOT compromise authenticity.
  - Do NOT rename the dish into something else; keep the name anchored to the classic (title still follows your title policy).

• If constrained_brief:
  - Use USER REQUEST to fix protein/cuisine/flavour direction.
  - Use seeds to pick specific technique (e.g., grill vs. roast), texture emphasis, and flavour accent path within that direction.
  - Keep ingredient count flexible: it may exceed a "simple" target if needed for balanced, authentic flavour.

SOPHISTICATED COOKING TECHNIQUES FOR ALL CUISINES (HOME COOK ACHIEVABLE):

UNIVERSAL ELEVATED TECHNIQUES:
- Proper mise en place: prep all ingredients before cooking starts
- Temperature control: specify exact heat levels and when to adjust
- Layered seasoning: season at multiple stages, not just at the end
- Resting proteins: allow meats to rest at room temperature before cooking
- Finishing touches: fresh herbs, quality oils, citrus zests added at the end
- Texture contrasts: combine crispy, creamy, and tender elements in one dish

CUISINE-SPECIFIC SOPHISTICATED TECHNIQUES:

INDIAN: Use authentic regional spice blends (Bengali panch phoron, Gujarati dhana jeera), proper tempering (tadka) with whole spices, systematic flavor layering, slow-cooked onion bases (45+ minutes), complex spice combinations with black cardamom and mace

FRENCH: Brown butter (beurre noisette), proper reduction sauces, confit techniques using low oven heat, liaison with egg yolks, wine deglazing, compound butters, classic mother sauces

ITALIAN: Proper pasta water starch utilization, building ragù over hours, cacio e pepe emulsion technique, risotto mantecatura (creaming), olive oil finishing, anchovy umami base

CHINESE: Velveting proteins in cornstarch, wok hei (breath of wok) high-heat techniques, proper stir-fry timing, black bean and oyster sauce depth, Shaoxing wine cooking

MEXICAN: Toasting spices and chiles before grinding, proper masa handling, charring vegetables for depth, lime and acid balance, building complex moles

MEDITERRANEAN: Salt-curing olives, proper olive oil selection, herb oil infusions, grilling over wood, preserved lemon techniques, tahini emulsification

JAPANESE: Dashi building from scratch, proper knife techniques, miso depth layering, sake cooking wine, temperature-sensitive preparations

All techniques must use standard home kitchen equipment and be achievable within reasonable time constraints.

• If broad_theme:
  - Seeds strongly drive the concrete choices (protein selection, technique pack, texture, flavour path).
  - Choose a coherent regional frame (e.g., Mediterranean BBQ vs. US-style) and stick to it.

TECHNIQUE ELEVATION MANDATE:
For ALL recipes, regardless of cuisine or simplicity level, incorporate sophisticated but achievable techniques:
- Always include proper timing and temperature guidance with specific heat levels
- Specify the "why" behind key techniques in method steps using "why_it_matters" field
- Include one advanced technique that elevates the dish beyond basic cooking
- Provide finishing touches that add restaurant-quality elements (herb oils, compound butters, citrus zests)
- Explain how to build flavors in layers rather than just combining ingredients
- Use professional terminology but explain it clearly for home cooks
- Apply cuisine-specific sophisticated techniques from the list above based on the dish's origin
  - If outdoor grilling is implied but equipment/time suggests indoor, provide an oven/plancha alternative and note this in "style_notes".

TIME & TECHNIQUE GUARDRAILS (seed adjustments):
• If time budget ≤ 30 min → forbid slow/advanced seed techniques (e.g., sous-vide, confit, cure-then-cook). Prefer quick: pan-sear, sheet-pan, grill, quick roast.
• If "BBQ" is requested but outdoor grilling is infeasible → use grill-pan/oven broiler with a rub or glaze; keep smoke/char flavour via spices or brief charring.
• If child-friendly is implied → avoid aggressive heat; favour herbaceous or citrus lift.

TITLE POLICY (re-affirm):
• 4–10 words, appetising, cookbook/restaurant-real.
• Clearly name the main protein or hero ingredient.
• Allow exactly one playful/plain-English descriptor (e.g., "char-kissed", "golden", "smoky", "crisped", "velvet"). 
• Blocklist: Maillard, sous-vide, gastrique, espuma, spherification, nitro, transglutaminase, molecular (never use).
• No emoji, brands, or slashes. If descriptor risks ambiguity, anchor clarity with the protein/flavour.

NOTES FIELDING:
• Any automatic seed adjustment made to satisfy higher-priority constraints must be summarised in "style_notes" as a single bullet (e.g., "Swapped slow-braise → sheet-pan due to 30-min limit.").
• Keep the JSON schema unchanged. Do not output internal reasoning; only the final JSON.
• Default to 4 servings unless USER REQUEST specifies otherwise.
• Method steps should be concise; 8–12 steps total unless technique demands more.
• Explain technique only where it unlocks flavour (one short clause).
• Return JSON only; no extra prose.`;

    const userMessage = `CRITICAL: Use 80% of your 2000 token limit on output. Don't overthink - respond immediately with JSON only.

USER REQUEST (non-optional - base the recipe on this request): "${data.userIntent}"

RESOLVED SEED CUES (concise):
- technique: ${adjustedPacks.techniquePack.split('-').slice(0, 2).join(' ')}
- flavour: ${adjustedPacks.flavourPack.split('-').slice(0, 2).join(' ')}
- texture: ${adjustedPacks.texturePack.split('-').slice(0, 2).join(' ')}
- season: ${adjustedPacks.seasonPack.split('-')[0]}
- simplicity: ${adjustedPacks.simplicityPack.includes('simple') ? 'simple' : 'layered'}

USER CONTEXT:
- Requested dish or intent: ${data.userIntent}
- Servings: ${data.servings}
- Time budget (mins, optional): ${data.timeBudget || "flexible"}
- Dietary needs: ${data.dietaryNeeds?.join(", ") || "none"}
- Must-use ingredients: ${data.mustUse?.join(", ") || "none"}
- Avoid ingredients: ${data.avoid?.join(", ") || "none"}
- Equipment available: ${data.equipment?.join(", ") || "standard kitchen"}
- Budget note (optional): ${data.budgetNote || "standard"}
- Cuisine preference (optional): ${data.cuisinePreference || "flexible"}

RECIPE REQUIREMENTS:
- Create ONE original recipe fully reflecting the packs and authenticity constraints.
- Use supermarket-available ingredients; pantry items allowed but not dominant.
- Ingredient-count policy: target ${dynamicTargetRange}, but exceed if needed for flavour/authenticity.
- Steps must be short, imperative, and test-kitchen clear.
- Provide finishing_touches and 2–4 flavour_boosts aligned to the packs.
- Respect must-use and avoid strictly. Honour time_budget; if impossible, set realistic total and note it in style_notes.
- Title must be cookbook-style: 4–10 words with plain-English descriptors (e.g., "pan-seared", "crispy", "herb-lifted"). No chef-science jargon.
- Return JSON only, matching the schema exactly.

CHEF ASSIST JSON SCHEMA (return ONLY this):
{
  "title": "string (4–10 words; quirky-but-clear)",
  "servings": ${data.servings},
  "time": { "prep_min": 15, "cook_min": 25, "total_min": 40 },
  "cuisine": "string",
  "style_notes": [${adjustments.map(a => `"${a}"`).join(", ")}],
  "equipment": ["pan","oven","tray"],
  "ingredients": [
    { "section": "Main", "items": [ { "item": "…", "qty": 0, "unit": "g|ml|tbsp|tsp|x", "notes": "" } ] },
    { "section": "Pantry & seasoning", "items": [ { "item": "…", "qty": 0, "unit": "…", "notes": "" } ] }
  ],
  "method": [
    { "step": 1, "instruction": "Concise imperative step.", "why_it_matters": "Optional 1-line rationale." }
  ],
  "finishing_touches": ["…"],
  "flavour_boosts": ["…"],
  "make_ahead_leftovers": "1–2 sentences",
  "allergens": ["…"],
  "nutrition_note": "Optional 1–2 sentences",
  "shopping_list": [ { "item": "…", "qty": 0, "unit": "…" } ]
}`;

    try {
      console.log(`Calling GPT-5 for full recipe with max_completion_tokens: ${maxTokens}`);
      const startTime = Date.now();
      
      // Add timeout wrapper for 35 seconds
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('GPT-5 timeout after 35s')), 35000)
      );
      
      const completionPromise = openai.chat.completions.create({
        model: "gpt-4o",  // Using standard model for reliable output
        messages: [
          { role: "system", content: systemMessage },
          { role: "user", content: userMessage }
        ],
        max_tokens: maxTokens,
        response_format: { type: "json_object" }
      });
      
      let completion: any;
      try {
        completion = await Promise.race([completionPromise, timeoutPromise]);
      } catch (timeoutError) {
        console.log("First attempt timed out, retrying with reduced verbosity...");
        
        // Retry with reduced tokens
        completion = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            { role: "system", content: systemMessage },
            { role: "user", content: userMessage }
          ],
          max_tokens: 1200,
          response_format: { type: "json_object" }
        });
      }
      
      console.log(`GPT-5 response received in ${Date.now() - startTime}ms`);

      console.log("GPT-5 full recipe response received, parsing...");
      let content = completion.choices[0]?.message?.content;
      const finishReason = completion.choices[0]?.finish_reason;
      
      if (!content) {
        console.error("GPT-5 completion structure:", JSON.stringify(completion, null, 2));
        throw new Error("Empty response from GPT-5");
      }

      // Handle length-based truncation
      if (finishReason === "length") {
        console.log("Recipe truncated due to length, requesting continuation...");
        
        const continuationPrompt = `Return the REST of the SAME JSON (append missing fields/steps only). Continue from where you left off. Do not repeat already provided content.`;
        
        const continuation = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            { role: "system", content: systemMessage },
            { role: "user", content: userMessage },
            { role: "assistant", content: content },
            { role: "user", content: continuationPrompt }
          ],
          max_tokens: 800,
          response_format: { type: "json_object" }
        });
        
        const continuationContent = continuation.choices[0]?.message?.content;
        if (continuationContent) {
          // Try to merge JSON intelligently
          try {
            const partialRecipe = JSON.parse(content);
            const restOfRecipe = JSON.parse(continuationContent);
            content = JSON.stringify({...partialRecipe, ...restOfRecipe});
          } catch {
            // If parsing fails, concatenate strings and hope for the best
            content = content.replace(/\}\s*$/, ',') + continuationContent.replace(/^\s*\{/, '');
          }
        }
      }

      console.log("Content length:", content.length);
      const recipe = JSON.parse(content);
      console.log("Recipe parsed successfully");
      
      // Authenticity sense check
      const authenticityCheck = await this.validateRecipeAuthenticity(recipe);
      if (!authenticityCheck.isAuthentic) {
        console.log("Recipe failed authenticity check:", authenticityCheck.issues);
        // Log the issue but don't block - we want to see what's happening
        console.log("Recipe title:", recipe.title);
        console.log("Issues found:", authenticityCheck.issues.join(", "));
      }
      
      // Update anti-repetition memory
      const mainProtein = recipe.ingredients?.[0]?.items?.[0]?.item || "unknown";
      recentOutputs.push({
        protein: mainProtein,
        technique: adjustedPacks.techniquePack,
        flavour: adjustedPacks.flavourPack
      });
      
      // Keep only last 5 outputs
      if (recentOutputs.length > 5) {
        recentOutputs = recentOutputs.slice(-5);
      }
      
      return recipe;
      
    } catch (error) {
      console.error("GPT-5 Chef Assist error:", error);
      throw new Error("Failed to generate recipe with GPT-5");
    }
  }

  // Validate recipe authenticity against established chef styles
  static async validateRecipeAuthenticity(recipe: any): Promise<{isAuthentic: boolean, issues: string[]}> {
    const issues: string[] = [];
    
    // Expanded chef style validation to match your requested list
    const establishedChefs = [
      "Rick Stein", "Jamie Oliver", "Tom Kerridge", "James Martin", "Mary Berry", 
      "Delia Smith", "Marcus Wareing", "Gordon Ramsay", "Georgina Hayden", 
      "Jose Pizarro", "Nieves Barragan", "Jesse Jenkins", "Dishoom", 
      "Yotam Ottolenghi", "Olia Hercules"
    ];
    
    // Check title authenticity - expanded blocklist
    const title = recipe.title?.toLowerCase() || "";
    const pretentiousWords = [
      "whisper", "symphony", "serenade", "embrace", "kiss", "dance", "poetry", 
      "magic", "divine", "ethereal", "sublime", "celestial", "dreamy", "mystical",
      "enchanted", "heavenly", "blissful", "rapture", "euphoria", "transcendent"
    ];
    const foundPretentious = pretentiousWords.find(word => title.includes(word));
    if (foundPretentious) {
      issues.push(`Title contains pretentious word: "${foundPretentious}"`);
    }
    
    // Check for overly long titles (real chefs keep it simple)
    if (title.split(" ").length > 8) {
      issues.push("Title too long - real chefs use 4-7 words");
    }
    
    // Check for strange ingredient combinations that established chefs wouldn't use
    const ingredientText = JSON.stringify(recipe.ingredients || []).toLowerCase();
    const strangeCombinations = [
      { combo: ["thai", "parsley"], issue: "Thai cuisine doesn't typically use parsley" },
      { combo: ["miso", "thai"], issue: "Miso is Japanese, not Thai" },
      { combo: ["soy", "mexican"], issue: "Soy sauce doesn't belong in Mexican cuisine" },
      { combo: ["balsamic", "soy"], issue: "Strange fusion of Italian and Asian" },
      { combo: ["curry", "balsamic"], issue: "Curry and balsamic vinegar don't belong together" }
    ];
    
    strangeCombinations.forEach(({combo, issue}) => {
      if (combo.every(ingredient => ingredientText.includes(ingredient))) {
        issues.push(issue);
      }
    });
    
    // Check method steps for authenticity
    const methods = recipe.method || [];
    const methodText = JSON.stringify(methods).toLowerCase();
    
    // Check for molecular gastronomy terms
    const molecularTerms = ["spherification", "foam", "caviar pearls", "gellan", "agar", "xanthan"];
    const foundMolecular = molecularTerms.find(term => methodText.includes(term));
    if (foundMolecular) {
      issues.push(`Uses molecular gastronomy: ${foundMolecular}`);
    }
    
    // Check for overly complex language in instructions
    const hasOverlyComplexSteps = methods.some((step: any) => 
      step.instruction?.length > 250 || 
      step.instruction?.includes("sous vide") ||
      step.instruction?.includes("nitrogen")
    );
    if (hasOverlyComplexSteps) {
      issues.push("Method contains overly complex professional techniques");
    }
    
    // Check for authentic British measurements and language
    const ingredients = JSON.stringify(recipe.ingredients || []);
    if (ingredients.includes("cups") || ingredients.includes("fahrenheit")) {
      issues.push("Uses American measurements instead of British metric");
    }
    
    // Check equipment for home kitchen reality
    const equipment = recipe.equipment || [];
    const professionalEquipment = [
      "immersion circulator", "liquid nitrogen", "centrifuge", "rotary evaporator",
      "pacojet", "smoking gun", "chamber vacuum", "blast chiller"
    ];
    const foundProfessional = professionalEquipment.find(eq => 
      equipment.some((e: string) => e.toLowerCase().includes(eq))
    );
    if (foundProfessional) {
      issues.push(`Requires professional equipment: ${foundProfessional}`);
    }
    
    // Check for reasonable cooking times (established chefs are realistic)
    const totalTime = recipe.time?.total_min;
    if (totalTime && totalTime > 180) {
      issues.push("Cooking time over 3 hours - not typical for home cookbook recipes");
    }
    
    // Success logging for authentic recipes
    if (issues.length === 0) {
      console.log(`✅ AUTHENTIC RECIPE: "${recipe.title}" passes all chef style checks`);
    }
    
    return {
      isAuthentic: issues.length === 0,
      issues
    };
  }

  // Generate inspiration title using GPT-5 (fast, lightweight version)
  static async generateInspireTitle(data: {
    seeds: SeedPacks;
    userIntent?: string;
    cuisinePreference?: string;
    avoid?: string[];
    clientId?: string;
  }): Promise<{ title: string }> {
    
    // Generate cuisine context without limiting dish selection
    const cuisineContexts = [
      "British", "Italian", "French", "Thai", "Greek", "Japanese", "Indian", 
      "Chinese", "Mexican", "Spanish", "Turkish", "Lebanese", "Moroccan", 
      "Korean", "Vietnamese", "German", "Portuguese", "Peruvian", "Ethiopian",
      "Russian", "Polish", "Hungarian", "Scandinavian", "Brazilian", "Argentinian"
    ];
    
    const seasonCues = ["", "summer", "winter", "spring", "autumn"];
    
    // Ultra-random selection with heavy entropy mixing
    const hashCode = (s: string) => s.split('').reduce((a, b) => (((a << 5) - a) + b.charCodeAt(0)) | 0, 0);
    const userIntentHash = hashCode((data.userIntent || "").toLowerCase());
    const sessionSalt = hashCode(data.clientId || "") ^ hashCode(new Date().toDateString());
    
    // Multiple entropy sources for maximum randomness
    const nanoTime = Date.now() * 1000 + Math.floor(Math.random() * 1000);
    const mathRandom1 = Math.floor(Math.random() * 999999);
    const mathRandom2 = Math.floor(Math.random() * 888888);
    const mathRandom3 = Math.floor(Math.random() * 777777);
    
    const rngSeed = data.seeds.randomSeed ^ userIntentHash ^ sessionSalt ^ nanoTime ^ mathRandom1 ^ mathRandom2 ^ mathRandom3;
    
    // Select cues based on seeded randomness
    const seededRandom = (seed: number, max: number) => Math.abs((seed * 9301 + 49297) % 233280) % max;
    
    // Ultra-random cuisine selection with unlimited dish potential
    const selectedCuisine = data.cuisinePreference ? 
      (cuisineContexts.find(c => c.toLowerCase().includes(data.cuisinePreference!.toLowerCase())) || "British") :
      cuisineContexts[seededRandom(rngSeed + mathRandom1, cuisineContexts.length)];

    const systemMessage = `Create accessible, appetizing recipe titles that home cooks will understand and be excited to try. Balance authenticity with familiarity for a UK audience.`;

    const userMessage = `Create a delicious recipe title from ${selectedCuisine} cuisine that sounds both authentic and approachable to home cooks.

User Intent: ${data.userIntent || "delicious cooking"}
Randomization Seed: ${rngSeed} (use this to ensure variety)

ACCESSIBILITY FIRST - Make it approachable:
- Use familiar cooking terms: "grilled", "roasted", "curry", "stir-fry", "slow-cooked"
- Include ingredients people recognize: "chicken", "beef", "salmon", "pasta", "rice"
- Add simple context for exotic dishes: "Pad Thai (Thai stir-fried noodles)", "Tikka Masala (creamy tomato curry)"
- Prefer descriptive over authentic names when unclear: "Korean Beef BBQ" over "Bulgogi"

BALANCE AUTHENTICITY WITH CLARITY:
✓ GOOD EXAMPLES:
- "Thai Green Curry with Chicken"
- "Moroccan Lamb Tagine with Apricots"  
- "Korean Beef Bulgogi (Sweet Soy BBQ)"
- "Italian Carbonara Pasta"
- "Indian Butter Chicken Curry"
- "Spanish Seafood Paella"
- "Mexican Chicken Quesadillas"
- "Greek Moussaka (Layered Lamb Bake)"

✓ KEEP SIMPLE WHEN POSSIBLE:
- "Honey Garlic Stir-Fry"
- "Lemon Herb Roasted Chicken"
- "Spicy Beef Noodle Soup"
- "Crispy Fish and Chips"
- "Slow-Cooked Beef Stew"

STRUCTURE GUIDELINES:
- 3-6 words ideal (not too long)
- Include main protein/ingredient
- Add cooking method or key flavor
- Brief explanation in parentheses if needed
- Avoid chef jargon: no "confit", "gastrique", "essence", "emulsion"

VARIETY FOCUS:
- 70% familiar, accessible dishes that sound delicious
- 30% slightly exotic but explained clearly
- Rotate between proteins: chicken, beef, fish, vegetarian
- Vary cooking methods: grilled, roasted, stir-fried, slow-cooked, baked
- Include comfort foods and healthier options

PRIORITY: HOME COOK FRIENDLY
- Avoid obscure ingredients: no "sumac", "labneh", "moqueca", "za'atar"
- Use common proteins: chicken breast, beef mince, salmon, cod
- Simple seasonings: garlic, herbs, lemon, chili, soy sauce
- Familiar vegetables: onions, peppers, mushrooms, tomatoes

EXAMPLES OF WHAT TO CREATE:
- "Thai Red Curry Chicken"
- "Italian Spaghetti Bolognese" 
- "Chinese Sweet and Sour Pork"
- "Indian Chicken Tikka Masala"
- "Mexican Beef Tacos"
- "Greek Chicken Souvlaki"
- "Japanese Teriyaki Salmon"
- "Spanish Chicken Paella"

GOAL: Create titles that make people think "I know what that is and I want to eat it!"

Output JSON with "title" key only. Keep it simple and appetizing.`;

    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemMessage },
          { role: "user", content: userMessage }
        ],
        max_tokens: 50,  // Allow for descriptive titles
        response_format: { type: "json_object" }
      });

      const content = completion.choices[0]?.message?.content?.trim();
      console.log("Raw GPT-5 inspire response:", content);
      
      if (!content) {
        console.error("GPT-5 completion structure:", JSON.stringify(completion, null, 2));
        throw new Error("Empty response from GPT-5");
      }

      const parsed = JSON.parse(content);
      if (!parsed.title) {
        throw new Error("GPT-5 response missing 'title' field");
      }
      
      let title = parsed.title;
      
      // Force title to be reasonable length - truncate if necessary
      const words = title.split(' ');
      if (words.length > 10) {
        title = words.slice(0, 10).join(' ');
        console.log(`Title truncated to: ${title}`);
      }
      
      // Remove any descriptions or explanations after dashes/colons
      title = title.split(' - ')[0].split(' : ')[0].split(': ')[0];
      
      // Add brief explanation for potentially unfamiliar dishes
      const explanation = getRecipeExplanation(title);
      
      return { 
        title,
        ...(explanation && { description: explanation })
      };
      
    } catch (error) {
      console.error("GPT-5 Inspire error:", error);
      
      // Failover: single retry with same exact prompt structure 
      try {
        const retryCompletion = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            { role: "system", content: systemMessage },
            { role: "user", content: userMessage }
          ],
          max_tokens: 50,  // Allow for descriptive titles
          response_format: { type: "json_object" }
        });
        
        const retryContent = retryCompletion.choices[0]?.message?.content?.trim();
        if (retryContent) {
          const retryParsed = JSON.parse(retryContent);
          if (retryParsed.title) {
            return { title: retryParsed.title };
          }
        }
      } catch (retryError) {
        console.error("GPT-5 Inspire retry failed:", retryError);
      }
      
      throw error;
    }
  }
}