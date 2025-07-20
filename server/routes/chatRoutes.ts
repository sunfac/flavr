import type { Express } from "express";
import OpenAI from "openai";
import { storage } from "../storage";
import { requireAuth } from "./authRoutes";
import { insertChatMessageSchema } from "@shared/schema";
import { logGPTInteraction } from "../developerLogger";

// Initialize OpenAI
if (!process.env.OPENAI_API_KEY) {
  throw new Error('Missing required OpenAI API key: OPENAI_API_KEY');
}
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export function registerChatRoutes(app: Express) {
  // Chat endpoint for streaming responses with function calling
  app.post("/api/chat/stream", async (req, res) => {
    try {
      const { message, conversationHistory = [], currentRecipe, openAIContext } = req.body;
      
      if (!message) {
        return res.status(400).json({ error: "Message is required" });
      }

      console.log('💬 Chat stream request:', { message: message.substring(0, 100) + '...' });

      // Set headers for streaming
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('Access-Control-Allow-Origin', '*');

      // Enhanced system prompt with function calling support
      const systemPrompt = `You are Zest, Flavr's expert AI cooking assistant. You help users modify recipes, answer cooking questions, and provide culinary guidance.

${currentRecipe ? `Current Recipe Context: ${JSON.stringify(currentRecipe)}` : ''}
${openAIContext ? `Original Context: ${JSON.stringify(openAIContext)}` : ''}

IMPORTANT: When users request recipe modifications (changing ingredients, servings, cooking methods, adding side dishes, etc.), use the updateRecipe function to actually implement the changes instead of just suggesting them.

Function: updateRecipe
- Use this when users ask to modify recipes
- Always include complete recipe data with all fields
- Be specific and comprehensive in modifications

Guidelines:
- Detect modification requests (spicier, more/less servings, different ingredients, cooking methods, etc.)
- Use updateRecipe function to implement changes immediately
- Provide encouraging, specific cooking advice
- Keep responses concise but informative`;

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
        description: "Update the current recipe with modifications requested by the user",
        parameters: {
          type: "object",
          properties: {
            title: { type: "string", description: "Updated recipe title" },
            ingredients: {
              type: "array",
              items: { type: "string" },
              description: "Complete list of ingredients with quantities"
            },
            instructions: {
              type: "array", 
              items: { type: "string" },
              description: "Complete step-by-step cooking instructions"
            },
            servings: { type: "number", description: "Number of servings" },
            cookTime: { type: "string", description: "Total cooking time" },
            difficulty: { type: "string", description: "Recipe difficulty level" },
            cuisine: { type: "string", description: "Cuisine type" }
          },
          required: ["title", "ingredients", "instructions", "servings"]
        }
      }];

      const stream = await openai.chat.completions.create({
        model: "gpt-4o",
        messages,
        functions,
        function_call: "auto",
        temperature: 0.7,
        max_tokens: 1500,
        stream: true,
      });

      let fullResponse = '';
      let functionCall = null;

      for await (const chunk of stream) {
        const choice = chunk.choices[0];
        
        if (choice?.delta?.content) {
          fullResponse += choice.delta.content;
          res.write(`data: ${JSON.stringify({ content: choice.delta.content })}\n\n`);
        }
        
        if (choice?.delta?.function_call) {
          if (!functionCall) {
            functionCall = { name: '', arguments: '' };
          }
          if (choice.delta.function_call.name) {
            functionCall.name = choice.delta.function_call.name;
          }
          if (choice.delta.function_call.arguments) {
            functionCall.arguments += choice.delta.function_call.arguments;
          }
        }
      }

      // Handle function call if present
      if (functionCall && functionCall.name === 'updateRecipe') {
        try {
          const updateData = JSON.parse(functionCall.arguments);
          console.log('🔄 Function call: updateRecipe with data:', updateData);
          
          // Send recipe update via stream
          res.write(`data: ${JSON.stringify({ 
            type: 'recipeUpdate', 
            recipe: {
              id: currentRecipe?.id || 'updated-recipe',
              ...updateData,
              lastUpdated: Date.now()
            }
          })}\n\n`);
          
        } catch (error) {
          console.error('Function call parsing error:', error);
        }
      }

      // Save chat message if user is authenticated
      if (req.session?.userId) {
        try {
          await storage.createChatMessage({
            userId: req.session.userId,
            message,
            response: fullResponse,
            timestamp: new Date()
          });
        } catch (dbError) {
          console.error('Failed to save chat message:', dbError);
        }
      }

      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();

      // Log the interaction
      await logGPTInteraction({
        endpoint: 'chat-stream',
        prompt: messages.map(m => `${m.role}: ${m.content}`).join('\n'),
        response: fullResponse,
        model: 'gpt-4o',
        duration: 0,
        inputTokens: 0,
        outputTokens: 0,
        cost: 0,
        success: true,
        userId: req.session?.userId || 'anonymous',
        sessionId: req.session?.id || 'no-session'
      });

    } catch (error) {
      console.error("Chat stream error:", error);
      res.write(`data: ${JSON.stringify({ error: "Failed to process chat message" })}\n\n`);
      res.end();
    }
  });

  // Standard chat endpoint
  app.post("/api/chat", async (req, res) => {
    try {
      const { message, conversationHistory = [], recipeData } = req.body;
      
      if (!message) {
        return res.status(400).json({ error: "Message is required" });
      }

      console.log('💬 Chat request:', { message: message.substring(0, 100) + '...' });

      const messages = [
        {
          role: "system" as const,
          content: `You are Zest, Flavr's friendly AI cooking assistant. You help users with recipe questions, cooking tips, and culinary guidance.

Current recipe context: ${recipeData ? JSON.stringify(recipeData) : 'No active recipe'}

Guidelines:
- Be helpful, encouraging, and knowledgeable about cooking
- If asked about modifying recipes, provide specific, actionable advice
- Keep responses concise but informative
- Focus on practical cooking guidance`
        },
        ...conversationHistory.map((msg: any) => ({
          role: msg.type === 'user' ? 'user' : 'assistant',
          content: msg.content
        })),
        {
          role: "user" as const,
          content: message
        }
      ];

      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages,
        temperature: 0.7,
        max_tokens: 1000,
      });

      const response = completion.choices[0]?.message?.content || "I apologize, but I couldn't generate a response. Please try again.";

      // Save chat message if user is authenticated
      if (req.session?.userId) {
        try {
          await storage.createChatMessage({
            userId: req.session.userId,
            message,
            response,
            timestamp: new Date()
          });
        } catch (dbError) {
          console.error('Failed to save chat message:', dbError);
        }
      }

      // Log the interaction
      await logGPTInteraction({
        endpoint: 'chat',
        prompt: messages.map(m => `${m.role}: ${m.content}`).join('\n'),
        response,
        model: 'gpt-4o',
        duration: 0,
        inputTokens: completion.usage?.prompt_tokens || 0,
        outputTokens: completion.usage?.completion_tokens || 0,
        cost: ((completion.usage?.prompt_tokens || 0) * 0.03 + (completion.usage?.completion_tokens || 0) * 0.06) / 1000,
        success: true,
        userId: req.session?.userId || 'anonymous',
        sessionId: req.session?.id || 'no-session'
      });

      res.json({ response });

    } catch (error) {
      console.error("Chat error:", error);
      res.status(500).json({ 
        error: "Failed to process chat message",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // OpenAI streaming chat endpoint
  app.post("/api/chat/stream-openai", async (req, res) => {
    try {
      const { messages, recipeData } = req.body;
      
      if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({ error: "Messages array is required" });
      }

      console.log('🔄 OpenAI stream request with', messages.length, 'messages');

      // Set headers for streaming
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('Access-Control-Allow-Origin', '*');

      const systemMessage = {
        role: "system" as const,
        content: `You are Zest, Flavr's expert AI cooking assistant. You help users with recipe modifications, cooking questions, and culinary guidance.

${recipeData ? `Current recipe context: ${JSON.stringify(recipeData)}` : ''}

Guidelines:
- Provide specific, actionable cooking advice
- When modifying recipes, give exact measurements and instructions
- Be encouraging and knowledgeable
- Focus on practical results`
      };

      const chatMessages = [systemMessage, ...messages];

      const stream = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: chatMessages,
        temperature: 0.7,
        max_tokens: 1500,
        stream: true,
      });

      let fullResponse = '';

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          fullResponse += content;
          res.write(`data: ${JSON.stringify({ content })}\n\n`);
        }
      }

      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();

      // Log the successful interaction
      await logGPTInteraction({
        endpoint: 'chat-stream-openai',
        prompt: chatMessages.map(m => `${m.role}: ${m.content}`).join('\n'),
        response: fullResponse,
        model: 'gpt-4o',
        duration: 0,
        inputTokens: 0,
        outputTokens: 0,
        cost: 0,
        success: true,
        userId: req.session?.userId || 'anonymous',
        sessionId: req.session?.id || 'no-session'
      });

    } catch (error) {
      console.error("OpenAI stream error:", error);
      res.write(`data: ${JSON.stringify({ error: "Failed to process chat stream" })}\n\n`);
      res.end();
    }
  });

  // Voice realtime endpoint
  app.post("/api/voice/realtime", async (req, res) => {
    try {
      const { message, conversationHistory = [] } = req.body;
      
      if (!message) {
        return res.status(400).json({ error: "Message is required for voice processing" });
      }

      console.log('🎤 Voice realtime request:', { message: message.substring(0, 100) + '...' });

      // Process voice message similar to regular chat but optimized for speech
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are Zest, a helpful cooking assistant. Respond concisely for voice interaction. Keep responses under 2 sentences when possible."
          },
          ...conversationHistory.map((msg: any) => ({
            role: msg.type === 'user' ? 'user' : 'assistant',
            content: msg.content
          })),
          {
            role: "user",
            content: message
          }
        ],
        temperature: 0.7,
        max_tokens: 500,
      });

      const responseText = response.choices[0]?.message?.content || "I didn't catch that. Could you try again?";

      res.json({ response: responseText });

    } catch (error) {
      console.error("Voice realtime error:", error);
      res.status(500).json({ 
        error: "Failed to process voice message",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
}