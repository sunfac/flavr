import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

const writeFile = promisify(fs.writeFile);
const mkdir = promisify(fs.mkdir);

export class ImageStorage {
  private static readonly IMAGES_DIR = path.join(process.cwd(), 'server', 'public', 'recipe-images');

  static async ensureImagesDirectory(): Promise<void> {
    try {
      await mkdir(this.IMAGES_DIR, { recursive: true });
    } catch (error) {
      console.error('Error creating images directory:', error);
    }
  }

  static async downloadAndStoreImage(imageUrl: string, recipeId: number): Promise<string | null> {
    try {
      console.log(`📥 Starting image download for recipe ${recipeId} from:`, imageUrl);
      await this.ensureImagesDirectory();
      console.log(`📁 Images directory ensured: ${this.IMAGES_DIR}`);

      const response = await fetch(imageUrl);
      if (!response.ok) {
        console.error(`Failed to download image: ${response.status} ${response.statusText}`);
        return null;
      }

      console.log(`✅ Image response received, content-length: ${response.headers.get('content-length')}`);
      const buffer = await response.arrayBuffer();
      const extension = this.getImageExtension(imageUrl) || 'png';
      const filename = `recipe-${recipeId}.${extension}`;
      const filepath = path.join(this.IMAGES_DIR, filename);

      console.log(`💾 Writing image to: ${filepath}`);
      await writeFile(filepath, Buffer.from(buffer));
      console.log(`✅ Image successfully written to disk`);
      
      // Return the public URL path
      return `/recipe-images/${filename}`;
    } catch (error) {
      console.error('Error downloading and storing image:', error);
      return null;
    }
  }

  private static getImageExtension(url: string): string | null {
    const match = url.match(/\.(png|jpg|jpeg|gif|webp)(\?|$)/i);
    return match ? match[1].toLowerCase() : null;
  }

  static async migrateExistingImages(): Promise<void> {
    console.log('Starting migration of existing DALL-E images...');
    
    try {
      const { storage } = await import('./storage');
      const recipes = await storage.getAllRecipes();
      
      let migrated = 0;
      let failed = 0;

      for (const recipe of recipes) {
        if (recipe.imageUrl && recipe.imageUrl.includes('blob.core.windows.net')) {
          console.log(`Migrating image for recipe ${recipe.id}: ${recipe.title}`);
          
          const localImagePath = await this.downloadAndStoreImage(recipe.imageUrl, recipe.id);
          
          if (localImagePath) {
            await storage.updateRecipeImage(recipe.id, localImagePath);
            migrated++;
            console.log(`✓ Migrated image for recipe ${recipe.id}`);
          } else {
            failed++;
            console.log(`✗ Failed to migrate image for recipe ${recipe.id}`);
          }
        }
      }

      console.log(`Migration complete: ${migrated} images migrated, ${failed} failed`);
    } catch (error) {
      console.error('Error during image migration:', error);
    }
  }
}