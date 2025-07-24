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

// Food whitelist for filtering Google Vision results
const foodWhitelist = [
  'apple', 'apples', 'banana', 'bananas', 'orange', 'oranges', 'lemon', 'lemons', 'lime', 'limes',
  'tomato', 'tomatoes', 'potato', 'potatoes', 'onion', 'onions', 'garlic', 'carrot', 'carrots',
  'broccoli', 'spinach', 'lettuce', 'cucumber', 'cucumbers', 'bell pepper', 'bell peppers',
  'mushroom', 'mushrooms', 'avocado', 'avocados', 'corn', 'peas', 'beans', 'green beans',
  'chicken', 'beef', 'pork', 'fish', 'salmon', 'tuna', 'shrimp', 'eggs', 'egg', 'milk',
  'cheese', 'butter', 'yogurt', 'bread', 'rice', 'pasta', 'flour', 'sugar', 'salt',
  'pepper', 'basil', 'parsley', 'cilantro', 'mint', 'thyme', 'rosemary', 'oregano',
  'olive oil', 'vegetable oil', 'vinegar', 'soy sauce', 'honey', 'lemon juice', 'lime juice',
  'celery', 'zucchini', 'eggplant', 'cauliflower', 'cabbage', 'kale', 'sweet potato',
  'ginger', 'chili', 'chili pepper', 'jalapeño', 'strawberry', 'strawberries', 'blueberry', 'blueberries',
  'grape', 'grapes', 'pineapple', 'mango', 'papaya', 'coconut', 'nuts', 'almonds', 'walnuts',
  'turkey', 'bacon', 'ham', 'sausage', 'ground beef', 'ground turkey', 'lamb', 'duck',
  'lobster', 'crab', 'mussels', 'scallops', 'squid', 'octopus', 'clams', 'oysters',
  'cream', 'sour cream', 'heavy cream', 'cottage cheese', 'mozzarella', 'cheddar', 'parmesan',
  'feta', 'goat cheese', 'blue cheese', 'swiss cheese', 'brie', 'camembert',
  'quinoa', 'barley', 'oats', 'wheat', 'bulgur', 'couscous', 'lentils', 'chickpeas',
  'black beans', 'kidney beans', 'navy beans', 'pinto beans', 'lima beans', 'tofu', 'tempeh'
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
        ingredients: ['Upload an image to detect ingredients automatically', 'Or type ingredients manually below'],
        count: 2,
        error: 'Vision service not configured'
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
        ingredients: ['Image too small or corrupted', 'Please upload a clear photo of your ingredients'],
        count: 2,
        error: 'Invalid image file'
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
              text: `Analyze this image and identify all visible food ingredients, produce items, and cooking ingredients you can see. 

Focus on:
- Fresh fruits and vegetables
- Meat, poultry, fish, and seafood
- Dairy products (milk, cheese, eggs, etc.)
- Pantry staples (spices, oils, sauces, etc.)
- Grains, pasta, bread
- Canned or packaged foods

Return only a simple list of ingredient names, one per line. Be specific but concise (e.g., "red bell pepper" not just "pepper", "ground beef" not just "meat"). Only include items you can clearly see and identify.`
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
    
    // Parse the response into individual ingredients
    const rawIngredients = detectedText
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0 && !line.startsWith('-') && !line.includes(':'))
      .map(line => line.replace(/^[\d\.\-\*\•\+]\s*/, '')) // Remove bullet points and numbers
      .filter(ingredient => ingredient.length > 1);

    // Filter and normalize ingredients
    const detectedItems = new Set<string>();
    
    rawIngredients.forEach(ingredient => {
      const itemName = ingredient.toLowerCase().trim();
      if (isFood(itemName)) {
        detectedItems.add(normalizeIngredient(itemName));
      }
    });

    // Convert to array and sort
    const ingredients = Array.from(detectedItems).sort();

    console.log(`OpenAI Vision detected ${ingredients.length} food items:`, ingredients);

    if (ingredients.length === 0) {
      return res.json({
        ingredients: ['No food ingredients detected in image', 'Please try a clearer photo or type ingredients manually'],
        count: 2,
        error: 'No ingredients found'
      });
    }

    res.json({
      ingredients,
      count: ingredients.length
    });

  } catch (error) {
    console.error('Error processing fridge image:', error);
    // Return helpful fallback instead of error
    res.json({
      ingredients: ['Unable to analyze image automatically', 'Please type ingredients manually below'],
      count: 2,
      error: 'Image processing failed - manual input available'
    });
  }
};

// Check if detected item is food-related
const isFood = (item: string): boolean => {
  return foodWhitelist.some(food => 
    item.includes(food) || food.includes(item)
  );
};

// Normalize ingredient names using synonym table
const normalizeIngredient = (ingredient: string): string => {
  const normalized = ingredient.toLowerCase().trim();
  return synonymTable[normalized] || normalized;
};

// Multer middleware for handling file uploads
export const uploadMiddleware = upload.single('image');