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

You are "Zest," a Michelin-starred executive chef who writes cookbook-quality recipes for skilled home cooks. 
Priorities: maximum flavour, cultural authenticity, clear technique, efficient home-kitchen execution. 
Use British English and metric. Assume a UK supermarket. Avoid rare equipment and brand names. 
Prefer meat/fish/shellfish proteins unless the user specifies otherwise; do not use tofu unless requested. 
Be concise and practical; explain technique briefly where it unlocks flavour. 
If packs conflict with time, equipment, or authenticity, adjust to the nearest coherent alternative and note it in "style_notes".
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

• If broad_theme:
  - Seeds strongly drive the concrete choices (protein selection, technique pack, texture, flavour path).
  - Choose a coherent regional frame (e.g., Mediterranean BBQ vs. US-style) and stick to it.
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
        model: "gpt-5",
        messages: [
          { role: "system", content: systemMessage },
          { role: "user", content: userMessage }
        ],
        max_completion_tokens: maxTokens,
        response_format: { type: "json_object" },
        reasoning_effort: "low"
      });
      
      let completion: any;
      try {
        completion = await Promise.race([completionPromise, timeoutPromise]);
      } catch (timeoutError) {
        console.log("First attempt timed out, retrying with reduced verbosity...");
        
        // Retry with medium verbosity and reduced tokens
        completion = await openai.chat.completions.create({
          model: "gpt-5",
          messages: [
            { role: "system", content: systemMessage },
            { role: "user", content: userMessage }
          ],
          max_completion_tokens: 1200,
          response_format: { type: "json_object" },
          reasoning_effort: "low"
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
          model: "gpt-5",
          messages: [
            { role: "system", content: systemMessage },
            { role: "user", content: userMessage },
            { role: "assistant", content: content },
            { role: "user", content: continuationPrompt }
          ],
          max_completion_tokens: 800,
          response_format: { type: "json_object" },
          reasoning_effort: "low"
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

  // Generate inspiration title using GPT-5 (fast, lightweight version)
  static async generateInspireTitle(data: {
    seeds: SeedPacks;
    userIntent?: string;
    cuisinePreference?: string;
    avoid?: string[];
    clientId?: string;
  }): Promise<{ title: string }> {
    
    // Resolve seeds to short cues before API call
    const cuisineCues = ["Italian", "Mexican", "Japanese", "Middle Eastern", "Modern British", "French", "Thai", "Indian", "Mediterranean"];
    const proteinPool = {
      omnivore: ["chicken thighs", "salmon fillets", "cod fillets", "king prawns", "beef sirloin", "pork tenderloin", "lamb shoulder"],
      vegetarian: ["portobello mushrooms", "aubergine", "halloumi", "cauliflower", "chickpeas"],
      vegan: ["king oyster mushrooms", "aubergine", "cauliflower steaks", "chickpeas", "butternut squash"]
    };
    // Much more varied approaches - not just techniques
    const approachCues = [
      "roasted", "grilled", "braised", "pan-fried", "baked", "steamed", "poached", "seared", "smoked", "stewed",
      "spiced", "marinated", "stuffed", "wrapped", "crusted", "glazed", "caramelized", "charred", "slow-cooked", "crispy"
    ];
    const flavourCues = [
      "garlic", "lemon", "herb", "tomato", "wine", "coconut", "ginger", "chilli", "honey", "mustard", 
      "olive", "butter", "cream", "soy", "miso", "lime", "orange", "rosemary", "thyme", "basil",
      "paprika", "cumin", "coriander", "mint", "parsley", "sage", "balsamic", "citrus"
    ];
    const seasonCues = ["", "summer", "winter", "spring", "autumn"];
    
    // Deterministic selection based on seeds
    const hashCode = (s: string) => s.split('').reduce((a, b) => (((a << 5) - a) + b.charCodeAt(0)) | 0, 0);
    const userIntentHash = hashCode((data.userIntent || "").toLowerCase());
    const sessionSalt = hashCode(data.clientId || "") ^ hashCode(new Date().toDateString());
    const rngSeed = data.seeds.randomSeed ^ userIntentHash ^ sessionSalt;
    
    // Select cues based on seeded randomness
    const seededRandom = (seed: number, max: number) => Math.abs((seed * 9301 + 49297) % 233280) % max;
    
    const cuisine = data.cuisinePreference || cuisineCues[seededRandom(rngSeed, cuisineCues.length)];
    const approach = approachCues[seededRandom(rngSeed + 1, approachCues.length)];
    const flavour = flavourCues[seededRandom(rngSeed + 2, flavourCues.length)];
    const season = seasonCues[seededRandom(rngSeed + 3, seasonCues.length)];
    
    // Determine dietary mode and select protein
    const dietaryMode = data.avoid?.includes("meat") ? "vegetarian" : 
                       data.avoid?.includes("dairy") ? "vegan" : "omnivore";
    const proteins = proteinPool[dietaryMode];
    const protein = proteins[seededRandom(rngSeed + 4, proteins.length)];

    const systemMessage = `Create authentic recipe titles that sound like they're from established cookbooks by Rick Stein, Jamie Oliver, Tom Kerridge, or restaurant menus from Dishoom. Be genuine and unpretentious.`;

    const userMessage = `Create a recipe title using: ${protein}, ${approach}, ${flavour}, ${cuisine} style.

Study how real chefs name their dishes - simple, confident, no unnecessary words:

Rick Stein: "Grilled Mackerel with Gooseberry Sauce", "Roasted Bream with Fennel"
Jamie Oliver: "Pork Chops with Apple", "Chicken Cacciatore", "Perfect Roast Chicken"
Tom Kerridge: "Braised Beef Short Rib", "Slow-Cooked Lamb Shoulder"
Dishoom: "Railway Station Chicken Curry", "House Black Daal", "Gunpowder Potatoes"
Mary Berry: "Beef Wellington", "Lemon Drizzle Cake", "Victoria Sponge"
Delia Smith: "Perfect Roast Beef", "Thai Green Chicken Curry"

Keep it authentic and straightforward. Real chefs don't oversell - they let the food speak.

Format: "[Cooking Method] [Protein] with [Key Ingredient/Sauce]" or "[Protein] [Cooking Method]"

Output JSON only with "title" key.`;

    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemMessage },
          { role: "user", content: userMessage }
        ],
        max_tokens: 400,
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
      return { title: parsed.title };
      
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
          max_tokens: 400,
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