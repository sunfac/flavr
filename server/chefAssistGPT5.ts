import OpenAI from "openai";
import crypto from "crypto";
import { aiCostTracker } from "./aiCostTracker";

const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY 
});

// Style pack definitions for deterministic variation
const TECHNIQUE_PACK = [
  "rustic-braise", "quick-sear-roast", "pan-sauce-reduction", "grill-marinade",
  "shallow-fry-crisp", "steam-then-sear", "gentle-poach", "roast-and-rest",
  "sheet-pan-oven", "pressure-cooker", "slow-cooker", "pan-fry-finish",
  "oven-roast", "stir-fry", "simple-bake"
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
  "smoke&char", "pickled-accent", "rich-and-savory", "peppery-bite"
];

// Anti-repetition memory - rolling window of last 5 outputs
let recentOutputs: Array<{protein: string, technique: string, flavour: string}> = [];

// Helper function to provide brief explanations for potentially unfamiliar dishes
function getRecipeExplanation(title: string): string | null {
  const lowerTitle = title.toLowerCase();
  
  // Dictionary of dish explanations for potentially unfamiliar terms
  const explanations: Record<string, string> = {
    // Middle Eastern & North African
    'tagine': 'slow-cooked Moroccan stew',
    'shakshuka': 'eggs in tomato sauce',
    'falafel': 'Middle Eastern chickpea fritters',
    'fattoush': 'mixed herb salad',
    'shawarma': 'roasted meat wrap',
    'hummus': 'chickpea dip',
    'baba ganoush': 'smoky eggplant dip',
    'tabbouleh': 'fresh parsley salad',
    
    // Asian (only less familiar dishes)
    'bulgogi': 'Korean BBQ beef',
    'rogan josh': 'spiced lamb curry',
    'okonomiyaki': 'savory pancake',
    'som tam': 'spicy papaya salad',
    'laksa': 'spicy coconut noodle soup',
    'rendang': 'slow-cooked spiced beef',
    'chả cá': 'Vietnamese turmeric fish',
    'bánh mì': 'Vietnamese sandwich',
    'bánh xèo': 'Vietnamese crepe',
    'bún bò huế': 'spicy beef noodle soup',
    'gỏi cuốn': 'fresh spring rolls',
    'cà ri': 'Vietnamese curry',
    
    // European (only less familiar dishes)
    'moussaka': 'Greek layered casserole',
    'souvlaki': 'Greek grilled skewers',
    'pörkölt': 'Hungarian slow-cooked stew',
    'nokedli': 'Hungarian dumplings',
    'bigos': 'hunter\'s stew',
    'ratatouille': 'vegetable stew',
    'bouillabaisse': 'fish stew',
    'bourride': 'Provençal fish stew with aioli',
    'cassoulet': 'white bean stew',
    'osso buco': 'braised veal shanks',
    'sauerbraten': 'marinated roast beef',
    'pot-au-feu': 'French boiled dinner',
    'choucroute': 'Alsatian sauerkraut stew',
    'confit': 'slow-cooked preserved meat',
    'brandade': 'salt cod puree',
    'aligot': 'French cheesy mashed potatoes',
    'tapenade': 'olive spread',
    'pissaladière': 'French onion tart',
    'açorda': 'Portuguese bread soup',
    'bacalhau': 'Portuguese salt cod',
    'francesinha': 'Portuguese sandwich',
    'caldo verde': 'Portuguese kale soup',
    'stroganina': 'Siberian frozen fish slices',
    'borscht': 'beet soup',
    'pierogi': 'Polish dumplings',
    'schnitzel': 'breaded cutlet',
    'sauerkraut': 'fermented cabbage',
    'spätzle': 'German egg noodles',
    
    // Latin American
    'enchiladas': 'Mexican rolled tortillas',
    'quesadillas': 'grilled cheese tortillas',
    'ceviche': 'citrus-cured fish',
    'mole': 'complex chocolate sauce',
    'cochinita pibil': 'slow-roasted pork',
    'empanadas': 'stuffed pastries',
    'chimichurri': 'herb sauce',
    'anticuchos': 'grilled skewers',
    'carapulcra': 'Peruvian potato and pork stew',
    'aji de gallina': 'Peruvian creamy chicken',
    'lomo saltado': 'Peruvian stir-fried beef',
    'causa': 'Peruvian layered potato dish',
    'tacu tacu': 'Peruvian rice and beans',
    'arroz con pollo': 'rice with chicken',
    'bandeja paisa': 'Colombian platter',
    'arepas': 'corn cakes',
    'cachapa': 'Venezuelan corn pancake',
    'pupusas': 'stuffed corn tortillas',
    'tamales': 'steamed corn dough',
    'pozole': 'Mexican hominy soup',
    'chiles rellenos': 'stuffed peppers',
    'mofongo': 'fried plantain dish',
    
    // African
    'bobotie': 'spiced meat casserole',
    'bunny chow': 'curry in bread bowl',
    'jollof': 'spiced rice dish',
    'injera': 'spongy flatbread',
    'doro wat': 'Ethiopian chicken stew',
    'aliche wat': 'Ethiopian fish stew',
    'kitfo': 'Ethiopian steak tartare',
    'berbere': 'Ethiopian spice blend',
    'fufu': 'starchy side dish',
    
    // General terms
    'satay': 'grilled skewers',
    'chili con carne': 'spicy beef stew'
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

CRITICAL: Always include complete cooking method from start to PLATING and SERVICE. Never stop before the final plating step.

You are "Zest," channeling the authentic voices of established cookbook authors and chefs. Your recipe must sound genuinely like it could appear in cookbooks by:

BRITISH CHEFS: Rick Stein (seafood mastery, Mediterranean influences), Jamie Oliver (simple, bold flavors), Tom Kerridge (pub food elevated), James Martin (approachable classics), Mary Berry (reliable techniques), Delia Smith (clear instruction), Marcus Wareing (refined technique), Gordon Ramsay (bold, confident), Nigella Lawson (indulgent comfort), Hugh Fearnley-Whittingstall (seasonal, sustainable)

INTERNATIONAL VOICES: Yotam Ottolenghi (Middle Eastern), José Andrés (Spanish innovation), Anthony Bourdain (global street food), Julia Child (French classics), Thomas Keller (American fine dining), Massimo Bottura (Italian innovation), Ferran Adrià (Spanish molecular), David Chang (Korean-American fusion), Dishoom (sophisticated Indian restaurant techniques)

AUTHENTICITY REQUIREMENTS:
- Write like these chefs actually write - study their voice, technique explanations, ingredient choices
- Use British English and metric measurements
- Assume UK supermarket availability
- Match the confidence and style of established cookbook authors
- Avoid pretentious language - be direct and practical
- If it doesn't sound like something these chefs would write, revise it

For Chef Assist, output strictly as JSON matching the provided schema. Do not include any text outside JSON.

IMPORTANT: Never instruct users to make basic pantry staples from scratch (tomato paste, soy sauce, vinegar, etc.). Use store-bought versions and focus on cooking techniques instead.

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
- CRITICAL: Include ALL foundation ingredients - onions, garlic, ginger, celery, carrots for aromatics as appropriate to cuisine
- ESSENTIAL: Don't skip flavor bases - stock/broth, wine, vinegars, citrus, fresh herbs, quality fats
- MANDATORY: Include finishing elements - fresh herbs, good olive oil, citrus zest, flaky salt, cracked pepper
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
- Ingredient-count policy: target ${dynamicTargetRange}, but prioritize COMPLETE flavor development - MUST include herbs, spices, acids, aromatics, and all essential components needed for the dish to reach its full potential. Don't cut corners on ingredients that build flavor layers.
- Steps must be short, imperative, and test-kitchen clear.
- Provide finishing_touches and 3–6 flavour_boosts aligned to the packs for maximum flavor development.
- Include 1-3 side dishes that complement the main dish for a complete meal experience.
- Respect must-use and avoid strictly. Honour time_budget; if impossible, set realistic total and note it in style_notes.
- CRITICAL DIETARY COMPLIANCE: If dietary needs are specified, the recipe MUST be fully compliant. For vegan: NO meat, dairy, eggs, fish, or animal products. For vegetarian: NO meat or fish (dairy/eggs OK). For gluten-free: NO wheat, barley, rye, or gluten-containing ingredients. For low-carb/keto: minimize carbohydrates. For low-fat: use minimal oils and fats. For low-sodium: avoid salt and high-sodium ingredients.
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
    { "step": 1, "instruction": "Concise imperative step.", "why_it_matters": "Optional 1-line rationale." },
    { "step": "final", "instruction": "Plate dish with garnish, suggest appropriate sides/accompaniments, and serve immediately.", "why_it_matters": "Complete meal presentation and pairing guidance." }
  ],
  "finishing_touches": ["Fresh herb finish", "Aromatic oil drizzle", "Citrus brightness"],
  "flavour_boosts": ["Season generously at each stage", "Build umami with quality ingredients", "Layer acids and fats", "Toast spices before using", "Finish with fresh herbs", "Balance with citrus or vinegar"],
  "make_ahead_leftovers": "1–2 sentences",
  "allergens": ["…"],
  "nutrition_note": "Optional 1–2 sentences",
  "shopping_list": [ { "item": "…", "qty": 0, "unit": "…" } ],
  "side_dishes": [
    {
      "name": "Side dish name",
      "description": "Brief description of the side dish",
      "quick_method": "Simple preparation method (1-2 sentences)"
    }
  ]
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
        max_tokens: 4500,  // Increased further to ensure complete recipes with plating
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
          max_tokens: 1500,  // Increased for complete continuation
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
      
      // Clean up any bad control characters before parsing
      content = content.replace(/[\x00-\x1F\x7F-\x9F]/g, ' ');
      
      // Try to parse the recipe
      let recipe;
      try {
        recipe = JSON.parse(content);
      } catch (parseError) {
        console.error("JSON parse error, attempting to fix:", parseError);
        // Try to fix common JSON issues
        content = content
          .replace(/,\s*}/g, '}') // Remove trailing commas
          .replace(/,\s*]/g, ']') // Remove trailing commas in arrays
          .replace(/\n/g, ' ') // Replace newlines with spaces
          .replace(/\t/g, ' '); // Replace tabs with spaces
        
        recipe = JSON.parse(content);
      }
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
    
    // Expanded chef style validation with comprehensive UK chef list
    const establishedChefs = [
      "Rick Stein", "Jamie Oliver", "Tom Kerridge", "James Martin", "Mary Berry", 
      "Delia Smith", "Marcus Wareing", "Gordon Ramsay", "Georgina Hayden", 
      "Jose Pizarro", "Nieves Barragan", "Jesse Jenkins", "Dishoom", 
      "Yotam Ottolenghi", "Olia Hercules", "Nigella Lawson", "Hugh Fearnley-Whittingstall",
      "Marco Pierre White", "Heston Blumenthal", "Michel Roux Jr", "Angela Hartnett",
      "Paul Hollywood", "Nadiya Hussain", "Ainsley Harriott", "Gino D'Acampo",
      "Phil Vickery", "John Torode", "Gregg Wallace", "Gary Rhodes", "Keith Floyd",
      "Ken Hom", "Madhur Jaffrey", "Prue Leith", "Raymond Blanc", "Antonio Carluccio",
      "Giorgio Locatelli", "Francesco Mazzei", "Atul Kochhar", "Vivek Singh",
      "Jun Tanaka", "Monica Galetti", "Clare Smyth", "Nathan Outlaw", "Josh Eggleton",
      "Anna Hansen", "Sat Bains", "Simon Rogan", "Tommy Banks", "Roberta Hall McCarron",
      "Lisa Goodwin-Allen", "Adam Handling", "Aktar Islam"
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

    const systemMessage = `Create appealing recipe titles that draw inspiration from famous chefs, renowned restaurants, or authentic world cuisine. Add brief descriptions for dishes that might be unfamiliar to home cooks.`;

    // Enhanced variety with better distribution across categories
    // Add more entropy to prevent repetition - use milliseconds for uniqueness
    const timeBasedSeed = Date.now();
    const uniqueCounter = Math.floor(Math.random() * 10000);
    const varietySeed = (rngSeed + timeBasedSeed + uniqueCounter) % 1000000;
    
    // Equal likelihood for three categories: Chef, Restaurant, Mood (33.33% each)
    const categoryRandom = Math.floor(Math.random() * 3);
    
    // Determine inspiration type based on pure random selection for equal distribution
    let inspirationType;
    if (categoryRandom === 0) {
      inspirationType = 0; // Chef-inspired
    } else if (categoryRandom === 1) {
      inspirationType = 1; // Restaurant-inspired
    } else {
      inspirationType = 2; // Mood-based
    }
    
    let inspirationPrompt = "";
    if (inspirationType === 0) {
      // Famous chef dishes and cookbook classics - equal likelihood for all chefs
      // Select individual chefs rather than groups for better distribution
      const allChefs = [
        "Gordon Ramsay", "Jamie Oliver", "Nigella Lawson", "Mary Berry", "Tom Kerridge", 
        "Rick Stein", "Delia Smith", "James Martin", "Hugh Fearnley-Whittingstall", 
        "Marco Pierre White", "Heston Blumenthal", "Michel Roux Jr", "Angela Hartnett",
        "Paul Hollywood", "Nadiya Hussain", "Ainsley Harriott", "Gino D'Acampo",
        "Yotam Ottolenghi", "José Andrés", "Julia Child", "Thomas Keller", "David Chang"
      ];
      const selectedChef = allChefs[seededRandom(varietySeed + 1000, allChefs.length)];
      const chefFocus = selectedChef;
      
      inspirationPrompt = `Create a recipe title inspired by ${chefFocus}, focusing on their signature dishes that maximize flavor through professional techniques.

IMPORTANT: 
- Always use "inspired by" language - never claim these are the actual chef's recipes
- Use formats like "Gordon Ramsay-Inspired" or "Inspired by Gordon Ramsay" rather than "Gordon Ramsay's"
- MUST create dishes that showcase FLAVOR MAXIMIZATION techniques:
  * Proper caramelization, Maillard reactions, umami building
  * Layered seasoning, acid-fat balance, textural contrasts
  * Professional techniques like deglazing, reduction, emulsification
- Avoid basic/simple dishes - aim for cookbook-quality recipes with depth

FORMAT: Simple titles without descriptions - "Chef Name-Inspired Dish Name" only.
FOCUS: Sophisticated, flavor-packed dishes that use professional techniques.

UK & WORLD-FAMOUS CHEF INSPIRATION (use variety based on seed ${varietySeed}):

UK CELEBRITY CHEFS (prioritize these):
- Gordon Ramsay's signature dishes (Beef Wellington, Hell's Kitchen favorites)
- Jamie Oliver's accessible classics (15-minute meals, comfort food)
- Nigella Lawson's indulgent comfort dishes  
- Mary Berry's beloved bakes and traditional British fare
- Tom Kerridge's pub-style comfort food
- Rick Stein's seafood specialties
- Delia Smith's foolproof classics
- James Martin's hearty British fare
- Hugh Fearnley-Whittingstall's sustainable cooking
- Marco Pierre White's refined classics
- Heston Blumenthal's innovative British cuisine
- Michel Roux Jr's French classics
- Angela Hartnett's Italian-inspired dishes
- Paul Hollywood's artisan breads and bakes
- Nadiya Hussain's comforting bakes and British-Bangladeshi fusion
- Ainsley Harriott's Caribbean-British favorites
- Gino D'Acampo's authentic Italian passion
- Phil Vickery's proper British cooking
- John Torode's Australian-British fusion
- Gregg Wallace's working-class favorites
- Gary Rhodes' refined British classics
- Keith Floyd's wine-paired adventures
- Ken Hom's authentic Chinese techniques
- Madhur Jaffrey's traditional Indian home cooking
- Prue Leith's classic techniques
- Raymond Blanc's French countryside cuisine
- Antonio Carluccio's rustic Italian
- Giorgio Locatelli's regional Italian mastery
- Francesco Mazzei's southern Italian specialties
- Atul Kochhar's modern Indian fine dining
- Vivek Singh's innovative Indian cuisine
- Jun Tanaka's French-Japanese fusion
- Monica Galetti's Samoan-French fusion
- Clare Smyth's three-Michelin-star perfection
- Nathan Outlaw's Cornish seafood mastery
- Josh Eggleton's seasonal British cooking
- Anna Hansen's global fusion dishes
- Sat Bains's innovative contemporary cuisine
- Simon Rogan's farm-to-fork philosophy
- Tommy Banks's Yorkshire ingredients focus
- Roberta Hall McCarron's Scottish modern cooking
- Lisa Goodwin-Allen's artistic presentations
- Adam Handling's waste-conscious cooking
- Aktar Islam's modern Indian cuisine

INTERNATIONAL CHEFS (for variety):
- Julia Child's French cooking fundamentals
- Anthony Bourdain's global street food
- Thomas Keller's precision cooking
- José Andrés' Spanish tapas mastery
- Yotam Ottolenghi's vibrant Mediterranean fusion
- David Chang's Korean-American innovations
- Ferran Adrià's avant-garde Spanish dishes
- Massimo Bottura's Italian innovation
- Wolfgang Puck's California cuisine
- Emeril Lagasse's Creole and Cajun specialties
- Alice Waters' farm-to-table philosophy
- Nobu Matsuhisa's Japanese-Peruvian fusion
- Daniel Boulud's French-American fusion
- Asma Khan's home-style Indian cooking
- Chantelle Nicholson's plant-forward cuisine
- Jeremy Lee's seasonal British classics
- Brett Graham's modern British innovation
- Claude Bosi's French fine dining
- Phil Howard's neighborhood restaurant style
- Jason Atherton's global brasserie concept
- Clare Smyth's ingredient-focused British
- Tommy Myllymäki's Swedish precision
- Magnus Nilsson's Nordic wilderness cooking
- René Redzepi's New Nordic movement
- Massimo Bottura's Italian innovation
- Alain Ducasse's French mastery
- Grant Achatz's molecular gastronomy
- Dominique Crenn's poetic French cuisine

EXAMPLES:
- "Gordon Ramsay-Inspired Beef Wellington with Mushroom Duxelles"
- "Jamie Oliver-Inspired 15-Minute Carbonara with Crispy Pancetta"
- "Nigella-Inspired Chocolate Guinness Cake"
- "Ottolenghi-Inspired Roasted Aubergine with Tahini"
- "Rick Stein-Inspired Classic Fish Pie"
- "Mary Berry-Inspired Victoria Sponge with Fresh Cream"
- "Tom Kerridge-Inspired Hand & Flowers Slow-Cooked Lamb"
- "Heston-Inspired Perfect Roast Chicken"
- "Paul Hollywood-Inspired Sourdough Focaccia"
- "Paul Ainsworth-Inspired Cornish Monkfish with Cider Sauce"
- "Nieves Barragán-Inspired Milk-Fed Lamb with Romesco"
- "Nathan Outlaw-Inspired Pan-Fried John Dory"
- "Simon Rogan-Inspired Heritage Carrot with Goat's Curd"
- "Marcus Wareing-Inspired Beef Short Rib with Bone Marrow"
- "Asma Khan-Inspired Hyderabadi Biryani"
- "René Redzepi-Inspired Fermented Mushroom Broth"`;
    } else if (inspirationType === 1) {
      // Restaurant inspired - equal selection from all restaurants
      const allRestaurants = [
        "Dishoom", "Padella", "The Ivy", "Sketch", "Hawksmoor", "Barrafina", "Gymkhana", 
        "Duck & Waffle", "Chiltern Firehouse", "St. John", "Bao", "Kiln", "Hoppers", 
        "Brat", "Lyle's", "Noble Rot", "The Clove Club", "Roka", "Zuma", "Dinings SW3", 
        "Lima", "Temper", "Smoking Goat", "Ikoyi", "The Ledbury", "Pollen Street Social", 
        "Dinner by Heston", "Core by Clare Smyth", "Trinity", "Petersham Nurseries", 
        "Hide", "Aqua Shard", "Galvin La Chapelle", "Rules", "Simpson's in the Strand", 
        "Sweetings", "Nando's", "Wagamama", "Pizza Express", "Byron", "Leon", "Yo! Sushi"
      ];
      
      const selectedRestaurant = allRestaurants[seededRandom(varietySeed + 2000, allRestaurants.length)];
      
      inspirationPrompt = `Create a recipe title inspired by signature dishes from ${selectedRestaurant}, focusing on flavor-maximizing techniques.

IMPORTANT: 
- Always use "inspired by" language for restaurants
- Focus on dishes that showcase MAXIMUM FLAVOR through:
  * Complex spice blends, marinades, slow-cooking
  * Charring, smoking, grilling for depth
  * Fermented elements, pickles, chutneys
  * Rich sauces, reductions, compound butters
FORMAT: Simple titles - "${selectedRestaurant}-Inspired Dish Name" only.`;
    } else {
      // Mood-based recipes
      const moods = [
        "comforting winter warmth", "fresh spring awakening", "summer celebration", 
        "cozy autumn gathering", "romantic dinner", "family feast", "quick weeknight", 
        "weekend indulgence", "healthy reset", "nostalgic childhood", "exotic adventure", 
        "elegant sophistication", "rustic simplicity", "spicy heat", "cooling freshness"
      ];
      
      const selectedMood = moods[seededRandom(varietySeed + 3000, moods.length)];
      
      inspirationPrompt = `Create a recipe title that captures the mood of "${selectedMood}" using flavor-maximizing techniques.

IMPORTANT:
- Focus on dishes that evoke the specific mood through ingredients, techniques, and presentation
- Use cooking methods that enhance the emotional connection to the dish
- Incorporate seasonal elements when appropriate to the mood
- Showcase professional techniques that build deep, satisfying flavors

FORMAT: Simple titles that capture the mood - "Mood-Inspired Dish Name"
REQUIREMENT: Every dish must showcase sophisticated cooking techniques and maximum flavor.

MOOD-BASED EXAMPLES:
- "Comforting Slow-Braised Short Ribs with Herb Butter"
- "Fresh Spring Pea and Mint Risotto with Lemon Oil"
- "Romantic Rose-Scented Duck with Cherry Gastrique"
- "Nostalgic Grandmother's Chicken and Dumplings"
- "Exotic Moroccan-Spiced Lamb with Apricot Glaze"`;
    }

    // Add dietary restrictions to the prompt
    const dietaryRestrictions = data.avoid || [];
    const isVeganOrVegetarian = dietaryRestrictions.some(restriction => 
      restriction.toLowerCase().includes('vegan') || restriction.toLowerCase().includes('vegetarian')
    );
    
    // Favor meat dishes 80% of the time when vegan/vegetarian isn't selected
    const shouldFavorMeat = !isVeganOrVegetarian && Math.random() < 0.8;
    
    const dietaryPrompt = dietaryRestrictions.length > 0 
      ? `\n\nCRITICAL DIETARY REQUIREMENTS:
- MUST be suitable for: ${dietaryRestrictions.join(', ')}
- NEVER suggest dishes containing ingredients that conflict with these dietary requirements
- For vegan: NO meat, dairy, eggs, fish, or animal products
- For vegetarian: NO meat, fish, or seafood (dairy and eggs OK)
- For gluten-free: NO wheat, barley, rye, or gluten-containing ingredients
- For dairy-free: NO milk, cheese, butter, cream, or dairy products
- Ensure all suggested dishes fully comply with the selected dietary restrictions`
      : '';
    
    const meatPreferencePrompt = shouldFavorMeat 
      ? `\n\nMEAT PREFERENCE: Strongly favor meat-based dishes (beef, pork, lamb, chicken, duck, etc.) over vegetarian options. Include high-quality proteins as the star ingredient.`
      : '';

    // Check if this is a meal-specific request
    const userIntent = data.userIntent || "delicious cooking";
    const lowerUserIntent = userIntent.toLowerCase();
    
    console.log(`🥞 BREAKFAST CHECK - User Intent: "${userIntent}", Lower: "${lowerUserIntent}", Contains breakfast: ${lowerUserIntent.includes('breakfast')}`);
    
    let mealSpecificPrompt = '';
    if (lowerUserIntent.includes('breakfast') || lowerUserIntent.includes('brunch')) {
      console.log('🥞 BREAKFAST MODE ACTIVATED - Adding critical breakfast constraints');
      
      mealSpecificPrompt = `\n\n🚨 CRITICAL BREAKFAST REQUIREMENT: This MUST be a BREAKFAST or BRUNCH dish. 

ALLOWED BREAKFAST DISHES ONLY:
- Eggs: scrambled, poached, omelettes, frittatas, shakshuka
- Pancakes, waffles, French toast, crepes
- Porridge, oatmeal, granola, yogurt bowls, acai bowls
- Breakfast meats: bacon, sausage, smoked salmon, ham
- Toast: avocado toast, breakfast sandwiches, croque monsieur
- Smoothie bowls, healthy breakfast bowls
- Pastries: croissants, danish, muffins
- Coffee/tea accompaniments

🚨 STRICTLY FORBIDDEN FOR BREAKFAST:
- NO roasted chicken, duck, lamb, beef
- NO heavy main courses or dinner dishes
- NO complex meat dishes meant for dinner
- NO sophisticated main courses

IF THE USER ASKED FOR BREAKFAST, ONLY SUGGEST BREAKFAST FOODS.`;
    } else if (lowerUserIntent.includes('lunch')) {
      mealSpecificPrompt = `\n\nMEAL REQUIREMENT: This should be a LUNCH dish - lighter than dinner but more substantial than snacks.`;
    } else if (lowerUserIntent.includes('dinner')) {
      mealSpecificPrompt = `\n\nMEAL REQUIREMENT: This should be a DINNER dish - substantial main course appropriate for evening meals.`;
    } else if (lowerUserIntent.includes('sauce') || lowerUserIntent.includes('dressing')) {
      mealSpecificPrompt = `\n\n🚨 SAUCE/DRESSING REQUIREMENT: This MUST be ONLY a sauce, dressing, or condiment - NEVER a main dish or full recipe.
      
ALLOWED SAUCE TYPES:
- Tomato sauces, cream sauces, pesto
- Pasta sauces, stir-fry sauces 
- Dressings, vinaigrettes, mayonnaises
- Glazes, reductions, compound butters
- Marinades, dips, chutneys

STRICTLY FORBIDDEN:
- NO full pasta dishes, NO main courses
- NO complete meals with protein + sauce
- ONLY the sauce/dressing component`;
    } else if (lowerUserIntent.includes('salad')) {
      mealSpecificPrompt = `\n\n🚨 SALAD REQUIREMENT: This MUST be a salad dish with fresh, light ingredients.
      
For "fresh salad" requests, prioritize:
- Light greens (arugula, spinach, mixed leaves)
- Fresh vegetables, herbs, light proteins
- Simple, bright dressings
- NO heavy meats like duck - use light proteins like chicken, fish, or vegetarian`;
    } else if (lowerUserIntent.includes('side dish') || lowerUserIntent.includes('side') || lowerUserIntent.includes('sides')) {
      mealSpecificPrompt = `\n\n🚨 SIDE DISH REQUIREMENT: This MUST be a side dish or accompaniment - NEVER a main course.
      
Examples: roasted vegetables, rice pilaf, bread, potatoes, etc.`;
    }

    const userMessage = `${inspirationPrompt}

🎯 CRITICAL USER INTENT: ${userIntent}
🎲 Randomization Seed: ${rngSeed} (use this to ensure variety)
${dietaryPrompt}${meatPreferencePrompt}${mealSpecificPrompt}

🚨 ABSOLUTE PRIMARY REQUIREMENT: The recipe title MUST EXACTLY fulfill the user's specific request: "${userIntent}"

🚨 ACCESSIBILITY REQUIREMENTS - AVOID EXTRAVAGANT INGREDIENTS & TECHNIQUES:
BANNED INGREDIENTS: truffle, caviar, foie gras, gold leaf, saffron, lobster, wagyu, uni, oysters, exotic mushrooms (matsutake, chanterelle), expensive cuts (dry-aged beef, rack of lamb)
BANNED TECHNIQUES: fermentation, sous-vide, molecular gastronomy, spherification, liquid nitrogen, smoking (unless basic), curing, confit, multi-day marinades
USE INSTEAD: accessible ingredients from supermarkets, simple roasting/grilling/pan-frying, standard cooking methods, common herbs and spices

🔥 CRITICAL HIERARCHY - FOLLOW THIS ORDER STRICTLY:
1. DISH TYPE OVERRIDE: If user asks for sauce/salad/side/soup/dessert → ONLY suggest that exact type
2. MEAL TYPE OVERRIDE: If user specifies breakfast/lunch/dinner → ONLY suggest dishes for that meal  
3. STYLE MODIFIERS: Apply light/fresh/healthy/spicy/etc. as specified
4. INGREDIENT FOCUS: Include requested ingredients as primary components
5. CHEF INSPIRATION: Apply chef/restaurant styling LAST, within the constraints above

🚨 EXAMPLES OF STRICT ADHERENCE:
- "fresh salad" → MUST be a salad (light, fresh ingredients) - NOT heavy duck salads
- "sauce for pasta" → MUST be a sauce/dressing - NOT a full pasta dish
- "healthy breakfast" → MUST be breakfast food - NOT dinner dishes
- "light lunch" → MUST be a lunch dish that's light - NOT heavy mains
- "side dish" → MUST be a side/accompaniment - NOT main courses

⚠️ VIOLATION CHECK: If the suggested dish doesn't directly answer what the user asked for, REJECT IT and try again.

GUIDELINES:
- FIRST ensure the dish type matches user request (breakfast → breakfast foods, sauce → sauces, etc.)
- THEN apply chef/restaurant inspiration styling to that appropriate dish type
- Showcase professional techniques appropriate for the dish type
- Include flavor-building elements suitable for the specific dish category
- Use authentic names but ensure dishes directly answer the user's request

EXAMPLES OF PROPER USER INTENT RESPECT:
- User: "healthy breakfast" → "Ottolenghi-Inspired Shakshuka with Fresh Herbs" (NOT dinner dishes)
- User: "sauce for pasta" → "Marcella Hazan-Inspired Cacio e Pepe Sauce" (NOT main dishes)
- User: "light salad" → "Alice Waters-Inspired Spring Greens with Lemon Vinaigrette" (NOT heavy dishes)
- User: "side dish" → "Yotam Ottolenghi-Inspired Roasted Vegetables with Tahini" (NOT main courses)

🚨 CRITICAL: The suggested dish MUST be appropriate for what the user actually asked for, not just a random chef-inspired dish.

OUTPUT: JSON with "title" key only. Make it sophisticated, flavor-packed, AND directly relevant to user intent.`;

    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemMessage },
          { role: "user", content: userMessage }
        ],
        max_tokens: 80,  // Allow for descriptive titles with explanations
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
      
      // Validate title completeness - check for incomplete "Inspired by..." titles
      const isIncompleteTitle = (
        title.toLowerCase().includes('inspired by') && 
        !title.toLowerCase().match(/inspired by.*\w+.*\w+/) // Must have words after "inspired by"
      ) || (
        title.toLowerCase().match(/^[a-z\s]+-inspired$/i) && // Ends with just "-inspired"
        !title.toLowerCase().includes(' inspired ') // No dish name after
      ) || (
        title.toLowerCase().trim().endsWith('inspired') ||
        title.toLowerCase().includes('inspired by') && title.split(' ').length < 4
      );
      
      if (isIncompleteTitle) {
        console.warn(`Detected incomplete title: "${title}", regenerating...`);
        // Fallback to a complete dish name
        const fallbackDishes = [
          "Pan-Seared Duck Breast with Cherry Gastrique",
          "Slow-Braised Beef Short Ribs with Red Wine Reduction",
          "Herb-Crusted Rack of Lamb with Rosemary Jus",
          "Char-Grilled Ribeye with Compound Butter",
          "Crispy-Skin Chicken Thighs with Lemon Thyme",
          "Seared Scallops with Cauliflower Purée",
          "Roasted Pork Belly with Apple Glaze",
          "Grilled Salmon with Dill Hollandaise"
        ];
        title = fallbackDishes[Math.floor(Math.random() * fallbackDishes.length)];
        console.log(`Using fallback title: "${title}"`);
      }
      
      // Handle title length more intelligently
      // If title has parentheses with description, preserve the core dish name + description
      if (title.includes('(') && title.includes(')')) {
        // Allow longer titles with descriptions, but limit to reasonable length
        if (title.length > 150) {
          // Keep the dish name and truncate the description more intelligently
          const beforeParen = title.split('(')[0].trim();
          const description = title.split('(')[1]?.split(')')[0];
          if (description && description.length > 60) {
            // Truncate at word boundaries, not mid-word
            const words = description.split(' ');
            let shortDesc = '';
            for (const word of words) {
              if ((shortDesc + ' ' + word).length <= 55) {
                shortDesc += (shortDesc ? ' ' : '') + word;
              } else {
                break;
              }
            }
            title = `${beforeParen} (${shortDesc}...)`;
          }
          console.log(`Title truncated to: ${title}`);
        }
      } else {
        // For titles without descriptions, keep word limit
        const words = title.split(' ');
        if (words.length > 15) {
          title = words.slice(0, 15).join(' ');
          console.log(`Title truncated to: ${title}`);
        }
      }
      
      // Remove any descriptions or explanations after dashes/colons
      title = title.split(' - ')[0].split(' : ')[0].split(': ')[0];
      
      // Add brief explanation for potentially unfamiliar dishes in brackets
      const explanation = getRecipeExplanation(title);
      
      if (explanation) {
        title = `${title} (${explanation})`;
      }
      
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
          max_tokens: 80,  // Allow for descriptive titles with explanations
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