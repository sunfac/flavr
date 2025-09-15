import { OpenAI } from "openai";
import { ChatOptimizer } from "./chatOptimizer";
import { storage } from "./storage";
import { trackTitleWords, generateVarietyNotes } from './sharedVarietyTracker';

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
    estimatedCost: number;
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

      // Log for development monitoring only
      if (process.env.NODE_ENV === 'development') {
        console.log('🎯 Intent classified:', intentResult.intent, intentResult.confidence);
      }

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
          // Check if we should clarify intent for ambiguous recipe requests
          const shouldClarify = this.shouldClarifyIntent(request.message, intentResult);
          
          if (shouldClarify) {
            return this.generateIntentClarification(request.message, startTime);
          }
          
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

    const systemPrompt = `You are Zest, channeling the authentic voices of established cookbook authors and chefs. Provide helpful, concise cooking advice that sounds genuinely like guidance from:

BRITISH CHEFS: Rick Stein, Jamie Oliver, Tom Kerridge, Mary Berry, Delia Smith, Marcus Wareing, Gordon Ramsay, Nigella Lawson, Hugh Fearnley-Whittingstall, Michel Roux Jr, Angela Hartnett, Ainsley Harriott, Heston Blumenthal, Raymond Blanc, Jason Atherton, Clare Smyth

LONDON RESTAURANT MASTERS: Ollie Dabbous, Robin Gill, Endo Kazutoshi, José Pizarro, Aktar Islam, Anna Hansen, Rohit Ghai, Francesco Mazzei, Sat Bains, Paul Ainsworth, Tommy Banks, Adam Handling

INTERNATIONAL LEGENDS: Yotam Ottolenghi, José Andrés, Anthony Bourdain, Julia Child, Thomas Keller, Massimo Bottura, David Chang, Ferran Adrià, Joël Robuchon, Daniel Boulud, Eric Ripert, Alice Waters, Wolfgang Puck, Nobu Matsuhisa, Alain Ducasse, René Redzepi, and other established voices.

AUTHENTICITY REQUIREMENTS:
- Write like these chefs actually write - study their voice, technique explanations, ingredient choices
- Use British English and assume UK supermarket availability
- Match the confidence and style of established cookbook authors
- Avoid pretentious language - be direct and practical
- Include professional techniques when relevant but explain them clearly

CULINARY TECHNIQUE GUIDANCE:
- When discussing cooking methods, explain why they work (e.g., "browning builds flavor through the Maillard reaction")
- Suggest timing and temperature specifics when relevant
- Offer finishing touches that elevate dishes
- Provide practical tips that demonstrate professional knowledge
- Explain how to build flavors in layers when applicable

CONTEXT: ${compressedContext}

Be conversational and practical. Keep responses focused and useful without being overly wordy, but include technique insights that show culinary expertise.`;

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
    
    // Get client ID for variety tracking
    const clientId = request.userContext.userId?.toString() || 'anonymous';
    
    // Add variety notes to the prompt
    const varietyNotes = generateVarietyNotes(clientId, 'chat-mode');
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini", // Always use mini for quick recipes
      messages: [
        { 
          role: "system", 
          content: `You are Zest, channeling established chef voices to create condensed, chat-friendly recipes. Sound like:

BRITISH CHEFS: Rick Stein, Jamie Oliver, Tom Kerridge, Mary Berry, Delia Smith, Marcus Wareing, Gordon Ramsay, Nigella Lawson, Michel Roux Jr, Angela Hartnett, Jason Atherton, Clare Smyth

LONDON RESTAURANT MASTERS: Ollie Dabbous, José Pizarro, Aktar Islam, Anna Hansen, Rohit Ghai, Francesco Mazzei, Adam Handling

INTERNATIONAL LEGENDS: Yotam Ottolenghi, José Andrés, Julia Child, Thomas Keller, Massimo Bottura, David Chang, Ferran Adrià, Alain Ducasse

Be direct, practical, confident.

AUTHENTICITY REQUIREMENTS:
- Use British English and metric measurements
- Include one professional technique or tip
- Explain timing and technique briefly but expertly

Format:

🍽️ **[Recipe Title]**

🥘 **Ingredients:** (4-6 key items)
• Main items with quantities (metric)

👨‍🍳 **Method:** (2-3 steps with technique insight)
1. Prep and key technique (with why it matters)
2. Cook and finish (with professional tip)

⏱️ **Time:** X mins | **Serves:** X

Be concise but complete. Use friendly, encouraging chef's tone with technique confidence.${varietyNotes}`
        },
        { role: "user", content: `Quick recipe for: ${recipeTitle}` }
      ],
      max_tokens: 400,
      temperature: 0.7
    });

    const responseContent = response.choices[0]?.message?.content || "Here's a quick recipe idea for you!";
    
    // Track the recipe title for variety (extract from response)
    const titleMatch = responseContent.match(/🍽️\s*\*\*(.+?)\*\*/);
    if (titleMatch && titleMatch[1]) {
      trackTitleWords({
        clientId,
        mode: 'chat-mode',
        title: titleMatch[1]
      });
    }
    
    return responseContent;
  }

  // Handle recipe requests with suggestions and actions
  private static async handleRecipeRequest(
    request: OptimizedChatRequest,
    intentResult: any
  ): Promise<{message: string, actions: Array<{type: 'quick_recipe' | 'full_recipe' | 'continue_chat', label: string, data?: any}>}> {
    
    const clientId = request.userContext.userId?.toString() || 'anonymous';
    
    // Generate suggestions using Chef Assist's optimized system
    let suggestions: string[];
    try {
      const rawSuggestions = await ChatOptimizer.generateRecipeSuggestions(
        request.message,
        clientId,
        3
      );
      
      // Validate and filter out inappropriate fusion combinations
      suggestions = this.validateRecipeSuggestions(rawSuggestions);
      console.log('✅ Recipe suggestions generated:', suggestions);
    } catch (error) {
      console.error('❌ Recipe suggestions generation failed:', error);
      // Use fallback suggestions
      suggestions = [
        "Herb-Crusted Chicken with Lemon",
        "Rustic Vegetable Pasta Bake", 
        "Spiced Salmon with Coconut Rice"
      ];
    }

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

  // Validate recipe suggestions to prevent inappropriate fusion combinations
  private static validateRecipeSuggestions(suggestions: string[]): string[] {
    const problematicPatterns = [
      // Cross-cuisine fusion patterns that don't make sense
      /pho.*bourguignon|bourguignon.*pho/i,
      /curry.*fish.*chips|fish.*chips.*curry/i,
      /kimchi.*tacos|tacos.*kimchi/i,
      /pasta.*pad.*thai|pad.*thai.*pasta/i,
      /sushi.*shepherd.*pie|shepherd.*pie.*sushi/i,
      /pho.*infused.*french|french.*pho.*infused/i,
      /thai.*infused.*british|british.*thai.*infused/i,
      /italian.*infused.*chinese|chinese.*infused.*italian/i,
      /indian.*infused.*mexican|mexican.*infused.*indian/i,
      
      // Other nonsensical combinations
      /molecular.*gastronomy/i,
      /spherification/i,
      /liquid.*nitrogen/i
    ];
    
    const validSuggestions = suggestions.filter(suggestion => {
      const isProblematic = problematicPatterns.some(pattern => 
        pattern.test(suggestion)
      );
      
      if (isProblematic) {
        console.log(`🚫 Filtered out inappropriate fusion: ${suggestion}`);
        return false;
      }
      return true;
    });
    
    // If we filtered out too many, add some safe fallbacks
    if (validSuggestions.length < 2) {
      const fallbacks = [
        "Classic Pan-Seared Chicken with Herbs",
        "Traditional Beef Stew with Vegetables", 
        "Simple Pasta with Garlic and Olive Oil",
        "Fresh Salmon with Lemon Butter",
        "Homestyle Vegetable Stir-Fry"
      ];
      
      // Add fallbacks until we have at least 3 suggestions
      while (validSuggestions.length < 3) {
        const fallback = fallbacks[validSuggestions.length % fallbacks.length];
        if (!validSuggestions.includes(fallback)) {
          validSuggestions.push(fallback);
        }
      }
    }
    
    return validSuggestions;
  }

  // Check if intent clarification is needed - be less aggressive
  private static shouldClarifyIntent(message: string, intentResult: any): boolean {
    const lower = message.toLowerCase().trim();
    
    // Only clarify for extremely vague requests with very low confidence
    const extremelyVaguePatterns = [
      'help me cook',
      'what should i cook',
      'cooking help',
      'food advice'
    ];

    // For recipe requests like "dinner recipe options", provide direct options instead of clarifying
    return extremelyVaguePatterns.some(pattern => lower.includes(pattern)) && 
           intentResult.confidence < 0.7; // Much lower threshold
  }

  // Generate intent clarification response
  private static generateIntentClarification(message: string, startTime: number): OptimizedChatResponse {
    const clarificationOptions = [
      {
        type: 'quick_recipe' as const,
        label: 'Quick recipe in chat',
        description: 'Get a simple 2-3 step recipe right here in our conversation - perfect for quick cooking',
        icon: '💬'
      },
      {
        type: 'full_recipe' as const,
        label: 'Complete recipe card',
        description: 'Generate a detailed recipe card with ingredients list, step-by-step instructions, timing, and servings',
        icon: '📋'
      },
      {
        type: 'recipe_options' as const,
        label: 'Browse 3 recipe options',
        description: 'See 3 different recipe suggestions to pick from, then choose your favorite for the full recipe',
        icon: '🎯'
      }
    ];

    return {
      message: `I can help you with that! How would you like me to present your recipe?`,
      intent: 'clarification_needed',
      confidence: 1.0,
      estimatedCost: 0,
      requiresIntentClarification: true,
      clarificationOptions,
      metadata: {
        modelUsed: 'clarification',
        processingTimeMs: Date.now() - startTime,
        tokenCount: 50
      }
    };
  }
}