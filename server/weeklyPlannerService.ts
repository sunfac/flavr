import { storage } from "./storage";
import type { WeeklyPlan, WeeklyPlanPreferences, InsertWeeklyPlan } from "@shared/schema";
import { convertToUKIngredients, convertToUKMeasurements } from "./ukIngredientMappings";
import { MichelinChefAI } from "./michelinChefAI";

// Simple UK recipe converter for weekly planning
function convertRecipeToUKEnglish(recipe: any): any {
  const convertedRecipe = { ...recipe };
  
  // Convert ingredients
  if (convertedRecipe.ingredients && Array.isArray(convertedRecipe.ingredients)) {
    convertedRecipe.ingredients = convertedRecipe.ingredients.map((ingredient: string) => {
      return convertToUKIngredients(convertToUKMeasurements(ingredient));
    });
  }
  
  // Convert instructions
  if (convertedRecipe.instructions && Array.isArray(convertedRecipe.instructions)) {
    convertedRecipe.instructions = convertedRecipe.instructions.map((instruction: any) => {
      if (typeof instruction === 'string') {
        return convertToUKIngredients(convertToUKMeasurements(instruction));
      }
      return instruction;
    });
  }
  
  return convertedRecipe;
}

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
    
    // Generate recipes for the week
    const plannedRecipes = await this.generateWeeklyRecipes(
      userId, 
      preferences, 
      mealCount,
      isFlavrPlus
    );
    
    // Create consolidated shopping list
    const consolidatedShoppingList = await this.createConsolidatedShoppingList(plannedRecipes);
    
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
      consolidatedShoppingList
    };
    
    const newPlan = await storage.createWeeklyPlan(weeklyPlanData);
    return newPlan;
  }
  
  /**
   * Generate recipes for the weekly plan using existing MichelinChefAI
   */
  private static async generateWeeklyRecipes(
    userId: number,
    preferences: WeeklyPlanPreferences,
    mealCount: number,
    isFlavrPlus: boolean
  ): Promise<PlannedMeal[]> {
    
    const plannedMeals: PlannedMeal[] = [];
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    
    // Distribute meals across the week based on cooking frequency
    const mealDays = this.selectMealDays(days, mealCount, preferences);
    
    for (let i = 0; i < mealDays.length; i++) {
      const day = mealDays[i];
      
      // Determine if this is a weeknight or weekend
      const isWeekend = day === 'saturday' || day === 'sunday';
      const maxCookTime = isWeekend 
        ? preferences.timeComfort.weekend 
        : preferences.timeComfort.weeknight;
      
      // Create recipe generation prompt
      const recipePrompt = this.createRecipePrompt(preferences, maxCookTime, isWeekend, i);
      
      try {
        // Use MichelinChefAI for high-quality recipe generation
        const michelinChef = new MichelinChefAI();
        
        const quizData = {
          servings: preferences.householdSize.adults + preferences.householdSize.kids,
          dietary: preferences.dietaryNeeds,
          cookingTime: maxCookTime,
          ambition: preferences.ambitionLevel
        };
        
        // Generate recipe using MichelinChefAI
        const rawRecipe = await michelinChef.generateRecipe(recipePrompt, quizData, "weekly");
        const convertedRecipe = convertRecipeToUKEnglish(rawRecipe);
          
        // Save recipe to database
        const savedRecipe = await storage.createRecipe({
          userId,
          title: convertedRecipe.title || `${day.charAt(0).toUpperCase() + day.slice(1)} Dinner`,
          description: convertedRecipe.description || "Weekly planned meal",
          cookTime: convertedRecipe.cookTime || maxCookTime,
          servings: convertedRecipe.servings || (preferences.householdSize.adults + preferences.householdSize.kids),
          difficulty: convertedRecipe.difficulty || this.mapAmbitionToDifficulty(preferences.ambitionLevel),
          cuisine: convertedRecipe.cuisine || "Mixed",
          mode: "weekly",
          ingredients: convertedRecipe.ingredients || [],
          instructions: convertedRecipe.instructions || [],
          tips: convertedRecipe.tips,
          dietary: preferences.dietaryNeeds,
          ambition: preferences.ambitionLevel,
          cookingTime: maxCookTime,
          originalPrompt: recipePrompt
        });
          
          // Add to planned meals
          plannedMeals.push({
            day,
            mealType: "dinner",
            recipeId: savedRecipe.id,
            recipeTitle: savedRecipe.title,
            cookTime: savedRecipe.cookTime || maxCookTime,
            servings: savedRecipe.servings || (preferences.householdSize.adults + preferences.householdSize.kids),
            isFlexible: !isWeekend // Weekday meals are more flexible for swapping
          });
        }
        
      } catch (error) {
        console.error(`Failed to generate recipe for ${day}:`, error);
        // Continue with other days even if one fails
      }
    }
    
    return plannedMeals;
  }
  
  /**
   * Select which days to cook based on frequency and preferences
   */
  private static selectMealDays(days: string[], mealCount: number, preferences: WeeklyPlanPreferences): string[] {
    // Default pattern: prioritize weekdays, include weekends if higher frequency
    const weekdays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
    const weekends = ['saturday', 'sunday'];
    
    const selectedDays: string[] = [];
    
    if (mealCount <= 3) {
      // Low frequency: Tuesday, Thursday, Sunday pattern
      selectedDays.push('tuesday', 'thursday');
      if (mealCount === 3) selectedDays.push('sunday');
    } else if (mealCount <= 5) {
      // Medium frequency: Monday, Tuesday, Thursday, Friday, Sunday
      selectedDays.push('monday', 'tuesday', 'thursday', 'friday');
      if (mealCount === 5) selectedDays.push('sunday');
    } else {
      // High frequency: Most days except Wednesday
      selectedDays.push('monday', 'tuesday', 'thursday', 'friday', 'saturday', 'sunday');
    }
    
    return selectedDays.slice(0, mealCount);
  }
  
  /**
   * Create recipe generation prompt based on preferences and context
   */
  private static createRecipePrompt(
    preferences: WeeklyPlanPreferences,
    maxCookTime: number,
    isWeekend: boolean,
    mealIndex: number
  ): string {
    const { householdSize, ambitionLevel, dietaryNeeds, cuisineWeighting } = preferences;
    
    const totalPeople = householdSize.adults + householdSize.kids;
    const hasKids = householdSize.kids > 0;
    
    // Select cuisine based on weighting or default variety
    const availableCuisines = Object.keys(cuisineWeighting || {});
    let selectedCuisine = "";
    
    if (availableCuisines.length > 0) {
      // Weighted random selection
      selectedCuisine = this.selectWeightedCuisine(cuisineWeighting!);
    } else {
      // Default variety for unset preferences
      const defaultCuisines = ['British', 'Italian', 'Asian', 'Mediterranean', 'Mexican'];
      selectedCuisine = defaultCuisines[mealIndex % defaultCuisines.length];
    }
    
    const mealContext = isWeekend ? "weekend family meal" : "weeknight dinner";
    const timeContext = isWeekend ? "with more time to cook" : "after a busy day";
    
    let prompt = `Create a ${selectedCuisine} ${mealContext} recipe for ${totalPeople} people`;
    
    if (hasKids) {
      prompt += ` (including ${householdSize.kids} children, so family-friendly)`;
    }
    
    prompt += `. Maximum cooking time: ${maxCookTime} minutes ${timeContext}.`;
    
    // Add ambition level context
    if (ambitionLevel === "quick_simple") {
      prompt += " Keep it simple with minimal prep and common ingredients.";
    } else if (ambitionLevel === "experimental_creative") {
      prompt += " Feel free to be creative with interesting flavor combinations and techniques.";
    }
    
    // Add dietary restrictions
    if (dietaryNeeds.length > 0) {
      prompt += ` Must be ${dietaryNeeds.join(", ")} friendly.`;
    }
    
    prompt += " Focus on fresh, seasonal ingredients and balanced nutrition.";
    
    return prompt;
  }
  
  /**
   * Select cuisine based on user's weighting preferences
   */
  private static selectWeightedCuisine(cuisineWeighting: Record<string, number>): string {
    const random = Math.random() * 100;
    let cumulative = 0;
    
    for (const [cuisine, weight] of Object.entries(cuisineWeighting)) {
      cumulative += weight;
      if (random <= cumulative) {
        return cuisine;
      }
    }
    
    // Fallback to first cuisine if weighting doesn't add up to 100
    return Object.keys(cuisineWeighting)[0];
  }
  
  /**
   * Map ambition level to recipe difficulty
   */
  private static mapAmbitionToDifficulty(ambitionLevel: string): string {
    switch (ambitionLevel) {
      case "quick_simple": return "easy";
      case "experimental_creative": return "medium";
      default: return "easy";
    }
  }
  
  /**
   * Create consolidated shopping list from planned recipes
   */
  private static async createConsolidatedShoppingList(plannedMeals: PlannedMeal[]) {
    const consolidatedList: Array<{
      ingredient: string;
      quantity: string;
      aisle: string;
      recipes: string[];
    }> = [];
    
    // Get all recipes
    const recipes = await Promise.all(
      plannedMeals.map(meal => storage.getRecipe(meal.recipeId))
    );
    
    const ingredientMap = new Map<string, {
      quantity: string;
      aisle: string;
      recipes: string[];
    }>();
    
    // Process each recipe's ingredients
    recipes.forEach((recipe, index) => {
      if (!recipe?.ingredients) return;
      
      recipe.ingredients.forEach(ingredient => {
        const normalizedIngredient = ingredient.toLowerCase();
        const recipeName = plannedMeals[index].recipeTitle;
        
        if (ingredientMap.has(normalizedIngredient)) {
          const existing = ingredientMap.get(normalizedIngredient)!;
          existing.recipes.push(recipeName);
        } else {
          ingredientMap.set(normalizedIngredient, {
            quantity: ingredient, // Keep original formatting
            aisle: this.categorizeIngredient(ingredient),
            recipes: [recipeName]
          });
        }
      });
    });
    
    // Convert map to array
    ingredientMap.forEach((data, ingredient) => {
      consolidatedList.push({
        ingredient,
        quantity: data.quantity,
        aisle: data.aisle,
        recipes: data.recipes
      });
    });
    
    // Sort by aisle for shopping efficiency
    return consolidatedList.sort((a, b) => a.aisle.localeCompare(b.aisle));
  }
  
  /**
   * Categorize ingredient by supermarket aisle (UK-focused)
   */
  private static categorizeIngredient(ingredient: string): string {
    const lower = ingredient.toLowerCase();
    
    if (lower.includes('milk') || lower.includes('cheese') || lower.includes('yogurt') || 
        lower.includes('butter') || lower.includes('cream')) return 'Dairy';
    
    if (lower.includes('chicken') || lower.includes('beef') || lower.includes('lamb') || 
        lower.includes('pork') || lower.includes('fish') || lower.includes('salmon')) return 'Meat & Fish';
    
    if (lower.includes('bread') || lower.includes('flour') || lower.includes('pasta') || 
        lower.includes('rice') || lower.includes('cereal')) return 'Bakery & Grains';
    
    if (lower.includes('apple') || lower.includes('banana') || lower.includes('orange') || 
        lower.includes('berry') || lower.includes('grape')) return 'Fresh Fruit';
    
    if (lower.includes('potato') || lower.includes('carrot') || lower.includes('onion') || 
        lower.includes('tomato') || lower.includes('lettuce') || lower.includes('pepper')) return 'Fresh Vegetables';
    
    if (lower.includes('tin') || lower.includes('can') || lower.includes('jar') || 
        lower.includes('sauce') || lower.includes('oil')) return 'Tinned & Jarred';
    
    if (lower.includes('frozen')) return 'Frozen';
    
    return 'General Grocery';
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
    
    if (adjustments.newCuisineWeighting) {
      updates.preferencesSnapshot = {
        ...plan.preferencesSnapshot,
        cuisineWeighting: adjustments.newCuisineWeighting
      };
    }
    
    return await storage.updateWeeklyPlan(planId, updates);
  }
}