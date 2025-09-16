import type { Express } from "express";
import OpenAI from "openai";
import { logGPTInteraction } from "../developerLogger";

// Initialize OpenAI
if (!process.env.OPENAI_API_KEY) {
  throw new Error('Missing required OpenAI API key: OPENAI_API_KEY');
}
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface WineRecommendationRequest {
  recipeTitle: string;
  cuisine?: string;
  mainIngredients: string[];
  cookingMethod?: string;
  spiceLevel?: string;
  difficulty?: string;
  description?: string;
}

interface WineRecommendation {
  name: string;
  type: string; // "Red Wine", "White Wine", "Rosé", "Sparkling", "Dessert Wine"
  description: string;
  priceRange: string; // "Budget (£8-15)", "Mid-range (£15-25)", "Premium (£25+)"
  pairing_reason: string;
}

// Enhanced wine pairing prompt for comprehensive recommendations
function createWinePairingPrompt(recipe: WineRecommendationRequest): string {
  return `You are a professional sommelier with expertise in wine and food pairings. Recommend 3 wines that would perfectly complement this dish.

RECIPE DETAILS:
- Title: ${recipe.recipeTitle}
- Cuisine: ${recipe.cuisine || 'Not specified'}
- Main Ingredients: ${recipe.mainIngredients.join(', ')}
- Cooking Method: ${recipe.cookingMethod || 'Not specified'}
- Spice Level: ${recipe.spiceLevel || 'Not specified'}
- Difficulty: ${recipe.difficulty || 'Not specified'}
- Description: ${recipe.description || 'Not specified'}

WINE PAIRING GUIDELINES:
1. Consider the dominant flavors, richness, and cooking method
2. Balance wine acidity with food richness
3. Complement or contrast flavor profiles appropriately
4. Account for spice levels and seasonings
5. Provide options across different price ranges
6. Focus on wines readily available in UK markets

Return your response as a JSON array of exactly 3 wine recommendations with this structure:
[
  {
    "name": "Specific wine name or style (e.g., 'Chianti Classico' or 'New Zealand Sauvignon Blanc')",
    "type": "Wine category (Red Wine/White Wine/Rosé/Sparkling/Dessert Wine)",
    "description": "Brief 20-30 word description of the wine's characteristics",
    "priceRange": "Budget (£8-15) / Mid-range (£15-25) / Premium (£25+)",
    "pairing_reason": "30-40 word explanation of why this wine complements the dish"
  }
]

Ensure recommendations are:
- Specific enough to guide purchasing decisions
- Varied across different wine types and price points
- Focused on how each wine enhances the dining experience
- Accessible to UK wine buyers

RESPOND ONLY WITH THE JSON ARRAY, NO ADDITIONAL TEXT.`;
}

export function registerWineRoutes(app: Express) {
  // Wine pairing recommendation endpoint
  app.post('/api/wine/pairing', async (req, res) => {
    try {
      const recipeData: WineRecommendationRequest = req.body;
      
      // Validate required fields
      if (!recipeData.recipeTitle || !recipeData.mainIngredients || recipeData.mainIngredients.length === 0) {
        return res.status(400).json({ 
          error: "Recipe title and main ingredients are required for wine pairing" 
        });
      }

      console.log('🍷 Generating wine pairing recommendations for:', recipeData.recipeTitle);

      // Create the wine pairing prompt
      const prompt = createWinePairingPrompt(recipeData);

      // Call OpenAI for wine recommendations
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are a professional sommelier expert in wine and food pairings. Provide specific, practical wine recommendations that enhance the dining experience."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.8, // Slightly higher creativity for variety in recommendations
        max_tokens: 1000,
      });

      const responseText = completion.choices[0]?.message?.content?.trim();
      
      if (!responseText) {
        throw new Error('No wine recommendation generated');
      }

      // Parse the JSON response (strip markdown code blocks if present)
      let wineRecommendations: WineRecommendation[];
      try {
        // Clean the response text by removing markdown code blocks
        let cleanedJson = responseText;
        if (responseText.includes('```')) {
          // Remove markdown code blocks: ```json ... ``` or ``` ... ```
          cleanedJson = responseText
            .replace(/^```(?:json)?\s*\n?/gm, '') // Remove opening code block
            .replace(/\n?\s*```\s*$/gm, '')      // Remove closing code block
            .trim();
        }
        
        console.log('🍷 Parsing cleaned JSON for wine recommendations:', cleanedJson);
        wineRecommendations = JSON.parse(cleanedJson);
      } catch (parseError) {
        console.error('❌ Failed to parse wine recommendations JSON:', responseText);
        console.error('Parse error details:', parseError);
        throw new Error('Invalid wine recommendation format received');
      }

      // Validate the response structure
      if (!Array.isArray(wineRecommendations) || wineRecommendations.length !== 3) {
        throw new Error('Expected exactly 3 wine recommendations');
      }

      // Validate each recommendation has required fields
      for (const wine of wineRecommendations) {
        if (!wine.name || !wine.type || !wine.description || !wine.priceRange || !wine.pairing_reason) {
          throw new Error('Invalid wine recommendation structure');
        }
      }

      console.log('✅ Wine pairing recommendations generated successfully');

      // Log the interaction for developer analytics
      if (req.session?.userId) {
        await logGPTInteraction(
          req.session.userId,
          'wine-pairing',
          {
            recipeTitle: recipeData.recipeTitle,
            cuisine: recipeData.cuisine,
            mainIngredients: recipeData.mainIngredients
          },
          prompt,
          responseText,
          {
            expectedFormat: "JSON array of 3 wine recommendations",
            expectedFields: ["name", "type", "description", "priceRange", "pairing_reason"]
          },
          {
            actualFormat: "JSON array",
            generatedRecommendations: wineRecommendations.length,
            validFormat: Array.isArray(wineRecommendations) && wineRecommendations.length === 3
          }
        );
      }

      res.json({ 
        recommendations: wineRecommendations,
        recipe: {
          title: recipeData.recipeTitle,
          cuisine: recipeData.cuisine
        }
      });

    } catch (error) {
      console.error('❌ Wine pairing recommendation failed:', error);
      
      // Return user-friendly error with fallback
      res.status(500).json({ 
        error: "Unable to generate wine recommendations at this time",
        fallback: {
          message: "For this dish, consider a medium-bodied red wine, a crisp white wine, or consult your local wine shop for personalized recommendations."
        }
      });
    }
  });

  // Wine knowledge endpoint - educational content about wine pairing principles
  app.get('/api/wine/pairing-guide', (req, res) => {
    const pairingGuide = {
      general_principles: [
        "Match wine weight with food weight (light wines with delicate dishes)",
        "Complement similar flavors or create contrasting balance",
        "Consider sauce and seasoning more than the base protein",
        "Acidic wines pair well with rich, fatty foods",
        "Sweet wines balance spicy heat"
      ],
      cuisine_guidelines: {
        italian: "Sangiovese-based wines, Pinot Grigio, Prosecco",
        french: "Regional pairings (Burgundy with French classics, Loire Valley whites)",
        indian: "Off-dry Riesling, Gewürztraminer, light reds with low tannins",
        asian: "Crisp whites, light reds, avoid high-alcohol wines with spicy dishes",
        british: "English sparkling wine, traditional ales, classic European wines"
      },
      price_guidance: {
        everyday: "£8-15 for daily dining and casual meals",
        special: "£15-25 for dinner parties and celebrations", 
        premium: "£25+ for special occasions and fine dining"
      }
    };
    
    res.json(pairingGuide);
  });
}