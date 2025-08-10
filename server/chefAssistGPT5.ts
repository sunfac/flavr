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

You are "Zest," channeling the authentic voices of established cookbook authors and chefs. Your recipe must sound genuinely like it could appear in cookbooks by:

BRITISH CHEFS: Rick Stein (seafood mastery, Mediterranean influences), Jamie Oliver (simple, bold flavors), Tom Kerridge (pub food elevated), James Martin (approachable classics), Mary Berry (reliable techniques), Delia Smith (clear instruction), Marcus Wareing (refined technique), Gordon Ramsay (bold, confident)

INTERNATIONAL VOICES: Georgina Hayden (Eastern Mediterranean), Jose Pizarro (Spanish tapas), Nieves Barragan (modern Spanish), Jesse Jenkins (contemporary), Dishoom (authentic Indian restaurant style), Yotam Ottolenghi (Middle Eastern), Olia Hercules (Eastern European)

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
    
    // Authentic cuisine-specific dishes with detailed flavor-boosting elements
    const authenticDishes = {
      "British": [
        { name: "Slow-Braised Beef Short Rib", details: "with horseradish mash and red wine jus, 3-hour braise for melting texture" },
        { name: "Pan-Fried Dover Sole", details: "with brown butter, lemon and capers, 4-minute cooking for perfect flake" },
        { name: "Roast Lamb Shoulder", details: "with rosemary, garlic and anchovy, slow-roasted 2.5 hours for falling-apart tenderness" },
        { name: "Fish and Chips", details: "authentic beer batter with triple-cooked chips, proper mushy peas" },
        { name: "Shepherd's Pie", details: "with proper lamb mince, Worcestershire sauce depth, fluffy potato topping" }
      ],
      "Italian": [
        { name: "Osso Buco alla Milanese", details: "with saffron risotto, authentic 2.5-hour braise, bright gremolata finish" },
        { name: "Cacio e Pepe", details: "authentic Roman technique, proper pecorino emulsion, cracked black pepper heat" },
        { name: "Bistecca alla Fiorentina", details: "thick T-bone, charcoal-grilled 15 minutes, rosemary oil finish" },
        { name: "Risotto ai Porcini", details: "Carnaroli rice, dried porcini depth, proper mantecatura technique" },
        { name: "Pasta all'Amatriciana", details: "guanciale fat rendering, San Marzano tomatoes, pecorino sharpness" }
      ],
      "French": [
        { name: "Coq au Vin", details: "authentic Burgundy wine braising, lardons and pearl onions, 1.5-hour simmer" },
        { name: "Duck Confit", details: "traditional 6-hour slow cooking in duck fat, crispy skin finish" },
        { name: "Bouillabaisse", details: "authentic Marseille technique, proper rouille, saffron essence" },
        { name: "Beef Bourguignon", details: "2.5-hour braise, burgundy wine reduction, mirepoix foundation" },
        { name: "Cassoulet", details: "authentic Toulouse style, 4-hour slow cooking, duck fat richness" }
      ],
      "Thai": [
        { name: "Authentic Thai Laab", details: "toasted rice powder texture, fish sauce funk, lime acid balance, fresh herbs brightness" },
        { name: "Green Curry", details: "fresh curry paste, coconut cream splitting, Thai basil finish, proper heat balance" },
        { name: "Pad Thai", details: "tamarind paste sourness, palm sugar caramel, fish sauce umami, wok hei smokiness" },
        { name: "Som Tam", details: "green papaya crunch, lime-fish sauce dressing, dried shrimp depth, chilli heat" },
        { name: "Massaman Curry", details: "authentic Persian spices, coconut richness, slow-braised beef, potato sweetness" }
      ],
      "Greek": [
        { name: "Authentic Yuvetsi", details: "lamb shoulder 2-hour braise, orzo absorption cooking, tomato-wine base, kasseri cheese finish" },
        { name: "Moussaka", details: "proper bechamel topping, salted aubergine layers, lamb mince depth, nutmeg warmth" },
        { name: "Kleftiko", details: "parchment-wrapped lamb, 3-hour slow roasting, lemon-oregano marinade, falling-off-bone texture" },
        { name: "Avgolemono", details: "egg-lemon emulsion technique, chicken stock base, rice comfort, fresh dill brightness" },
        { name: "Spanakopita", details: "crispy phyllo layers, spinach-feta filling, proper butter brushing technique" }
      ],
      "Japanese": [
        { name: "Authentic Ramen", details: "20-hour tonkotsu broth, proper tare balance, handmade noodles, chashu belly technique" },
        { name: "Teriyaki Chicken", details: "authentic mirin-soy glaze, charcoal grilling, skin crisping technique" },
        { name: "Chirashi Bowl", details: "sushi-grade fish, proper rice seasoning, wasabi heat, pickled vegetables contrast" },
        { name: "Katsu Curry", details: "panko coating crunch, curry roux depth, cabbage freshness, proper frying technique" },
        { name: "Miso Glazed Cod", details: "48-hour miso marinade, sake sweetness, mirin gloss, delicate flaking" }
      ],
      "Indian": [
        { name: "Butter Chicken", details: "authentic tandoor char simulation, tomato-cream richness, garam masala warmth, kasoori methi aroma" },
        { name: "Biryani", details: "dum cooking technique, saffron-milk infusion, layered rice, meat tenderness" },
        { name: "Dal Makhani", details: "24-hour slow cooking, black lentil creaminess, butter richness, smokiness" },
        { name: "Lamb Rogan Josh", details: "Kashmiri chilli color, yogurt tenderizing, whole spice tempering, slow braising" },
        { name: "Fish Curry", details: "coconut milk base, curry leaf tempering, tamarind sourness, turmeric earthiness" }
      ]
    };
    
    const seasonCues = ["", "summer", "winter", "spring", "autumn"];
    
    // Enhanced randomization to prevent repetition
    const hashCode = (s: string) => s.split('').reduce((a, b) => (((a << 5) - a) + b.charCodeAt(0)) | 0, 0);
    const userIntentHash = hashCode((data.userIntent || "").toLowerCase());
    const sessionSalt = hashCode(data.clientId || "") ^ hashCode(new Date().toDateString());
    const timeEntropy = Math.floor(Date.now() / 50); // Changes every 50ms
    const randomBoost = Math.floor(Math.random() * 50000); // Additional entropy
    const rngSeed = data.seeds.randomSeed ^ userIntentHash ^ sessionSalt ^ timeEntropy ^ randomBoost;
    
    // Select cues based on seeded randomness
    const seededRandom = (seed: number, max: number) => Math.abs((seed * 9301 + 49297) % 233280) % max;
    
    const cuisineKeys = Object.keys(authenticDishes);
    
    // First select cuisine, then pick authentic dish
    const selectedCuisineKey = data.cuisinePreference ? 
      (cuisineKeys.find(k => k.toLowerCase().includes(data.cuisinePreference!.toLowerCase())) || "British") :
      cuisineKeys[seededRandom(rngSeed, cuisineKeys.length)];
    
    const selectedCuisineDishes = authenticDishes[selectedCuisineKey as keyof typeof authenticDishes];
    const selectedDish = selectedCuisineDishes[seededRandom(rngSeed + 1, selectedCuisineDishes.length)];

    const systemMessage = `Create authentic restaurant-quality recipe titles like professional chefs do. Each title must be unique and restaurant menu-worthy. Use descriptive, appetizing language.`;

    const userMessage = `Create an authentic recipe title for: ${selectedDish.name}

Key Details: ${selectedDish.details}
Cuisine: ${selectedCuisineKey}
User Intent: ${data.userIntent || "delicious cooking"}

PREFER LONGER, DESCRIPTIVE TITLES (6-10 words):
- "30 Garlic Clove Lamb Leg" (5 words) ✓ GOOD
- "Slow-Braised Beef Short Ribs" (5 words) ✓ GOOD  
- "Pan-Fried Dover Sole with Brown Butter" (7 words) ✓ GOOD
- "6-Hour Duck Confit" (4 words) ✓ GOOD
- "Grilled Mackerel and Gooseberry Salad" (6 words) ✓ GOOD
- "Thai Green Curry" (3 words) ✓ SIMPLE BUT GOOD

NATURAL VARIATIONS:
- "Crispy Chicken Katsu Curry" (not "with curry")
- "Lemon Herb Roasted Salmon" (not "with herbs")  
- "Spicy Beef Rogan Josh" (not "with spices")
- "20-Hour Braised Beef Ribs" (timing sounds impressive)
- "30 Garlic Clove Lamb" (ingredient count is appealing)
- Only use "with" when it genuinely improves the title

AVOID TECHNICAL JARGON AND FLOWERY WORDS:
- Don't use: emulsion, gastrique, spherification, jus, ravishing, silky, genuine
- Keep it simple, direct, and appealing to home cooks
- Use everyday cooking words that sound delicious but not pretentious

VARY YOUR LANGUAGE:
- Instead of always "Classic": Slow-Braised, Pan-Fried, Grilled, Roasted, Spicy, etc.
- Include specific details: ingredient counts, cooking methods, simple descriptors
- Make it sound delicious and approachable

AIM FOR 5-8 WORDS. Be descriptive but natural.

IMPORTANT: This title must be RESTAURANT MENU-WORTHY and AUTHENTIC to the cuisine.
Make it sound like something you'd see at a high-quality restaurant.

Output JSON with "title" key containing the recipe title.`;

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
      
      return { title };
      
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