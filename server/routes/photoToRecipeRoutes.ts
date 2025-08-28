import type { Express } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { storage } from "../storage";
import { convertToUKIngredients } from "../ukIngredientMappings";
import { ImageStorage } from "../imageStorage";
import OpenAI from "openai";

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

// Initialize OpenAI for image generation
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export function registerPhotoToRecipeRoutes(app: Express): void {
  // Extract recipe from cookbook photos
  app.post('/api/extract-recipe-from-photos', upload.any(), async (req, res) => {
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

      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        return res.status(400).json({ error: 'No photos provided' });
      }

      // Separate main recipe photos from sub-recipe photos
      const mainPhotos: Express.Multer.File[] = [];
      const subRecipePhotos: Array<{ name: string, file: Express.Multer.File }> = [];
      
      files.forEach(file => {
        if (file.fieldname.startsWith('main_photo_')) {
          mainPhotos.push(file);
        } else if (file.fieldname.startsWith('sub_')) {
          // Extract sub-recipe name from fieldname (sub_{name})
          const subRecipeName = file.fieldname.substring(4); // Remove 'sub_' prefix
          subRecipePhotos.push({ name: subRecipeName, file });
        }
      });

      console.log(`📸 Processing ${mainPhotos.length} main photos and ${subRecipePhotos.length} sub-recipe photos...`);

      // Initialize OpenAI Vision API
      if (!process.env.OPENAI_API_KEY) {
        throw new Error('OPENAI_API_KEY not configured');
      }

      // Extract text from main recipe photos using OpenAI Vision
      const mainRecipeTexts: string[] = [];
      const subRecipeTexts: Record<string, string> = {};
      const failedFiles: string[] = [];
      
      // Process main recipe photos in parallel for better performance
      console.log('⚡ Processing main recipe photos in parallel for speed...');
      const mainPhotoPromises = mainPhotos.map(async (file) => {
        console.log(`🔍 Analyzing photo: ${file.filename}`);
        
        try {
          const imageBytes = fs.readFileSync(file.path);
          const base64Image = imageBytes.toString("base64");
          
          const response = await openai.chat.completions.create({
            model: "gpt-4o", // using gpt-4o for cost efficiency as requested
            messages: [
              {
                role: "user",
                content: [
                  {
                    type: "text",
                    text: `Extract ALL text from this cookbook page image. Focus on:
                    - Recipe title
                    - Ingredient lists with measurements
                    - Cooking instructions/method steps
                    - Serving information
                    - Cooking times
                    - Any notes or tips
                    - Page references (e.g., "see page 45")
                    
                    Please transcribe the text exactly as written, maintaining the structure and format. If this appears to be a recipe page, extract every detail you can see, including any sub-recipe sections or references to other pages.`
                  },
                  {
                    type: "image_url",
                    image_url: {
                      url: `data:${file.mimetype};base64,${base64Image}`
                    }
                  }
                ]
              }
            ],
            max_tokens: 1000
          });

          const extractedText = response.choices[0]?.message?.content || '';
          if (extractedText.trim()) {
            mainRecipeTexts.push(extractedText);
            console.log(`✅ Main recipe text extracted from ${file.filename}: ${extractedText.substring(0, 100)}...`);
          }
        } catch (visionError) {
          console.error(`❌ OpenAI Vision API failed for ${file.filename}:`, visionError);
          failedFiles.push(file.filename);
          
          // Continue with other files instead of throwing error
          console.log(`⚠️ Continuing with other photos despite failure for ${file.filename}`);
        } finally {
          // Clean up temporary file
          try {
            fs.unlinkSync(file.path);
          } catch (cleanupError) {
            console.warn(`⚠️ Failed to cleanup temp file: ${file.path}`);
          }
        }
      });

      // Wait for all main photo processing to complete
      await Promise.all(mainPhotoPromises);

      // Process sub-recipe photos in parallel for better performance  
      console.log('⚡ Processing sub-recipe photos in parallel for speed...');
      const subRecipePromises = subRecipePhotos.map(async (subRecipe) => {
        console.log(`🔍 Analyzing sub-recipe photo: ${subRecipe.name}`);
        
        try {
          const imageBytes = fs.readFileSync(subRecipe.file.path);
          const base64Image = imageBytes.toString("base64");
          
          const response = await openai.chat.completions.create({
            model: "gpt-4o", // using gpt-4o for cost efficiency as requested
            messages: [
              {
                role: "user",
                content: [
                  {
                    type: "text",
                    text: `Extract ALL text from this cookbook page image for the recipe: "${subRecipe.name}". Focus on:
                    - Recipe title (should contain "${subRecipe.name}")
                    - Complete ingredient list
                    - Cooking method/instructions
                    - Prep time and cooking time if shown
                    - Any notes or tips
                    
                    This is a sub-recipe/side dish that will be referenced by a main recipe. Please extract every detail you can see.`
                  },
                  {
                    type: "image_url",
                    image_url: {
                      url: `data:${subRecipe.file.mimetype};base64,${base64Image}`
                    }
                  }
                ]
              }
            ],
            max_tokens: 1000
          });

          const extractedText = response.choices[0]?.message?.content || '';
          if (extractedText.trim()) {
            subRecipeTexts[subRecipe.name] = extractedText;
            console.log(`✅ Sub-recipe text extracted for ${subRecipe.name}: ${extractedText.substring(0, 100)}...`);
          }
        } catch (visionError) {
          console.error(`❌ Sub-recipe vision API failed for ${subRecipe.name}:`, visionError);
          failedFiles.push(subRecipe.file.filename);
          console.log(`⚠️ Continuing without sub-recipe ${subRecipe.name}`);
        } finally {
          // Clean up temporary file
          try {
            fs.unlinkSync(subRecipe.file.path);
          } catch (cleanupError) {
            console.warn(`⚠️ Failed to cleanup sub-recipe file: ${subRecipe.file.path}`);
          }
        }
      });

      // Wait for all sub-recipe processing to complete
      await Promise.all(subRecipePromises);

      if (mainRecipeTexts.length === 0) {
        return res.status(400).json({ 
          error: 'No text could be extracted from any photos. This may be due to API quota limits. Please try again later or with fewer photos.' 
        });
      }

      // Log success/failure summary
      console.log(`📊 Extraction summary: ${mainRecipeTexts.length} main recipes, ${Object.keys(subRecipeTexts).length} sub-recipes, ${failedFiles.length} failed`);
      if (failedFiles.length > 0) {
        console.log(`⚠️ Failed files: ${failedFiles.join(', ')}`);
      }

      // Combine all extracted text
      const combinedText = mainRecipeTexts.join('\n\n--- PAGE BREAK ---\n\n');
      console.log('📝 Combined extracted text length:', combinedText.length);
      console.log('📄 FULL EXTRACTED TEXT FOR DEBUG:');
      console.log(combinedText);
      console.log('=== END EXTRACTED TEXT ===');

      // Process the extracted text into a structured recipe using Gemini
      console.log('🤖 Converting extracted text to structured recipe...');
      
      // Add sub-recipe information to the prompt
      let subRecipeInfo = '';
      if (Object.keys(subRecipeTexts).length > 0) {
        subRecipeInfo = `\n\nSUB-RECIPE PHOTOS PROVIDED:
The user has specifically uploaded photos for the following sub-recipes:
${Object.entries(subRecipeTexts).map(([name, text]) => 
  `\n--- SUB-RECIPE: ${name.toUpperCase()} ---\n${text}`
).join('\n')}
\nYou MUST extract these sub-recipes from the text above and include them in the subRecipes section.`;
      }

      const recipePrompt = `You are a professional recipe parser working for Flavr AI. Convert the following extracted cookbook text into a well-structured recipe in JSON format, completely rewritten in Flavr's distinctive style.

IMPORTANT: Before processing, FIRST scan ALL the text below to identify ALL recipes mentioned. Extract the MAIN DISH recipe as the primary output, but ALSO capture any sub-recipes (sauces, chutneys, etc.) that appear on the photographed pages in the subRecipes section. If you see a main curry AND a tamarind chutney, extract the MAIN CURRY as the recipe, and include the tamarind chutney in subRecipes.

MAIN RECIPE EXTRACTED TEXT:
${combinedText}${subRecipeInfo}

CRITICAL COPYRIGHT REQUIREMENTS:
- NEVER copy instructions, descriptions, or method steps verbatim from the source
- COMPLETELY REWRITE all instructional text in Flavr's friendly, accessible style
- Ingredient lists can be preserved as-is (not copyrightable)
- All descriptions, tips, and method steps must be your own original wording

FLAVR STYLE GUIDELINES:
- Write instructions in a warm, encouraging tone like a helpful friend cooking alongside you
- Use clear, simple language that builds confidence
- Include helpful timing cues and sensory descriptions ("until golden and fragrant", "when it starts to sizzle")
- Add practical tips that make cooking easier ("don't worry if it looks lumpy at first")
- Make the cooking process feel approachable and enjoyable

MAIN RECIPE IDENTIFICATION (CRITICAL):
- IDENTIFY THE PRIMARY MAIN DISH first before processing sub-recipes
- Look for the LARGEST, most complete recipe with a full ingredient list and method
- Main recipes typically have:
  * 4+ servings mentioned
  * Substantial ingredient lists (6+ ingredients)
  * Complete cooking methods with multiple steps (5+ steps)
  * Dish names that are full meals (not condiments/sides)
  * Include proteins, vegetables, or substantial carbohydrates
  * Have prep AND cook times (not just mixing instructions)
- AVOID extracting these as main recipes:
  * Sauces, chutneys, relishes, dressings
  * Spice mixes, marinades, stocks
  * Garnishes, sides, or accompaniments
  * Single-ingredient preparations
- If multiple recipes exist, choose the one that represents the COMPLETE MEAL (not the accompaniment)
- Look for recipe titles that indicate main dishes: curry, stir-fry, roast, bake, stew, etc.

MULTI-PAGE EXTRACTION REQUIREMENTS:
- CAREFULLY scan ALL pages for complete recipe information
- If ingredients are listed on one page and method on another, COMBINE them
- If you see partial ingredient lists followed by "continued..." or page references, merge ALL parts
- If cooking steps reference ingredients not yet listed, scan other pages for those ingredients
- Look for serving suggestions, garnishes, or final touches that might be on separate pages
- Ensure NO recipe elements are missing even if scattered across pages

SUB-RECIPE EXTRACTION - CRITICAL CORRELATION PROCESS:

MANDATORY: You MUST extract sub-recipes if ANY of these appear in the main recipe ingredients:
- "chilli drizzle" - LOOK FOR: any recipe titled "Chilli Drizzle", "Chili Drizzle", or similar
- "tamarind chutney" - LOOK FOR: any recipe titled "Tamarind Chutney", "Tamarind Sauce", or similar  
- Any ingredient followed by "(see page X)" or similar reference

STEP 1: SCAN ALL TEXT FOR SUB-RECIPE SECTIONS
- Look through ALL extracted text for recipe titles that could be sub-recipes
- Search for: CHILLI DRIZZLE, TAMARIND CHUTNEY, or any sauce/condiment recipes
- These will appear as separate recipe sections with their own ingredients and methods
- They may NOT have page references - find them by name matching

STEP 2: AGGRESSIVE MATCHING
- If main recipe mentions "chilli drizzle" → find ANY recipe with "chilli" in the title
- If main recipe mentions "tamarind chutney" → find ANY recipe with "tamarind" in the title
- Match even if spelling or formatting differs slightly

STEP 3: EXTRACT EVERYTHING FOUND
- Extract ALL matching sub-recipes, even if you're not 100% certain
- Include complete ingredients and method steps for each sub-recipe
- Store with the exact name from the main recipe ingredients as the key

EXAMPLE CORRELATION:
Main recipe ingredient: "3 tsp chilli drizzle (see page 45)"
Found elsewhere in text: "CHILLI DRIZZLE" followed by ingredients and method
→ Extract as: "chilli drizzle": { "ingredients": [...], "instructions": [...] }

SUB-RECIPE FORMAT:
"subRecipes": {
  "chilli drizzle": {
    "title": "Chilli Drizzle",
    "ingredients": ["1 red chilli, finely chopped", "2 tbsp olive oil"],
    "instructions": ["Finely chop the chilli", "Mix with oil and let infuse for 10 minutes"],
    "servings": 1,
    "prepTime": 5
  }
}

TECHNICAL REQUIREMENTS:
- Parse ingredients accurately but rewrite all method steps completely
- Use UK English throughout (aubergine not eggplant, courgette not zucchini, etc.)
- Ensure all measurements are in UK format (grams, ml, celsius)
- Estimate realistic prep and cook times based on complexity

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
    {"name": "ingredient name", "amount": "quantity with UK units", "pageReference": "page 45"}
  ],
  "instructions": [
    {"step": 1, "instruction": "detailed cooking step"}
  ],
  "tips": ["helpful cooking tip"],
  "nutritionalHighlights": ["nutritional benefit"],
  "subRecipes": {
    "chilli drizzle": {
      "ingredients": ["1 red chilli", "2 tbsp olive oil"],
      "instructions": ["Finely chop chilli", "Mix with oil"]
    }
  }
}

CRITICAL: Return ONLY the JSON object, no markdown, no explanations, no trailing commas.`;

      const recipeResponse = await openai.chat.completions.create({
        model: "gpt-4o", // using gpt-4o for cost efficiency as requested
        messages: [
          {
            role: "user",
            content: recipePrompt
          }
        ],
        temperature: 0.3, // Lower temperature for more consistent JSON
        max_tokens: 2000
      });

      const recipeContent = recipeResponse.choices[0]?.message?.content;
      if (!recipeContent) {
        throw new Error('No recipe content received from OpenAI');
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
      
      // Debug: Check for sub-recipes
      console.log('🔍 DEBUG: Checking for sub-recipes in extracted data...');
      if (recipe.subRecipes) {
        console.log('✅ Sub-recipes found:', Object.keys(recipe.subRecipes));
        Object.entries(recipe.subRecipes).forEach(([key, subRecipe]) => {
          console.log(`  - ${key}:`, JSON.stringify(subRecipe, null, 2));
        });
      } else {
        console.log('❌ No sub-recipes found in extraction');
      }
      
      // Initialize global cache if needed
      if (!global.recipeImageCache) {
        global.recipeImageCache = new Map();
      }
      
      // Create a tempId for image polling
      const tempId = `photo-extracted-${Date.now()}`;
      recipe.tempId = tempId;
      
      // Generate recipe image using DALL-E 3
      console.log('🎨 Generating recipe image...');
      try {
        const imageResponse = await openai.images.generate({
          model: "dall-e-3",
          prompt: `Professional food photography of ${recipe.title}, ${recipe.description}. High-quality, appetizing, clean background, natural lighting, cookbook style`,
          n: 1,
          size: "1024x1024",
          quality: "standard",
        });

        if (imageResponse.data[0]?.url) {
          const imageUrl = imageResponse.data[0].url;
          recipe.imageUrl = imageUrl;
          
          // Update cache with image
          global.recipeImageCache.set(tempId, {
            recipe,
            imageUrl
          });
          console.log(`🎨 Recipe image generated and cached for tempId: ${tempId}`);
        }
      } catch (imageError) {
        console.warn('⚠️ Image generation failed:', imageError.message);
        console.log('📸 Continuing without image generation...');
      }
      
      // Ensure cache is set if no image was generated
      if (!global.recipeImageCache.has(tempId)) {
        global.recipeImageCache.set(tempId, {
          recipe,
          imageUrl: null
        });
        console.log(`📋 Cached recipe data without image for tempId: ${tempId}`);
      }

      // Process sub-recipes if they exist
      if (recipe.subRecipes) {
        console.log('📚 Found sub-recipes:', Object.keys(recipe.subRecipes));
        console.log('📋 Sub-recipe details:', JSON.stringify(recipe.subRecipes, null, 2));
      } else {
        console.log('❌ No sub-recipes found in extracted data');
        console.log('🔍 Debug: Looking for common sub-recipe indicators in text...');
        const subRecipeIndicators = ['chutney', 'drizzle', 'sauce', 'marinade', 'dressing'];
        subRecipeIndicators.forEach(indicator => {
          if (combinedText.toLowerCase().includes(indicator)) {
            console.log(`✅ Found "${indicator}" in text - should have been extracted`);
          }
        });
      }

      // Prepare response message
      let message = `Successfully extracted recipe from ${mainRecipeTexts.length} photo(s)`;
      if (failedFiles.length > 0) {
        message += `. Note: ${failedFiles.length} photo(s) failed to process due to API limits, but extraction continued with available data.`;
      }

      res.json({ 
        recipe,
        subRecipes: recipe.subRecipes || {},
        extractedPages: mainRecipeTexts.length,
        failedPages: failedFiles.length,
        message
      });

    } catch (error: any) {
      console.error('❌ Photo-to-recipe extraction failed:', error);
      
      // Clean up any remaining temporary files
      if (req.files) {
        const files = req.files as Express.Multer.File[];
        files.forEach(file => {
          try {
            fs.unlinkSync(file.path);
          } catch (cleanupError) {
            console.warn(`⚠️ Failed to cleanup temp file: ${file.path}`);
          }
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
        cookTime,
        servings,
        ingredients: ingredientStrings,
        instructions: instructionStrings,
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