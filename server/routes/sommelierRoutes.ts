import type { Express } from "express";
import OpenAI from "openai";
import { storage } from "../storage";
import { logSimpleGPTInteraction } from "../developerLogger";

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

interface RecipeContext {
  title: string;
  cuisine?: string;
  ingredients: string[];
  instructions: string[];
  difficulty?: string;
  cookTime?: number;
}

interface WineRecommendation {
  name: string;
  type: string; // 'red', 'white', 'rosé', 'sparkling'
  variety: string; // 'Pinot Noir', 'Chardonnay', etc.
  region: string;
  priceRange: 'budget' | 'mid-range' | 'premium';
  pairingReason: string;
  tastingNotes: string[];
  servingTemp: string;
  alternatives?: string[];
}

interface SommelierRecommendations {
  primaryRecommendation: WineRecommendation;
  alternatives: WineRecommendation[];
  generalPairingPrinciples: string;
  dinnerPartyTips?: string;
}

function generateSommelierPrompt(recipe: RecipeContext): string {
  const ingredients = recipe.ingredients.join(', ');
  const mainIngredients = recipe.ingredients.slice(0, 5).join(', '); // First 5 ingredients
  
  return `You are a professional sommelier with 20+ years of experience in wine pairing. I need your expert wine recommendations for this specific dish:

**RECIPE ANALYSIS:**
- Dish: ${recipe.title}
- Cuisine: ${recipe.cuisine || 'Not specified'}
- Main Ingredients: ${mainIngredients}
- Cooking Time: ${recipe.cookTime ? `${recipe.cookTime} minutes` : 'Not specified'}
- Difficulty: ${recipe.difficulty || 'Not specified'}

**ALL INGREDIENTS:** ${ingredients}

As a master sommelier, please analyze this dish and provide professional wine pairing recommendations. Consider:

1. **FLAVOR PROFILE ANALYSIS:**
   - Primary flavors and cooking methods
   - Seasoning and spice level
   - Protein type and preparation
   - Sauce/preparation style
   - Overall dish weight (light/medium/heavy)

2. **WINE PAIRING PRINCIPLES:**
   - Complement or contrast the dish's flavors
   - Consider acidity, tannins, body, and alcohol level
   - Regional pairing traditions if applicable
   - Seasonal appropriateness

**PROVIDE EXACTLY 4 WINE RECOMMENDATIONS** in this JSON format:

{
  "primaryRecommendation": {
    "name": "Specific wine name or style (e.g., 'Barolo from Piedmont' or 'Sancerre Loire Valley')",
    "type": "red|white|rosé|sparkling",
    "variety": "Grape variety (e.g., 'Nebbiolo', 'Sauvignon Blanc')",
    "region": "Wine region (e.g., 'Burgundy, France', 'Marlborough, New Zealand')",
    "priceRange": "budget|mid-range|premium",
    "pairingReason": "Professional 2-3 sentence explanation of why this specific wine complements the dish",
    "tastingNotes": ["note1", "note2", "note3", "note4"],
    "servingTemp": "Specific serving temperature (e.g., '16-18°C', 'Well chilled at 8-10°C')",
    "alternatives": ["Alternative 1", "Alternative 2"]
  },
  "alternatives": [
    {
      "name": "Second recommendation",
      "type": "red|white|rosé|sparkling",
      "variety": "Grape variety",
      "region": "Wine region",
      "priceRange": "budget|mid-range|premium",
      "pairingReason": "Why this wine works with the dish",
      "tastingNotes": ["note1", "note2", "note3"],
      "servingTemp": "Temperature guidance",
      "alternatives": ["Alt 1", "Alt 2"]
    },
    {
      "name": "Third recommendation",
      "type": "red|white|rosé|sparkling",
      "variety": "Grape variety",
      "region": "Wine region",
      "priceRange": "budget|mid-range|premium",
      "pairingReason": "Why this wine works with the dish",
      "tastingNotes": ["note1", "note2", "note3"],
      "servingTemp": "Temperature guidance",
      "alternatives": ["Alt 1", "Alt 2"]
    },
    {
      "name": "Fourth recommendation (budget-friendly option)",
      "type": "red|white|rosé|sparkling",
      "variety": "Grape variety",
      "region": "Wine region",
      "priceRange": "budget",
      "pairingReason": "Why this affordable wine works with the dish",
      "tastingNotes": ["note1", "note2", "note3"],
      "servingTemp": "Temperature guidance",
      "alternatives": ["Alt 1", "Alt 2"]
    }
  ],
  "generalPairingPrinciples": "2-3 sentence explanation of the overall pairing philosophy for this specific dish type",
  "dinnerPartyTips": "1-2 sentences with hosting tips specific to this dish and wine pairing"
}

**IMPORTANT REQUIREMENTS:**
- All recommendations must be REAL wine regions and grape varieties
- Include a mix of price ranges (at least one budget option)
- Provide specific, professional reasoning for each pairing
- Use proper wine terminology and serving guidance
- Consider both classic and modern pairing approaches
- Ensure the primary recommendation is your absolute best choice
- Make tasting notes specific and relevant to the dish pairing

Respond ONLY with the JSON object, no additional text.`;
}

export function registerSommelierRoutes(app: Express) {
  // Sommelier wine pairing analysis endpoint
  app.post("/api/sommelier/analyze", async (req, res) => {
    try {
      const { recipe } = req.body as { recipe: RecipeContext };
      
      if (!recipe || !recipe.title || !recipe.ingredients) {
        return res.status(400).json({ 
          error: "Recipe title and ingredients are required for sommelier analysis" 
        });
      }

      console.log('🍷 Sommelier analysis request:', {
        title: recipe.title,
        cuisine: recipe.cuisine,
        ingredientCount: recipe.ingredients.length,
        userId: req.session?.userId
      });

      // Generate sommelier prompt
      const prompt = generateSommelierPrompt(recipe);

      // Call GPT-4 for professional wine pairing recommendations
      const startTime = Date.now();
      const completion = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "You are a world-renowned sommelier with expertise in international wine regions and food pairing. Provide only valid JSON responses with professional wine recommendations."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2000,
      });

      const responseTime = Date.now() - startTime;

      if (!completion.choices[0]?.message?.content) {
        throw new Error("No response from AI sommelier");
      }

      let recommendations: SommelierRecommendations;
      try {
        recommendations = JSON.parse(completion.choices[0].message.content);
      } catch (parseError) {
        console.error('❌ Failed to parse sommelier response:', parseError);
        console.error('Raw response:', completion.choices[0].message.content);
        throw new Error("Failed to parse sommelier recommendations");
      }

      // Validate the response structure
      if (!recommendations.primaryRecommendation || !recommendations.alternatives || !Array.isArray(recommendations.alternatives)) {
        throw new Error("Invalid sommelier response structure");
      }

      // Log the interaction for cost tracking
      const tokensUsed = completion.usage?.total_tokens || 0;
      const estimatedCost = (tokensUsed / 1000) * 0.03; // GPT-4 pricing estimate

      await logSimpleGPTInteraction({
        endpoint: 'sommelier_analysis',
        prompt: `Recipe: ${recipe.title}`,
        response: `${recommendations.alternatives.length + 1} wine recommendations`,
        model: 'gpt-4',
        duration: responseTime,
        inputTokens: completion.usage?.prompt_tokens || 0,
        outputTokens: completion.usage?.completion_tokens || 0,
        cost: estimatedCost,
        success: true,
        userId: req.session?.userId?.toString()
      });

      console.log('🍷 Sommelier analysis completed:', {
        primaryWine: recommendations.primaryRecommendation.name,
        alternativeCount: recommendations.alternatives.length,
        tokensUsed,
        estimatedCost: `$${estimatedCost.toFixed(4)}`,
        responseTime: `${responseTime}ms`
      });

      res.json({
        recommendations,
        metadata: {
          tokensUsed,
          estimatedCost,
          responseTime,
          model: 'gpt-4'
        }
      });

    } catch (error) {
      console.error('❌ Sommelier analysis error:', error);

      // Log failed interaction
      await logSimpleGPTInteraction({
        endpoint: 'sommelier_analysis',
        prompt: `Recipe: ${req.body?.recipe?.title || 'Unknown'}`,
        response: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        model: 'gpt-4',
        duration: 0,
        inputTokens: 0,
        outputTokens: 0,
        cost: 0,
        success: false,
        userId: req.session?.userId?.toString()
      });

      res.status(500).json({ 
        error: "Failed to analyze wine pairings",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Health check endpoint for sommelier service
  app.get("/api/sommelier/health", (req, res) => {
    res.json({ 
      status: "healthy", 
      service: "sommelier",
      timestamp: new Date().toISOString()
    });
  });
}