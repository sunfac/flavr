import type { Express } from "express";
import { storage } from "../storage";
import { WeeklyPlannerService } from "../weeklyPlannerService";

export function registerWeeklyPlanRoutes(app: Express) {
  
  // Get user's weekly planning preferences
  app.get("/api/weekly-plan-preferences", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
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
      if (!req.isAuthenticated()) {
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
          dietaryNeeds: dietaryNeeds || [],
          cuisineWeighting,
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
          dietaryNeeds: dietaryNeeds || [],
          cuisineWeighting,
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

  // Generate weekly plan (Sunday auto-generation or manual trigger)
  app.post("/api/generate-weekly-plan", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
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
    } catch (error) {
      console.error("Error generating weekly plan:", error);
      res.status(500).json({ error: "Failed to generate weekly plan" });
    }
  });

  // Get weekly plans for a user
  app.get("/api/weekly-plans", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
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
      if (!req.isAuthenticated()) {
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
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const userId = req.session!.userId!;
      const planId = parseInt(req.params.id);
      
      const updatedPlan = await WeeklyPlannerService.acceptWeeklyPlan(planId, userId);
      res.json(updatedPlan);
    } catch (error) {
      console.error("Error accepting weekly plan:", error);
      res.status(500).json({ error: error.message || "Failed to accept plan" });
    }
  });

  // Skip weekly plan
  app.post("/api/weekly-plans/:id/skip", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
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
    } catch (error) {
      console.error("Error skipping weekly plan:", error);
      res.status(500).json({ error: error.message || "Failed to skip plan" });
    }
  });

  // Adjust weekly plan
  app.post("/api/weekly-plans/:id/adjust", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
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
    } catch (error) {
      console.error("Error adjusting weekly plan:", error);
      res.status(500).json({ error: error.message || "Failed to adjust plan" });
    }
  });

  // Export weekly plan to calendar (.ics)
  app.get("/api/weekly-plans/:id/export", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
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
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const userId = req.session!.userId!;
      const planId = parseInt(req.params.id);
      
      const plan = await storage.getWeeklyPlan(planId);
      if (!plan || plan.userId !== userId) {
        return res.status(404).json({ error: "Plan not found" });
      }
      
      res.json({
        planId: plan.id,
        weekStart: plan.weekStartDate,
        weekEnd: plan.weekEndDate,
        shoppingList: plan.consolidatedShoppingList || [],
        totalItems: plan.consolidatedShoppingList?.length || 0
      });
    } catch (error) {
      console.error("Error fetching shopping list:", error);
      res.status(500).json({ error: "Failed to fetch shopping list" });
    }
  });
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