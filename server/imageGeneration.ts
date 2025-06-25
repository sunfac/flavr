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
    console.log('🔧 Initializing Google Auth for Imagen 3...');
    
    // Check environment variables
    if (!process.env.GOOGLE_CLOUD_CREDENTIALS) {
      throw new Error('GOOGLE_CLOUD_CREDENTIALS environment variable not set');
    }
    
    if (!process.env.GOOGLE_CLOUD_PROJECT_ID) {
      throw new Error('GOOGLE_CLOUD_PROJECT_ID environment variable not set');
    }

    // Parse credentials safely
    let credentials;
    try {
      credentials = JSON.parse(process.env.GOOGLE_CLOUD_CREDENTIALS);
    } catch (parseError) {
      console.error('Failed to parse GOOGLE_CLOUD_CREDENTIALS:', parseError);
      throw new Error('Invalid GOOGLE_CLOUD_CREDENTIALS format');
    }

    // Initialize Google Auth with service account credentials
    const auth = new GoogleAuth({
      credentials: credentials,
      scopes: ['https://www.googleapis.com/auth/cloud-platform'],
    });

    const authClient = await auth.getClient();
    const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;

    console.log('🔧 Getting access token...');
    const accessToken = await authClient.getAccessToken();
    
    if (!accessToken.token) {
      throw new Error('Failed to get access token');
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

    console.log('🔧 Making request to Imagen 3 API...');
    console.log('Endpoint:', endpoint);
    console.log('Request body:', JSON.stringify(requestBody, null, 2));

    // Make request to Imagen 3 API
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    console.log('🔧 Response status:', response.status);
    console.log('🔧 Response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Imagen 3 API error response:', errorText);
      throw new Error(`Imagen 3 API error: ${response.status} - ${errorText}`);
    }

    const responseText = await response.text();
    console.log('🔧 Raw response text:', responseText.substring(0, 500) + '...');

    let data: ImageGenerationResponse;
    try {
      data = JSON.parse(responseText);
    } catch (jsonError) {
      console.error('Failed to parse Imagen 3 response as JSON:', jsonError);
      console.error('Response text that failed to parse:', responseText);
      throw new Error('Invalid JSON response from Imagen 3 API');
    }

    console.log('🔧 Parsed response:', JSON.stringify(data, null, 2));

    if (data.predictions && data.predictions.length > 0) {
      const imageData = data.predictions[0];
      
      if (!imageData.bytesBase64Encoded) {
        console.error('No bytesBase64Encoded in response:', imageData);
        throw new Error('Missing image data in Imagen 3 response');
      }
      
      // Convert base64 to data URL
      const imageUrl = `data:${imageData.mimeType || 'image/png'};base64,${imageData.bytesBase64Encoded}`;
      
      console.log('✅ Generated recipe image with Imagen 3');
      return imageUrl;
    }

    console.error('No predictions in Imagen 3 response:', data);
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