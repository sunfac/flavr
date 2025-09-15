// === BACKWARD-COMPATIBLE SHIM FOR OptimizedChatService ===
// This file maintains the exact same API as the original OptimizedChatService
// but uses the new AIProvider system under the hood

import { AIService } from './aiProviderInit';
import { ChatOptimizer } from './chatOptimizer'; // Keep existing intent classification

// Keep original interfaces for backward compatibility
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
  requiresIntentClarification?: boolean;
  clarificationOptions?: Array<{
    type: 'quick_recipe' | 'full_recipe' | 'recipe_options' | 'continue_chat';
    label: string;
    description: string;
    icon: string;
  }>;
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
  
  // === MAIN OPTIMIZED CHAT PROCESSOR (Updated to use AIProvider) ===
  static async processMessage(request: OptimizedChatRequest): Promise<OptimizedChatResponse> {
    const startTime = Date.now();
    
    try {
      console.log("🔄 OptimizedChatService.processMessage (via AIProvider)");
      
      // Phase 1: Fast Intent Classification (keep original for compatibility)
      const intentResult = await ChatOptimizer.classifyIntent(request.message, {
        userId: request.userContext.userId,
        pseudoUserId: request.userContext.pseudoUserId,
        conversationHistory: request.conversationHistory,
        currentRecipe: request.currentRecipe
      });

      console.log('🎯 Intent classified:', intentResult.intent, intentResult.confidence);

      // Phase 2: Generate response using AIProvider system
      let response: string;
      let suggestedActions: Array<{type: 'quick_recipe' | 'full_recipe' | 'continue_chat', label: string, data?: any}> | undefined;
      let tokenCount = 0;
      let modelUsed = 'gpt-4o-mini';
      let estimatedCost = 0;

      // Convert conversation history to AIProvider format
      const conversationHistory = request.conversationHistory.map(msg => ({
        role: msg.role as "user" | "assistant" | "system",
        content: msg.content
      }));

      switch (intentResult.intent) {
        case 'conversational':
          const conversationalResult = await this.handleConversationalQuery(request, intentResult);
          response = conversationalResult.message;
          suggestedActions = conversationalResult.actions;
          break;

        case 'quick_recipe':
          const quickResult = await this.handleQuickRecipeRequest(request, intentResult);
          response = quickResult.message;
          suggestedActions = quickResult.actions;
          break;

        case 'recipe_request':
          // Check if we should clarify intent for ambiguous recipe requests
          const shouldClarify = this.shouldClarifyIntent(request.message, intentResult);
          
          if (shouldClarify) {
            response = "I'd love to help you with a recipe! To give you the best suggestion, could you tell me a bit more about what you're looking for?";
            
            suggestedActions = [
              {
                type: 'quick_recipe',
                label: 'Quick Recipe Ideas',
                data: { requestType: 'quick' }
              },
              {
                type: 'full_recipe',
                label: 'Full Recipe Creation',
                data: { requestType: 'full' }
              }
            ];
          } else {
            const recipeResult = await this.handleRecipeRequest(request, intentResult);
            response = recipeResult.message;
            suggestedActions = recipeResult.actions;
          }
          break;

        case 'recipe_modification':
          const modificationResult = await this.handleRecipeModification(request, intentResult);
          response = modificationResult.message;
          suggestedActions = modificationResult.actions;
          break;

        default:
          // Use AIProvider for general chat
          const chatResponse = await AIService.chat({
            message: request.message,
            conversationHistory,
            context: {
              mode: 'chat',
              userPreferences: {},
              chatContext: 'general'
            }
          }, {
            userId: request.userContext.userId,
            traceId: `optimized-chat-${Date.now()}`,
            maxTokens: 500
          });

          response = chatResponse.message;
          modelUsed = chatResponse.metadata.model;
          tokenCount = (chatResponse.metadata.inputTokens || 0) + (chatResponse.metadata.outputTokens || 0);
          estimatedCost = parseFloat(chatResponse.metadata.estimatedCostUsd || "0");
          break;
      }

      const processingTimeMs = Date.now() - startTime;

      return {
        message: response,
        intent: intentResult.intent,
        confidence: intentResult.confidence,
        estimatedCost,
        suggestedActions,
        metadata: {
          modelUsed,
          processingTimeMs,
          tokenCount
        }
      };

    } catch (error) {
      console.error('❌ OptimizedChatService error:', error);
      
      // Fallback response
      return {
        message: "I'm having trouble processing your message right now. Please try again in a moment.",
        intent: 'error',
        confidence: 0,
        estimatedCost: 0,
        metadata: {
          modelUsed: 'fallback',
          processingTimeMs: Date.now() - startTime,
          tokenCount: 0
        }
      };
    }
  }

  // === HELPER METHODS (Updated to use AIProvider where appropriate) ===

  private static async handleConversationalQuery(
    request: OptimizedChatRequest,
    intentResult: any
  ): Promise<{message: string, actions: Array<{type: 'quick_recipe' | 'full_recipe' | 'continue_chat', label: string, data?: any}>}> {
    
    // Use AIProvider for conversational responses
    const conversationHistory = request.conversationHistory.map(msg => ({
      role: msg.role as "user" | "assistant" | "system",
      content: msg.content
    }));

    const chatResponse = await AIService.chat({
      message: request.message,
      conversationHistory,
      context: {
        mode: 'chat',
        userPreferences: {},
        chatContext: 'conversational'
      }
    }, {
      userId: request.userContext.userId,
      traceId: `conv-${Date.now()}`,
      maxTokens: 300
    });

    return {
      message: chatResponse.message,
      actions: [{
        type: 'continue_chat',
        label: 'Continue Conversation',
        data: {}
      }]
    };
  }

  private static async handleQuickRecipeRequest(
    request: OptimizedChatRequest,
    intentResult: any
  ): Promise<{message: string, actions: Array<{type: 'quick_recipe' | 'full_recipe' | 'continue_chat', label: string, data?: any}>}> {
    
    // Extract recipe request from message
    const recipeRequest = request.message.replace(/^quick recipe for:\s*/i, '').trim() || request.message;
    
    try {
      // Use AIProvider for recipe generation
      const recipeResponse = await AIService.generateRecipe({
        request: recipeRequest,
        preferences: {
          servings: 4,
          timeConstraint: 30, // Quick recipes should be fast
          difficulty: "Easy"
        },
        variant: "quick_weeknight"
      }, {
        userId: request.userContext.userId,
        traceId: `quick-recipe-${Date.now()}`,
        maxTokens: 800
      });

      // Format as a quick recipe response
      const quickRecipeText = `📝 **${recipeResponse.title}**

🥘 **Ingredients:**
${recipeResponse.ingredients.slice(0, 6).map(ing => `• ${typeof ing === 'string' ? ing : ing.text || ing}`).join('\n')}

👨‍🍳 **Quick Method:**
${recipeResponse.instructions.slice(0, 3).map((inst, idx) => `${idx + 1}. ${typeof inst === 'string' ? inst : inst.instruction || inst.description}`).join('\n')}

⏱️ **Time:** ${recipeResponse.cookTime} minutes | **Serves:** ${recipeResponse.servings}

💡 **Pro Tip:** ${recipeResponse.tips || 'Adjust seasoning to taste and enjoy!'}`;

      return {
        message: quickRecipeText,
        actions: [
          {
            type: 'full_recipe',
            label: 'Get Full Recipe',
            data: { title: recipeResponse.title, request: recipeRequest }
          },
          {
            type: 'continue_chat',
            label: 'Ask Questions',
            data: {}
          }
        ]
      };

    } catch (error) {
      console.error('Quick recipe generation failed:', error);
      
      return {
        message: `I'd love to help with a quick recipe for ${recipeRequest}! Let me suggest a simple approach that you can customize to your taste.`,
        actions: [
          {
            type: 'full_recipe',
            label: 'Generate Full Recipe',
            data: { request: recipeRequest }
          }
        ]
      };
    }
  }

  private static async handleRecipeRequest(
    request: OptimizedChatRequest,
    intentResult: any
  ): Promise<{message: string, actions: Array<{type: 'quick_recipe' | 'full_recipe' | 'continue_chat', label: string, data?: any}>}> {
    
    // Generate recipe suggestion using AIProvider
    const chatResponse = await AIService.chat({
      message: `Suggest a recipe title for: ${request.message}`,
      context: {
        mode: 'recipe_suggestion',
        userPreferences: {}
      }
    }, {
      userId: request.userContext.userId,
      traceId: `recipe-suggest-${Date.now()}`,
      maxTokens: 150
    });

    // Extract title from response or create one
    const suggestedTitle = chatResponse.message.replace(/['"]/g, '').trim();

    return {
      message: `How about ${suggestedTitle}? This sounds delicious and fits what you're looking for! Would you like me to turn this into a full Flavr recipe card?`,
      actions: [
        {
          type: 'full_recipe',
          label: 'Create Full Recipe',
          data: { title: suggestedTitle, originalRequest: request.message }
        },
        {
          type: 'quick_recipe',
          label: 'Get Quick Version',
          data: { title: suggestedTitle }
        }
      ]
    };
  }

  private static async handleRecipeModification(
    request: OptimizedChatRequest,
    intentResult: any
  ): Promise<{message: string, actions: Array<{type: 'quick_recipe' | 'full_recipe' | 'continue_chat', label: string, data?: any}>}> {
    
    if (!request.currentRecipe) {
      return {
        message: "I'd be happy to help modify a recipe! Could you share which recipe you'd like to adjust?",
        actions: [
          {
            type: 'continue_chat',
            label: 'Continue',
            data: {}
          }
        ]
      };
    }

    // Use AIProvider for recipe modification guidance
    const modificationPrompt = `I have a recipe for "${request.currentRecipe.title}" and the user wants to: ${request.message}. Provide helpful modification advice.`;

    const chatResponse = await AIService.chat({
      message: modificationPrompt,
      context: {
        mode: 'recipe_modification',
        userPreferences: {}
      },
      currentRecipe: request.currentRecipe
    }, {
      userId: request.userContext.userId,
      traceId: `modify-${Date.now()}`,
      maxTokens: 400
    });

    return {
      message: chatResponse.message,
      actions: [
        {
          type: 'continue_chat',
          label: 'Ask More Questions',
          data: {}
        }
      ]
    };
  }

  // === UTILITY METHODS (Keep original logic) ===

  private static shouldClarifyIntent(message: string, intentResult: any): boolean {
    // Original logic for determining if clarification is needed
    const ambiguousTerms = ['something', 'anything', 'food', 'meal', 'dinner', 'lunch', 'recipe'];
    const hasAmbiguousTerms = ambiguousTerms.some(term => 
      message.toLowerCase().includes(term)
    );
    
    return hasAmbiguousTerms && intentResult.confidence < 0.7;
  }

  private static compressConversationContext(
    history: Array<{role: string, content: string}>,
    maxMessages: number = 4
  ): Array<{role: string, content: string}> {
    // Keep last N messages for context
    return history.slice(-maxMessages);
  }

  private static generateVarietyGuidance(userContext: any, previousOutputs?: any[]): string {
    // Original variety guidance logic
    return "Ensure variety in suggestions";
  }
}