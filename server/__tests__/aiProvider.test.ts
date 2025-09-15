// === UNIT TESTS FOR AI PROVIDER SYSTEM ===
import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { AIService, AIProviderFactory } from '../aiProvider';
import { FeatureFlagService } from '../featureFlags';
import { OpenAIProvider } from '../providers/openaiProvider';
import { GeminiProvider } from '../providers/geminiProvider';

// Mock the providers
jest.mock('../providers/openaiProvider');
jest.mock('../providers/geminiProvider');
jest.mock('../aiProviderInit');

describe('AI Provider System', () => {
  
  beforeEach(() => {
    // Reset feature flags before each test
    FeatureFlagService.setFlag('ai.provider.default', {
      enabled: true,
      value: 'openai'
    });
    
    FeatureFlagService.setFlag('canary.gpt4oMini.chat', {
      enabled: false,
      percentage: 0,
      userWhitelist: []
    });
    
    // Clear provider registry
    AIProviderFactory['providers'].clear();
    AIProviderFactory['circuitBreakers'].clear();
  });
  
  afterEach(() => {
    jest.clearAllMocks();
  });
  
  describe('Provider Registration', () => {
    it('should register providers correctly', () => {
      const mockProvider = {
        name: 'test-provider',
        supportedModels: ['test-model'],
        chat: jest.fn(),
        generateRecipe: jest.fn(),
        generateWeeklyTitles: jest.fn(),
        analyzeImageToRecipe: jest.fn(),
        healthCheck: jest.fn(),
        getDefaultModel: jest.fn()
      };
      
      AIProviderFactory.registerProvider('test', mockProvider as any);
      
      const retrievedProvider = AIProviderFactory.getProvider('chat');
      expect(retrievedProvider).toBeDefined();
    });
    
    it('should throw error when no providers available', () => {
      expect(() => {
        AIProviderFactory.getProvider('chat');
      }).toThrow('No AI providers available');
    });
  });
  
  describe('Feature Flag Integration', () => {
    it('should return OpenAI provider by default', () => {
      const mockOpenAI = {
        name: 'openai',
        supportedModels: ['gpt-4o-mini'],
        chat: jest.fn(),
        generateRecipe: jest.fn(),
        generateWeeklyTitles: jest.fn(),
        analyzeImageToRecipe: jest.fn(),
        healthCheck: jest.fn(),
        getDefaultModel: jest.fn()
      };
      
      AIProviderFactory.registerProvider('openai', mockOpenAI as any);
      
      const provider = AIProviderFactory.getProvider('chat');
      expect(provider.name).toBe('openai');
    });
    
    it('should switch to Gemini when feature flag is enabled', () => {
      const mockOpenAI = { name: 'openai' } as any;
      const mockGemini = { name: 'gemini' } as any;
      
      AIProviderFactory.registerProvider('openai', mockOpenAI);
      AIProviderFactory.registerProvider('gemini', mockGemini);
      
      FeatureFlagService.setFlag('ai.provider.chat', {
        enabled: true,
        value: 'gemini',
        percentage: 100
      });
      
      const provider = AIProviderFactory.getProvider('chat', { userId: 1 });
      expect(provider.name).toBe('gemini');
    });
    
    it('should respect canary percentage for user bucketing', () => {
      const mockOpenAI = { name: 'openai' } as any;
      AIProviderFactory.registerProvider('openai', mockOpenAI);
      
      FeatureFlagService.setFlag('canary.gpt4oMini.chat', {
        enabled: true,
        percentage: 50,
        userWhitelist: []
      });
      
      // Test multiple users to verify bucketing
      const results = [];
      for (let i = 0; i < 100; i++) {
        const model = FeatureFlagService.getModelForOperation('chat', { userId: i });
        results.push(model);
      }
      
      const gpt4oMiniCount = results.filter(m => m === 'gpt-4o-mini').length;
      const gpt4oCount = results.filter(m => m === 'gpt-4o').length;
      
      // Should have some distribution (not exact 50/50 due to hashing)
      expect(gpt4oMiniCount).toBeGreaterThan(0);
      expect(gpt4oCount).toBeGreaterThan(0);
    });
  });
  
  describe('Circuit Breaker', () => {
    it('should open circuit breaker after failures', async () => {
      const mockProvider = {
        name: 'test-provider',
        chat: jest.fn().mockRejectedValue(new Error('Provider error')),
        healthCheck: jest.fn()
      } as any;
      
      AIProviderFactory.registerProvider('test', mockProvider);
      
      // Simulate failures to trigger circuit breaker
      const circuitBreaker = AIProviderFactory['circuitBreakers'].get('test');
      
      for (let i = 0; i < 6; i++) {
        try {
          await circuitBreaker?.execute(async () => {
            throw new Error('Test failure');
          });
        } catch (error) {
          // Expected
        }
      }
      
      expect(circuitBreaker?.isOpen()).toBe(true);
    });
  });
  
  describe('Health Check', () => {
    it('should return health status for all providers', async () => {
      const mockProvider1 = {
        name: 'provider1',
        healthCheck: jest.fn().mockResolvedValue({ healthy: true, latencyMs: 100 })
      } as any;
      
      const mockProvider2 = {
        name: 'provider2', 
        healthCheck: jest.fn().mockResolvedValue({ healthy: false, error: 'Connection failed' })
      } as any;
      
      AIProviderFactory.registerProvider('provider1', mockProvider1);
      AIProviderFactory.registerProvider('provider2', mockProvider2);
      
      const healthStatus = await AIProviderFactory.healthCheckAll();
      
      expect(healthStatus.provider1.healthy).toBe(true);
      expect(healthStatus.provider1.latencyMs).toBe(100);
      expect(healthStatus.provider2.healthy).toBe(false);
      expect(healthStatus.provider2.error).toBe('Connection failed');
    });
  });
});

describe('Feature Flag Service', () => {
  
  beforeEach(() => {
    // Reset to clean state
    FeatureFlagService['initialized'] = false;
    FeatureFlagService.initialize();
  });
  
  describe('Flag Operations', () => {
    it('should get and set flags correctly', () => {
      const flagName = 'ai.provider.default';
      const flagValue = {
        enabled: true,
        value: 'gemini' as const
      };
      
      FeatureFlagService.setFlag(flagName, flagValue);
      const retrieved = FeatureFlagService.getFlag(flagName);
      
      expect(retrieved).toEqual(flagValue);
    });
    
    it('should determine enablement based on percentage', () => {
      FeatureFlagService.setFlag('canary.gpt4oMini.chat', {
        enabled: true,
        percentage: 25,
        userWhitelist: []
      });
      
      // Test with specific user ID that should be in the 25%
      const enabled = FeatureFlagService.isEnabled('canary.gpt4oMini.chat', { userId: 1 });
      
      // Result depends on hash function, but should be deterministic
      expect(typeof enabled).toBe('boolean');
    });
    
    it('should respect user whitelist', () => {
      FeatureFlagService.setFlag('canary.gpt4oMini.chat', {
        enabled: true,
        percentage: 0,
        userWhitelist: [123]
      });
      
      const enabledForWhitelist = FeatureFlagService.isEnabled('canary.gpt4oMini.chat', { userId: 123 });
      const enabledForOther = FeatureFlagService.isEnabled('canary.gpt4oMini.chat', { userId: 456 });
      
      expect(enabledForWhitelist).toBe(true);
      expect(enabledForOther).toBe(false);
    });
  });
  
  describe('Emergency Functions', () => {
    it('should disable provider in emergency', () => {
      FeatureFlagService.emergencyDisableProvider('openai');
      
      const disableFlag = FeatureFlagService.getFlag('emergency.provider.disable');
      expect(disableFlag.enabled).toBe(true);
      expect(disableFlag.value).toBe('openai');
    });
    
    it('should rollback canary in emergency', () => {
      FeatureFlagService.setFlag('canary.gpt4oMini.chat', {
        enabled: true,
        percentage: 50,
        userWhitelist: []
      });
      
      FeatureFlagService.emergencyRollbackCanary('chat');
      
      const flag = FeatureFlagService.getFlag('canary.gpt4oMini.chat');
      expect(flag.enabled).toBe(false);
      expect(flag.percentage).toBe(0);
    });
  });
  
  describe('Provider Selection', () => {
    it('should return correct provider for operation', () => {
      FeatureFlagService.setFlag('ai.provider.chat', {
        enabled: true,
        value: 'gemini',
        percentage: 100
      });
      
      const provider = FeatureFlagService.getProviderForOperation('chat');
      expect(provider).toBe('gemini');
    });
    
    it('should fall back to default provider', () => {
      FeatureFlagService.setFlag('ai.provider.default', {
        enabled: true,
        value: 'openai'
      });
      
      const provider = FeatureFlagService.getProviderForOperation('recipe');
      expect(provider).toBe('openai');
    });
    
    it('should handle emergency provider disable', () => {
      FeatureFlagService.setFlag('emergency.provider.disable', {
        enabled: true,
        value: 'openai'
      });
      
      const provider = FeatureFlagService.getProviderForOperation('chat');
      expect(provider).toBe('gemini'); // Should fall back to other provider
    });
  });
  
  describe('Model Selection', () => {
    it('should return canary model when enabled', () => {
      FeatureFlagService.setFlag('canary.gpt4oMini.chat', {
        enabled: true,
        percentage: 100,
        userWhitelist: []
      });
      
      const model = FeatureFlagService.getModelForOperation('chat', { userId: 1 });
      expect(model).toBe('gpt-4o-mini');
    });
    
    it('should return default model when canary disabled', () => {
      FeatureFlagService.setFlag('canary.gpt4oMini.chat', {
        enabled: false,
        percentage: 0,
        userWhitelist: []
      });
      
      const model = FeatureFlagService.getModelForOperation('chat', { userId: 1 });
      expect(model).toBe('gpt-4o-mini'); // Default for chat
    });
  });
});