// === AI HEALTH AND MONITORING ROUTES ===
// Health metrics and migration dashboard endpoints

import type { Express } from "express";
import { AIService } from "../aiProviderInit";
import { migrationDashboard } from "../migrationDashboard";
import { canaryMigration } from "../canaryMigration";
import { FeatureFlagService } from "../featureFlags";
import { aiCostTracker } from "../aiCostTracker";

export function setupAIHealthRoutes(app: Express): void {
  
  // === BASIC HEALTH CHECKS ===
  
  // Simple health check for load balancers
  app.get("/api/ai/health", async (req, res) => {
    try {
      const health = await migrationDashboard.getHealth();
      
      res.status(health.healthy ? 200 : 503).json({
        healthy: health.healthy,
        timestamp: new Date().toISOString(),
        providers: health.providers,
        canary: health.canaryPercentages,
        errors: health.errors
      });
      
    } catch (error) {
      console.error('AI health check failed:', error);
      res.status(503).json({
        healthy: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    }
  });
  
  // Detailed health status for monitoring
  app.get("/api/ai/health/detailed", async (req, res) => {
    try {
      const healthStatus = await AIService.healthCheck();
      const migrationStatus = canaryMigration.getStatus();
      const flagStatus = FeatureFlagService.getFlagStatus();
      
      res.json({
        timestamp: new Date().toISOString(),
        providers: healthStatus,
        migration: migrationStatus,
        featureFlags: flagStatus,
        overall: {
          healthy: Object.values(healthStatus).every((s: any) => s.healthy),
          providersCount: Object.keys(healthStatus).length,
          activeCanaries: Object.values(flagStatus).filter((f: any) => 
            f.enabled && f.config.percentage > 0
          ).length
        }
      });
      
    } catch (error) {
      console.error('Detailed health check failed:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    }
  });
  
  // === MIGRATION DASHBOARD ===
  
  // Main dashboard metrics
  app.get("/api/ai/dashboard", async (req, res) => {
    try {
      const metrics = await migrationDashboard.getMetrics();
      res.json(metrics);
      
    } catch (error) {
      console.error('Dashboard metrics failed:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to get dashboard metrics',
        timestamp: new Date().toISOString()
      });
    }
  });
  
  // Migration report for stakeholders
  app.get("/api/ai/migration/report", async (req, res) => {
    try {
      const report = await migrationDashboard.getReport();
      res.json(report);
      
    } catch (error) {
      console.error('Migration report failed:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to generate migration report',
        timestamp: new Date().toISOString()
      });
    }
  });
  
  // === CANARY MIGRATION CONTROLS ===
  
  // Get current migration status
  app.get("/api/ai/migration/status", (req, res) => {
    try {
      const status = canaryMigration.getStatus();
      const configuration = canaryMigration.getConfiguration();
      
      res.json({
        status,
        configuration,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('Migration status failed:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to get migration status'
      });
    }
  });
  
  // Start gradual rollout (admin only)
  app.post("/api/ai/migration/start", async (req, res) => {
    try {
      // Basic admin check (in production, use proper authentication)
      const isAdmin = req.headers['x-admin-key'] === process.env.ADMIN_KEY;
      if (!isAdmin) {
        return res.status(403).json({ error: 'Admin access required' });
      }
      
      const { operation, provider, model, maxPercentage } = req.body;
      
      if (!operation || !['chat', 'recipe'].includes(operation)) {
        return res.status(400).json({ 
          error: 'Invalid operation. Must be "chat" or "recipe"' 
        });
      }
      
      if (provider === 'openai' && model === 'gpt-4o-mini') {
        if (operation === 'chat') {
          await canaryMigration.startGPT4oMiniChatRollout(maxPercentage || 50);
        } else {
          await canaryMigration.startGPT4oMiniRecipeRollout(maxPercentage || 25);
        }
      } else if (provider === 'gemini') {
        await canaryMigration.startGeminiRollout(operation, maxPercentage || 10);
      } else {
        return res.status(400).json({ 
          error: 'Unsupported provider/model combination' 
        });
      }
      
      res.json({
        message: `Started ${operation} rollout for ${provider}/${model}`,
        maxPercentage: maxPercentage,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('Failed to start rollout:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to start rollout'
      });
    }
  });
  
  // Emergency rollback (admin only)
  app.post("/api/ai/migration/rollback", async (req, res) => {
    try {
      const isAdmin = req.headers['x-admin-key'] === process.env.ADMIN_KEY;
      if (!isAdmin) {
        return res.status(403).json({ error: 'Admin access required' });
      }
      
      const { operation, reason, type = 'emergency' } = req.body;
      
      if (!operation || !['chat', 'recipe'].includes(operation)) {
        return res.status(400).json({ 
          error: 'Invalid operation. Must be "chat" or "recipe"' 
        });
      }
      
      if (type === 'emergency') {
        if (operation === 'chat') {
          await canaryMigration.emergencyRollbackChat(reason || 'Manual emergency rollback');
        } else {
          await canaryMigration.emergencyRollbackRecipe(reason || 'Manual emergency rollback');
        }
      } else if (type === 'controlled') {
        const { percentage = 10 } = req.body;
        if (operation === 'chat') {
          await canaryMigration.rollbackChatBy(percentage, reason);
        } else {
          await canaryMigration.rollbackRecipeBy(percentage, reason);
        }
      }
      
      res.json({
        message: `${type} rollback completed for ${operation}`,
        reason: reason || 'No reason provided',
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('Failed to execute rollback:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to execute rollback'
      });
    }
  });
  
  // === FEATURE FLAG MANAGEMENT ===
  
  // Get all feature flags
  app.get("/api/ai/flags", (req, res) => {
    try {
      const flags = FeatureFlagService.getAllFlags();
      const context = req.query.userId ? { userId: parseInt(req.query.userId as string) } : undefined;
      const flagStatus = FeatureFlagService.getFlagStatus(context);
      
      res.json({
        flags,
        status: flagStatus,
        context,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('Failed to get feature flags:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to get feature flags'
      });
    }
  });
  
  // Update feature flag (admin only)
  app.put("/api/ai/flags/:flagName", (req, res) => {
    try {
      const isAdmin = req.headers['x-admin-key'] === process.env.ADMIN_KEY;
      if (!isAdmin) {
        return res.status(403).json({ error: 'Admin access required' });
      }
      
      const { flagName } = req.params;
      const flagValue = req.body;
      
      FeatureFlagService.setFlag(flagName as any, flagValue);
      
      res.json({
        message: `Flag ${flagName} updated`,
        flag: FeatureFlagService.getFlag(flagName as any),
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error(`Failed to update flag ${req.params.flagName}:`, error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to update feature flag'
      });
    }
  });
  
  // === COST ANALYTICS ===
  
  // Get cost summary
  app.get("/api/ai/costs", (req, res) => {
    try {
      const since = req.query.since ? new Date(req.query.since as string) : undefined;
      const userId = req.query.userId ? parseInt(req.query.userId as string) : undefined;
      const provider = req.query.provider as string | undefined;
      const operation = req.query.operation as string | undefined;
      
      const costSummary = aiCostTracker.getCostSummary(since, {
        userId,
        provider,
        operation,
        includeMigrationMetrics: true
      });
      
      res.json({
        ...costSummary,
        period: {
          since: since || new Date(Date.now() - 24 * 60 * 60 * 1000),
          until: new Date()
        },
        filters: { userId, provider, operation },
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('Failed to get cost summary:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to get cost summary'
      });
    }
  });
  
  // Get migration cost analytics
  app.get("/api/ai/costs/migration", (req, res) => {
    try {
      const since = req.query.since ? new Date(req.query.since as string) : undefined;
      const analytics = aiCostTracker.getMigrationAnalytics(since);
      
      res.json({
        ...analytics,
        period: {
          since: since || new Date(Date.now() - 24 * 60 * 60 * 1000),
          until: new Date()
        },
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('Failed to get migration analytics:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to get migration analytics'
      });
    }
  });
  
  // === DEBUGGING AND LOGS ===
  
  // Get recent events for debugging
  app.get("/api/ai/events", (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const userId = req.query.userId ? parseInt(req.query.userId as string) : undefined;
      const provider = req.query.provider as string | undefined;
      const operation = req.query.operation as string | undefined;
      
      const events = aiCostTracker.getRecentEvents(limit, {
        userId,
        provider,
        operation
      });
      
      res.json({
        events,
        limit,
        filters: { userId, provider, operation },
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('Failed to get recent events:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to get recent events'
      });
    }
  });
  
  console.log('🩺 AI Health and Monitoring routes configured');
}