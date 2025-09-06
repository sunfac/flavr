import { OpenAI } from "openai";

const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY 
});

// User input specificity levels
export enum InputSpecificity {
  CRYSTAL_CLEAR = 'crystal_clear',    // "Rick Stein's pan-seared sea bass with lemon butter"
  MODERATELY_CLEAR = 'moderately_clear', // "Mediterranean chicken with herbs" 
  SOMEWHAT_VAGUE = 'somewhat_vague',     // "Something with pasta"
  VERY_VAGUE = 'very_vague'             // "Comfort food" / "Something tasty"
}

export interface UserInputAnalysis {
  specificity: InputSpecificity;
  extractedElements: {
    // Core cooking elements
    namedDish?: string;           // "Carbonara", "Beef Wellington"
    chefReference?: string;       // "Jamie Oliver", "Gordon Ramsay"
    restaurantStyle?: string;     // "Dishoom-style", "pub food"
    
    // Cooking method hints
    technique?: string[];         // ["pan-seared", "roasted", "braised"]
    equipment?: string[];         // ["oven", "grill", "slow cooker"]
    
    // Flavor profile
    cuisine?: string[];           // ["Italian", "Mediterranean"] 
    flavorProfile?: string[];     // ["spicy", "creamy", "fresh", "smoky"]
    mainIngredients?: string[];   // ["chicken", "salmon", "mushrooms"]
    keyFlavors?: string[];        // ["lemon", "garlic", "herbs", "cheese"]
    
    // Context clues
    occasion?: string[];          // ["weeknight", "dinner party", "comfort"]
    mood?: string[];             // ["light", "hearty", "elegant", "rustic"]
    timeHints?: string[];        // ["quick", "slow-cooked", "30-minute"]
    
    // Dietary mentions
    dietaryMentions?: string[];  // ["vegetarian", "dairy-free", "low-carb"]
  };
  
  // Optimization guidance
  promptStrategy: {
    tokenBudget: number;         // How many tokens this input needs
    modelRecommendation: 'gpt-4o-mini' | 'gpt-4o';
    promptFocus: string[];       // Key areas to emphasize
    creativityLevel: 'low' | 'medium' | 'high'; // How much creative freedom needed
  };
  
  // Anti-repetition data
  vaguePromptSignature?: string; // For tracking similar vague requests
}

export class UserInputAnalyzer {
  
  // Track recent vague prompts for variety
  private static vaguePromptHistory = new Map<string, Array<{
    signature: string;
    timestamp: number;
    cuisineUsed: string;
    techniqueUsed: string;
  }>>();
  
  // Maximum history items per user
  private static maxHistoryPerUser = 10;
  private static historyValidityMs = 7 * 24 * 60 * 60 * 1000; // 7 days
  
  /**
   * Analyze user input to extract cooking intent and optimize generation strategy
   */
  static async analyzeUserInput(
    userInput: string, 
    clientId?: string,
    dietaryNeeds?: string[],
    equipment?: string[]
  ): Promise<UserInputAnalysis> {
    
    // Clean and normalize input
    const normalizedInput = userInput.trim().toLowerCase();
    
    if (!normalizedInput || normalizedInput.length < 3) {
      return this.createDefaultAnalysis();
    }
    
    // Quick pattern matching for obvious specificity
    const quickAnalysis = this.quickSpecificityCheck(normalizedInput);
    if (quickAnalysis) {
      return quickAnalysis;
    }
    
    // Use AI for complex analysis
    return await this.aiDeepAnalysis(userInput, clientId, dietaryNeeds, equipment);
  }
  
  /**
   * Quick pattern matching for obvious cases (saves AI calls)
   */
  private static quickSpecificityCheck(input: string): UserInputAnalysis | null {
    
    // Crystal clear patterns
    const crystalClearPatterns = [
      /([a-z\s]+)'s\s+([a-z\s]+)/i, // "Jamie Oliver's pasta", "Rick Stein's fish"
      /\b(carbonara|bolognese|risotto|paella|coq au vin|beef wellington|fish and chips|bangers and mash)\b/i,
      /-inspired\s/i, // "Thai-inspired" from Inspire Me
      /with\s+([a-z\s]+)\s+(sauce|butter|marinade|glaze)/i
    ];
    
    for (const pattern of crystalClearPatterns) {
      if (pattern.test(input)) {
        return this.createCrystalClearAnalysis(input);
      }
    }
    
    // Very vague patterns  
    const veryVaguePatterns = [
      /^(something|anything)\s*(tasty|good|nice|delicious)?\s*$/i,
      /^(comfort\s*food|quick\s*meal|dinner\s*ideas?)$/i,
      /^(what\s*(should|can)\s*i\s*(cook|make|eat)).*$/i,
      /^(surprise\s*me|chef'?s?\s*choice|dealer'?s?\s*choice)$/i
    ];
    
    for (const pattern of veryVaguePatterns) {
      if (pattern.test(input)) {
        return this.createVeryVagueAnalysis(input);
      }
    }
    
    return null; // Need AI analysis
  }
  
  /**
   * Deep AI analysis for complex inputs
   */
  private static async aiDeepAnalysis(
    userInput: string,
    clientId?: string, 
    dietaryNeeds?: string[],
    equipment?: string[]
  ): Promise<UserInputAnalysis> {
    
    try {
      const analysisPrompt = `Analyze this cooking request and extract key elements. Be precise and practical.

USER INPUT: "${userInput}"
${dietaryNeeds?.length ? `DIETARY NEEDS: ${dietaryNeeds.join(', ')}` : ''}
${equipment?.length ? `AVAILABLE EQUIPMENT: ${equipment.join(', ')}` : ''}

Extract and return JSON:
{
  "specificity": "crystal_clear|moderately_clear|somewhat_vague|very_vague",
  "namedDish": "specific dish name if mentioned",
  "chefReference": "chef name if mentioned", 
  "cuisine": ["cuisine types mentioned"],
  "technique": ["cooking methods implied"],
  "mainIngredients": ["proteins/key ingredients mentioned"],
  "flavorProfile": ["flavor descriptors"],
  "occasion": ["context clues like weeknight, party"],
  "mood": ["cooking style like rustic, elegant"],
  "timeHints": ["speed indicators"],
  "creativityNeeded": "low|medium|high"
}

Focus on extracting actual mentions and clear implications only.`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: analysisPrompt }],
        max_tokens: 300,
        response_format: { type: "json_object" }
      });

      const analysis = JSON.parse(response.choices[0]?.message?.content || '{}');
      
      return this.buildAnalysisFromAI(analysis, userInput, clientId);
      
    } catch (error) {
      console.error('AI input analysis failed, using fallback:', error);
      return this.createModerateAnalysis(userInput);
    }
  }
  
  /**
   * Build complete analysis from AI response
   */
  private static buildAnalysisFromAI(aiResult: any, originalInput: string, clientId?: string): UserInputAnalysis {
    
    const specificity = aiResult.specificity || InputSpecificity.MODERATELY_CLEAR;
    
    // Determine optimization strategy based on specificity
    let tokenBudget: number;
    let modelRecommendation: 'gpt-4o-mini' | 'gpt-4o';
    let creativityLevel: 'low' | 'medium' | 'high';
    
    switch (specificity) {
      case InputSpecificity.CRYSTAL_CLEAR:
        tokenBudget = 1200;
        modelRecommendation = 'gpt-4o-mini';
        creativityLevel = 'low';
        break;
      case InputSpecificity.MODERATELY_CLEAR:
        tokenBudget = 1800;
        modelRecommendation = 'gpt-4o-mini'; // Cost optimization: always use mini model
        creativityLevel = 'medium';
        break;
      case InputSpecificity.SOMEWHAT_VAGUE:
        tokenBudget = 2400;
        modelRecommendation = 'gpt-4o-mini'; // Cost optimization: always use mini model
        creativityLevel = 'medium';
        break;
      default: // VERY_VAGUE
        tokenBudget = 3000;
        modelRecommendation = 'gpt-4o-mini'; // Cost optimization: always use mini model
        creativityLevel = 'high';
        break;
    }
    
    // Build prompt focus areas
    const promptFocus: string[] = [];
    if (aiResult.namedDish) promptFocus.push('dish_authenticity');
    if (aiResult.chefReference) promptFocus.push('chef_style');
    if (aiResult.technique?.length) promptFocus.push('cooking_technique');
    if (aiResult.cuisine?.length) promptFocus.push('cuisine_authenticity');
    if (aiResult.flavorProfile?.length) promptFocus.push('flavor_development');
    if (aiResult.occasion?.length) promptFocus.push('context_matching');
    
    // Generate vague prompt signature if needed
    let vaguePromptSignature: string | undefined;
    if (specificity === InputSpecificity.VERY_VAGUE) {
      vaguePromptSignature = this.generateVagueSignature(originalInput, aiResult);
    }
    
    return {
      specificity: specificity as InputSpecificity,
      extractedElements: {
        namedDish: aiResult.namedDish,
        chefReference: aiResult.chefReference,
        cuisine: aiResult.cuisine,
        technique: aiResult.technique,
        mainIngredients: aiResult.mainIngredients,
        flavorProfile: aiResult.flavorProfile,
        occasion: aiResult.occasion,
        mood: aiResult.mood,
        timeHints: aiResult.timeHints,
        keyFlavors: aiResult.keyFlavors
      },
      promptStrategy: {
        tokenBudget,
        modelRecommendation,
        promptFocus,
        creativityLevel
      },
      vaguePromptSignature
    };
  }
  
  /**
   * Generate variety guidance for repeated vague prompts
   */
  static getVarietyGuidance(analysis: UserInputAnalysis, clientId?: string): {
    avoidCuisines: string[];
    avoidTechniques: string[];
    suggestCuisine?: string;
    suggestTechnique?: string;
  } {
    
    if (!analysis.vaguePromptSignature || !clientId) {
      return { avoidCuisines: [], avoidTechniques: [] };
    }
    
    const userHistory = this.vaguePromptHistory.get(clientId) || [];
    const recentSimilar = userHistory
      .filter(item => 
        item.signature === analysis.vaguePromptSignature &&
        Date.now() - item.timestamp < this.historyValidityMs
      )
      .slice(-5); // Last 5 similar requests
    
    const recentCuisines = recentSimilar.map(item => item.cuisineUsed);
    const recentTechniques = recentSimilar.map(item => item.techniqueUsed);
    
    // Suggest rotation through major cuisine families
    const cuisineRotation = [
      'British', 'Italian', 'French', 'Indian', 'Thai', 'Mexican', 
      'Chinese', 'Japanese', 'Greek', 'Spanish', 'Middle Eastern'
    ];
    
    const suggestCuisine = cuisineRotation.find(cuisine => 
      !recentCuisines.includes(cuisine)
    );
    
    const techniqueRotation = [
      'roasting', 'braising', 'pasta', 'stir-frying', 'grilling', 
      'curry', 'soup', 'salad', 'risotto', 'stew'
    ];
    
    const suggestTechnique = techniqueRotation.find(technique => 
      !recentTechniques.includes(technique)
    );
    
    return {
      avoidCuisines: recentCuisines,
      avoidTechniques: recentTechniques,
      suggestCuisine,
      suggestTechnique
    };
  }
  
  /**
   * Record a recipe generation for variety tracking
   */
  static recordGeneration(
    analysis: UserInputAnalysis, 
    clientId: string, 
    generatedCuisine: string,
    generatedTechnique: string
  ): void {
    
    if (!analysis.vaguePromptSignature) return;
    
    const userHistory = this.vaguePromptHistory.get(clientId) || [];
    
    userHistory.push({
      signature: analysis.vaguePromptSignature,
      timestamp: Date.now(),
      cuisineUsed: generatedCuisine,
      techniqueUsed: generatedTechnique
    });
    
    // Keep only recent history
    const filtered = userHistory
      .filter(item => Date.now() - item.timestamp < this.historyValidityMs)
      .slice(-this.maxHistoryPerUser);
    
    this.vaguePromptHistory.set(clientId, filtered);
  }
  
  // Helper methods for creating specific analysis types
  private static createCrystalClearAnalysis(input: string): UserInputAnalysis {
    // Extract what we can from the clear input
    const extractedElements: UserInputAnalysis['extractedElements'] = {};
    
    // Chef reference extraction
    const chefMatch = input.match(/([a-z\s]+)'s\s/i);
    if (chefMatch) {
      extractedElements.chefReference = chefMatch[1];
    }
    
    // Named dish extraction  
    const namedDishes = [
      'carbonara', 'bolognese', 'risotto', 'paella', 'coq au vin', 
      'beef wellington', 'fish and chips', 'bangers and mash', 'shepherd\'s pie'
    ];
    
    const foundDish = namedDishes.find(dish => 
      input.toLowerCase().includes(dish)
    );
    if (foundDish) {
      extractedElements.namedDish = foundDish;
    }
    
    return {
      specificity: InputSpecificity.CRYSTAL_CLEAR,
      extractedElements,
      promptStrategy: {
        tokenBudget: 2000,
        modelRecommendation: 'gpt-4o-mini',
        promptFocus: foundDish ? ['dish_authenticity'] : ['chef_style'],
        creativityLevel: 'low'
      }
    };
  }
  
  private static createVeryVagueAnalysis(input: string): UserInputAnalysis {
    return {
      specificity: InputSpecificity.VERY_VAGUE,
      extractedElements: {},
      promptStrategy: {
        tokenBudget: 3000,
        modelRecommendation: 'gpt-4o',
        promptFocus: ['creative_freedom', 'flavor_maximization'],
        creativityLevel: 'high'
      },
      vaguePromptSignature: this.generateVagueSignature(input, {})
    };
  }
  
  private static createModerateAnalysis(input: string): UserInputAnalysis {
    return {
      specificity: InputSpecificity.MODERATELY_CLEAR,
      extractedElements: {},
      promptStrategy: {
        tokenBudget: 2000,
        modelRecommendation: 'gpt-4o-mini',
        promptFocus: ['balanced_approach'],
        creativityLevel: 'medium'
      }
    };
  }
  
  private static createDefaultAnalysis(): UserInputAnalysis {
    return {
      specificity: InputSpecificity.SOMEWHAT_VAGUE,
      extractedElements: {},
      promptStrategy: {
        tokenBudget: 2000,
        modelRecommendation: 'gpt-4o-mini',
        promptFocus: ['creative_guidance'],
        creativityLevel: 'medium'
      }
    };
  }
  
  private static generateVagueSignature(input: string, analysis: any): string {
    // Create a signature for tracking similar vague requests
    const normalizedInput = input.toLowerCase()
      .replace(/[^a-z\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    
    const baseSignature = normalizedInput.length > 20 
      ? normalizedInput.substring(0, 20)
      : normalizedInput;
    
    // Add context if available  
    const contextParts = [];
    if (analysis.occasion?.length) contextParts.push(analysis.occasion[0]);
    if (analysis.mood?.length) contextParts.push(analysis.mood[0]);
    
    return contextParts.length 
      ? `${baseSignature}_${contextParts.join('_')}`
      : baseSignature;
  }
}