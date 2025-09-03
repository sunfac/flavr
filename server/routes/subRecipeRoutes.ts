import type { Express } from "express";
import { subRecipeService } from "../subRecipeService";
import { storage } from "../storage";

export function registerSubRecipeRoutes(app: Express) {
  
  // Get potential sub-recipes for a recipe
  app.get("/api/recipes/:id/sub-recipe-suggestions", async (req, res) => {
    try {
      const recipeId = parseInt(req.params.id);
      const recipe = await storage.getRecipe(recipeId);
      
      if (!recipe) {
        return res.status(404).json({ error: "Recipe not found" });
      }
      
      const suggestions = await subRecipeService.detectPotentialSubRecipes(recipe.ingredients);
      const suggestionsArray = Array.from(suggestions.entries()).map(([ingredient, detection]) => ({
        ingredient,
        ...detection
      }));
      
      res.json({ suggestions: suggestionsArray });
    } catch (error) {
      console.error("Error getting sub-recipe suggestions:", error);
      res.status(500).json({ error: "Failed to get sub-recipe suggestions" });
    }
  });
  
  // Generate a sub-recipe for a specific ingredient
  app.post("/api/recipes/:id/sub-recipes", async (req, res) => {
    try {
      const recipeId = parseInt(req.params.id);
      const { ingredientName } = req.body;
      
      if (!ingredientName) {
        return res.status(400).json({ error: "Ingredient name is required" });
      }
      
      const parentRecipe = await storage.getRecipe(recipeId);
      if (!parentRecipe) {
        return res.status(404).json({ error: "Parent recipe not found" });
      }
      
      // Check if user has permission (if authenticated)
      const userId = req.session?.userId;
      if (userId && parentRecipe.userId !== userId) {
        return res.status(403).json({ error: "Permission denied" });
      }
      
      const userContext = {
        userId: req.session?.userId,
        pseudoUserId: req.body.pseudoUserId || req.session?.id,
        isAuthenticated: !!req.session?.userId
      };
      
      const subRecipe = await subRecipeService.generateSubRecipe(
        ingredientName,
        parentRecipe,
        userContext
      );
      
      console.log(`✅ Sub-recipe generated: ${subRecipe.title} for ingredient: ${ingredientName}`);
      res.json({ subRecipe });
      
    } catch (error) {
      console.error("Error generating sub-recipe:", error);
      res.status(500).json({ error: "Failed to generate sub-recipe" });
    }
  });
  
  // Get all sub-recipes for a parent recipe
  app.get("/api/recipes/:id/sub-recipes", async (req, res) => {
    try {
      const recipeId = parseInt(req.params.id);
      const subRecipes = await subRecipeService.getSubRecipes(recipeId);
      
      res.json({ subRecipes });
    } catch (error) {
      console.error("Error fetching sub-recipes:", error);
      res.status(500).json({ error: "Failed to fetch sub-recipes" });
    }
  });
  
  // Get parent recipe for a sub-recipe
  app.get("/api/sub-recipes/:id/parent", async (req, res) => {
    try {
      const subRecipeId = parseInt(req.params.id);
      const parentRecipe = await subRecipeService.getParentRecipe(subRecipeId);
      
      if (!parentRecipe) {
        return res.status(404).json({ error: "Parent recipe not found" });
      }
      
      res.json({ parentRecipe });
    } catch (error) {
      console.error("Error fetching parent recipe:", error);
      res.status(500).json({ error: "Failed to fetch parent recipe" });
    }
  });
  
  // Check if a recipe is a sub-recipe
  app.get("/api/recipes/:id/is-sub-recipe", async (req, res) => {
    try {
      const recipeId = parseInt(req.params.id);
      const recipe = await storage.getRecipe(recipeId);
      
      if (!recipe) {
        return res.status(404).json({ error: "Recipe not found" });
      }
      
      res.json({ 
        isSubRecipe: recipe.isSubRecipe || false,
        parentRecipeId: recipe.parentRecipeId,
        subRecipeFor: recipe.subRecipeFor
      });
    } catch (error) {
      console.error("Error checking sub-recipe status:", error);
      res.status(500).json({ error: "Failed to check sub-recipe status" });
    }
  });
}