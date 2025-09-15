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

      // CRITICAL: Reject if no recipe context
      if (intentResult.requiresRecipeContext && !request.currentRecipe) {
        response = "I'm your recipe assistant and I'm ready to help when you're working on a recipe! To get started, please select a recipe to cook.";
        suggestedActions = [];
      } else {
        // Process recipe-focused intents
        switch (intentResult.intent) {
          case 'recipe_modification':
            const modificationResult = await this.handleRecipeModification(request, intentResult);
            response = modificationResult.message;
            suggestedActions = modificationResult.actions;
            break;

          case 'ingredient_substitution':
            const substitutionResult = await this.handleIngredientSubstitution(request, intentResult);
            response = substitutionResult.message;
            suggestedActions = substitutionResult.actions;
            break;

          case 'recipe_question':
            const questionResult = await this.handleRecipeQuestion(request, intentResult);
            response = questionResult.message;
            suggestedActions = questionResult.actions;
            break;

          case 'cooking_technique':
            const techniqueResult = await this.handleCookingTechnique(request, intentResult);
            response = techniqueResult.message;
            suggestedActions = techniqueResult.actions;
            break;

          default:
            // Fallback to recipe modification
            const fallbackResult = await this.handleRecipeModification(request, intentResult);
            response = fallbackResult.message;
            suggestedActions = fallbackResult.actions;
            break;
        }
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

  // === RECIPE-FOCUSED HELPER METHODS ===

  private static async handleIngredientSubstitution(
    request: OptimizedChatRequest,
    intentResult: any
  ): Promise<{message: string, actions: Array<{type: 'continue_chat', label: string, data?: any}>}> {
    
    const currentRecipe = request.currentRecipe;
    const substitutionPrompt = `For the ${currentRecipe.title} recipe, the user wants to: ${request.message}. Provide specific ingredient substitution advice that maintains the dish's integrity and flavor profile.`;

    const chatResponse = await AIService.chat({
      message: substitutionPrompt,
      context: {
        mode: 'ingredient_substitution',
        userPreferences: {},
        chatContext: 'recipe_modification'
      },
      currentRecipe
    }, {
      userId: request.userContext.userId,
      traceId: `sub-${Date.now()}`,
      maxTokens: 300
    });

    return {
      message: `🔄 **Substitution for ${currentRecipe.title}:**\n\n${chatResponse.message}`,
      actions: [{
        type: 'continue_chat',
        label: 'More Questions',
        data: {}
      }]
    };
  }

  private static async handleRecipeQuestion(
    request: OptimizedChatRequest,
    intentResult: any
  ): Promise<{message: string, actions: Array<{type: 'continue_chat', label: string, data?: any}>}> {
    
    const currentRecipe = request.currentRecipe;
    const questionPrompt = `About the ${currentRecipe.title} recipe, the user asks: ${request.message}. Provide a helpful, specific answer about this dish.`;

    const chatResponse = await AIService.chat({
      message: questionPrompt,
      context: {
        mode: 'recipe_question',
        userPreferences: {},
        chatContext: 'recipe_help'
      },
      currentRecipe
    }, {
      userId: request.userContext.userId,
      traceId: `question-${Date.now()}`,
      maxTokens: 250
    });

    return {
      message: `❓ **About ${currentRecipe.title}:**\n\n${chatResponse.message}`,
      actions: [{
        type: 'continue_chat',
        label: 'Ask More',
        data: {}
      }]
    };
  }

  private static async handleCookingTechnique(
    request: OptimizedChatRequest,
    intentResult: any
  ): Promise<{message: string, actions: Array<{type: 'continue_chat', label: string, data?: any}>}> {
    
    const currentRecipe = request.currentRecipe;
    const techniquePrompt = `For making ${currentRecipe.title}, the user needs help with: ${request.message}. Explain the technique specifically for this dish.`;

    const chatResponse = await AIService.chat({
      message: techniquePrompt,
      context: {
        mode: 'cooking_technique',
        userPreferences: {},
        chatContext: 'technique_guidance'
      },
      currentRecipe
    }, {
      userId: request.userContext.userId,
      traceId: `technique-${Date.now()}`,
      maxTokens: 350
    });

    return {
      message: `👨‍🍳 **Technique for ${currentRecipe.title}:**\n\n${chatResponse.message}`,
      actions: [{
        type: 'continue_chat',
        label: 'More Help',
        data: {}
      }]
    };
  }



  private static async handleRecipeModification(
    request: OptimizedChatRequest,
    intentResult: any
  ): Promise<{message: string, actions: Array<{type: 'continue_chat', label: string, data?: any}>}> {
    
    if (!request.currentRecipe) {
      return {
        message: "I need a recipe to work with! Please select a recipe first so I can help you modify it.",
        actions: []
      };
    }

    // Use AIProvider for recipe modification guidance
    const modificationPrompt = `For the "${request.currentRecipe.title}" recipe, the user wants to: ${request.message}. Provide specific, actionable modification advice that maintains the dish's quality and flavor profile. Focus on practical changes they can make.`;

    const chatResponse = await AIService.chat({
      message: modificationPrompt,
      context: {
        mode: 'recipe_modification',
        userPreferences: {},
        chatContext: 'recipe_improvement'
      },
      currentRecipe: request.currentRecipe
    }, {
      userId: request.userContext.userId,
      traceId: `modify-${Date.now()}`,
      maxTokens: 400
    });

    return {
      message: `🔧 **Modifying ${request.currentRecipe.title}:**\n\n${chatResponse.message}`,
      actions: [
        {
          type: 'continue_chat',
          label: 'Ask More Questions',
          data: {}
        }
      ]
    };
  }

  // === RECIPE-FOCUSED UTILITY METHODS ===
  
  // Removed shouldClarifyIntent - no longer needed since we don't generate recipes

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