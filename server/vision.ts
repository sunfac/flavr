import { Request, Response } from 'express';
import multer from 'multer';
import OpenAI from 'openai';

// Configure multer for image upload handling
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      const error = new Error('Only image files are allowed') as any;
      cb(error, false);
    }
  },
});

// Comprehensive food whitelist for ingredient detection
const foodWhitelist = [
  // Fresh produce
  'apple', 'apples', 'banana', 'bananas', 'orange', 'oranges', 'lemon', 'lemons', 'lime', 'limes',
  'tomato', 'tomatoes', 'potato', 'potatoes', 'onion', 'onions', 'garlic', 'carrot', 'carrots',
  'broccoli', 'spinach', 'lettuce', 'cucumber', 'cucumbers', 'bell pepper', 'bell peppers',
  'mushroom', 'mushrooms', 'avocado', 'avocados', 'corn', 'peas', 'beans', 'green beans',
  'celery', 'zucchini', 'eggplant', 'cauliflower', 'cabbage', 'kale', 'sweet potato',
  'ginger', 'chili', 'chili pepper', 'jalapeño', 'strawberry', 'strawberries', 'blueberry', 'blueberries',
  'grape', 'grapes', 'pineapple', 'mango', 'papaya', 'coconut', 'nuts', 'almonds', 'walnuts',
  
  // Proteins
  'chicken', 'beef', 'pork', 'fish', 'salmon', 'tuna', 'shrimp', 'turkey', 'bacon', 'ham', 
  'sausage', 'ground beef', 'ground turkey', 'lamb', 'duck', 'lobster', 'crab', 'mussels', 
  'scallops', 'squid', 'octopus', 'clams', 'oysters', 'tofu', 'tempeh',
  
  // Dairy and eggs
  'eggs', 'egg', 'milk', 'cheese', 'butter', 'yogurt', 'cream', 'sour cream', 'heavy cream', 
  'cottage cheese', 'mozzarella', 'cheddar', 'parmesan', 'feta', 'goat cheese', 'blue cheese', 
  'swiss cheese', 'brie', 'camembert',
  
  // Pantry staples
  'bread', 'rice', 'pasta', 'flour', 'sugar', 'salt', 'pepper', 'olive oil', 'vegetable oil', 
  'vinegar', 'soy sauce', 'honey', 'quinoa', 'barley', 'oats', 'wheat', 'bulgur', 'couscous', 
  'lentils', 'chickpeas', 'black beans', 'kidney beans', 'navy beans', 'pinto beans', 'lima beans',
  
  // Herbs and seasonings
  'basil', 'parsley', 'cilantro', 'mint', 'thyme', 'rosemary', 'oregano', 'dill', 'sage', 'tarragon',
  
  // Common condiments and sauces
  'ketchup', 'mustard', 'mayo', 'mayonnaise', 'hot sauce', 'sriracha', 'barbecue sauce', 'ranch',
  'salad dressing', 'worcestershire', 'fish sauce', 'oyster sauce', 'teriyaki', 'balsamic',
  
  // Juices and liquids
  'lemon juice', 'lime juice', 'orange juice', 'apple juice', 'tomato juice', 'broth', 'stock',
  'chicken broth', 'beef broth', 'vegetable broth', 'wine', 'beer',
  
  // Canned/packaged items
  'canned tomatoes', 'tomato sauce', 'tomato paste', 'coconut milk', 'almond milk', 'oat milk',
  'peanut butter', 'jam', 'jelly', 'pickles', 'olives', 'capers', 'anchovies',
  
  // Frozen items
  'frozen peas', 'frozen corn', 'frozen berries', 'ice cream', 'frozen vegetables', 'frozen fruit',
  
  // Baking ingredients
  'baking powder', 'baking soda', 'vanilla', 'vanilla extract', 'cocoa powder', 'chocolate',
  
  // Additional common items
  'noodles', 'crackers', 'cereal', 'granola', 'raisins', 'dates', 'cranberries'
];

// Synonym mapping for ingredient normalization
const synonymTable: Record<string, string> = {
  'bell pepper': 'capsicum',
  'bell peppers': 'capsicum',
  'capsicum': 'bell pepper',
  'spring onion': 'scallion',
  'spring onions': 'scallions',
  'green onion': 'scallion',
  'green onions': 'scallions',
  'cilantro': 'coriander',
  'coriander': 'cilantro',
  'aubergine': 'eggplant',
  'courgette': 'zucchini',
  'rocket': 'arugula',
  'pak choi': 'bok choy',
  'pak choy': 'bok choy',
  'chinese cabbage': 'bok choy',
  'mange tout': 'snow peas',
  'mangetout': 'snow peas',
  'french beans': 'green beans',
  'runner beans': 'green beans',
  'sweetcorn': 'corn',
  'sweet corn': 'corn',
  'corn on the cob': 'corn'
};

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Process image and extract food ingredients using OpenAI Vision
export const processFridgeImage = async (req: Request, res: Response) => {
  try {
    if (!process.env.OPENAI_API_KEY) {
      console.warn('OpenAI API key not configured - returning fallback response');
      return res.json({
        ingredients: [],
        count: 0,
        error: 'Vision service not configured',
        message: 'Upload an image to detect ingredients automatically, or type ingredients manually below'
      });
    }

    const imageBuffer = req.file?.buffer;
    if (!imageBuffer || imageBuffer.length === 0) {
      return res.status(400).json({
        error: 'No image provided',
        ingredients: []
      });
    }

    // Validate image format and convert buffer to base64
    const base64Image = imageBuffer.toString('base64');
    
    // Basic validation - check if image has content
    if (base64Image.length < 100) {
      return res.json({
        ingredients: [],
        count: 0,
        error: 'Invalid image file',
        message: 'Image too small or corrupted. Please upload a clear photo of your ingredients'
      });
    }

    // Call OpenAI Vision API
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Look at this fridge/kitchen photo and identify ALL visible food items and ingredients you can see, even if they're in packages, containers, or partially visible.

Look for:
- Fresh produce (fruits, vegetables, herbs)
- Meat, poultry, fish, seafood (fresh, frozen, or packaged)
- Dairy products (milk cartons, cheese packages, yogurt containers, eggs)
- Condiments and sauces (bottles, jars, squeeze containers)
- Pantry items (canned goods, boxes, bags of grains/pasta)
- Beverages (if they're cooking ingredients like wine, broth)
- Leftovers or prepared foods you can identify
- Frozen items if visible
- Spices and seasonings
- Oils, vinegars, cooking liquids

Be generous in your identification - if you can see a milk carton, list "milk". If there's a cheese package, list "cheese". If you see egg cartons, list "eggs". Include items even if they're partially obscured or in packaging.

Return a simple list of ingredient names, one per line. Use common cooking names (e.g., "bell pepper", "ground beef", "cheddar cheese", "olive oil").`
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`
              }
            }
          ],
        },
      ],
      max_tokens: 500,
    });

    const detectedText = response.choices[0].message.content || '';
    console.log(`OpenAI Vision raw response:`, detectedText);
    
    // Parse the response into individual ingredients - more robust parsing
    const rawIngredients = detectedText
      .split(/[\n,]/) // Split on newlines AND commas
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .map(line => line.replace(/^[\d\.\-\*\•\+\s]*/, '')) // Remove bullet points, numbers, and leading spaces
      .map(line => line.replace(/[^\w\s]/g, '')) // Remove special characters except spaces
      .filter(ingredient => ingredient.length > 1)
      .map(ingredient => ingredient.toLowerCase().trim());

    console.log(`Parsed raw ingredients:`, rawIngredients);

    // Filter and normalize ingredients - more lenient approach
    const detectedItems = new Set<string>();
    
    rawIngredients.forEach(ingredient => {
      if (isFood(ingredient)) {
        detectedItems.add(normalizeIngredient(ingredient));
      } else {
        console.log(`Filtered out non-food item: "${ingredient}"`);
      }
    });

    // Convert to array and sort
    const ingredients = Array.from(detectedItems).sort();

    console.log(`Final detected food items (${ingredients.length}):`, ingredients);

    if (ingredients.length === 0) {
      return res.json({
        ingredients: [],
        count: 0,
        error: 'No food ingredients detected in image',
        message: 'Please try a clearer photo or type ingredients manually'
      });
    }

    res.json({
      ingredients,
      count: ingredients.length
    });

  } catch (error) {
    console.error('Error processing fridge image:', error);
    // Return empty ingredients array with error message
    res.json({
      ingredients: [],
      count: 0,
      error: 'Unable to analyze image automatically',
      message: 'Please type ingredients manually below'
    });
  }
};

// Check if detected item is food-related - more lenient matching
const isFood = (item: string): boolean => {
  // First check exact matches and substring matches
  const exactMatch = foodWhitelist.some(food => 
    item.includes(food) || food.includes(item)
  );
  
  if (exactMatch) return true;
  
  // Additional patterns for common food-related words
  const foodPatterns = [
    /\b(fresh|frozen|canned|dried|organic|raw|cooked)\b/i,
    /\b(sauce|dressing|oil|juice|milk|cream|butter|cheese)\b/i,
    /\b(meat|fish|seafood|poultry|vegetable|fruit|herb|spice)\b/i,
    /\b(bread|pasta|rice|grain|bean|nut|seed)\b/i
  ];
  
  return foodPatterns.some(pattern => pattern.test(item));
};

// Normalize ingredient names using synonym table
const normalizeIngredient = (ingredient: string): string => {
  const normalized = ingredient.toLowerCase().trim();
  return synonymTable[normalized] || normalized;
};

// Multer middleware for handling file uploads
export const uploadMiddleware = upload.single('image');