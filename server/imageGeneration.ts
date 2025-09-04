import OpenAI from 'openai';
import { aiCostTracker } from './aiCostTracker';

const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY 
});

// Smart image generation cache for cost optimization
class ImageGenerationCache {
  private static cache = new Map<string, { url: string, timestamp: number }>();
  private static maxSize = 50;
  private static cacheValidityMs = 24 * 60 * 60 * 1000; // 24 hours

  static generateCacheKey(prompt: string, model: string, quality: string): string {
    // Normalize prompt for better cache hits
    const normalizedPrompt = prompt.toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    return `${model}-${quality}-${normalizedPrompt}`;
  }

  static get(key: string): string | null {
    const cached = this.cache.get(key);
    if (!cached) return null;
    
    // Check if cache entry is still valid
    if (Date.now() - cached.timestamp > this.cacheValidityMs) {
      this.cache.delete(key);
      return null;
    }
    
    return cached.url;
  }

  static set(key: string, url: string): void {
    // Clean up old entries if cache is full
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }
    
    this.cache.set(key, { url, timestamp: Date.now() });
  }

  static clear(): void {
    this.cache.clear();
  }
}

export async function generateRecipeImageWithDallE(
  prompt: string, 
  options: { 
    quality?: 'standard' | 'hd',
    size?: '1024x1024' | '1024x1792' | '1792x1024',
    preferCache?: boolean 
  } = {}
): Promise<string | null> {
  try {
    const { quality = 'standard', size = '1024x1024', preferCache = true } = options;
    
    console.log('🎨 Optimizing recipe image generation with DALL-E...');
    
    if (!process.env.OPENAI_API_KEY) {
      console.log('⚠️ OPENAI_API_KEY not set, skipping image generation');
      return null;
    }

    // Check cache first for cost optimization
    if (preferCache) {
      const cacheKey = ImageGenerationCache.generateCacheKey(prompt, 'dall-e-3', quality);
      const cachedUrl = ImageGenerationCache.get(cacheKey);
      if (cachedUrl) {
        console.log('✅ Using cached image for cost optimization');
        return cachedUrl;
      }
    }

    // Smart cost optimization: use standard quality for most cases
    const optimizedQuality = prompt.includes('elegant') || prompt.includes('sophisticated') ? 'hd' : 'standard';
    const finalQuality = quality === 'hd' ? 'hd' : optimizedQuality;
    
    console.log(`🎯 Generating with quality: ${finalQuality}`);
    
    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt: prompt,
      n: 1,
      size: size,
      quality: finalQuality,
    });

    const imageUrl = response.data[0]?.url;
    
    if (imageUrl) {
      // Cache successful generation
      if (preferCache) {
        const cacheKey = ImageGenerationCache.generateCacheKey(prompt, 'dall-e-3', finalQuality);
        ImageGenerationCache.set(cacheKey, imageUrl);
      }
      
      console.log('✅ DALL-E image generated and cached successfully');
      return imageUrl;
    } else {
      console.log('⚠️ No image URL returned from DALL-E');
      return null;
    }
  } catch (error) {
    console.error('❌ DALL-E image generation failed:', error);
    
    // Fallback to standard quality if HD fails
    if (options.quality === 'hd') {
      console.log('🔄 Retrying with standard quality...');
      return generateRecipeImageWithDallE(prompt, { ...options, quality: 'standard' });
    }
    
    return null;
  }
}

// Aliases for backward compatibility
export const generateRecipeImageWithImagen3 = generateRecipeImageWithDallE;

// Export cache management for external use
export { ImageGenerationCache };

export function createRecipeImagePrompt(
  title: string, 
  ingredients: string[], 
  mood: string = 'balanced', 
  cuisine: string = 'international',
  options: { optimizeForCost?: boolean } = {}
): string {
  const { optimizeForCost = true } = options;
  
  // Create a focused, DALL-E optimized prompt
  const ingredientList = Array.isArray(ingredients) 
    ? ingredients.slice(0, optimizeForCost ? 3 : 5).join(', ') 
    : 'fresh ingredients';
  
  const moodDescriptors = {
    quick: 'fresh and vibrant',
    balanced: 'beautifully plated and appetizing', 
    ambitious: 'elegant and sophisticated',
    comfort: 'warm and inviting',
    healthy: 'colorful and fresh',
    rustic: 'homestyle and authentic'
  };
  
  const moodDesc = moodDescriptors[mood as keyof typeof moodDescriptors] || 'beautifully presented';
  
  // Optimized prompt structure for better results and cost efficiency
  if (optimizeForCost) {
    return `${moodDesc} ${cuisine} ${title}, ${ingredientList}, professional food photography, natural lighting, appetizing presentation`;
  } else {
    return `A ${moodDesc} ${cuisine} dish: ${title}. Professional food photography featuring ${ingredientList}, natural lighting, restaurant quality presentation, appetizing and delicious looking, clean white background, high resolution, photorealistic.`;
  }
}

// Batch image generation for efficiency
export async function generateRecipeImagesBatch(
  recipes: Array<{ title: string; ingredients: string[]; mood?: string; cuisine?: string }>,
  options: { maxConcurrent?: number; quality?: 'standard' | 'hd' } = {}
): Promise<Array<{ recipeIndex: number; imageUrl: string | null }>> {
  const { maxConcurrent = 3, quality = 'standard' } = options;
  const results: Array<{ recipeIndex: number; imageUrl: string | null }> = [];
  
  console.log(`🎨 Batch generating ${recipes.length} images with max ${maxConcurrent} concurrent...`);
  
  // Process in batches to avoid overwhelming the API
  for (let i = 0; i < recipes.length; i += maxConcurrent) {
    const batch = recipes.slice(i, i + maxConcurrent);
    
    const batchPromises = batch.map(async (recipe, batchIndex) => {
      const actualIndex = i + batchIndex;
      const prompt = createRecipeImagePrompt(recipe.title, recipe.ingredients, recipe.mood, recipe.cuisine);
      const imageUrl = await generateRecipeImageWithDallE(prompt, { quality });
      return { recipeIndex: actualIndex, imageUrl };
    });
    
    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);
    
    // Small delay between batches to be respectful to the API
    if (i + maxConcurrent < recipes.length) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  console.log(`✅ Batch processing complete: ${results.filter(r => r.imageUrl).length}/${recipes.length} successful`);
  return results;
}

// Cost estimation function
export function estimateImageGenerationCost(
  count: number, 
  quality: 'standard' | 'hd' = 'standard'
): number {
  // DALL-E 3 pricing (approximate)
  const standardCost = 0.040; // $0.040 per image
  const hdCost = 0.080; // $0.080 per image
  
  return count * (quality === 'hd' ? hdCost : standardCost);
}