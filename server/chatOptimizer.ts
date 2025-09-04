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
  intent: 'recipe_request' | 'recipe_modification' | 'conversational' | 'quick_recipe';
  confidence: number;
  specificity: 'crystal_clear' | 'moderately_clear' | 'somewhat_vague' | 'very_vague';
  modelRecommendation: 'gpt-4o-mini' | 'gpt-4o';
  estimatedCost: number;
  reasoning?: string;
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

  // Fast intent classification using GPT-4o-mini (similar to Chef Assist approach)
  static async classifyIntent(
    message: string, 
    context: ChatContext
  ): Promise<ChatIntentResult> {
    
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
            content: `You are a chat intent classifier. Analyze the user's message and classify intent with specificity level.

INTENT TYPES:
1. "recipe_request" - User wants a new recipe (no current recipe exists or wants something new)
2. "recipe_modification" - User wants to modify existing recipe
3. "conversational" - Cooking questions, techniques, advice (no recipe generation needed) 
4. "quick_recipe" - User explicitly wants a quick/condensed recipe in chat

SPECIFICITY LEVELS:
- "crystal_clear": Specific dish, ingredients, or method (e.g., "spicy chicken curry", "chocolate chip cookies")
- "moderately_clear": Some specifics but missing details (e.g., "pasta with vegetables", "something with salmon")
- "somewhat_vague": General category (e.g., "dinner", "dessert", "healthy meal")
- "very_vague": Unclear request (e.g., "what should I cook?", "I'm hungry")

SPECIAL PATTERNS FOR RECIPE REQUESTS:
- "Dinner suggestion" = recipe_request (user wants recipe options)
- "Recipe suggestion" = recipe_request (user wants recipe options)
- "[meal] suggestion" = recipe_request (user wants recipe options)

CONTEXT: ${context.currentRecipe ? 'User has current recipe: ' + context.currentRecipe.title : 'No current recipe'}

Respond with JSON: {
  "intent": "type",
  "confidence": 0-1,
  "specificity": "level", 
  "reasoning": "brief explanation"
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
        intent: result.intent || 'conversational',
        confidence: result.confidence || 0.5,
        specificity: result.specificity || 'somewhat_vague',
        modelRecommendation,
        estimatedCost,
        reasoning: result.reasoning
      };

    } catch (error) {
      console.error('Intent classification error:', error);
      // Fallback to safe defaults
      return {
        intent: 'conversational',
        confidence: 0.3,
        specificity: 'somewhat_vague',
        modelRecommendation: 'gpt-4o',
        estimatedCost: 0.015
      };
    }
  }

  // Quick pattern matching for obvious cases (no AI cost)
  private static quickPatternMatch(
    message: string, 
    context: ChatContext
  ): ChatIntentResult | null {
    
    const lower = message.toLowerCase().trim();
    console.log(`🔍 Quick pattern check: "${message}" -> "${lower}"`);
    
    // Quick recipe request pattern
    if (lower.startsWith('quick recipe for:')) {
      return {
        intent: 'quick_recipe',
        confidence: 1.0,
        specificity: 'crystal_clear',
        modelRecommendation: 'gpt-4o-mini',
        estimatedCost: 0.0003
      };
    }

    // Recipe modification patterns (when current recipe exists)
    if (context.currentRecipe && (
      lower.includes('make it') || 
      lower.includes('change') ||
      lower.includes('substitute') ||
      lower.includes('add') ||
      lower.includes('remove') ||
      lower.includes('more') ||
      lower.includes('less')
    )) {
      return {
        intent: 'recipe_modification',
        confidence: 0.9,
        specificity: 'moderately_clear',
        modelRecommendation: 'gpt-4o-mini',
        estimatedCost: 0.002
      };
    }

    // Recipe suggestion patterns (should generate recipe options)
    if (lower.includes('show me') && lower.includes('recipe') ||
        lower.includes('give me') && lower.includes('recipe') ||
        lower === 'dinner suggestion' ||
        lower === 'recipe suggestion' ||
        lower.includes('what should i cook') ||
        lower.includes('what can i make')) {
      return {
        intent: 'recipe_request',
        confidence: 0.9,
        specificity: 'somewhat_vague',
        modelRecommendation: 'gpt-4o-mini',
        estimatedCost: 0.003
      };
    }

    // Clear conversational patterns
    if (lower.includes('how do i') ||
        lower.includes('what is') ||
        lower.includes('how to') ||
        lower.includes('why') ||
        lower.includes('when') ||
        lower.includes('temperature') ||
        lower.includes('technique')) {
      return {
        intent: 'conversational',
        confidence: 0.9,
        specificity: 'crystal_clear',
        modelRecommendation: 'gpt-4o-mini',
        estimatedCost: 0.001
      };
    }

    return null; // Need AI classification
  }

  // Select optimal model based on intent and specificity
  private static selectOptimalModel(
    intent: string, 
    specificity: string
  ): 'gpt-4o-mini' | 'gpt-4o' {
    
    // Use GPT-4o-mini for most cases (faster, cheaper)
    if (intent === 'conversational') return 'gpt-4o-mini';
    if (intent === 'quick_recipe') return 'gpt-4o-mini';
    if (intent === 'recipe_modification') return 'gpt-4o-mini';
    
    // Use GPT-4o for complex recipe requests
    if (intent === 'recipe_request' && specificity === 'very_vague') return 'gpt-4o';
    
    return 'gpt-4o-mini'; // Default to cheaper model
  }

  // Estimate cost based on intent and model
  private static estimateCost(intent: string, model: string): number {
    const costs = {
      'gpt-4o-mini': {
        conversational: 0.001,
        quick_recipe: 0.0003,
        recipe_modification: 0.002,
        recipe_request: 0.003
      },
      'gpt-4o': {
        conversational: 0.005,
        quick_recipe: 0.008,
        recipe_modification: 0.008,
        recipe_request: 0.015
      }
    };

    return costs[model as keyof typeof costs]?.[intent as keyof typeof costs['gpt-4o-mini']] || 0.01;
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
    
    const suggestions: string[] = [];
    
    for (let i = 0; i < count; i++) {
      try {
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
          userIntent: message,
          clientId: clientId + '_' + i, // Ensure variety
        });

        if (result?.title) {
          suggestions.push(result.title);
        }
      } catch (error) {
        console.error(`Error generating suggestion ${i}:`, error);
      }
    }

    // Fallback suggestions if generation fails
    if (suggestions.length === 0) {
      return [
        "Herb-Crusted Chicken with Lemon",
        "Rustic Vegetable Pasta Bake", 
        "Spiced Salmon with Coconut Rice"
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