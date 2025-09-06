import type { Express } from "express";
import { storage } from "../storage";
import { insertUserPreferencesSchema } from "@shared/schema";

export function registerUserPreferencesRoutes(app: Express): void {
  // Get user preferences
  app.get("/api/user-preferences", async (req, res) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const userId = req.session!.userId!;
      const preferences = await storage.getUserPreferences(userId);
      
      if (!preferences) {
        return res.json({ preferences: null });
      }
      
      res.json({ preferences });
    } catch (error) {
      console.error("Error fetching user preferences:", error);
      res.status(500).json({ error: "Failed to fetch preferences" });
    }
  });

  // Create or update user preferences (upsert)
  app.post("/api/user-preferences", async (req, res) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const userId = req.session!.userId!;
      
      // Validate the request body
      const validationResult = insertUserPreferencesSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          error: "Invalid preference data",
          details: validationResult.error.issues
        });
      }

      const preferences = await storage.upsertUserPreferences(userId, req.body);
      res.json({ preferences });
    } catch (error) {
      console.error("Error saving user preferences:", error);
      res.status(500).json({ error: "Failed to save preferences" });
    }
  });

  // Update user preferences (partial update)
  app.put("/api/user-preferences", async (req, res) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const userId = req.session!.userId!;
      
      // Check if preferences exist
      const existingPreferences = await storage.getUserPreferences(userId);
      if (!existingPreferences) {
        return res.status(404).json({ error: "No preferences found to update" });
      }

      const preferences = await storage.updateUserPreferences(userId, req.body);
      res.json({ preferences });
    } catch (error) {
      console.error("Error updating user preferences:", error);
      res.status(500).json({ error: "Failed to update preferences" });
    }
  });
}