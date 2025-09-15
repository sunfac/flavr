// === AI PROVIDER SYSTEM INITIALIZATION ===
// This file initializes the AI provider system and registers all providers

import { AIProviderFactory, AIService } from "./aiProvider";
import { OpenAIProvider } from "./providers/openaiProvider";
import { GeminiProvider } from "./providers/geminiProvider";
import { FeatureFlagService } from "./featureFlags";

let initialized = false;

export function initializeAIProviders(): void {
  if (initialized) return;
  
  try {
    console.log('🔌 Initializing AI Provider System...');
    
    // Initialize feature flags
    FeatureFlagService.initialize();
    
    // Register providers
    if (process.env.OPENAI_API_KEY) {
      const openaiProvider = new OpenAIProvider();
      AIProviderFactory.registerProvider('openai', openaiProvider);
      console.log('✅ OpenAI Provider registered');
    } else {
      console.warn('⚠️ OPENAI_API_KEY not found, OpenAI provider not registered');
    }
    
    if (process.env.GEMINI_API_KEY) {
      const geminiProvider = new GeminiProvider();
      AIProviderFactory.registerProvider('gemini', geminiProvider);
      console.log('✅ Gemini Provider registered');
    } else {
      console.warn('⚠️ GEMINI_API_KEY not found, Gemini provider not registered');
    }
    
    initialized = true;
    console.log('🚀 AI Provider System initialized successfully');
    
    // Log current configuration
    const flags = FeatureFlagService.getAllFlags();
    console.log('🎌 Feature Flags Configuration:', {
      defaultProvider: flags['ai.provider.default'].value,
      chatModel: flags['ai.model.chat.default'].value,
      recipeModel: flags['ai.model.recipe.default'].value,
      optimizationEnabled: flags['ai.optimization.tokenReduction'].enabled
    });
    
  } catch (error) {
    console.error('❌ Failed to initialize AI Provider System:', error);
    throw error;
  }
}

// Health check function for monitoring
export async function healthCheckAIProviders(): Promise<Record<string, any>> {
  if (!initialized) {
    initializeAIProviders();
  }
  
  return AIService.healthCheck();
}

// Export the service for direct use
export { AIService, FeatureFlagService };

// Auto-initialize when this module is imported
initializeAIProviders();