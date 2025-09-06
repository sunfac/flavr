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
  
  // OPTIMIZATION: Smart caching for weekly plans by preference fingerprint
  private static weeklyPlanCache = new Map<string, any>();
  private static cacheMaxSize = 50; // Store 50 preference combinations
  
  /**
   * Generate cache key from user preferences for intelligent caching
   */
  private static generatePreferenceCacheKey(preferences: WeeklyPlanPreferences, mealCount: number): string {
    const keyParts = [
      preferences.householdSize.adults,
      preferences.householdSize.kids,
      preferences.cookingFrequency,
      preferences.timeComfort,
      preferences.ambitionLevel,
      JSON.stringify(preferences.cuisineWeighting || {}),
      JSON.stringify(preferences.dietaryNeeds || []),
      preferences.budgetPerServing || "standard",
      mealCount
    ];
    return keyParts.join('|');
  }
  
  /**
   * Check if cached plan exists for these preferences
   */
  private static getCachedPlan(cacheKey: string): PlannedMeal[] | null {
    const cached = this.weeklyPlanCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < 24 * 60 * 60 * 1000) { // 24 hour cache
      console.log('Using cached weekly plan for preferences:', cacheKey.substring(0, 50) + '...');
      return cached.meals;
    }
    return null;
  }
  
  /**
   * Cache plan for future use
   */
  private static setCachedPlan(cacheKey: string, meals: PlannedMeal[]): void {
    // Implement LRU cache eviction
    if (this.weeklyPlanCache.size >= this.cacheMaxSize) {
      const firstKey = this.weeklyPlanCache.keys().next().value;
      if (firstKey) {
        this.weeklyPlanCache.delete(firstKey);
      }
    }
    
    this.weeklyPlanCache.set(cacheKey, {
      meals: meals,
      timestamp: Date.now()
    });
  }
  
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
   * Create high-quality planned meals using optimized batch generation with smart caching
   */
  private static async createQualityPlannedMeals(
    userId: number,
    mealCount: number,
    preferences: WeeklyPlanPreferences
  ): Promise<PlannedMeal[]> {
    
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const selectedDays = days.slice(0, mealCount);
    
    // OPTIMIZATION: Check cache first
    const cacheKey = this.generatePreferenceCacheKey(preferences, mealCount);
    const cachedPlan = this.getCachedPlan(cacheKey);
    
    if (cachedPlan) {
      // Clone cached recipes for this user
      const clonedMeals: PlannedMeal[] = [];
      for (const cachedMeal of cachedPlan) {
        try {
          // Get the recipe from storage and clone it for the new user
          const originalRecipe = await storage.getRecipe(cachedMeal.recipeId);
          if (originalRecipe) {
            const clonedRecipe = await storage.createRecipe({
              userId,
              title: originalRecipe.title,
              description: originalRecipe.description,
              cookTime: originalRecipe.cookTime,
              servings: originalRecipe.servings,
              difficulty: originalRecipe.difficulty,
              cuisine: originalRecipe.cuisine,
              mode: "weekly",
              ingredients: originalRecipe.ingredients,
              instructions: originalRecipe.instructions,
              dietary: preferences.dietaryNeeds,
              ambition: preferences.ambitionLevel,
              cookingTime: originalRecipe.cookingTime,
              originalPrompt: originalRecipe.originalPrompt
            });

            clonedMeals.push({
              ...cachedMeal,
              recipeId: clonedRecipe.id
            });
          }
        } catch (error) {
          console.error("Error cloning cached recipe:", error);
          // Fall through to generate fresh if cache fails
          break;
        }
      }
      
      if (clonedMeals.length === mealCount) {
        console.log(`Returning ${clonedMeals.length} cached recipes for user ${userId}`);
        return clonedMeals;
      }
    }

    // Build optimized quiz data from preferences
    const cuisines = Object.keys(preferences.cuisineWeighting || {});
    const baseData = {
      servings: preferences.householdSize.adults + preferences.householdSize.kids,
      timeBudget: preferences.timeComfort === "15" ? 15 : preferences.timeComfort === "30" ? 30 : preferences.timeComfort === "45" ? 45 : 60,
      dietaryNeeds: preferences.dietaryNeeds || [],
      budgetNote: preferences.budgetPerServing ? `${preferences.budgetPerServing} per serving` : "Quality-focused",
      equipment: ["Standard kitchen"],
      cuisinePreference: cuisines.length > 0 ? cuisines.join(", ") : "International",
      ambitionLevel: preferences.ambitionLevel
    };

    try {
      // OPTIMIZATION 1: Single batch call instead of individual recipe generation
      const batchRecipes = await this.generateWeeklyRecipeBatch(selectedDays, baseData, cuisines, userId);
      
      // OPTIMIZATION 2: Parallel database operations
      const recipePromises = batchRecipes.map(async (recipeData, index) => {
        const day = selectedDays[index];
        
        try {
          const savedRecipe = await storage.createRecipe({
            userId,
            title: recipeData.title,
            description: recipeData.description,
            cookTime: recipeData.cookTime,
            servings: recipeData.servings,
            difficulty: recipeData.difficulty,
            cuisine: recipeData.cuisine,
            mode: "weekly",
            ingredients: recipeData.ingredients,
            instructions: recipeData.instructions,
            dietary: preferences.dietaryNeeds,
            ambition: preferences.ambitionLevel,
            cookingTime: recipeData.cookTime,
            originalPrompt: `Weekly meal plan for ${day}: ${recipeData.title}`
          });

          return {
            day,
            mealType: "dinner",
            recipeId: savedRecipe.id,
            recipeTitle: savedRecipe.title,
            cookTime: savedRecipe.cookTime ?? recipeData.cookTime,
            servings: savedRecipe.servings || recipeData.servings,
            isFlexible: true
          };
        } catch (error) {
          console.error(`Error saving recipe for ${day}:`, error);
          return this.createFallbackMeal(day, preferences, userId);
        }
      });

      const plannedMeals = await Promise.all(recipePromises);
      
      // OPTIMIZATION: Cache successful plans for future use
      if (plannedMeals.length === mealCount) {
        this.setCachedPlan(cacheKey, plannedMeals);
      }
      
      return plannedMeals;
      
    } catch (error) {
      console.error("Error in batch recipe generation:", error);
      
      // Fallback to individual generation if batch fails
      return this.createFallbackMeals(selectedDays, preferences, userId);
    }
  }

  /**
   * OPTIMIZATION: Generate all weekly recipes using advanced batch processing with Chef Assist optimization
   */
  private static async generateWeeklyRecipeBatch(
    days: string[],
    baseData: any,
    cuisines: string[],
    userId: number
  ): Promise<any[]> {
    
    try {
      // OPTIMIZATION 1: Use parallel generation for each day with optimized prompts
      const recipePromises = days.map(async (day, index) => {
        // Rotate cuisines for variety
        const dayCuisine = cuisines.length > 0 ? cuisines[index % cuisines.length] : "International";
        
        // Build Chef Assist compatible prompt for this specific day
        const dayIntent = `${day} dinner recipe - ${dayCuisine} cuisine, ${baseData.timeBudget} minutes, ${baseData.servings} servings`;
        
        // Use direct MichelinChefAI call optimized for single recipe (fastest approach)
        return await MichelinChefAI.generateFullRecipe({
          title: `${day} ${dayCuisine} Dinner`,
          description: `Weekly planned ${dayCuisine} dinner for ${day}`,
          cookTime: baseData.timeBudget,
          servings: baseData.servings,
          difficulty: this.mapAmbitionToDifficulty(baseData.ambitionLevel),
          cuisine: dayCuisine
        }, {
          cuisine: [dayCuisine],
          cookingTime: baseData.timeBudget,
          dietary: baseData.dietaryNeeds,
          servings: baseData.servings,
          budget: baseData.budgetNote,
          equipment: baseData.equipment,
          mood: `${day} evening cooking - sophisticated home dining`,
          ambition: baseData.ambitionLevel
        }, "weekly");
      });

      // OPTIMIZATION 2: Execute all recipe generations in parallel
      const batchResults = await Promise.all(recipePromises);
      
      // Validate and return results
      return batchResults.filter(recipe => recipe && recipe.title);
      
    } catch (error) {
      console.error("Batch generation failed, falling back to sequential:", error);
      
      // FALLBACK: Sequential generation if parallel fails
      const recipes = [];
      for (let i = 0; i < days.length; i++) {
        try {
          const day = days[i];
          const dayCuisine = cuisines.length > 0 ? cuisines[i % cuisines.length] : "International";
          
          const recipe = await MichelinChefAI.generateFullRecipe({
            title: `${day} ${dayCuisine} Dinner`,
            description: `Weekly planned ${dayCuisine} dinner for ${day}`,
            cookTime: baseData.timeBudget,
            servings: baseData.servings,
            difficulty: this.mapAmbitionToDifficulty(baseData.ambitionLevel),
            cuisine: dayCuisine
          }, {
            cuisine: [dayCuisine],
            cookingTime: baseData.timeBudget,
            dietary: baseData.dietaryNeeds,
            servings: baseData.servings,
            budget: baseData.budgetNote,
            equipment: baseData.equipment,
            mood: `${day} evening cooking - sophisticated home dining`
          }, "weekly");
          
          if (recipe && recipe.title) {
            recipes.push(recipe);
          }
        } catch (dayError) {
          console.error(`Failed to generate recipe for ${days[i]}:`, dayError);
          // Continue with other days
        }
      }
      
      return recipes;
    }
  }

  /**
   * Map ambition level to difficulty for consistency with other cooking modes
   */
  private static mapAmbitionToDifficulty(ambitionLevel?: string): string {
    switch (ambitionLevel) {
      case "simple": return "easy";
      case "medium": return "medium";
      case "adventurous": return "hard";
      default: return "medium";
    }
  }

  /**
   * Create fallback meal for error cases
   */
  private static async createFallbackMeal(day: string, preferences: WeeklyPlanPreferences, userId: number): Promise<PlannedMeal> {
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

    return {
      day,
      mealType: "dinner",
      recipeId: fallbackRecipe.id,
      recipeTitle: fallbackRecipe.title,
      cookTime: 30,
      servings: fallbackRecipe.servings || (preferences.householdSize.adults + preferences.householdSize.kids),
      isFlexible: true
    };
  }

  /**
   * Create fallback meals for complete batch failure
   */
  private static async createFallbackMeals(days: string[], preferences: WeeklyPlanPreferences, userId: number): Promise<PlannedMeal[]> {
    const fallbackPromises = days.map(day => this.createFallbackMeal(day, preferences, userId));
    return Promise.all(fallbackPromises);
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