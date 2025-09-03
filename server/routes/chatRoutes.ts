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
        hasCurrentRecipe: !!currentRecipe,
        currentRecipeTitle: currentRecipe?.title,
        currentRecipeIngredients: currentRecipe?.ingredients?.length || 0
      });

      // Load user memory and preferences
      const userMemory = await zestService.getUserMemory(userContext);
      console.log('🔍 User memory loaded:', {
        hasPreferences: !!userMemory.preferences,
        conversationHistory: userMemory.recentConversations.length,
        cookingHistory: userMemory.cookingHistory.length
      });

      // Check if this is a request for a quick recipe in chat (check this FIRST)
      const isQuickRecipeRequest = message.toLowerCase().startsWith('quick recipe for:');
      
      // Detect recipe intent - but only for new recipes if no current recipe exists
      const intentResult = await zestService.detectRecipeIntent(message);
      console.log('🎯 Intent detection:', intentResult);
      
      if (isQuickRecipeRequest) {
        console.log('🔍 Quick recipe request detected, generating condensed recipe');
        
        const recipeTitle = message.replace(/^quick recipe for:\s*/i, '').trim();
        
        // Build context for quick recipe generation
        const contextPrompt = zestService.buildZestContext(userMemory, currentRecipe);
        
        const quickRecipeResponse = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            { 
              role: "system", 
              content: `${contextPrompt}

QUICK RECIPE MODE: Generate a condensed, easy-to-follow recipe directly in the chat. Keep it concise but complete.

Format:
📝 **Recipe Title**

🥘 **Ingredients:** (bullet points, 4-8 items max)
• Main ingredient with quantity
• Key flavor enhancers

👨‍🍳 **Quick Method:** (2-4 simple steps)
1. Prep step with timing
2. Cooking step with technique
3. Finishing step

⏱️ **Time:** Total cooking time | **Serves:** Number of people

💡 **Pro Tip:** One key technique or flavor enhancement

Be warm and encouraging like Zest, but keep it concise for easy chat reading.` 
            },
            { role: "user", content: `Give me a quick recipe for: ${recipeTitle}` }
          ],
          max_tokens: 500,
          temperature: 0.7
        });

        const quickRecipe = quickRecipeResponse.choices[0].message.content;
        
        // Save the conversation
        if (userContext.userId) {
          try {
            await storage.createChatMessage({
              userId: userContext.userId,
              message: message,
              response: quickRecipe || 'No response generated'
            });
          } catch (error) {
            console.error('Error saving quick recipe chat:', error);
          }
        }

        return res.json({
          message: quickRecipe,
          isRecipeIntent: false,
          isQuickRecipe: true,
          userMemory: {
            hasPreferences: !!userMemory.preferences,
            topicsRemembered: [recipeTitle]
          }
        });
      }

      // Check if user is confirming they want an alternative suggestion
      const isAlternativeConfirmation = message.toLowerCase().trim() === 'yes' && 
        conversationHistory.length > 0 && 
        conversationHistory[conversationHistory.length - 1]?.response?.includes('Would you like me to suggest another');

      if (isAlternativeConfirmation) {
        console.log('🔄 User confirmed alternative suggestion request');
        
        // Find the original context from the last few messages
        let originalContext = 'recipe';
        for (let i = conversationHistory.length - 1; i >= Math.max(0, conversationHistory.length - 5); i--) {
          const msg = conversationHistory[i];
          if (msg.message && msg.message.includes('suggestion for:')) {
            originalContext = msg.message.replace('Another suggestion for:', '').replace('suggestion for:', '').trim();
            break;
          } else if (msg.response && msg.response.includes('suggest another')) {
            // Extract context type from the response
            const match = msg.response.match(/suggest another (\w+(?:\s+\w+)*) recipe/);
            if (match) {
              originalContext = match[1];
            }
            break;
          }
        }
        
        console.log('🔍 Alternative context found:', originalContext);
        
        // Use the smart inspiration system with preserved context
        const { ChefAssistGPT5 } = await import('../chefAssistGPT5');
        const clientId = req.ip || 'anonymous';
        
        try {
          console.log('🎲 Generating alternative suggestion with context:', originalContext);
          
          // Generate seed packs for inspiration
          const seedPacks = {
            techniqueSeed: Math.floor(Math.random() * 15),
            simplicitySeed: Math.floor(Math.random() * 15),
            creativitySeed: Math.floor(Math.random() * 8),
            seasonSeed: Math.floor(Math.random() * 6),
            textureSeed: Math.floor(Math.random() * 10),
            flavourSeed: Math.floor(Math.random() * 12),
            randomSeed: Math.floor(Math.random() * 1000000),
            complexityLevel: 'medium',
            simpleStyle: 'balanced',
            creativityMode: 'classic',
            seasonalFocus: 'neutral',
            texturePreference: 'varied',
            flavourProfile: 'balanced'
          };
          
          const inspiration = await ChefAssistGPT5.generateInspireTitle({
            seeds: seedPacks,
            userIntent: originalContext,
            clientId
          });

          if (!inspiration?.title) {
            throw new Error('No inspiration generated');
          }

          const suggestedTitle = inspiration.title;
          const response = `How about ${suggestedTitle}? This sounds delicious and fits what you're looking for! Would you like me to turn this into a full Flavr recipe card?`;

          // Save the conversation with original context preserved
          if (userContext.userId) {
            try {
              await storage.createChatMessage({
                userId: userContext.userId,
                message: message,
                response: response
              });
            } catch (error) {
              console.error('Error saving alternative suggestion chat:', error);
            }
          }

          return res.json({
            message: response,
            isRecipeIntent: true,
            isConfirmation: true,
            suggestedRecipeTitle: suggestedTitle,
            originalMessage: originalContext,
            userMemory: {
              hasPreferences: !!userMemory.preferences,
              topicsRemembered: [originalContext, suggestedTitle]
            }
          });
        } catch (error) {
          console.error('Error generating alternative suggestion:', error);
          return res.json({
            message: "Sorry, I'm having trouble coming up with another suggestion right now. Could you try asking again?",
            isRecipeIntent: false,
            userMemory: {
              hasPreferences: !!userMemory.preferences,
              topicsRemembered: [originalContext]
            }
          });
        }
      }

      // Check if this is a quick cooking question that doesn't need a recipe card
      const isQuickAnswerRequest = !intentResult.isRecipeIntent && (
        message.toLowerCase().includes('how do i') ||
        message.toLowerCase().includes('how to') ||
        message.toLowerCase().includes('what is') ||
        message.toLowerCase().includes('can i use') ||
        message.toLowerCase().includes('substitute') ||
        message.toLowerCase().includes('wine pair') ||
        message.toLowerCase().includes('store') ||
        message.toLowerCase().includes('keep') ||
        message.toLowerCase().includes('how long') ||
        message.toLowerCase().includes('best way') ||
        message.toLowerCase().includes('technique') ||
        message.toLowerCase().includes('equipment') ||
        message.toLowerCase().includes('temperature')
      );

      // If it's a quick answer request, provide direct conversational response
      if (isQuickAnswerRequest) {
        console.log('🔍 Quick answer mode detected, providing direct response');
        
        // Build context with user memory for personalized answers
        const contextPrompt = zestService.buildZestContext(userMemory, currentRecipe);
        
        const quickResponse = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            { role: "system", content: contextPrompt + "\n\nQUICK ANSWER MODE: Provide direct, helpful cooking advice without offering to create recipe cards. Be concise but thorough." },
            ...conversationHistory.map((msg: any) => ({
              role: msg.role || (msg.sender === 'user' ? 'user' : 'assistant'),
              content: msg.content || msg.text
            })),
            { role: "user", content: message }
          ],
          max_tokens: 400,
          temperature: 0.7
        });

        const quickAnswer = quickResponse.choices[0].message.content;
        
        // Save the conversation
        if (userContext.userId) {
          try {
            await storage.createChatMessage({
              userId: userContext.userId,
              message: message,
              response: quickAnswer || 'No response generated'
            });
          } catch (error) {
            console.error('Error saving quick answer chat:', error);
          }
        }

        return res.json({
          message: quickAnswer,
          isRecipeIntent: false,
          isQuickAnswer: true,
          userMemory: {
            hasPreferences: !!userMemory.preferences,
            topicsRemembered: [message.substring(0, 50)]
          }
        });
      }

      // If recipe intent detected AND no valid current recipe exists, offer to create new recipe
      if (intentResult.isRecipeIntent && intentResult.confidence >= 0.7 && (!currentRecipe || !currentRecipe.title || currentRecipe.title.trim().length === 0 || !currentRecipe.ingredients || currentRecipe.ingredients.length === 0)) {
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
          
          // Use the same comprehensive chef list as the Inspire Me system for alignment
          const allChefs = [
            "Gordon Ramsay", "Jamie Oliver", "Nigella Lawson", "Mary Berry", "Tom Kerridge", 
            "Rick Stein", "Delia Smith", "James Martin", "Hugh Fearnley-Whittingstall", 
            "Marco Pierre White", "Heston Blumenthal", "Michel Roux Jr", "Angela Hartnett",
            "Paul Hollywood", "Nadiya Hussain", "Ainsley Harriott", "Gino D'Acampo",
            "Yotam Ottolenghi", "José Andrés", "Julia Child", "Thomas Keller", "David Chang",
            "Phil Vickery", "John Torode", "Gregg Wallace", "Gary Rhodes", "Keith Floyd", 
            "Ken Hom", "Madhur Jaffrey", "Prue Leith", "Raymond Blanc", "Antonio Carluccio",
            "Giorgio Locatelli", "Francesco Mazzei", "Atul Kochhar", "Vivek Singh", 
            "Jun Tanaka", "Monica Galetti", "Clare Smyth", "Nathan Outlaw", "Josh Eggleton",
            "Anna Hansen", "Sat Bains", "Simon Rogan", "Tommy Banks", "Roberta Hall McCarron",
            "Lisa Goodwin-Allen", "Adam Handling", "Aktar Islam"
          ];
          
          // Align with Inspire Me system: randomly choose between chef, restaurant, or mood inspiration (33% each)
          const inspirationType = Math.floor(Math.random() * 3);
          let selectedInspiration;
          let inspirationFormat;
          
          if (inspirationType === 0) {
            // Chef inspiration
            const randomIndex = Math.floor(Math.random() * allChefs.length);
            selectedInspiration = allChefs[randomIndex];
            inspirationFormat = `${selectedInspiration}-Inspired`;
            console.log(`🎲 Chef selection: ${selectedInspiration} (${randomIndex + 1}/${allChefs.length})`);
          } else if (inspirationType === 1) {
            // Restaurant inspiration (aligned with ChefAssistGPT5)
            const allRestaurants = [
              "Dishoom", "Padella", "The Ivy", "Sketch", "Hawksmoor", "Barrafina", "Gymkhana", 
              "Duck & Waffle", "Chiltern Firehouse", "St. John", "Bao", "Kiln", "Hoppers", 
              "Brat", "Lyle's", "Noble Rot", "The Clove Club", "Roka", "Zuma", "Dinings SW3", 
              "Lima", "Temper", "Smoking Goat", "Ikoyi", "The Ledbury", "Pollen Street Social", 
              "Dinner by Heston", "Core by Clare Smyth", "Trinity", "Petersham Nurseries", 
              "Hide", "Aqua Shard", "Galvin La Chapelle", "Rules", "Simpson's in the Strand", 
              "Sweetings", "Nando's", "Wagamama", "Pizza Express", "Byron", "Leon", "Yo! Sushi"
            ];
            const randomIndex = Math.floor(Math.random() * allRestaurants.length);
            selectedInspiration = allRestaurants[randomIndex];
            inspirationFormat = `${selectedInspiration}-Inspired`;
            console.log(`🏪 Restaurant selection: ${selectedInspiration} (${randomIndex + 1}/${allRestaurants.length})`);
          } else {
            // Mood inspiration 
            const moods = [
              "Comforting", "Fresh Spring", "Summer Celebration", "Cozy Autumn", "Romantic", 
              "Family Feast", "Quick Weeknight", "Weekend Indulgence", "Healthy Reset", 
              "Nostalgic", "Exotic Adventure", "Elegant", "Rustic", "Spicy", "Cooling"
            ];
            const randomIndex = Math.floor(Math.random() * moods.length);
            selectedInspiration = moods[randomIndex];
            inspirationFormat = selectedInspiration;
            console.log(`🎭 Mood selection: ${selectedInspiration} (${randomIndex + 1}/${moods.length})`);
          }
          
          // For specific ingredient requests, use a direct OpenAI call to ensure relevance
          const ingredientResponse = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
              { 
                role: "system", 
                content: `You are a professional creating recipe titles. Generate ONE specific recipe title that prominently features the requested ingredient as the main component.

CRITICAL REQUIREMENTS:
- The recipe title MUST feature ${specificIngredient} as the primary ingredient
- Use format: "${inspirationFormat} [Specific Dish Name] with [Key Feature]"
- ${inspirationType === 0 ? `MUST use exactly this chef: ${selectedInspiration}` : ''}
- ${inspirationType === 1 ? `MUST align with ${selectedInspiration} restaurant style` : ''}
- ${inspirationType === 2 ? `MUST capture the ${selectedInspiration} mood` : ''}
- Be specific about the dish type (not just "pasta" but "Carbonara" or "Cacio e Pepe")
- Include one standout technique or flavor element
- ${cuisinePreference ? `Make it ${cuisinePreference} cuisine focused.` : ''}
- ${avoidTerms.length > 0 ? `Avoid these ingredients: ${avoidTerms.join(', ')}.` : ''}

Examples of good format:
- "Jamie Oliver-Inspired Creamy Carbonara with Crispy Pancetta"
- "Dishoom-Inspired Black Daal with Fragrant Spices"
- "Comforting Chicken Pasta Bake with Herb Crust"

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
              content: `You are Zest, a warm personal chef companion. You've suggested this specific dish: "${inspiredTitle}". 

CRITICAL: Start your response by clearly stating the dish name, then create an enthusiastic, brief description (2-3 sentences) highlighting what makes this dish appealing.

Format: "How about [DISH NAME]? [Enthusiastic description of flavors, timing, techniques]. [Why it's perfect for their request]. Would you like me to turn this into a full Flavr recipe card?"

Be authentic and specific about the dish. Focus on:
- ALWAYS start with the exact dish name
- Key flavor elements and techniques
- Why it's perfect for their request  
- Brief timing/ease details if relevant
- End with asking if they want the full recipe card

IMPORTANT: Write like a real chef talking to a friend - NO ** formatting, NO markdown, just natural conversational language. Be warm and personal, not robotic.`
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

      // Handle recipe modifications ONLY when a current recipe exists AND has proper content
      if (currentRecipe && currentRecipe.title && currentRecipe.title.trim().length > 0 && currentRecipe.ingredients && currentRecipe.ingredients.length > 0) {
        console.log('🔧 Recipe modification request detected with current recipe:', currentRecipe.title);
        
        // Use AI to intelligently detect if this is a recipe modification request
        const modificationDetectionResponse = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            {
              role: "system",
              content: `You are an AI that determines if a user message is requesting modifications to an existing recipe. 

CURRENT RECIPE CONTEXT: "${currentRecipe.title}"

Analyze the user's message and determine:
1. Is this asking to modify/change/adjust the current recipe?
2. Or is this asking for general cooking advice/tips?
3. Or is this requesting a completely new recipe?

Respond with ONLY a JSON object:
{
  "isModificationRequest": boolean,
  "confidence": number (0-1),
  "reasoning": "brief explanation"
}

Examples of modification requests:
- "make it spicier", "add garlic", "use chicken instead", "make it vegan"
- "can you make this gluten-free?", "what if I don't have cream?"
- "increase the portions", "make it less salty", "add vegetables"
- "use different herbs", "make it Italian style", "add a crispy topping"

Examples of NON-modification requests:
- "how do I store leftovers?", "what wine pairs with this?"
- "tell me about Italian cuisine", "what are good cooking tips?"
- "I want a different chicken recipe", "suggest a dessert"`
            },
            {
              role: "user",
              content: message
            }
          ],
          max_tokens: 150,
          temperature: 0.1,
          response_format: { type: "json_object" }
        });

        let isModificationRequest = false;
        try {
          const detection = JSON.parse(modificationDetectionResponse.choices[0].message.content || '{}');
          isModificationRequest = detection.isModificationRequest && detection.confidence > 0.6;
          console.log('🤖 AI Modification Detection:', detection);
        } catch (error) {
          console.error('Error parsing modification detection:', error);
          // Fallback to keyword detection
          const modificationKeywords = [
            'make it', 'make this', 'change', 'substitute', 'replace', 'swap', 
            'add', 'remove', 'without', 'instead', 'more', 'less', 'different'
          ];
          isModificationRequest = modificationKeywords.some(keyword => 
            message.toLowerCase().includes(keyword)
          );
        }
        
        if (isModificationRequest) {
          console.log('🎯 Processing recipe modification request');
          
          try {
            // Use ZestService to generate recipe modification
            const modifiedRecipe = await zestService.generateRecipeModification(
              message,
              currentRecipe,
              userContext
            );
            
            return res.json({
              message: "Perfect! I've updated your recipe with those changes.",
              isRecipeModification: true,
              modifiedRecipe: modifiedRecipe,
              streamingUpdate: true
            });
          } catch (error) {
            console.error('Error generating recipe modification:', error);
            return res.json({
              message: "I'd be happy to help modify your recipe! Could you be a bit more specific about what you'd like to change?",
              isRecipeModification: false
            });
          }
        }
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
              imageUrl: recipe.imageUrl, // Include the generated image URL
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
        savedRecipeId: savedRecipe?.id,
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