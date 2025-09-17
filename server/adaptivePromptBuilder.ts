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
    const systemMessage = this.buildSystemMessage(
      specificity, 
      extractedElements, 
      promptStrategy.promptFocus,
      analysis.needsTitleGeneration,
      analysis.titleGenerationContext
    );
    
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
    promptFocus: string[],
    needsTitleGeneration = false,
    titleGenerationContext?: any
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
    
    // Add title generation guidance for vague inputs
    if (needsTitleGeneration && titleGenerationContext) {
      const { ambitionLevel, primaryContext, suggestedCuisine, suggestedTechnique } = titleGenerationContext;
      
      let titleGuidance = `TITLE GENERATION: Create a compelling, restaurant-quality recipe title that matches the context. `;
      
      if (ambitionLevel === 'sophisticated') {
        titleGuidance += `This is for ${primaryContext} - create an impressive, sophisticated dish with chef-inspired flair. Use elevated language and techniques that will truly impress guests.`;
      } else if (ambitionLevel === 'impressive') {
        titleGuidance += `This is for ${primaryContext} - create an attractive, well-executed dish that's impressive but achievable. Balance sophistication with approachability.`;
      } else {
        titleGuidance += `This is for ${primaryContext} - create a delicious, approachable dish that delivers comfort and satisfaction.`;
      }
      
      if (suggestedCuisine) {
        titleGuidance += ` Consider ${suggestedCuisine} cuisine influences.`;
      }
      if (suggestedTechnique) {
        titleGuidance += ` Emphasize ${suggestedTechnique} cooking methods.`;
      }
      
      titleGuidance += ` The title should be specific, appealing, and capture the essence of the dish (e.g., "Pan-Seared Duck Breast with Cherry Port Sauce" rather than "Amazing Duck Recipe").`;
      
      specificGuidance.push(titleGuidance);
    }
    
    // Speed optimization for crystal clear inputs
    if (specificity === InputSpecificity.CRYSTAL_CLEAR) {
      specificGuidance.push(`EFFICIENCY MODE: Generate directly and confidently. The user knows exactly what they want - deliver it with precision and authentic execution.`);
    }
    
    const guidanceText = specificGuidance.length > 0 
      ? '\n\n' + specificGuidance.join('\n\n')
      : '';
    
    return baseCore + guidanceText + '\n\nCRITICAL JSON REQUIREMENTS:\n- Return ONLY valid JSON, no text before or after\n- Use double quotes for all strings\n- No trailing commas\n- Ensure all strings are properly closed with quotes\n- Keep string values concise to avoid truncation\n- If unsure, use shorter descriptions and instructions\n\nOUTPUT: Return ONLY JSON matching the provided schema.';
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
    
    // ENHANCED TITLE LOGIC: Handle both specific titles and vague inputs needing generation
    const shouldPreserveTitle = (extractedElements.chefReference || 
                               extractedElements.namedDish ||
                               recipeData.userIntent.includes('-inspired') ||
                               recipeData.userIntent.includes('-style')) && 
                               !analysis.needsTitleGeneration;
    
    if (shouldPreserveTitle) {
      message += `\n\nIMPORTANT: Use this EXACT title for the recipe: "${recipeData.userIntent}"`;
      message += `\nDo not modify or shorten this title - it contains specific inspiration context that must be preserved.`;
    } else if (analysis.needsTitleGeneration && analysis.titleGenerationContext) {
      // For vague inputs, provide context for generating a proper title
      const { ambitionLevel, primaryContext, suggestedCuisine } = analysis.titleGenerationContext;
      
      message += `\n\nTITLE GENERATION CONTEXT:`;
      message += `\n- Original user intent: "${recipeData.userIntent}" (too vague for a recipe title)`;
      message += `\n- Context: ${primaryContext} (${ambitionLevel} ambition level)`;
      if (suggestedCuisine) {
        message += `\n- Suggested cuisine influence: ${suggestedCuisine}`;
      }
      message += `\n- Generate a specific, appealing recipe title that captures the dish and matches the ${ambitionLevel} ambition level`;
      
      // Add context-specific guidance
      if (primaryContext === 'dinner party') {
        message += `\n- This is for entertaining guests - create something impressive and memorable`;
      } else if (primaryContext === 'date night') {
        message += `\n- This is for a romantic occasion - create something elegant and special`;
      } else if (primaryContext === 'weeknight') {
        message += `\n- This is for busy weeknight cooking - keep it approachable but delicious`;
      } else if (primaryContext === 'comfort') {
        message += `\n- This is comfort food - focus on satisfying, heartwarming flavors`;
      }
    }
    
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
    } else {
      // MEAT PREFERENCE: When no dietary restrictions are specified, favor meat-based dishes
      message += `\n- Protein preference: Strongly favor meat-based dishes as the main protein (beef, pork, lamb, chicken, etc.) unless specifically requested otherwise`;
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
      
      // Add context-specific success criteria for vague inputs
      if (analysis.titleGenerationContext) {
        const { ambitionLevel, primaryContext } = analysis.titleGenerationContext;
        if (ambitionLevel === 'sophisticated') {
          message += `\n- Deliver restaurant-quality complexity suitable for ${primaryContext}`;
        } else if (ambitionLevel === 'impressive') {
          message += `\n- Create an impressive but achievable dish perfect for ${primaryContext}`;
        }
      }
    } else {
      message += `\n- Balance the user's specific requests with creative excellence`;
      message += `\n- Maximize flavor through proper technique and seasoning`;
      message += `\n- Ensure reliable, delicious results for home cooks`;
    }
    
    // Add title generation reminder for vague inputs
    if (analysis.needsTitleGeneration) {
      message += `\n\nTITLE REMINDER: Generate a specific, compelling recipe title that matches the context and ambition level. Do NOT use the original vague user input as the title.`;
    }
    
    // Critical: Add JSON size constraint to prevent parsing errors at position 3630+
    message += `\n\nCRITICAL: Keep total JSON response under 3000 characters to prevent truncation and parsing errors.`;
    
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
      // Minimal schema for clear inputs (note: title will be set via prompt instruction)
      return `JSON SCHEMA (REQUIRED - keep ALL strings under 200 characters):
{
  "title": "Use the exact title specified in the prompt above",
  "servings": number,
  "time": { "prep_min": number, "cook_min": number, "total_min": number },
  "cuisine": "cuisine type (max 20 chars)",
  "ingredients": [{ "section": "Main", "items": [{ "item": "ingredient name (max 50 chars)", "qty": number, "unit": "g|ml|tbsp|tsp|x", "notes": "optional (max 30 chars)" }] }],
  "method": [{ "step": number, "instruction": "Clear concise step (max 150 chars)", "why_it_matters": "Brief reason (max 80 chars)" }],
  "finishing_touches": ["concise tip (max 80 chars each)"],
  "flavour_boosts": ["flavor tip (max 80 chars each)"],
  "make_ahead_leftovers": "Brief storage note (max 120 chars)",
  "allergens": ["allergen names (max 20 chars each)"],
  "shopping_list": [{ "item": "item name (max 40 chars)", "qty": number, "unit": "g|ml|tbsp|tsp|x" }]
}`;
    } else {
      // Full schema for other inputs
      return `JSON SCHEMA (REQUIRED - keep ALL strings under 200 characters):
{
  "title": "Appetizing dish name (4-8 words, max 60 chars)",
  "servings": number,
  "time": { "prep_min": number, "cook_min": number, "total_min": number },
  "cuisine": "cuisine type (max 20 chars)",
  "style_notes": ["adjustment note (max 60 chars each)"],
  "equipment": ["equipment name (max 30 chars each)"],
  "ingredients": [
    { "section": "Main", "items": [{ "item": "ingredient name (max 50 chars)", "qty": number, "unit": "g|ml|tbsp|tsp|x", "notes": "optional (max 30 chars)" }] },
    { "section": "Seasoning", "items": [{ "item": "ingredient name (max 50 chars)", "qty": number, "unit": "g|ml|tbsp|tsp|x", "notes": "optional (max 30 chars)" }] }
  ],
  "method": [
    { "step": number, "instruction": "Clear concise step (max 150 chars)", "why_it_matters": "Brief reason (max 80 chars)" }
  ],
  "finishing_touches": ["concise finishing tip (max 80 chars each)"],
  "flavour_boosts": ["flavor enhancement tip (max 80 chars each)"],
  "make_ahead_leftovers": "Storage and reheating note (max 120 chars)",
  "allergens": ["allergen names (max 20 chars each)"],
  "shopping_list": [{ "item": "item name (max 40 chars)", "qty": number, "unit": "g|ml|tbsp|tsp|x" }],
  "side_dishes": [{ "name": "side name (max 30 chars)", "description": "brief desc (max 60 chars)", "quick_method": "method (max 80 chars)" }]
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