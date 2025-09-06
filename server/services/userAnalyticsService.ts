import { db } from "../db";
import { recipes, users, interactionLogs, weeklyPlans } from "@shared/schema";
import { eq, and, gte, desc, sql } from "drizzle-orm";

interface SavingsMetrics {
  weeklyHomeCookingSavings: number;
  monthlyHomeCookingSavings: number;
  estimatedFoodWasteAvoided: number; // in kg
  efficiencyScore: number; // 0-100
  takeawayComparison: {
    averageRecipeCost: number;
    averageTakeawayCost: number;
    savingsPerMeal: number;
  };
}

interface TasteProfile {
  cuisinePreferences: Array<{
    cuisine: string;
    percentage: number;
    recipeCount: number;
    completionRate: number;
  }>;
  cookingPatterns: {
    preferredDifficulty: string;
    averageCookTime: number;
    mostActiveDay: string;
    seasonality: Record<string, number>;
  };
  dietaryTrends: {
    vegetarianRecipes: number;
    healthyRecipes: number;
    comfortFoodRecipes: number;
  };
  confidenceScore: number; // 0-100, based on data availability
}

interface UserProfile {
  userId: number;
  profileConfidence: number; // 0-100
  recipesGenerated: number;
  recipesCompleted: number;
  savingsMetrics: SavingsMetrics;
  tasteProfile: TasteProfile;
  generationPreferences: {
    shouldUseProfile: boolean;
    fallbackToGeneral: boolean;
    diversityBoost: number; // higher for new users
  };
}

class UserAnalyticsService {
  
  // Calculate real savings based on user's recipe history
  async calculateSavingsMetrics(userId: number): Promise<SavingsMetrics> {
    // Get user's recipes from last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const userRecipes = await db.select()
      .from(recipes)
      .where(and(
        eq(recipes.userId, userId),
        gte(recipes.createdAt, thirtyDaysAgo)
      ))
      .orderBy(desc(recipes.createdAt));

    if (userRecipes.length === 0) {
      return this.getDefaultSavingsMetrics();
    }

    // Calculate average recipe cost based on ingredients and servings
    let totalRecipeCost = 0;
    let totalTakeawayCost = 0;
    let totalWasteAvoided = 0;

    for (const recipe of userRecipes) {
      const recipeCost = this.estimateRecipeCost(recipe);
      const takeawayCost = this.estimateTakeawayCost(recipe);
      const wasteAvoided = this.estimateWasteAvoided(recipe);
      
      totalRecipeCost += recipeCost;
      totalTakeawayCost += takeawayCost;
      totalWasteAvoided += wasteAvoided;
    }

    const averageRecipeCost = totalRecipeCost / userRecipes.length;
    const averageTakeawayCost = totalTakeawayCost / userRecipes.length;
    const savingsPerMeal = averageTakeawayCost - averageRecipeCost;
    
    // Project to weekly/monthly based on cooking frequency
    const weeklyMeals = Math.min(userRecipes.length * (7/30), 14); // realistic cap
    const monthlyMeals = Math.min(userRecipes.length, 60); // realistic cap
    
    const weeklyHomeCookingSavings = savingsPerMeal * weeklyMeals;
    const monthlyHomeCookingSavings = savingsPerMeal * monthlyMeals;
    
    // Efficiency score based on cost savings and waste reduction
    const maxPossibleSavings = averageTakeawayCost;
    const efficiencyScore = Math.min(Math.round((savingsPerMeal / maxPossibleSavings) * 100), 100);

    return {
      weeklyHomeCookingSavings: Math.round(weeklyHomeCookingSavings),
      monthlyHomeCookingSavings: Math.round(monthlyHomeCookingSavings),
      estimatedFoodWasteAvoided: Math.round(totalWasteAvoided * 10) / 10, // 1 decimal place
      efficiencyScore,
      takeawayComparison: {
        averageRecipeCost: Math.round(averageRecipeCost * 100) / 100,
        averageTakeawayCost: Math.round(averageTakeawayCost * 100) / 100,
        savingsPerMeal: Math.round(savingsPerMeal * 100) / 100
      }
    };
  }

  // Analyze user's taste preferences from recipe history
  async calculateTasteProfile(userId: number): Promise<TasteProfile> {
    // Get all user recipes for broader analysis
    const userRecipes = await db.select()
      .from(recipes)
      .where(eq(recipes.userId, userId))
      .orderBy(desc(recipes.createdAt));

    if (userRecipes.length === 0) {
      return this.getDefaultTasteProfile();
    }

    // Analyze cuisine distribution
    const cuisineCount: Record<string, number> = {};
    const difficultyCount: Record<string, number> = {};
    let totalCookTime = 0;
    let cookTimeCount = 0;

    for (const recipe of userRecipes) {
      // Count cuisines
      if (recipe.cuisine) {
        cuisineCount[recipe.cuisine] = (cuisineCount[recipe.cuisine] || 0) + 1;
      }
      
      // Count difficulty levels
      if (recipe.difficulty) {
        difficultyCount[recipe.difficulty] = (difficultyCount[recipe.difficulty] || 0) + 1;
      }
      
      // Track cook times
      if (recipe.cookTime) {
        totalCookTime += recipe.cookTime;
        cookTimeCount++;
      }
    }

    // Calculate cuisine preferences with completion rates
    const cuisinePreferences = Object.entries(cuisineCount)
      .map(([cuisine, count]) => ({
        cuisine,
        percentage: Math.round((count / userRecipes.length) * 100),
        recipeCount: count,
        completionRate: 85 // Placeholder - would track from interaction logs
      }))
      .sort((a, b) => b.percentage - a.percentage)
      .slice(0, 5); // Top 5 cuisines

    // Determine preferred difficulty
    const preferredDifficulty = Object.entries(difficultyCount)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || 'medium';

    // Calculate confidence score based on data availability
    const confidenceScore = Math.min(Math.round((userRecipes.length / 20) * 100), 100);

    // Analyze dietary trends
    const vegetarianRecipes = userRecipes.filter(r => 
      r.dietary?.includes('vegetarian') || 
      r.description?.toLowerCase().includes('vegetarian')
    ).length;
    
    const healthyRecipes = userRecipes.filter(r => 
      r.dietary?.includes('healthy') || 
      r.mood?.toLowerCase().includes('healthy')
    ).length;
    
    const comfortFoodRecipes = userRecipes.filter(r => 
      r.mood?.toLowerCase().includes('comfort')
    ).length;

    return {
      cuisinePreferences,
      cookingPatterns: {
        preferredDifficulty,
        averageCookTime: cookTimeCount > 0 ? Math.round(totalCookTime / cookTimeCount) : 30,
        mostActiveDay: 'Sunday', // Would analyze from interaction logs
        seasonality: {} // Would track seasonal preferences
      },
      dietaryTrends: {
        vegetarianRecipes,
        healthyRecipes,
        comfortFoodRecipes
      },
      confidenceScore
    };
  }

  // Generate comprehensive user profile for smart recipe generation
  async generateUserProfile(userId: number): Promise<UserProfile> {
    const [savingsMetrics, tasteProfile] = await Promise.all([
      this.calculateSavingsMetrics(userId),
      this.calculateTasteProfile(userId)
    ]);

    // Get user stats
    const user = await db.select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    const recipesGenerated = user[0]?.recipesGenerated || 0;
    const recipesCompleted = Math.round(recipesGenerated * 0.75); // Estimate from completion rate

    // Calculate overall profile confidence
    const dataPoints = recipesGenerated;
    const profileConfidence = Math.min(Math.round((dataPoints / 15) * 100), 100);

    // Determine generation strategy based on confidence
    const shouldUseProfile = profileConfidence >= 30; // Use profile if we have enough data
    const fallbackToGeneral = profileConfidence < 50; // Fallback for low confidence
    const diversityBoost = Math.max(50 - profileConfidence, 0); // More diversity for new users

    return {
      userId,
      profileConfidence,
      recipesGenerated,
      recipesCompleted,
      savingsMetrics,
      tasteProfile,
      generationPreferences: {
        shouldUseProfile,
        fallbackToGeneral,
        diversityBoost
      }
    };
  }

  // Cost estimation helpers
  private estimateRecipeCost(recipe: any): number {
    const servings = recipe.servings || 4;
    const baseIngredientCost = 1.2; // £1.20 per serving base cost
    
    // Adjust based on cuisine complexity
    const cuisineMultiplier = this.getCuisineMultiplier(recipe.cuisine);
    const difficultyMultiplier = this.getDifficultyMultiplier(recipe.difficulty);
    
    return (baseIngredientCost * cuisineMultiplier * difficultyMultiplier) * servings;
  }

  private estimateTakeawayCost(recipe: any): number {
    const servings = recipe.servings || 4;
    const baseTakeawayCost = 8.5; // £8.50 per serving average takeaway
    
    // Adjust based on cuisine type
    const cuisineMultiplier = this.getTakeawayCuisineMultiplier(recipe.cuisine);
    
    return baseTakeawayCost * cuisineMultiplier * servings;
  }

  private estimateWasteAvoided(recipe: any): number {
    const servings = recipe.servings || 4;
    const wastePerServing = 0.15; // 150g waste avoided per serving
    
    return wastePerServing * servings;
  }

  private getCuisineMultiplier(cuisine: string): number {
    const multipliers: Record<string, number> = {
      'Italian': 0.9,
      'British': 0.8,
      'Mediterranean': 1.0,
      'Asian': 1.1,
      'Indian': 1.0,
      'French': 1.3,
      'Mexican': 0.9,
      'Japanese': 1.4,
      'Thai': 1.1
    };
    
    return multipliers[cuisine] || 1.0;
  }

  private getDifficultyMultiplier(difficulty: string): number {
    const multipliers: Record<string, number> = {
      'easy': 0.8,
      'medium': 1.0,
      'hard': 1.3
    };
    
    return multipliers[difficulty] || 1.0;
  }

  private getTakeawayCuisineMultiplier(cuisine: string): number {
    const multipliers: Record<string, number> = {
      'Italian': 1.0,
      'British': 0.9,
      'Mediterranean': 1.1,
      'Asian': 0.8,
      'Indian': 0.7,
      'French': 1.4,
      'Mexican': 0.8,
      'Japanese': 1.6,
      'Thai': 0.9
    };
    
    return multipliers[cuisine] || 1.0;
  }

  private getDefaultSavingsMetrics(): SavingsMetrics {
    return {
      weeklyHomeCookingSavings: 0,
      monthlyHomeCookingSavings: 0,
      estimatedFoodWasteAvoided: 0,
      efficiencyScore: 0,
      takeawayComparison: {
        averageRecipeCost: 0,
        averageTakeawayCost: 0,
        savingsPerMeal: 0
      }
    };
  }

  private getDefaultTasteProfile(): TasteProfile {
    return {
      cuisinePreferences: [],
      cookingPatterns: {
        preferredDifficulty: 'medium',
        averageCookTime: 30,
        mostActiveDay: 'Sunday',
        seasonality: {}
      },
      dietaryTrends: {
        vegetarianRecipes: 0,
        healthyRecipes: 0,
        comfortFoodRecipes: 0
      },
      confidenceScore: 0
    };
  }
}

export const userAnalyticsService = new UserAnalyticsService();
export type { SavingsMetrics, TasteProfile, UserProfile };