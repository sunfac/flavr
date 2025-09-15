import type { Express } from "express";
import { storage } from "../storage";
import { WeeklyPlannerService, type ProposedRecipeTitle } from "../weeklyPlannerService";

export function registerWeeklyPlanRoutes(app: Express) {
  
  // Get user's weekly planning preferences
  app.get("/api/weekly-plan-preferences", async (req, res) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const userId = req.session!.userId!;
      const preferences = await storage.getWeeklyPlanPreferences(userId);
      
      if (!preferences) {
        return res.json({ onboardingRequired: true });
      }
      
      res.json(preferences);
    } catch (error) {
      console.error("Error fetching weekly plan preferences:", error);
      res.status(500).json({ error: "Failed to fetch preferences" });
    }
  });

  // Create or update weekly planning preferences (onboarding)
  app.post("/api/weekly-plan-preferences", async (req, res) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const userId = req.session!.userId!;
      const {
        householdSize,
        cookingFrequency,
        timeComfort,
        ambitionLevel,
        dietaryNeeds,
        cuisineWeighting,
        cuisinePreferences,
        budgetPerServing
      } = req.body;

      // Validate required fields
      if (!householdSize || !cookingFrequency || !timeComfort || !ambitionLevel) {
        return res.status(400).json({ error: "Missing required onboarding fields" });
      }

      const existingPreferences = await storage.getWeeklyPlanPreferences(userId);
      
      if (existingPreferences) {
        // Update existing preferences
        const updatedPreferences = await storage.updateWeeklyPlanPreferences(userId, {
          householdSize,
          cookingFrequency,
          timeComfort,
          ambitionLevel,
          dietaryNeeds: dietaryNeeds || "",
          cuisineWeighting,
          cuisinePreferences: cuisinePreferences || [],
          budgetPerServing,
          onboardingCompleted: true,
          onboardingCompletedAt: new Date()
        });
        res.json(updatedPreferences);
      } else {
        // Create new preferences
        const newPreferences = await storage.createWeeklyPlanPreferences({
          userId,
          householdSize,
          cookingFrequency,
          timeComfort,
          ambitionLevel,
          dietaryNeeds: dietaryNeeds || "",
          cuisineWeighting,
          cuisinePreferences: cuisinePreferences || [],
          budgetPerServing,
          onboardingCompleted: true,
          onboardingCompletedAt: new Date()
        });
        res.json(newPreferences);
      }
    } catch (error) {
      console.error("Error saving weekly plan preferences:", error);
      res.status(500).json({ error: "Failed to save preferences" });
    }
  });

  // Update existing weekly planning preferences
  app.put("/api/weekly-plan-preferences", async (req, res) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const userId = req.session!.userId!;
      const updateData = req.body;

      // Remove any undefined fields and handle date fields properly
      const cleanedData: any = {};
      for (const [key, value] of Object.entries(updateData)) {
        if (value !== undefined) {
          // Handle date fields properly
          if (key.includes('Date') || key.includes('At')) {
            cleanedData[key] = value ? new Date(value as string) : null;
          } else if (key === 'cuisinePreferences') {
            // Ensure cuisinePreferences is always an array
            cleanedData[key] = Array.isArray(value) ? value : (value ? [value] : []);
          } else if (key === 'dietaryNeeds') {
            // Ensure dietaryNeeds is always a string
            cleanedData[key] = typeof value === 'string' ? value : (value ? String(value) : "");
          } else {
            cleanedData[key] = value;
          }
        }
      }

      const updatedPreferences = await storage.updateWeeklyPlanPreferences(userId, cleanedData);
      res.json(updatedPreferences);
    } catch (error) {
      console.error("Error updating weekly plan preferences:", error);
      res.status(500).json({ error: "Failed to update preferences" });
    }
  });

  // Generate weekly plan (Sunday auto-generation or manual trigger)
  app.post("/api/generate-weekly-plan", async (req, res) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const userId = req.session!.userId!;
      const { weekStartDate } = req.body;

      // Get user preferences
      const preferences = await storage.getWeeklyPlanPreferences(userId);
      if (!preferences || !preferences.onboardingCompleted) {
        return res.status(400).json({ error: "Onboarding required" });
      }

      // Check subscription status for Flavr+ features
      const user = await storage.getUser(userId);
      const isFlavrPlus = user?.hasFlavrPlus || false;

      // 🎯 SUBSCRIPTION LIMITS: Check weekly plan limits
      const planLimitCheck = await storage.checkWeeklyPlanLimit(userId);
      if (!planLimitCheck.canGenerate) {
        const errorMessage = user?.hasFlavrPlus 
          ? `You've reached your monthly limit of ${planLimitCheck.plansLimit} weekly plan. Your limit resets at the beginning of next month.`
          : "Weekly meal planning is a premium feature. Upgrade to Flavr+ to generate custom weekly plans, or use individual recipe generation with our quality database recipes.";
        
        return res.status(403).json({ 
          error: errorMessage,
          plansUsed: planLimitCheck.plansUsed,
          plansLimit: planLimitCheck.plansLimit,
          hasFlavrPlus: planLimitCheck.hasFlavrPlus
        });
      }

      console.log('✅ Weekly plan limit check passed:', {
        plansUsed: planLimitCheck.plansUsed,
        plansLimit: planLimitCheck.plansLimit,
        hasFlavrPlus: planLimitCheck.hasFlavrPlus
      });

      // Convert string date to Date object
      const startDate = weekStartDate ? new Date(weekStartDate) : new Date();
      
      // Ensure we start from Monday
      const mondayDate = new Date(startDate);
      const dayOfWeek = mondayDate.getDay();
      const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Sunday = 0, Monday = 1
      mondayDate.setDate(mondayDate.getDate() + daysToMonday);

      // Generate the weekly plan
      const weeklyPlan = await WeeklyPlannerService.generateWeeklyPlan({
        userId,
        weekStartDate: mondayDate,
        preferences,
        isFlavrPlus
      });

      res.json(weeklyPlan);
    } catch (error: any) {
      console.error("Error generating weekly plan:", error);
      res.status(500).json({ error: "Failed to generate weekly plan" });
    }
  });

  // Get weekly plans for a user
  app.get("/api/weekly-plans", async (req, res) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const userId = req.session!.userId!;
      const limit = parseInt(req.query.limit as string) || 10;
      
      const plans = await storage.getWeeklyPlansByUser(userId, limit);
      res.json(plans);
    } catch (error) {
      console.error("Error fetching weekly plans:", error);
      res.status(500).json({ error: "Failed to fetch weekly plans" });
    }
  });

  // Get specific weekly plan
  app.get("/api/weekly-plans/:id", async (req, res) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const userId = req.session!.userId!;
      const planId = parseInt(req.params.id);
      
      const plan = await storage.getWeeklyPlan(planId);
      if (!plan || plan.userId !== userId) {
        return res.status(404).json({ error: "Plan not found" });
      }
      
      res.json(plan);
    } catch (error) {
      console.error("Error fetching weekly plan:", error);
      res.status(500).json({ error: "Failed to fetch weekly plan" });
    }
  });

  // Accept weekly plan
  app.post("/api/weekly-plans/:id/accept", async (req, res) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const userId = req.session!.userId!;
      const planId = parseInt(req.params.id);
      
      const updatedPlan = await WeeklyPlannerService.acceptWeeklyPlan(planId, userId);
      res.json(updatedPlan);
    } catch (error: any) {
      console.error("Error accepting weekly plan:", error);
      res.status(500).json({ error: error.message || "Failed to accept plan" });
    }
  });

  // Skip weekly plan
  app.post("/api/weekly-plans/:id/skip", async (req, res) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const userId = req.session!.userId!;
      const planId = parseInt(req.params.id);
      const { reason } = req.body;
      
      if (!reason) {
        return res.status(400).json({ error: "Skip reason required" });
      }
      
      const updatedPlan = await WeeklyPlannerService.skipWeeklyPlan(planId, userId, reason);
      res.json(updatedPlan);
    } catch (error: any) {
      console.error("Error skipping weekly plan:", error);
      res.status(500).json({ error: error.message || "Failed to skip plan" });
    }
  });

  // Adjust weekly plan
  app.post("/api/weekly-plans/:id/adjust", async (req, res) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const userId = req.session!.userId!;
      const planId = parseInt(req.params.id);
      const { swapRecipes, newCuisineWeighting } = req.body;
      
      const updatedPlan = await WeeklyPlannerService.adjustWeeklyPlan(planId, userId, {
        swapRecipes,
        newCuisineWeighting
      });
      res.json(updatedPlan);
    } catch (error: any) {
      console.error("Error adjusting weekly plan:", error);
      res.status(500).json({ error: error.message || "Failed to adjust plan" });
    }
  });

  // STEP 1: Generate recipe titles for review (cost-optimized)
  app.post("/api/generate-weekly-titles", async (req, res) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const userId = req.session!.userId!;
      const { mealCount } = req.body;

      // Get user preferences
      const preferences = await storage.getWeeklyPlanPreferences(userId);
      if (!preferences) {
        return res.status(400).json({ error: "Please complete your weekly planning setup first" });
      }

      // Generate titles only
      const titleProposal = await WeeklyPlannerService.generateWeeklyTitles(
        mealCount || 7,
        preferences,
        undefined, // avoidSimilarTo
        userId // Added for smart profiling
      );

      res.json(titleProposal);
    } catch (error: any) {
      console.error("Error generating weekly titles:", error);
      res.status(500).json({ error: error.message || "Failed to generate recipe titles" });
    }
  });

  // STEP 2: Generate full recipes from approved titles
  app.post("/api/generate-from-titles", async (req, res) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const userId = req.session!.userId!;
      const { approvedTitles, weekStartDate } = req.body;

      if (!approvedTitles || !Array.isArray(approvedTitles)) {
        return res.status(400).json({ error: "Approved titles array required" });
      }

      // Get user preferences
      const preferences = await storage.getWeeklyPlanPreferences(userId);
      if (!preferences) {
        return res.status(400).json({ error: "User preferences not found" });
      }

      // Generate full recipes for approved titles
      const plannedMeals = await WeeklyPlannerService.generateSelectiveRecipes(
        approvedTitles,
        preferences,
        userId
      );

      // Create the weekly plan
      const weekStart = new Date(weekStartDate);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);

      // Calculate meal count based on user's subscription
      const user = await storage.getUser(userId);
      const isFlavrPlus = user?.hasFlavrPlus || false;
      const mealCount = isFlavrPlus ? plannedMeals.length : Math.min(plannedMeals.length, 2);

      // Generate consolidated shopping list
      const allIngredients: string[] = [];
      for (const meal of plannedMeals.slice(0, mealCount)) {
        try {
          const recipe = await storage.getRecipe(meal.recipeId);
          if (recipe && recipe.ingredients) {
            allIngredients.push(...recipe.ingredients);
          }
        } catch (error) {
          console.error(`Error fetching recipe ${meal.recipeId}:`, error);
        }
      }

      const simpleShoppingList = consolidateShoppingList(allIngredients);
      
      // Convert simple shopping list to structured format expected by schema
      const consolidatedShoppingList = simpleShoppingList.map((item, index) => ({
        ingredient: item,
        quantity: "1", // Default quantity
        aisle: "Unknown", // Default aisle
        recipes: [] // Will be filled later if needed
      }));

      const weeklyPlanData = {
        userId,
        weekStartDate: weekStart,
        weekEndDate: weekEnd,
        planStatus: "pending" as const,
        plannedRecipes: plannedMeals.slice(0, mealCount),
        consolidatedShoppingList,
        generatedAt: new Date()
      };

      const newPlan = await storage.createWeeklyPlan(weeklyPlanData);
      res.json(newPlan);

    } catch (error: any) {
      console.error("Error generating recipes from titles:", error);
      res.status(500).json({ error: error.message || "Failed to generate recipes" });
    }
  });

  // Regenerate single recipe title
  app.post("/api/regenerate-title", async (req, res) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const userId = req.session!.userId!;
      const { day, currentTitle, preferences: userPrefs } = req.body;

      if (!day) {
        return res.status(400).json({ error: "Day parameter required" });
      }

      // Get user preferences if not provided
      let preferences = userPrefs;
      if (!preferences) {
        preferences = await storage.getWeeklyPlanPreferences(userId);
        if (!preferences) {
          return res.status(400).json({ error: "User preferences not found" });
        }
      }

      // Generate a completely different title for this specific day
      const singleTitleProposal = await WeeklyPlannerService.generateWeeklyTitles(
        1, 
        preferences,
        currentTitle ? `AVOID: Do not generate anything similar to "${currentTitle}". Create something completely different in cuisine, cooking method, or main ingredient.` : undefined,
        userId // Added for smart profiling
      );
      
      const newTitle = {
        ...singleTitleProposal.titles[0],
        day: day
      };

      res.json({ 
        title: newTitle,
        estimatedCost: 0.025 // Cost for one recipe generation
      });

    } catch (error: any) {
      console.error("Error regenerating title:", error);
      res.status(500).json({ error: error.message || "Failed to regenerate title" });
    }
  });

  // Export weekly plan to calendar (.ics)
  app.get("/api/weekly-plans/:id/export", async (req, res) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const userId = req.session!.userId!;
      const planId = parseInt(req.params.id);
      
      const plan = await storage.getWeeklyPlan(planId);
      if (!plan || plan.userId !== userId) {
        return res.status(404).json({ error: "Plan not found" });
      }
      
      // Generate ICS calendar data
      const icsData = generateICSCalendarData(plan);
      
      // Update plan to mark as exported
      await storage.updateWeeklyPlan(planId, {
        icsExported: true,
        icsExportedAt: new Date()
      });
      
      res.setHeader('Content-Type', 'text/calendar');
      res.setHeader('Content-Disposition', `attachment; filename="flavr-weekly-plan-${plan.weekStartDate.toISOString().split('T')[0]}.ics"`);
      res.send(icsData);
    } catch (error) {
      console.error("Error exporting weekly plan:", error);
      res.status(500).json({ error: "Failed to export plan" });
    }
  });

  // Get consolidated shopping list for a plan
  app.get("/api/weekly-plans/:id/shopping-list", async (req, res) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const userId = req.session!.userId!;
      const planId = parseInt(req.params.id);
      
      const plan = await storage.getWeeklyPlan(planId);
      if (!plan || plan.userId !== userId) {
        return res.status(404).json({ error: "Plan not found" });
      }
      
      // Convert structured shopping list back to simple format for display
      const shoppingList = plan.consolidatedShoppingList?.map(item => item.ingredient) || [];
      
      res.json({
        planId: plan.id,
        weekStart: plan.weekStartDate,
        weekEnd: plan.weekEndDate,
        shoppingList,
        totalItems: shoppingList.length
      });
    } catch (error) {
      console.error("Error fetching shopping list:", error);
      res.status(500).json({ error: "Failed to fetch shopping list" });
    }
  });
}

// Helper function to consolidate shopping list ingredients
function consolidateShoppingList(allIngredients: string[]): string[] {
  const ingredientMap = new Map<string, { count: number; original: string }>();
  
  for (const ingredient of allIngredients) {
    const normalized = normalizeIngredient(ingredient);
    const existing = ingredientMap.get(normalized);
    
    if (existing) {
      existing.count += 1;
    } else {
      ingredientMap.set(normalized, { count: 1, original: ingredient.trim() });
    }
  }
  
  // Return consolidated list with quantities
  const consolidated: string[] = [];
  ingredientMap.forEach((data, normalizedName) => {
    if (data.count > 1) {
      consolidated.push(`${data.original} (${data.count}x)`);
    } else {
      consolidated.push(data.original);
    }
  });
  
  return consolidated.sort();
}

// Enhanced ingredient normalization to better match similar items
function normalizeIngredient(ingredient: string): string {
  let normalized = ingredient.toLowerCase().trim();
  
  // Remove common quantity prefixes
  normalized = normalized.replace(/^\d+\s*(cups?|tbsp|tsp|oz|pounds?|lbs?|grams?|g|ml|l|liters?)\s+/i, '');
  normalized = normalized.replace(/^(a|an|some|fresh|dried|chopped|sliced|diced|minced)\s+/i, '');
  
  // Standardize common ingredient variations
  const variations: { [key: string]: string } = {
    'onions': 'onion',
    'tomatoes': 'tomato',
    'potatoes': 'potato',
    'carrots': 'carrot',
    'garlic cloves': 'garlic',
    'olive oil': 'olive oil',
    'vegetable oil': 'vegetable oil',
    'chicken breast': 'chicken breast',
    'chicken thighs': 'chicken thighs',
    'ground beef': 'ground beef',
    'bell peppers': 'bell pepper',
    'red peppers': 'bell pepper',
    'green peppers': 'bell pepper',
    'mushrooms': 'mushroom',
    'lemons': 'lemon',
    'limes': 'lime'
  };
  
  // Check for variations
  for (const [variant, standard] of Object.entries(variations)) {
    if (normalized.includes(variant)) {
      normalized = normalized.replace(variant, standard);
      break;
    }
  }
  
  return normalized.trim();
}

// Helper function to generate ICS calendar data
function generateICSCalendarData(plan: any): string {
  const now = new Date().toISOString().replace(/[:-]/g, '').split('.')[0] + 'Z';
  
  let icsData = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Flavr//Weekly Meal Planner//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH'
  ].join('\r\n') + '\r\n';
  
  // Add events for each planned meal
  plan.plannedRecipes?.forEach((meal: any) => {
    const mealDate = new Date(plan.weekStartDate);
    const dayOffset = getDayOffset(meal.day);
    mealDate.setDate(mealDate.getDate() + dayOffset);
    
    // Set time to 18:00 (6 PM) for dinner
    mealDate.setHours(18, 0, 0, 0);
    
    const eventStart = mealDate.toISOString().replace(/[:-]/g, '').split('.')[0] + 'Z';
    const eventEnd = new Date(mealDate.getTime() + (meal.cookTime + 30) * 60000) // cook time + 30 min eating
      .toISOString().replace(/[:-]/g, '').split('.')[0] + 'Z';
    
    icsData += [
      'BEGIN:VEVENT',
      `UID:flavr-${plan.id}-${meal.day}@getflavr.ai`,
      `DTSTART:${eventStart}`,
      `DTEND:${eventEnd}`,
      `SUMMARY:Cook: ${meal.recipeTitle}`,
      `DESCRIPTION:Flavr weekly meal plan\\n${meal.recipeTitle}\\nCook time: ${meal.cookTime} minutes\\nServes: ${meal.servings}`,
      `CREATED:${now}`,
      `LAST-MODIFIED:${now}`,
      'END:VEVENT'
    ].join('\r\n') + '\r\n';
  });
  
  icsData += 'END:VCALENDAR\r\n';
  return icsData;
}

// Helper function to convert day name to offset from Monday
function getDayOffset(dayName: string): number {
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  return days.indexOf(dayName.toLowerCase());
}