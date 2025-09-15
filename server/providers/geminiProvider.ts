import { GoogleGenerativeAI } from "@google/generative-ai";
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

// === GEMINI PROVIDER IMPLEMENTATION ===
export class GeminiProvider implements IAIProvider {
  public readonly name = "gemini";
  public readonly supportedModels: AIModel[] = [
    "gemini-1.5-pro", 
    "gemini-1.5-flash",
    "imagen-3"
  ];
  
  private genAI: GoogleGenerativeAI;
  private healthStatus: { healthy: boolean; lastCheck: number } = { 
    healthy: true, 
    lastCheck: 0 
  };
  
  constructor() {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY environment variable is required');
    }
    
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    console.log('🔶 Gemini Provider initialized');
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
        model: input.model || "gemini-1.5-flash",
        maxTokens: options.maxTokens
      });
      
      const model = this.getGeminiModel(input.model || "gemini-1.5-flash");
      
      // Prepare conversation history for Gemini
      const history = this.buildGeminiHistory(input.conversationHistory || []);
      
      // Create chat session
      const chat = model.startChat({
        history,
        generationConfig: {
          maxOutputTokens: options.maxTokens || 1000,
          temperature: options.temperature || 0.7,
        },
      });
      
      // Combine system and user prompts for Gemini
      const fullPrompt = `${prompt.systemPrompt}\n\nUser: ${prompt.userPrompt}`;
      
      // Execute with retries
      const result = await this.executeWithRetry(async () => {
        return chat.sendMessage(fullPrompt);
      }, options.retries || 1);
      
      const response = result.response.text();
      if (!response) {
        throw new Error('Empty response from Gemini');
      }
      
      // Analyze response for intent
      const intent = this.analyzeIntent(response, input.message);
      
      // Build metadata (Gemini doesn't provide token counts directly)
      const estimatedInputTokens = Math.ceil(fullPrompt.length * 0.25);
      const estimatedOutputTokens = Math.ceil(response.length * 0.25);
      
      const metadata: AIResponseMetadata = {
        model: input.model || "gemini-1.5-flash",
        provider: "gemini",
        requestId,
        traceId: options.traceId,
        processingTimeMs: Date.now() - startTime,
        inputTokens: estimatedInputTokens,
        outputTokens: estimatedOutputTokens,
        estimatedCostUsd: this.calculateCost(estimatedInputTokens, estimatedOutputTokens, input.model || "gemini-1.5-flash"),
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
        console.warn(`⚠️ Gemini chat response validation failed: ${validation.error}`);
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
          provider: 'google',
          model: input.model || "gemini-1.5-flash",
          operation: 'chat',
          inputTokens: estimatedInputTokens,
          outputTokens: estimatedOutputTokens,
          requestData: { message: input.message.substring(0, 100) },
          responseData: { intent, confidence: finalResponse.confidence }
        });
      } catch (costError) {
        console.warn('Failed to track AI cost:', costError);
      }
      
      return finalResponse;
      
    } catch (error) {
      console.error(`❌ Gemini chat error (${requestId}):`, error);
      
      // Return fallback response
      const fallbackMetadata: AIResponseMetadata = {
        model: "gemini-1.5-flash",
        provider: "gemini",
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
        model: input.model || "gemini-1.5-pro",
        maxTokens: options.maxTokens
      });
      
      const model = this.getGeminiModel(input.model || "gemini-1.5-pro");
      
      // For Gemini, we need to explicitly request JSON format
      const fullPrompt = `${prompt.systemPrompt}\n\n${prompt.userPrompt}\n\nIMPORTANT: Respond only with valid JSON matching the schema specified in the system prompt.`;
      
      const result = await this.executeWithRetry(async () => {
        return model.generateContent({
          contents: [{ role: "user", parts: [{ text: fullPrompt }] }],
          generationConfig: {
            maxOutputTokens: options.maxTokens || 3000,
            temperature: options.temperature || 0.8,
          }
        });
      }, options.retries || 2);
      
      const content = result.response.text();
      if (!content) {
        throw new Error('Empty response from Gemini');
      }
      
      // Parse and enhance JSON response
      let parsedRecipe;
      try {
        // Gemini sometimes wraps JSON in markdown code blocks
        const cleanedContent = content.replace(/```json\n?|\n?```/g, '').trim();
        parsedRecipe = JSON.parse(cleanedContent);
      } catch (parseError) {
        console.error('Failed to parse recipe JSON:', parseError);
        parsedRecipe = this.extractRecipeFromText(content, input.request);
      }
      
      // Build metadata
      const estimatedInputTokens = Math.ceil(fullPrompt.length * 0.25);
      const estimatedOutputTokens = Math.ceil(content.length * 0.25);
      
      const metadata: AIResponseMetadata = {
        model: input.model || "gemini-1.5-pro",
        provider: "gemini",
        requestId,
        traceId: options.traceId,
        processingTimeMs: Date.now() - startTime,
        inputTokens: estimatedInputTokens,
        outputTokens: estimatedOutputTokens,
        estimatedCostUsd: this.calculateCost(estimatedInputTokens, estimatedOutputTokens, input.model || "gemini-1.5-pro"),
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
        console.warn(`⚠️ Gemini recipe response validation failed: ${validation.error}`);
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
          provider: 'google',
          model: input.model || "gemini-1.5-pro",
          operation: 'generateRecipe',
          inputTokens: estimatedInputTokens,
          outputTokens: estimatedOutputTokens,
          requestData: { request: input.request.substring(0, 100), mode: input.mode },
          responseData: { title: finalResponse.title, cuisine: finalResponse.cuisine }
        });
      } catch (costError) {
        console.warn('Failed to track AI cost:', costError);
      }
      
      return finalResponse;
      
    } catch (error) {
      console.error(`❌ Gemini recipe error (${requestId}):`, error);
      
      const fallbackMetadata: AIResponseMetadata = {
        model: "gemini-1.5-pro",
        provider: "gemini",
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
        model: input.model || "gemini-1.5-flash",
        maxTokens: options.maxTokens
      });
      
      const model = this.getGeminiModel(input.model || "gemini-1.5-flash");
      
      const fullPrompt = `${prompt.systemPrompt}\n\n${prompt.userPrompt}\n\nRespond only with valid JSON.`;
      
      const result = await this.executeWithRetry(async () => {
        return model.generateContent({
          contents: [{ role: "user", parts: [{ text: fullPrompt }] }],
          generationConfig: {
            maxOutputTokens: options.maxTokens || 1500,
            temperature: 0.9,
          }
        });
      }, options.retries || 1);
      
      const content = result.response.text();
      if (!content) {
        throw new Error('Empty response from Gemini');
      }
      
      const cleanedContent = content.replace(/```json\n?|\n?```/g, '').trim();
      const parsedPlan = JSON.parse(cleanedContent);
      
      const estimatedInputTokens = Math.ceil(fullPrompt.length * 0.25);
      const estimatedOutputTokens = Math.ceil(content.length * 0.25);
      
      const metadata: AIResponseMetadata = {
        model: input.model || "gemini-1.5-flash",
        provider: "gemini",
        requestId,
        traceId: options.traceId,
        processingTimeMs: Date.now() - startTime,
        inputTokens: estimatedInputTokens,
        outputTokens: estimatedOutputTokens,
        estimatedCostUsd: this.calculateCost(estimatedInputTokens, estimatedOutputTokens, input.model || "gemini-1.5-flash"),
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
      console.error(`❌ Gemini weekly plan error (${requestId}):`, error);
      
      const fallbackMetadata: AIResponseMetadata = {
        model: "gemini-1.5-flash",
        provider: "gemini",
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
        model: input.model || "gemini-1.5-pro",
        maxTokens: options.maxTokens
      });
      
      const model = this.getGeminiModel(input.model || "gemini-1.5-pro");
      
      // Prepare image data for Gemini
      let imageData: string;
      let mimeType = "image/jpeg";
      
      if (input.imageData.startsWith('http')) {
        throw new Error('Gemini provider requires base64 image data, not URLs');
      } else if (input.imageData.startsWith('data:')) {
        // Extract base64 from data URL
        const [mimeInfo, base64Data] = input.imageData.split(',');
        mimeType = mimeInfo.split(':')[1].split(';')[0];
        imageData = base64Data;
      } else {
        imageData = input.imageData;
      }
      
      const fullPrompt = `${prompt.systemPrompt}\n\n${prompt.userPrompt}\n\nRespond only with valid JSON.`;
      
      const result = await this.executeWithRetry(async () => {
        return model.generateContent({
          contents: [{
            role: "user",
            parts: [
              { text: fullPrompt },
              {
                inlineData: {
                  data: imageData,
                  mimeType
                }
              }
            ]
          }],
          generationConfig: {
            maxOutputTokens: options.maxTokens || 1000,
            temperature: 0.3,
          }
        });
      }, options.retries || 1);
      
      const content = result.response.text();
      if (!content) {
        throw new Error('Empty response from Gemini');
      }
      
      const cleanedContent = content.replace(/```json\n?|\n?```/g, '').trim();
      const parsedAnalysis = JSON.parse(cleanedContent);
      
      const estimatedInputTokens = Math.ceil(fullPrompt.length * 0.25) + 1000; // Add tokens for image
      const estimatedOutputTokens = Math.ceil(content.length * 0.25);
      
      const metadata: AIResponseMetadata = {
        model: input.model || "gemini-1.5-pro",
        provider: "gemini",
        requestId,
        traceId: options.traceId,
        processingTimeMs: Date.now() - startTime,
        inputTokens: estimatedInputTokens,
        outputTokens: estimatedOutputTokens,
        estimatedCostUsd: this.calculateCost(estimatedInputTokens, estimatedOutputTokens, input.model || "gemini-1.5-pro"),
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
      console.error(`❌ Gemini image analysis error (${requestId}):`, error);
      
      const fallbackMetadata: AIResponseMetadata = {
        model: "gemini-1.5-pro",
        provider: "gemini",
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
      const model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      
      const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: "Health check - respond with OK" }] }],
        generationConfig: {
          maxOutputTokens: 5,
          temperature: 0
        }
      });
      
      const response = result.response.text();
      const latencyMs = Date.now() - startTime;
      const healthy = response.toLowerCase().includes('ok');
      
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
      case 'chat': return 'gemini-1.5-flash';
      case 'recipe': return 'gemini-1.5-pro';
      case 'weeklyPlanner': return 'gemini-1.5-flash';
      case 'imageAnalysis': return 'gemini-1.5-pro';
      default: return 'gemini-1.5-flash';
    }
  }
  
  // === PRIVATE HELPER METHODS ===
  private getGeminiModel(model: AIModel) {
    const modelMap: Record<AIModel, string> = {
      "gemini-1.5-pro": "gemini-1.5-pro",
      "gemini-1.5-flash": "gemini-1.5-flash",
      "imagen-3": "gemini-1.5-pro", // No direct Imagen access in Gemini API
      "gpt-4o": "gemini-1.5-pro", // Fallback
      "gpt-4o-mini": "gemini-1.5-flash", // Fallback
      "gpt-5": "gemini-1.5-pro", // Fallback
      "dall-e-3": "gemini-1.5-pro", // Fallback
      "claude-3-sonnet": "gemini-1.5-pro", // Fallback
      "claude-3-haiku": "gemini-1.5-flash" // Fallback
    };
    
    const modelName = modelMap[model] || "gemini-1.5-flash";
    return this.genAI.getGenerativeModel({ model: modelName });
  }
  
  private buildGeminiHistory(conversationHistory: any[]): any[] {
    // Convert ChatMessage format to Gemini format
    return conversationHistory.slice(-5).map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }));
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
  
  private calculateCost(inputTokens: number, outputTokens: number, model: AIModel): string {
    const costs: Record<string, { input: number; output: number }> = {
      "gemini-1.5-pro": { input: 0.00125, output: 0.005 },
      "gemini-1.5-flash": { input: 0.000075, output: 0.0003 }
    };
    
    const modelKey = model.includes('pro') ? 'gemini-1.5-pro' : 'gemini-1.5-flash';
    const modelCosts = costs[modelKey] || costs["gemini-1.5-flash"];
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
      description: "Recipe extracted from Gemini response",
      difficulty: "Medium",
      cookTime: 30,
      servings: 4,
      ingredients: ["Ingredients as described in response"],
      instructions: ["Follow method described in response"],
      tips: text.substring(0, 200) + "..."
    };
  }
}