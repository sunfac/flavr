import { Request, Response } from 'express';
import multer from 'multer';
import { ImageAnnotatorClient } from '@google-cloud/vision';

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

// Initialize Google Cloud Vision client
let visionClient: ImageAnnotatorClient | null = null;

const initializeVisionClient = () => {
  if (!process.env.GOOGLE_CLOUD_PROJECT_ID) {
    console.warn('GOOGLE_CLOUD_PROJECT_ID not set - vision functionality disabled');
    return null;
  }

  try {
    const config: any = {
      projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
    };

    // Use credentials from environment variable if available
    if (process.env.GOOGLE_CLOUD_CREDENTIALS) {
      try {
        config.credentials = JSON.parse(process.env.GOOGLE_CLOUD_CREDENTIALS);
      } catch (parseError) {
        console.error('Failed to parse GOOGLE_CLOUD_CREDENTIALS:', parseError);
        return null;
      }
    } else if (process.env.GOOGLE_CLOUD_KEY_FILE) {
      config.keyFilename = process.env.GOOGLE_CLOUD_KEY_FILE;
    } else {
      console.warn('No Google Cloud credentials provided - vision functionality disabled');
      return null;
    }

    visionClient = new ImageAnnotatorClient(config);
    return visionClient;
  } catch (error) {
    console.error('Failed to initialize Google Cloud Vision client:', error);
    return null;
  }
};

// Process image and extract food ingredients
export const processFridgeImage = async (req: Request, res: Response) => {
  try {
    if (!visionClient && !initializeVisionClient()) {
      return res.status(500).json({
        error: 'Vision service not available',
        ingredients: []
      });
    }

    const imageBuffer = req.file?.buffer;
    if (!imageBuffer) {
      return res.status(400).json({
        error: 'No image provided',
        ingredients: []
      });
    }

    // Call Google Cloud Vision API
    const [result] = await visionClient!.annotateImage({
      image: { content: imageBuffer },
      features: [
        {
          type: 'OBJECT_LOCALIZATION',
          maxResults: 50,
        },
        {
          type: 'LABEL_DETECTION',
          maxResults: 50,
        },
      ],
    });

    // Extract and filter ingredients
    const detectedItems = new Set<string>();

    // Process object localization results
    if (result.localizedObjectAnnotations) {
      result.localizedObjectAnnotations.forEach(object => {
        if (object.name && object.score && object.score >= 0.7) {
          const itemName = object.name.toLowerCase().trim();
          if (isFood(itemName)) {
            detectedItems.add(normalizeIngredient(itemName));
          }
        }
      });
    }

    // Process label detection results
    if (result.labelAnnotations) {
      result.labelAnnotations.forEach(label => {
        if (label.description && label.score && label.score >= 0.7) {
          const itemName = label.description.toLowerCase().trim();
          if (isFood(itemName)) {
            detectedItems.add(normalizeIngredient(itemName));
          }
        }
      });
    }

    // Convert to array and sort
    const ingredients = Array.from(detectedItems).sort();

    console.log(`Vision API detected ${ingredients.length} food items:`, ingredients);

    res.json({
      ingredients,
      count: ingredients.length
    });

  } catch (error) {
    console.error('Error processing fridge image:', error);
    res.status(500).json({
      error: 'Failed to process image',
      ingredients: []
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