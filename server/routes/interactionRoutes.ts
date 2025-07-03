import type { Express, Request, Response } from "express";
import { storage } from "../storage";
import { insertInteractionLogSchema } from "@shared/schema";

export function registerInteractionRoutes(app: Express) {
  // Create interaction log
  app.post("/api/interactions", async (req: Request, res: Response) => {
    try {
      const validatedData = insertInteractionLogSchema.parse(req.body);
      
      // Enhance with request metadata
      const interactionLogData = {
        ...validatedData,
        userAgent: req.get('User-Agent') || null,
        ipAddress: req.ip || req.connection.remoteAddress || null,
      };

      const interactionLog = await storage.createInteractionLog(interactionLogData);
      res.json(interactionLog);
    } catch (error) {
      console.error('Error creating interaction log:', error);
      res.status(400).json({ 
        message: error instanceof Error ? error.message : 'Invalid interaction log data' 
      });
    }
  });

  // Get interaction logs with optional filtering
  app.get("/api/interactions", async (req: Request, res: Response) => {
    try {
      const { userId, sessionId, limit = '100' } = req.query;
      const limitNumber = parseInt(limit as string, 10);

      let interactions;
      
      if (userId) {
        interactions = await storage.getInteractionLogsByUser(parseInt(userId as string, 10), limitNumber);
      } else if (sessionId) {
        interactions = await storage.getInteractionLogsBySession(sessionId as string, limitNumber);
      } else {
        interactions = await storage.getInteractionLogs(limitNumber);
      }

      res.json(interactions);
    } catch (error) {
      console.error('Error fetching interaction logs:', error);
      res.status(500).json({ 
        message: 'Failed to fetch interaction logs' 
      });
    }
  });

  // Get interaction analytics summary
  app.get("/api/interactions/analytics", async (req: Request, res: Response) => {
    try {
      const allInteractions = await storage.getInteractionLogs(1000);
      
      // Group interactions by type
      const interactionsByType = allInteractions.reduce((acc, interaction) => {
        acc[interaction.interactionType] = (acc[interaction.interactionType] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Group by page
      const interactionsByPage = allInteractions.reduce((acc, interaction) => {
        const page = interaction.page || 'unknown';
        acc[page] = (acc[page] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Get unique users and sessions
      const uniqueUsers = new Set(allInteractions.map(i => i.userId).filter(Boolean)).size;
      const uniquePseudoUsers = new Set(allInteractions.map(i => i.pseudoUserId).filter(Boolean)).size;
      const uniqueSessions = new Set(allInteractions.map(i => i.sessionId).filter(Boolean)).size;

      res.json({
        totalInteractions: allInteractions.length,
        uniqueUsers,
        uniquePseudoUsers,
        uniqueSessions,
        interactionsByType,
        interactionsByPage,
        recentInteractions: allInteractions.slice(0, 10)
      });
    } catch (error) {
      console.error('Error generating interaction analytics:', error);
      res.status(500).json({ 
        message: 'Failed to generate analytics' 
      });
    }
  });
}