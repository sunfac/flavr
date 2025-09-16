import { storage } from "./storage";
import { ImageStorage } from "./imageStorage";
import { generateRecipeImageWithDallE } from "./imageGeneration";
import * as fs from "fs";
import * as path from "path";

/**
 * Check if a local image file exists for a recipe
 */
async function checkIfLocalImageExists(recipeId: number): Promise<boolean> {
  const imagesDir = path.join(process.cwd(), 'server', 'public', 'recipe-images');
  const extensions = ['png', 'jpg', 'jpeg', 'webp'];
  
  for (const ext of extensions) {
    const filePath = path.join(imagesDir, `recipe-${recipeId}.${ext}`);
    try {
      await fs.promises.access(filePath);
      return true;
    } catch {
      // File doesn't exist, continue checking
    }
  }
  
  return false;
}

/**
 * Migration script to fix recipes with missing or external image URLs
 * This ensures all saved recipes have properly migrated local images
 */
export async function fixRecipeImages() {
  console.log("🔧 Starting recipe image migration for saved recipes...");
  
  try {
    // Get all recipes that need image fixes
    const recipesNeedingFix = await storage.executeRawQuery(`
      SELECT id, title, cuisine, user_id, image_url 
      FROM recipes 
      WHERE user_id IS NOT NULL 
      AND (
        image_url IS NULL 
        OR image_url = '' 
        OR image_url LIKE 'https://oaidalleapiprodscus.blob.core.windows.net%'
      )
      ORDER BY created_at DESC
    `);

    const recipes = recipesNeedingFix.rows;
    console.log(`📊 Found ${recipes.length} recipes needing image fixes`);

    if (recipes.length === 0) {
      console.log("✅ All recipes already have local images!");
      return;
    }

    let fixed = 0;
    let failed = 0;

    // Process each recipe that needs an image fix
    for (const recipe of recipes) {
      try {
        console.log(`🎨 Processing recipe ${recipe.id}: "${recipe.title}"`);
        
        // Check if recipe already has a local image file  
        const localImagePath = `/recipe-images/recipe-${recipe.id}.png`;
        const hasLocalFile = await checkIfLocalImageExists(recipe.id);
        
        if (hasLocalFile) {
          // Update database to point to local file
          await storage.updateRecipe(recipe.id, { imageUrl: localImagePath });
          console.log(`✅ Updated recipe ${recipe.id} to use existing local image`);
          fixed++;
          continue;
        }

        // If external URL exists, try to migrate it first
        if (recipe.image_url && recipe.image_url.startsWith('https://')) {
          console.log(`📥 Attempting to migrate external image for recipe ${recipe.id}`);
          
          const migratedPath = await ImageStorage.autoMigrateRecipeImage(
            recipe.image_url, 
            recipe.id, 
            storage
          );
          
          if (migratedPath && migratedPath.startsWith('/recipe-images/')) {
            console.log(`✅ Successfully migrated external image for recipe ${recipe.id}`);
            fixed++;
            continue;
          }
        }

        // Generate new image if migration failed or no image exists
        console.log(`🎯 Generating new image for recipe ${recipe.id}`);
        
        // Create optimized prompt for the recipe
        const imagePrompt = `Food photography of ${recipe.title}, ${recipe.cuisine || 'international'} cuisine, appetizing presentation, clean aesthetic, professional food styling`;
        
        // Generate DALL-E image
        const dalleUrl = await generateRecipeImageWithDallE(imagePrompt, {
          quality: 'standard', // Use standard quality for migration
          size: '1024x1024'
        });

        if (dalleUrl) {
          // Download and store locally
          const localPath = await ImageStorage.downloadAndStoreImage(dalleUrl, recipe.id);
          
          if (localPath) {
            // Update recipe with local path
            await storage.updateRecipe(recipe.id, { imageUrl: localPath });
            console.log(`✅ Generated and stored new image for recipe ${recipe.id}`);
            fixed++;
          } else {
            console.log(`❌ Failed to store image locally for recipe ${recipe.id}`);
            failed++;
          }
        } else {
          console.log(`❌ Failed to generate image for recipe ${recipe.id}`);
          failed++;
        }

        // Add small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        console.error(`❌ Error processing recipe ${recipe.id}:`, error);
        failed++;
      }
    }

    console.log(`\n📊 Migration Summary:`);
    console.log(`✅ Fixed: ${fixed} recipes`);
    console.log(`❌ Failed: ${failed} recipes`);
    console.log(`🏁 Migration complete!`);

  } catch (error) {
    console.error("❌ Error during recipe image migration:", error);
    throw error;
  }
}

/**
 * Check and report on recipe image status
 */
export async function checkRecipeImageStatus() {
  try {
    const totalRecipes = await storage.executeRawQuery(`
      SELECT COUNT(*) as count FROM recipes WHERE user_id IS NOT NULL
    `);

    const recipesWithImages = await storage.executeRawQuery(`
      SELECT COUNT(*) as count FROM recipes 
      WHERE user_id IS NOT NULL 
      AND image_url IS NOT NULL 
      AND image_url != ''
    `);

    const recipesWithLocalImages = await storage.executeRawQuery(`
      SELECT COUNT(*) as count FROM recipes 
      WHERE user_id IS NOT NULL 
      AND image_url LIKE '/recipe-images/%'
    `);

    const recipesWithExternalImages = await storage.executeRawQuery(`
      SELECT COUNT(*) as count FROM recipes 
      WHERE user_id IS NOT NULL 
      AND image_url LIKE 'https://%'
    `);

    console.log(`\n📊 Recipe Image Status Report:`);
    console.log(`📖 Total user recipes: ${totalRecipes.rows[0].count}`);
    console.log(`🖼️ Recipes with images: ${recipesWithImages.rows[0].count}`);
    console.log(`🏠 Recipes with local images: ${recipesWithLocalImages.rows[0].count}`);
    console.log(`🌐 Recipes with external images: ${recipesWithExternalImages.rows[0].count}`);
    console.log(`❌ Recipes missing images: ${totalRecipes.rows[0].count - recipesWithImages.rows[0].count}`);

    return {
      total: parseInt(totalRecipes.rows[0].count),
      withImages: parseInt(recipesWithImages.rows[0].count),
      withLocalImages: parseInt(recipesWithLocalImages.rows[0].count),
      withExternalImages: parseInt(recipesWithExternalImages.rows[0].count),
      missingImages: parseInt(totalRecipes.rows[0].count) - parseInt(recipesWithImages.rows[0].count)
    };

  } catch (error) {
    console.error("❌ Error checking recipe image status:", error);
    throw error;
  }
}