// === CANARY MIGRATION SYSTEM ===
// Safe, gradual rollout system with instant rollback for AI provider migration

import { FeatureFlagService } from './featureFlags';
import { AIService } from './aiProviderInit';

// Migration tracking
interface MigrationMetrics {
  startTime: Date;
  currentPercentage: number;
  targetPercentage: number;
  errorRate: number;
  successCount: number;
  errorCount: number;
  lastErrorTime?: Date;
  lastSuccessTime?: Date;
  rollbackCount: number;
}

class CanaryMigrationManager {
  private static migrationHistory: Map<string, MigrationMetrics> = new Map();
  private static rolloutTimer: NodeJS.Timeout | null = null;
  private static healthCheckTimer: NodeJS.Timeout | null = null;
  
  // === GRADUAL ROLLOUT SYSTEM ===
  
  /**
   * Start a gradual rollout for a specific operation
   */
  static async startGradualRollout(
    operation: 'chat' | 'recipe',
    config: {
      targetProvider: 'openai' | 'gemini';
      targetModel?: string;
      initialPercentage?: number;
      incrementStep?: number;
      incrementIntervalMinutes?: number;
      maxPercentage?: number;
      maxErrorRate?: number;
    }
  ): Promise<void> {
    const {
      targetProvider,
      targetModel,
      initialPercentage = 5,
      incrementStep = 5,
      incrementIntervalMinutes = 15,
      maxPercentage = 100,
      maxErrorRate = 0.05 // 5% error rate threshold
    } = config;
    
    console.log(`🐤 Starting gradual rollout for ${operation}: ${targetProvider}${targetModel ? '/' + targetModel : ''}`);
    
    // Initialize migration tracking
    const migrationKey = `${operation}-${targetProvider}`;
    this.migrationHistory.set(migrationKey, {
      startTime: new Date(),
      currentPercentage: 0,
      targetPercentage: maxPercentage,
      errorRate: 0,
      successCount: 0,
      errorCount: 0,
      rollbackCount: 0
    });
    
    // Set initial percentage
    const flagName = `canary.gpt4oMini.${operation}` as const;
    FeatureFlagService.setFlag(flagName, {
      enabled: true,
      percentage: initialPercentage,
      userWhitelist: []
    });
    
    // Also set provider override if specified
    if (targetProvider !== 'openai') {
      const providerFlag = `ai.provider.${operation}` as const;
      FeatureFlagService.setFlag(providerFlag, {
        enabled: true,
        value: targetProvider,
        percentage: initialPercentage
      });
    }
    
    // Set model override if specified
    if (targetModel) {
      const modelFlag = `ai.model.${operation}.default` as const;
      FeatureFlagService.setFlag(modelFlag, {
        enabled: true,
        value: targetModel as any
      });
    }
    
    console.log(`🎯 Initial rollout: ${initialPercentage}% traffic to ${targetProvider}`);
    
    // Start automated rollout process
    this.startAutomatedRollout(migrationKey, operation, {
      incrementStep,
      incrementIntervalMinutes,
      maxPercentage,
      maxErrorRate
    });
    
    // Start health monitoring
    this.startHealthMonitoring(migrationKey, operation, maxErrorRate);
  }
  
  /**
   * Automated rollout process
   */
  private static startAutomatedRollout(
    migrationKey: string,
    operation: 'chat' | 'recipe',
    config: {
      incrementStep: number;
      incrementIntervalMinutes: number;
      maxPercentage: number;
      maxErrorRate: number;
    }
  ): void {
    if (this.rolloutTimer) {
      clearInterval(this.rolloutTimer);
    }
    
    this.rolloutTimer = setInterval(async () => {
      const metrics = this.migrationHistory.get(migrationKey);
      if (!metrics) {
        console.error(`❌ Migration metrics not found for ${migrationKey}`);
        return;
      }
      
      try {
        // Check if we should continue rollout
        if (metrics.currentPercentage >= config.maxPercentage) {
          console.log(`✅ Rollout complete for ${migrationKey}: ${metrics.currentPercentage}%`);
          this.stopAutomatedRollout();
          return;
        }
        
        // Check error rate
        if (metrics.errorRate > config.maxErrorRate) {
          console.error(`🚨 Error rate too high for ${migrationKey}: ${(metrics.errorRate * 100).toFixed(2)}% > ${(config.maxErrorRate * 100).toFixed(2)}%`);
          await this.emergencyRollback(operation, `High error rate: ${(metrics.errorRate * 100).toFixed(2)}%`);
          return;
        }
        
        // Increment percentage
        const newPercentage = Math.min(
          metrics.currentPercentage + config.incrementStep,
          config.maxPercentage
        );
        
        FeatureFlagService.incrementCanaryPercentage(operation, config.incrementStep);
        
        // Update metrics
        metrics.currentPercentage = newPercentage;
        this.migrationHistory.set(migrationKey, metrics);
        
        console.log(`📈 Rollout progress for ${migrationKey}: ${newPercentage}%`);
        
        // Log current status
        this.logMigrationStatus(migrationKey, metrics);
        
      } catch (error) {
        console.error(`❌ Error during automated rollout for ${migrationKey}:`, error);
        await this.emergencyRollback(operation, `Automated rollout error: ${error}`);
      }
    }, config.incrementIntervalMinutes * 60 * 1000); // Convert minutes to milliseconds
  }
  
  /**
   * Health monitoring system
   */
  private static startHealthMonitoring(
    migrationKey: string,
    operation: 'chat' | 'recipe',
    maxErrorRate: number
  ): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }
    
    this.healthCheckTimer = setInterval(async () => {
      try {
        // Check provider health
        const healthStatus = await AIService.healthCheck();
        
        // Analyze health metrics
        let hasUnhealthyProvider = false;
        for (const [providerName, status] of Object.entries(healthStatus)) {
          if (!status.healthy) {
            console.warn(`⚠️ Provider ${providerName} is unhealthy: ${status.error}`);
            hasUnhealthyProvider = true;
          }
        }
        
        // Emergency rollback if providers are unhealthy
        if (hasUnhealthyProvider) {
          console.error(`🚨 Unhealthy providers detected during ${migrationKey} rollout`);
          await this.emergencyRollback(operation, 'Provider health check failed');
        }
        
      } catch (error) {
        console.error(`❌ Health monitoring error for ${migrationKey}:`, error);
      }
    }, 30000); // Check every 30 seconds
  }
  
  /**
   * Stop automated rollout
   */
  private static stopAutomatedRollout(): void {
    if (this.rolloutTimer) {
      clearInterval(this.rolloutTimer);
      this.rolloutTimer = null;
    }
    
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }
    
    console.log('⏹️ Automated rollout stopped');
  }
  
  // === INSTANT ROLLBACK SYSTEM ===
  
  /**
   * Emergency rollback - instantly disable canary and revert to stable
   */
  static async emergencyRollback(
    operation: 'chat' | 'recipe',
    reason: string
  ): Promise<void> {
    console.error(`🚨 EMERGENCY ROLLBACK for ${operation}: ${reason}`);
    
    try {
      // Stop automated rollout
      this.stopAutomatedRollout();
      
      // Disable canary immediately
      FeatureFlagService.emergencyRollbackCanary(operation);
      
      // Reset provider to default (OpenAI)
      const providerFlag = `ai.provider.${operation}` as const;
      FeatureFlagService.setFlag(providerFlag, {
        enabled: false,
        value: 'openai',
        percentage: 0
      });
      
      // Reset model to stable
      const modelFlag = `ai.model.${operation}.default` as const;
      const stableModel = operation === 'chat' ? 'gpt-4o-mini' : 'gpt-4o';
      FeatureFlagService.setFlag(modelFlag, {
        enabled: true,
        value: stableModel as any
      });
      
      // Update migration metrics
      const migrationKey = `${operation}-rollback`;
      const metrics = this.migrationHistory.get(migrationKey) || {
        startTime: new Date(),
        currentPercentage: 0,
        targetPercentage: 0,
        errorRate: 0,
        successCount: 0,
        errorCount: 0,
        rollbackCount: 0
      };
      
      metrics.rollbackCount++;
      metrics.lastErrorTime = new Date();
      this.migrationHistory.set(migrationKey, metrics);
      
      // Log rollback event
      console.error(`🔄 Emergency rollback complete for ${operation}. Reason: ${reason}`);
      
      // Send alert (in production, this would integrate with alerting system)
      this.sendRollbackAlert(operation, reason, metrics);
      
    } catch (error) {
      console.error(`❌ Failed to execute emergency rollback for ${operation}:`, error);
      
      // Last resort: enable emergency fallback mode
      FeatureFlagService.emergencyEnableFallback();
    }
  }
  
  /**
   * Manual rollback with controlled percentage decrease
   */
  static async controlledRollback(
    operation: 'chat' | 'recipe',
    decrementStep: number = 10,
    reason?: string
  ): Promise<void> {
    console.log(`🔄 Controlled rollback for ${operation}: -${decrementStep}%${reason ? ` (${reason})` : ''}`);
    
    FeatureFlagService.decrementCanaryPercentage(operation, decrementStep);
    
    // Update metrics
    const migrationKey = `${operation}-controlled-rollback`;
    const metrics = this.migrationHistory.get(migrationKey) || {
      startTime: new Date(),
      currentPercentage: 100,
      targetPercentage: 0,
      errorRate: 0,
      successCount: 0,
      errorCount: 0,
      rollbackCount: 0
    };
    
    metrics.currentPercentage = Math.max(0, metrics.currentPercentage - decrementStep);
    metrics.rollbackCount++;
    this.migrationHistory.set(migrationKey, metrics);
    
    this.logMigrationStatus(migrationKey, metrics);
  }
  
  // === MONITORING AND METRICS ===
  
  /**
   * Track migration success/error for monitoring
   */
  static trackMigrationEvent(
    operation: 'chat' | 'recipe',
    success: boolean,
    provider: string,
    error?: string
  ): void {
    const migrationKey = `${operation}-${provider}`;
    const metrics = this.migrationHistory.get(migrationKey);
    
    if (metrics) {
      if (success) {
        metrics.successCount++;
        metrics.lastSuccessTime = new Date();
      } else {
        metrics.errorCount++;
        metrics.lastErrorTime = new Date();
      }
      
      // Calculate error rate
      const totalEvents = metrics.successCount + metrics.errorCount;
      metrics.errorRate = totalEvents > 0 ? metrics.errorCount / totalEvents : 0;
      
      this.migrationHistory.set(migrationKey, metrics);
    }
  }
  
  /**
   * Get current migration status
   */
  static getMigrationStatus(): Record<string, any> {
    const status: Record<string, any> = {};
    
    for (const [key, metrics] of this.migrationHistory.entries()) {
      status[key] = {
        ...metrics,
        runningTime: Date.now() - metrics.startTime.getTime(),
        errorRatePercentage: (metrics.errorRate * 100).toFixed(2),
        isHealthy: metrics.errorRate < 0.05 // 5% threshold
      };
    }
    
    return status;
  }
  
  /**
   * Get feature flag status with migration context
   */
  static getMigrationConfiguration(): Record<string, any> {
    const flags = FeatureFlagService.getAllFlags();
    const migrationStatus = this.getMigrationStatus();
    
    return {
      featureFlags: flags,
      migrationStatus,
      automatedRolloutActive: this.rolloutTimer !== null,
      healthMonitoringActive: this.healthCheckTimer !== null,
      timestamp: new Date().toISOString()
    };
  }
  
  // === HELPER METHODS ===
  
  private static logMigrationStatus(migrationKey: string, metrics: MigrationMetrics): void {
    console.log(`📊 Migration Status - ${migrationKey}:`, {
      percentage: `${metrics.currentPercentage}%`,
      errorRate: `${(metrics.errorRate * 100).toFixed(2)}%`,
      events: `${metrics.successCount} success / ${metrics.errorCount} errors`,
      runtime: `${Math.round((Date.now() - metrics.startTime.getTime()) / 60000)}min`
    });
  }
  
  private static sendRollbackAlert(
    operation: string,
    reason: string,
    metrics: MigrationMetrics
  ): void {
    // In production, this would integrate with Slack, PagerDuty, etc.
    console.error(`🚨 ROLLBACK ALERT 🚨`, {
      operation,
      reason,
      errorRate: `${(metrics.errorRate * 100).toFixed(2)}%`,
      rollbackCount: metrics.rollbackCount,
      timestamp: new Date().toISOString()
    });
  }
}

// === CONVENIENT WRAPPER FUNCTIONS ===

export const canaryMigration = {
  // Start gradual rollouts
  async startGPT4oMiniChatRollout(maxPercentage: number = 50): Promise<void> {
    return CanaryMigrationManager.startGradualRollout('chat', {
      targetProvider: 'openai',
      targetModel: 'gpt-4o-mini',
      maxPercentage,
      maxErrorRate: 0.03 // 3% for chat is acceptable
    });
  },
  
  async startGPT4oMiniRecipeRollout(maxPercentage: number = 25): Promise<void> {
    return CanaryMigrationManager.startGradualRollout('recipe', {
      targetProvider: 'openai',
      targetModel: 'gpt-4o-mini',
      maxPercentage,
      maxErrorRate: 0.02 // 2% for recipes is stricter
    });
  },
  
  async startGeminiRollout(operation: 'chat' | 'recipe', maxPercentage: number = 10): Promise<void> {
    return CanaryMigrationManager.startGradualRollout(operation, {
      targetProvider: 'gemini',
      maxPercentage,
      maxErrorRate: 0.05 // 5% for experimental provider
    });
  },
  
  // Emergency controls
  async emergencyRollbackChat(reason: string): Promise<void> {
    return CanaryMigrationManager.emergencyRollback('chat', reason);
  },
  
  async emergencyRollbackRecipe(reason: string): Promise<void> {
    return CanaryMigrationManager.emergencyRollback('recipe', reason);
  },
  
  async rollbackChatBy(percentage: number, reason?: string): Promise<void> {
    return CanaryMigrationManager.controlledRollback('chat', percentage, reason);
  },
  
  async rollbackRecipeBy(percentage: number, reason?: string): Promise<void> {
    return CanaryMigrationManager.controlledRollback('recipe', percentage, reason);
  },
  
  // Monitoring
  getStatus(): Record<string, any> {
    return CanaryMigrationManager.getMigrationStatus();
  },
  
  getConfiguration(): Record<string, any> {
    return CanaryMigrationManager.getMigrationConfiguration();
  },
  
  trackEvent(operation: 'chat' | 'recipe', success: boolean, provider: string, error?: string): void {
    return CanaryMigrationManager.trackMigrationEvent(operation, success, provider, error);
  }
};

export { CanaryMigrationManager };