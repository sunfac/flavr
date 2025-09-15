import { OpenAI } from "openai";
import { UserInputAnalyzer, UserInputAnalysis } from './userInputAnalyzer';

const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY 
});

interface ChatContext {
  userId?: number;
  pseudoUserId?: string;
  conversationHistory: Array<{role: string, content: string}>;
  currentRecipe?: any;
}

interface ChatIntentResult {
  intent: 'recipe_modification' | 'recipe_question' | 'ingredient_substitution' | 'cooking_technique';
  confidence: number;
  specificity: 'crystal_clear' | 'moderately_clear' | 'somewhat_vague' | 'very_vague';
  modelRecommendation: 'gpt-4o-mini' | 'gpt-4o';
  estimatedCost: number;
  reasoning?: string;
  requiresRecipeContext: boolean;
}

interface ConversationMemory {
  recentTopics: string[];
  userPreferences: string[];
  cookingContext: string;
  tokenCount: number;
}

export class ChatOptimizer {
  private static conversationMemory = new Map<string, ConversationMemory>();
  private static readonly MAX_MEMORY_TOKENS = 500;
  private static readonly MAX_MEMORY_ITEMS = 8;

  // Recipe-focused intent classification - ONLY works with recipe context
  static async classifyIntent(
    message: string, 
    context: ChatContext
  ): Promise<ChatIntentResult> {
    
    // CRITICAL: Require recipe context for all chat interactions
    if (!context.currentRecipe) {
      return {
        intent: 'recipe_modification',
        confidence: 0,
        specificity: 'very_vague',
        modelRecommendation: 'gpt-4o-mini',
        estimatedCost: 0,
        requiresRecipeContext: true,
        reasoning: 'No recipe context - chat disabled'
      };
    }
    
    // Quick pattern matching for obvious cases (no AI cost)
    const quickResult = this.quickPatternMatch(message, context);
    if (quickResult) return quickResult;

    try {
      // Use GPT-4o-mini for fast, cheap classification
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are a recipe-focused chat intent classifier. The user is ALWAYS working on a specific recipe and all interactions must be recipe-contextual.

CRITICAL JSON REQUIREMENTS:
- Return ONLY valid JSON, no text before or after
- Use double quotes for all strings
- No trailing commas
- Keep string values concise to avoid truncation

RECIPE-FOCUSED INTENT TYPES (context required):
1. "recipe_modification" - User wants to modify current recipe (ingredients, quantities, steps)
2. "recipe_question" - Questions about the current recipe (timing, techniques, why certain steps)
3. "ingredient_substitution" - Replace/swap ingredients in current recipe
4. "cooking_technique" - Questions about techniques specific to current recipe

SPECIFICITY LEVELS:
- "crystal_clear": Specific modification/question about current recipe
- "moderately_clear": Some details but needs clarification about current recipe
- "somewhat_vague": General question about current recipe
- "very_vague": Unclear question about current recipe

CURRENT RECIPE: ${context.currentRecipe.title} - ALL responses must be specific to this dish

Respond with JSON (keep all strings under 50 characters): {
  "intent": "type",
  "confidence": 0-1,
  "specificity": "level", 
  "reasoning": "brief explanation (max 40 chars)"
}`
          },
          {
            role: "user",
            content: message
          }
        ],
        max_tokens: 100,
        temperature: 0.1,
        response_format: { type: "json_object" }
      });

      const result = JSON.parse(response.choices[0]?.message?.content || '{}');
      
      // Determine optimal model and cost based on classification
      const modelRecommendation = this.selectOptimalModel(result.intent, result.specificity);
      const estimatedCost = this.estimateCost(result.intent, modelRecommendation);

      return {
        intent: result.intent || 'recipe_modification',
        confidence: result.confidence || 0.5,
        specificity: result.specificity || 'somewhat_vague',
        modelRecommendation,
        estimatedCost,
        requiresRecipeContext: true,
        reasoning: result.reasoning
      };

    } catch (error) {
      console.error('Recipe-focused intent classification error:', error);
      // Fallback to recipe modification (safest default)
      return {
        intent: 'recipe_modification',
        confidence: 0.3,
        specificity: 'somewhat_vague',
        modelRecommendation: 'gpt-4o-mini',
        estimatedCost: 0.005,
        requiresRecipeContext: true
      };
    }
  }

  // Recipe-focused pattern matching (no AI cost)
  private static quickPatternMatch(
    message: string, 
    context: ChatContext
  ): ChatIntentResult | null {
    
    // MUST have recipe context
    if (!context.currentRecipe) {
      return {
        intent: 'recipe_modification',
        confidence: 0,
        specificity: 'very_vague',
        modelRecommendation: 'gpt-4o-mini',
        estimatedCost: 0,
        requiresRecipeContext: true
      };
    }
    
    const lower = message.toLowerCase().trim();
    
    // Recipe modification patterns (requires current recipe)
    if (lower.includes('make it') || 
        lower.includes('change') ||
        lower.includes('substitute') ||
        lower.includes('replace') ||
        lower.includes('add') ||
        lower.includes('remove') ||
        lower.includes('more') ||
        lower.includes('less') ||
        lower.includes('instead of') ||
        lower.includes('without')) {
      return {
        intent: 'recipe_modification',
        confidence: 0.95,
        specificity: 'moderately_clear',
        modelRecommendation: 'gpt-4o-mini',
        estimatedCost: 0.002,
        requiresRecipeContext: true
      };
    }

    // Ingredient substitution patterns
    if (lower.includes('substitute') ||
        lower.includes('replace') ||
        lower.includes('swap') ||
        lower.includes('instead of') ||
        lower.includes('alternative to') ||
        lower.includes('without')) {
      return {
        intent: 'ingredient_substitution',
        confidence: 0.95,
        specificity: 'crystal_clear',
        modelRecommendation: 'gpt-4o-mini',
        estimatedCost: 0.001,
        requiresRecipeContext: true
      };
    }

    // Recipe-specific question patterns
    if (lower.includes('how do i') ||
        lower.includes('what is') ||
        lower.includes('how to') ||
        lower.includes('why') ||
        lower.includes('when') ||
        lower.includes('how long') ||
        lower.includes('what temperature')) {
      return {
        intent: 'recipe_question',
        confidence: 0.9,
        specificity: 'crystal_clear',
        modelRecommendation: 'gpt-4o-mini',
        estimatedCost: 0.001,
        requiresRecipeContext: true
      };
    }

    // Cooking technique patterns (specific to current recipe)
    if (lower.includes('technique') ||
        lower.includes('method') ||
        lower.includes('cook') ||
        lower.includes('prepare') ||
        lower.includes('mixture') ||
        lower.includes('consistency')) {
      return {
        intent: 'cooking_technique',
        confidence: 0.85,
        specificity: 'moderately_clear',
        modelRecommendation: 'gpt-4o-mini',
        estimatedCost: 0.001,
        requiresRecipeContext: true
      };
    }

    return null; // Need AI classification
  }

  // Select optimal model for recipe-focused interactions
  private static selectOptimalModel(
    intent: string, 
    specificity: string
  ): 'gpt-4o-mini' | 'gpt-4o' {
    
    // Use GPT-4o-mini for all recipe-focused interactions (faster, cheaper)
    // All interactions are focused on current recipe, so complexity is manageable
    return 'gpt-4o-mini';
  }

  // Estimate cost for recipe-focused interactions
  private static estimateCost(intent: string, model: string): number {
    const costs = {
      'gpt-4o-mini': {
        recipe_modification: 0.002,
        recipe_question: 0.001,
        ingredient_substitution: 0.001,
        cooking_technique: 0.001
      }
    };

    return costs[model as keyof typeof costs]?.[intent as keyof typeof costs['gpt-4o-mini']] || 0.002;
  }

  // Smart context compression - keep conversation relevant but token-efficient
  static compressConversationContext(
    conversationHistory: Array<{role: string, content: string}>,
    currentRecipe?: any,
    userId?: string
  ): string {
    
    // Get or create conversation memory
    const memoryKey = userId || 'anonymous';
    let memory = this.conversationMemory.get(memoryKey);
    
    if (!memory) {
      memory = {
        recentTopics: [],
        userPreferences: [],
        cookingContext: '',
        tokenCount: 0
      };
    }

    // Extract key information from recent conversation
    const recentMessages = conversationHistory.slice(-5); // Last 5 messages
    const topics: string[] = [];
    const preferences: string[] = [];

    recentMessages.forEach(msg => {
      if (msg.role === 'user') {
        // Extract cooking preferences and topics
        const content = msg.content.toLowerCase();
        
        // Extract food preferences
        if (content.includes('like') || content.includes('prefer')) {
          preferences.push(msg.content.substring(0, 50));
        }
        
        // Extract cooking topics
        if (content.includes('cook') || content.includes('recipe') || content.includes('make')) {
          topics.push(msg.content.substring(0, 30));
        }
      }
    });

    // Update memory
    memory.recentTopics = Array.from(new Set([...topics, ...memory.recentTopics])).slice(0, this.MAX_MEMORY_ITEMS);
    memory.userPreferences = Array.from(new Set([...preferences, ...memory.userPreferences])).slice(0, this.MAX_MEMORY_ITEMS);
    
    // Build compressed context
    let contextParts: string[] = [];
    
    if (currentRecipe) {
      contextParts.push(`Current recipe: ${currentRecipe.title}`);
    }
    
    if (memory.recentTopics.length > 0) {
      contextParts.push(`Recent topics: ${memory.recentTopics.slice(0, 3).join(', ')}`);
    }
    
    if (memory.userPreferences.length > 0) {
      contextParts.push(`User preferences: ${memory.userPreferences.slice(0, 2).join(', ')}`);
    }

    const compressedContext = contextParts.join(' | ');
    memory.tokenCount = compressedContext.length / 4; // Rough token estimate
    
    // Store updated memory
    this.conversationMemory.set(memoryKey, memory);
    
    return compressedContext;
  }

  // Generate recipe suggestions using Chef Assist's optimized system
  static async generateRecipeSuggestions(
    message: string,
    clientId: string,
    count: number = 3
  ): Promise<string[]> {
    
    const { ChefAssistGPT5 } = await import('./chefAssistGPT5');
    const { UserInputAnalyzer } = await import('./userInputAnalyzer');
    
    const suggestions: string[] = [];
    
    // Analyze input for variety guidance
    const inputAnalysis = await UserInputAnalyzer.analyzeUserInput(
      message,
      clientId,
      [],
      []
    );
    
    // Get variety guidance to avoid repetition
    const varietyGuidance = UserInputAnalyzer.getVarietyGuidance(inputAnalysis, clientId);
    console.log('🎨 Chat variety guidance:', {
      avoid: varietyGuidance.avoidCuisines,
      suggest: varietyGuidance.suggestCuisine
    });
    
    // Enhanced cuisine rotation for chat mode
    const allCuisines = [
      'Italian', 'French', 'Thai', 'Indian', 'Mexican', 'Japanese', 
      'Chinese', 'Greek', 'Spanish', 'Middle Eastern', 'Korean', 
      'Vietnamese', 'Turkish', 'Moroccan', 'British', 'American'
    ];
    
    const availableCuisines = allCuisines.filter(cuisine => 
      !varietyGuidance.avoidCuisines.includes(cuisine)
    );
    
    for (let i = 0; i < count; i++) {
      try {
        // Use different cuisine for each suggestion
        const selectedCuisine = availableCuisines[i % availableCuisines.length] || 
                               varietyGuidance.suggestCuisine || 
                               allCuisines[i % allCuisines.length];
        
        // Generate unique seeds for variety
        const seeds = {
          randomSeed: Math.floor(Math.random() * 10000) + i * 1000,
          complexityLevel: Math.floor(Math.random() * 15) + 1,
          simpleStyle: Math.floor(Math.random() * 15) + 1,
          creativityMode: Math.floor(Math.random() * 8) + 1,
          seasonalFocus: Math.floor(Math.random() * 6) + 1,
          textureTheme: Math.floor(Math.random() * 10) + 1,
          flavorProfile: Math.floor(Math.random() * 12) + 1
        };

        const result = await ChefAssistGPT5.generateInspireTitle({
          seeds,
          userIntent: `Inspired by authentic ${selectedCuisine.toLowerCase()} flavors and techniques - ${message}`,
          cuisinePreference: selectedCuisine,
          clientId: clientId, // Use same clientId for variety tracking
        });

        if (result?.title) {
          suggestions.push(result.title);
          console.log(`✅ Generated ${selectedCuisine} suggestion: ${result.title}`);
        }
      } catch (error) {
        console.error(`Error generating suggestion ${i}:`, error);
      }
    }

    // Fallback suggestions if generation fails - simple, practical options
    if (suggestions.length === 0) {
      return [
        "Simple Chicken Stir-Fry with Vegetables",
        "Classic Spaghetti with Tomato Sauce", 
        "Easy Beef and Vegetable Curry"
      ];
    }

    return suggestions;
  }

  // Clear memory for user (useful for testing or privacy)
  static clearUserMemory(userId: string): void {
    this.conversationMemory.delete(userId);
  }

  // Get memory stats (for monitoring)
  static getMemoryStats(): { totalUsers: number, averageTokens: number } {
    const memories = Array.from(this.conversationMemory.values());
    const totalUsers = memories.length;
    const averageTokens = memories.length > 0 
      ? memories.reduce((sum, mem) => sum + mem.tokenCount, 0) / memories.length 
      : 0;
    
    return { totalUsers, averageTokens };
  }
}