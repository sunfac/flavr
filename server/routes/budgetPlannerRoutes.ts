import type { Express } from "express";
import { processBudgetPlannerInput } from "../budgetPlannerProcessor";

export function registerBudgetPlannerRoutes(app: Express) {
  // Budget planner chat endpoint
  app.post("/api/budget-planner", async (req, res) => {
    try {
      const { message, conversationHistory = [] } = req.body;

      if (!message || typeof message !== 'string') {
        return res.status(400).json({ 
          error: "Message is required and must be a string" 
        });
      }

      console.log('🏠 Budget planner request received:', { 
        messageLength: message.length,
        historyLength: conversationHistory.length 
      });

      const result = await processBudgetPlannerInput(
        message,
        conversationHistory
      );

      console.log('✅ Budget planner response generated:', {
        stage: result.stage,
        complete: result.complete
      });

      res.json(result);

    } catch (error) {
      console.error("❌ Budget planner error:", error);
      res.status(500).json({ 
        error: "Failed to process budget planner request",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
}