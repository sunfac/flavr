// === FEATURE FLAG SYSTEM FOR AI PROVIDER SWITCHING ===

export interface FeatureFlag {
  enabled: boolean;
  percentage?: number; // 0-100, for gradual rollout
  userWhitelist?: number[]; // specific user IDs always enabled
  userBlacklist?: number[]; // specific user IDs never enabled
  conditions?: {
    minVersion?: string;
    userTier?: string[];
    timeWindow?: {
      start: Date;
      end: Date;
    };
  };
}

export interface AIProviderFlags {
  // Global provider configuration
  'ai.provider.default': {
    enabled: boolean;
    value: 'openai' | 'gemini';
  };
  
  // Operation-specific provider overrides
  'ai.provider.chat': {
    enabled: boolean;
    value: 'openai' | 'gemini';
    percentage?: number;
  };
  
  'ai.provider.recipe': {
    enabled: boolean;
    value: 'openai' | 'gemini';
    percentage?: number;
  };
  
  'ai.provider.weeklyPlanner': {
    enabled: boolean;
    value: 'openai' | 'gemini';
    percentage?: number;
  };
  
  'ai.provider.imageAnalysis': {
    enabled: boolean;
    value: 'openai' | 'gemini';
    percentage?: number;
  };
  
  // Model-specific flags
  'ai.model.chat.default': {
    enabled: boolean;
    value: 'gpt-4o' | 'gpt-4o-mini' | 'gpt-5' | 'gemini-1.5-pro' | 'gemini-1.5-flash';
  };
  
  'ai.model.recipe.default': {
    enabled: boolean;
    value: 'gpt-4o' | 'gpt-4o-mini' | 'gpt-5' | 'gemini-1.5-pro';
  };
  
  // Optimization flags
  'ai.optimization.tokenReduction': {
    enabled: boolean;
    percentage?: number;
  };
  
  'ai.optimization.caching': {
    enabled: boolean;
    percentage?: number;
  };
  
  // Canary deployment flags
  'canary.gpt4oMini.chat': {
    enabled: boolean;
    percentage?: number;
    userWhitelist?: number[];
  };
  
  'canary.gpt4oMini.recipe': {
    enabled: boolean;
    percentage?: number;
    userWhitelist?: number[];
  };
  
  // Emergency fallback flags
  'emergency.fallback.enabled': {
    enabled: boolean;
    value: boolean;
  };
  
  'emergency.provider.disable': {
    enabled: boolean;
    value: 'openai' | 'gemini' | null;
  };
}

// Default flag configuration
const DEFAULT_FLAGS: AIProviderFlags = {
  'ai.provider.default': {
    enabled: true,
    value: 'openai'
  },
  'ai.provider.chat': {
    enabled: false,
    value: 'openai',
    percentage: 0
  },
  'ai.provider.recipe': {
    enabled: false,
    value: 'openai',
    percentage: 0
  },
  'ai.provider.weeklyPlanner': {
    enabled: false,
    value: 'openai',
    percentage: 0
  },
  'ai.provider.imageAnalysis': {
    enabled: false,
    value: 'openai',
    percentage: 0
  },
  'ai.model.chat.default': {
    enabled: true,
    value: 'gpt-4o-mini'
  },
  'ai.model.recipe.default': {
    enabled: true,
    value: 'gpt-4o'
  },
  'ai.optimization.tokenReduction': {
    enabled: true,
    percentage: 100
  },
  'ai.optimization.caching': {
    enabled: true,
    percentage: 50
  },
  'canary.gpt4oMini.chat': {
    enabled: false,
    percentage: 0,
    userWhitelist: []
  },
  'canary.gpt4oMini.recipe': {
    enabled: false,
    percentage: 0,
    userWhitelist: []
  },
  'emergency.fallback.enabled': {
    enabled: true,
    value: true
  },
  'emergency.provider.disable': {
    enabled: false,
    value: null
  }
};

// Runtime flag storage (in production, this would be from database/Redis)
let RUNTIME_FLAGS: Partial<AIProviderFlags> = {};

// Environment-based flag overrides
function loadEnvironmentFlags(): Partial<AIProviderFlags> {
  const envFlags: Partial<AIProviderFlags> = {};
  
  // Load from environment variables
  if (process.env.AI_PROVIDER_DEFAULT) {
    envFlags['ai.provider.default'] = {
      enabled: true,
      value: process.env.AI_PROVIDER_DEFAULT as 'openai' | 'gemini'
    };
  }
  
  if (process.env.AI_MODEL_CHAT_DEFAULT) {
    envFlags['ai.model.chat.default'] = {
      enabled: true,
      value: process.env.AI_MODEL_CHAT_DEFAULT as any
    };
  }
  
  if (process.env.AI_MODEL_RECIPE_DEFAULT) {
    envFlags['ai.model.recipe.default'] = {
      enabled: true,
      value: process.env.AI_MODEL_RECIPE_DEFAULT as any
    };
  }
  
  // Canary flags
  if (process.env.CANARY_GPT4O_MINI_CHAT_PERCENT) {
    const percentage = parseInt(process.env.CANARY_GPT4O_MINI_CHAT_PERCENT);
    envFlags['canary.gpt4oMini.chat'] = {
      enabled: percentage > 0,
      percentage: percentage,
      userWhitelist: []
    };
  }
  
  if (process.env.CANARY_GPT4O_MINI_RECIPE_PERCENT) {
    const percentage = parseInt(process.env.CANARY_GPT4O_MINI_RECIPE_PERCENT);
    envFlags['canary.gpt4oMini.recipe'] = {
      enabled: percentage > 0,
      percentage: percentage,
      userWhitelist: []
    };
  }
  
  // Emergency flags
  if (process.env.EMERGENCY_FALLBACK_ENABLED) {
    envFlags['emergency.fallback.enabled'] = {
      enabled: true,
      value: process.env.EMERGENCY_FALLBACK_ENABLED === 'true'
    };
  }
  
  if (process.env.EMERGENCY_PROVIDER_DISABLE) {
    envFlags['emergency.provider.disable'] = {
      enabled: true,
      value: process.env.EMERGENCY_PROVIDER_DISABLE as 'openai' | 'gemini' | null
    };
  }
  
  return envFlags;
}

export class FeatureFlagService {
  private static flags: AIProviderFlags;
  private static initialized = false;
  
  static initialize(): void {
    if (this.initialized) return;
    
    // Merge default flags with environment overrides and runtime flags
    const envFlags = loadEnvironmentFlags();
    this.flags = { 
      ...DEFAULT_FLAGS, 
      ...envFlags, 
      ...RUNTIME_FLAGS 
    } as AIProviderFlags;
    
    this.initialized = true;
    console.log('🎌 Feature flags initialized:', {
      defaultProvider: this.flags['ai.provider.default'].value,
      chatModel: this.flags['ai.model.chat.default'].value,
      recipeModel: this.flags['ai.model.recipe.default'].value,
      canaryChat: this.flags['canary.gpt4oMini.chat'].percentage,
      canaryRecipe: this.flags['canary.gpt4oMini.recipe'].percentage
    });
  }
  
  static getFlag<K extends keyof AIProviderFlags>(flagName: K): AIProviderFlags[K] {
    this.initialize();
    return this.flags[flagName];
  }
  
  static setFlag<K extends keyof AIProviderFlags>(
    flagName: K, 
    value: AIProviderFlags[K]
  ): void {
    this.initialize();
    this.flags[flagName] = value;
    RUNTIME_FLAGS[flagName] = value;
    
    console.log(`🎌 Flag updated: ${flagName}`, value);
  }
  
  static isEnabled(
    flagName: keyof AIProviderFlags,
    context?: {
      userId?: number;
      userTier?: string;
      version?: string;
    }
  ): boolean {
    const flag = this.getFlag(flagName);
    
    if (!flag.enabled) return false;
    
    // Check user whitelist
    if ('userWhitelist' in flag && flag.userWhitelist && context?.userId) {
      if (flag.userWhitelist.includes(context.userId)) {
        return true;
      }
    }
    
    // Check user blacklist
    if ('userBlacklist' in flag && flag.userBlacklist && context?.userId) {
      if (flag.userBlacklist.includes(context.userId)) {
        return false;
      }
    }
    
    // Check percentage rollout
    if ('percentage' in flag && flag.percentage !== undefined) {
      const hash = this.hashUserId(context?.userId || 0, flagName);
      const bucket = hash % 100;
      return bucket < flag.percentage;
    }
    
    // Check conditions
    if ('conditions' in flag && flag.conditions) {
      // Time window check
      if (flag.conditions.timeWindow) {
        const now = new Date();
        if (now < flag.conditions.timeWindow.start || now > flag.conditions.timeWindow.end) {
          return false;
        }
      }
      
      // User tier check
      if (flag.conditions.userTier && context?.userTier) {
        if (!flag.conditions.userTier.includes(context.userTier)) {
          return false;
        }
      }
    }
    
    return true;
  }
  
  static getValue<K extends keyof AIProviderFlags>(
    flagName: K,
    context?: {
      userId?: number;
      userTier?: string;
      version?: string;
    }
  ): AIProviderFlags[K]['value'] | null {
    if (!this.isEnabled(flagName, context)) {
      return null;
    }
    
    const flag = this.getFlag(flagName);
    return 'value' in flag ? flag.value : null;
  }
  
  // Determine AI provider for a specific operation
  static getProviderForOperation(
    operation: 'chat' | 'recipe' | 'weeklyPlanner' | 'imageAnalysis',
    context?: { userId?: number; userTier?: string }
  ): 'openai' | 'gemini' {
    // Check for emergency provider disable
    const emergencyDisable = this.getValue('emergency.provider.disable', context);
    if (emergencyDisable) {
      const fallbackProvider = emergencyDisable === 'openai' ? 'gemini' : 'openai';
      console.warn(`🚨 Emergency: ${emergencyDisable} disabled, using ${fallbackProvider}`);
      return fallbackProvider;
    }
    
    // Check operation-specific override
    const operationFlag = `ai.provider.${operation}` as keyof AIProviderFlags;
    const operationProvider = this.getValue(operationFlag, context);
    if (operationProvider) {
      return operationProvider;
    }
    
    // Fall back to default provider
    const defaultProvider = this.getValue('ai.provider.default', context);
    return defaultProvider || 'openai';
  }
  
  // Determine model for a specific operation
  static getModelForOperation(
    operation: 'chat' | 'recipe',
    context?: { userId?: number; userTier?: string }
  ): string {
    // Check canary flags first
    if (operation === 'chat') {
      const canaryEnabled = this.isEnabled('canary.gpt4oMini.chat', context);
      if (canaryEnabled) {
        console.log('🐤 Using canary GPT-4o mini for chat');
        return 'gpt-4o-mini';
      }
    }
    
    if (operation === 'recipe') {
      const canaryEnabled = this.isEnabled('canary.gpt4oMini.recipe', context);
      if (canaryEnabled) {
        console.log('🐤 Using canary GPT-4o mini for recipe');
        return 'gpt-4o-mini';
      }
    }
    
    // Fall back to default model
    const modelFlag = `ai.model.${operation}.default` as keyof AIProviderFlags;
    const model = this.getValue(modelFlag, context);
    
    return model || (operation === 'chat' ? 'gpt-4o-mini' : 'gpt-4o');
  }
  
  // Check if optimization should be applied
  static shouldOptimize(
    optimization: 'tokenReduction' | 'caching',
    context?: { userId?: number }
  ): boolean {
    const flagName = `ai.optimization.${optimization}` as keyof AIProviderFlags;
    return this.isEnabled(flagName, context);
  }
  
  // Emergency functions for instant rollback
  static emergencyDisableProvider(provider: 'openai' | 'gemini'): void {
    console.error(`🚨 EMERGENCY: Disabling ${provider} provider`);
    this.setFlag('emergency.provider.disable', {
      enabled: true,
      value: provider
    });
  }
  
  static emergencyEnableFallback(): void {
    console.error('🚨 EMERGENCY: Enabling fallback mode');
    this.setFlag('emergency.fallback.enabled', {
      enabled: true,
      value: true
    });
  }
  
  static emergencyRollbackCanary(operation: 'chat' | 'recipe'): void {
    const flagName = `canary.gpt4oMini.${operation}` as keyof AIProviderFlags;
    console.error(`🚨 EMERGENCY: Rolling back canary for ${operation}`);
    this.setFlag(flagName, {
      enabled: false,
      percentage: 0,
      userWhitelist: []
    } as any);
  }
  
  // Gradual rollout functions
  static incrementCanaryPercentage(
    operation: 'chat' | 'recipe',
    increment: number = 5
  ): void {
    const flagName = `canary.gpt4oMini.${operation}` as keyof AIProviderFlags;
    const currentFlag = this.getFlag(flagName);
    const currentPercentage = ('percentage' in currentFlag ? currentFlag.percentage : 0) || 0;
    const newPercentage = Math.min(100, currentPercentage + increment);
    
    this.setFlag(flagName, {
      ...currentFlag,
      enabled: newPercentage > 0,
      percentage: newPercentage
    } as any);
    
    console.log(`📈 Canary ${operation} increased to ${newPercentage}%`);
  }
  
  static decrementCanaryPercentage(
    operation: 'chat' | 'recipe',
    decrement: number = 5
  ): void {
    const flagName = `canary.gpt4oMini.${operation}` as keyof AIProviderFlags;
    const currentFlag = this.getFlag(flagName);
    const currentPercentage = ('percentage' in currentFlag ? currentFlag.percentage : 0) || 0;
    const newPercentage = Math.max(0, currentPercentage - decrement);
    
    this.setFlag(flagName, {
      ...currentFlag,
      enabled: newPercentage > 0,
      percentage: newPercentage
    } as any);
    
    console.log(`📉 Canary ${operation} decreased to ${newPercentage}%`);
  }
  
  // Hash function for consistent user bucketing
  private static hashUserId(userId: number, flagName: string): number {
    const str = `${userId}:${flagName}`;
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }
  
  // Debug and monitoring functions
  static getAllFlags(): AIProviderFlags {
    this.initialize();
    return { ...this.flags };
  }
  
  static getFlagStatus(context?: { userId?: number; userTier?: string }): Record<string, any> {
    this.initialize();
    const status: Record<string, any> = {};
    
    for (const [flagName, flag] of Object.entries(this.flags)) {
      status[flagName] = {
        enabled: this.isEnabled(flagName as keyof AIProviderFlags, context),
        value: this.getValue(flagName as keyof AIProviderFlags, context),
        config: flag
      };
    }
    
    return status;
  }
}

// Initialize flags on module load
FeatureFlagService.initialize();