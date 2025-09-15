import type { Express } from "express";
import path from "path";
import fs from "fs";
import { ImageStorage } from "../imageStorage";
import { storage } from "../storage";

export function registerImageRoutes(app: Express): void {
  // Serve local images with better deployment support
  app.get('/api/images/serve/:filename', (req, res) => {
    try {
      const filename = req.params.filename;
      const imagePath = path.join(process.cwd(), 'server/public/recipe-images', filename);
      
      console.log(`📸 Attempting to serve image: ${filename} from path: ${imagePath}`);
      
      if (fs.existsSync(imagePath)) {
        // Set proper headers for image serving
        res.setHeader('Content-Type', 'image/png');
        res.setHeader('Cache-Control', 'public, max-age=86400'); // 24 hours
        res.sendFile(imagePath);
        console.log(`✅ Successfully served image: ${filename}`);
      } else {
        console.error(`❌ Image not found: ${filename} at ${imagePath}`);
        res.status(404).json({ error: 'Image not found' });
      }
    } catch (error) {
      console.error('Image serving error:', error);
      res.status(500).json({ error: 'Failed to serve image' });
    }
  });

  // Alternative direct image serving route for deployment
  app.use('/recipe-images', (req, res, next) => {
    const filename = req.url.substring(1); // Remove leading slash
    const imagePath = path.join(process.cwd(), 'server/public/recipe-images', filename);
    
    console.log(`📸 Direct image request: ${filename}`);
    
    if (fs.existsSync(imagePath)) {
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      res.sendFile(imagePath);
    } else {
      next();
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