import type { Express } from "express";
import path from "path";
import fs from "fs";
import { ImageStorage } from "../imageStorage";
import { storage } from "../storage";

export function registerImageRoutes(app: Express): void {
  // Serve local images
  app.get('/api/images/serve/:filename', (req, res) => {
    try {
      const filename = req.params.filename;
      const imagePath = path.join(process.cwd(), 'server/public/recipe-images', filename);
      
      if (fs.existsSync(imagePath)) {
        res.sendFile(imagePath);
      } else {
        res.status(404).json({ error: 'Image not found' });
      }
    } catch (error) {
      console.error('Image serving error:', error);
      res.status(500).json({ error: 'Failed to serve image' });
    }
  });

  // Migration endpoint for existing images
  app.post('/api/migrate-images', async (req, res) => {
    try {
      await ImageStorage.migrateExistingImages();
      res.json({ message: 'Image migration completed successfully' });
    } catch (error) {
      console.error('Image migration error:', error);
      res.status(500).json({ 
        error: 'Failed to migrate images',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Check migration status
  app.get('/api/migration-status', async (req, res) => {
    try {
      const recipes = await storage.getAllRecipes();
      const expiredImages = recipes.filter(r => 
        r.imageUrl && r.imageUrl.includes('blob.core.windows.net')
      );
      const localImages = recipes.filter(r => 
        r.imageUrl && !r.imageUrl.includes('blob.core.windows.net')
      );

      res.json({
        totalRecipes: recipes.length,
        expiredImages: expiredImages.length,
        localImages: localImages.length,
        needsMigration: expiredImages.length > 0
      });
    } catch (error) {
      console.error('Migration status error:', error);
      res.status(500).json({ error: 'Failed to check migration status' });
    }
  });
}