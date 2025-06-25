import { GoogleAuth } from 'google-auth-library';

interface ImageGenerationRequest {
  instances: Array<{
    prompt: string;
  }>;
  parameters: {
    sampleCount: number;
    aspectRatio: string;
    safetyFilterLevel: string;
    personGeneration: string;
  };
}

interface ImageGenerationResponse {
  predictions: Array<{
    bytesBase64Encoded: string;
    mimeType: string;
  }>;
}

export async function generateRecipeImageWithImagen3(prompt: string): Promise<string | null> {
  try {
    // Initialize Google Auth with service account credentials
    const auth = new GoogleAuth({
      credentials: JSON.parse(process.env.GOOGLE_CLOUD_CREDENTIALS || '{}'),
      scopes: ['https://www.googleapis.com/auth/cloud-platform'],
    });

    const authClient = await auth.getClient();
    const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;

    if (!projectId) {
      throw new Error('GOOGLE_CLOUD_PROJECT_ID not configured');
    }

    // Imagen 3 API endpoint
    const endpoint = `https://us-central1-aiplatform.googleapis.com/v1/projects/${projectId}/locations/us-central1/publishers/google/models/imagen-3.0-generate-001:predict`;

    const requestBody: ImageGenerationRequest = {
      instances: [
        {
          prompt: prompt
        }
      ],
      parameters: {
        sampleCount: 1,
        aspectRatio: "1:1",
        safetyFilterLevel: "block_some",
        personGeneration: "dont_allow"
      }
    };

    // Get access token
    const accessToken = await authClient.getAccessToken();
    
    if (!accessToken.token) {
      throw new Error('Failed to get access token');
    }

    // Make request to Imagen 3 API
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Imagen 3 API error:', response.status, errorText);
      return null;
    }

    const data: ImageGenerationResponse = await response.json();

    if (data.predictions && data.predictions.length > 0) {
      const imageData = data.predictions[0];
      
      // Convert base64 to data URL
      const imageUrl = `data:${imageData.mimeType};base64,${imageData.bytesBase64Encoded}`;
      
      console.log('✅ Generated recipe image with Imagen 3');
      return imageUrl;
    }

    return null;
  } catch (error) {
    console.error('Error generating image with Imagen 3:', error);
    return null;
  }
}

export function createRecipeImagePrompt(
  recipeTitle: string, 
  ingredients: string[], 
  mood: string, 
  platingNotes?: string
): string {
  // Extract main ingredients (first 3-4 key ingredients)
  const mainIngredients = ingredients.slice(0, 4).map(ing => 
    ing.replace(/^\d+.*?\s/, '').replace(/,.*$/, '').trim()
  );
  
  return `High-resolution photo of a plated dish titled "${recipeTitle}". 
Prepared with ingredients like: ${mainIngredients.join(", ")}.
Styled to match the mood: ${mood || "elevated home comfort"}.
Plated on a neutral background, natural lighting, with light shadows.
No labels, no text, no hands, no brand packaging.
Styled like an editorial cookbook photo or a Waitrose magazine.
${platingNotes ? `Plating style: ${platingNotes}.` : ""}
Use subtle depth of field. Slight steam if dish is hot. Avoid unrealistic glows or artificial textures.`;
}