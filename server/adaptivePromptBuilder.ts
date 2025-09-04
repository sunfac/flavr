import { UserInputAnalysis, InputSpecificity } from './userInputAnalyzer';

export interface AdaptivePromptResult {
  systemMessage: string;
  userMessage: string;
  modelRecommendation: 'gpt-4o-mini' | 'gpt-4o';
  maxTokens: number;
  estimatedCost: number;
  speedExpected: 'fast' | 'medium' | 'slow';
}

export class AdaptivePromptBuilder {
  
  /**
   * Build optimized prompts based on user input analysis
   */
  static buildOptimizedPrompt(
    analysis: UserInputAnalysis,
    recipeData: {
      userIntent: string;
      servings: number;
      timeBudget?: number;
      dietaryNeeds?: string[];
      mustUse?: string[];
      avoid?: string[];
      equipment?: string[];
      budgetNote?: string;
      cuisinePreference?: string;
    },
    varietyGuidance?: {
      avoidCuisines: string[];
      avoidTechniques: string[];
      suggestCuisine?: string;
      suggestTechnique?: string;
    }
  ): AdaptivePromptResult {
    
    const { specificity, extractedElements, promptStrategy } = analysis;
    
    // Build system message based on specificity
    const systemMessage = this.buildSystemMessage(specificity, extractedElements, promptStrategy.promptFocus);
    
    // Build user message with smart targeting
    const userMessage = this.buildUserMessage(
      analysis, 
      recipeData, 
      varietyGuidance
    );
    
    // Calculate cost estimation
    const estimatedCost = this.estimateCost(
      promptStrategy.modelRecommendation,
      promptStrategy.tokenBudget
    );
    
    // Determine speed expectation
    const speedExpected = this.getSpeedExpectation(specificity, promptStrategy.tokenBudget);
    
    return {
      systemMessage,
      userMessage,
      modelRecommendation: promptStrategy.modelRecommendation,
      maxTokens: promptStrategy.tokenBudget,
      estimatedCost,
      speedExpected
    };
  }
  
  /**
   * Build focused system message based on input analysis
   */
  private static buildSystemMessage(
    specificity: InputSpecificity,
    extractedElements: UserInputAnalysis['extractedElements'],
    promptFocus: string[]
  ): string {
    
    const baseCore = `You are "Zest," a cookbook-quality recipe expert. Create authentic, flavorful recipes that maximize taste and approachability for home cooks.

CORE REQUIREMENTS:
- British English, metric measurements, UK ingredients
- Professional techniques with clear, confident instructions
- Complete methods from prep to plating and serving
- Maximum flavor development through proper technique
- Output JSON only, match schema exactly

RECIPE STANDARDS:
- Use supermarket ingredients, avoid making basics from scratch unless specified
- Focus on technique and flavor layering for restaurant-quality results
- Include proper timing and temperature guidance
- Ensure dietary requirements are strictly followed`;

    // Add specific guidance based on analysis
    const specificGuidance: string[] = [];
    
    if (promptFocus.includes('dish_authenticity') && extractedElements.namedDish) {
      specificGuidance.push(`AUTHENTICITY FOCUS: Create an authentic version of "${extractedElements.namedDish}" using traditional techniques and flavor profiles. Honor the classic preparation while ensuring home cook success.`);
    }
    
    if (promptFocus.includes('chef_style') && extractedElements.chefReference) {
      specificGuidance.push(`CHEF INSPIRATION: Draw inspiration from ${extractedElements.chefReference}'s cooking style, techniques, and flavor approaches. Capture their signature methods in an approachable way.`);
    }
    
    if (promptFocus.includes('cuisine_authenticity') && extractedElements.cuisine?.length) {
      specificGuidance.push(`CUISINE FOCUS: Create an authentic ${extractedElements.cuisine.join(' and ')} dish using traditional ingredients, techniques, and flavor combinations. Ensure cultural authenticity.`);
    }
    
    if (promptFocus.includes('cooking_technique') && extractedElements.technique?.length) {
      specificGuidance.push(`TECHNIQUE EMPHASIS: Focus on ${extractedElements.technique.join(' and ')} techniques. Explain the methods clearly and ensure perfect execution for maximum flavor.`);
    }
    
    if (promptFocus.includes('flavor_development')) {
      specificGuidance.push(`FLAVOR MAXIMIZATION: Prioritize deep, complex flavors through layered seasoning, proper browning, acid balance, and technique. Every step should build flavor.`);
    }
    
    if (promptFocus.includes('creative_freedom')) {
      specificGuidance.push(`CREATIVE EXPLORATION: Use your full culinary creativity to create an exciting, delicious recipe. Focus on unexpected but harmonious flavor combinations and impressive presentation.`);
    }
    
    // Speed optimization for crystal clear inputs
    if (specificity === InputSpecificity.CRYSTAL_CLEAR) {
      specificGuidance.push(`EFFICIENCY MODE: Generate directly and confidently. The user knows exactly what they want - deliver it with precision and authentic execution.`);
    }
    
    const guidanceText = specificGuidance.length > 0 
      ? '\n\n' + specificGuidance.join('\n\n')
      : '';
    
    return baseCore + guidanceText + '\n\nOUTPUT: Return ONLY JSON matching the provided schema. No extra text.';
  }
  
  /**
   * Build targeted user message
   */
  private static buildUserMessage(
    analysis: UserInputAnalysis,
    recipeData: any,
    varietyGuidance?: any
  ): string {
    
    const { specificity, extractedElements } = analysis;
    
    // Start with core user request
    let message = `Generate a complete recipe JSON that maximizes flavor and home cook confidence.\n\nUSER REQUEST: "${recipeData.userIntent}"`;
    
    // Add extracted context for better targeting
    if (extractedElements.namedDish) {
      message += `\nSPECIFIC DISH: Focus on authentic ${extractedElements.namedDish} preparation`;
    }
    
    if (extractedElements.chefReference) {
      message += `\nCHEF INSPIRATION: Channel ${extractedElements.chefReference}'s style and techniques`;
    }
    
    if (extractedElements.cuisine?.length) {
      message += `\nCUISINE CONTEXT: ${extractedElements.cuisine.join(' and ')} cooking traditions`;
    }
    
    if (extractedElements.technique?.length) {
      message += `\nTECHNIQUE FOCUS: Emphasize ${extractedElements.technique.join(', ')} methods`;
    }
    
    if (extractedElements.mainIngredients?.length) {
      message += `\nKEY INGREDIENTS: Feature ${extractedElements.mainIngredients.join(', ')}`;
    }
    
    if (extractedElements.flavorProfile?.length) {
      message += `\nFLAVOR DIRECTION: ${extractedElements.flavorProfile.join(', ')} taste profile`;
    }
    
    // Add variety guidance for vague prompts
    if (varietyGuidance && (varietyGuidance.suggestCuisine || varietyGuidance.suggestTechnique)) {
      message += `\nVARIETY GUIDANCE:`;
      if (varietyGuidance.suggestCuisine) {
        message += ` Try ${varietyGuidance.suggestCuisine} cuisine this time.`;
      }
      if (varietyGuidance.suggestTechnique) {
        message += ` Consider ${varietyGuidance.suggestTechnique}-based cooking.`;
      }
      if (varietyGuidance.avoidCuisines.length > 0) {
        message += ` (Recently used: ${varietyGuidance.avoidCuisines.slice(0, 3).join(', ')})`;
      }
    }
    
    // Standard parameters (shortened for crystal clear inputs)
    message += `\n\nRECIPE PARAMETERS:`;
    message += `\n- Servings: ${recipeData.servings}`;
    
    if (recipeData.timeBudget) {
      message += `\n- Time budget: ${recipeData.timeBudget} minutes`;
    }
    
    if (recipeData.dietaryNeeds?.length) {
      message += `\n- Dietary requirements: ${recipeData.dietaryNeeds.join(", ")} (STRICT)`;
    }
    
    if (recipeData.mustUse?.length) {
      message += `\n- Must include: ${recipeData.mustUse.join(", ")}`;
    }
    
    if (recipeData.avoid?.length) {
      message += `\n- Avoid: ${recipeData.avoid.join(", ")}`;
    }
    
    // Equipment and budget (minimal for clear inputs)
    if (specificity !== InputSpecificity.CRYSTAL_CLEAR) {
      if (recipeData.equipment?.length) {
        message += `\n- Equipment: ${recipeData.equipment.join(", ")}`;
      }
      if (recipeData.budgetNote) {
        message += `\n- Budget: ${recipeData.budgetNote}`;
      }
    }
    
    // Success criteria based on specificity
    message += `\n\nSUCCESS CRITERIA:`;
    
    if (specificity === InputSpecificity.CRYSTAL_CLEAR) {
      message += `\n- Execute the requested dish with authentic technique and maximum flavor`;
      message += `\n- Ensure home cook confidence through clear instructions`;
      message += `\n- Deliver exactly what the user envisioned`;
    } else if (specificity === InputSpecificity.VERY_VAGUE) {
      message += `\n- Create an exciting, memorable recipe that builds cooking confidence`;
      message += `\n- Focus on maximum flavor and satisfying results`;
      message += `\n- Surprise and delight with professional techniques made approachable`;
    } else {
      message += `\n- Balance the user's specific requests with creative excellence`;
      message += `\n- Maximize flavor through proper technique and seasoning`;
      message += `\n- Ensure reliable, delicious results for home cooks`;
    }
    
    // Schema (simplified for very clear inputs)
    const schemaText = this.buildSchemaText(specificity);
    message += `\n\n${schemaText}`;
    
    return message;
  }
  
  /**
   * Build appropriate schema text based on input specificity
   */
  private static buildSchemaText(specificity: InputSpecificity): string {
    
    if (specificity === InputSpecificity.CRYSTAL_CLEAR) {
      // Minimal schema for clear inputs
      return `JSON SCHEMA:
{
  "title": "Appetizing dish name (4-8 words)",
  "servings": number,
  "time": { "prep_min": number, "cook_min": number, "total_min": number },
  "cuisine": "cuisine type",
  "ingredients": [{ "section": "Main", "items": [{ "item": "...", "qty": number, "unit": "g|ml|tbsp", "notes": "" }] }],
  "method": [{ "step": number, "instruction": "Clear step", "why_it_matters": "Brief reason" }],
  "finishing_touches": ["..."],
  "flavour_boosts": ["..."],
  "make_ahead_leftovers": "Brief note",
  "allergens": ["..."],
  "shopping_list": [{ "item": "...", "qty": number, "unit": "..." }]
}`;
    } else {
      // Full schema for other inputs
      return `JSON SCHEMA:
{
  "title": "Appetizing dish name (4-8 words)",
  "servings": number,
  "time": { "prep_min": number, "cook_min": number, "total_min": number },
  "cuisine": "cuisine type",
  "style_notes": ["any adjustments made"],
  "equipment": ["required equipment"],
  "ingredients": [
    { "section": "Main", "items": [{ "item": "...", "qty": number, "unit": "g|ml|tbsp", "notes": "" }] },
    { "section": "Seasoning", "items": [{ "item": "...", "qty": number, "unit": "...", "notes": "" }] }
  ],
  "method": [
    { "step": number, "instruction": "Clear step with technique", "why_it_matters": "Brief reason" }
  ],
  "finishing_touches": ["restaurant-quality finishing elements"],
  "flavour_boosts": ["ways to enhance flavor"],
  "make_ahead_leftovers": "Storage and reheating guidance",
  "allergens": ["potential allergens"],
  "shopping_list": [{ "item": "...", "qty": number, "unit": "..." }],
  "side_dishes": [{ "name": "...", "description": "...", "quick_method": "..." }]
}`;
    }
  }
  
  /**
   * Estimate cost based on model and tokens
   */
  private static estimateCost(model: string, tokens: number): number {
    // Pricing per 1K tokens (approximate)
    const pricing = {
      'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
      'gpt-4o': { input: 0.0025, output: 0.01 }
    };
    
    const rates = pricing[model as keyof typeof pricing] || pricing['gpt-4o'];
    const inputTokens = tokens * 0.7; // Estimate 70% input, 30% output
    const outputTokens = tokens * 0.3;
    
    return ((inputTokens * rates.input) + (outputTokens * rates.output)) / 1000;
  }
  
  /**
   * Determine expected generation speed
   */
  private static getSpeedExpectation(specificity: InputSpecificity, tokens: number): 'fast' | 'medium' | 'slow' {
    if (specificity === InputSpecificity.CRYSTAL_CLEAR && tokens < 1500) {
      return 'fast'; // 6-12 seconds
    } else if (tokens < 2000) {
      return 'medium'; // 10-18 seconds  
    } else {
      return 'slow'; // 15-25 seconds
    }
  }
}