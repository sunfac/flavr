// === BACKWARD-COMPATIBLE SHIM FOR WeeklyPlannerService ===
// This file maintains the exact same API as the original WeeklyPlannerService
// but uses the new AIProvider system under the hood

import { AIService } from './aiProviderInit';
import { smartProfilingService, type RecipeGenerationContext } from './services/smartProfilingService';
// import { generateVarietyNotes } from './varietyTracker'; // Module doesn't exist - removed
import type { WeeklyPlanPreferences, PlannedMeal } from '@shared/aiSchemas';

// Keep original interfaces for backward compatibility
export interface ProposedRecipeTitle {
  day: string;
  title: string;
  cuisine: string;
  estimatedTime: number;
  description: string;
}

export class WeeklyPlannerService {
  
  // Cache for intelligent caching (keep original caching logic)
  private static weeklyPlanCache = new Map<string, any>();
  private static cacheMaxSize = 50;
  
  /**
   * Generate cache key from user preferences for intelligent caching
   */
  private static generatePreferenceCacheKey(preferences: WeeklyPlanPreferences, mealCount: number): string {
    const keyParts = [
      preferences.householdSize.adults,
      preferences.householdSize.kids,
      preferences.cookingFrequency,
      JSON.stringify(preferences.timeComfort),
      preferences.ambitionLevel,
      JSON.stringify(preferences.cuisineWeighting || {}),
      JSON.stringify(preferences.dietaryNeeds || []),
      preferences.budgetPerServing || "standard",
      mealCount
    ];
    return keyParts.join('|');
  }
  
  /**
   * STEP 1: Generate diverse recipe titles using AIProvider system
   */
  static async generateWeeklyTitles(
    preferences: WeeklyPlanPreferences,
    mealCount: number,
    userId?: number,
    avoidSimilarTo?: string
  ): Promise<{ titles: ProposedRecipeTitle[] }> {
    
    console.log("🔄 WeeklyPlannerService.generateWeeklyTitles (via AIProvider)");
    
    try {
      // Check cache first (keep original caching logic)
      const cacheKey = this.generatePreferenceCacheKey(preferences, mealCount);
      if (this.weeklyPlanCache.has(cacheKey)) {
        console.log('📦 Using cached weekly titles');
        return this.weeklyPlanCache.get(cacheKey);
      }
      
      // Apply smart profiling (keep original profiling logic)
      let smartProfileLog = "No user profiling applied (Weekly Planner)";
      let enhancedPreferences = preferences;
      
      if (userId) {
        try {
          const generationContext: RecipeGenerationContext = {
            mode: 'weekly-planner',
            originalPrompt: `Weekly meal plan for ${mealCount} meals`,
            userPreferences: {
              cuisinePreference: preferences.cuisinePreferences?.join(', ') || 'varied',
              timeBudget: preferences.timeComfort?.weeknight,
              dietaryNeeds: Array.isArray(preferences.dietaryNeeds) ? preferences.dietaryNeeds : [preferences.dietaryNeeds].filter(Boolean),
              servings: preferences.householdSize.adults + preferences.householdSize.kids
            }
          };
          
          const smartEnhancement = await smartProfilingService.enhanceRecipeGeneration(
            userId,
            generationContext
          );
          
          // Apply smart profiling enhancements if confidence is high enough
          if (smartEnhancement.confidenceLevel !== 'low') {
            const cuisineMatches = smartEnhancement.enhancedPrompt.match(/prefer\s+(\w+(?:\s+\w+)*)\s+cuisine/gi);
            if (cuisineMatches && cuisineMatches.length > 0) {
              const suggestedCuisines = cuisineMatches.map(match => {
                const cuisine = match.replace(/prefer\s+|cuisine/gi, '').trim();
                return cuisine.charAt(0).toUpperCase() + cuisine.slice(1);
              });
              
              // Merge with existing preferences
              const existingCuisines = preferences.cuisinePreferences || [];
              enhancedPreferences = {
                ...preferences,
                cuisinePreferences: Array.from(new Set([...suggestedCuisines, ...existingCuisines]))
              };
            }
            
            smartProfileLog = `Profile applied (${smartEnhancement.confidenceLevel} confidence, ${smartEnhancement.diversityBoost}% diversity): ${smartEnhancement.reasoning.slice(0, 2).join(', ')}`;
          } else {
            smartProfileLog = `Profile not used: ${smartEnhancement.reasoning[0]}`;
          }
          
          console.log(`🧠 Weekly Planner Smart Profiling: ${smartProfileLog}`);
          
        } catch (error) {
          console.error("Smart profiling failed for Weekly Planner:", error);
          smartProfileLog = "Profiling error - using original preferences";
        }
      }
      
      // Get client ID for variety tracking
      const clientId = userId?.toString() || 'anonymous';
      
      // Use AIProvider system for weekly plan generation
      const weeklyPlanResponse = await AIService.generateWeeklyTitles({
        preferences: enhancedPreferences,
        totalMeals: mealCount,
        avoidSimilarTo,
        variant: "balanced_planning"
      }, {
        userId,
        traceId: `weekly-titles-${Date.now()}`,
        maxTokens: 2000,
        stream: false,
        timeoutMs: 30000,
        retries: 2
      });
      
      // Transform AIProvider response to match original format
      const generatedTitles: ProposedRecipeTitle[] = weeklyPlanResponse.plannedMeals.map((meal, index) => {
        const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
        const day = meal.day || days[index % days.length];
        
        return {
          day: day,
          title: meal.recipeTitle,
          cuisine: meal.cuisine || "International",
          estimatedTime: meal.cookTime || preferences.timeComfort?.weeknight || 45,
          description: meal.description || `A delicious ${meal.cuisine} meal perfect for ${day}`
        };
      });
      
      // Ensure we have the exact number of meals requested
      while (generatedTitles.length < mealCount) {
        const fallbackDay = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'][generatedTitles.length % 7];
        generatedTitles.push({
          day: fallbackDay,
          title: `${fallbackDay.charAt(0).toUpperCase() + fallbackDay.slice(1)} Family Dinner`,
          cuisine: "International",
          estimatedTime: preferences.timeComfort?.weeknight || 45,
          description: "A delicious family-friendly meal"
        });
      }
      
      // Trim to exact count
      const finalTitles = generatedTitles.slice(0, mealCount);
      
      // Cache the result
      if (this.weeklyPlanCache.size >= this.cacheMaxSize) {
        const firstKey = this.weeklyPlanCache.keys().next().value;
        this.weeklyPlanCache.delete(firstKey);
      }
      
      const result = { titles: finalTitles };
      this.weeklyPlanCache.set(cacheKey, result);
      
      console.log(`✅ Generated ${finalTitles.length} weekly titles via AIProvider`);
      return result;
      
    } catch (error) {
      console.error("❌ Weekly titles generation failed, using fallback:", error);
      
      // Fallback titles if AI generation fails
      const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
      const cuisines = preferences.cuisinePreferences || ["Italian", "Asian", "British", "Mediterranean", "International"];
      
      const fallbackTitles = Array.from({ length: mealCount }, (_, index) => {
        const day = days[index % days.length];
        const cuisine = cuisines[index % cuisines.length];
        
        return {
          day,
          title: `${day.charAt(0).toUpperCase() + day.slice(1)} ${cuisine} Dinner`,
          cuisine,
          estimatedTime: preferences.timeComfort?.weeknight || 45,
          description: `A delicious ${cuisine} meal for the family`
        };
      });

      return { titles: fallbackTitles };
    }
  }
  
  /**
   * STEP 2: Generate full recipes only for approved titles using AIProvider
   */
  static async generateSelectiveRecipes(
    approvedTitles: ProposedRecipeTitle[],
    preferences: WeeklyPlanPreferences,
    userId: number
  ): Promise<PlannedMeal[]> {
    
    console.log(`🔄 WeeklyPlannerService.generateSelectiveRecipes (via AIProvider) - ${approvedTitles.length} recipes`);
    
    try {
      // Generate recipes in parallel using AIProvider
      const recipePromises = approvedTitles.map(async (titleData, index) => {
        try {
          // Use AIProvider for full recipe generation
          const recipeResponse = await AIService.generateRecipe({
            request: titleData.title,
            preferences: {
              difficulty: this.mapAmbitionTodifficulty(preferences.ambitionLevel),
              cuisine: titleData.cuisine,
              servings: preferences.householdSize.adults + preferences.householdSize.kids,
              timeConstraint: titleData.estimatedTime,
              dietaryRestrictions: Array.isArray(preferences.dietaryNeeds) 
                ? preferences.dietaryNeeds 
                : [preferences.dietaryNeeds].filter(Boolean)
            },
            mode: "weekly-planner",
            variant: "michelin_quality"
          }, {
            userId,
            traceId: `weekly-recipe-${index}-${Date.now()}`,
            maxTokens: 3000,
            stream: false,
            timeoutMs: 45000,
            retries: 2
          });
          
          // Transform to PlannedMeal format
          const plannedMeal: PlannedMeal = {
            day: titleData.day,
            mealType: "dinner",
            recipeTitle: recipeResponse.title,
            cuisine: recipeResponse.cuisine || titleData.cuisine,
            cookTime: recipeResponse.cookTime,
            servings: recipeResponse.servings,
            difficulty: recipeResponse.difficulty,
            isFlexible: true,
            description: recipeResponse.description
          };
          
          console.log(`✅ Generated recipe via AIProvider: ${recipeResponse.title}`);
          return plannedMeal;
          
        } catch (error) {
          console.error(`❌ Failed to generate recipe for ${titleData.title}:`, error);
          
          // Return fallback planned meal
          return {
            day: titleData.day,
            mealType: "dinner" as const,
            recipeTitle: titleData.title,
            cuisine: titleData.cuisine,
            cookTime: titleData.estimatedTime,
            servings: preferences.householdSize.adults + preferences.householdSize.kids,
            difficulty: "Medium" as const,
            isFlexible: true,
            description: titleData.description
          };
        }
      });
      
      const plannedMeals = await Promise.all(recipePromises);
      
      console.log(`✅ Generated ${plannedMeals.length} complete recipes for weekly plan`);
      return plannedMeals;
      
    } catch (error) {
      console.error("❌ Selective recipe generation failed:", error);
      
      // Return fallback planned meals
      return approvedTitles.map(titleData => ({
        day: titleData.day,
        mealType: "dinner" as const,
        recipeTitle: titleData.title,
        cuisine: titleData.cuisine,
        cookTime: titleData.estimatedTime,
        servings: preferences.householdSize.adults + preferences.householdSize.kids,
        difficulty: "Medium" as const,
        isFlexible: true,
        description: titleData.description
      }));
    }
  }
  
  /**
   * Create and store a complete weekly plan (keep original storage logic)
   */
  static async createWeeklyPlan(
    plannedMeals: PlannedMeal[],
    preferences: WeeklyPlanPreferences,
    userId: number,
    weekStartDate?: string
  ): Promise<any> {
    
    // Use original storage logic but import from storage
    const { storage } = await import('./storage');
    
    try {
      const weekStart = weekStartDate ? new Date(weekStartDate) : this.getNextMonday();
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      
      // Build complete weekly plan data
      const weeklyPlanData = {
        userId,
        weekStartDate: weekStart,
        weekEndDate: weekEnd,
        planStatus: 'pending' as const,
        plannedRecipes: plannedMeals.map(meal => ({
          day: meal.day,
          mealType: meal.mealType,
          recipeId: 0, // Will be filled when recipes are created
          recipeTitle: meal.recipeTitle,
          cookTime: meal.cookTime,
          servings: meal.servings,
          isFlexible: meal.isFlexible || true
        })),
        preferencesSnapshot: {
          householdSize: preferences.householdSize,
          cookingFrequency: preferences.cookingFrequency,
          timeComfort: preferences.timeComfort,
          cuisineWeighting: preferences.cuisineWeighting || {},
          ambitionLevel: preferences.ambitionLevel,
          dietaryNeeds: Array.isArray(preferences.dietaryNeeds) 
            ? preferences.dietaryNeeds 
            : [preferences.dietaryNeeds].filter(Boolean),
          budgetPerServing: preferences.budgetPerServing
        }
      };
      
      // Create the weekly plan in database
      const newPlan = await storage.createWeeklyPlan(weeklyPlanData);
      return newPlan;
      
    } catch (error) {
      console.error("Failed to create weekly plan:", error);
      throw error;
    }
  }
  
  // === UTILITY METHODS (Keep original implementations) ===
  
  private static mapAmbitionTodifficulty(ambitionLevel: string): "Easy" | "Medium" | "Hard" {
    switch (ambitionLevel) {
      case 'quick_simple': return 'Easy';
      case 'balanced': return 'Medium';
      case 'experimental_creative': return 'Hard';
      default: return 'Medium';
    }
  }
  
  private static getNextMonday(): Date {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const daysUntilMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek; // 0 is Sunday
    const nextMonday = new Date(now);
    nextMonday.setDate(now.getDate() + daysUntilMonday);
    nextMonday.setHours(0, 0, 0, 0);
    return nextMonday;
  }
  
  /**
   * Accept a weekly plan (keep original logic)
   */
  static async acceptWeeklyPlan(planId: number, userId: number): Promise<any> {
    const { storage } = await import('./storage');
    
    try {
      // Update plan status to accepted
      const updatedPlan = await storage.updateWeeklyPlan(planId, {
        planStatus: 'accepted',
        acceptedAt: new Date()
      });
      
      console.log(`✅ Weekly plan ${planId} accepted by user ${userId}`);
      return updatedPlan;
      
    } catch (error) {
      console.error(`Failed to accept weekly plan ${planId}:`, error);
      throw error;
    }
  }
  
  /**
   * Skip a weekly plan (keep original logic)
   */
  static async skipWeeklyPlan(planId: number, userId: number, reason?: string): Promise<any> {
    const { storage } = await import('./storage');
    
    try {
      const updatedPlan = await storage.updateWeeklyPlan(planId, {
        planStatus: 'skipped',
        skipReason: reason || 'User skipped'
      });
      
      console.log(`⏭️ Weekly plan ${planId} skipped by user ${userId}: ${reason}`);
      return updatedPlan;
      
    } catch (error) {
      console.error(`Failed to skip weekly plan ${planId}:`, error);
      throw error;
    }
  }
  
  /**
   * Adjust weekly plan preferences (keep original logic)
   */
  static async adjustWeeklyPlan(
    planId: number,
    userId: number,
    adjustments: Partial<WeeklyPlanPreferences>
  ): Promise<any> {
    const { storage } = await import('./storage');
    
    try {
      // Apply adjustments and regenerate if needed
      const plan = await storage.getWeeklyPlan(planId);
      
      if (!plan || plan.userId !== userId) {
        throw new Error('Plan not found or access denied');
      }
      
      // Update plan with adjustments
      const updatedPlan = await storage.updateWeeklyPlan(planId, {
        planStatus: 'adjusted',
        adjustedAt: new Date(),
        preferencesSnapshot: {
          ...plan.preferencesSnapshot,
          ...adjustments
        }
      });
      
      console.log(`🔧 Weekly plan ${planId} adjusted by user ${userId}`);
      return updatedPlan;
      
    } catch (error) {
      console.error(`Failed to adjust weekly plan ${planId}:`, error);
      throw error;
    }
  }
}