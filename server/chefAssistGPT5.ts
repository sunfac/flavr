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
    
    // Token headroom rule - GPT-5 needs more tokens for reasoning phase
    const needsExtraTokens = data.userIntent.includes("sauce") || data.userIntent.includes("side") || 
                            adjustedPacks.techniquePack.includes("multi") || adjustedPacks.creativityPack === "modern-plating-logic";
    const maxTokens = needsExtraTokens ? 16000 : 12000; // Much higher for GPT-5's reasoning phase
    
    const systemMessage = `You are "Zest," a Michelin-starred executive chef who writes cookbook-quality recipes for skilled home cooks. 
Priorities: maximum flavour, cultural authenticity, clear technique, efficient home-kitchen execution. 
Use British English and metric. Assume a UK supermarket. Avoid rare equipment and brand names. 
Prefer meat/fish/shellfish proteins unless the user specifies otherwise; do not use tofu unless requested. 
Be concise and practical; explain technique briefly where it unlocks flavour. 
If packs conflict with time, equipment, or authenticity, adjust to the nearest coherent alternative and note it in "style_notes".
For Chef Assist, output strictly as JSON matching the provided schema. Do not include any text outside JSON.`;

    const userMessage = `ULTRA-SEED PACKS (post-guardrail):
- randomSeed: ${data.seeds.randomSeed}
- techniquePack: ${adjustedPacks.techniquePack}
- simplicityPack: ${adjustedPacks.simplicityPack}
- creativityPack: ${adjustedPacks.creativityPack}
- seasonPack: ${adjustedPacks.seasonPack}
- texturePack: ${adjustedPacks.texturePack}
- flavourPack: ${adjustedPacks.flavourPack}

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
- Title must follow the QUIRKY-BUT-CLEAR TITLE RULE: 4–10 words with exactly one unexpected/cheffy term (e.g., "Maillard", "ash-smoked", "char-kissed", "fermented", "pickled", "umami-rich", or playful "Mallard").
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
      
      const completion = await openai.chat.completions.create({
        model: "gpt-5",
        messages: [
          { role: "system", content: systemMessage },
          { role: "user", content: userMessage }
        ],
        max_completion_tokens: maxTokens,
        response_format: { type: "json_object" }
      });
      
      console.log(`GPT-5 response received in ${Date.now() - startTime}ms`);

      console.log("GPT-5 full recipe response received, parsing...");
      const content = completion.choices[0]?.message?.content;
      if (!content) {
        console.error("GPT-5 completion structure:", JSON.stringify(completion, null, 2));
        throw new Error("Empty response from GPT-5");
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
    
    // Lightweight title cue pools (no chef jargon)
    const techniqueCues = [
      "slow-braised", "pan-seared", "oven-roasted", "grilled", "crispy-fried",
      "steam-kissed", "gently poached", "buttery", "sheet-pan", "pressure-braised",
      "confited", "low-and-slow", "smoky-rubbed", "hand-tossed", "quick-cured"
    ];
    
    const seasonCues = [
      "spring herb", "summer", "autumn", "winter", "light roast", "all-season"
    ];
    
    const textureCues = [
      "crispy", "silky", "tender", "crackling", "sticky-glaze", "char-edged",
      "crumb-crusted", "brothy", "airy", "flaky"
    ];
    
    const flavourCues = [
      "umami-rich", "citrus-bright", "herb-lifted", "nutty", "aromatic-spiced",
      "garlicky", "sweet-savory", "smoky", "pickled-accent", "fermented-note",
      "peppery", "chilli-warm"
    ];
    
    const proteinPool = {
      omnivore: ["chicken", "salmon", "cod", "prawns", "beef", "pork", "lamb"],
      vegetarian: ["mushrooms", "aubergine", "halloumi", "cauliflower", "chickpeas"],
      vegan: ["mushrooms", "aubergine", "cauliflower", "chickpeas", "butternut squash"]
    };
    
    // Deterministic selection based on seeds
    const hashCode = (s: string) => s.split('').reduce((a, b) => (((a << 5) - a) + b.charCodeAt(0)) | 0, 0);
    const userIntentHash = hashCode((data.userIntent || "").toLowerCase());
    const sessionSalt = hashCode(data.clientId || "") ^ hashCode(new Date().toDateString());
    const rngSeed = data.seeds.randomSeed ^ userIntentHash ^ sessionSalt;
    
    // Select cues based on seeded randomness
    const seededRandom = (seed: number, max: number) => Math.abs((seed * 9301 + 49297) % 233280) % max;
    
    const techniqueCue = techniqueCues[seededRandom(rngSeed, techniqueCues.length)];
    const seasonCue = seasonCues[seededRandom(rngSeed + 1, seasonCues.length)];
    const textureCue = textureCues[seededRandom(rngSeed + 2, textureCues.length)];
    const flavourCue = flavourCues[seededRandom(rngSeed + 3, flavourCues.length)];
    
    // Determine dietary mode (default to omnivore)
    const dietaryMode = data.avoid?.includes("meat") ? "vegetarian" : 
                       data.avoid?.includes("dairy") ? "vegan" : "omnivore";
    const proteins = proteinPool[dietaryMode];
    const protein = proteins[seededRandom(rngSeed + 4, proteins.length)];
    
    // Skip season if "all-season", use sparingly
    const includeSeasonCue = seasonCue !== "all-season" && seededRandom(rngSeed + 5, 3) === 0;
    const includeTextureCue = seededRandom(rngSeed + 6, 2) === 0;
    
    const systemMessage = `You create memorable, cookbook-style recipe titles for home cooks. Titles are short, plain-English, appetising, and reflect the given cues. Avoid chef-science terms and banned words. Output exactly one title, no extra text.`;

    const userMessage = `Generate ONE unique recipe title that matches these cues:
• technique: ${techniqueCue}
• flavour: ${flavourCue}
• protein: ${protein}
${includeSeasonCue ? `• season: ${seasonCue}` : ''}
${includeTextureCue ? `• texture: ${textureCue}` : ''}
Rules:
• 4–10 words, cookbook/restaurant tone.
• Include the protein clearly.
• Use only plain-English descriptors; avoid technical or chef-science words.
• Do not use: Maillard, sous-vide, gastrique, espuma, spherification, nitro, transglutaminase, molecular.
Return JSON with exactly one field "title" containing the recipe title.`;

    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-5",
        messages: [
          { role: "system", content: systemMessage },
          { role: "user", content: userMessage }
        ],
        max_completion_tokens: 2000, // GPT-5 needs much more for reasoning
        response_format: { type: "json_object" } // Back to JSON for GPT-5 compatibility
      });

      const content = completion.choices[0]?.message?.content?.trim();
      console.log("Raw GPT-5 inspire response:", content);
      
      if (!content) {
        console.error("GPT-5 completion structure:", JSON.stringify(completion, null, 2));
        throw new Error("Empty response from GPT-5");
      }

      try {
        const parsed = JSON.parse(content);
        return { title: parsed.title };
      } catch (parseError) {
        // If JSON parsing fails, try to extract title from text
        const cleanTitle = content.replace(/^["']|["']$/g, '').replace(/\.$/, '').trim();
        return { title: cleanTitle };
      }
      
    } catch (error) {
      console.error("GPT-5 Inspire error:", error);
      // Fallback with deterministic title based on cues
      const fallbackTitle = `${techniqueCue.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')} ${protein.charAt(0).toUpperCase() + protein.slice(1)} with ${flavourCue.split('-').join(' ')} Notes`;
      return { title: fallbackTitle };
    }
  }
}