import type { Express } from "express";
import { createServer, type Server } from "http";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import WebSocket, { WebSocketServer } from "ws";
import { storage } from "../storage";
import { db } from "../db";
import { setupGoogleLiveAudioWebSocket } from "../googleLiveAudio";
import { registerAuthRoutes } from "./authRoutes";
import { registerRecipeRoutes } from "./recipeRoutes";
import { registerChatRoutes } from "./chatRoutes";
import { registerSubscriptionRoutes } from "./subscriptionRoutes";
import { registerStripeRoutes } from "./stripeRoutes";
import { registerInteractionRoutes } from "./interactionRoutes";
import { registerBudgetPlannerRoutes } from "./budgetPlannerRoutes";
import { registerImageRoutes } from "./imageRoutes";
import { registerPhotoToRecipeRoutes } from "./photoToRecipeRoutes";
import { registerBiometricAuthRoutes } from "./biometricAuthRoutes";
import { registerSubRecipeRoutes } from "./subRecipeRoutes";
import { registerWeeklyPlanRoutes } from "./weeklyPlanRoutes";
import { registerAnalyticsRoutes } from "./analyticsRoutes";
import { registerUserPreferencesRoutes } from "./userPreferencesRoutes";
import { registerWineRoutes } from "./wineRoutes";
import { initializeOAuthStrategies } from "../oauthStrategies";
import passport from "passport";

export async function registerRoutes(app: Express): Promise<Server> {
  // Add route debugging
  console.log('🔧 Registering Express routes...');
  
  // Setup PostgreSQL session store for persistent sessions
  const PgSession = connectPgSimple(session);
  
  // Setup session middleware with persistent database storage
  app.use(session({
    store: new PgSession({
      conString: process.env.DATABASE_URL,
      tableName: 'sessions',
      createTableIfMissing: false, // We'll handle table creation via schema
    }),
    secret: process.env.SESSION_SECRET || 'flavr-dev-secret-key-2025',
    resave: false,
    saveUninitialized: false,
    rolling: true, // Reset expiration on activity
    cookie: { 
      secure: false, // Always false for development
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      httpOnly: true,
      sameSite: 'lax' // Better compatibility
    }
  }));

  // Initialize passport and OAuth strategies
  app.use(passport.initialize());
  app.use(passport.session());
  initializeOAuthStrategies();

  // Register all route modules
  registerAuthRoutes(app);
  registerRecipeRoutes(app);
  registerChatRoutes(app);
  registerSubscriptionRoutes(app);
  registerStripeRoutes(app);
  registerInteractionRoutes(app);
  registerBudgetPlannerRoutes(app);
  registerImageRoutes(app);
  registerPhotoToRecipeRoutes(app);
  registerBiometricAuthRoutes(app);
  registerSubRecipeRoutes(app);
  registerWeeklyPlanRoutes(app);
  registerAnalyticsRoutes(app);
  registerUserPreferencesRoutes(app);
  registerWineRoutes(app);

  // Additional utility routes
  
  // Developer logs endpoint (developer access only)
  app.get("/api/developer/logs", async (req, res) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ error: "Authentication required" });
      }

      // Check if user is developer
      const user = await storage.getUser(req.session.userId);
      if (user?.email !== "william@blycontracting.co.uk") {
        return res.status(403).json({ error: "Developer access required" });
      }

      const logs = await storage.getDeveloperLogs();
      res.json(logs);
    } catch (error) {
      console.error("Failed to fetch developer logs:", error);
      res.status(500).json({ error: "Failed to fetch logs" });
    }
  });

  // Developer all recipes endpoint (developer access only)
  app.get("/api/developer/all-recipes", async (req, res) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ error: "Authentication required" });
      }

      // Check if user is developer
      const user = await storage.getUser(req.session.userId);
      if (user?.email !== "william@blycontracting.co.uk") {
        return res.status(403).json({ error: "Developer access required" });
      }

      const allRecipes = await storage.getAllRecipes();
      res.json(allRecipes);
    } catch (error) {
      console.error("Failed to fetch all recipes:", error);
      res.status(500).json({ error: "Failed to fetch all recipes" });
    }
  });

  // Developer AI costs endpoint (developer access only)
  app.get("/api/developer/ai-costs", async (req, res) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ error: "Authentication required" });
      }

      // Check if user is developer
      const user = await storage.getUser(req.session.userId);
      if (user?.email !== "william@blycontracting.co.uk") {
        return res.status(403).json({ error: "Developer access required" });
      }

      const { aiCostTracker } = await import("../aiCostTracker");
      const now = new Date();
      const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const lastMonth = `${now.getFullYear()}-${String(now.getMonth()).padStart(2, '0')}`;

      const [currentMonthCosts, lastMonthCosts] = await Promise.all([
        aiCostTracker.getMonthlyTotalCosts(currentMonth),
        aiCostTracker.getMonthlyTotalCosts(lastMonth)
      ]);

      res.json({
        currentMonth: {
          month: currentMonth,
          ...currentMonthCosts
        },
        lastMonth: {
          month: lastMonth,
          ...lastMonthCosts
        },
        summary: {
          currentMonthTotal: parseFloat(currentMonthCosts.totalCost),
          lastMonthTotal: parseFloat(lastMonthCosts.totalCost),
          monthOverMonth: parseFloat(currentMonthCosts.totalCost) - parseFloat(lastMonthCosts.totalCost)
        }
      });
    } catch (error) {
      console.error("Failed to fetch AI costs:", error);
      res.status(500).json({ error: "Failed to fetch AI costs" });
    }
  });

  // Developer recipe generation logs endpoint (developer access only)
  app.get("/api/developer/recipe-generation-logs", async (req, res) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ error: "Authentication required" });
      }

      // Check if user is developer
      const user = await storage.getUser(req.session.userId);
      if (user?.email !== "william@blycontracting.co.uk") {
        return res.status(403).json({ error: "Developer access required" });
      }

      const logs = await storage.getRecipeGenerationLogs();
      res.json(logs);
    } catch (error) {
      console.error("Failed to fetch recipe generation logs:", error);
      res.status(500).json({ error: "Failed to fetch recipe generation logs" });
    }
  });

  // Get recipes endpoint
  app.get("/api/recipes", async (req, res) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const recipes = await storage.getRecipesByUser(req.session.userId);
      res.json(recipes);
    } catch (error) {
      console.error("Failed to fetch recipes:", error);
      res.status(500).json({ error: "Failed to fetch recipes" });
    }
  });

  // Recipe image migration endpoints - Admin only
  app.get("/api/admin/recipe-image-status", async (req, res) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ error: "Authentication required" });
      }

      // Check if user is admin (developer account)
      const user = await storage.getUser(req.session.userId);
      if (!user || user.email !== "william@blycontracting.co.uk") {
        return res.status(403).json({ error: "Admin access required" });
      }

      const { checkRecipeImageStatus } = await import("../fixRecipeImages");
      const status = await checkRecipeImageStatus();
      res.json(status);
    } catch (error) {
      console.error("Failed to check recipe image status:", error);
      res.status(500).json({ error: "Failed to check recipe image status" });
    }
  });

  app.post("/api/admin/fix-recipe-images", async (req, res) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ error: "Authentication required" });
      }

      // Check if user is admin (developer account)
      const user = await storage.getUser(req.session.userId);
      if (!user || user.email !== "william@blycontracting.co.uk") {
        return res.status(403).json({ error: "Admin access required" });
      }

      const { fixRecipeImages } = await import("../fixRecipeImages");
      await fixRecipeImages();
      res.json({ success: true, message: "Recipe image migration completed" });
    } catch (error) {
      console.error("Failed to fix recipe images:", error);
      res.status(500).json({ error: "Failed to fix recipe images" });
    }
  });

  // Get single recipe endpoint with enhanced logging
  app.get("/api/recipes/:id", async (req, res) => {
    try {
      if (!req.session?.userId) {
        console.log(`❌ Recipe ${req.params.id}: Authentication required`);
        return res.status(401).json({ error: "Authentication required" });
      }

      const { id } = req.params;
      const recipeId = parseInt(id);
      const userId = req.session.userId;
      
      console.log(`🔍 Recipe lookup: ID ${recipeId} requested by user ${userId}`);
      
      // Enhanced validation for recipe ID
      if (!recipeId || isNaN(recipeId) || recipeId <= 0) {
        console.log(`❌ Recipe ${id}: Invalid recipe ID format`);
        return res.status(400).json({ error: "Invalid recipe ID" });
      }
      
      const recipe = await storage.getRecipe(recipeId);
      
      if (!recipe) {
        console.log(`❌ Recipe ${recipeId}: Not found in database for user ${userId}`);
        return res.status(404).json({ error: "Recipe not found" });
      }

      // Verify recipe belongs to the user (security check)
      if (recipe.userId !== userId) {
        console.log(`❌ Recipe ${recipeId}: Access denied - recipe belongs to user ${recipe.userId}, requested by user ${userId}`);
        return res.status(403).json({ error: "Access denied" });
      }

      console.log(`✅ Recipe ${recipeId}: Successfully retrieved for user ${userId} - "${recipe.title}"`);
      res.json({ recipe });
    } catch (error) {
      console.error(`❌ Recipe ${req.params.id}: Server error -`, error);
      res.status(500).json({ error: "Failed to fetch recipe" });
    }
  });

  // Delete recipe endpoint
  app.delete("/api/recipes/:id", async (req, res) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const { id } = req.params;
      await storage.deleteRecipe(parseInt(id), req.session.userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Failed to delete recipe:", error);
      res.status(500).json({ error: "Failed to delete recipe" });
    }
  });

  // Toggle recipe sharing endpoint (used by RecipeView.tsx)
  app.post("/api/toggle-recipe-share", async (req, res) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const { id, isShared } = req.body;
      const userId = req.session.userId;
      
      console.log(`🔄 Toggling share for recipe ${id} - isShared: ${isShared}, user: ${userId}`);
      
      const recipe = await storage.getRecipe(id);
      if (!recipe || recipe.userId !== userId) {
        return res.status(404).json({ error: "Recipe not found" });
      }

      await storage.updateRecipeSharing(id, isShared);
      
      console.log(`✅ Recipe ${id} sharing updated to: ${isShared}`);
      res.json({ success: true, isShared });
    } catch (error) {
      console.error("Failed to toggle recipe sharing:", error);
      res.status(500).json({ error: "Failed to update sharing settings" });
    }
  });

  // Recipe sharing endpoint (used by other components)  
  app.post("/api/recipes/:id/share", async (req, res) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const { id } = req.params;
      const { isShared } = req.body;
      const userId = req.session.userId;
      
      console.log(`🔄 Sharing recipe ${id} - isShared: ${isShared}, user: ${userId}`);
      
      const recipe = await storage.getRecipe(parseInt(id));
      if (!recipe || recipe.userId !== userId) {
        return res.status(404).json({ error: "Recipe not found" });
      }

      await storage.updateRecipeSharing(parseInt(id), isShared);
      
      // If sharing is enabled and no shareId exists, get the updated recipe with shareId
      if (isShared) {
        const updatedRecipe = await storage.getRecipe(parseInt(id));
        const shareUrl = updatedRecipe?.shareId ? `https://getflavr.ai/share/${updatedRecipe.shareId}` : null;
        console.log(`✅ Recipe ${id} shared with URL: ${shareUrl}`);
        res.json({ success: true, isShared, shareUrl, shareId: updatedRecipe?.shareId });
      } else {
        console.log(`✅ Recipe ${id} sharing disabled`);
        res.json({ success: true, isShared });
      }
    } catch (error) {
      console.error("Failed to update recipe sharing:", error);
      res.status(500).json({ error: "Failed to update sharing settings" });
    }
  });

  // Get shared recipe endpoint
  app.get("/api/recipes/shared/:shareId", async (req, res) => {
    try {
      const { shareId } = req.params;
      const recipe = await storage.getRecipeByShareId(shareId);
      
      if (!recipe) {
        return res.status(404).json({ error: "Recipe not found" });
      }

      res.json(recipe);
    } catch (error) {
      console.error("Failed to fetch shared recipe:", error);
      res.status(500).json({ error: "Failed to fetch shared recipe" });
    }
  });

  // Simple Voice Chat WebSocket endpoint
  const server = createServer(app);
  
  // Setup Google Live Audio WebSocket
  setupGoogleLiveAudioWebSocket(server);

  // Simple voice chat WebSocket for fallback
  const wss = new WebSocketServer({ 
    server,
    path: '/ws/simple-voice'
  });

  wss.on('connection', (ws: WebSocket, req) => {
    console.log('🎤 Simple voice chat connection established');
    
    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString());
        console.log('📝 Voice message received:', message.type);
        
        if (message.type === 'voice_query') {
          // Simple text response for voice queries
          const response = {
            type: 'voice_response',
            text: `I heard you ask about ${message.text}. How can I help you with cooking today?`
          };
          
          ws.send(JSON.stringify(response));
        }
      } catch (error) {
        console.error('Voice chat error:', error);
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Failed to process voice message'
        }));
      }
    });

    ws.on('close', () => {
      console.log('🎤 Simple voice chat connection closed');
    });

    ws.on('error', (error) => {
      console.error('Simple voice chat WebSocket error:', error);
    });
  });

  return server;
}