import { storage } from "./storage";
import type { WeeklyPlan, WeeklyPlanPreferences, InsertWeeklyPlan } from "@shared/schema";
import { MichelinChefAI } from "./openaiService";

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
    
    // Generate high-quality recipes using MichelinChefAI system
    const plannedRecipes = await this.createQualityPlannedMeals(userId, mealCount, preferences);
    
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
   * Create high-quality planned meals using MichelinChefAI system
   */
  private static async createQualityPlannedMeals(
    userId: number,
    mealCount: number,
    preferences: WeeklyPlanPreferences
  ): Promise<PlannedMeal[]> {
    
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const selectedDays = days.slice(0, mealCount);
    const plannedMeals: PlannedMeal[] = [];
    
    // Build enhanced quiz data from preferences
    const cuisines = Object.keys(preferences.cuisineWeighting || {});
    const quizData = {
      cuisine: cuisines.length > 0 ? cuisines : ["International"],
      cookingTime: preferences.timeComfort === "quick" ? 30 : preferences.timeComfort === "standard" ? 60 : 90,
      ambition: preferences.ambitionLevel,
      dietary: preferences.dietaryNeeds || [],
      servings: preferences.householdSize.adults + preferences.householdSize.kids,
      budget: preferences.budgetPerServing ? `${preferences.budgetPerServing} per serving` : "Quality-focused",
      mood: "Weekly meal planning with variety and flavor",
      equipment: ["Standard kitchen"]
    };
    
    for (let i = 0; i < selectedDays.length; i++) {
      const day = selectedDays[i];
      
      try {
        // Generate recipe ideas for this day with cuisine variety
        const dayQuizData = {
          ...quizData,
          cuisine: cuisines.length > 0 ? [cuisines[i % cuisines.length]] : ["International"],
          mood: `${day} dinner - ${quizData.mood}`
        };
        
        // Generate recipe ideas
        const recipeIdeas = await MichelinChefAI.generateRecipeIdeas(dayQuizData, "weekly");
        
        if (recipeIdeas?.recipes && recipeIdeas.recipes.length > 0) {
          // Select the first recipe idea
          const selectedRecipe = recipeIdeas.recipes[0];
          
          // Generate full recipe
          const fullRecipe = await MichelinChefAI.generateFullRecipe(selectedRecipe, dayQuizData, "weekly");
          
          // Create the recipe in the database
          const savedRecipe = await storage.createRecipe({
            userId,
            title: fullRecipe.title,
            description: fullRecipe.description,
            cookTime: fullRecipe.cookTime,
            servings: fullRecipe.servings,
            difficulty: fullRecipe.difficulty,
            cuisine: fullRecipe.cuisine,
            mode: "weekly",
            ingredients: fullRecipe.ingredients,
            instructions: fullRecipe.instructions,
            dietary: preferences.dietaryNeeds,
            ambition: preferences.ambitionLevel,
            cookingTime: fullRecipe.cookTime,
            originalPrompt: `Weekly meal plan for ${day}: ${fullRecipe.title}`
          });
          
          plannedMeals.push({
            day,
            mealType: "dinner",
            recipeId: savedRecipe.id,
            recipeTitle: savedRecipe.title,
            cookTime: savedRecipe.cookTime ?? fullRecipe.cookTime,
            servings: savedRecipe.servings || fullRecipe.servings,
            isFlexible: true
          });
        }
      } catch (error) {
        console.error(`Error generating recipe for ${day}:`, error);
        
        // Fallback to a simple recipe if AI generation fails
        const fallbackRecipe = await storage.createRecipe({
          userId,
          title: `${day} Dinner`,
          description: `Planned meal for ${day}`,
          cookTime: 30,
          servings: preferences.householdSize.adults + preferences.householdSize.kids,
          difficulty: "easy",
          cuisine: "International",
          mode: "weekly",
          ingredients: ["Please regenerate this recipe"],
          instructions: ["This recipe needs to be regenerated"],
          dietary: preferences.dietaryNeeds,
          ambition: preferences.ambitionLevel,
          cookingTime: 30,
          originalPrompt: `Fallback recipe for ${day}`
        });
        
        plannedMeals.push({
          day,
          mealType: "dinner",
          recipeId: fallbackRecipe.id,
          recipeTitle: fallbackRecipe.title,
          cookTime: 30,
          servings: fallbackRecipe.servings || (preferences.householdSize.adults + preferences.householdSize.kids),
          isFlexible: true
        });
      }
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