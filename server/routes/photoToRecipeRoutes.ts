import type { Express } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { GoogleGenAI } from "@google/genai";
import { storage } from "../storage";
import { convertToUKIngredients } from "../ukIngredientMappings";

// Configure multer for photo uploads
const upload = multer({
  dest: path.join(process.cwd(), 'server/uploads/temp'),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 3 // Maximum 3 files
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Ensure upload directory exists
const uploadDir = path.join(process.cwd(), 'server/uploads/temp');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

export function registerPhotoToRecipeRoutes(app: Express): void {
  // Extract recipe from cookbook photos
  app.post('/api/extract-recipe-from-photos', upload.fields([
    { name: 'photo0', maxCount: 1 },
    { name: 'photo1', maxCount: 1 },
    { name: 'photo2', maxCount: 1 }
  ]), async (req, res) => {
    try {
      console.log('📸 Starting photo-to-recipe extraction...');
      
      // Check authentication
      if (!req.session?.userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      // Check Flavr+ subscription or developer access
      const user = await storage.getUser(req.session.userId);
      const isDeveloper = user?.email === 'william@blycontracting.co.uk';
      const hasFlavrPlus = user?.hasFlavrPlus || isDeveloper;
      
      console.log(`🔐 Photo-to-recipe access check: user=${user?.email}, hasFlavrPlus=${user?.hasFlavrPlus}, isDeveloper=${isDeveloper}, hasAccess=${hasFlavrPlus}`);
      
      if (!hasFlavrPlus) {
        return res.status(403).json({ 
          error: 'Flavr+ subscription required for photo-to-recipe conversion' 
        });
      }

      const fileFields = req.files as { [fieldname: string]: Express.Multer.File[] };
      const files: Express.Multer.File[] = [];
      
      // Collect all uploaded files from different fields
      if (fileFields) {
        Object.values(fileFields).forEach(fileArray => {
          files.push(...fileArray);
        });
      }
      if (!files || files.length === 0) {
        return res.status(400).json({ error: 'No photos provided' });
      }

      console.log(`📸 Processing ${files.length} photos...`);

      // Initialize Gemini Vision API
      if (!process.env.GEMINI_API_KEY) {
        throw new Error('GEMINI_API_KEY not configured');
      }

      const genai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

      // Extract text from all photos using Gemini Vision
      const extractedTexts: string[] = [];
      
      for (const file of files) {
        console.log(`🔍 Analyzing photo: ${file.filename}`);
        
        try {
          const imageBytes = fs.readFileSync(file.path);
          
          const response = await genai.models.generateContent({
            model: "gemini-2.0-flash-exp",
            contents: [
              {
                inlineData: {
                  data: imageBytes.toString("base64"),
                  mimeType: file.mimetype,
                },
              },
              {
                text: `Extract ALL text from this cookbook page image. Focus on:
                - Recipe title
                - Ingredient lists with measurements
                - Cooking instructions/method steps
                - Serving information
                - Cooking times
                - Any notes or tips
                
                Please transcribe the text exactly as written, maintaining the structure and format. If this appears to be a recipe page, extract every detail you can see.`
              }
            ],
          });

          const extractedText = response.text || '';
          if (extractedText.trim()) {
            extractedTexts.push(extractedText);
            console.log(`✅ Text extracted from ${file.filename}: ${extractedText.substring(0, 100)}...`);
          }
        } catch (visionError) {
          console.error(`❌ Vision API failed for ${file.filename}:`, visionError);
          throw new Error(`Failed to analyze image ${file.filename}`);
        } finally {
          // Clean up temporary file
          try {
            fs.unlinkSync(file.path);
          } catch (cleanupError) {
            console.warn(`⚠️ Failed to cleanup temp file: ${file.path}`);
          }
        }
      }

      if (extractedTexts.length === 0) {
        return res.status(400).json({ error: 'No text could be extracted from the photos' });
      }

      // Combine all extracted text
      const combinedText = extractedTexts.join('\n\n--- PAGE BREAK ---\n\n');
      console.log('📝 Combined extracted text length:', combinedText.length);

      // Process the extracted text into a structured recipe using Gemini
      console.log('🤖 Converting extracted text to structured recipe...');
      
      const recipePrompt = `You are a professional recipe parser. Convert the following extracted cookbook text into a well-structured recipe in JSON format.

EXTRACTED TEXT:
${combinedText}

Instructions:
- Parse this text and create a complete recipe
- If the text spans multiple pages, combine all information logically
- Fill in reasonable defaults for missing information
- Use UK English throughout (aubergine not eggplant, courgette not zucchini, etc.)
- Ensure all measurements are in UK format (grams, ml, celsius)
- Estimate realistic prep and cook times based on the recipe complexity
- Provide helpful cooking tips if not explicitly mentioned

Return ONLY a valid JSON object with this exact structure:
{
  "title": "Recipe name from the text",
  "description": "Brief appealing description of the dish",
  "cuisine": "Type of cuisine (Italian, French, British, etc.)",
  "difficulty": "Easy/Medium/Hard",
  "prepTime": 15,
  "cookTime": 30,
  "servings": 4,
  "ingredients": [
    {"name": "ingredient name", "amount": "quantity with UK units"}
  ],
  "instructions": [
    {"step": 1, "instruction": "detailed cooking step"}
  ],
  "tips": ["helpful cooking tip"],
  "nutritionalHighlights": ["nutritional benefit"]
}

CRITICAL: Return ONLY the JSON object, no markdown, no explanations, no trailing commas.`;

      const recipeResponse = await genai.models.generateContent({
        model: "gemini-2.0-flash-exp",
        contents: [{ text: recipePrompt }],
        config: {
          temperature: 0.3, // Lower temperature for more consistent JSON
        },
      });

      const recipeContent = recipeResponse.text;
      if (!recipeContent) {
        throw new Error('No recipe content received from Gemini');
      }

      // Parse the recipe JSON
      let recipe;
      try {
        // Clean the response
        let cleanContent = recipeContent.trim();
        if (cleanContent.startsWith('```json')) {
          cleanContent = cleanContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        } else if (cleanContent.startsWith('```')) {
          cleanContent = cleanContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
        }
        
        // Fix common JSON errors
        cleanContent = cleanContent.replace(/,(\s*[}\]])/g, '$1');
        cleanContent = cleanContent.replace(/},(\s*\])/g, '}$1');
        
        recipe = JSON.parse(cleanContent);
        console.log('✅ Recipe parsed successfully:', recipe.title);
      } catch (parseError) {
        console.error('❌ JSON parsing failed:', parseError);
        console.error('Raw response:', recipeContent);
        throw new Error('Failed to parse recipe from extracted text');
      }

      // Apply UK English conversions to ingredients
      if (recipe.ingredients) {
        recipe.ingredients = recipe.ingredients.map((ingredient: any) => ({
          ...ingredient,
          name: convertToUKIngredients(ingredient.name)
        }));
      }

      // Add metadata
      recipe.id = Date.now().toString();
      recipe.createdAt = new Date().toISOString();
      recipe.mode = 'photo-extraction';

      console.log('📋 Final recipe structure:', JSON.stringify(recipe, null, 2));
      
      // Generate an image for the extracted recipe in the background
      try {
        console.log('🎨 Generating image for extracted recipe...');
        // This could be moved to after saving if needed, but doing it here for immediate display
        const imageResponse = await fetch('http://localhost:5000/api/generate-recipe-image', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            title: recipe.title,
            description: recipe.description,
            cuisine: recipe.cuisine
          })
        });
        
        if (imageResponse.ok) {
          const imageData = await imageResponse.json();
          recipe.imageUrl = imageData.imageUrl;
          console.log('✅ Image generated for extracted recipe:', imageData.imageUrl);
        } else {
          console.log('⚠️ Image generation failed for extracted recipe, continuing without image');
        }
      } catch (error) {
        console.log('⚠️ Image generation error for extracted recipe:', error);
        // Continue without image - this is not a critical failure
      }

      res.json({ 
        recipe,
        extractedPages: extractedTexts.length,
        message: `Successfully extracted recipe from ${files.length} photo(s)`
      });

    } catch (error: any) {
      console.error('❌ Photo-to-recipe extraction failed:', error);
      
      // Clean up any remaining temporary files
      if (req.files) {
        const fileFields = req.files as { [fieldname: string]: Express.Multer.File[] };
        Object.values(fileFields).forEach(fileArray => {
          fileArray.forEach(file => {
            try {
              fs.unlinkSync(file.path);
            } catch (cleanupError) {
              console.warn(`⚠️ Failed to cleanup temp file: ${file.path}`);
            }
          });
        });
      }

      res.status(500).json({ 
        error: error.message || 'Failed to extract recipe from photos' 
      });
    }
  });

  // Save extracted recipe to user's cookbook
  app.post('/api/save-extracted-recipe', async (req, res) => {
    try {
      console.log('💾 Saving extracted recipe to cookbook...');
      
      // Check authentication
      if (!req.session?.userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const { title, description, cuisine, difficulty, prepTime, cookTime, servings, ingredients, instructions, tips, nutritionalHighlights } = req.body;

      if (!title || !ingredients || !instructions) {
        return res.status(400).json({ error: 'Missing required recipe fields' });
      }

      // Convert complex ingredient/instruction objects to simple strings for database storage
      const ingredientStrings = ingredients.map((ing: any) => {
        if (typeof ing === 'string') return ing;
        if (ing.name && ing.amount) return `${ing.amount} ${ing.name}`;
        if (ing.item && ing.qty) return `${ing.qty} ${ing.unit || ''} ${ing.item}`.trim();
        return ing.toString();
      });

      const instructionStrings = instructions.map((inst: any) => {
        if (typeof inst === 'string') return inst;
        if (inst.instruction) return inst.instruction;
        if (inst.step && inst.instruction) return inst.instruction;
        return inst.toString();
      });

      // Save recipe to database
      const savedRecipe = await storage.createRecipe({
        userId: req.session.userId,
        title,
        description,
        cuisine,
        difficulty,
        prepTime,
        cookTime,
        servings,
        ingredients: JSON.stringify(ingredientStrings),
        instructions: JSON.stringify(instructionStrings),
        tips: tips ? JSON.stringify(tips) : '[]',
        nutritionalHighlights: nutritionalHighlights ? JSON.stringify(nutritionalHighlights) : '[]',
        imageUrl: null, // No image for photo-extracted recipes initially
        isShared: false,
        shareId: null,
        mode: 'photo-extraction'
      });

      console.log('✅ Recipe saved to cookbook:', savedRecipe.id);

      res.json({ 
        success: true, 
        recipeId: savedRecipe.id,
        message: 'Recipe saved to your cookbook successfully'
      });

    } catch (error: any) {
      console.error('❌ Failed to save extracted recipe:', error);
      res.status(500).json({ 
        error: error.message || 'Failed to save recipe to cookbook' 
      });
    }
  });
}