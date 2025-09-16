import { db } from "./db";
import { aiCosts, type InsertAiCost } from "@shared/schema";
import { eq, and, sql, inArray } from "drizzle-orm";

interface TokenUsage {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
}

interface CostCalculation {
  costUsd: string;
  tokenUsage: TokenUsage;
}

export class AiCostTracker {
  /**
   * Calculate cost based on provider and model
   */
  private calculateCost(
    provider: string,
    model: string,
    inputTokens: number = 0,
    outputTokens: number = 0
  ): CostCalculation {
    let inputCostPer1k = 0;
    let outputCostPer1k = 0;

    // OpenAI pricing (per 1K tokens)
    if (provider === 'openai') {
      switch (model) {
        case 'gpt-4o':
        case 'gpt-4o-2024-11-20':
          inputCostPer1k = 0.0025;
          outputCostPer1k = 0.01;
          break;
        case 'gpt-4o-mini':
          inputCostPer1k = 0.00015;
          outputCostPer1k = 0.0006;
          break;
        case 'gpt-5':
          inputCostPer1k = 0.01;
          outputCostPer1k = 0.03;
          break;
        case 'dall-e-3':
          // DALL-E pricing is per image, not tokens
          return {
            costUsd: '0.04',
            tokenUsage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 }
          };
        default:
          inputCostPer1k = 0.0025;
          outputCostPer1k = 0.01;
      }
    }
    
    // Google Gemini pricing (per 1K tokens)
    else if (provider === 'google') {
      switch (model) {
        case 'gemini-pro':
        case 'gemini-1.5-pro':
          inputCostPer1k = 0.00125;
          outputCostPer1k = 0.005;
          break;
        case 'gemini-1.5-flash':
          inputCostPer1k = 0.000075;
          outputCostPer1k = 0.0003;
          break;
        case 'imagen-3':
          // Image generation pricing
          return {
            costUsd: '0.04',
            tokenUsage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 }
          };
        default:
          inputCostPer1k = 0.00125;
          outputCostPer1k = 0.005;
      }
    }
    
    // Replicate pricing (estimated)
    else if (provider === 'replicate') {
      return {
        costUsd: '0.01',
        tokenUsage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 }
      };
    }

    const inputCost = (inputTokens / 1000) * inputCostPer1k;
    const outputCost = (outputTokens / 1000) * outputCostPer1k;
    const totalCost = inputCost + outputCost;

    return {
      costUsd: totalCost.toFixed(6),
      tokenUsage: {
        inputTokens,
        outputTokens,
        totalTokens: inputTokens + outputTokens
      }
    };
  }

  /**
   * Track an AI interaction cost
   */
  async trackCost(params: {
    userId?: number;
    sessionId?: string;
    provider: string;
    model?: string;
    operation: string;
    inputTokens?: number;
    outputTokens?: number;
    requestData?: Record<string, any>;
    responseData?: Record<string, any>;
    fixedCostUsd?: string; // For operations with fixed costs like image generation
  }): Promise<void> {
    try {
      const now = new Date();
      const monthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      
      let costCalculation: CostCalculation;
      
      if (params.fixedCostUsd) {
        costCalculation = {
          costUsd: params.fixedCostUsd,
          tokenUsage: {
            inputTokens: params.inputTokens || 0,
            outputTokens: params.outputTokens || 0,
            totalTokens: (params.inputTokens || 0) + (params.outputTokens || 0)
          }
        };
      } else {
        costCalculation = this.calculateCost(
          params.provider,
          params.model || '',
          params.inputTokens || 0,
          params.outputTokens || 0
        );
      }

      const costData: InsertAiCost = {
        userId: params.userId || null,
        sessionId: params.sessionId || null,
        provider: params.provider,
        model: params.model || null,
        operation: params.operation,
        inputTokens: costCalculation.tokenUsage.inputTokens || null,
        outputTokens: costCalculation.tokenUsage.outputTokens || null,
        totalTokens: costCalculation.tokenUsage.totalTokens || null,
        costUsd: costCalculation.costUsd,
        requestData: params.requestData || null,
        responseData: params.responseData || null,
        monthYear
      };

      await db.insert(aiCosts).values(costData);
      
      console.log(`💰 AI Cost tracked: ${params.provider}/${params.model} - ${params.operation} - $${costCalculation.costUsd}`);
    } catch (error) {
      console.error('Error tracking AI cost:', error);
    }
  }

  /**
   * Get monthly costs for a user
   */
  async getMonthlyUserCosts(userId: number, monthYear: string): Promise<{
    totalCost: string;
    breakdown: Array<{
      provider: string;
      model: string;
      operation: string;
      cost: string;
      count: number;
    }>;
  }> {
    try {
      const costs = await db
        .select({
          provider: aiCosts.provider,
          model: aiCosts.model,
          operation: aiCosts.operation,
          costUsd: aiCosts.costUsd,
        })
        .from(aiCosts)
        .where(and(eq(aiCosts.userId, userId), eq(aiCosts.monthYear, monthYear)));

      let totalCost = 0;
      const breakdown = new Map<string, { cost: number; count: number }>();

      for (const cost of costs) {
        totalCost += parseFloat(cost.costUsd);
        
        const key = `${cost.provider}|${cost.model || 'unknown'}|${cost.operation}`;
        if (breakdown.has(key)) {
          const existing = breakdown.get(key)!;
          existing.cost += parseFloat(cost.costUsd);
          existing.count += 1;
        } else {
          breakdown.set(key, {
            cost: parseFloat(cost.costUsd),
            count: 1
          });
        }
      }

      const breakdownArray = Array.from(breakdown.entries()).map(([key, data]) => {
        const [provider, model, operation] = key.split('|');
        return {
          provider,
          model,
          operation,
          cost: data.cost.toFixed(6),
          count: data.count
        };
      }).sort((a, b) => parseFloat(b.cost) - parseFloat(a.cost));

      return {
        totalCost: totalCost.toFixed(6),
        breakdown: breakdownArray
      };
    } catch (error) {
      console.error('Error getting monthly user costs:', error);
      return { totalCost: '0.000000', breakdown: [] };
    }
  }

  /**
   * Get overall monthly costs across all users
   */
  async getMonthlyTotalCosts(monthYear: string): Promise<{
    totalCost: string;
    userBreakdown: Array<{
      userId: number;
      email: string;
      cost: string;
    }>;
    providerBreakdown: Array<{
      provider: string;
      cost: string;
      count: number;
    }>;
  }> {
    try {
      // Get total cost and provider breakdown
      const providerCosts = await db
        .select({
          provider: aiCosts.provider,
          totalCost: sql<string>`SUM(CAST(${aiCosts.costUsd} AS DECIMAL))::text`,
          count: sql<number>`COUNT(*)`,
        })
        .from(aiCosts)
        .where(eq(aiCosts.monthYear, monthYear))
        .groupBy(aiCosts.provider);

      // Get user breakdown
      const userCosts = await db
        .select({
          userId: aiCosts.userId,
          totalCost: sql<string>`SUM(CAST(${aiCosts.costUsd} AS DECIMAL))::text`,
        })
        .from(aiCosts)
        .where(and(eq(aiCosts.monthYear, monthYear), sql`${aiCosts.userId} IS NOT NULL`))
        .groupBy(aiCosts.userId);

      // Get user emails
      const userEmails = new Map<number, string>();
      if (userCosts.length > 0) {
        const { users } = await import("@shared/schema");
        const userIds = userCosts.map(u => u.userId!).filter(id => id !== null);
        if (userIds.length > 0) {
          const userDetails = await db
            .select({ id: users.id, email: users.email })
            .from(users)
            .where(inArray(users.id, userIds));
          
          for (const user of userDetails) {
            userEmails.set(user.id, user.email);
          }
        }
      }

      const totalCost = providerCosts.reduce((sum, provider) => 
        sum + parseFloat(provider.totalCost), 0
      );

      return {
        totalCost: totalCost.toFixed(6),
        userBreakdown: userCosts.map(user => ({
          userId: user.userId!,
          email: userEmails.get(user.userId!) || 'Unknown',
          cost: parseFloat(user.totalCost).toFixed(6)
        })).sort((a, b) => parseFloat(b.cost) - parseFloat(a.cost)),
        providerBreakdown: providerCosts.map(provider => ({
          provider: provider.provider,
          cost: parseFloat(provider.totalCost).toFixed(6),
          count: provider.count
        })).sort((a, b) => parseFloat(b.cost) - parseFloat(a.cost))
      };
    } catch (error) {
      console.error('Error getting monthly total costs:', error);
      return { 
        totalCost: '0.000000', 
        userBreakdown: [], 
        providerBreakdown: [] 
      };
    }
  }
}

export const aiCostTracker = new AiCostTracker();