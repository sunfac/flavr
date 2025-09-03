import OpenAI from 'openai';
import { aiCostTracker } from './aiCostTracker';

const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY 
});

export async function generateRecipeImageWithDallE(prompt: string): Promise<string | null> {
  try {
    console.log('🎨 Generating recipe image with DALL-E...');
    
    if (!process.env.OPENAI_API_KEY) {
      console.log('⚠️ OPENAI_API_KEY not set, skipping image generation');
      return null;
    }

    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt: prompt,
      n: 1,
      size: "1024x1024",
      quality: "standard",
    });

    const imageUrl = response.data[0]?.url;
    
    if (imageUrl) {
      console.log('✅ DALL-E image generated successfully');
      return imageUrl;
    } else {
      console.log('⚠️ No image URL returned from DALL-E');
      return null;
    }
  } catch (error) {
    console.error('❌ DALL-E image generation failed:', error);
    return null;
  }
}

// Alias for backward compatibility
export const generateRecipeImageWithImagen3 = generateRecipeImageWithDallE;

export function createRecipeImagePrompt(
  title: string, 
  ingredients: string[], 
  mood: string = 'balanced', 
  cuisine: string = 'international'
): string {
  // Create a focused, DALL-E optimized prompt
  const ingredientList = Array.isArray(ingredients) 
    ? ingredients.slice(0, 5).join(', ') 
    : 'fresh ingredients';
  
  const moodDescriptors = {
    quick: 'fresh and vibrant',
    balanced: 'beautifully plated and appetizing', 
    ambitious: 'elegant and sophisticated'
  };
  
  const moodDesc = moodDescriptors[mood as keyof typeof moodDescriptors] || 'beautifully presented';
  
  return `A ${moodDesc} ${cuisine} dish: ${title}. Professional food photography, ${ingredientList}, natural lighting, restaurant quality presentation, appetizing and delicious looking, clean white background, high resolution, photorealistic.`;
}