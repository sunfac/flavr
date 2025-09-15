// === MIGRATION MONITORING API ROUTES ===

import { Router } from "express";
import { MigrationMonitoringService } from "../migrationMonitoring";
import { FeatureFlagService } from "../featureFlags";

const router = Router();

// Get migration analytics
router.get("/analytics", (req, res) => {
  try {
    const timeWindowHours = parseInt(req.query.hours as string) || 24;
    const analytics = MigrationMonitoringService.getAnalytics(timeWindowHours);
    
    res.json({
      success: true,
      data: analytics,
      timeWindow: `${timeWindowHours} hours`
    });
  } catch (error) {
    console.error("Error getting migration analytics:", error);
    res.status(500).json({
      success: false,
      error: "Failed to retrieve migration analytics"
    });
  }
});

// Get migration status and recommendations
router.get("/status", (req, res) => {
  try {
    const status = MigrationMonitoringService.getMigrationStatus();
    const recipeCanary = FeatureFlagService.getFlag('canary.gpt4oMini.recipe');
    const chatCanary = FeatureFlagService.getFlag('canary.gpt4oMini.chat');
    
    res.json({
      success: true,
      data: {
        ...status,
        currentCanarySettings: {
          recipe: {
            enabled: recipeCanary.enabled,
            percentage: ('percentage' in recipeCanary ? recipeCanary.percentage : 0) || 0
          },
          chat: {
            enabled: chatCanary.enabled,
            percentage: ('percentage' in chatCanary ? chatCanary.percentage : 0) || 0
          }
        }
      }
    });
  } catch (error) {
    console.error("Error getting migration status:", error);
    res.status(500).json({
      success: false,
      error: "Failed to retrieve migration status"
    });
  }
});

// Generate migration report
router.get("/report", (req, res) => {
  try {
    const timeWindowHours = parseInt(req.query.hours as string) || 24;
    const report = MigrationMonitoringService.generateReport(timeWindowHours);
    
    res.json({
      success: true,
      data: {
        report,
        generatedAt: new Date().toISOString(),
        timeWindow: `${timeWindowHours} hours`
      }
    });
  } catch (error) {
    console.error("Error generating migration report:", error);
    res.status(500).json({
      success: false,
      error: "Failed to generate migration report"
    });
  }
});

// Manual canary adjustment endpoints (for testing/emergency)
router.post("/canary/:operation/increase", (req, res) => {
  try {
    const operation = req.params.operation as 'chat' | 'recipe';
    const increment = parseInt(req.body.increment) || 5;
    
    if (!['chat', 'recipe'].includes(operation)) {
      return res.status(400).json({
        success: false,
        error: "Operation must be 'chat' or 'recipe'"
      });
    }
    
    FeatureFlagService.incrementCanaryPercentage(operation, increment);
    
    const updatedFlag = FeatureFlagService.getFlag(`canary.gpt4oMini.${operation}`);
    const newPercentage = ('percentage' in updatedFlag ? updatedFlag.percentage : 0) || 0;
    
    res.json({
      success: true,
      data: {
        operation,
        newPercentage,
        increment
      }
    });
  } catch (error) {
    console.error("Error increasing canary percentage:", error);
    res.status(500).json({
      success: false,
      error: "Failed to increase canary percentage"
    });
  }
});

router.post("/canary/:operation/decrease", (req, res) => {
  try {
    const operation = req.params.operation as 'chat' | 'recipe';
    const decrement = parseInt(req.body.decrement) || 5;
    
    if (!['chat', 'recipe'].includes(operation)) {
      return res.status(400).json({
        success: false,
        error: "Operation must be 'chat' or 'recipe'"
      });
    }
    
    FeatureFlagService.decrementCanaryPercentage(operation, decrement);
    
    const updatedFlag = FeatureFlagService.getFlag(`canary.gpt4oMini.${operation}`);
    const newPercentage = ('percentage' in updatedFlag ? updatedFlag.percentage : 0) || 0;
    
    res.json({
      success: true,
      data: {
        operation,
        newPercentage,
        decrement
      }
    });
  } catch (error) {
    console.error("Error decreasing canary percentage:", error);
    res.status(500).json({
      success: false,
      error: "Failed to decrease canary percentage"
    });
  }
});

// Emergency rollback endpoint
router.post("/emergency/rollback/:operation", (req, res) => {
  try {
    const operation = req.params.operation as 'chat' | 'recipe';
    
    if (!['chat', 'recipe'].includes(operation)) {
      return res.status(400).json({
        success: false,
        error: "Operation must be 'chat' or 'recipe'"
      });
    }
    
    console.error(`🚨 MANUAL EMERGENCY ROLLBACK TRIGGERED: ${operation}`);
    FeatureFlagService.emergencyRollbackCanary(operation);
    
    res.json({
      success: true,
      data: {
        operation,
        action: "emergency_rollback",
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error("Error performing emergency rollback:", error);
    res.status(500).json({
      success: false,
      error: "Failed to perform emergency rollback"
    });
  }
});

// Auto-adjustment trigger (for testing)
router.post("/auto-adjust/:operation", async (req, res) => {
  try {
    const operation = req.params.operation as 'chat' | 'recipe';
    
    if (!['chat', 'recipe'].includes(operation)) {
      return res.status(400).json({
        success: false,
        error: "Operation must be 'chat' or 'recipe'"
      });
    }
    
    await MigrationMonitoringService.autoAdjustCanary(operation);
    
    const updatedFlag = FeatureFlagService.getFlag(`canary.gpt4oMini.${operation}`);
    const newPercentage = ('percentage' in updatedFlag ? updatedFlag.percentage : 0) || 0;
    
    res.json({
      success: true,
      data: {
        operation,
        action: "auto_adjustment",
        newPercentage,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error("Error performing auto-adjustment:", error);
    res.status(500).json({
      success: false,
      error: "Failed to perform auto-adjustment"
    });
  }
});

export default router;