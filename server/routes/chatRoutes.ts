import type { Express } from "express";
import OpenAI from "openai";
import { storage } from "../storage";
import { requireAuth } from "./authRoutes";
import { insertChatMessageSchema } from "@shared/schema";
import { logGPTInteraction, logSimpleGPTInteraction } from "../developerLogger";
import { ZestService } from "../zestService";

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

export function registerChatRoutes(app: Express) {
  const zestService = new ZestService();

  // Enhanced Zest chat endpoint with user memory and intent detection
  app.post("/api/zest/chat", async (req, res) => {
    try {
      const { message, conversationHistory = [], currentRecipe } = req.body;
      
      if (!message) {
        return res.status(400).json({ error: "Message is required" });
      }

      // Get user context
      const userContext = {
        userId: req.session?.userId,
        pseudoUserId: req.body.pseudoUserId, // For anonymous users
        isAuthenticated: !!req.session?.userId
      };

      console.log('🧠 Zest chat request:', { 
        message: message.substring(0, 100) + '...', 
        userId: userContext.userId,
        hasCurrentRecipe: !!currentRecipe 
      });

      // Load user memory and preferences
      const userMemory = await zestService.getUserMemory(userContext);
      console.log('🔍 User memory loaded:', {
        hasPreferences: !!userMemory.preferences,
        conversationHistory: userMemory.recentConversations.length,
        cookingHistory: userMemory.cookingHistory.length
      });

      // Detect recipe intent
      const intentResult = await zestService.detectRecipeIntent(message);
      console.log('🎯 Intent detection:', intentResult);

      // If recipe intent detected, offer to create recipe with specific suggestion
      if (intentResult.isRecipeIntent && intentResult.confidence >= 0.7) {
        // Use the smart inspiration system with enhanced context for user intent
        const { ChefAssistGPT5 } = await import('../chefAssistGPT5');
        const clientId = req.ip || 'anonymous';
        
        // Extract additional context from user message for better suggestions
        const lowerMessage = message.toLowerCase();
        
        // Detect specific ingredient requests first
        const commonIngredients = ['pasta', 'chicken', 'beef', 'pork', 'fish', 'salmon', 'shrimp', 'rice', 'potatoes', 'eggs', 'tofu', 'mushrooms', 'spinach', 'tomatoes', 'cheese', 'bread', 'beans', 'lentils', 'quinoa', 'avocado'];
        let specificIngredient = '';
        for (const ingredient of commonIngredients) {
          if (lowerMessage.includes(ingredient)) {
            specificIngredient = ingredient;
            break;
          }
        }
        
        console.log('🔍 Ingredient detection:', {
          message: lowerMessage,
          detectedIngredient: specificIngredient,
          willUseFocusedMode: !!specificIngredient
        });
        
        // Detect cuisine preferences
        let cuisinePreference = '';
        const cuisines = ['italian', 'chinese', 'thai', 'mexican', 'indian', 'japanese', 'french', 'greek', 'spanish', 'turkish', 'lebanese', 'moroccan', 'korean', 'vietnamese'];
        for (const cuisine of cuisines) {
          if (lowerMessage.includes(cuisine)) {
            cuisinePreference = cuisine;
            break;
          }
        }
        
        // Detect dietary restrictions and ingredients to avoid
        const avoidTerms = [];
        if (lowerMessage.includes('vegan')) avoidTerms.push('meat', 'dairy', 'eggs', 'fish');
        if (lowerMessage.includes('vegetarian')) avoidTerms.push('meat', 'fish');
        if (lowerMessage.includes('gluten-free') || lowerMessage.includes('gluten free')) avoidTerms.push('wheat', 'gluten');
        if (lowerMessage.includes('dairy-free') || lowerMessage.includes('dairy free')) avoidTerms.push('dairy', 'milk', 'cheese');
        if (lowerMessage.includes('nut-free') || lowerMessage.includes('nut free')) avoidTerms.push('nuts', 'peanuts');
        
        // If user specified an ingredient, create a more targeted suggestion using direct OpenAI call
        let inspiredTitle;
        console.log('🍝 About to check ingredient path, specificIngredient:', specificIngredient);
        if (specificIngredient) {
          console.log('🎯 Using targeted ingredient mode for:', specificIngredient);
          // For specific ingredient requests, use a direct OpenAI call to ensure relevance
          const ingredientResponse = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
              { 
                role: "system", 
                content: `You are a professional chef creating recipe titles. Generate ONE specific recipe title that prominently features the requested ingredient as the main component.

CRITICAL REQUIREMENTS:
- The recipe title MUST feature ${specificIngredient} as the primary ingredient
- Use format: "[Chef Name]-Inspired [Specific Dish Name] with [Key Feature]"
- Choose from these chef voices: Jamie Oliver, Rick Stein, Tom Kerridge, Mary Berry, Delia Smith, Marcus Wareing, Georgina Hayden, Jose Pizarro, Yotam Ottolenghi
- Be specific about the dish type (not just "pasta" but "Carbonara" or "Cacio e Pepe")
- Include one standout technique or flavor element
- ${cuisinePreference ? `Make it ${cuisinePreference} cuisine focused.` : ''}
- ${avoidTerms.length > 0 ? `Avoid these ingredients: ${avoidTerms.join(', ')}.` : ''}

Examples of good format:
- "Jamie Oliver-Inspired Creamy Carbonara with Crispy Pancetta"
- "Rick Stein-Inspired Seafood Linguine with White Wine & Herbs"
- "Tom Kerridge-Inspired Beef Ragu Pappardelle with Red Wine Reduction"

Respond with ONLY the recipe title, nothing else.`
              },
              { role: "user", content: `Create a recipe title featuring ${specificIngredient}` }
            ],
            max_tokens: 50,
            temperature: 0.7
          });
          
          inspiredTitle = ingredientResponse.choices[0].message.content?.trim() || `${specificIngredient.charAt(0).toUpperCase() + specificIngredient.slice(1)} Recipe`;
        } else {
          // Use the general inspiration system for broader requests
          const titleResult = await ChefAssistGPT5.generateInspireTitle({
            userIntent: message,
            clientId: clientId,
            cuisinePreference: cuisinePreference,
            avoid: avoidTerms,
            seeds: {
              randomSeed: Math.floor(Math.random() * 10000),
              complexityLevel: Math.floor(Math.random() * 15) + 1,
              simpleStyle: Math.floor(Math.random() * 15) + 1,
              creativityMode: Math.floor(Math.random() * 8) + 1,
              seasonalFocus: Math.floor(Math.random() * 6) + 1,
              textureTheme: Math.floor(Math.random() * 10) + 1,
              flavorProfile: Math.floor(Math.random() * 12) + 1
            }
          });
          
          inspiredTitle = titleResult.title;
        }
        
        // Create an engaging description of the inspired dish
        const suggestionResponse = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            { 
              role: "system", 
              content: `You are Zest, a warm cooking assistant. You've suggested this specific dish: "${inspiredTitle}". 

CRITICAL: Start your response by clearly stating the dish name, then create an enthusiastic, brief description (2-3 sentences) highlighting what makes this dish appealing.

Format: "How about [DISH NAME]? [Enthusiastic description of flavors, timing, techniques]. [Why it's perfect for their request]. Would you like me to turn this into a full Flavr recipe card?"

Be authentic and specific about the dish. Focus on:
- ALWAYS start with the exact dish name
- Key flavor elements and techniques
- Why it's perfect for their request  
- Brief timing/ease details if relevant
- End with asking if they want the full recipe card

Keep it conversational and enthusiastic like you're recommending your favorite dish to a friend.`
            },
            { role: "user", content: `The user asked: "${message}" and I'm suggesting: ${inspiredTitle}` }
          ],
          max_tokens: 200,
          temperature: 0.8
        });
        
        const specificSuggestion = suggestionResponse.choices[0].message.content;
        
        // Log chat recipe suggestion for developer monitoring
        if (userContext.userId) {
          await logGPTInteraction(
            userContext.userId,
            "chat-suggestion",
            { userMessage: message, cuisinePreference, avoidTerms },
            `User request: ${message}. Generated inspiration: ${inspiredTitle}`,
            specificSuggestion || "No response generated",
            { suggestedTitle: inspiredTitle },
            { actualResponse: specificSuggestion }
          );
        }
        
        const confirmationResponse = {
          message: specificSuggestion || `I'd love to help you with that! ${intentResult.suggestedAction} Would you like me to turn this into a Flavr recipe card?`,
          isRecipeIntent: true,
          confidence: intentResult.confidence,
          requiresConfirmation: true,
          suggestedRecipeTitle: inspiredTitle
        };
        
        return res.json(confirmationResponse);
      }

      // Build context with user memory
      const contextPrompt = zestService.buildZestContext(userMemory, currentRecipe);

      // Generate regular conversational response
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: contextPrompt },
          ...conversationHistory.map((msg: any) => ({
            role: msg.role || (msg.sender === 'user' ? 'user' : 'assistant'),
            content: msg.content || msg.text
          })),
          { role: "user", content: message }
        ],
        max_tokens: 800,
        temperature: 0.7
      });

      const zestResponse = response.choices[0].message.content;

      // Extract topics for memory update
      const topicsToRemember = [message.substring(0, 50)];
      
      // Update user preferences/memory if context suggests it
      if (message.toLowerCase().includes('prefer') || message.toLowerCase().includes('like') || message.toLowerCase().includes('avoid')) {
        await zestService.updateUserPreferences(userContext, {}, topicsToRemember);
      }

      // Save conversation to history
      if (userContext.userId) {
        try {
          await storage.createChatMessage({
            userId: userContext.userId,
            message: message,
            response: zestResponse || 'No response generated'
          });
        } catch (error) {
          console.error('Error saving chat message:', error);
        }
      }

      return res.json({
        message: zestResponse,
        isRecipeIntent: false,
        userMemory: {
          hasPreferences: !!userMemory.preferences,
          topicsRemembered: topicsToRemember.length
        }
      });

    } catch (error) {
      console.error('Error in Zest chat:', error);
      res.status(500).json({ error: "Failed to process chat message" });
    }
  });

  // Recipe generation endpoint for when user confirms intent
  app.post("/api/zest/generate-recipe", async (req, res) => {
    try {
      const { message, userConfirmed, suggestedRecipeTitle } = req.body;
      
      if (!userConfirmed) {
        return res.status(400).json({ error: "User confirmation required" });
      }

      // Check usage limit before generating recipe (simplified inline check)
      const userId = req.session?.userId;
      const pseudoId = req.headers['x-pseudo-user-id'] as string || req.session?.id || 'anonymous';
      
      try {
        if (userId) {
          const user = await storage.getUser(userId);
          if (user) {
            const isDeveloper = user.email === "william@blycontracting.co.uk";
            const hasUnlimitedAccess = user.hasFlavrPlus || isDeveloper;
            
            if (!hasUnlimitedAccess && (user.recipesThisMonth || 0) >= 3) {
              return res.status(403).json({
                error: "You have no free recipes remaining this month. Sign up for Flavr+ to get unlimited recipes!",
                recipesUsed: user.recipesThisMonth || 0,
                recipesLimit: 3,
                hasFlavrPlus: false
              });
            }
          }
        } else {
          let pseudoUser = await storage.getPseudoUser(pseudoId);
          if (!pseudoUser) {
            pseudoUser = await storage.createPseudoUser({ pseudoId });
          }
          
          if ((pseudoUser.recipesThisMonth || 0) >= 3) {
            return res.status(403).json({
              error: "You have no free recipes remaining this month. Sign up for Flavr+ to get unlimited recipes!",
              recipesUsed: pseudoUser.recipesThisMonth || 0,
              recipesLimit: 3,
              hasFlavrPlus: false
            });
          }
        }
      } catch (quotaError) {
        console.error('Error checking quota:', quotaError);
        // Continue without quota check if quota service fails
      }

      const userContext = {
        userId: req.session?.userId,
        pseudoUserId: req.body.pseudoUserId,
        isAuthenticated: !!req.session?.userId
      };

      // Load user memory
      const userMemory = await zestService.getUserMemory(userContext);

      // Generate recipe using the suggested title if available, otherwise use original message
      const recipePrompt = suggestedRecipeTitle || message;
      console.log('🍳 Generating recipe for:', { originalMessage: message, suggestedTitle: suggestedRecipeTitle, usingPrompt: recipePrompt });
      const recipe = await zestService.generateRecipe(recipePrompt, userContext, userMemory);

      // Log chat recipe generation for developer monitoring
      if (userContext.userId && recipe) {
        await logGPTInteraction(
          userContext.userId,
          "chat-recipe-generation",
          { userMessage: message },
          `Chat recipe generation request: ${message}`,
          `Generated recipe: ${recipe.title}`,
          { requestedRecipe: message },
          { generatedRecipe: { title: recipe.title, cuisine: recipe.cuisine, servings: recipe.servings } }
        );
      }

      // Save recipe and increment usage counter
      let savedRecipe = null;
      if (recipe) {
        try {
          // Save recipe if user is authenticated
          if (userContext.userId) {
            savedRecipe = await storage.createRecipe({
              userId: userContext.userId,
              title: recipe.title,
              description: recipe.description,
              cookTime: recipe.cookTime,
              servings: recipe.servings,
              difficulty: recipe.difficulty,
              cuisine: recipe.cuisine,
              mood: recipe.mood,
              mode: 'zest-chat',
              ingredients: recipe.ingredients,
              instructions: recipe.instructions,
              tips: recipe.tips,
              originalPrompt: message
            });
          }
          
          // Increment usage counter
          if (userContext.userId) {
            const user = await storage.getUser(userContext.userId);
            if (user) {
              const isDeveloper = user.email === "william@blycontracting.co.uk";
              const hasUnlimitedAccess = user.hasFlavrPlus || isDeveloper;
              
              if (!hasUnlimitedAccess) {
                await storage.updateUserUsage(userContext.userId, (user.recipesThisMonth || 0) + 1, user.imagesThisMonth || 0);
              }
            }
          } else {
            const pseudoUser = await storage.getPseudoUser(pseudoId);
            if (pseudoUser) {
              await storage.updatePseudoUserUsage(pseudoId, (pseudoUser.recipesThisMonth || 0) + 1);
            }
          }
        } catch (error) {
          console.error('Error saving Zest-generated recipe:', error);
        }
      }

      return res.json({
        recipe: recipe,
        message: "Here's your personalized recipe! I've created this based on your request and preferences. You can save it, modify it, or ask me any questions about the cooking process."
      });

    } catch (error) {
      console.error('Error generating recipe:', error);
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

CRITICAL INTELLIGENCE RULES for Recipe Updates:

1. ONLY use updateRecipe function when user EXPLICITLY requests changes:
   ✓ "Make it spicier" → Update with added chili/spices
   ✓ "Add more garlic" → Update ingredients and steps
   ✓ "Make it vegetarian" → Replace meat ingredients
   ✓ "Double the recipe" → Update all quantities
   
2. DO NOT update recipe for:
   ✗ "What wine pairs with this?" → Just give suggestions
   ✗ "Can I prep this ahead?" → Give advice only
   ✗ "Tell me about this dish" → Share knowledge only
   ✗ "How do I dice an onion?" → Provide technique tips

3. When you DO update:
   - Include ALL ingredients (complete list)
   - Include ALL instructions (every step)
   - Update title if the change is significant
   - Maintain exact formatting

4. Always respond conversationally first, explaining what you're changing and why.

Be warm, encouraging, and knowledgeable about cooking!`;

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
            response: fullResponse
          });
        } catch (dbError) {
          console.error('Failed to save chat message:', dbError);
        }
      }

      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();

      // Log the interaction using simplified logging
      await logSimpleGPTInteraction({
        endpoint: 'chat-stream',
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
            response
          });
        } catch (dbError) {
          console.error('Failed to save chat message:', dbError);
        }
      }

      // Log the interaction using simplified logging
      await logSimpleGPTInteraction({
        endpoint: 'chat',
        prompt: messages.map(m => `${m.role}: ${m.content}`).join('\n'),
        response,
        model: 'gpt-4o',
        duration: 0,
        inputTokens: completion.usage?.prompt_tokens || 0,
        outputTokens: completion.usage?.completion_tokens || 0,
        cost: ((completion.usage?.prompt_tokens || 0) * 0.03 + (completion.usage?.completion_tokens || 0) * 0.06) / 1000,
        success: true,
        userId: req.session?.userId?.toString() || undefined
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

      // Log the successful interaction using simplified logging
      await logSimpleGPTInteraction({
        endpoint: 'chat-stream-openai',
        prompt: chatMessages.map(m => `${m.role}: ${m.content}`).join('\n'),
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