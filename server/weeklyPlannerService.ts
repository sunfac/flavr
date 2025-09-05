import { storage } from "./storage";
import type { WeeklyPlan, WeeklyPlanPreferences, InsertWeeklyPlan } from "@shared/schema";

export interface WeeklyPlanGenerationRequest {
  userId: number;
  weekStartDate: Date;
  preferences: WeeklyPlanPreferences;
  isFlavrPlus: boolean;
}

export interface PlannedMeal {
  day: string;
  mealType: string;
  recipeId: number;
  recipeTitle: string;
  cookTime: number;
  servings: number;
  isFlexible: boolean;
}

export class WeeklyPlannerService {
  
  /**
   * Generate a complete weekly meal plan for a user
   */
  static async generateWeeklyPlan(request: WeeklyPlanGenerationRequest): Promise<WeeklyPlan> {
    const { userId, weekStartDate, preferences, isFlavrPlus } = request;
    
    // Calculate week end date (Sunday)
    const weekEndDate = new Date(weekStartDate);
    weekEndDate.setDate(weekEndDate.getDate() + 6);
    
    // Check if plan already exists for this week
    const existingPlan = await storage.getCurrentWeekPlan(userId, weekStartDate);
    if (existingPlan) {
      return existingPlan;
    }
    
    // Determine how many meals to generate based on subscription and preferences
    const mealCount = isFlavrPlus 
      ? preferences.cookingFrequency 
      : Math.min(preferences.cookingFrequency, 2); // Free tier limit
    
    // For now, create mock planned meals - replace with actual recipe generation later
    const plannedRecipes = await this.createMockPlannedMeals(userId, mealCount, preferences);
    
    // Create the weekly plan
    const weeklyPlanData: InsertWeeklyPlan = {
      userId,
      weekStartDate,
      weekEndDate,
      planStatus: "pending",
      plannedRecipes,
      preferencesSnapshot: {
        householdSize: preferences.householdSize,
        cookingFrequency: preferences.cookingFrequency,
        timeComfort: preferences.timeComfort,
        cuisineWeighting: preferences.cuisineWeighting || {},
        ambitionLevel: preferences.ambitionLevel,
        dietaryNeeds: preferences.dietaryNeeds || [],
        budgetPerServing: preferences.budgetPerServing
      },
      consolidatedShoppingList: []
    };
    
    const newPlan = await storage.createWeeklyPlan(weeklyPlanData);
    return newPlan;
  }
  
  /**
   * Create mock planned meals for testing - replace with real recipe generation
   */
  private static async createMockPlannedMeals(
    userId: number,
    mealCount: number,
    preferences: WeeklyPlanPreferences
  ): Promise<PlannedMeal[]> {
    
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const selectedDays = days.slice(0, mealCount);
    const plannedMeals: PlannedMeal[] = [];
    
    const mockRecipes = [
      { title: "Spaghetti Bolognese", cookTime: 30, cuisine: "Italian" },
      { title: "Chicken Tikka Masala", cookTime: 45, cuisine: "Indian" },
      { title: "Beef Stir Fry", cookTime: 20, cuisine: "Asian" },
      { title: "Fish and Chips", cookTime: 35, cuisine: "British" },
      { title: "Vegetable Curry", cookTime: 25, cuisine: "Indian" },
      { title: "Grilled Salmon", cookTime: 20, cuisine: "Mediterranean" },
      { title: "Shepherd's Pie", cookTime: 50, cuisine: "British" }
    ];
    
    for (let i = 0; i < selectedDays.length; i++) {
      const day = selectedDays[i];
      const recipe = mockRecipes[i % mockRecipes.length];
      
      // Create a mock recipe in the database
      const savedRecipe = await storage.createRecipe({
        userId,
        title: recipe.title,
        description: `Weekly planned ${recipe.cuisine} meal`,
        cookTime: recipe.cookTime,
        servings: preferences.householdSize.adults + preferences.householdSize.kids,
        difficulty: "easy",
        cuisine: recipe.cuisine,
        mode: "weekly",
        ingredients: ["Mock ingredient 1", "Mock ingredient 2", "Mock ingredient 3"],
        instructions: ["Mock instruction 1", "Mock instruction 2", "Mock instruction 3"],
        dietary: preferences.dietaryNeeds,
        ambition: preferences.ambitionLevel,
        cookingTime: recipe.cookTime,
        originalPrompt: `Weekly ${recipe.cuisine} meal for ${day}`
      });
      
      plannedMeals.push({
        day,
        mealType: "dinner",
        recipeId: savedRecipe.id,
        recipeTitle: savedRecipe.title,
        cookTime: savedRecipe.cookTime ?? recipe.cookTime,
        servings: savedRecipe.servings || (preferences.householdSize.adults + preferences.householdSize.kids),
        isFlexible: true
      });
    }
    
    return plannedMeals;
  }
  
  /**
   * Accept a weekly plan (user approves the generated plan)
   */
  static async acceptWeeklyPlan(planId: number, userId: number): Promise<WeeklyPlan> {
    const plan = await storage.getWeeklyPlan(planId);
    if (!plan || plan.userId !== userId) {
      throw new Error('Plan not found or access denied');
    }
    
    return await storage.updateWeeklyPlanStatus(planId, 'accepted');
  }
  
  /**
   * Skip a weekly plan with reason
   */
  static async skipWeeklyPlan(planId: number, userId: number, reason: string): Promise<WeeklyPlan> {
    const plan = await storage.getWeeklyPlan(planId);
    if (!plan || plan.userId !== userId) {
      throw new Error('Plan not found or access denied');
    }
    
    return await storage.updateWeeklyPlanStatus(planId, 'skipped', { skipReason: reason });
  }
  
  /**
   * Adjust a weekly plan (swap recipes, modify preferences)
   */
  static async adjustWeeklyPlan(
    planId: number, 
    userId: number, 
    adjustments: {
      swapRecipes?: Array<{ day: string; newRecipeId: number }>;
      newCuisineWeighting?: Record<string, number>;
    }
  ): Promise<WeeklyPlan> {
    const plan = await storage.getWeeklyPlan(planId);
    if (!plan || plan.userId !== userId) {
      throw new Error('Plan not found or access denied');
    }
    
    let updatedPlannedRecipes = [...plan.plannedRecipes];
    
    // Handle recipe swaps
    if (adjustments.swapRecipes) {
      for (const swap of adjustments.swapRecipes) {
        const mealIndex = updatedPlannedRecipes.findIndex(meal => meal.day === swap.day);
        if (mealIndex !== -1) {
          const newRecipe = await storage.getRecipe(swap.newRecipeId);
          if (newRecipe) {
            updatedPlannedRecipes[mealIndex] = {
              ...updatedPlannedRecipes[mealIndex],
              recipeId: newRecipe.id,
              recipeTitle: newRecipe.title,
              cookTime: newRecipe.cookTime || updatedPlannedRecipes[mealIndex].cookTime,
              servings: newRecipe.servings || updatedPlannedRecipes[mealIndex].servings
            };
          }
        }
      }
    }
    
    // Update plan
    const updates: Partial<WeeklyPlan> = {
      plannedRecipes: updatedPlannedRecipes,
      planStatus: 'adjusted',
      adjustedAt: new Date()
    };
    
    if (adjustments.newCuisineWeighting && plan.preferencesSnapshot) {
      updates.preferencesSnapshot = {
        ...plan.preferencesSnapshot,
        cuisineWeighting: adjustments.newCuisineWeighting
      };
    }
    
    return await storage.updateWeeklyPlan(planId, updates);
  }
}