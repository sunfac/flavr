import OpenAI from "openai";
import { MichelinChefAI } from "./openaiService";

interface ConversationData {
  intent?: 'shopping' | 'ingredients' | 'idea' | 'general';
  cuisine?: string;
  portions?: number;
  equipment?: string[];
  timeAvailable?: string;
  mood?: string;
  ingredients?: string[];
  dietaryRestrictions?: string[];
  skillLevel?: string;
  occasion?: string;
  budget?: string;
  fridgePhoto?: string;
  dishIdea?: string;
  specificDish?: string;
}

interface ConversationResult {
  shouldGenerateRecipe: boolean;
  data: ConversationData;
  response: string;
  suggestions?: string[];
}

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || "" });

export async function processConversationalInput(
  message: string,
  conversationHistory: any[],
  currentData: ConversationData
): Promise<ConversationResult> {
  
  const conversationContext = conversationHistory
    .slice(-5) // Keep last 5 messages for context
    .map(msg => `${msg.type}: ${msg.content}`)
    .join('\n');

  // Analyze what essential information is missing
  const missingEssentials = [];
  if (!currentData.intent && !currentData.specificDish && !currentData.dishIdea) missingEssentials.push('intent/dish');
  if (!currentData.portions) missingEssentials.push('portions');
  if (!currentData.timeAvailable && !currentData.skillLevel) missingEssentials.push('time/complexity');

  const extractionPrompt = `You are a cooking assistant focused on efficiently gathering recipe requirements.

Current conversation:
${conversationContext}

Latest user message: "${message}"

Current data collected:
${JSON.stringify(currentData, null, 2)}

Missing essentials: ${missingEssentials.join(', ')}

EXTRACTION RULES:
- specificDish: Exact dish names like "paella", "carbonara", "beef wellington"
- dishIdea: General dish concepts like "pasta", "salad", "stir-fry"  
- intent: shopping (need shopping list), ingredients (use what I have), idea (specific dish), general (inspiration)
- portions: Number of people or servings (convert text like "couple" to numbers)
- timeAvailable: Time constraints like "30 minutes", "quick meal", "no rush"
- skillLevel: beginner, intermediate, advanced
- cuisine: Specific cuisine preferences
- ingredients: Available ingredients or must-use items
- dietaryRestrictions: Allergies, vegetarian, etc.

RESPONSE STRATEGY:
- Ask ONLY ONE focused question per response
- If missing dish/intent: Ask "What specific dish would you like to make?" with examples
- If missing portions: Ask "How many people are you cooking for?" with number options
- If missing time: Ask "How much time do you have for cooking?" with time ranges
- If have all essentials: Generate recipe immediately
- Keep responses under 20 words when asking questions
- Provide 3-4 specific, actionable suggestions

DECISION LOGIC:
1. No dish identified → Ask for specific dish name
2. Have dish but no portions → Ask for serving count  
3. Have dish + portions but no time → Ask for time available
4. Have dish + portions + time → Generate recipe

JSON Response:
{
  "shouldGenerateRecipe": boolean,
  "data": ConversationData,
  "response": "Direct, focused question targeting the most critical missing info",
  "suggestions": ["Specific actionable options"]
}`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5", // Using GPT-5 for chatbot as requested
      messages: [
        {
          role: "system",
          content: extractionPrompt
        },
        {
          role: "user",
          content: message
        }
      ],
      response_format: { type: "json_object" },
      max_tokens: 500,
      temperature: 0.7
    });

    const result = JSON.parse(response.choices[0]?.message?.content || '{}');
    
    // Merge with current data
    const updatedData = { ...currentData, ...result.data };
    
    return {
      shouldGenerateRecipe: result.shouldGenerateRecipe,
      data: updatedData,
      response: result.response,
      suggestions: result.suggestions
    };

  } catch (error) {
    console.error("Conversation processing error:", error);
    
    // Fallback response
    return {
      shouldGenerateRecipe: false,
      data: currentData,
      response: "I'm here to help you create the perfect recipe! What are you in the mood to cook today?",
      suggestions: [
        "Something quick and easy",
        "A special occasion dish",
        "Use ingredients I have",
        "Surprise me!"
      ]
    };
  }
}

export async function generateRecipeFromConversation(data: ConversationData): Promise<any> {
  // Build prompt based on conversational data similar to existing quiz structure
  const intentMapping = {
    shopping: "Shopping Mode",
    ingredients: "Fridge Mode", 
    idea: "Chef Assist Mode",
    general: "Shopping Mode"
  };

  const mode = intentMapping[data.intent || 'general'];
  
  // Create prompt incorporating conversational data
  const conversationalPrompt = buildConversationalPrompt(data);
  
  // Use existing recipe generation logic with conversational data
  const recipe = await generateRecipeWithPrompt(conversationalPrompt, mode, data);
  
  return recipe;
}

function buildConversationalPrompt(data: ConversationData): string {
  let prompt = "Based on our conversation, create a recipe with these requirements:\n\n";
  
  // Prioritize specific dish requests
  if (data.specificDish) {
    prompt += `SPECIFIC DISH REQUESTED: ${data.specificDish}\n`;
    prompt += `IMPORTANT: Create a recipe specifically for "${data.specificDish}". This is the exact dish the user wants.\n\n`;
  }
  if (data.dishIdea) {
    prompt += `Dish idea: ${data.dishIdea}\n`;
  }
  
  if (data.intent) prompt += `Context: ${data.intent}\n`;
  if (data.cuisine) prompt += `Cuisine: ${data.cuisine}\n`;
  if (data.portions) prompt += `Servings: ${data.portions}\n`;
  if (data.timeAvailable) prompt += `Time available: ${data.timeAvailable}\n`;
  if (data.mood) prompt += `Dish mood/style: ${data.mood}\n`;
  if (data.occasion) prompt += `Occasion: ${data.occasion}\n`;
  if (data.skillLevel) prompt += `Skill level: ${data.skillLevel}\n`;
  if (data.equipment) {
    const equipmentText = Array.isArray(data.equipment) 
      ? data.equipment.join(', ')
      : String(data.equipment);
    prompt += `Equipment: ${equipmentText}\n`;
  }
  if (data.ingredients) {
    const ingredientsText = Array.isArray(data.ingredients) 
      ? data.ingredients.join(', ')
      : String(data.ingredients);
    prompt += `Available ingredients: ${ingredientsText}\n`;
  }
  if (data.dietaryRestrictions) {
    const dietaryText = Array.isArray(data.dietaryRestrictions) 
      ? data.dietaryRestrictions.join(', ')
      : String(data.dietaryRestrictions);
    prompt += `Dietary restrictions: ${dietaryText}\n`;
  }
  if (data.budget) prompt += `Budget consideration: ${data.budget}\n`;

  if (data.specificDish) {
    prompt += `\nCreate a complete, authentic recipe for "${data.specificDish}" that matches these conversational preferences.`;
  } else {
    prompt += "\nCreate a complete recipe that matches these conversational preferences.";
  }
  
  return prompt;
}

async function generateRecipeWithPrompt(prompt: string, mode: string, data: ConversationData): Promise<any> {
  // This would integrate with existing recipe generation logic
  // For now, return a structured recipe format
  
  try {
    // Use GPT-5 with MichelinChefAI for conversational recipe generation
    const recipe = await MichelinChefAI.generateFullRecipe(
      data.specificDish || "Custom conversational recipe",
      {
        servings: data.portions || 4,
        cookingTime: data.timeAvailable ? parseInt(data.timeAvailable) : 60,
        equipment: data.equipment || [],
        dietary: data.dietaryRestrictions || [],
        budget: data.budget || "moderate"
      },
      "Conversational Mode"
    );
    
    // Add metadata from conversation
    recipe.mode = mode;
    recipe.conversationalData = data;
    // Remove manual ID assignment - let database auto-generate
    recipe.createdAt = new Date().toISOString();
    
    return recipe;
    
  } catch (error) {
    console.error("Recipe generation error:", error);
    throw new Error("Failed to generate recipe from conversation");
  }
}

// User interaction logging for B2B data collection
export async function logUserInteractionData(userId: string, interactionData: any): Promise<void> {
  try {
    // Import storage for database operations
    const { storage } = await import('./storage');
    
    // Determine if this is a numeric userId or pseudoUserId
    const isNumericUserId = !isNaN(Number(userId));
    
    // Log structured user interaction data for B2B insights
    const interactionLogData = {
      userId: isNumericUserId ? Number(userId) : null,
      pseudoUserId: !isNumericUserId ? userId : null,
      sessionId: interactionData.sessionId || `conv_${Date.now()}`,
      interactionType: interactionData.interactionType || 'conversational_recipe',
      page: interactionData.page || 'chat_mode',
      component: interactionData.component || 'conversational_processor',
      action: interactionData.action || 'recipe_generation',
      data: {
        ...interactionData,
        // B2B valuable data points
        customerProfile: interactionData.customerProfile || {
          cookingIntent: interactionData.intent,
          cuisinePreferences: interactionData.cuisine,
          typicalPortions: interactionData.portions,
          timeConstraints: interactionData.timeAvailable,
          shoppingBehavior: interactionData.intent === 'shopping' ? 'recipe-driven' : 'ingredient-driven',
          equipmentLevel: interactionData.equipment,
          skillLevel: interactionData.skillLevel,
          dietaryNeeds: interactionData.dietaryRestrictions,
          occasionCooking: interactionData.occasion,
          budgetConsciousness: interactionData.budget
        }
      },
      userAgent: interactionData.userAgent || null,
      ipAddress: interactionData.ipAddress || null,
      browserFingerprint: interactionData.browserFingerprint || null
    };

    // Save to database using new interaction logs system
    await storage.createInteractionLog(interactionLogData);
    
    console.log('User interaction logged to database:', {
      userId: interactionLogData.userId,
      pseudoUserId: interactionLogData.pseudoUserId,
      type: interactionLogData.interactionType,
      action: interactionLogData.action
    });
    
  } catch (error) {
    console.error("Failed to log user interaction data:", error);
  }
}