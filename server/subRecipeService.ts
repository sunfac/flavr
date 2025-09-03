import OpenAI from "openai";
import { storage } from "./storage";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface SubRecipeDetection {
  hasSubRecipe: boolean;
  subRecipeName?: string;
  confidence: number;
  suggestion?: string;
}

export interface GeneratedSubRecipe {
  id: number;
  title: string;
  description: string;
  ingredients: string[];
  instructions: string[];
  tips: string;
  cookTime: number;
  difficulty: string;
  imageUrl?: string;
}

export class SubRecipeService {
  /**
   * Detect potential sub-recipes from ingredient list
   */
  async detectPotentialSubRecipes(ingredients: string[]): Promise<Map<string, SubRecipeDetection>> {
    const detections = new Map<string, SubRecipeDetection>();
    
    // Common sub-recipe patterns to look for
    const subRecipePatterns = [
      'chilli drizzle', 'chili drizzle', 'harissa paste', 'pesto', 'chimichurri',
      'tamarind chutney', 'mint chutney', 'salsa verde', 'tahini sauce',
      'sriracha mayo', 'garlic aioli', 'herb oil', 'compound butter',
      'spice mix', 'spice blend', 'curry paste', 'marinade',
      'drizzle', 'chutney', 'sauce', 'paste', 'mayo', 'aioli',
      'homemade pasta', 'fresh pasta', 'pizza dough', 'bread',
      'stock', 'broth', 'pickled', 'fermented', 'cured'
    ];
    
    // Exclude basic ingredients that shouldn't become sub-recipes
    const excludeBasicIngredients = [
      'olive oil', 'vegetable oil', 'canola oil', 'butter', 'salt', 'pepper', 
      'flour', 'sugar', 'water', 'milk', 'eggs'
    ];
    
    for (const ingredient of ingredients) {
      const lowerIngredient = ingredient.toLowerCase();
      
      // Skip basic ingredients
      if (excludeBasicIngredients.some(basic => lowerIngredient.includes(basic))) {
        continue;
      }
      
      // Check for page references first (cookbook extraction)
      const pageRefPattern = /\(see page (\d+)\)/i;
      const pageMatch = ingredient.match(pageRefPattern);
      
      if (pageMatch) {
        const ingredientName = ingredient.replace(pageRefPattern, '').trim();
        detections.set(ingredient, {
          hasSubRecipe: true,
          subRecipeName: ingredientName,
          confidence: 0.95,
          suggestion: `Make your own ${ingredientName} from scratch`
        });
        continue;
      }
      
      // Check for sub-recipe patterns
      const foundPattern = subRecipePatterns.find(pattern => 
        lowerIngredient.includes(pattern)
      );
      
      if (foundPattern) {
        // Extract more specific name if possible
        let specificName = foundPattern;
        const words = lowerIngredient.split(/\s+/);
        
        // Look for compound names
        for (let i = 0; i < words.length - 1; i++) {
          const compound = `${words[i]} ${words[i + 1]}`;
          if (subRecipePatterns.includes(compound)) {
            specificName = compound;
            break;
          }
        }
        
        detections.set(ingredient, {
          hasSubRecipe: true,
          subRecipeName: specificName,
          confidence: 0.8,
          suggestion: `Create homemade ${specificName}`
        });
      }
    }
    
    return detections;
  }
  
  /**
   * Generate a sub-recipe for a specific ingredient
   */
  async generateSubRecipe(
    ingredientName: string,
    parentRecipe: any,
    userContext: any
  ): Promise<GeneratedSubRecipe> {
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are a master chef creating sub-recipes for homemade ingredients. Generate a detailed recipe for making "${ingredientName}" from scratch.

CONTEXT:
- This is a sub-recipe for the main dish: "${parentRecipe.title}"
- Main recipe cuisine: ${parentRecipe.cuisine}
- Main recipe mood: ${parentRecipe.mood}
- Make it complement the main recipe perfectly

REQUIREMENTS:
1. Focus on quality and flavor that enhances the main dish
2. Include proper techniques and timing
3. Make it accessible but not overly simplified
4. Provide practical tips for success
5. Ensure it integrates well with the main recipe

Generate in this EXACT JSON format:
{
  "title": "Homemade [Ingredient Name]",
  "description": "Fresh, flavorful [ingredient] that elevates your [main dish]",
  "cookTime": 15,
  "servings": 4,
  "difficulty": "Easy|Medium|Hard",
  "ingredients": ["ingredient 1 with measurements", "ingredient 2"],
  "instructions": ["Step 1 with timing", "Step 2 with technique"],
  "tips": "Professional tips for best results and storage"
}`
          },
          {
            role: "user",
            content: `Create a sub-recipe for: ${ingredientName}`
          }
        ],
        response_format: { type: "json_object" },
        max_tokens: 1000
      });

      const subRecipeData = JSON.parse(response.choices[0].message.content || '{}');
      
      // Save to database
      const savedSubRecipe = await storage.createRecipe({
        userId: parentRecipe.userId,
        title: subRecipeData.title,
        description: subRecipeData.description,
        cookTime: subRecipeData.cookTime,
        servings: subRecipeData.servings || parentRecipe.servings,
        difficulty: subRecipeData.difficulty,
        cuisine: parentRecipe.cuisine,
        mood: parentRecipe.mood,
        mode: parentRecipe.mode,
        ingredients: subRecipeData.ingredients,
        instructions: subRecipeData.instructions,
        tips: subRecipeData.tips,
        // Sub-recipe specific fields
        parentRecipeId: parentRecipe.id,
        isSubRecipe: true,
        subRecipeFor: ingredientName
      });
      
      // Generate image for sub-recipe
      try {
        const { generateRecipeImageWithImagen3, createRecipeImagePrompt } = await import('./imageGeneration');
        const imagePrompt = createRecipeImagePrompt(
          subRecipeData.title, 
          subRecipeData.ingredients, 
          parentRecipe.mood, 
          parentRecipe.cuisine
        );
        const imageUrl = await generateRecipeImageWithImagen3(imagePrompt);
        
        if (imageUrl) {
          await storage.updateRecipe(savedSubRecipe.id, { imageUrl });
          savedSubRecipe.imageUrl = imageUrl;
        }
      } catch (imageError) {
        console.error('Error generating sub-recipe image:', imageError);
      }
      
      // Update parent recipe to include this sub-recipe ID
      const currentSubRecipeIds = parentRecipe.subRecipeIds || [];
      await storage.updateRecipe(parentRecipe.id, {
        subRecipeIds: [...currentSubRecipeIds, savedSubRecipe.id]
      });
      
      console.log(`✅ Sub-recipe generated: ${subRecipeData.title} for ${ingredientName}`);
      return savedSubRecipe as GeneratedSubRecipe;
      
    } catch (error) {
      console.error('Error generating sub-recipe:', error);
      throw error;
    }
  }
  
  /**
   * Get all sub-recipes for a parent recipe
   */
  async getSubRecipes(parentRecipeId: number): Promise<GeneratedSubRecipe[]> {
    try {
      const recipes = await storage.getSubRecipes(parentRecipeId);
      return recipes.map(recipe => ({
        id: recipe.id,
        title: recipe.title,
        description: recipe.description || '',
        ingredients: recipe.ingredients,
        instructions: recipe.instructions,
        tips: recipe.tips || '',
        cookTime: recipe.cookTime || 0,
        difficulty: recipe.difficulty || 'Easy',
        imageUrl: recipe.imageUrl || undefined
      }));
    } catch (error) {
      console.error('Error fetching sub-recipes:', error);
      return [];
    }
  }
  
  /**
   * Get parent recipe for a sub-recipe
   */
  async getParentRecipe(subRecipeId: number): Promise<any | null> {
    try {
      const subRecipe = await storage.getRecipe(subRecipeId);
      if (subRecipe?.parentRecipeId) {
        return await storage.getRecipe(subRecipe.parentRecipeId);
      }
      return null;
    } catch (error) {
      console.error('Error fetching parent recipe:', error);
      return null;
    }
  }
}

export const subRecipeService = new SubRecipeService();