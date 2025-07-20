import type { Express } from "express";
import { createServer, type Server } from "http";
import session from "express-session";
import WebSocket, { WebSocketServer } from "ws";
import { storage } from "../storage";
import { setupGoogleLiveAudioWebSocket } from "../googleLiveAudio";
import { registerAuthRoutes } from "./authRoutes";
import { registerRecipeRoutes } from "./recipeRoutes";
import { registerChatRoutes } from "./chatRoutes";
import { registerSubscriptionRoutes } from "./subscriptionRoutes";
import { registerInteractionRoutes } from "./interactionRoutes";
import { registerBudgetPlannerRoutes } from "./budgetPlannerRoutes";

export async function registerRoutes(app: Express): Promise<Server> {
  // Add route debugging
  console.log('🔧 Registering Express routes...');
  
  // Setup session middleware with enhanced persistence
  app.use(session({
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

  // Register all route modules
  registerAuthRoutes(app);
  registerRecipeRoutes(app);
  registerChatRoutes(app);
  registerSubscriptionRoutes(app);
  registerInteractionRoutes(app);
  registerBudgetPlannerRoutes(app);

  // Additional utility routes
  
  // Developer logs endpoint
  app.get("/api/developer/logs", async (req, res) => {
    try {
      const logs = await storage.getDeveloperLogs();
      res.json(logs);
    } catch (error) {
      console.error("Failed to fetch developer logs:", error);
      res.status(500).json({ error: "Failed to fetch logs" });
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