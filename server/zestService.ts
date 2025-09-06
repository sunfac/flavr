import { db } from "./db";
import { userPreferences, chatMessages, recipes, users, pseudoUsers } from "@shared/schema";
import { eq, desc, and } from "drizzle-orm";
import OpenAI from "openai";
import { aiCostTracker } from "./aiCostTracker";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface UserContext {
  userId?: number;
  pseudoUserId?: number;
  isAuthenticated: boolean;
}

interface ZestMemory {
  preferences?: any;
  recentConversations: any[];
  lastInteractionTopics: string[];
  mentionedPreferences: Record<string, any>;
  cookingHistory: any[];
}

export class ZestService {
  
  /**
   * Get user's cooking memory and preferences for context
   */
  async getUserMemory(context: UserContext): Promise<ZestMemory> {
    try {
      const memory: ZestMemory = {
        recentConversations: [],
        lastInteractionTopics: [],
        mentionedPreferences: {},
        cookingHistory: []
      };

      // Get user preferences if they exist
      if (context.userId || context.pseudoUserId) {
        const prefsQuery = context.userId 
          ? eq(userPreferences.userId, context.userId)
          : eq(userPreferences.pseudoUserId, context.pseudoUserId!);
        
        try {
          const [prefs] = await db.select().from(userPreferences).where(prefsQuery);
          if (prefs) {
            memory.preferences = prefs;
            memory.lastInteractionTopics = prefs.lastInteractionTopics || [];
            memory.mentionedPreferences = prefs.mentionedPreferences || {};
          }
        } catch (error) {
          console.log('User preferences table not ready yet, continuing without stored preferences');
        }

        // Get recent conversations
        if (context.userId) {
          const recentChats = await db
            .select()
            .from(chatMessages)
            .where(eq(chatMessages.userId, context.userId))
            .orderBy(desc(chatMessages.createdAt))
            .limit(10);
          
          memory.recentConversations = recentChats;
        }

        // Get recent recipe history
        const recipeQuery = context.userId 
          ? eq(recipes.userId, context.userId)
          : eq(recipes.userId, context.pseudoUserId!);
        
        const recentRecipes = await db
          .select()
          .from(recipes)
          .where(recipeQuery)
          .orderBy(desc(recipes.createdAt))
          .limit(5);
        
        memory.cookingHistory = recentRecipes;
      }

      return memory;
    } catch (error) {
      console.error('Error loading user memory:', error);
      return {
        recentConversations: [],
        lastInteractionTopics: [],
        mentionedPreferences: {},
        cookingHistory: []
      };
    }
  }

  /**
   * Detect if user input implies intent for recipe creation
   */
  async detectRecipeIntent(message: string): Promise<{
    isRecipeIntent: boolean;
    confidence: number;
    suggestedAction?: string;
  }> {
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are an intent classifier for a cooking assistant. Determine if the user's message implies they want a FULL RECIPE CARD created vs wanting COOKING ADVICE.

RECIPE INTENT indicators (wants full recipe card created):
- "Can you make me a recipe for..."
- "I want to cook something..." (vague, needs full recipe)
- "Give me a recipe..."
- "I need a recipe that..."
- "Create a dish with..."
- "Turn this into a recipe"
- "I need a [meal] idea..." (breakfast, lunch, dinner, etc.)
- "What should I cook..." (needs suggestions)
- "Give me a [meal] suggestion..."
- "I'm looking for something to cook..."
- "Help me decide what to make..."
- "What can I make for [meal]..."
- Vague requests needing full recipes

NOT RECIPE INTENT (Quick Cooking Advice Mode):
- Specific technique questions: "How do I make sautéed asparagus?" → User knows the dish, wants technique advice
- "How to cook [specific dish]" → Technique guidance, not full recipe creation
- General cooking questions ("How do I dice onions?")
- Ingredient substitutions ("Can I use butter instead of oil?")
- Cooking techniques ("What's the best way to sear?", "How to sauté vegetables?")
- Wine pairings, general advice, casual conversation
- Storage questions ("How do I store leftovers?")
- Timing questions ("How long should I marinate this?")
- Equipment questions ("What pan should I use?")
- Food safety questions ("Is this still good to eat?")
- Side dish discussions in ongoing conversations

CRITICAL: If user asks about a SPECIFIC DISH technique (like "sautéed asparagus with lemon"), they want COOKING ADVICE, not a new recipe card.

Respond with JSON: {"isRecipeIntent": boolean, "confidence": 0.0-1.0, "suggestedAction": "brief description", "isQuickAnswer": boolean}`
          },
          {
            role: "user",
            content: message
          }
        ],
        response_format: { type: "json_object" },
        max_tokens: 150
      });

      // Track cost for intent detection
      await aiCostTracker.trackCost({
        userId: undefined, // Intent detection doesn't need user tracking
        provider: 'openai',
        model: 'gpt-4o',
        operation: 'intent-detection',
        inputTokens: response.usage?.prompt_tokens,
        outputTokens: response.usage?.completion_tokens,
        requestData: { messageLength: message.length },
        responseData: { maxTokens: 150 }
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');
      return {
        isRecipeIntent: result.isRecipeIntent || false,
        confidence: result.confidence || 0,
        suggestedAction: result.suggestedAction
      };
    } catch (error) {
      console.error('Error detecting recipe intent:', error);
      return { isRecipeIntent: false, confidence: 0 };
    }
  }

  /**
   * Generate a recipe in Flavr's structured format
   */
  async generateRecipe(userMessage: string, context: UserContext, memory: ZestMemory): Promise<any> {
    try {
      // Build context from user memory
      const preferencesContext = this.buildPreferencesContext(memory);
      
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are Zest, Flavr's expert cooking assistant. Generate a complete recipe based on the user's request with MAXIMUM FLAVOR optimization.

USER CONTEXT:
${preferencesContext}

CRITICAL: MAXIMIZE FLAVOR WITH SMART ADDITIONS
Always enhance recipes with flavor-boosting ingredients where appropriate:
- Gravies/Sauces: Add wine, stock, herbs (thyme, bay leaves), aromatics (onions, garlic, shallots)
- Meats: Include marinades, herb crusts, compound butters, finishing salts
- Vegetables: Add roasting techniques, caramelization, herb oils, citrus zests
- Soups/Stews: Layer flavors with wine reductions, fresh herbs, acidic finishes
- Desserts: Include vanilla extracts, citrus zests, spice blends, flavor salts

FLAVOR ENHANCEMENT EXAMPLES:
- Chicken gravy: Add white wine, fresh thyme, bay leaves, proper roux technique
- Pasta dishes: Include pasta water, fresh herbs, cheese rinds, garlic oils
- Rice dishes: Use stock instead of water, add aromatics, finish with herbs
- Roasted vegetables: Add herb oils, balsamic glazes, finishing salts

Generate a recipe in this EXACT JSON format:
{
  "title": "Recipe Name",
  "description": "Brief appetizing description highlighting flavor enhancements",
  "servings": 4,
  "cookTime": 30,
  "difficulty": "Easy|Medium|Hard",
  "cuisine": "cuisine type",
  "mood": "quick|balanced|ambitious",
  "ingredients": ["ingredient 1 with proper measurements", "flavor-enhancing ingredient 2"],
  "instructions": ["Detailed step 1 with flavor techniques", "Step 2 with timing"],
  "tips": "Professional flavor-maximizing tips and techniques",
  "mode": "zest-chat"
}

Make it personal, professional-quality, and optimized for maximum flavor impact.`
          },
          {
            role: "user",
            content: userMessage
          }
        ],
        response_format: { type: "json_object" },
        max_tokens: 1500
      });

      // Track cost for recipe generation
      await aiCostTracker.trackCost({
        userId: context.userId,
        sessionId: context.pseudoUserId?.toString(),
        provider: 'openai',
        model: 'gpt-4o',
        operation: 'recipe-generation',
        inputTokens: response.usage?.prompt_tokens,
        outputTokens: response.usage?.completion_tokens,
        requestData: { userMessage, hasPreferences: !!memory.preferences },
        responseData: { maxTokens: 1500 }
      });

      const recipe = JSON.parse(response.choices[0].message.content || '{}');
      
      // Generate recipe image for chat-generated recipes
      try {
        const { generateRecipeImageWithDallE, createRecipeImagePrompt } = await import('./imageGeneration');
        const imagePrompt = createRecipeImagePrompt(recipe.title, recipe.ingredients, recipe.mood, recipe.cuisine);
        const imageUrl = await generateRecipeImageWithDallE(imagePrompt);
        
        // Track image generation cost for DALL-E
        await aiCostTracker.trackCost({
          userId: context.userId,
          sessionId: context.pseudoUserId?.toString(),
          provider: 'openai',
          model: 'dall-e-3',
          operation: 'image-generation',
          fixedCostUsd: '0.04', // DALL-E 3 standard quality pricing
          requestData: { prompt: imagePrompt, recipe: recipe.title }
        });
        
        if (imageUrl) {
          recipe.imageUrl = imageUrl;
          console.log('✅ Recipe image generated for chat recipe:', recipe.title);
        } else {
          console.log('⚠️ Recipe image generation failed for chat recipe:', recipe.title);
        }
      } catch (imageError) {
        console.error('Error generating image for chat recipe:', imageError);
        // Still track the cost even if it failed
        try {
          await aiCostTracker.trackCost({
            userId: context.userId,
            sessionId: context.pseudoUserId?.toString(),
            provider: 'openai',
            model: 'dall-e-3',
            operation: 'image-generation-failed',
            fixedCostUsd: '0.00',
            requestData: { error: imageError instanceof Error ? imageError.message : 'Unknown error' }
          });
        } catch (trackError) {
          console.error('Error tracking failed image generation cost:', trackError);
        }
        // Continue without image - don't fail the entire recipe generation
      }
      
      return recipe;
    } catch (error) {
      console.error('Error generating recipe:', error);
      throw error;
    }
  }

  /**
   * Build conversation context with user preferences and memory
   */
  buildZestContext(memory: ZestMemory, currentRecipe?: any): string {
    const contextParts = [
      "You are Zest, Flavr's warm and knowledgeable personal chef companion.",
      "",
      "CORE PERSONALITY:",
      "- Warm, encouraging, and personable",
      "- Expert culinary knowledge balanced with friendliness", 
      "- Build ongoing relationships by referencing past interactions",
      "- Maintain continuity across conversations",
      "",
      "RESPONSE GUIDELINES:",
      "- For recipe requests: Confirm 'Would you like me to turn this into a Flavr recipe card?'",
      "- For quick cooking questions: Provide direct, helpful answers without offering recipe cards",
      "- Quick answer topics: cooking techniques, tips, substitutions, timing, storage, wine pairings",
      "- Reference user preferences naturally ('You mentioned loving Thai food last time')",
      "- For non-cooking queries, politely redirect: 'I'm your personal chef, so I'll stick to food — but here's how I can help...'",
      "- Be conversational and build trust through memory and personalization", 
      "- NEVER use ** formatting or AI-style markdown - write naturally like a friendly chef",
      "- Speak like a real person, not a chatbot - be warm and personal",
      "",
      "QUICK ANSWER MODE:",
      "- Cooking techniques: 'How do I sear properly?' → Direct technique explanation",
      "- Substitutions: 'Can I use butter instead of oil?' → Direct substitution advice",
      "- Storage tips: 'How do I store this?' → Direct storage guidance",
      "- Wine pairings: 'What wine goes with this?' → Direct pairing suggestions",
      "- Timing questions: 'How long should I cook this?' → Direct timing advice",
      "- General tips: 'How do I make this crispy?' → Direct technique tips",
      "- Do NOT offer recipe cards for these - just give helpful, direct answers"
    ];

    // Add user memory context
    if (memory.preferences) {
      contextParts.push(
        "",
        "USER PREFERENCES MEMORY:",
        `- Dietary: ${memory.preferences.dietaryRestrictions?.join(', ') || 'None specified'}`,
        `- Favorite cuisines: ${memory.preferences.preferredCuisines?.join(', ') || 'Not specified'}`,
        `- Skill level: ${memory.preferences.skillLevel || 'Not specified'}`,
        `- Time preference: ${memory.preferences.timePreference || 'Not specified'} minutes`,
        `- Budget: ${memory.preferences.budgetPreference || 'Not specified'}`,
        `- Last cooking mood: ${memory.preferences.cookingMood || 'Not specified'}`
      );
    }

    // Add conversation history context
    if (memory.lastInteractionTopics.length > 0) {
      contextParts.push(
        "",
        "RECENT INTERACTION TOPICS:",
        ...memory.lastInteractionTopics.map(topic => `- ${topic}`)
      );
    }

    // Add cooking history
    if (memory.cookingHistory.length > 0) {
      contextParts.push(
        "",
        "RECENT COOKING HISTORY:",
        ...memory.cookingHistory.slice(0, 3).map(recipe => 
          `- ${recipe.title} (${recipe.cuisine || 'cuisine'}, ${recipe.difficulty || 'difficulty'})`
        )
      );
    }

    // Add current recipe context if available
    if (currentRecipe) {
      contextParts.push(
        "",
        "CURRENT RECIPE CONTEXT:",
        `Recipe: "${currentRecipe.title}"`,
        `Servings: ${currentRecipe.servings}`,
        `Cook Time: ${currentRecipe.cookTime} minutes`,
        `Difficulty: ${currentRecipe.difficulty}`,
        currentRecipe.cuisine ? `Cuisine: ${currentRecipe.cuisine}` : '',
        "",
        "You can help modify this recipe or answer questions about it."
      );
    }

    return contextParts.join('\n');
  }

  /**
   * Update user preferences based on conversation
   */
  async updateUserPreferences(context: UserContext, newPreferences: Partial<any>, topics: string[]): Promise<void> {
    if (!context.userId && !context.pseudoUserId) return;

    try {
      const query = context.userId 
        ? eq(userPreferences.userId, context.userId)
        : eq(userPreferences.pseudoUserId, context.pseudoUserId!);

      const [existing] = await db.select().from(userPreferences).where(query);

      if (existing) {
        // Update existing preferences
        await db.update(userPreferences)
          .set({
            ...newPreferences,
            lastInteractionTopics: topics,
            lastUpdated: new Date(),
          })
          .where(query);
      } else {
        // Create new preferences
        await db.insert(userPreferences).values({
          userId: context.userId,
          pseudoUserId: context.pseudoUserId,
          ...newPreferences,
          lastInteractionTopics: topics,
        });
      }
    } catch (error) {
      console.log('Preferences update not available yet, will be ready after schema migration');
    }
  }

  private buildPreferencesContext(memory: ZestMemory): string {
    if (!memory.preferences) {
      return "No stored preferences available - this is a new user or anonymous session.";
    }

    const prefs = memory.preferences;
    const context = [
      "USER COOKING PROFILE:",
      prefs.dietaryRestrictions?.length ? `- Dietary restrictions: ${prefs.dietaryRestrictions.join(', ')}` : '',
      prefs.preferredCuisines?.length ? `- Favorite cuisines: ${prefs.preferredCuisines.join(', ')}` : '',
      prefs.avoidedIngredients?.length ? `- Avoids: ${prefs.avoidedIngredients.join(', ')}` : '',
      prefs.skillLevel ? `- Skill level: ${prefs.skillLevel}` : '',
      prefs.timePreference ? `- Typical cooking time: ${prefs.timePreference} minutes` : '',
      prefs.budgetPreference ? `- Budget preference: ${prefs.budgetPreference}` : '',
      prefs.spiceLevel ? `- Spice preference: ${prefs.spiceLevel}` : ''
    ].filter(Boolean);

    return context.join('\n');
  }

  /**
   * Generate a modified version of a recipe based on user request
   */
  async generateRecipeModification(
    modificationRequest: string,
    currentRecipe: any,
    userContext: UserContext
  ): Promise<any> {
    try {
      console.log('🔧 Generating recipe modification for:', currentRecipe.title);

      const prompt = `You are a professional chef with expertise in adapting recipes. The user wants to modify their current recipe based on their specific request.

CURRENT RECIPE:
Title: ${currentRecipe.title}
Servings: ${currentRecipe.servings}
Cook Time: ${currentRecipe.cookTime} minutes
Difficulty: ${currentRecipe.difficulty}
Ingredients: ${currentRecipe.ingredients.join(', ')}
Instructions: ${currentRecipe.instructions.join(' ')}

USER MODIFICATION REQUEST: "${modificationRequest}"

Your task is to intelligently understand what the user wants and adapt the recipe accordingly. This could involve:
- Changing ingredients (substitutions, additions, removals)
- Adjusting cooking methods or techniques
- Modifying flavors, textures, or dietary requirements
- Scaling portions up or down
- Changing the style or cuisine influence
- Making it easier/harder to prepare
- Any other creative adaptation they've requested

Be creative and professional - interpret their request thoughtfully and make appropriate changes throughout the recipe. If the request is unclear, make reasonable assumptions based on cooking best practices.

CRITICAL: Respond with ONLY a valid JSON object. Do NOT use markdown formatting, do NOT wrap in backtick blocks, just return the raw JSON in this exact format:
{
  "title": "Updated recipe title",
  "description": "Brief description of changes made",
  "ingredients": ["updated ingredient list"],
  "instructions": ["updated step-by-step instructions"],
  "servings": number,
  "cookTime": number,
  "difficulty": "Easy/Medium/Hard",
  "cuisine": "cuisine type",
  "tags": ["relevant", "tags"],
  "modifications": "Brief explanation of what was changed"
}`;

      // Track cost for recipe modification
      await aiCostTracker.trackCost({
        userId: userContext.userId,
        sessionId: userContext.pseudoUserId?.toString(),
        provider: 'openai',
        model: 'gpt-4o',
        operation: 'recipe-modification',
        inputTokens: Math.round(prompt.length / 4), // Rough estimate
        requestData: { 
          originalRecipe: currentRecipe.title,
          modificationRequest: modificationRequest
        }
      });

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini", // the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
        messages: [
          { role: "system", content: prompt },
          { role: "user", content: modificationRequest }
        ],
        max_tokens: 2000,
        temperature: 0.3 // Lower temperature for more consistent modifications
      });

      // Track completion cost
      await aiCostTracker.trackCost({
        userId: userContext.userId,
        sessionId: userContext.pseudoUserId?.toString(),
        provider: 'openai',
        model: 'gpt-4o',
        operation: 'recipe-modification-completion',
        outputTokens: Math.round((response.choices[0].message.content?.length || 0) / 4),
        requestData: { 
          modificationSuccess: true,
          responseLength: response.choices[0].message.content?.length
        }
      });

      let responseContent = response.choices[0].message.content || '{}';
      
      // Clean up markdown formatting if present - be more thorough
      if (responseContent.includes('```')) {
        responseContent = responseContent.replace(/```json\s*/g, '').replace(/```\s*/g, '').replace(/```/g, '');
      }
      
      // Clean up any backticks that might remain
      responseContent = responseContent.replace(/`/g, '').trim();
      
      const modifiedRecipe = JSON.parse(responseContent);
      
      console.log('✅ Recipe modification completed:', modifiedRecipe.title);
      return modifiedRecipe;
    } catch (error) {
      console.error('Error generating recipe modification:', error);
      throw error;
    }
  }

  /**
   * Generate a flavor-maximized recipe directly from explicit user requests with chef/restaurant inspiration
   */
  async generateFlavorMaximizedRecipe(userMessage: string, context: UserContext, memory: ZestMemory): Promise<any> {
    try {
      // Build context from user memory
      const preferencesContext = this.buildPreferencesContext(memory);
      
      // Select chef or restaurant inspiration for this specific dish
      const allChefs = [
        "Gordon Ramsay", "Jamie Oliver", "Nigella Lawson", "Mary Berry", "Tom Kerridge", 
        "Rick Stein", "Delia Smith", "James Martin", "Hugh Fearnley-Whittingstall", 
        "Marco Pierre White", "Heston Blumenthal", "Michel Roux Jr", "Angela Hartnett",
        "Paul Hollywood", "Nadiya Hussain", "Ainsley Harriott", "Gino D'Acampo",
        "Yotam Ottolenghi", "José Andrés", "Julia Child", "Thomas Keller", "David Chang"
      ];
      
      const allRestaurants = [
        "Dishoom", "Padella", "Hawksmoor", "Barrafina", "Gymkhana", 
        "Duck & Waffle", "St. John", "Bao", "Kiln", "Hoppers", 
        "Brat", "Lyle's", "The Clove Club", "Roka", "Zuma", 
        "Lima", "Temper", "Smoking Goat", "Ikoyi", "The Ledbury", "Bancone"
      ];
      
      // Randomly choose between chef or restaurant inspiration (50/50)
      const useChefInspiration = Math.random() < 0.5;
      const selectedInspiration = useChefInspiration 
        ? allChefs[Math.floor(Math.random() * allChefs.length)]
        : allRestaurants[Math.floor(Math.random() * allRestaurants.length)];
      
      const inspirationType = useChefInspiration ? 'chef' : 'restaurant';
      console.log(`🎲 Selected ${inspirationType} inspiration for full recipe: ${selectedInspiration}`);
      
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are Zest, Flavr's expert cooking assistant specialized in FLAVOR MAXIMIZATION and INTENT ELEVATION. When a user makes an explicit recipe request, create a complete recipe that maximizes flavor while staying true to their core intent, but elevate it with inspiration from ${selectedInspiration}.

USER CONTEXT:
${preferencesContext}

${inspirationType.toUpperCase()} INSPIRATION: ${selectedInspiration}
${useChefInspiration ? 
  `Channel ${selectedInspiration}'s cooking style, techniques, and flavor preferences. Elevate the user's request with ${selectedInspiration}'s signature approach while preserving their core intent.` :
  `Draw inspiration from ${selectedInspiration}'s signature flavors, ingredients, and cooking approach. Transform the user's request into a ${selectedInspiration}-style version while keeping their original intent intact.`
}

INTENT ELEVATION EXAMPLES:
- "Quick chicken curry" → "${selectedInspiration}-Style Aromatic Chicken Tikka Masala" (if Dishoom) or "${selectedInspiration}'s Herb-Crusted Chicken Curry" (if Gordon Ramsay)
- "Tomato meatball recipe" → "${selectedInspiration}-Style Herb-Crusted Meatballs with Wine Reduction"
- "Chocolate cake" → "${selectedInspiration}'s Rich Dark Chocolate [signature technique] Cake"

KEY PRINCIPLE: Always preserve the user's CORE INTENT (chicken curry = chicken curry) but elevate it with specific techniques, ingredients, or styles that make it special and distinctive.

CRITICAL FLAVOR MAXIMIZATION PRINCIPLES:

1. INGREDIENT ENHANCEMENT:
   - Elevate base ingredients with complementary flavors
   - Add aromatic foundations (shallots, garlic, fresh herbs)
   - Include umami boosters (mushrooms, anchovies, aged cheeses, soy sauce)
   - Use citrus zests and finishing acids for brightness
   - Incorporate quality fats (butter, olive oil, cream) strategically

2. TECHNIQUE OPTIMIZATION:
   - Brown proteins and aromatics for deep flavors
   - Build flavor layers (sauté → deglaze → reduce)
   - Use proper seasoning throughout cooking, not just at the end
   - Include resting periods for flavor integration
   - Finish with fresh herbs, citrus, or flaky salt

3. SAUCE & LIQUID MASTERY:
   - Create pan sauces from fond
   - Use wine, stock, or cream for depth
   - Reduce liquids to concentrate flavors
   - Balance acid, fat, salt, and heat

4. TIMING & TEXTURE:
   - Cook ingredients to optimal texture for maximum flavor
   - Include textural contrasts (crispy, creamy, tender)
   - Time seasoning for best absorption

5. FINISHING TOUCHES:
   - Fresh herb garnishes
   - Quality finishing oils
   - Textural elements (toasted nuts, crispy shallots)
   - Citrus zests or squeezes

RECIPE FORMAT:
Return a complete recipe object as JSON with:
- Elevated title that preserves core intent but adds ${selectedInspiration} flair (e.g., "Dishoom-Style Chicken Tikka Butter Curry" for "chicken curry")
- 4 servings
- Complete ingredient list with specific quantities including ${selectedInspiration}'s signature ingredients
- Detailed step-by-step instructions emphasizing ${selectedInspiration}'s techniques and flavor-building methods
- Cooking time estimate
- Difficulty level
- Brief description highlighting how this elevates the original request with ${selectedInspiration}'s expertise

ALWAYS preserve the user's CORE INTENT while elevating it with ${selectedInspiration}'s distinctive style, techniques, and ingredients. Make it restaurant-quality delicious!

IMPORTANT: Never instruct users to make basic pantry staples from scratch (tomato paste, soy sauce, vinegar, etc.). Focus on cooking techniques and creative combinations instead.

Respond only with valid JSON format.`
          },
          {
            role: "user",
            content: `Create a flavor-maximized recipe for: ${userMessage}`
          }
        ],
        max_tokens: 2000,
        temperature: 0.7,
        response_format: { type: "json_object" }
      });

      // Track cost for flavor-maximized recipe generation
      await aiCostTracker.trackCost({
        userId: context.userId,
        provider: 'openai',
        model: 'gpt-4o',
        operation: 'flavor-maximized-recipe-generation',
        inputTokens: response.usage?.prompt_tokens,
        outputTokens: response.usage?.completion_tokens,
        requestData: { messageLength: userMessage.length, hasPreferences: !!memory.preferences },
        responseData: { maxTokens: 2000 }
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');
      
      // Ensure proper structure and data types
      const cookTimeValue = result.cookTime || result.cooking_time || 45;
      const parsedCookTime = typeof cookTimeValue === 'string' ? 
        parseInt(cookTimeValue.replace(/\D/g, '')) || 45 : 
        cookTimeValue;

      return {
        title: result.title || `Flavor-Maximized ${userMessage}`,
        description: result.description || 'A delicious recipe optimized for maximum flavor',
        servings: result.servings || 4,
        cookTime: parsedCookTime,
        difficulty: result.difficulty || 'Medium',
        cuisine: result.cuisine || 'International',
        ingredients: Array.isArray(result.ingredients) ? result.ingredients : [],
        instructions: Array.isArray(result.instructions) ? result.instructions : [],
        tips: result.tips || 'This recipe is designed to maximize flavor through proper technique and ingredient selection.'
      };
    } catch (error) {
      console.error('Error generating flavor-maximized recipe:', error);
      throw new Error('Failed to generate flavor-maximized recipe');
    }
  }
}