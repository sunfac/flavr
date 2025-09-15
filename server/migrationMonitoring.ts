// === GPT-4O MINI MIGRATION MONITORING AND ANALYTICS ===

import { FeatureFlagService } from "./featureFlags";
import { AIModel } from "@shared/aiSchemas";
import { z } from "zod";

type AIModelType = z.infer<typeof AIModel>;

interface MigrationMetrics {
  timestamp: number;
  userId?: number;
  operation: 'chat' | 'recipe' | 'weeklyPlanner' | 'imageAnalysis';
  
  // Model performance
  primaryModel: AIModelType;
  finalModel: AIModelType;
  fallbackUsed: boolean;
  validationPassed: boolean;
  
  // Quality metrics
  qualityScore?: number;
  structuralScore?: number;
  contentQuality?: 'excellent' | 'good' | 'acceptable' | 'poor';
  
  // Performance metrics
  processingTimeMs: number;
  tokenCount?: number;
  estimatedCostUsd?: string;
  
  // Migration context
  canaryPercentage: number;
  fallbackReason?: string;
  attemptsCount: number;
}

interface MigrationAnalytics {
  totalRequests: number;
  successRate: number;
  fallbackRate: number;
  avgQualityScore: number;
  avgProcessingTime: number;
  costSavingsUsd: number;
  costSavingsPercent: number;
  
  // Quality distribution
  qualityDistribution: {
    excellent: number;
    good: number;
    acceptable: number;
    poor: number;
  };
  
  // Performance trends
  performanceImprovement: {
    speedupPercent: number;
    tokenReduction: number;
  };
  
  // Migration health
  migrationHealth: 'healthy' | 'warning' | 'critical';
  issues: string[];
  recommendations: string[];
}

export class MigrationMonitoringService {
  private static metrics: MigrationMetrics[] = [];
  private static readonly MAX_METRICS_STORED = 10000; // Keep last 10k metrics in memory
  
  // Track a migration operation
  static trackMigrationMetric(metric: MigrationMetrics): void {
    this.metrics.push(metric);
    
    // Cleanup old metrics to prevent memory bloat
    if (this.metrics.length > this.MAX_METRICS_STORED) {
      this.metrics = this.metrics.slice(-this.MAX_METRICS_STORED);
    }
    
    // Auto-monitoring for critical issues
    this.checkMigrationHealth(metric);
  }
  
  // Get comprehensive migration analytics
  static getAnalytics(timeWindowHours: number = 24): MigrationAnalytics {
    const cutoffTime = Date.now() - (timeWindowHours * 60 * 60 * 1000);
    const recentMetrics = this.metrics.filter(m => m.timestamp >= cutoffTime);
    
    if (recentMetrics.length === 0) {
      return this.getEmptyAnalytics();
    }
    
    const miniMetrics = recentMetrics.filter(m => 
      m.primaryModel === 'gpt-4o-mini' || m.finalModel === 'gpt-4o-mini'
    );
    const standardMetrics = recentMetrics.filter(m => 
      m.primaryModel === 'gpt-4o' && m.finalModel === 'gpt-4o'
    );
    
    const totalRequests = recentMetrics.length;
    const successCount = recentMetrics.filter(m => m.validationPassed).length;
    const fallbackCount = recentMetrics.filter(m => m.fallbackUsed).length;
    
    // Quality analysis
    const qualityScores = recentMetrics
      .filter(m => m.qualityScore !== undefined)
      .map(m => m.qualityScore!);
    
    const qualityDistribution = {
      excellent: recentMetrics.filter(m => m.contentQuality === 'excellent').length,
      good: recentMetrics.filter(m => m.contentQuality === 'good').length,
      acceptable: recentMetrics.filter(m => m.contentQuality === 'acceptable').length,
      poor: recentMetrics.filter(m => m.contentQuality === 'poor').length
    };
    
    // Performance analysis
    const miniAvgTime = this.getAverageProcessingTime(miniMetrics);
    const standardAvgTime = this.getAverageProcessingTime(standardMetrics);
    const speedupPercent = standardAvgTime > 0 
      ? ((standardAvgTime - miniAvgTime) / standardAvgTime) * 100 
      : 0;
    
    // Cost analysis
    const { costSavingsUsd, costSavingsPercent } = this.calculateCostSavings(miniMetrics, standardMetrics);
    
    // Health assessment
    const { health, issues, recommendations } = this.assessMigrationHealth(recentMetrics);
    
    return {
      totalRequests,
      successRate: (successCount / totalRequests) * 100,
      fallbackRate: (fallbackCount / totalRequests) * 100,
      avgQualityScore: qualityScores.length > 0 
        ? qualityScores.reduce((a, b) => a + b, 0) / qualityScores.length 
        : 0,
      avgProcessingTime: this.getAverageProcessingTime(recentMetrics),
      costSavingsUsd,
      costSavingsPercent,
      qualityDistribution,
      performanceImprovement: {
        speedupPercent,
        tokenReduction: this.calculateTokenReduction(miniMetrics, standardMetrics)
      },
      migrationHealth: health,
      issues,
      recommendations
    };
  }
  
  // Get migration status for feature flag decisions
  static getMigrationStatus(): {
    readyForIncrease: boolean;
    shouldDecrease: boolean;
    shouldRollback: boolean;
    currentHealthScore: number;
    reasoning: string;
  } {
    const analytics = this.getAnalytics(2); // Last 2 hours
    const healthScore = this.calculateHealthScore(analytics);
    
    // Decision logic for canary percentage adjustments
    let readyForIncrease = false;
    let shouldDecrease = false;
    let shouldRollback = false;
    let reasoning = "";
    
    if (analytics.totalRequests < 10) {
      reasoning = "Insufficient data for migration decision";
    } else if (healthScore >= 85 && analytics.fallbackRate < 5) {
      readyForIncrease = true;
      reasoning = "High success rate and low fallback rate - ready to increase canary";
    } else if (healthScore < 70 || analytics.fallbackRate > 15) {
      shouldDecrease = true;
      reasoning = `Poor performance: health=${healthScore}, fallback=${analytics.fallbackRate.toFixed(1)}%`;
    } else if (healthScore < 50 || analytics.fallbackRate > 30) {
      shouldRollback = true;
      reasoning = `Critical issues detected: health=${healthScore}, fallback=${analytics.fallbackRate.toFixed(1)}%`;
    } else {
      reasoning = "Migration stable - maintaining current percentage";
    }
    
    return {
      readyForIncrease,
      shouldDecrease,
      shouldRollback,
      currentHealthScore: healthScore,
      reasoning
    };
  }
  
  // Auto-adjustment of canary percentages based on performance
  static async autoAdjustCanary(operation: 'chat' | 'recipe'): Promise<void> {
    const status = this.getMigrationStatus();
    const currentFlag = FeatureFlagService.getFlag(`canary.gpt4oMini.${operation}`);
    const currentPercentage = ('percentage' in currentFlag ? currentFlag.percentage : 0) || 0;
    
    if (status.shouldRollback) {
      console.error(`🚨 AUTO ROLLBACK: ${operation} - ${status.reasoning}`);
      FeatureFlagService.emergencyRollbackCanary(operation);
      
      // Alert production monitoring
      if (process.env.NODE_ENV === 'production') {
        console.error(`🚨 PRODUCTION ALERT: Emergency rollback triggered for ${operation}!`);
      }
      
    } else if (status.shouldDecrease && currentPercentage > 0) {
      console.warn(`📉 AUTO DECREASE: ${operation} - ${status.reasoning}`);
      FeatureFlagService.decrementCanaryPercentage(operation, 5);
      
    } else if (status.readyForIncrease && currentPercentage < 100) {
      console.log(`📈 AUTO INCREASE: ${operation} - ${status.reasoning}`);
      FeatureFlagService.incrementCanaryPercentage(operation, 5);
    }
  }
  
  // Generate migration report
  static generateReport(timeWindowHours: number = 24): string {
    const analytics = this.getAnalytics(timeWindowHours);
    const status = this.getMigrationStatus();
    
    return `
# GPT-4o Mini Migration Report (Last ${timeWindowHours}h)

## 📊 Overall Performance
- Total Requests: ${analytics.totalRequests}
- Success Rate: ${analytics.successRate.toFixed(1)}%
- Fallback Rate: ${analytics.fallbackRate.toFixed(1)}%
- Average Quality Score: ${analytics.avgQualityScore.toFixed(1)}/100
- Health Score: ${status.currentHealthScore}/100

## 💰 Cost Optimization
- Cost Savings: $${analytics.costSavingsUsd} (${analytics.costSavingsPercent.toFixed(1)}%)
- Performance Improvement: ${analytics.performanceImprovement.speedupPercent.toFixed(1)}% faster

## 📈 Quality Distribution
- Excellent: ${analytics.qualityDistribution.excellent} (${((analytics.qualityDistribution.excellent/analytics.totalRequests)*100).toFixed(1)}%)
- Good: ${analytics.qualityDistribution.good} (${((analytics.qualityDistribution.good/analytics.totalRequests)*100).toFixed(1)}%)
- Acceptable: ${analytics.qualityDistribution.acceptable} (${((analytics.qualityDistribution.acceptable/analytics.totalRequests)*100).toFixed(1)}%)
- Poor: ${analytics.qualityDistribution.poor} (${((analytics.qualityDistribution.poor/analytics.totalRequests)*100).toFixed(1)}%)

## 🚦 Migration Status
${status.reasoning}

## ⚠️ Issues
${analytics.issues.length > 0 ? analytics.issues.map(i => `- ${i}`).join('\n') : 'No issues detected'}

## 💡 Recommendations
${analytics.recommendations.length > 0 ? analytics.recommendations.map(r => `- ${r}`).join('\n') : 'No recommendations at this time'}
`;
  }
  
  // Private helper methods
  private static checkMigrationHealth(metric: MigrationMetrics): void {
    // Check for immediate issues requiring attention
    if (!metric.validationPassed && metric.primaryModel === 'gpt-4o-mini') {
      console.warn(`⚠️ Validation failed for GPT-4o mini: ${metric.fallbackReason}`);
    }
    
    if (metric.qualityScore && metric.qualityScore < 70) {
      console.warn(`⚠️ Low quality score detected: ${metric.qualityScore}/100`);
    }
    
    if (metric.processingTimeMs > 30000) {
      console.warn(`⚠️ Slow response detected: ${metric.processingTimeMs}ms`);
    }
  }
  
  private static getEmptyAnalytics(): MigrationAnalytics {
    return {
      totalRequests: 0,
      successRate: 0,
      fallbackRate: 0,
      avgQualityScore: 0,
      avgProcessingTime: 0,
      costSavingsUsd: 0,
      costSavingsPercent: 0,
      qualityDistribution: { excellent: 0, good: 0, acceptable: 0, poor: 0 },
      performanceImprovement: { speedupPercent: 0, tokenReduction: 0 },
      migrationHealth: 'healthy',
      issues: [],
      recommendations: ['Need more data to assess migration performance']
    };
  }
  
  private static getAverageProcessingTime(metrics: MigrationMetrics[]): number {
    if (metrics.length === 0) return 0;
    return metrics.reduce((sum, m) => sum + m.processingTimeMs, 0) / metrics.length;
  }
  
  private static calculateCostSavings(miniMetrics: MigrationMetrics[], standardMetrics: MigrationMetrics[]): {
    costSavingsUsd: number;
    costSavingsPercent: number;
  } {
    // Simplified cost calculation (would use actual pricing in production)
    const miniCostPerRequest = 0.002; // GPT-4o mini estimate
    const standardCostPerRequest = 0.006; // GPT-4o estimate
    
    const miniRequests = miniMetrics.length;
    const actualCost = (miniRequests * miniCostPerRequest);
    const wouldBeCost = (miniRequests * standardCostPerRequest);
    
    const savingsUsd = wouldBeCost - actualCost;
    const savingsPercent = wouldBeCost > 0 ? (savingsUsd / wouldBeCost) * 100 : 0;
    
    return { costSavingsUsd: savingsUsd, costSavingsPercent: savingsPercent };
  }
  
  private static calculateTokenReduction(miniMetrics: MigrationMetrics[], standardMetrics: MigrationMetrics[]): number {
    // Calculate average token usage reduction (simplified)
    const miniAvgTokens = miniMetrics.length > 0 
      ? miniMetrics.reduce((sum, m) => sum + (m.tokenCount || 0), 0) / miniMetrics.length
      : 0;
    const standardAvgTokens = standardMetrics.length > 0
      ? standardMetrics.reduce((sum, m) => sum + (m.tokenCount || 0), 0) / standardMetrics.length
      : 0;
      
    return standardAvgTokens > 0 
      ? ((standardAvgTokens - miniAvgTokens) / standardAvgTokens) * 100
      : 0;
  }
  
  private static assessMigrationHealth(metrics: MigrationMetrics[]): {
    health: 'healthy' | 'warning' | 'critical';
    issues: string[];
    recommendations: string[];
  } {
    const issues: string[] = [];
    const recommendations: string[] = [];
    
    const successRate = (metrics.filter(m => m.validationPassed).length / metrics.length) * 100;
    const fallbackRate = (metrics.filter(m => m.fallbackUsed).length / metrics.length) * 100;
    const avgQuality = metrics.reduce((sum, m) => sum + (m.qualityScore || 0), 0) / metrics.length;
    
    // Assess issues
    if (successRate < 90) {
      issues.push(`Low success rate: ${successRate.toFixed(1)}%`);
    }
    if (fallbackRate > 20) {
      issues.push(`High fallback rate: ${fallbackRate.toFixed(1)}%`);
    }
    if (avgQuality < 75) {
      issues.push(`Low average quality: ${avgQuality.toFixed(1)}/100`);
    }
    
    // Generate recommendations
    if (fallbackRate > 10) {
      recommendations.push('Consider lowering canary percentage or improving prompt optimization');
    }
    if (avgQuality < 80) {
      recommendations.push('Review and enhance quality validation thresholds');
    }
    if (successRate > 95 && fallbackRate < 5) {
      recommendations.push('Performance is excellent - consider increasing canary percentage');
    }
    
    // Determine overall health
    let health: 'healthy' | 'warning' | 'critical' = 'healthy';
    if (successRate < 80 || fallbackRate > 30) {
      health = 'critical';
    } else if (successRate < 90 || fallbackRate > 15) {
      health = 'warning';
    }
    
    return { health, issues, recommendations };
  }
  
  private static calculateHealthScore(analytics: MigrationAnalytics): number {
    // Weighted health score (0-100)
    const successWeight = 0.4;
    const qualityWeight = 0.3;
    const fallbackWeight = 0.3;
    
    const successScore = analytics.successRate;
    const qualityScore = analytics.avgQualityScore;
    const fallbackScore = Math.max(0, 100 - analytics.fallbackRate * 2); // Penalty for high fallback
    
    return (
      successScore * successWeight +
      qualityScore * qualityWeight +
      fallbackScore * fallbackWeight
    );
  }
}

// Export helper function to create migration metrics from tracking data
export function createMigrationMetric(data: {
  userId?: number;
  operation: 'chat' | 'recipe';
  primaryModel: AIModelType;
  finalModel: AIModelType;
  fallbackUsed: boolean;
  validationPassed: boolean;
  qualityMetrics?: any;
  processingTimeMs: number;
  tokenCount?: number;
  estimatedCostUsd?: string;
  fallbackReason?: string;
  attemptsCount: number;
}): MigrationMetrics {
  const canaryFlag = FeatureFlagService.getFlag(`canary.gpt4oMini.${data.operation}`);
  const canaryPercentage = ('percentage' in canaryFlag ? canaryFlag.percentage : 0) || 0;
  
  return {
    timestamp: Date.now(),
    userId: data.userId,
    operation: data.operation,
    primaryModel: data.primaryModel,
    finalModel: data.finalModel,
    fallbackUsed: data.fallbackUsed,
    validationPassed: data.validationPassed,
    qualityScore: data.qualityMetrics?.structuralScore,
    structuralScore: data.qualityMetrics?.structuralScore,
    contentQuality: data.qualityMetrics?.contentQuality,
    processingTimeMs: data.processingTimeMs,
    tokenCount: data.tokenCount,
    estimatedCostUsd: data.estimatedCostUsd,
    canaryPercentage,
    fallbackReason: data.fallbackReason,
    attemptsCount: data.attemptsCount
  };
}