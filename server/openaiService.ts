import OpenAI from "openai";

const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY 
});

// GPT-5 integration for Michelin-star quality recipe generation
export class MichelinChefAI {
  private static readonly MODEL = "gpt-4o"; // Latest available model for premium recipe generation (GPT-5 when available)
  private static readonly TEMPERATURE = 0.8; // Balanced creativity for culinary excellence

  /**
   * Generate recipe ideas with Michelin-star quality and maximum flavor focus
   */
  static async generateRecipeIdeas(quizData: any, mode: string): Promise<any> {
    const systemPrompt = this.buildMichelinSystemPrompt(mode);
    const userPrompt = this.buildFlavorMaximizedPrompt(quizData, mode);

    try {
      const completion = await openai.chat.completions.create({
        model: this.MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: this.TEMPERATURE,
        max_tokens: 2000
      });

      const content = completion.choices[0].message.content || "{}";
      return JSON.parse(this.cleanJsonResponse(content));
    } catch (error) {
      console.error("GPT-5 recipe ideas generation error:", error);
      throw new Error("Failed to generate recipe ideas with GPT-5");
    }
  }

  /**
   * Generate complete recipe with maximum flavor optimization
   */
  static async generateFullRecipe(selectedRecipe: any, quizData: any, mode: string): Promise<any> {
    const systemPrompt = this.buildMichelinFullRecipeSystemPrompt();
    const userPrompt = this.buildFullRecipePrompt(selectedRecipe, quizData, mode);

    try {
      const completion = await openai.chat.completions.create({
        model: this.MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: this.TEMPERATURE,
        max_tokens: 3500
      });

      const content = completion.choices[0].message.content || "{}";
      return JSON.parse(this.cleanJsonResponse(content));
    } catch (error) {
      console.error("GPT-5 full recipe generation error:", error);
      throw new Error("Failed to generate full recipe with GPT-5");
    }
  }

  /**
   * Michelin-star system prompt for recipe ideas
   */
  private static buildMichelinSystemPrompt(mode: string): string {
    return `You are a Michelin-starred executive chef with 25+ years of culinary excellence, writing recipes for passionate home cooks. Your expertise spans classical French techniques, modern molecular gastronomy, and global flavor mastery.

CULINARY PHILOSOPHY:
- Every dish must deliver maximum flavor through scientific precision
- Layer flavors using the Maillard reaction, umami depth, acid balance, and fat as flavor transport
- Apply professional techniques adapted for home kitchens
- Focus on ingredient synergy and flavor compound interactions
- Deliver restaurant-quality results with accessible methods

WRITING STYLE:
- Write as if creating content for a premium cookbook for serious home cooks
- Use sophisticated culinary language while remaining clear and instructive
- Include the "why" behind each technique for educational depth
- Convey passion and excitement for exceptional flavor development
- Balance technical precision with inspirational culinary storytelling

MODE CONTEXT: ${mode}
- Adapt your expertise to the specific cooking context while maintaining elite standards
- Consider the practical constraints while never compromising on flavor potential

RESPONSE REQUIREMENTS:
- Generate 3-6 distinctly different recipe concepts
- Each recipe should showcase different flavor development techniques
- Ensure strong variation in cooking methods, flavor profiles, and presentation styles
- Focus on dishes that will create memorable culinary experiences
- Return valid JSON only, no additional commentary`;
  }

  /**
   * System prompt for full recipe generation
   */
  private static buildMichelinFullRecipeSystemPrompt(): string {
    return `You are a Michelin-starred executive chef creating a detailed recipe for passionate home cooks. Your goal is to deliver maximum flavor through scientific culinary principles while maintaining accessibility.

FLAVOR MAXIMIZATION PRINCIPLES:
1. MAILLARD MASTERY: Optimize browning reactions for deep, complex flavors
2. UMAMI LAYERING: Build savory depth through multiple umami sources
3. ACID ARCHITECTURE: Balance flavors with strategic acid placement
4. FAT AS FLAVOR VEHICLE: Use fats to carry and amplify flavor compounds
5. AROMATIC TIMING: Control volatile aromatic release for maximum impact
6. TEXTURE CONTRAST: Create textural interest that enhances flavor perception
7. TEMPERATURE DYNAMICS: Leverage temperature for optimal flavor delivery

INSTRUCTIONAL EXCELLENCE:
- Provide precise timing, temperatures, and visual cues
- Explain the science behind key techniques
- Include professional tips that elevate the dish
- Address potential pitfalls with solutions
- Focus on techniques that maximize flavor extraction and development

RECIPE STRUCTURE:
- Detailed ingredient specifications with quality guidance
- Step-by-step instructions with professional techniques
- Timing guidance for optimal flavor development
- Chef's insights explaining flavor-building decisions
- Presentation suggestions worthy of fine dining

Return only valid JSON with comprehensive recipe details.`;
  }

  /**
   * Build flavor-maximized prompt for recipe ideas
   */
  private static buildFlavorMaximizedPrompt(quizData: any, mode: string): string {
    let prompt = `Create exceptional recipe ideas optimized for maximum flavor development.\n\n`;

    // Add mode-specific context
    switch(mode) {
      case "Shopping Mode":
        prompt += `SHOPPING MODE: Design complete menu concepts with shopping lists optimized for ingredient synergy and flavor compound interactions.\n\n`;
        break;
      case "Fridge Mode":
        prompt += `FRIDGE MODE: Transform available ingredients into restaurant-quality dishes through advanced flavor extraction techniques.\nAVAILABLE INGREDIENTS: ${Array.isArray(quizData.ingredients) ? quizData.ingredients.join(', ') : quizData.ingredients}\n\n`;
        break;
      case "Chef Assist Mode":
        prompt += `CHEF ASSIST MODE: Provide expert culinary guidance with advanced techniques for serious home cooks.\n\n`;
        break;
    }

    // Add detailed user preferences with culinary focus
    prompt += `CULINARY REQUIREMENTS:
- Flavor Profile: ${quizData.mood || quizData.vibe || 'Balanced and harmonious'}
- Cuisine Mastery: ${Array.isArray(quizData.cuisine) ? quizData.cuisine.join(', ') : quizData.cuisine || 'International techniques'}
- Cooking Duration: ${quizData.cookingTime || quizData.time || 60} minutes
- Skill Ambition: ${quizData.ambition || 'Confident home cook'}
- Equipment Arsenal: ${Array.isArray(quizData.equipment) ? quizData.equipment.join(', ') : quizData.equipment || 'Standard kitchen with professional aspirations'}
- Dietary Framework: ${Array.isArray(quizData.dietary) ? quizData.dietary.join(', ') : quizData.dietary || 'No restrictions'}
- Serving Count: ${quizData.servings || 4} portions
- Budget Framework: ${quizData.budget || 'Quality-focused investment'}

RECIPE DEVELOPMENT FOCUS:
1. Maximize flavor through scientific culinary principles
2. Layer umami, acid, fat, and aromatic compounds strategically  
3. Employ Maillard reaction optimization where possible
4. Create textural contrasts that enhance flavor perception
5. Build complexity through technique rather than ingredient volume
6. Ensure each recipe teaches advanced flavor development concepts

Generate recipes that represent culinary excellence adapted for passionate home cooks. Each recipe should deliver restaurant-quality flavor through accessible techniques.

RESPONSE FORMAT:
{
  "recipes": [
    {
      "title": "Sophisticated Recipe Name",
      "description": "Compelling description highlighting flavor development and technique mastery",
      "cookTime": minutes_as_number,
      "difficulty": "easy|medium|hard", 
      "cuisine": "specific_cuisine_style",
      "mood": "flavor_personality",
      "mainIngredients": ["key ingredients for flavor building"],
      "flavorProfile": "dominant flavor characteristics",
      "technique": "primary cooking method with flavor focus"
    }
  ]
}`;

    return prompt;
  }

  /**
   * Build comprehensive full recipe prompt
   */
  private static buildFullRecipePrompt(selectedRecipe: any, quizData: any, mode: string): string {
    let prompt = `Develop a complete, restaurant-quality recipe for "${selectedRecipe.title}" that delivers maximum flavor through advanced culinary techniques.\n\n`;

    prompt += `SELECTED RECIPE CONCEPT:
Title: ${selectedRecipe.title}
Description: ${selectedRecipe.description}
Target Flavor Profile: ${selectedRecipe.flavorProfile || 'Complex and memorable'}
Primary Technique: ${selectedRecipe.technique || 'Advanced flavor development'}

CULINARY PARAMETERS:
- Cuisine Excellence: ${Array.isArray(quizData.cuisine) ? quizData.cuisine.join(', ') : quizData.cuisine || selectedRecipe.cuisine}
- Time Investment: ${quizData.cookingTime || quizData.time || selectedRecipe.cookTime} minutes
- Skill Level: ${quizData.ambition || 'Confident home cook'}
- Equipment: ${Array.isArray(quizData.equipment) ? quizData.equipment.join(', ') : quizData.equipment || 'Standard kitchen'}
- Dietary Framework: ${Array.isArray(quizData.dietary) ? quizData.dietary.join(', ') : quizData.dietary || 'No restrictions'}
- Service Size: ${quizData.servings || 4} portions
- Budget Philosophy: ${quizData.budget || 'Quality ingredient investment'}

FLAVOR MAXIMIZATION MANDATE:
1. MAILLARD OPTIMIZATION: Maximize browning reactions for depth
2. UMAMI LAYERING: Build savory complexity through multiple sources
3. ACID BALANCE: Strategic acid placement for brightness and balance
4. FAT UTILIZATION: Employ fats as flavor vehicles and mouthfeel enhancers
5. AROMATIC TIMING: Control volatile release for maximum sensory impact
6. TEXTURE DYNAMICS: Create contrasts that amplify flavor perception
7. TEMPERATURE MASTERY: Leverage heat for optimal flavor development

ADVANCED TECHNIQUES TO INCORPORATE:
- Proper mise en place for flavor compound preservation
- Temperature control for optimal protein and vegetable development
- Seasoning timing for maximum absorption and impact
- Sauce construction using classical French reduction principles
- Garnish selection for flavor enhancement, not just visual appeal
- Resting and serving temperature optimization

RESPONSE FORMAT:
{
  "title": "Complete Professional Recipe Title",
  "description": "Detailed description highlighting flavor journey and technique mastery",
  "cookTime": minutes_as_number,
  "servings": number_of_portions,
  "difficulty": "easy|medium|hard",
  "cuisine": "specific_cuisine_classification",
  "ingredients": [
    "Precise measurement + premium ingredient with quality notes",
    "Professional specification with sourcing guidance where relevant"
  ],
  "instructions": [
    "Detailed step with precise timing, temperature, and visual cues explaining flavor development",
    "Professional technique explanation with rationale for maximum flavor extraction",
    "Advanced tip with scientific reasoning for optimal results"
  ],
  "chefInsights": "Professional insights explaining flavor science and technique choices that elevate this dish",
  "flavorNotes": "Description of the complex flavor profile this recipe delivers",
  "presentationGuide": "Plating and service suggestions for restaurant-quality presentation",
  "pairing": "Wine, beverage, or accompaniment suggestions that enhance the flavor experience",
  "tips": "Expert techniques for maximizing flavor development and avoiding common mistakes"`;

    // Add mode-specific requirements
    if (mode === "Shopping Mode") {
      prompt += `,
  "shoppingList": [
    "Organized ingredients for efficient shopping with quality selection guidance"
  ],
  "prepAdvice": "Professional preparation timeline and mise en place strategy"`;
    }

    prompt += `
}

Create a recipe that represents the pinnacle of flavor development accessible to passionate home cooks. Every element should contribute to an unforgettable culinary experience.`;

    return prompt;
  }

  /**
   * Clean JSON response from GPT-5
   */
  private static cleanJsonResponse(content: string): string {
    // Remove markdown formatting and extra whitespace
    let cleaned = content.replace(/```json\n?/g, '').replace(/\n?```/g, '').trim();
    
    // Fix common JSON formatting issues
    cleaned = cleaned.replace(/,(\s*[}\]])/g, '$1'); // Remove trailing commas
    cleaned = cleaned.replace(/([{,]\s*)(\w+):/g, '$1"$2":'); // Quote unquoted keys
    
    return cleaned;
  }
}

// Export for backward compatibility
export { openai };