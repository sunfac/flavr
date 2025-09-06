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
   * Extract ingredient name from text by removing measurements and quantities
   */
  extractIngredientName(ingredientText: string): string {
    const cleanText = ingredientText
      .replace(/^\d+[\s\-]*(cups?|tbsp|tsp|tablespoons?|teaspoons?|oz|ounces?|lbs?|pounds?|g|grams?|kg|kilograms?|ml|milliliters?|l|liters?|pints?|quarts?|gallons?)\s*/i, '')
      .replace(/^\d+[\s\-]*x\s*/i, '') // Remove "2x" style multipliers
      .replace(/^a\s+pinch\s+of\s*/i, '') // Remove "a pinch of"
      .replace(/^a\s+handful\s+of\s*/i, '') // Remove "a handful of"
      .replace(/^a\s+few\s*/i, '') // Remove "a few"
      .replace(/^some\s*/i, '') // Remove "some"
      .replace(/^fresh\s*/i, '') // Remove "fresh" prefix
      .replace(/^dried\s*/i, '') // Remove "dried" prefix
      .replace(/^ground\s*/i, '') // Remove "ground" prefix
      .replace(/^chopped\s*/i, '') // Remove "chopped" prefix
      .replace(/^sliced\s*/i, '') // Remove "sliced" prefix
      .replace(/^diced\s*/i, '') // Remove "diced" prefix
      .replace(/^minced\s*/i, '') // Remove "minced" prefix
      .replace(/^finely\s*/i, '') // Remove "finely" prefix
      .replace(/^roughly\s*/i, '') // Remove "roughly" prefix
      .replace(/^coarsely\s*/i, '') // Remove "coarsely" prefix
      .replace(/^\d+\/\d+\s*/g, '') // Remove fractions like "1/2"
      .replace(/^\d+\.\d+\s*/g, '') // Remove decimals like "2.5"
      .replace(/^\d+\s*/g, '') // Remove standalone numbers
      .replace(/^(large|medium|small|extra|baby|young|old|new)\s*/i, '') // Remove size/age descriptors
      .replace(/\s*\([^)]*\)$/, '') // Remove anything in parentheses at the end
      .replace(/,.*$/, '') // Remove everything after first comma
      .trim();
    
    return cleanText;
  }

  /**
   * Detect potential sub-recipes from ingredient list using intelligent extraction
   */
  async detectPotentialSubRecipes(ingredients: string[]): Promise<Map<string, SubRecipeDetection>> {
    const detections = new Map<string, SubRecipeDetection>();
    
    // Exclude basic ingredients that are typically store-bought
    const basicIngredients = [
      // Basic seasonings and liquids
      'salt', 'pepper', 'black pepper', 'white pepper', 'water', 'oil', 'flour', 'sugar', 'brown sugar', 'milk', 'eggs', 'butter',
      
      // Basic vegetables and aromatics
      'onion', 'onions', 'garlic', 'garlic cloves', 'tomato', 'tomatoes', 'potato', 'potatoes', 'carrot', 'carrots', 'celery',
      'lemon', 'lemons', 'lime', 'limes', 'cucumber', 'lettuce', 'spinach', 'kale', 'cabbage', 'broccoli', 'cauliflower',
      'mushrooms', 'button mushrooms', 'bell pepper', 'bell peppers', 'peppers', 'red pepper', 'green pepper', 'yellow pepper',
      'shallots', 'leeks', 'ginger', 'fresh ginger', 'chili', 'chilies', 'chilli', 'chillies', 'jalapenos', 'serrano',
      'spring onions', 'scallions', 'green onions', 'avocado', 'avocados',
      
      // Basic proteins
      'beef', 'pork', 'chicken', 'lamb', 'duck', 'fish', 'salmon', 'tuna', 'cod', 'prawns', 'shrimp',
      'pork belly', 'chicken breast', 'chicken thighs', 'beef steak', 'lamb chops', 'duck breast',
      'filet mignon', 'ribeye', 'sirloin', 'tenderloin', 'strip steak', 'porterhouse', 'ground beef', 'mince',
      
      // Dairy and cheese
      'cheese', 'mozzarella', 'parmesan', 'cheddar', 'feta', 'goat cheese', 'cream cheese', 'yogurt', 'sour cream',
      'cream', 'heavy cream', 'double cream', 'single cream', 'crème fraîche',
      
      // Carbs and grains
      'bread', 'pasta', 'rice', 'brown rice', 'basmati rice', 'jasmine rice', 'noodles', 'quinoa', 'couscous', 'bulgur',
      'bao buns', 'tortillas', 'pita bread', 'naan', 'flatbread', 'sourdough', 'baguette',
      
      // Legumes and nuts
      'beans', 'lentils', 'chickpeas', 'black beans', 'kidney beans', 'white beans', 'cannellini beans',
      'nuts', 'almonds', 'walnuts', 'pecans', 'pine nuts', 'cashews', 'hazelnuts', 'peanuts',
      
      // Fresh herbs (common ones)
      'herbs', 'basil', 'fresh basil', 'parsley', 'fresh parsley', 'cilantro', 'fresh cilantro', 'coriander',
      'thyme', 'fresh thyme', 'rosemary', 'fresh rosemary', 'oregano', 'fresh oregano', 'mint', 'fresh mint',
      'sage', 'fresh sage', 'chives', 'fresh chives', 'dill', 'fresh dill', 'tarragon', 'bay leaves',
      
      // Common spices
      'spices', 'cumin', 'ground cumin', 'paprika', 'smoked paprika', 'cinnamon', 'ground cinnamon', 'nutmeg', 'cardamom',
      'turmeric', 'ground turmeric', 'coriander seeds', 'ground coriander', 'fennel seeds', 'star anise',
      'cloves', 'allspice', 'garam masala', 'curry powder', 'chili powder', 'cayenne', 'red pepper flakes',
      
      // Oils and vinegars
      'olive oil', 'extra virgin olive oil', 'vegetable oil', 'canola oil', 'sunflower oil', 'sesame oil',
      'coconut oil', 'avocado oil', 'vinegar', 'white vinegar', 'red wine vinegar', 'balsamic vinegar',
      'apple cider vinegar', 'rice vinegar',
      
      // Sauces and condiments
      'soy sauce', 'fish sauce', 'worcestershire sauce', 'hot sauce', 'sriracha', 'tabasco', 'mustard',
      'dijon mustard', 'honey', 'maple syrup', 'ketchup', 'mayonnaise', 'mayo',
      
      // Juices and liquids
      'lime juice', 'lemon juice', 'orange juice', 'coconut milk', 'coconut cream', 'stock', 'broth',
      'chicken stock', 'beef stock', 'vegetable stock', 'fish stock', 'bone broth',
      'wine', 'red wine', 'white wine', 'beer', 'sake', 'mirin', 'cooking wine',
      'pinot noir', 'cabernet', 'merlot', 'chardonnay', 'sauvignon blanc',
      
      // Fruits (common ones)
      'apples', 'oranges', 'bananas', 'grapes', 'berries', 'strawberries', 'blueberries', 'raspberries',
      'mango', 'pineapple', 'peaches', 'pears', 'plums', 'cherries',
      
      // Baking ingredients
      'baking powder', 'baking soda', 'vanilla', 'vanilla extract', 'yeast', 'cornstarch', 'cornflour',
      'cocoa powder', 'chocolate', 'dark chocolate', 'milk chocolate'
    ];
    
    for (const ingredient of ingredients) {
      const lowerIngredient = ingredient.toLowerCase();
      
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
      
      // Smart detection: extract ingredient name and check if it could be homemade
      const extractedName = this.extractIngredientName(ingredient);
      const lowerExtracted = extractedName.toLowerCase();
      
      // Skip very basic ingredients
      const isBasicIngredient = basicIngredients.includes(lowerExtracted);
      if (isBasicIngredient || extractedName.length < 3) {
        continue;
      }
      
      // Only suggest for very specific complex components that are truly worth making from scratch
      const complexComponents = [
        'pesto', 'aioli', 'chimichurri', 'guacamole', 'hummus', 'harissa', 'romesco',
        'curry paste', 'thai curry paste', 'red curry paste', 'green curry paste',
        'compound butter', 'herb butter', 'garlic butter',
        'hollandaise', 'bearnaise', 'tzatziki',
        'vinaigrette', 'homemade dressing'
      ];
      
      const isComplexComponent = complexComponents.some(component => 
        lowerExtracted.includes(component) || lowerIngredient.includes(component)
      );
      
      // Only suggest subrecipes for complex components that can be made from scratch
      if (isComplexComponent) {
        detections.set(ingredient, {
          hasSubRecipe: true,
          subRecipeName: extractedName,
          confidence: 0.9,
          suggestion: `Create homemade ${extractedName}`
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
        model: "gpt-4o-mini",
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