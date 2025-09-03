import { db } from "./db";
import { userPreferences, chatMessages, recipes, users, pseudoUsers } from "@shared/schema";
import { eq, desc, and } from "drizzle-orm";
import OpenAI from "openai";

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
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are an intent classifier for a cooking assistant. Determine if the user's message implies they want a recipe created.

RECIPE INTENT indicators:
- "Can you make me a recipe for..."
- "I want to cook something..."
- "Give me a recipe..."
- "How do I make..."
- "I need a recipe that..."
- "Create a dish with..."
- "Turn this into a recipe"
- Mentions specific dish names with intent to cook

NOT RECIPE INTENT:
- General cooking questions ("How do I dice onions?")
- Ingredient substitutions ("Can I use butter instead of oil?")
- Cooking techniques ("What's the best way to sear?")
- Wine pairings, general advice, casual conversation

Respond with JSON: {"isRecipeIntent": boolean, "confidence": 0.0-1.0, "suggestedAction": "brief description"}`
          },
          {
            role: "user",
            content: message
          }
        ],
        response_format: { type: "json_object" },
        max_tokens: 150
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
        model: "gpt-4o",
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

      return JSON.parse(response.choices[0].message.content || '{}');
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
      "- If input implies recipe intent, confirm: 'Would you like me to turn this into a Flavr recipe card?'",
      "- Reference user preferences naturally ('You mentioned loving Thai food last time')",
      "- For non-cooking queries, politely redirect: 'I'm your personal chef, so I'll stick to food — but here's how I can help...'",
      "- Be conversational and build trust through memory and personalization"
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
}