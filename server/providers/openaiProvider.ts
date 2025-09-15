import OpenAI from "openai";
import type { 
  IAIProvider, 
  ChatInput, 
  RecipeInput, 
  WeeklyPlanInput, 
  ImageAnalysisInput 
} from "../aiProvider";
import type { 
  AIModel, 
  AIRequestOptions, 
  ChatResponse, 
  RecipeLLM, 
  WeeklyPlanLLM, 
  PhotoToRecipeLLM,
  AIResponseMetadata
} from "@shared/aiSchemas";
import {
  validateAIResponse,
  ChatResponse as ChatResponseSchema,
  RecipeLLM as RecipeLLMSchema,
  WeeklyPlanLLM as WeeklyPlanLLMSchema,
  PhotoToRecipeLLM as PhotoToRecipeLLMSchema,
  FALLBACK_CHAT_RESPONSE,
  FALLBACK_RECIPE,
  FALLBACK_WEEKLY_PLAN
} from "@shared/aiSchemas";
import { 
  compileChatPrompt, 
  compileRecipePrompt, 
  compileWeeklyPlannerPrompt, 
  compileImageToRecipePrompt 
} from "../promptTemplates";
import { v4 as uuidv4 } from "uuid";
import { aiCostTracker } from "../aiCostTracker";

// === OPENAI PROVIDER IMPLEMENTATION ===
export class OpenAIProvider implements IAIProvider {
  public readonly name = "openai";
  public readonly supportedModels: AIModel[] = [
    "gpt-4o", 
    "gpt-4o-mini", 
    "gpt-5", 
    "dall-e-3"
  ];
  
  private client: OpenAI;
  private healthStatus: { healthy: boolean; lastCheck: number } = { 
    healthy: true, 
    lastCheck: 0 
  };
  
  constructor() {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY environment variable is required');
    }
    
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      timeout: 30000, // 30 second timeout
    });
    
    console.log('🤖 OpenAI Provider initialized');
  }
  
  // === CHAT IMPLEMENTATION ===
  async chat(input: ChatInput, options: AIRequestOptions = {}): Promise<ChatResponse> {
    const requestId = uuidv4();
    const startTime = Date.now();
    
    try {
      // Compile optimized prompt
      const prompt = compileChatPrompt(input.message, {
        conversationHistory: input.conversationHistory,
        userPreferences: input.context?.userPreferences,
        variant: input.variant,
        model: input.model || "gpt-4o-mini",
        maxTokens: options.maxTokens
      });
      
      // Prepare messages
      const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
        { role: "system", content: prompt.systemPrompt },
        { role: "user", content: prompt.userPrompt }
      ];
      
      // Add conversation history
      if (input.conversationHistory) {
        const historyMessages = input.conversationHistory.slice(-5).map(msg => ({
          role: msg.role as "user" | "assistant",
          content: msg.content
        }));
        messages.splice(-1, 0, ...historyMessages);
      }
      
      const model = this.mapToOpenAIModel(input.model || "gpt-4o-mini");
      
      // Execute API call with retries
      const completion = await this.executeWithRetry(async () => {
        return this.client.chat.completions.create({
          model,
          messages,
          max_tokens: options.maxTokens || (model === "gpt-4o-mini" ? 1000 : 2000),
          temperature: options.temperature || 0.7,
          stream: options.stream || false,
        });
      }, options.retries || 1);
      
      const response = completion.choices[0]?.message?.content;
      if (!response) {
        throw new Error('Empty response from OpenAI');
      }
      
      // Analyze response for intent
      const intent = this.analyzeIntent(response, input.message);
      
      // Build metadata
      const metadata: AIResponseMetadata = {
        model: input.model || "gpt-4o-mini",
        provider: "openai",
        requestId,
        traceId: options.traceId,
        processingTimeMs: Date.now() - startTime,
        inputTokens: completion.usage?.prompt_tokens,
        outputTokens: completion.usage?.completion_tokens,
        estimatedCostUsd: this.calculateCost(completion.usage?.prompt_tokens || 0, completion.usage?.completion_tokens || 0, model),
        promptVariant: prompt.variant
      };
      
      const chatResponse: ChatResponse = {
        message: response,
        intent,
        confidence: this.calculateConfidence(response, intent),
        requiresIntentClarification: false,
        metadata
      };
      
      // Validate response
      const validation = validateAIResponse(ChatResponseSchema, chatResponse, FALLBACK_CHAT_RESPONSE);
      if (!validation.success) {
        console.warn(`⚠️ OpenAI chat response validation failed: ${validation.error}`);
        return validation.fallback || {
          ...FALLBACK_CHAT_RESPONSE,
          metadata: { ...FALLBACK_CHAT_RESPONSE.metadata!, ...metadata }
        } as ChatResponse;
      }
      
      const finalResponse = validation.data;
      
      // Track cost with aiCostTracker
      try {
        await aiCostTracker.trackCost({
          userId: options.userId,
          sessionId: options.traceId,
          provider: 'openai',
          model: input.model || "gpt-4o-mini",
          operation: 'chat',
          inputTokens: completion.usage?.prompt_tokens,
          outputTokens: completion.usage?.completion_tokens,
          requestData: { message: input.message.substring(0, 100) },
          responseData: { intent, confidence: finalResponse.confidence }
        });
      } catch (costError) {
        console.warn('Failed to track AI cost:', costError);
      }
      
      return finalResponse;
      
    } catch (error) {
      console.error(`❌ OpenAI chat error (${requestId}):`, error);
      
      // Return fallback response
      const fallbackMetadata: AIResponseMetadata = {
        model: "gpt-4o-mini",
        provider: "openai",
        requestId,
        processingTimeMs: Date.now() - startTime,
        fallbackUsed: true,
        estimatedCostUsd: "0.000"
      };
      
      return {
        ...FALLBACK_CHAT_RESPONSE,
        metadata: { ...FALLBACK_CHAT_RESPONSE.metadata!, ...fallbackMetadata }
      } as ChatResponse;
    }
  }
  
  // === RECIPE GENERATION ===
  async generateRecipe(input: RecipeInput, options: AIRequestOptions = {}): Promise<RecipeLLM> {
    const requestId = uuidv4();
    const startTime = Date.now();
    
    try {
      const prompt = compileRecipePrompt(input.request, {
        difficulty: input.preferences?.difficulty,
        cuisine: input.preferences?.cuisine,
        servings: input.preferences?.servings,
        timeConstraint: input.preferences?.timeConstraint,
        dietaryRestrictions: input.preferences?.dietaryRestrictions,
        userPreferences: input.preferences,
        variant: input.variant || "michelin_quality",
        model: input.model || "gpt-4o",
        maxTokens: options.maxTokens
      });
      
      const model = this.mapToOpenAIModel(input.model || "gpt-4o");
      
      const completion = await this.executeWithRetry(async () => {
        return this.client.chat.completions.create({
          model,
          messages: [
            { role: "system", content: prompt.systemPrompt },
            { role: "user", content: prompt.userPrompt }
          ],
          max_tokens: options.maxTokens || (model === "gpt-5" ? 4000 : 2500),
          temperature: options.temperature || 0.8,
          response_format: { type: "json_object" }
        });
      }, options.retries || 2);
      
      const content = completion.choices[0]?.message?.content;
      if (!content) {
        throw new Error('Empty response from OpenAI');
      }
      
      // Parse and enhance JSON response
      let parsedRecipe;
      try {
        parsedRecipe = JSON.parse(content);
      } catch (parseError) {
        console.error('Failed to parse recipe JSON:', parseError);
        parsedRecipe = this.extractRecipeFromText(content, input.request);
      }
      
      // Build metadata
      const metadata: AIResponseMetadata = {
        model: input.model || "gpt-4o",
        provider: "openai",
        requestId,
        traceId: options.traceId,
        processingTimeMs: Date.now() - startTime,
        inputTokens: completion.usage?.prompt_tokens,
        outputTokens: completion.usage?.completion_tokens,
        estimatedCostUsd: this.calculateCost(completion.usage?.prompt_tokens || 0, completion.usage?.completion_tokens || 0, model),
        promptVariant: prompt.variant
      };
      
      // Enhance recipe with required fields
      const recipe: RecipeLLM = {
        title: parsedRecipe.title || input.request,
        description: parsedRecipe.description || `A delicious ${input.preferences?.cuisine || ''} recipe`,
        cuisine: parsedRecipe.cuisine || input.preferences?.cuisine || "International",
        difficulty: parsedRecipe.difficulty || input.preferences?.difficulty || "Medium",
        cookTime: parsedRecipe.cookTime || parsedRecipe.totalTime || 30,
        prepTime: parsedRecipe.prepTime || 15,
        servings: parsedRecipe.servings || input.preferences?.servings || 4,
        ingredients: Array.isArray(parsedRecipe.ingredients) ? parsedRecipe.ingredients : ["Basic ingredients"],
        instructions: Array.isArray(parsedRecipe.instructions) ? parsedRecipe.instructions : ["Follow standard cooking method"],
        tips: parsedRecipe.tips || parsedRecipe.tip,
        equipment: parsedRecipe.equipment || input.preferences?.equipment,
        dietary: parsedRecipe.dietary || input.preferences?.dietaryRestrictions,
        originalPrompt: input.request,
        mode: input.mode,
        quizData: input.quizData,
        metadata
      };
      
      // Validate response
      const validation = validateAIResponse(RecipeLLMSchema, recipe, FALLBACK_RECIPE);
      if (!validation.success) {
        console.warn(`⚠️ OpenAI recipe response validation failed: ${validation.error}`);
        return validation.fallback || {
          ...FALLBACK_RECIPE,
          title: input.request,
          originalPrompt: input.request,
          mode: input.mode,
          metadata: { ...FALLBACK_RECIPE.metadata!, ...metadata }
        } as RecipeLLM;
      }
      
      const finalResponse = validation.data;
      
      // Track cost with aiCostTracker
      try {
        await aiCostTracker.trackCost({
          userId: options.userId,
          sessionId: options.traceId,
          provider: 'openai',
          model: input.model || "gpt-4o",
          operation: 'generateRecipe',
          inputTokens: completion.usage?.prompt_tokens,
          outputTokens: completion.usage?.completion_tokens,
          requestData: { request: input.request.substring(0, 100), mode: input.mode },
          responseData: { title: finalResponse.title, cuisine: finalResponse.cuisine }
        });
      } catch (costError) {
        console.warn('Failed to track AI cost:', costError);
      }
      
      return finalResponse;
      
    } catch (error) {
      console.error(`❌ OpenAI recipe error (${requestId}):`, error);
      
      const fallbackMetadata: AIResponseMetadata = {
        model: "gpt-4o",
        provider: "openai",
        requestId,
        processingTimeMs: Date.now() - startTime,
        fallbackUsed: true,
        estimatedCostUsd: "0.000"
      };
      
      return {
        ...FALLBACK_RECIPE,
        title: input.request,
        originalPrompt: input.request,
        mode: input.mode,
        metadata: { ...FALLBACK_RECIPE.metadata!, ...fallbackMetadata }
      } as RecipeLLM;
    }
  }
  
  // === WEEKLY PLAN GENERATION ===
  async generateWeeklyTitles(input: WeeklyPlanInput, options: AIRequestOptions = {}): Promise<WeeklyPlanLLM> {
    const requestId = uuidv4();
    const startTime = Date.now();
    
    try {
      const prompt = compileWeeklyPlannerPrompt(input.preferences, {
        totalMeals: input.totalMeals,
        variant: input.variant || "balanced_planning",
        model: input.model || "gpt-4o-mini",
        maxTokens: options.maxTokens
      });
      
      const model = this.mapToOpenAIModel(input.model || "gpt-4o-mini");
      
      const completion = await this.executeWithRetry(async () => {
        return this.client.chat.completions.create({
          model,
          messages: [
            { role: "system", content: prompt.systemPrompt },
            { role: "user", content: prompt.userPrompt }
          ],
          max_tokens: options.maxTokens || 1500,
          temperature: 0.9, // Higher creativity for meal planning
          response_format: { type: "json_object" }
        });
      }, options.retries || 1);
      
      const content = completion.choices[0]?.message?.content;
      if (!content) {
        throw new Error('Empty response from OpenAI');
      }
      
      const parsedPlan = JSON.parse(content);
      
      const metadata: AIResponseMetadata = {
        model: input.model || "gpt-4o-mini",
        provider: "openai",
        requestId,
        traceId: options.traceId,
        processingTimeMs: Date.now() - startTime,
        inputTokens: completion.usage?.prompt_tokens,
        outputTokens: completion.usage?.completion_tokens,
        estimatedCostUsd: this.calculateCost(completion.usage?.prompt_tokens || 0, completion.usage?.completion_tokens || 0, model),
        promptVariant: prompt.variant
      };
      
      const weeklyPlan: WeeklyPlanLLM = {
        weekStartDate: new Date().toISOString(),
        totalMeals: input.totalMeals,
        plannedMeals: parsedPlan.plannedMeals || [],
        varietyScore: parsedPlan.varietyScore || 75,
        balanceScore: parsedPlan.balanceScore || 80,
        consolidatedShoppingList: parsedPlan.consolidatedShoppingList,
        metadata
      };
      
      return weeklyPlan;
      
    } catch (error) {
      console.error(`❌ OpenAI weekly plan error (${requestId}):`, error);
      
      const fallbackMetadata: AIResponseMetadata = {
        model: "gpt-4o-mini",
        provider: "openai",
        requestId,
        processingTimeMs: Date.now() - startTime,
        fallbackUsed: true,
        estimatedCostUsd: "0.000"
      };
      
      return {
        ...FALLBACK_WEEKLY_PLAN,
        totalMeals: input.totalMeals,
        metadata: { ...FALLBACK_WEEKLY_PLAN.metadata!, ...fallbackMetadata }
      } as WeeklyPlanLLM;
    }
  }
  
  // === IMAGE ANALYSIS ===
  async analyzeImageToRecipe(input: ImageAnalysisInput, options: AIRequestOptions = {}): Promise<PhotoToRecipeLLM> {
    const requestId = uuidv4();
    const startTime = Date.now();
    
    try {
      const prompt = compileImageToRecipePrompt({
        userPreferences: input.userPreferences,
        variant: input.variant || "ingredient_detection",
        model: input.model || "gpt-4o",
        maxTokens: options.maxTokens
      });
      
      const model = this.mapToOpenAIModel(input.model || "gpt-4o");
      
      const completion = await this.executeWithRetry(async () => {
        return this.client.chat.completions.create({
          model,
          messages: [
            { role: "system", content: prompt.systemPrompt },
            { 
              role: "user", 
              content: [
                { type: "text", text: prompt.userPrompt },
                { 
                  type: "image_url", 
                  image_url: { 
                    url: input.imageData.startsWith('http') ? input.imageData : `data:image/jpeg;base64,${input.imageData}`,
                    detail: "high"
                  } 
                }
              ] as any
            }
          ],
          max_tokens: options.maxTokens || 1000,
          temperature: 0.3, // Lower temperature for accurate analysis
          response_format: { type: "json_object" }
        });
      }, options.retries || 1);
      
      const content = completion.choices[0]?.message?.content;
      if (!content) {
        throw new Error('Empty response from OpenAI');
      }
      
      const parsedAnalysis = JSON.parse(content);
      
      const metadata: AIResponseMetadata = {
        model: input.model || "gpt-4o",
        provider: "openai",
        requestId,
        traceId: options.traceId,
        processingTimeMs: Date.now() - startTime,
        inputTokens: completion.usage?.prompt_tokens,
        outputTokens: completion.usage?.completion_tokens,
        estimatedCostUsd: this.calculateCost(completion.usage?.prompt_tokens || 0, completion.usage?.completion_tokens || 0, model),
        promptVariant: prompt.variant
      };
      
      const analysis: PhotoToRecipeLLM = {
        detectedIngredients: parsedAnalysis.detectedIngredients || [],
        suggestedRecipes: parsedAnalysis.suggestedRecipes || [],
        imageAnalysis: parsedAnalysis.imageAnalysis || {
          imageQuality: "good",
          confidence: 0.8
        },
        metadata
      };
      
      return analysis;
      
    } catch (error) {
      console.error(`❌ OpenAI image analysis error (${requestId}):`, error);
      
      const fallbackMetadata: AIResponseMetadata = {
        model: "gpt-4o",
        provider: "openai",
        requestId,
        processingTimeMs: Date.now() - startTime,
        fallbackUsed: true,
        estimatedCostUsd: "0.000"
      };
      
      return {
        detectedIngredients: [],
        suggestedRecipes: [],
        imageAnalysis: {
          imageQuality: "poor",
          confidence: 0
        },
        metadata: fallbackMetadata
      };
    }
  }
  
  // === HEALTH CHECK ===
  async healthCheck(): Promise<{ healthy: boolean; latencyMs?: number; error?: string }> {
    const startTime = Date.now();
    
    // Cache health check for 30 seconds
    if (Date.now() - this.healthStatus.lastCheck < 30000) {
      return { 
        healthy: this.healthStatus.healthy,
        latencyMs: this.healthStatus.healthy ? Date.now() - startTime : undefined
      };
    }
    
    try {
      const response = await this.client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: "Health check - respond with OK" }],
        max_tokens: 5,
        temperature: 0
      });
      
      const latencyMs = Date.now() - startTime;
      const healthy = response.choices[0]?.message?.content?.toLowerCase().includes('ok') || false;
      
      this.healthStatus = { healthy, lastCheck: Date.now() };
      
      return { healthy, latencyMs };
      
    } catch (error) {
      const latencyMs = Date.now() - startTime;
      this.healthStatus = { healthy: false, lastCheck: Date.now() };
      
      return { 
        healthy: false, 
        latencyMs,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  // === MODEL UTILITIES ===
  getDefaultModel(operation: string): AIModel {
    switch (operation) {
      case 'chat': return 'gpt-4o-mini';
      case 'recipe': return 'gpt-4o';
      case 'weeklyPlanner': return 'gpt-4o-mini';
      case 'imageAnalysis': return 'gpt-4o';
      default: return 'gpt-4o-mini';
    }
  }
  
  // === PRIVATE HELPER METHODS ===
  private mapToOpenAIModel(model: AIModel): string {
    const modelMap: Record<AIModel, string> = {
      "gpt-4o": "gpt-4o",
      "gpt-4o-mini": "gpt-4o-mini",
      "gpt-5": "gpt-5",
      "dall-e-3": "dall-e-3",
      "gemini-1.5-pro": "gpt-4o", // Fallback
      "gemini-1.5-flash": "gpt-4o-mini", // Fallback
      "imagen-3": "dall-e-3", // Fallback
      "claude-3-sonnet": "gpt-4o", // Fallback
      "claude-3-haiku": "gpt-4o-mini" // Fallback
    };
    
    return modelMap[model] || "gpt-4o-mini";
  }
  
  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 1
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        
        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
          console.warn(`🔄 Retry attempt ${attempt + 1}/${maxRetries + 1} after ${delay}ms:`, error);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw lastError!;
  }
  
  private calculateCost(inputTokens: number, outputTokens: number, model: string): string {
    const costs: Record<string, { input: number; output: number }> = {
      "gpt-4o": { input: 0.0025, output: 0.01 },
      "gpt-4o-mini": { input: 0.00015, output: 0.0006 },
      "gpt-5": { input: 0.01, output: 0.03 }
    };
    
    const modelCosts = costs[model] || costs["gpt-4o-mini"];
    const cost = (inputTokens / 1000 * modelCosts.input) + (outputTokens / 1000 * modelCosts.output);
    
    return cost.toFixed(6);
  }
  
  private analyzeIntent(response: string, originalMessage: string): ChatResponse['intent'] {
    const lowerResponse = response.toLowerCase();
    const lowerMessage = originalMessage.toLowerCase();
    
    // Recipe-related intents
    if (lowerMessage.includes('recipe') || lowerMessage.includes('cook') || lowerMessage.includes('make')) {
      if (lowerResponse.includes('recipe') || lowerResponse.includes('ingredients')) {
        return 'recipe_request';
      }
    }
    
    // Modification intents
    if (lowerMessage.includes('change') || lowerMessage.includes('modify') || lowerMessage.includes('substitute')) {
      return 'recipe_modification';
    }
    
    // Quick recipe intents
    if (lowerMessage.includes('quick') || lowerMessage.includes('fast') || lowerMessage.includes('simple')) {
      return 'quick_recipe';
    }
    
    // Cooking advice
    if (lowerMessage.includes('how') || lowerMessage.includes('why') || lowerMessage.includes('technique')) {
      return 'cooking_advice';
    }
    
    return 'conversational';
  }
  
  private calculateConfidence(response: string, intent: ChatResponse['intent']): number {
    // Simple confidence calculation based on response characteristics
    let confidence = 0.8; // Base confidence
    
    if (response.length > 100) confidence += 0.1; // Longer responses often more confident
    if (response.includes('recipe') && intent === 'recipe_request') confidence += 0.1;
    if (response.includes('?')) confidence -= 0.1; // Questions suggest uncertainty
    
    return Math.min(1.0, Math.max(0.0, confidence));
  }
  
  private extractRecipeFromText(text: string, title: string): any {
    // Fallback recipe extraction from non-JSON text
    return {
      title: title,
      description: "Recipe extracted from response",
      difficulty: "Medium",
      cookTime: 30,
      servings: 4,
      ingredients: ["Ingredients as described in response"],
      instructions: ["Follow method described in response"],
      tips: text.substring(0, 200) + "..."
    };
  }
}