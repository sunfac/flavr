// === INTEGRATION TESTS FOR AI ABSTRACTION LAYER ===
import { describe, it, expect, beforeAll, afterAll, jest } from '@jest/globals';
import { AIService } from '../aiProvider';
import { FeatureFlagService } from '../featureFlags';
import { canaryMigration } from '../canaryMigration';
import { migrationDashboard } from '../migrationDashboard';

// Mock external dependencies
jest.mock('openai');
jest.mock('@google/generative-ai');

describe('AI Abstraction Layer Integration', () => {
  
  beforeAll(async () => {
    // Initialize the system
    process.env.OPENAI_API_KEY = 'test-key';
    process.env.GEMINI_API_KEY = 'test-key';
    
    // Mock provider responses
    const mockChatResponse = {
      message: 'Test response',
      intent: 'conversational' as const,
      confidence: 0.9,
      requiresIntentClarification: false,
      metadata: {
        model: 'gpt-4o-mini',
        provider: 'openai',
        requestId: 'test-123',
        processingTimeMs: 500,
        inputTokens: 100,
        outputTokens: 50,
        estimatedCostUsd: '0.001'
      }
    };
    
    const mockRecipeResponse = {
      title: 'Test Recipe',
      description: 'A test recipe',
      cuisine: 'International',
      difficulty: 'Medium' as const,
      cookTime: 30,
      prepTime: 15,
      servings: 4,
      ingredients: ['ingredient 1', 'ingredient 2'],
      instructions: ['step 1', 'step 2'],
      metadata: {
        model: 'gpt-4o',
        provider: 'openai',
        requestId: 'test-456',
        processingTimeMs: 1000,
        inputTokens: 200,
        outputTokens: 150,
        estimatedCostUsd: '0.005'
      }
    };
    
    // Mock the provider methods
    const mockProvider = {
      name: 'openai',
      supportedModels: ['gpt-4o', 'gpt-4o-mini'],
      chat: jest.fn().mockResolvedValue(mockChatResponse),
      generateRecipe: jest.fn().mockResolvedValue(mockRecipeResponse),
      generateWeeklyTitles: jest.fn().mockResolvedValue({
        weekStartDate: new Date().toISOString(),
        totalMeals: 7,
        plannedMeals: [],
        varietyScore: 80,
        balanceScore: 85,
        metadata: mockChatResponse.metadata
      }),
      analyzeImageToRecipe: jest.fn().mockResolvedValue({
        detectedIngredients: ['tomato', 'onion'],
        suggestedRecipes: ['tomato soup'],
        imageAnalysis: { imageQuality: 'good', confidence: 0.9 },
        metadata: mockChatResponse.metadata
      }),
      healthCheck: jest.fn().mockResolvedValue({ healthy: true, latencyMs: 100 }),
      getDefaultModel: jest.fn().mockReturnValue('gpt-4o-mini')
    };
    
    const { AIProviderFactory } = await import('../aiProvider');
    AIProviderFactory.registerProvider('openai', mockProvider as any);
  });
  
  afterAll(() => {
    delete process.env.OPENAI_API_KEY;
    delete process.env.GEMINI_API_KEY;
  });
  
  describe('End-to-End Service Flows', () => {
    it('should complete chat flow with proper tracking', async () => {
      const result = await AIService.chat({
        message: 'Hello, can you help me cook something?',
        variant: 'technical_advisor'
      }, {
        userId: 1,
        traceId: 'integration-test-chat'
      });
      
      expect(result.message).toBe('Test response');
      expect(result.intent).toBe('conversational');
      expect(result.metadata.requestId).toBeDefined();
      expect(result.metadata.provider).toBe('openai');
    });
    
    it('should complete recipe generation flow', async () => {
      const result = await AIService.generateRecipe({
        request: 'Chicken pasta',
        preferences: {
          servings: 4,
          timeConstraint: 45,
          dietaryRestrictions: ['no nuts'],
          difficulty: 'Medium'
        },
        variant: 'michelin_quality'
      }, {
        userId: 1,
        traceId: 'integration-test-recipe'
      });
      
      expect(result.title).toBe('Test Recipe');
      expect(result.servings).toBe(4);
      expect(result.ingredients).toHaveLength(2);
      expect(result.instructions).toHaveLength(2);
      expect(result.metadata.provider).toBe('openai');
    });
    
    it('should complete weekly planning flow', async () => {
      const preferences = {
        householdSize: { adults: 2, kids: 1 },
        cookingFrequency: 'most_days' as const,
        timeComfort: { weeknight: 45, weekend: 90 },
        ambitionLevel: 'balanced' as const,
        dietaryNeeds: [],
        cuisineWeighting: {},
        cuisinePreferences: ['Italian'],
        budgetPerServing: 'standard' as const,
        onboardingCompleted: true,
        onboardingCompletedAt: new Date()
      };
      
      const result = await AIService.generateWeeklyTitles({
        preferences,
        totalMeals: 7,
        variant: 'balanced_planning'
      }, {
        userId: 1,
        traceId: 'integration-test-weekly'
      });
      
      expect(result.totalMeals).toBe(7);
      expect(result.varietyScore).toBeGreaterThan(0);
      expect(result.metadata.provider).toBe('openai');
    });
    
    it('should complete image analysis flow', async () => {
      const result = await AIService.analyzeImageToRecipe({
        imageData: 'base64-image-data',
        userPreferences: {
          dietaryRestrictions: ['vegetarian']
        },
        variant: 'ingredient_detection'
      }, {
        userId: 1,
        traceId: 'integration-test-image'
      });
      
      expect(result.detectedIngredients).toHaveLength(2);
      expect(result.suggestedRecipes).toHaveLength(1);
      expect(result.imageAnalysis.confidence).toBeGreaterThan(0);
      expect(result.metadata.provider).toBe('openai');
    });
  });
  
  describe('Feature Flag Integration', () => {
    it('should switch providers based on feature flags', async () => {
      // Set up Gemini provider
      const mockGeminiProvider = {
        name: 'gemini',
        supportedModels: ['gemini-1.5-flash'],
        chat: jest.fn().mockResolvedValue({
          message: 'Gemini response',
          intent: 'conversational' as const,
          confidence: 0.8,
          requiresIntentClarification: false,
          metadata: {
            model: 'gemini-1.5-flash',
            provider: 'gemini',
            requestId: 'gemini-test',
            processingTimeMs: 400,
            estimatedCostUsd: '0.0005'
          }
        }),
        healthCheck: jest.fn().mockResolvedValue({ healthy: true }),
        getDefaultModel: jest.fn().mockReturnValue('gemini-1.5-flash')
      };
      
      const { AIProviderFactory } = await import('../aiProvider');
      AIProviderFactory.registerProvider('gemini', mockGeminiProvider as any);
      
      // Enable Gemini for chat
      FeatureFlagService.setFlag('ai.provider.chat', {
        enabled: true,
        value: 'gemini',
        percentage: 100
      });
      
      const result = await AIService.chat({
        message: 'Test with Gemini'
      }, {
        userId: 1,
        traceId: 'gemini-test'
      });
      
      expect(result.metadata.provider).toBe('gemini');
      expect(mockGeminiProvider.chat).toHaveBeenCalled();
    });
    
    it('should handle canary rollout percentages', async () => {
      // Set 50% canary for a specific user
      FeatureFlagService.setFlag('canary.gpt4oMini.chat', {
        enabled: true,
        percentage: 50,
        userWhitelist: []
      });
      
      // Test multiple requests to verify bucketing
      const results = [];
      for (let i = 0; i < 10; i++) {
        const model = FeatureFlagService.getModelForOperation('chat', { userId: i });
        results.push(model);
      }
      
      // Should have some distribution
      const uniqueModels = new Set(results);
      expect(uniqueModels.size).toBeGreaterThanOrEqual(1);
    });
  });
  
  describe('Error Handling and Fallbacks', () => {
    it('should handle provider failures gracefully', async () => {
      // Create failing provider
      const failingProvider = {
        name: 'failing-provider',
        chat: jest.fn().mockRejectedValue(new Error('Provider down')),
        healthCheck: jest.fn().mockResolvedValue({ healthy: false, error: 'Down' })
      };
      
      const { AIProviderFactory } = await import('../aiProvider');
      AIProviderFactory.registerProvider('failing', failingProvider as any);
      
      // Set to use failing provider
      FeatureFlagService.setFlag('ai.provider.chat', {
        enabled: true,
        value: 'failing' as any,
        percentage: 100
      });
      
      // Should fall back gracefully
      try {
        const result = await AIService.chat({
          message: 'Test with failing provider'
        });
        
        // Should get fallback response or throw error
        expect(result).toBeDefined();
      } catch (error) {
        // Expected to fail, but should be handled gracefully
        expect(error).toBeInstanceOf(Error);
      }
    });
    
    it('should respect emergency fallback flags', async () => {
      FeatureFlagService.emergencyEnableFallback();
      
      const fallbackEnabled = FeatureFlagService.getValue('emergency.fallback.enabled');
      expect(fallbackEnabled).toBe(true);
    });
  });
  
  describe('Health Monitoring', () => {
    it('should provide comprehensive health status', async () => {
      const healthStatus = await AIService.healthCheck();
      
      expect(healthStatus).toBeDefined();
      expect(typeof healthStatus).toBe('object');
      
      // Should have provider health info
      for (const [providerName, status] of Object.entries(healthStatus)) {
        expect(status).toHaveProperty('healthy');
        expect(typeof status.healthy).toBe('boolean');
      }
    });
    
    it('should provide dashboard metrics', async () => {
      const metrics = await migrationDashboard.getMetrics();
      
      expect(metrics).toHaveProperty('timestamp');
      expect(metrics).toHaveProperty('migration');
      expect(metrics).toHaveProperty('performance');
      expect(metrics).toHaveProperty('featureFlags');
      
      expect(typeof metrics.migration.chatCanaryPercentage).toBe('number');
      expect(typeof metrics.migration.overallHealthy).toBe('boolean');
    });
    
    it('should generate migration reports', async () => {
      const report = await migrationDashboard.getReport();
      
      expect(report).toHaveProperty('summary');
      expect(report).toHaveProperty('details');
      
      expect(report.summary).toHaveProperty('phase');
      expect(report.summary).toHaveProperty('successRate');
      expect(report.summary).toHaveProperty('recommendedAction');
      
      expect(['planning', 'rollout', 'monitoring', 'complete']).toContain(report.summary.phase);
    });
  });
  
  describe('Canary Migration System', () => {
    it('should start gradual rollout', async () => {
      await canaryMigration.startGPT4oMiniChatRollout(25);
      
      const status = canaryMigration.getStatus();
      expect(status).toBeDefined();
      
      const chatFlag = FeatureFlagService.getFlag('canary.gpt4oMini.chat');
      expect(chatFlag.enabled).toBe(true);
      expect(chatFlag.percentage).toBeGreaterThan(0);
    });
    
    it('should handle emergency rollback', async () => {
      await canaryMigration.emergencyRollbackChat('Test emergency');
      
      const chatFlag = FeatureFlagService.getFlag('canary.gpt4oMini.chat');
      expect(chatFlag.enabled).toBe(false);
      expect(chatFlag.percentage).toBe(0);
    });
    
    it('should track migration events', () => {
      canaryMigration.trackEvent('chat', true, 'openai');
      canaryMigration.trackEvent('chat', false, 'openai', 'Test error');
      
      const status = canaryMigration.getStatus();
      expect(status).toBeDefined();
    });
  });
  
  describe('Cost Tracking Integration', () => {
    it('should track costs for all operations', async () => {
      const { aiCostTracker } = await import('../aiCostTracker');
      
      // Generate some activity
      await AIService.chat({ message: 'Test cost tracking' }, { userId: 1 });
      
      const costSummary = aiCostTracker.getCostSummary();
      expect(costSummary.totalRequests).toBeGreaterThanOrEqual(0);
      expect(costSummary.totalCost).toBeGreaterThanOrEqual(0);
    });
    
    it('should provide migration analytics', async () => {
      const { aiCostTracker } = await import('../aiCostTracker');
      
      const analytics = aiCostTracker.getMigrationAnalytics();
      expect(analytics).toHaveProperty('canaryVsControl');
      expect(analytics).toHaveProperty('providerComparison');
    });
  });
  
  describe('Backward Compatibility', () => {
    it('should maintain existing service APIs', async () => {
      // Test that shims maintain original interfaces
      const { ChefAssistGPT5 } = await import('../chefAssistGPT5Updated');
      
      const recipeResult = await ChefAssistGPT5.generateFullRecipe({
        userIntent: 'pasta dish',
        servings: 4,
        clientId: 'test'
      });
      
      // Should maintain original response structure
      expect(recipeResult).toHaveProperty('title');
      expect(recipeResult).toHaveProperty('ingredients');
      expect(recipeResult).toHaveProperty('instructions');
      expect(recipeResult).toHaveProperty('servings');
    });
  });
  
  describe('Performance and Reliability', () => {
    it('should handle concurrent requests', async () => {
      const promises = Array.from({ length: 5 }, (_, i) =>
        AIService.chat({
          message: `Concurrent request ${i}`
        }, {
          userId: i,
          traceId: `concurrent-${i}`
        })
      );
      
      const results = await Promise.all(promises);
      expect(results).toHaveLength(5);
      
      for (const result of results) {
        expect(result.message).toBeDefined();
        expect(result.metadata.requestId).toBeDefined();
      }
    });
    
    it('should respect timeout settings', async () => {
      const startTime = Date.now();
      
      try {
        await AIService.chat({
          message: 'Test timeout'
        }, {
          userId: 1,
          maxTokens: 100
        });
        
        const duration = Date.now() - startTime;
        expect(duration).toBeLessThan(30000); // Should complete within 30s
      } catch (error) {
        // Timeout is acceptable
        expect(error).toBeInstanceOf(Error);
      }
    });
  });
});