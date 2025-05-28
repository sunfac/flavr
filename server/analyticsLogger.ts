import { storage } from "./storage";
import type { InsertRecipeGenerationLog } from "@shared/schema";
import crypto from "crypto";

/**
 * 🔑 Generate SHA256 fingerprint for recipe content validation
 * This ensures data integrity and prevents tampering
 */
export function generateRecipeFingerprint(recipeOutput: any): string {
  const contentString = [
    recipeOutput.title,
    recipeOutput.cuisine || '',
    recipeOutput.difficulty,
    recipeOutput.servings.toString(),
    recipeOutput.cookTime.toString(),
    recipeOutput.ingredients.join(","),
    recipeOutput.instructions.join(".")
  ].join("|");

  return crypto.createHash("sha256").update(contentString).digest("hex");
}

interface RecipeGenerationEvent {
  userId?: string; // email or anonymous ID
  mode: string; // shopping, fridge, chef, rituals
  gptVersion?: string;
  
  // Recipe card selected (from Tinder cards)
  recipeCardSelected?: {
    title: string;
    description: string;
  };
  
  // Final recipe output
  recipeOutput: {
    title: string;
    cuisine?: string;
    difficulty: string;
    servings: number;
    cookTime: number;
    ingredients: string[];
    instructions: string[];
    tips?: string;
  };
  
  // Image generation data
  imageGenerated?: string; // URL
  
  // User intent and preferences
  intentData: {
    mood?: string;
    ambition?: string;
    diet?: string[];
    time?: number;
    budget?: string;
    equipment?: string[];
    cuisinePreference?: string;
    ingredientVariety?: string;
    reusabilityPreference?: string;
    ingredients?: string[]; // for fridge mode
    flexibility?: string; // for fridge mode
  };
  
  // User actions and engagement
  userAction?: {
    saved?: boolean;
    addedToShoppingList?: boolean;
    shared?: boolean;
    feedback?: string;
    chatbotUsed?: boolean;
    chatbotQueries?: string[];
  };
  
  // Source prompts for AI training
  sourcePrompt1?: string; // Tinder card generation prompt
  sourcePrompt2?: string; // Full recipe generation prompt
  
  // Analytics metadata
  sessionId?: string;
  browserFingerprint?: string;
  userAgent?: string;
}

/**
 * 🚀 Log a comprehensive recipe generation event for analytics and AI training
 * This captures all valuable data points for monetization and model improvement
 */
export async function logRecipeGeneration(event: RecipeGenerationEvent): Promise<void> {
  try {
    // Generate recipe fingerprint for data integrity
    const recipeFingerprint = generateRecipeFingerprint(event.recipeOutput);
    
    const logData: InsertRecipeGenerationLog = {
      userId: event.userId || 'anonymous',
      mode: event.mode,
      gptVersion: event.gptVersion || 'gpt-4o',
      recipeCardSelected: event.recipeCardSelected || null,
      recipeOutput: event.recipeOutput,
      imageGenerated: event.imageGenerated || null,
      intentData: event.intentData,
      userAction: event.userAction || {},
      sourcePrompt1: event.sourcePrompt1 || null,
      sourcePrompt2: event.sourcePrompt2 || null,
      recipeFingerprint: recipeFingerprint,
      sessionId: event.sessionId || null,
      browserFingerprint: event.browserFingerprint || null,
      userAgent: event.userAgent || null,
    };

    await storage.createRecipeGenerationLog(logData);
    
    console.log(`📊 ANALYTICS LOG - Mode: ${event.mode}, User: ${event.userId || 'anonymous'}, Recipe: ${event.recipeOutput.title}`);
    
    // Additional metrics for business intelligence
    logBusinessMetrics(event);
    
  } catch (error) {
    console.error('Failed to log recipe generation event:', error);
    // Don't throw - analytics failure shouldn't break user experience
  }
}

/**
 * 📈 Track business metrics for monetization insights
 */
function logBusinessMetrics(event: RecipeGenerationEvent): void {
  const metrics = {
    mode: event.mode,
    userType: event.userId?.includes('@') ? 'registered' : 'anonymous',
    recipeComplexity: event.recipeOutput.difficulty,
    cookTime: event.recipeOutput.cookTime,
    servings: event.recipeOutput.servings,
    ingredientCount: event.recipeOutput.ingredients.length,
    instructionSteps: event.recipeOutput.instructions.length,
    hasImage: !!event.imageGenerated,
    dietaryRestrictions: event.intentData.diet?.length || 0,
    equipmentUsed: event.intentData.equipment?.length || 0,
    budget: event.intentData.budget,
    engagement: {
      saved: event.userAction?.saved || false,
      shared: event.userAction?.shared || false,
      chatbotUsed: event.userAction?.chatbotUsed || false,
    }
  };
  
  console.log(`💰 BUSINESS METRICS:`, JSON.stringify(metrics, null, 2));
}

/**
 * 🎯 Update user action data after recipe interaction
 */
export async function updateRecipeEngagement(
  recipeId: string, 
  userId: string, 
  action: {
    saved?: boolean;
    addedToShoppingList?: boolean;
    shared?: boolean;
    feedback?: string;
    chatbotUsed?: boolean;
    chatbotQuery?: string;
  }
): Promise<void> {
  try {
    // In a full implementation, you would update the existing log entry
    // For now, we'll log the engagement separately
    console.log(`🔄 ENGAGEMENT UPDATE - Recipe: ${recipeId}, User: ${userId}, Action:`, action);
    
    // This would update the userAction field in the existing log
    // await storage.updateRecipeGenerationLog(recipeId, { userAction: action });
    
  } catch (error) {
    console.error('Failed to update recipe engagement:', error);
  }
}

/**
 * 📊 Generate analytics insights for business intelligence
 */
export async function generateAnalyticsInsights(): Promise<{
  totalRecipes: number;
  modeBreakdown: Record<string, number>;
  averageCookTime: number;
  mostPopularCuisines: string[];
  userEngagementRate: number;
}> {
  try {
    const logs = await storage.getRecipeGenerationLogs(1000);
    
    const insights = {
      totalRecipes: logs.length,
      modeBreakdown: logs.reduce((acc, log) => {
        acc[log.mode] = (acc[log.mode] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      averageCookTime: logs.reduce((sum, log) => sum + log.recipeOutput.cookTime, 0) / logs.length,
      mostPopularCuisines: extractTopCuisines(logs),
      userEngagementRate: calculateEngagementRate(logs),
    };
    
    console.log(`📈 ANALYTICS INSIGHTS:`, JSON.stringify(insights, null, 2));
    return insights;
    
  } catch (error) {
    console.error('Failed to generate analytics insights:', error);
    return {
      totalRecipes: 0,
      modeBreakdown: {},
      averageCookTime: 0,
      mostPopularCuisines: [],
      userEngagementRate: 0,
    };
  }
}

function extractTopCuisines(logs: any[]): string[] {
  const cuisineCounts = logs.reduce((acc, log) => {
    const cuisine = log.recipeOutput.cuisine;
    if (cuisine) {
      acc[cuisine] = (acc[cuisine] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);
  
  return Object.entries(cuisineCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([cuisine]) => cuisine);
}

function calculateEngagementRate(logs: any[]): number {
  const engagedUsers = logs.filter(log => 
    log.userAction?.saved || 
    log.userAction?.shared || 
    log.userAction?.chatbotUsed
  ).length;
  
  return logs.length > 0 ? (engagedUsers / logs.length) * 100 : 0;
}