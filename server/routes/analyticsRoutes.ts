import type { Express, Request, Response } from "express";
import { userAnalyticsService } from "../services/userAnalyticsService";

export function registerAnalyticsRoutes(app: Express): void {
  
  // Get user's savings metrics
  app.get("/api/analytics/savings/:userId", async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.userId, 10);
      
      if (isNaN(userId)) {
        return res.status(400).json({ error: "Invalid user ID" });
      }

      const savingsMetrics = await userAnalyticsService.calculateSavingsMetrics(userId);
      
      res.json(savingsMetrics);
    } catch (error) {
      console.error("Error calculating savings metrics:", error);
      res.status(500).json({ 
        error: "Failed to calculate savings metrics" 
      });
    }
  });

  // Get user's taste profile
  app.get("/api/analytics/taste-profile/:userId", async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.userId, 10);
      
      if (isNaN(userId)) {
        return res.status(400).json({ error: "Invalid user ID" });
      }

      const tasteProfile = await userAnalyticsService.calculateTasteProfile(userId);
      
      res.json(tasteProfile);
    } catch (error) {
      console.error("Error calculating taste profile:", error);
      res.status(500).json({ 
        error: "Failed to calculate taste profile" 
      });
    }
  });

  // Get comprehensive user profile for recipe generation
  app.get("/api/analytics/user-profile/:userId", async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.userId, 10);
      
      if (isNaN(userId)) {
        return res.status(400).json({ error: "Invalid user ID" });
      }

      const userProfile = await userAnalyticsService.generateUserProfile(userId);
      
      res.json(userProfile);
    } catch (error) {
      console.error("Error generating user profile:", error);
      res.status(500).json({ 
        error: "Failed to generate user profile" 
      });
    }
  });

  // Get current user's analytics (authenticated route)
  app.get("/api/analytics/my-savings", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const userId = (req.user as any).id;
      const savingsMetrics = await userAnalyticsService.calculateSavingsMetrics(userId);
      
      res.json(savingsMetrics);
    } catch (error) {
      console.error("Error calculating user savings:", error);
      res.status(500).json({ 
        error: "Failed to calculate savings metrics" 
      });
    }
  });

  // Get current user's taste profile (authenticated route)
  app.get("/api/analytics/my-taste-profile", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const userId = (req.user as any).id;
      const tasteProfile = await userAnalyticsService.calculateTasteProfile(userId);
      
      res.json(tasteProfile);
    } catch (error) {
      console.error("Error calculating user taste profile:", error);
      res.status(500).json({ 
        error: "Failed to calculate taste profile" 
      });
    }
  });

  // Get current user's complete profile (authenticated route)
  app.get("/api/analytics/my-profile", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const userId = (req.user as any).id;
      const userProfile = await userAnalyticsService.generateUserProfile(userId);
      
      res.json(userProfile);
    } catch (error) {
      console.error("Error generating user profile:", error);
      res.status(500).json({ 
        error: "Failed to generate user profile" 
      });
    }
  });
}