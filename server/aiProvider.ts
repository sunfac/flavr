import type { 
  AIModel, 
  AIRequestOptions, 
  ChatResponse, 
  RecipeLLM, 
  WeeklyPlanLLM, 
  PhotoToRecipeLLM,
  WeeklyPlanPreferences,
  ChatMessage,
  AIError,
  FallbackResponse,
  AIResponseMetadata
} from "@shared/aiSchemas";
import { validateRecipeResponse } from "@shared/aiSchemas";
import { FeatureFlagService } from "./featureFlags";
import { MigrationMonitoringService, createMigrationMetric } from "./migrationMonitoring";
import { 
  compileChatPrompt, 
  compileRecipePrompt, 
  compileWeeklyPlannerPrompt, 
  compileImageToRecipePrompt 
} from "./promptTemplates";
import { aiCostTracker } from "./aiCostTracker";
import { v4 as uuidv4 } from "uuid";

// === AI PROVIDER INTERFACE ===
export interface IAIProvider {
  name: string;
  supportedModels: AIModel[];
  
  // Core operations
  chat(input: ChatInput, options?: AIRequestOptions): Promise<ChatResponse>;
  generateRecipe(input: RecipeInput, options?: AIRequestOptions): Promise<RecipeLLM>;
  generateWeeklyTitles(input: WeeklyPlanInput, options?: AIRequestOptions): Promise<WeeklyPlanLLM>;
  analyzeImageToRecipe(input: ImageAnalysisInput, options?: AIRequestOptions): Promise<PhotoToRecipeLLM>;
  
  // Health and status
  healthCheck(): Promise<{ healthy: boolean; latencyMs?: number; error?: string }>;
  getDefaultModel(operation: string): AIModel;
}

// === INPUT TYPES ===
export interface ChatInput {
  message: string;
  conversationHistory?: ChatMessage[];
  currentRecipe?: any;
  context?: {
    mode?: string;
    userPreferences?: Record<string, any>;
    chatContext?: string;
  };
  model?: AIModel;
  variant?: string;
}

export interface RecipeInput {
  request: string;
  preferences?: {
    difficulty?: string;
    cuisine?: string;
    servings?: number;
    timeConstraint?: number;
    dietaryRestrictions?: string[];
    mood?: string;
    equipment?: string[];
  };
  quizData?: Record<string, any>;
  mode?: string;
  model?: AIModel;
  variant?: string;
}

export interface WeeklyPlanInput {
  preferences: WeeklyPlanPreferences;
  totalMeals: number;
  avoidSimilarTo?: string;
  model?: AIModel;
  variant?: string;
}

export interface ImageAnalysisInput {
  imageData: string; // base64 or URL
  userPreferences?: Record<string, any>;
  context?: {
    mode?: string;
    dietaryRestrictions?: string[];
  };
  model?: AIModel;
  variant?: string;
}

// === PROVIDER FACTORY ===
export class AIProviderFactory {
  private static providers: Map<string, IAIProvider> = new Map();
  private static circuitBreakers: Map<string, CircuitBreaker> = new Map();
  
  // Register a provider
  static registerProvider(name: string, provider: IAIProvider): void {
    this.providers.set(name, provider);
    this.circuitBreakers.set(name, new CircuitBreaker(name));
    console.log(`🔌 AI Provider registered: ${name}`);
  }
  
  // Get provider based on feature flags
  static getProvider(
    operation: 'chat' | 'recipe' | 'weeklyPlanner' | 'imageAnalysis',
    context?: { userId?: number; userTier?: string }
  ): IAIProvider {
    const providerName = FeatureFlagService.getProviderForOperation(operation, context);
    const provider = this.providers.get(providerName);
    
    if (!provider) {
      console.error(`❌ Provider not found: ${providerName}, attempting explicit fallback`);
      
      // Use explicit fallback chain instead of "first available"
      return this.getFallbackProvider(providerName);
    }
    
    // Check circuit breaker
    const circuitBreaker = this.circuitBreakers.get(providerName);
    if (circuitBreaker?.isOpen()) {
      console.warn(`⚡ Circuit breaker open for ${providerName}, trying fallback`);
      return this.getFallbackProvider(providerName);
    }
    
    return provider;
  }
  
  private static getFallbackProvider(excludeProvider: string): IAIProvider {
    // Define explicit fallback priority: OpenAI → Gemini → Others
    const FALLBACK_PRIORITY = ['openai', 'gemini'];
    
    // First attempt: Try providers in priority order
    for (const providerName of FALLBACK_PRIORITY) {
      if (providerName !== excludeProvider) {
        const provider = this.providers.get(providerName);
        const circuitBreaker = this.circuitBreakers.get(providerName);
        
        if (provider && !circuitBreaker?.isOpen()) {
          console.warn(`🔄 FALLBACK: Using ${providerName} provider due to ${excludeProvider} failure`);
          
          // Alert for production monitoring - this should be rare
          if (process.env.NODE_ENV === 'production') {
            console.error(`🚨 PRODUCTION ALERT: AI Provider fallback activated! ${excludeProvider} → ${providerName}`);
          }
          
          return provider;
        }
      }
    }
    
    // Second attempt: Try any other available provider
    for (const [name, provider] of this.providers.entries()) {
      if (name !== excludeProvider && !FALLBACK_PRIORITY.includes(name)) {
        const circuitBreaker = this.circuitBreakers.get(name);
        if (!circuitBreaker?.isOpen()) {
          console.error(`🆘 EMERGENCY FALLBACK: Using legacy provider ${name}`);
          return provider;
        }
      }
    }
    
    // Final fallback: Force use best available provider even if circuit breaker is open
    for (const providerName of FALLBACK_PRIORITY) {
      const provider = this.providers.get(providerName);
      if (provider && providerName !== excludeProvider) {
        console.error(`🚨 CRITICAL: All circuit breakers open, forcing ${providerName} (may fail)`);
        return provider;
      }
    }
    
    throw new Error('No AI providers available - complete system failure');
  }
  
  // Health check all providers
  static async healthCheckAll(): Promise<Record<string, any>> {
    const results: Record<string, any> = {};
    
    for (const [name, provider] of this.providers.entries()) {
      try {
        const health = await provider.healthCheck();
        const circuitBreaker = this.circuitBreakers.get(name);
        
        results[name] = {
          ...health,
          circuitBreakerOpen: circuitBreaker?.isOpen() || false,
          failureCount: circuitBreaker?.getFailureCount() || 0
        };
      } catch (error) {
        results[name] = {
          healthy: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }
    
    return results;
  }
}

// === CIRCUIT BREAKER IMPLEMENTATION ===
class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';
  
  constructor(
    private name: string,
    private failureThreshold = 5,
    private resetTimeoutMs = 60000 // 1 minute
  ) {}
  
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.isOpen()) {
      throw new Error(`Circuit breaker is open for ${this.name}`);
    }
    
    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
  
  isOpen(): boolean {
    if (this.state === 'open') {
      // Check if we should transition to half-open
      if (Date.now() - this.lastFailureTime > this.resetTimeoutMs) {
        this.state = 'half-open';
        console.log(`🔄 Circuit breaker half-open for ${this.name}`);
      }
    }
    return this.state === 'open';
  }
  
  private onSuccess(): void {
    this.failures = 0;
    if (this.state === 'half-open') {
      this.state = 'closed';
      console.log(`✅ Circuit breaker closed for ${this.name}`);
    }
  }
  
  private onFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();
    
    if (this.failures >= this.failureThreshold) {
      this.state = 'open';
      console.error(`🚨 Circuit breaker opened for ${this.name} (${this.failures} failures)`);
    }
  }
  
  getFailureCount(): number {
    return this.failures;
  }
}

// === UNIFIED AI SERVICE ===
export class AIService {
  // Chat operations
  static async chat(
    input: ChatInput,
    options: AIRequestOptions = {}
  ): Promise<ChatResponse> {
    const traceId = options.traceId || uuidv4();
    const startTime = Date.now();
    
    try {
      // Get provider based on feature flags
      const provider = AIProviderFactory.getProvider('chat', {
        userId: options.userId,
        userTier: options.userTier
      });
      
      // Determine model
      const model = input.model || FeatureFlagService.getModelForOperation('chat', {
        userId: options.userId,
        userTier: options.userTier
      }) as AIModel;
      
      // Compile prompt with optimizations
      const shouldOptimize = FeatureFlagService.shouldOptimize('tokenReduction', {
        userId: options.userId
      });
      
      const compiledPrompt = compileChatPrompt(input.message, {
        conversationHistory: input.conversationHistory,
        userPreferences: input.context?.userPreferences,
        variant: input.variant,
        model: shouldOptimize ? model : undefined,
        maxTokens: options.maxTokens
      });
      
      console.log(`🤖 AI Chat: ${provider.name}/${model} | Tokens: ${compiledPrompt.estimatedTokens} | Trace: ${traceId}`);
      
      // Execute with circuit breaker
      const circuitBreaker = AIProviderFactory['circuitBreakers'].get(provider.name);
      const response = await circuitBreaker?.execute(async () => {
        return provider.chat({
          ...input,
          model
        }, {
          ...options,
          traceId
        });
      }) || await provider.chat({ ...input, model }, { ...options, traceId });
      
      // Track cost and performance
      await this.trackOperation('chat', {
        provider: provider.name,
        model,
        traceId,
        startTime,
        response,
        userId: options.userId,
        estimatedTokens: compiledPrompt.estimatedTokens,
        optimizations: compiledPrompt.optimizations
      });
      
      return response;
      
    } catch (error) {
      console.error(`❌ AI Chat error (${traceId}):`, error);
      
      // Return fallback response
      if (FeatureFlagService.getValue('emergency.fallback.enabled')) {
        return this.createFallbackChatResponse(traceId, Date.now() - startTime, error);
      }
      
      throw error;
    }
  }
  
  // Recipe generation with validation-based fallback
  static async generateRecipe(
    input: RecipeInput,
    options: AIRequestOptions = {}
  ): Promise<RecipeLLM> {
    const traceId = options.traceId || uuidv4();
    const startTime = Date.now();
    let attemptsLog: Array<{ model: AIModel; success: boolean; reason?: string; qualityScore?: number }> = [];
    
    try {
      const provider = AIProviderFactory.getProvider('recipe', {
        userId: options.userId,
        userTier: options.userTier
      });
      
      const primaryModel = input.model || FeatureFlagService.getModelForOperation('recipe', {
        userId: options.userId,
        userTier: options.userTier
      }) as AIModel;
      
      const shouldOptimize = FeatureFlagService.shouldOptimize('tokenReduction', {
        userId: options.userId
      });
      
      const compiledPrompt = compileRecipePrompt(input.request, {
        difficulty: input.preferences?.difficulty,
        cuisine: input.preferences?.cuisine,
        servings: input.preferences?.servings,
        timeConstraint: input.preferences?.timeConstraint,
        dietaryRestrictions: input.preferences?.dietaryRestrictions,
        userPreferences: input.preferences,
        variant: input.variant,
        model: shouldOptimize ? primaryModel : undefined,
        maxTokens: options.maxTokens
      });
      
      console.log(`👨‍🍳 AI Recipe: ${provider.name}/${primaryModel} | Tokens: ${compiledPrompt.estimatedTokens} | Trace: ${traceId}`);
      
      // === PRIMARY MODEL ATTEMPT ===
      try {
        const circuitBreaker = AIProviderFactory['circuitBreakers'].get(provider.name);
        const primaryResponse = await circuitBreaker?.execute(async () => {
          return provider.generateRecipe({
            ...input,
            model: primaryModel
          }, {
            ...options,
            traceId
          });
        }) || await provider.generateRecipe({ ...input, model: primaryModel }, { ...options, traceId });
        
        // Validate response quality
        const validation = validateRecipeResponse(
          primaryResponse, 
          primaryModel,
          primaryModel === "gpt-4o-mini" // Only fallback if using mini
        );
        
        attemptsLog.push({
          model: primaryModel,
          success: validation.success,
          reason: validation.fallbackReason,
          qualityScore: validation.qualityMetrics?.structuralScore
        });
        
        if (validation.success) {
          console.log(`✅ Recipe validation passed: ${primaryModel} (Score: ${validation.qualityMetrics?.structuralScore}/100)`);
          
          await this.trackOperation('recipe', {
            provider: provider.name,
            model: primaryModel,
            traceId,
            startTime,
            response: validation.data,
            userId: options.userId,
            estimatedTokens: compiledPrompt.estimatedTokens,
            optimizations: compiledPrompt.optimizations,
            metadata: {
              attemptsLog,
              validationPassed: true,
              fallbackUsed: false
            }
          });
          
          return validation.data;
        }
        
        // === VALIDATION FAILED - TRY FALLBACK ===
        if (validation.shouldFallback && primaryModel === "gpt-4o-mini") {
          console.warn(`⚠️ Recipe validation failed for ${primaryModel}, falling back to GPT-4o: ${validation.fallbackReason}`);
          
          try {
            const fallbackResponse = await circuitBreaker?.execute(async () => {
              return provider.generateRecipe({
                ...input,
                model: "gpt-4o"
              }, {
                ...options,
                traceId: `${traceId}_fallback`
              });
            }) || await provider.generateRecipe({ ...input, model: "gpt-4o" }, { ...options, traceId: `${traceId}_fallback` });
            
            const fallbackValidation = validateRecipeResponse(fallbackResponse, "gpt-4o", false);
            
            attemptsLog.push({
              model: "gpt-4o",
              success: fallbackValidation.success,
              reason: fallbackValidation.fallbackReason,
              qualityScore: fallbackValidation.qualityMetrics?.structuralScore
            });
            
            if (fallbackValidation.success) {
              console.log(`✅ Fallback recipe validation passed: GPT-4o (Score: ${fallbackValidation.qualityMetrics?.structuralScore}/100)`);
              
              await this.trackOperation('recipe', {
                provider: provider.name,
                model: "gpt-4o",
                traceId,
                startTime,
                response: fallbackValidation.data,
                userId: options.userId,
                estimatedTokens: compiledPrompt.estimatedTokens,
                optimizations: compiledPrompt.optimizations,
                metadata: {
                  attemptsLog,
                  validationPassed: true,
                  fallbackUsed: true,
                  originalModel: primaryModel,
                  fallbackReason: validation.fallbackReason
                }
              });
              
              // Mark response with fallback metadata
              return {
                ...fallbackValidation.data,
                metadata: {
                  ...fallbackValidation.data.metadata,
                  fallbackUsed: true,
                  originalModel: primaryModel,
                  fallbackReason: validation.fallbackReason
                }
              };
            }
            
            console.error(`❌ Fallback validation also failed for GPT-4o: ${fallbackValidation.error}`);
          } catch (fallbackError) {
            console.error(`❌ Fallback generation failed:`, fallbackError);
            attemptsLog.push({
              model: "gpt-4o",
              success: false,
              reason: `Generation error: ${fallbackError instanceof Error ? fallbackError.message : 'Unknown'}`
            });
          }
        }
        
        // If we get here, use the primary response even if validation failed
        console.warn(`⚠️ Using primary response despite validation failure: ${validation.error}`);
        
        await this.trackOperation('recipe', {
          provider: provider.name,
          model: primaryModel,
          traceId,
          startTime,
          response: validation.data || primaryResponse,
          userId: options.userId,
          estimatedTokens: compiledPrompt.estimatedTokens,
          optimizations: compiledPrompt.optimizations,
          metadata: {
            attemptsLog,
            validationPassed: false,
            fallbackUsed: false,
            validationError: validation.error
          }
        });
        
        return validation.data || primaryResponse;
        
      } catch (primaryError) {
        console.error(`❌ Primary model (${primaryModel}) generation failed:`, primaryError);
        attemptsLog.push({
          model: primaryModel,
          success: false,
          reason: `Generation error: ${primaryError instanceof Error ? primaryError.message : 'Unknown'}`
        });
        
        // Emergency fallback to emergency response
        if (FeatureFlagService.getValue('emergency.fallback.enabled')) {
          console.warn(`🆘 Using emergency fallback response`);
          return this.createFallbackRecipeResponse(input.request, traceId, Date.now() - startTime, primaryError);
        }
        
        throw primaryError;
      }
      
    } catch (error) {
      console.error(`❌ AI Recipe generation failed completely (${traceId}):`, error);
      
      if (FeatureFlagService.getValue('emergency.fallback.enabled')) {
        return this.createFallbackRecipeResponse(input.request, traceId, Date.now() - startTime, error);
      }
      
      throw error;
    }
  }
  
  // Weekly planning
  static async generateWeeklyTitles(
    input: WeeklyPlanInput,
    options: AIRequestOptions = {}
  ): Promise<WeeklyPlanLLM> {
    const traceId = options.traceId || uuidv4();
    const startTime = Date.now();
    
    try {
      const provider = AIProviderFactory.getProvider('weeklyPlanner', {
        userId: options.userId,
        userTier: options.userTier
      });
      
      const model = input.model || 'gpt-4o-mini' as AIModel;
      
      console.log(`📅 AI Weekly Plan: ${provider.name}/${model} | Trace: ${traceId}`);
      
      const circuitBreaker = AIProviderFactory['circuitBreakers'].get(provider.name);
      const response = await circuitBreaker?.execute(async () => {
        return provider.generateWeeklyTitles({
          ...input,
          model
        }, {
          ...options,
          traceId
        });
      }) || await provider.generateWeeklyTitles({ ...input, model }, { ...options, traceId });
      
      await this.trackOperation('weeklyPlanner', {
        provider: provider.name,
        model,
        traceId,
        startTime,
        response,
        userId: options.userId
      });
      
      return response;
      
    } catch (error) {
      console.error(`❌ AI Weekly Plan error (${traceId}):`, error);
      throw error;
    }
  }
  
  // Image analysis
  static async analyzeImageToRecipe(
    input: ImageAnalysisInput,
    options: AIRequestOptions = {}
  ): Promise<PhotoToRecipeLLM> {
    const traceId = options.traceId || uuidv4();
    const startTime = Date.now();
    
    try {
      const provider = AIProviderFactory.getProvider('imageAnalysis', {
        userId: options.userId,
        userTier: options.userTier
      });
      
      const model = input.model || 'gpt-4o' as AIModel;
      
      console.log(`📷 AI Image Analysis: ${provider.name}/${model} | Trace: ${traceId}`);
      
      const circuitBreaker = AIProviderFactory['circuitBreakers'].get(provider.name);
      const response = await circuitBreaker?.execute(async () => {
        return provider.analyzeImageToRecipe({
          ...input,
          model
        }, {
          ...options,
          traceId
        });
      }) || await provider.analyzeImageToRecipe({ ...input, model }, { ...options, traceId });
      
      await this.trackOperation('imageAnalysis', {
        provider: provider.name,
        model,
        traceId,
        startTime,
        response,
        userId: options.userId
      });
      
      return response;
      
    } catch (error) {
      console.error(`❌ AI Image Analysis error (${traceId}):`, error);
      throw error;
    }
  }
  
  // Health check
  static async healthCheck(): Promise<Record<string, any>> {
    return AIProviderFactory.healthCheckAll();
  }
  
  // Private helper methods
  private static async trackOperation(
    operation: string,
    details: {
      provider: string;
      model: AIModel;
      traceId: string;
      startTime: number;
      response: any;
      userId?: number;
      estimatedTokens?: number;
      optimizations?: string[];
      metadata?: {
        attemptsLog?: Array<{ model: AIModel; success: boolean; reason?: string; qualityScore?: number }>;
        validationPassed?: boolean;
        fallbackUsed?: boolean;
        originalModel?: AIModel;
        fallbackReason?: string;
        validationError?: string;
      };
    }
  ): Promise<void> {
    const duration = Date.now() - details.startTime;
    
    try {
      // Enhanced tracking for GPT-4o mini migration
      const migrationMetadata = {
        ...details.metadata,
        migrationActive: details.model === "gpt-4o-mini" || details.metadata?.originalModel === "gpt-4o-mini",
        costOptimizationUsed: details.model === "gpt-4o-mini",
        qualityScore: details.metadata?.attemptsLog?.find(a => a.model === details.model)?.qualityScore,
        totalAttempts: details.metadata?.attemptsLog?.length || 1
      };

      await aiCostTracker.trackCost({
        userId: details.userId,
        sessionId: details.traceId,
        provider: details.provider,
        model: details.model,
        operation: operation,
        inputTokens: details.response.metadata?.inputTokens,
        outputTokens: details.response.metadata?.outputTokens,
        requestData: {
          estimatedTokens: details.estimatedTokens,
          optimizations: details.optimizations,
          traceId: details.traceId,
          migrationMetadata
        },
        responseData: {
          processingTimeMs: duration,
          fallbackUsed: details.response.metadata?.fallbackUsed || details.metadata?.fallbackUsed || false,
          validationPassed: details.metadata?.validationPassed,
          qualityScore: migrationMetadata.qualityScore
        }
      });

      // Log migration-specific metrics for monitoring
      if (migrationMetadata.migrationActive) {
        console.log(`📊 MIGRATION METRICS [${details.traceId}]:`, {
          operation,
          primaryModel: details.metadata?.originalModel || details.model,
          finalModel: details.model,
          fallbackUsed: details.metadata?.fallbackUsed || false,
          validationPassed: details.metadata?.validationPassed,
          qualityScore: migrationMetadata.qualityScore,
          duration: `${duration}ms`,
          attempts: details.metadata?.attemptsLog?.map(a => 
            `${a.model}:${a.success ? '✅' : '❌'}${a.qualityScore ? `(${a.qualityScore})` : ''}`
          )?.join(' -> ') || `${details.model}:✅`
        });

        // Track migration metrics for analytics
        if (operation === 'recipe' || operation === 'chat') {
          const migrationMetric = createMigrationMetric({
            userId: details.userId,
            operation: operation as 'chat' | 'recipe',
            primaryModel: details.metadata?.originalModel || details.model,
            finalModel: details.model,
            fallbackUsed: details.metadata?.fallbackUsed || false,
            validationPassed: details.metadata?.validationPassed || true,
            qualityMetrics: details.metadata?.attemptsLog?.find(a => a.model === details.model),
            processingTimeMs: duration,
            tokenCount: (details.response.metadata?.inputTokens || 0) + (details.response.metadata?.outputTokens || 0),
            estimatedCostUsd: details.response.metadata?.estimatedCostUsd,
            fallbackReason: details.metadata?.fallbackReason,
            attemptsCount: migrationMetadata.totalAttempts
          });
          
          MigrationMonitoringService.trackMigrationMetric(migrationMetric);
        }
      }
      
    } catch (error) {
      console.error('Error tracking AI operation cost:', error);
    }
  }
  
  private static createFallbackChatResponse(
    traceId: string,
    processingTimeMs: number,
    error: any
  ): ChatResponse {
    return {
      message: "I'm having trouble processing your request right now. Please try again in a moment.",
      intent: "error",
      confidence: 0,
      requiresIntentClarification: false,
      metadata: {
        model: "gpt-4o-mini",
        provider: "openai",
        requestId: traceId,
        processingTimeMs,
        fallbackUsed: true,
        estimatedCostUsd: "0.000"
      }
    };
  }
  
  private static createFallbackRecipeResponse(
    originalRequest: string,
    traceId: string,
    processingTimeMs: number,
    error: any
  ): RecipeLLM {
    return {
      title: originalRequest || "Simple Recipe",
      description: "A basic recipe when specific generation fails",
      difficulty: "Easy",
      cookTime: 30,
      servings: 4,
      ingredients: ["Main ingredient as requested", "Supporting ingredients", "Seasonings and spices"],
      instructions: ["Prepare your ingredients", "Cook using standard method", "Season and serve"],
      metadata: {
        model: "gpt-4o-mini",
        provider: "openai",
        requestId: traceId,
        processingTimeMs,
        fallbackUsed: true,
        estimatedCostUsd: "0.000"
      }
    };
  }
}

// Export the main interface (classes already exported above)
export { IAIProvider };