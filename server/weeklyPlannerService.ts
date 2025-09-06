import { storage } from "./storage";
import type { WeeklyPlan, WeeklyPlanPreferences, InsertWeeklyPlan } from "@shared/schema";
import { MichelinChefAI } from "./openaiService";
import OpenAI from "openai";
import { smartProfilingService, type RecipeGenerationContext } from './services/smartProfilingService';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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

export interface ProposedRecipeTitle {
  day: string;
  title: string;
  cuisine: string;
  estimatedTime: number;
  description: string;
}

export interface WeeklyTitleProposal {
  titles: ProposedRecipeTitle[];
  totalEstimatedCost: number;
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
   * STEP 1: Generate cost-optimized recipe titles for user review
   */
  static async generateWeeklyTitles(
    mealCount: number,
    preferences: WeeklyPlanPreferences,
    avoidSimilarTo?: string,
    userId?: number // Added for smart profiling
  ): Promise<WeeklyTitleProposal> {
    
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const selectedDays = days.slice(0, mealCount);
    let cuisines = preferences.cuisinePreferences || [];
    
    // SMART PROFILING: Enhance Weekly Planner with user preferences
    let smartProfileLog = "No user profiling applied (Weekly Planner)";
    let enhancedPreferences = preferences;
    
    if (userId) {
      try {
        const generationContext: RecipeGenerationContext = {
          mode: 'weekly-planner',
          originalPrompt: `Weekly meal plan for ${mealCount} meals`,
          userPreferences: {
            cuisinePreference: cuisines.join(', '),
            timeBudget: preferences.timeComfort?.weeknight,
            dietaryNeeds: Array.isArray(preferences.dietaryNeeds) ? preferences.dietaryNeeds : [preferences.dietaryNeeds].filter(Boolean),
            servings: preferences.householdSize.adults + preferences.householdSize.kids
          }
        };
        
        const smartEnhancement = await smartProfilingService.enhanceRecipeGeneration(
          userId,
          generationContext
        );
        
        // For Weekly Planner, use profiling more aggressively since it's a planning tool
        if (smartEnhancement.confidenceLevel !== 'low') {
          // Extract cuisine suggestions from enhanced prompt
          const cuisineMatches = smartEnhancement.enhancedPrompt.match(/prefer\s+(\w+(?:\s+\w+)*)\s+cuisine/gi);
          if (cuisineMatches && cuisineMatches.length > 0) {
            const suggestedCuisines = cuisineMatches.map(match => {
              const cuisine = match.replace(/prefer\s+|cuisine/gi, '').trim();
              return cuisine.charAt(0).toUpperCase() + cuisine.slice(1);
            });
            // Merge with existing preferences, giving weight to user profile
            cuisines = [...new Set([...suggestedCuisines, ...cuisines])];
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
    
    // Build cost-optimized prompt for title generation
    const systemMessage = `You are a meal planning expert. Generate MASSIVELY DIVERSE, appealing dinner recipe titles for a weekly meal plan.

CRITICAL DIVERSITY REQUIREMENTS:
- Generate exactly ${mealCount} COMPLETELY DIFFERENT dinner recipes for: ${selectedDays.join(', ')}
- MANDATORY: Each recipe must use DIFFERENT cuisine, cooking method, and main protein
- MANDATORY: No two recipes should feel similar - maximize contrast between all dishes
- VARIED CUISINES: Mix from different continents (Asian, European, Latin American, Middle Eastern, African, etc.)
- VARIED PROTEINS: Fish, chicken, beef, pork, lamb, vegetarian, seafood - never repeat
- VARIED COOKING METHODS: Grilling, roasting, stir-frying, braising, baking, simmering, etc.
- VARIED FLAVORS: Spicy, mild, tangy, rich, fresh, smoky - create flavor contrast

HOUSEHOLD SPECS:
- Consider household: ${preferences.householdSize.adults} adults, ${preferences.householdSize.kids} kids
- Time preference: ${preferences.timeComfort.weeknight} minutes weeknights, ${preferences.timeComfort.weekend} minutes weekends
- Ambition level: ${preferences.ambitionLevel}
- Budget per serving: ${preferences.budgetPerServing ? `£${(preferences.budgetPerServing / 100).toFixed(2)}` : 'flexible'}
${preferences.dietaryNeeds ? `- Dietary needs: ${Array.isArray(preferences.dietaryNeeds) ? preferences.dietaryNeeds.join(', ') : preferences.dietaryNeeds}` : ''}
${cuisines.length ? `- Preferred cuisines: ${cuisines.join(', ')}` : ''}

CRITICAL JSON REQUIREMENTS:
- Return ONLY valid JSON, no text before or after
- Use double quotes for all strings
- No trailing commas
- Keep string values concise to avoid truncation
- Total response must be under 800 characters

OUTPUT FORMAT - JSON object with this EXACT structure (keep ALL strings under 50 characters):
{
  "recipes": [
    {
      "title": "Recipe Name Here (max 40 chars)",
      "cuisine": "Cuisine Type (max 20 chars)", 
      "estimatedTime": 45,
      "description": "Brief description (max 60 chars)"
    }
  ]
}

DIVERSITY MANDATE: Ensure maximum contrast between all recipes. Think "global food tour" - each day should transport the family to a completely different culinary world.
Make titles interesting and flavorful, avoid repetitive words like "herb-infused" or "bliss".
Focus on practical, family-friendly recipes that sound delicious and achievable.
${avoidSimilarTo ? `\n\nIMPORTANT: ${avoidSimilarTo}` : ''}`;

    const userMessage = `Generate ${mealCount} DRAMATICALLY DIFFERENT dinner recipe titles for the week. Each should feel like a completely different cuisine and cooking style. Maximum variety is essential - think global diversity across continents and cooking methods.`;

    try {
      console.log('Generating cost-optimized recipe titles...');
      console.log('Preferences received:', {
        householdSize: preferences.householdSize,
        timeComfort: preferences.timeComfort,
        ambitionLevel: preferences.ambitionLevel,
        dietaryNeeds: preferences.dietaryNeeds,
        cuisinePreferences: preferences.cuisinePreferences,
        budgetPerServing: preferences.budgetPerServing
      });
      const startTime = Date.now();
      
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini", // Cost-optimized model
        messages: [
          { role: "system", content: systemMessage },
          { role: "user", content: userMessage }
        ],
        max_tokens: 800, // Reduced token limit for titles only
        temperature: avoidSimilarTo ? 1.0 : 0.9, // High creativity for initial generation, maximum for regeneration
        response_format: { type: "json_object" }
      });

      const duration = Date.now() - startTime;
      console.log(`Title generation completed in ${duration}ms`);

      const responseContent = completion.choices[0]?.message?.content;
      if (!responseContent) {
        throw new Error("No response content from OpenAI");
      }

      // Parse and validate response
      const parsedResponse = JSON.parse(responseContent);
      const titles = parsedResponse.recipes || parsedResponse.titles || parsedResponse;
      
      if (!Array.isArray(titles) || titles.length === 0) {
        throw new Error("Invalid response format for recipe titles");
      }

      return {
        titles: titles.slice(0, mealCount).map((title: any, index: number) => ({
          day: selectedDays[index],
          title: title.title || `${selectedDays[index]} Dinner`,
          cuisine: title.cuisine || "International",
          estimatedTime: title.estimatedTime || parseInt(preferences.timeComfort) || 45,
          description: title.description || "Delicious homemade dinner"
        }))
      };

    } catch (error) {
      console.error("Error generating recipe titles:", error);
      
      // Fallback titles if AI generation fails
      const fallbackTitles = selectedDays.map((day, index) => ({
        day,
        title: `${day} Family Dinner`,
        cuisine: cuisines.length > 0 ? cuisines[index % cuisines.length] : "International",
        estimatedTime: parseInt(preferences.timeComfort) || 45,
        description: "A delicious family-friendly meal"
      }));

      return {
        titles: fallbackTitles
      };
    }
  }

  /**
   * STEP 2: Generate full recipes only for approved titles
   */
  static async generateSelectiveRecipes(
    approvedTitles: ProposedRecipeTitle[],
    preferences: WeeklyPlanPreferences,
    userId: number
  ): Promise<PlannedMeal[]> {
    
    console.log(`Generating ${approvedTitles.length} full recipes from approved titles...`);
    
    // Generate recipes in parallel but with cost-optimized model
    const recipePromises = approvedTitles.map(async (titleData) => {
      try {
        // Build focused prompt with specific title
        const systemMessage = `You are a professional chef creating a complete recipe. Generate a detailed, practical recipe for home cooking.

RECIPE SPECIFICATIONS:
- Title: "${titleData.title}"
- Cuisine: ${titleData.cuisine}
- Target time: ${titleData.estimatedTime} minutes
- Servings: ${preferences.householdSize.adults + preferences.householdSize.kids}
${preferences.dietaryNeeds?.length ? `- Dietary requirements: ${preferences.dietaryNeeds.join(', ')}` : ''}

CRITICAL JSON REQUIREMENTS:
- Return ONLY valid JSON, no text before or after
- Use double quotes for all strings
- No trailing commas
- Keep string values concise to avoid truncation
- Total response must be under 1200 characters

OUTPUT: JSON object with these exact fields (keep ALL strings under 80 characters):
- title: exact recipe title (max 60 chars)
- description: brief description (max 80 chars)
- cookTime: total minutes
- servings: number of servings
- difficulty: easy/medium/hard
- cuisine: cuisine type (max 20 chars)
- ingredients: array of ingredient strings (max 60 chars each)
- instructions: array of step strings (max 120 chars each)

Focus on clear, practical instructions that home cooks can follow confidently.`;

        const userMessage = `Create a complete recipe for "${titleData.title}" - a ${titleData.cuisine} dish taking about ${titleData.estimatedTime} minutes.`;

        const completion = await openai.chat.completions.create({
          model: "gpt-4o-mini", // Cost-optimized
          messages: [
            { role: "system", content: systemMessage },
            { role: "user", content: userMessage }
          ],
          max_tokens: 1200, // Focused on recipe details
          temperature: 0.3, // Lower temperature for consistency
          response_format: { type: "json_object" }
        });

        const responseContent = completion.choices[0]?.message?.content;
        if (!responseContent) {
          throw new Error(`No response for ${titleData.title}`);
        }

        const recipe = JSON.parse(responseContent);
        
        // Save recipe to database
        const savedRecipe = await storage.createRecipe({
          userId,
          title: recipe.title || titleData.title,
          description: recipe.description || titleData.description,
          cookTime: recipe.cookTime || titleData.estimatedTime,
          servings: recipe.servings || (preferences.householdSize.adults + preferences.householdSize.kids),
          difficulty: recipe.difficulty || "medium",
          cuisine: recipe.cuisine || titleData.cuisine,
          mode: "weekly",
          ingredients: recipe.ingredients || [],
          instructions: recipe.instructions || [],
          dietary: preferences.dietaryNeeds,
          ambition: preferences.ambitionLevel,
          cookingTime: recipe.cookTime || titleData.estimatedTime,
          originalPrompt: `Weekly meal plan: ${titleData.title}`
        });

        // Generate recipe image in background (don't await to avoid blocking)
        try {
          const { generateRecipeImageWithDallE, createRecipeImagePrompt } = await import('./imageGeneration');
          const imagePrompt = createRecipeImagePrompt(
            savedRecipe.title, 
            recipe.ingredients || [], 
            'appetizing', 
            recipe.cuisine || titleData.cuisine
          );
          generateRecipeImageWithDallE(imagePrompt).then(imageUrl => {
            if (imageUrl) {
              // Store the image URL in the recipe
              storage.updateRecipe(savedRecipe.id, { imageUrl }).catch(err => 
                console.error('Failed to update recipe with image URL:', err)
              );
              console.log('✅ Weekly planner recipe image generated:', savedRecipe.title);
            }
          }).catch(err => console.error('Weekly planner image generation failed:', err));
        } catch (imageError) {
          console.error('Error setting up image generation for weekly recipe:', imageError);
        }

        return {
          day: titleData.day,
          mealType: "dinner",
          recipeId: savedRecipe.id,
          recipeTitle: savedRecipe.title,
          cookTime: savedRecipe.cookTime ?? titleData.estimatedTime,
          servings: savedRecipe.servings || (preferences.householdSize.adults + preferences.householdSize.kids),
          isFlexible: true
        };

      } catch (error) {
        console.error(`Error generating recipe for ${titleData.title}:`, error);
        return this.createFallbackMeal(titleData.day, preferences, userId);
      }
    });

    const plannedMeals = await Promise.all(recipePromises);
    console.log(`Successfully generated ${plannedMeals.length} recipes`);
    
    return plannedMeals;
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
    if (existingPlan && existingPlan.planStatus !== 'pending') {
      // Only return existing plan if it's been accepted/finalized
      // Allow regeneration of pending plans
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
        cuisinePreferences: preferences.cuisinePreferences || [],
        ambitionLevel: preferences.ambitionLevel,
        dietaryNeeds: preferences.dietaryNeeds || [],
        budgetPerServing: preferences.budgetPerServing
      },
      consolidatedShoppingList: []
    };
    
    // If there's an existing pending plan, update it instead of creating duplicate
    if (existingPlan && existingPlan.planStatus === 'pending') {
      const updatedPlan = await storage.updateWeeklyPlan(existingPlan.id, {
        plannedRecipes,
        preferencesSnapshot: weeklyPlanData.preferencesSnapshot,
        generatedAt: new Date()
      });
      return updatedPlan;
    }
    
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
              servings: preferences.householdSize.adults + preferences.householdSize.kids,
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
              recipeId: clonedRecipe.id,
              servings: clonedRecipe.servings
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
            servings: baseData.servings, // Use household size instead of AI default
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
            servings: savedRecipe.servings || baseData.servings,
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