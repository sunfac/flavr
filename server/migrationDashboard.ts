// === MIGRATION DASHBOARD & MONITORING ===
// Health metrics and monitoring dashboard for AI provider migration

import { FeatureFlagService } from './featureFlags';
import { canaryMigration } from './canaryMigration';
import { aiCostTracker } from './aiCostTracker';
import { AIService } from './aiProviderInit';

interface DashboardMetrics {
  timestamp: string;
  migration: {
    chatCanaryPercentage: number;
    recipeCanaryPercentage: number;
    isAutomatedRolloutActive: boolean;
    rollbackCount: number;
    overallHealthy: boolean;
  };
  performance: {
    providers: Record<string, {
      healthy: boolean;
      latencyMs?: number;
      errorRate: number;
      circuitBreakerOpen: boolean;
    }>;
    costs: {
      last24h: {
        total: number;
        avgPerRequest: number;
        providerBreakdown: Record<string, number>;
      };
      canaryVsControl?: {
        canaryAvgCost: number;
        controlAvgCost: number;
        costSavings: number;
      };
    };
  };
  featureFlags: Record<string, {
    enabled: boolean;
    value: any;
    percentage?: number;
  }>;
}

export class MigrationDashboard {
  
  /**
   * Get comprehensive dashboard metrics
   */
  static async getDashboardMetrics(): Promise<DashboardMetrics> {
    const timestamp = new Date().toISOString();
    
    try {
      // Get health status
      const healthStatus = await AIService.healthCheck();
      
      // Get migration status
      const migrationStatus = canaryMigration.getStatus();
      const migrationConfig = canaryMigration.getConfiguration();
      
      // Get cost analytics
      const costSummary = aiCostTracker.getCostSummary(
        new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
        { includeMigrationMetrics: true }
      );
      
      const migrationAnalytics = aiCostTracker.getMigrationAnalytics();
      
      // Get feature flags
      const allFlags = FeatureFlagService.getAllFlags();
      
      // Calculate migration percentages
      const chatCanaryFlag = FeatureFlagService.getFlag('canary.gpt4oMini.chat');
      const recipeCanaryFlag = FeatureFlagService.getFlag('canary.gpt4oMini.recipe');
      
      const metrics: DashboardMetrics = {
        timestamp,
        migration: {
          chatCanaryPercentage: chatCanaryFlag.percentage || 0,
          recipeCanaryPercentage: recipeCanaryFlag.percentage || 0,
          isAutomatedRolloutActive: migrationConfig.automatedRolloutActive,
          rollbackCount: Object.values(migrationStatus).reduce((sum: number, status: any) => 
            sum + (status.rollbackCount || 0), 0
          ),
          overallHealthy: this.calculateOverallHealth(healthStatus, migrationStatus)
        },
        performance: {
          providers: this.formatProviderHealth(healthStatus),
          costs: {
            last24h: {
              total: costSummary.totalCost,
              avgPerRequest: costSummary.avgCostPerRequest,
              providerBreakdown: this.formatProviderCosts(costSummary.providerBreakdown)
            },
            canaryVsControl: costSummary.migrationMetrics ? {
              canaryAvgCost: costSummary.migrationMetrics.canaryAvgCost,
              controlAvgCost: migrationAnalytics.canaryVsControl.control.avgCostPerRequest,
              costSavings: migrationAnalytics.canaryVsControl.control.avgCostPerRequest - 
                          costSummary.migrationMetrics.canaryAvgCost
            } : undefined
          }
        },
        featureFlags: this.formatFeatureFlags(allFlags)
      };
      
      return metrics;
      
    } catch (error) {
      console.error('Failed to get dashboard metrics:', error);
      
      // Return fallback metrics
      return {
        timestamp,
        migration: {
          chatCanaryPercentage: 0,
          recipeCanaryPercentage: 0,
          isAutomatedRolloutActive: false,
          rollbackCount: 0,
          overallHealthy: false
        },
        performance: {
          providers: {},
          costs: {
            last24h: {
              total: 0,
              avgPerRequest: 0,
              providerBreakdown: {}
            }
          }
        },
        featureFlags: {}
      };
    }
  }
  
  /**
   * Get simplified health status for quick checks
   */
  static async getHealthStatus(): Promise<{
    healthy: boolean;
    providers: Record<string, boolean>;
    canaryPercentages: {
      chat: number;
      recipe: number;
    };
    errors: string[];
  }> {
    try {
      const healthStatus = await AIService.healthCheck();
      const chatFlag = FeatureFlagService.getFlag('canary.gpt4oMini.chat');
      const recipeFlag = FeatureFlagService.getFlag('canary.gpt4oMini.recipe');
      
      const providers: Record<string, boolean> = {};
      const errors: string[] = [];
      
      for (const [name, status] of Object.entries(healthStatus)) {
        providers[name] = status.healthy;
        if (!status.healthy && status.error) {
          errors.push(`${name}: ${status.error}`);
        }
      }
      
      const allProvidersHealthy = Object.values(providers).every(h => h);
      
      return {
        healthy: allProvidersHealthy && errors.length === 0,
        providers,
        canaryPercentages: {
          chat: chatFlag.percentage || 0,
          recipe: recipeFlag.percentage || 0
        },
        errors
      };
      
    } catch (error) {
      return {
        healthy: false,
        providers: {},
        canaryPercentages: { chat: 0, recipe: 0 },
        errors: [`Dashboard error: ${error instanceof Error ? error.message : 'Unknown error'}`]
      };
    }
  }
  
  /**
   * Generate migration report for stakeholders
   */
  static async generateMigrationReport(): Promise<{
    summary: {
      phase: 'planning' | 'rollout' | 'monitoring' | 'complete';
      successRate: number;
      costImpact: number;
      recommendedAction: string;
    };
    details: {
      traffic: {
        chatCanaryPercentage: number;
        recipeCanaryPercentage: number;
        totalCanaryRequests: number;
      };
      performance: {
        errorRates: Record<string, number>;
        avgLatency: Record<string, number>;
        costComparison: {
          before: number;
          after: number;
          savings: number;
        };
      };
      risks: string[];
      recommendations: string[];
    };
  }> {
    const metrics = await this.getDashboardMetrics();
    const migrationAnalytics = aiCostTracker.getMigrationAnalytics();
    
    // Determine current phase
    const chatPercentage = metrics.migration.chatCanaryPercentage;
    const recipePercentage = metrics.migration.recipeCanaryPercentage;
    const maxPercentage = Math.max(chatPercentage, recipePercentage);
    
    let phase: 'planning' | 'rollout' | 'monitoring' | 'complete';
    if (maxPercentage === 0) phase = 'planning';
    else if (maxPercentage < 100) phase = 'rollout';
    else if (metrics.migration.rollbackCount === 0) phase = 'complete';
    else phase = 'monitoring';
    
    // Calculate success rate
    const canarySuccessRate = migrationAnalytics.canaryVsControl.canary.totalRequests > 0 
      ? (migrationAnalytics.canaryVsControl.canary.totalRequests - 
         Object.values(migrationAnalytics.canaryVsControl.canary.providerBreakdown)
           .reduce((sum, p) => sum + (p.requests || 0), 0)) / 
        migrationAnalytics.canaryVsControl.canary.totalRequests
      : 1;
    
    // Calculate cost impact
    const costImpact = migrationAnalytics.canaryVsControl.comparison.costDifference;
    
    // Generate recommendations
    const recommendations: string[] = [];
    const risks: string[] = [];
    
    if (costImpact < -0.001) { // Saving money
      recommendations.push('Cost savings detected - consider increasing rollout percentage');
    } else if (costImpact > 0.001) { // Costing more
      risks.push(`Increased cost: $${costImpact.toFixed(4)} per request`);
    }
    
    if (canarySuccessRate < 0.95) {
      risks.push(`Low success rate: ${(canarySuccessRate * 100).toFixed(1)}%`);
      recommendations.push('Investigate errors before increasing rollout');
    }
    
    if (metrics.migration.rollbackCount > 0) {
      risks.push(`${metrics.migration.rollbackCount} rollbacks occurred`);
    }
    
    if (!metrics.migration.overallHealthy) {
      risks.push('Providers showing health issues');
      recommendations.push('Address provider health before continuing rollout');
    }
    
    // Default recommendations based on phase
    if (phase === 'planning' && risks.length === 0) {
      recommendations.push('Ready to start gradual rollout');
    } else if (phase === 'rollout' && risks.length === 0 && canarySuccessRate > 0.98) {
      recommendations.push('Consider accelerating rollout pace');
    }
    
    const recommendedAction = risks.length > 0 
      ? 'Address identified risks before proceeding'
      : recommendations[0] || 'Continue monitoring';
    
    return {
      summary: {
        phase,
        successRate: canarySuccessRate,
        costImpact,
        recommendedAction
      },
      details: {
        traffic: {
          chatCanaryPercentage,
          recipeCanaryPercentage,
          totalCanaryRequests: migrationAnalytics.canaryVsControl.canary.totalRequests
        },
        performance: {
          errorRates: this.extractErrorRates(metrics.performance.providers),
          avgLatency: this.extractLatencies(metrics.performance.providers),
          costComparison: {
            before: migrationAnalytics.canaryVsControl.control.avgCostPerRequest,
            after: migrationAnalytics.canaryVsControl.canary.avgCostPerRequest,
            savings: -costImpact
          }
        },
        risks,
        recommendations
      }
    };
  }
  
  // === HELPER METHODS ===
  
  private static calculateOverallHealth(
    healthStatus: Record<string, any>,
    migrationStatus: Record<string, any>
  ): boolean {
    // Check provider health
    const providersHealthy = Object.values(healthStatus).every((status: any) => status.healthy);
    
    // Check migration health (no excessive error rates)
    const migrationHealthy = Object.values(migrationStatus).every((status: any) => 
      !status.errorRate || status.errorRate < 0.05
    );
    
    return providersHealthy && migrationHealthy;
  }
  
  private static formatProviderHealth(healthStatus: Record<string, any>): Record<string, {
    healthy: boolean;
    latencyMs?: number;
    errorRate: number;
    circuitBreakerOpen: boolean;
  }> {
    const formatted: Record<string, any> = {};
    
    for (const [name, status] of Object.entries(healthStatus)) {
      formatted[name] = {
        healthy: status.healthy,
        latencyMs: status.latencyMs,
        errorRate: status.errorRate || 0,
        circuitBreakerOpen: status.circuitBreakerOpen || false
      };
    }
    
    return formatted;
  }
  
  private static formatProviderCosts(providerBreakdown: Record<string, any>): Record<string, number> {
    const formatted: Record<string, number> = {};
    
    for (const [provider, data] of Object.entries(providerBreakdown)) {
      formatted[provider] = data.cost || 0;
    }
    
    return formatted;
  }
  
  private static formatFeatureFlags(flags: Record<string, any>): Record<string, {
    enabled: boolean;
    value: any;
    percentage?: number;
  }> {
    const formatted: Record<string, any> = {};
    
    for (const [name, flag] of Object.entries(flags)) {
      formatted[name] = {
        enabled: flag.enabled,
        value: flag.value,
        percentage: flag.percentage
      };
    }
    
    return formatted;
  }
  
  private static extractErrorRates(providers: Record<string, any>): Record<string, number> {
    const rates: Record<string, number> = {};
    
    for (const [name, data] of Object.entries(providers)) {
      rates[name] = data.errorRate || 0;
    }
    
    return rates;
  }
  
  private static extractLatencies(providers: Record<string, any>): Record<string, number> {
    const latencies: Record<string, number> = {};
    
    for (const [name, data] of Object.entries(providers)) {
      latencies[name] = data.latencyMs || 0;
    }
    
    return latencies;
  }
}

// Export convenient functions
export const migrationDashboard = {
  async getMetrics(): Promise<DashboardMetrics> {
    return MigrationDashboard.getDashboardMetrics();
  },
  
  async getHealth(): Promise<any> {
    return MigrationDashboard.getHealthStatus();
  },
  
  async getReport(): Promise<any> {
    return MigrationDashboard.generateMigrationReport();
  }
};