import { OpenAI } from "openai";
import { ChatOptimizer } from "./chatOptimizer";
import { storage } from "./storage";

const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY 
});

interface OptimizedChatRequest {
  message: string;
  conversationHistory: Array<{role: string, content: string}>;
  currentRecipe?: any;
  userContext: {
    userId?: number;
    pseudoUserId?: string;
    isAuthenticated: boolean;
  };
}

interface OptimizedChatResponse {
  message: string;
  intent: string;
  confidence: number;
  estimatedCost: number;
  suggestedActions?: Array<{
    type: 'quick_recipe' | 'full_recipe' | 'continue_chat';
    label: string;
    data?: any;
  }>;
  metadata: {
    modelUsed: string;
    processingTimeMs: number;
    tokenCount: number;
  };
}

export class OptimizedChatService {
  
  // Main optimized chat processor
  static async processMessage(request: OptimizedChatRequest): Promise<OptimizedChatResponse> {
    const startTime = Date.now();
    
    try {
      // Phase 1: Fast Intent Classification
      const intentResult = await ChatOptimizer.classifyIntent(request.message, {
        userId: request.userContext.userId,
        pseudoUserId: request.userContext.pseudoUserId,
        conversationHistory: request.conversationHistory,
        currentRecipe: request.currentRecipe
      });

      console.log('🎯 Optimized intent classification:', {
        intent: intentResult.intent,
        confidence: intentResult.confidence,
        model: intentResult.modelRecommendation,
        estimatedCost: intentResult.estimatedCost
      });

      // Phase 2: Generate appropriate response based on intent
      let response: string;
      let suggestedActions: Array<{type: 'quick_recipe' | 'full_recipe' | 'continue_chat', label: string, data?: any}> | undefined;
      let tokenCount = 0;

      switch (intentResult.intent) {
        case 'conversational':
          response = await this.handleConversationalQuery(request, intentResult);
          tokenCount = response.length / 4; // Rough estimate
          break;

        case 'quick_recipe':
          response = await this.handleQuickRecipeRequest(request, intentResult);
          tokenCount = response.length / 4;
          break;

        case 'recipe_request':
          const recipeResponse = await this.handleRecipeRequest(request, intentResult);
          response = recipeResponse.message;
          suggestedActions = recipeResponse.actions;
          tokenCount = response.length / 4;
          break;

        case 'recipe_modification':
          response = await this.handleRecipeModification(request, intentResult);
          tokenCount = response.length / 4;
          break;

        default:
          response = await this.handleFallback(request);
          tokenCount = response.length / 4;
      }

      // Save conversation if user is logged in
      if (request.userContext.userId) {
        try {
          await storage.createChatMessage({
            userId: request.userContext.userId,
            message: request.message,
            response: response
          });
        } catch (error) {
          console.error('Error saving optimized chat message:', error);
        }
      }

      const processingTime = Date.now() - startTime;

      return {
        message: response,
        intent: intentResult.intent,
        confidence: intentResult.confidence,
        estimatedCost: intentResult.estimatedCost,
        suggestedActions,
        metadata: {
          modelUsed: intentResult.modelRecommendation,
          processingTimeMs: processingTime,
          tokenCount,
          estimatedCost: intentResult.estimatedCost || 0.01
        }
      };

    } catch (error) {
      console.error('Optimized chat processing error:', error);
      
      const processingTime = Date.now() - startTime;
      
      // Fallback response
      return {
        message: "I'm having trouble processing your request right now. Could you try rephrasing it?",
        intent: 'error',
        confidence: 0,
        estimatedCost: 0,
        metadata: {
          modelUsed: 'fallback',
          processingTimeMs: processingTime,
          tokenCount: 50
        }
      };
    }
  }

  // Handle conversational queries (cooking questions, techniques, etc.)
  private static async handleConversationalQuery(
    request: OptimizedChatRequest,
    intentResult: any
  ): Promise<string> {
    
    // Use compressed context for efficiency
    const compressedContext = ChatOptimizer.compressConversationContext(
      request.conversationHistory,
      request.currentRecipe,
      request.userContext.userId?.toString()
    );

    const systemPrompt = `You are Zest, a friendly cooking assistant. Provide helpful, concise cooking advice.

CONTEXT: ${compressedContext}

Be conversational and practical. Keep responses focused and useful without being overly wordy.`;

    const response = await openai.chat.completions.create({
      model: intentResult.modelRecommendation,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: request.message }
      ],
      max_tokens: 300,
      temperature: 0.7
    });

    return response.choices[0]?.message?.content || "I'd be happy to help with your cooking question!";
  }

  // Handle quick recipe requests (condensed recipes in chat)
  private static async handleQuickRecipeRequest(
    request: OptimizedChatRequest,
    intentResult: any
  ): Promise<string> {
    
    const recipeTitle = request.message.replace(/^quick recipe for:\s*/i, '').trim();
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini", // Always use mini for quick recipes
      messages: [
        { 
          role: "system", 
          content: `Generate a condensed, chat-friendly recipe. Format:

🍽️ **[Recipe Title]**

🥘 **Ingredients:** (4-6 key items)
• Main items with quantities

👨‍🍳 **Method:** (2-3 simple steps)
1. Prep and cook
2. Season and serve

⏱️ **Time:** X mins | **Serves:** X

Be concise but complete. Use friendly, encouraging tone.`
        },
        { role: "user", content: `Quick recipe for: ${recipeTitle}` }
      ],
      max_tokens: 400,
      temperature: 0.7
    });

    return response.choices[0]?.message?.content || "Here's a quick recipe idea for you!";
  }

  // Handle recipe requests with suggestions and actions
  private static async handleRecipeRequest(
    request: OptimizedChatRequest,
    intentResult: any
  ): Promise<{message: string, actions: Array<{type: 'quick_recipe' | 'full_recipe' | 'continue_chat', label: string, data?: any}>}> {
    
    const clientId = request.userContext.userId?.toString() || 'anonymous';
    
    // Generate suggestions using Chef Assist's optimized system
    const suggestions = await ChatOptimizer.generateRecipeSuggestions(
      request.message,
      clientId,
      3
    );

    // For clear requests, provide direct suggestion
    if (intentResult.specificity === 'crystal_clear' || intentResult.specificity === 'moderately_clear') {
      const primarySuggestion = suggestions[0];
      
      const response = `How about ${primarySuggestion}? That sounds perfect for what you're looking for! `;
      
      const actions = [
        {
          type: 'quick_recipe' as const,
          label: '🍽️ Quick Recipe',
          data: { title: primarySuggestion }
        },
        {
          type: 'full_recipe' as const,
          label: '📋 Full Recipe Card',
          data: { title: primarySuggestion, originalMessage: request.message }
        },
        {
          type: 'continue_chat' as const,
          label: '💬 Different idea?',
          data: { alternatives: suggestions.slice(1) }
        }
      ];

      return { message: response, actions };
    }

    // For vague requests, provide multiple options
    const response = `I have some great ideas for you! Here are a few options:\n\n` +
      suggestions.map((title, i) => `${i + 1}. ${title}`).join('\n') + 
      `\n\nWhich one sounds good, or would you like me to suggest something else?`;

    const actions = suggestions.map(title => ({
      type: 'full_recipe' as const,
      label: `📋 ${title.substring(0, 30)}...`,
      data: { title, originalMessage: request.message }
    }));

    return { message: response, actions };
  }

  // Handle recipe modifications
  private static async handleRecipeModification(
    request: OptimizedChatRequest,
    intentResult: any
  ): Promise<string> {
    
    if (!request.currentRecipe) {
      return "I'd love to help modify a recipe, but I don't see one loaded. Could you generate a recipe first?";
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini", // Use mini for modifications
      messages: [
        {
          role: "system",
          content: `You are Zest helping modify a recipe. Current recipe: "${request.currentRecipe.title}"

Provide clear, specific modification advice. Be concise and practical.`
        },
        {
          role: "user",
          content: request.message
        }
      ],
      max_tokens: 250,
      temperature: 0.7
    });

    return response.choices[0]?.message?.content || "I can help you modify that recipe!";
  }

  // Fallback handler
  private static async handleFallback(request: OptimizedChatRequest): Promise<string> {
    return "I'd love to help! Could you tell me more about what you're looking to cook or any cooking questions you have?";
  }
}