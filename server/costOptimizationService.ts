/**
 * Progressive Cost Strategy with Quota-based Generation Tiers
 * Dynamically adjusts AI usage based on user tier and monthly quotas
 */
import { storage } from './storage';

export interface CostTier {
  name: string;
  maxRecipesPerMonth: number;
  maxImagesPerMonth: number;
  allowTemplateGeneration: boolean;
  allowFullAIGeneration: boolean;
  modelPreference: 'gpt-4o-mini' | 'gpt-4o';
  tokenBudgetMultiplier: number;
}

// Define progressive cost tiers
export const COST_TIERS: Record<string, CostTier> = {
  FREE: {
    name: 'Free',
    maxRecipesPerMonth: 2, // Severely limited for conversion
    maxImagesPerMonth: 0, // No images for free users
    allowTemplateGeneration: true,
    allowFullAIGeneration: false, // Force template usage
    modelPreference: 'gpt-4o-mini',
    tokenBudgetMultiplier: 0.5 // Reduced token budget
  },
  FLAVR_PLUS: {
    name: 'Flavr+',
    maxRecipesPerMonth: 999, // Unlimited
    maxImagesPerMonth: 999, // Unlimited
    allowTemplateGeneration: true,
    allowFullAIGeneration: true,
    modelPreference: 'gpt-4o-mini', // Cost-optimized even for premium
    tokenBudgetMultiplier: 1.0
  },
  DEVELOPER: {
    name: 'Developer',
    maxRecipesPerMonth: 9999,
    maxImagesPerMonth: 9999,
    allowTemplateGeneration: true,
    allowFullAIGeneration: true,
    modelPreference: 'gpt-4o-mini',
    tokenBudgetMultiplier: 1.5 // Extra tokens for testing
  }
};

/**
 * Determine user's cost tier based on subscription and usage
 */
export async function getUserCostTier(userId?: number, email?: string): Promise<CostTier> {
  try {
    if (!userId) {
      return COST_TIERS.FREE; // Anonymous users get free tier
    }

    const user = await storage.getUser(userId);
    if (!user) {
      return COST_TIERS.FREE;
    }

    // Developer account gets unlimited access
    if (user.email === "william@blycontracting.co.uk") {
      return COST_TIERS.DEVELOPER;
    }

    // Flavr+ subscribers get premium tier
    if (user.hasFlavrPlus) {
      return COST_TIERS.FLAVR_PLUS;
    }

    return COST_TIERS.FREE;

  } catch (error) {
    console.error('Error determining cost tier:', error);
    return COST_TIERS.FREE; // Default to free tier on error
  }
}

/**
 * Check if user can generate recipes based on their tier and current usage
 */
export async function canGenerateRecipe(userId?: number, userEmail?: string): Promise<{
  allowed: boolean;
  reason?: string;
  tier: CostTier;
  usage: { recipes: number; images: number };
}> {
  try {
    const tier = await getUserCostTier(userId, userEmail);
    
    if (!userId) {
      // Pseudo users get very limited access
      return {
        allowed: tier.maxRecipesPerMonth > 0,
        reason: tier.maxRecipesPerMonth === 0 ? 'Please sign up for recipe access' : undefined,
        tier,
        usage: { recipes: 0, images: 0 }
      };
    }

    const user = await storage.getUser(userId);
    if (!user) {
      return {
        allowed: false,
        reason: 'User not found',
        tier,
        usage: { recipes: 0, images: 0 }
      };
    }

    const currentUsage = {
      recipes: user.recipesThisMonth || 0,
      images: user.imagesThisMonth || 0
    };

    // Check recipe quota
    if (currentUsage.recipes >= tier.maxRecipesPerMonth) {
      return {
        allowed: false,
        reason: `Monthly recipe limit reached (${tier.maxRecipesPerMonth}). Upgrade to Flavr+ for unlimited recipes.`,
        tier,
        usage: currentUsage
      };
    }

    return {
      allowed: true,
      tier,
      usage: currentUsage
    };

  } catch (error) {
    console.error('Error checking recipe generation permission:', error);
    return {
      allowed: false,
      reason: 'Error checking permissions',
      tier: COST_TIERS.FREE,
      usage: { recipes: 0, images: 0 }
    };
  }
}

/**
 * Get optimal generation strategy based on user tier and request
 */
export async function getOptimalGenerationStrategy(
  userId?: number,
  requestComplexity: 'simple' | 'moderate' | 'complex' = 'moderate',
  userInput?: string
): Promise<{
  useTemplate: boolean;
  model: 'gpt-4o-mini' | 'gpt-4o';
  maxTokens: number;
  estimatedCost: number;
  strategy: string;
}> {
  try {
    const tier = await getUserCostTier(userId);
    
    // Free users: Force template usage for cost control
    if (tier.name === 'Free') {
      return {
        useTemplate: true,
        model: 'gpt-4o-mini',
        maxTokens: Math.round(1200 * tier.tokenBudgetMultiplier),
        estimatedCost: 0.001, // Template cost
        strategy: 'Template-forced for free tier cost control'
      };
    }

    // Flavr+ users: Smart cost optimization
    let baseTokens = 1500;
    switch (requestComplexity) {
      case 'simple':
        baseTokens = 1200;
        break;
      case 'complex':
        baseTokens = 2400;
        break;
    }

    const maxTokens = Math.round(baseTokens * tier.tokenBudgetMultiplier);
    const model = tier.modelPreference;
    
    // Estimate cost based on model and tokens
    const inputRate = model === 'gpt-4o-mini' ? 0.00015 : 0.0025;
    const outputRate = model === 'gpt-4o-mini' ? 0.0006 : 0.01;
    const estimatedCost = (maxTokens / 1000) * (inputRate + outputRate);

    return {
      useTemplate: false, // Flavr+ can use full AI
      model,
      maxTokens,
      estimatedCost,
      strategy: `Full AI generation optimized for ${tier.name}`
    };

  } catch (error) {
    console.error('Error determining generation strategy:', error);
    return {
      useTemplate: true,
      model: 'gpt-4o-mini',
      maxTokens: 1200,
      estimatedCost: 0.001,
      strategy: 'Fallback template strategy'
    };
  }
}

/**
 * Cost tracking and analytics
 */
export class CostTracker {
  private static monthlySpend = new Map<string, number>();
  private static tierUsage = new Map<string, { recipes: number; cost: number }>();

  static recordCost(userId: string, cost: number, tier: string, method: 'template' | 'ai') {
    // Track monthly spend per user
    const currentSpend = this.monthlySpend.get(userId) || 0;
    this.monthlySpend.set(userId, currentSpend + cost);

    // Track tier usage
    const tierKey = `${tier}_${method}`;
    const current = this.tierUsage.get(tierKey) || { recipes: 0, cost: 0 };
    this.tierUsage.set(tierKey, {
      recipes: current.recipes + 1,
      cost: current.cost + cost
    });

    console.log(`💰 Cost tracked: $${cost.toFixed(4)} for ${tier} user via ${method}`);
  }

  static getAnalytics() {
    const totalSpend = Array.from(this.monthlySpend.values()).reduce((a, b) => a + b, 0);
    const avgSpendPerUser = totalSpend / this.monthlySpend.size || 0;
    
    return {
      totalMonthlySpend: totalSpend,
      averageSpendPerUser: avgSpendPerUser,
      activeUsers: this.monthlySpend.size,
      tierBreakdown: Object.fromEntries(this.tierUsage),
      costPerRecipe: totalSpend / Array.from(this.tierUsage.values()).reduce((a, b) => a + b.recipes, 0) || 0
    };
  }

  static getTargetCostPerUser(): number {
    // Target: Keep AI costs under $1-2 per user per month
    return 1.50; // $1.50 target
  }

  static isUserOverBudget(userId: string): boolean {
    const userSpend = this.monthlySpend.get(userId) || 0;
    return userSpend > this.getTargetCostPerUser();
  }
}

/**
 * Monthly usage reset (call this on the 1st of each month)
 */
export async function resetMonthlyUsage(): Promise<void> {
  try {
    console.log('🔄 Resetting monthly usage counters...');
    await storage.resetAllUserUsage();
    CostTracker['monthlySpend'].clear(); // Reset cost tracking
    console.log('✅ Monthly usage reset completed');
  } catch (error) {
    console.error('❌ Failed to reset monthly usage:', error);
  }
}