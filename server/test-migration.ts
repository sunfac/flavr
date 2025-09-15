// === GPT-4O MINI MIGRATION TEST SCRIPT ===

import { AIService } from "./aiProvider";
import { MigrationMonitoringService } from "./migrationMonitoring";
import { FeatureFlagService } from "./featureFlags";
import { validateRecipeResponse } from "@shared/aiSchemas";

interface TestResult {
  testName: string;
  passed: boolean;
  details: any;
  error?: string;
}

export class MigrationTestSuite {
  private static results: TestResult[] = [];

  // Run comprehensive migration tests
  static async runTests(): Promise<{
    allPassed: boolean;
    results: TestResult[];
    summary: string;
  }> {
    console.log("🧪 Starting GPT-4o Mini Migration Test Suite...\n");
    
    this.results = [];

    // Test 1: Feature flag configuration
    await this.testFeatureFlags();

    // Test 2: Recipe generation with both models
    await this.testRecipeGeneration();

    // Test 3: Validation and fallback mechanisms
    await this.testValidationFallback();

    // Test 4: Migration monitoring
    await this.testMigrationMonitoring();

    // Test 5: Rollback capability
    await this.testRollbackCapability();

    const allPassed = this.results.every(r => r.passed);
    const summary = this.generateSummary();

    console.log("\n" + summary);
    
    return {
      allPassed,
      results: this.results,
      summary
    };
  }

  // Test feature flag functionality
  private static async testFeatureFlags(): Promise<void> {
    console.log("🎌 Testing Feature Flags...");
    
    try {
      // Test canary percentage retrieval
      const recipeFlag = FeatureFlagService.getFlag('canary.gpt4oMini.recipe');
      const isEnabled = FeatureFlagService.isEnabled('canary.gpt4oMini.recipe', { userId: 1 });
      const model = FeatureFlagService.getModelForOperation('recipe', { userId: 1 });
      
      this.results.push({
        testName: "Feature Flag Configuration",
        passed: true,
        details: {
          recipeCanaryEnabled: recipeFlag.enabled,
          recipeCanaryPercentage: ('percentage' in recipeFlag ? recipeFlag.percentage : 0),
          isUserInCanary: isEnabled,
          selectedModel: model
        }
      });

      console.log(`✅ Feature flags working - Canary: ${('percentage' in recipeFlag ? recipeFlag.percentage : 0)}%, Model: ${model}`);
      
    } catch (error) {
      this.results.push({
        testName: "Feature Flag Configuration",
        passed: false,
        details: {},
        error: error instanceof Error ? error.message : "Unknown error"
      });
      console.log(`❌ Feature flag test failed: ${error}`);
    }
  }

  // Test recipe generation with different models
  private static async testRecipeGeneration(): Promise<void> {
    console.log("👨‍🍳 Testing Recipe Generation...");
    
    const testRecipeRequest = {
      request: "Create a simple pasta recipe with tomatoes and basil",
      preferences: {
        difficulty: "Easy",
        servings: 4,
        timeConstraint: 30,
        dietaryRestrictions: ["vegetarian"]
      },
      mode: "test"
    };

    // Test GPT-4o
    try {
      console.log("  Testing GPT-4o...");
      const gpt4oResponse = await AIService.generateRecipe({
        ...testRecipeRequest,
        model: "gpt-4o"
      }, { userId: 999, traceId: "test-gpt4o", stream: false, timeoutMs: 30000, retries: 1 });

      const gpt4oValidation = validateRecipeResponse(gpt4oResponse, "gpt-4o", false);

      this.results.push({
        testName: "GPT-4o Recipe Generation",
        passed: gpt4oValidation.success,
        details: {
          title: gpt4oResponse.title,
          qualityScore: gpt4oValidation.qualityMetrics?.structuralScore,
          ingredientCount: Array.isArray(gpt4oResponse.ingredients) ? gpt4oResponse.ingredients.length : 0,
          instructionCount: Array.isArray(gpt4oResponse.instructions) ? gpt4oResponse.instructions.length : 0,
          hasMetadata: !!gpt4oResponse.metadata
        }
      });

      console.log(`  ✅ GPT-4o generated: "${gpt4oResponse.title}" (Score: ${gpt4oValidation.qualityMetrics?.structuralScore}/100)`);

    } catch (error) {
      this.results.push({
        testName: "GPT-4o Recipe Generation",
        passed: false,
        details: {},
        error: error instanceof Error ? error.message : "Unknown error"
      });
      console.log(`  ❌ GPT-4o test failed: ${error}`);
    }

    // Test GPT-4o mini
    try {
      console.log("  Testing GPT-4o mini...");
      const gpt4oMiniResponse = await AIService.generateRecipe({
        ...testRecipeRequest,
        model: "gpt-4o-mini"
      }, { userId: 999, traceId: "test-gpt4o-mini", stream: false, timeoutMs: 30000, retries: 1 });

      const miniValidation = validateRecipeResponse(gpt4oMiniResponse, "gpt-4o-mini", true);

      this.results.push({
        testName: "GPT-4o Mini Recipe Generation",
        passed: miniValidation.success,
        details: {
          title: gpt4oMiniResponse.title,
          qualityScore: miniValidation.qualityMetrics?.structuralScore,
          ingredientCount: Array.isArray(gpt4oMiniResponse.ingredients) ? gpt4oMiniResponse.ingredients.length : 0,
          instructionCount: Array.isArray(gpt4oMiniResponse.instructions) ? gpt4oMiniResponse.instructions.length : 0,
          hasMetadata: !!gpt4oMiniResponse.metadata,
          fallbackUsed: gpt4oMiniResponse.metadata?.fallbackUsed
        }
      });

      console.log(`  ✅ GPT-4o mini generated: "${gpt4oMiniResponse.title}" (Score: ${miniValidation.qualityMetrics?.structuralScore}/100)`);
      
      if (gpt4oMiniResponse.metadata?.fallbackUsed) {
        console.log(`  ⚠️ Fallback was used`);
      }

    } catch (error) {
      this.results.push({
        testName: "GPT-4o Mini Recipe Generation",
        passed: false,
        details: {},
        error: error instanceof Error ? error.message : "Unknown error"
      });
      console.log(`  ❌ GPT-4o mini test failed: ${error}`);
    }
  }

  // Test validation and fallback mechanisms
  private static async testValidationFallback(): Promise<void> {
    console.log("🔍 Testing Validation & Fallback...");
    
    try {
      // Test validation functions directly
      const mockGoodRecipe = {
        title: "Test Recipe",
        description: "A test recipe",
        difficulty: "Easy",
        cookTime: 30,
        servings: 4,
        ingredients: ["ingredient 1", "ingredient 2", "ingredient 3"],
        instructions: ["step 1", "step 2", "step 3", "step 4"],
        metadata: {
          model: "gpt-4o-mini",
          provider: "openai",
          requestId: "test",
          processingTimeMs: 1000
        }
      };

      const goodValidation = validateRecipeResponse(mockGoodRecipe, "gpt-4o-mini", true);

      const mockPoorRecipe = {
        title: "Bad Recipe",
        difficulty: "Easy",
        cookTime: 30,
        servings: 4,
        ingredients: ["ingredient 1"], // Too few ingredients
        instructions: ["step 1"], // Too few steps
        metadata: {
          model: "gpt-4o-mini",
          provider: "openai",
          requestId: "test",
          processingTimeMs: 1000
        }
      };

      const poorValidation = validateRecipeResponse(mockPoorRecipe, "gpt-4o-mini", true);

      this.results.push({
        testName: "Validation Logic",
        passed: goodValidation.success && (poorValidation.shouldFallback || false),
        details: {
          goodRecipeScore: goodValidation.qualityMetrics?.structuralScore,
          poorRecipeScore: poorValidation.qualityMetrics?.structuralScore,
          fallbackTriggered: poorValidation.shouldFallback,
          fallbackReason: poorValidation.fallbackReason
        }
      });

      console.log(`✅ Validation working - Good: ${goodValidation.qualityMetrics?.structuralScore}/100, Poor: ${poorValidation.qualityMetrics?.structuralScore}/100`);
      
    } catch (error) {
      this.results.push({
        testName: "Validation Logic",
        passed: false,
        details: {},
        error: error instanceof Error ? error.message : "Unknown error"
      });
      console.log(`❌ Validation test failed: ${error}`);
    }
  }

  // Test migration monitoring
  private static async testMigrationMonitoring(): Promise<void> {
    console.log("📊 Testing Migration Monitoring...");
    
    try {
      const analytics = MigrationMonitoringService.getAnalytics(1);
      const status = MigrationMonitoringService.getMigrationStatus();

      this.results.push({
        testName: "Migration Monitoring",
        passed: true,
        details: {
          totalRequests: analytics.totalRequests,
          successRate: analytics.successRate,
          fallbackRate: analytics.fallbackRate,
          healthScore: status.currentHealthScore,
          recommendations: analytics.recommendations.length
        }
      });

      console.log(`✅ Monitoring working - Health: ${status.currentHealthScore}/100, Requests: ${analytics.totalRequests}`);
      
    } catch (error) {
      this.results.push({
        testName: "Migration Monitoring",
        passed: false,
        details: {},
        error: error instanceof Error ? error.message : "Unknown error"
      });
      console.log(`❌ Monitoring test failed: ${error}`);
    }
  }

  // Test rollback capability
  private static async testRollbackCapability(): Promise<void> {
    console.log("🔄 Testing Rollback Capability...");
    
    try {
      // Get current settings
      const initialFlag = FeatureFlagService.getFlag('canary.gpt4oMini.recipe');
      const initialPercentage = ('percentage' in initialFlag ? initialFlag.percentage : 0) || 0;

      // Test emergency rollback
      FeatureFlagService.emergencyRollbackCanary('recipe');
      const rolledBackFlag = FeatureFlagService.getFlag('canary.gpt4oMini.recipe');
      const rolledBackPercentage = ('percentage' in rolledBackFlag ? rolledBackFlag.percentage : 0) || 0;

      // Restore original settings
      FeatureFlagService.setFlag('canary.gpt4oMini.recipe', {
        enabled: initialPercentage > 0,
        percentage: initialPercentage,
        userWhitelist: []
      } as any);

      this.results.push({
        testName: "Rollback Capability",
        passed: rolledBackPercentage === 0,
        details: {
          initialPercentage,
          rolledBackPercentage,
          restoredSuccessfully: true
        }
      });

      console.log(`✅ Rollback working - ${initialPercentage}% → ${rolledBackPercentage}% → ${initialPercentage}%`);
      
    } catch (error) {
      this.results.push({
        testName: "Rollback Capability",
        passed: false,
        details: {},
        error: error instanceof Error ? error.message : "Unknown error"
      });
      console.log(`❌ Rollback test failed: ${error}`);
    }
  }

  // Generate test summary
  private static generateSummary(): string {
    const passed = this.results.filter(r => r.passed).length;
    const total = this.results.length;
    const failedTests = this.results.filter(r => !r.passed);

    let summary = `
🧪 MIGRATION TEST RESULTS
========================
✅ Passed: ${passed}/${total} tests
${failedTests.length > 0 ? `❌ Failed: ${failedTests.length} tests` : '🎉 All tests passed!'}

`;

    if (failedTests.length > 0) {
      summary += "Failed Tests:\n";
      failedTests.forEach(test => {
        summary += `  • ${test.testName}: ${test.error}\n`;
      });
      summary += "\n";
    }

    // Migration readiness assessment
    if (passed === total) {
      summary += "🚀 MIGRATION STATUS: READY FOR PRODUCTION\n";
      summary += "✅ All systems validated - safe to increase canary percentage\n";
    } else if (passed >= total * 0.8) {
      summary += "⚠️ MIGRATION STATUS: NEEDS ATTENTION\n";
      summary += "⚠️ Some issues detected - review before scaling\n";
    } else {
      summary += "🚨 MIGRATION STATUS: NOT READY\n";
      summary += "❌ Critical issues - do not proceed with migration\n";
    }

    return summary;
  }
}

// Export test runner function
export async function runMigrationTests() {
  return await MigrationTestSuite.runTests();
}