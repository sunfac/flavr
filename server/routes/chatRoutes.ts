import type { Express } from "express";
import OpenAI from "openai";
import { storage } from "../storage";
import { requireAuth } from "./authRoutes";
import { insertChatMessageSchema } from "@shared/schema";
import { logGPTInteraction, logSimpleGPTInteraction } from "../developerLogger";
import { ZestService } from "../zestService";
import { OptimizedChatService } from "../optimizedChatServiceUpdated";

// Session type extension
declare module 'express-session' {
  interface SessionData {
    userId?: number;
    isPlus?: boolean;
  }
}

// Initialize OpenAI
if (!process.env.OPENAI_API_KEY) {
  throw new Error('Missing required OpenAI API key: OPENAI_API_KEY');
}
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// REMOVED: General recipe inspiration system - chat is now recipe-context only

export function registerChatRoutes(app: Express) {
  const zestService = new ZestService();

  // Recipe-focused chat endpoint (requires recipe context)
  app.post("/api/chat/optimized", async (req, res) => {
    try {
      const { message, conversationHistory = [], currentRecipe } = req.body;
      
      if (!message) {
        return res.status(400).json({ error: "Message is required" });
      }

      // CRITICAL: Require recipe context for all chat interactions
      if (!currentRecipe || !currentRecipe.title || !currentRecipe.ingredients) {
        return res.status(400).json({ 
          error: "Recipe context required",
          message: "I'm your recipe assistant! I can only help when you're working on a specific recipe. Please select a recipe to get started.",
          requiresRecipeContext: true
        });
      }

      const userContext = {
        userId: req.session?.userId,
        pseudoUserId: req.body.pseudoUserId,
        isAuthenticated: !!req.session?.userId
      };

      console.log('🍳 Recipe-focused chat request:', { 
        message: message.substring(0, 50) + '...', 
        userId: userContext.userId,
        recipeTitle: currentRecipe.title,
        ingredientCount: currentRecipe.ingredients?.length || 0
      });

      // Process with recipe-focused service
      const result = await OptimizedChatService.processMessage({
        message,
        conversationHistory,
        currentRecipe,
        userContext
      });

      console.log('🍳 Recipe-focused result:', {
        intent: result.intent,
        confidence: result.confidence,
        estimatedCost: result.estimatedCost,
        modelUsed: result.metadata.modelUsed,
        processingTime: result.metadata.processingTimeMs
      });

      res.json({
        message: result.message,
        intent: result.intent,
        confidence: result.confidence,
        suggestedActions: result.suggestedActions,
        isRecipeFocused: true,
        metadata: result.metadata
      });

    } catch (error) {
      console.error('❌ Recipe-focused chat error:', error);
      res.status(500).json({ 
        error: "Failed to process recipe-focused chat",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Recipe-focused Zest chat endpoint (requires recipe context)
  app.post("/api/zest/chat", async (req, res) => {
    try {
      const { message, conversationHistory = [], currentRecipe } = req.body;
      
      if (!message) {
        return res.status(400).json({ error: "Message is required" });
      }

      // CRITICAL: Require recipe context for all Zest chat interactions
      if (!currentRecipe || !currentRecipe.title || !currentRecipe.ingredients) {
        return res.status(400).json({ 
          error: "Recipe context required",
          message: "I'm Zest, your recipe assistant! I can only help when you're working on a specific recipe. Please select a recipe to get started.",
          requiresRecipeContext: true
        });
      }

      // Get user context
      const userContext = {
        userId: req.session?.userId,
        pseudoUserId: req.body.pseudoUserId,
        isAuthenticated: !!req.session?.userId
      };

      console.log('🧠 Recipe-focused Zest chat request:', { 
        message: message.substring(0, 50) + '...', 
        userId: userContext.userId,
        recipeTitle: currentRecipe.title,
        ingredientCount: currentRecipe.ingredients?.length || 0
      });

      // Process recipe-focused request using OptimizedChatService
      const result = await OptimizedChatService.processMessage({
        message,
        conversationHistory,
        currentRecipe,
        userContext
      });

      console.log('🧠 Zest recipe-focused result:', {
        intent: result.intent,
        confidence: result.confidence,
        estimatedCost: result.estimatedCost,
        modelUsed: result.metadata.modelUsed,
        processingTime: result.metadata.processingTimeMs,
        recipeTitle: currentRecipe.title
      });

      // Save the conversation for authenticated users
      if (userContext.userId) {
        try {
          await storage.createChatMessage({
            userId: userContext.userId,
            message: message,
            response: result.message
          });
        } catch (error) {
          console.error('Error saving recipe-focused Zest chat:', error);
        }
      }

      return res.json({
        message: result.message,
        intent: result.intent,
        confidence: result.confidence,
        suggestedActions: result.suggestedActions,
        isRecipeFocused: true,
        currentRecipeTitle: currentRecipe.title,
        metadata: result.metadata
      });

    } catch (error) {
      console.error('❌ Recipe-focused Zest chat error:', error);
      res.status(500).json({ 
        error: "Failed to process recipe-focused chat",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // === REMAINING ENDPOINTS (Already Recipe-Focused or Non-Chat) ===

  // Recipe generation endpoint for when user confirms intent
  app.post("/api/zest/generate-recipe", async (req, res) => {
    try {
      const { 
        message, 
        userConfirmed, 
        suggestedRecipeTitle, 
        isFlavorMaximized, 
        selectedInspiration, 
        originalMessage 
      } = req.body;
      
      if (!userConfirmed) {
        return res.status(400).json({ error: "User confirmation required" });
      }

      // DEPRECATED: This endpoint should no longer be used for general recipe generation
      // All chat is now recipe-focused and doesn't generate new recipes
      return res.status(400).json({ 
        error: "Recipe generation disabled",
        message: "Recipe generation has been moved to recipe-focused modes. Please use Chef Assist, Fridge Mode, or Shopping Mode to create new recipes."
      });

    } catch (error) {
      console.error('Error in deprecated generate-recipe endpoint:', error);
      res.status(500).json({ error: "Failed to generate recipe" });
    }
  });

  // Original chat endpoint for streaming responses with function calling
  app.post("/api/chat/stream", async (req, res) => {
    try {
      const { message, conversationHistory = [], currentRecipe, openAIContext } = req.body;
      
      if (!message) {
        return res.status(400).json({ error: "Message is required" });
      }

      // CRITICAL: Require recipe context for streaming chat
      if (!currentRecipe || !currentRecipe.title || !currentRecipe.ingredients) {
        res.write(`data: ${JSON.stringify({ error: "Recipe context required for chat functionality" })}\n\n`);
        res.end();
        return;
      }

      console.log('💬 Recipe-focused chat stream request:', { 
        message: message.substring(0, 50) + '...', 
        recipeTitle: currentRecipe.title
      });

      // Set headers for streaming
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('Access-Control-Allow-Origin', '*');

      // Enhanced system prompt for recipe-focused interactions
      const systemPrompt = `You are Zest, Flavr's expert AI cooking assistant. You ONLY help with the current recipe being prepared: "${currentRecipe.title}".

Current Recipe Context: ${JSON.stringify(currentRecipe)}
${openAIContext ? `Original Context: ${JSON.stringify(openAIContext)}` : ''}

CRITICAL RULES for Recipe-Focused Assistance:

1. ONLY discuss the current recipe: ${currentRecipe.title}
2. ONLY use updateRecipe function when user EXPLICITLY requests changes:
   ✓ "Make it spicier" → Update with added chili/spices
   ✓ "Add more garlic" → Update ingredients and steps
   ✓ "Make it vegetarian" → Replace meat ingredients
   ✓ "Double the recipe" → Update all quantities
   
3. DO NOT update recipe for questions:
   ✗ "What wine pairs with this?" → Just give suggestions about THIS recipe
   ✗ "Can I prep this ahead?" → Give advice about THIS recipe only
   ✗ "Tell me about this dish" → Share knowledge about THIS specific dish
   ✗ "How do I dice an onion?" → Provide technique tips for THIS recipe

4. When you DO update:
   - Include ALL ingredients (complete list)
   - Include ALL instructions (every step)
   - Update title if the change is significant
   - Maintain exact formatting

5. Always respond conversationally first, explaining what you're changing and why.
6. All responses must be specific to this recipe: ${currentRecipe.title}

Be warm, encouraging, and knowledgeable about cooking THIS specific dish!`;
      const messages = [
        { role: "system" as const, content: systemPrompt },
        ...conversationHistory.map((msg: any) => ({
          role: msg.role || (msg.sender === 'user' ? 'user' : 'assistant'),
          content: msg.content || msg.text
        })),
        { role: "user" as const, content: message }
      ];

      // Function definition for recipe updates
      const functions = [{
        name: "updateRecipe",
        description: "Update the current recipe with modifications",
        parameters: {
          type: "object",
          properties: {
            title: { type: "string", description: "Updated recipe title if significantly changed" },
            ingredients: { type: "array", items: { type: "string" }, description: "Complete list of ALL ingredients" },
            instructions: { type: "array", items: { type: "string" }, description: "Complete list of ALL instructions" },
            cookTime: { type: "number", description: "Updated cooking time in minutes" },
            servings: { type: "number", description: "Updated number of servings" }
          },
          required: ["ingredients", "instructions"]
        }
      }];

      const stream = await openai.chat.completions.create({
        model: "gpt-4o",
        messages,
        temperature: 0.7,
        max_tokens: 1500,
        stream: true,
        functions,
        function_call: "auto"
      });

      let fullResponse = '';
      let functionCall = null;
      let functionArgs = '';

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta;
        
        if (delta?.content) {
          fullResponse += delta.content;
          res.write(`data: ${JSON.stringify({ content: delta.content })}\n\n`);
        }
        
        if (delta?.function_call) {
          if (delta.function_call.name) {
            functionCall = delta.function_call.name;
          }
          if (delta.function_call.arguments) {
            functionArgs += delta.function_call.arguments;
          }
        }
      }

      // Handle function call if present
      if (functionCall === 'updateRecipe' && functionArgs) {
        try {
          const updatedRecipe = JSON.parse(functionArgs);
          res.write(`data: ${JSON.stringify({ functionCall: 'updateRecipe', recipeUpdate: updatedRecipe })}\n\n`);
        } catch (error) {
          console.error('Error parsing function arguments:', error);
        }
      }

      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();

      // Log the successful interaction
      await logSimpleGPTInteraction({
        endpoint: 'chat-stream-recipe-focused',
        prompt: messages.map(m => `${m.role}: ${m.content}`).join('\n'),
        response: fullResponse,
        model: 'gpt-4o',
        duration: 0,
        inputTokens: 0,
        outputTokens: 0,
        cost: 0,
        success: true,
        userId: req.session?.userId?.toString() || undefined
      });

    } catch (error) {
      console.error("Recipe-focused chat stream error:", error);
      res.write(`data: ${JSON.stringify({ error: "Failed to process recipe-focused chat message" })}\n\n`);
      res.end();
    }
  });

  // === ADDITIONAL ROUTE HANDLERS WOULD GO HERE ===
}

// Helper function for selecting appropriate chef/restaurant inspiration
function selectAppropriateInspiration(message: string, allChefs: string[], allRestaurants: string[]): string {
  const lowerMessage = message.toLowerCase();
  
  // Cuisine-based chef mapping
  if (lowerMessage.includes('indian') || lowerMessage.includes('curry')) {
    return Math.random() > 0.7 ? 'Dishoom' : 'Gymkhana';
  }
  if (lowerMessage.includes('italian') || lowerMessage.includes('pasta')) {
    return Math.random() > 0.5 ? 'Padella' : 'Bancone';
  }
  if (lowerMessage.includes('japanese') || lowerMessage.includes('sushi')) {
    return Math.random() > 0.5 ? 'Roka' : 'Zuma';
  }
  
  // Default random selection
  const combined = [...allChefs, ...allRestaurants];
  return combined[Math.floor(Math.random() * combined.length)];
}
