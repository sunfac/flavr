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

  // Get single recipe endpoint
  app.get("/api/recipe/:id", async (req, res) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const { id } = req.params;
      const recipe = await storage.getRecipe(parseInt(id));
      
      if (!recipe) {
        return res.status(404).json({ error: "Recipe not found" });
      }

      // Verify recipe belongs to the user (security check)
      if (recipe.userId !== req.session.userId) {
        return res.status(403).json({ error: "Access denied" });
      }

      res.json({ recipe });
    } catch (error) {
      console.error("Failed to fetch recipe:", error);
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