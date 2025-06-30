import OpenAI from "openai";

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

  const extractionPrompt = `You are a cooking assistant having a conversation with a user to gather recipe requirements.

Current conversation:
${conversationContext}

Latest user message: "${message}"

Current data collected:
${JSON.stringify(currentData, null, 2)}

Your task:
1. Extract any new information from the user's message that helps define their recipe needs
2. Pay special attention to specific dish names mentioned (like "paella", "carbonara", "risotto", etc.) and capture them in the "specificDish" field
3. Determine if you have enough information to generate a recipe
3. Provide an appropriate response to continue the conversation or generate the recipe

Required information for recipe generation:
- Intent (shopping/ingredients/idea/general)
- Basic dish type or cuisine preference  
- Number of portions
- Available time or complexity preference
- Mood/style of dish

Extract information about:
- intent: shopping, ingredients, idea, or general inspiration
- cuisine: any cuisine preferences mentioned
- portions: number of servings needed
- equipment: cooking equipment available/preferred
- timeAvailable: how much time they have
- mood: the feeling/style of dish (e.g., "vibrant summer salad", "comfort food")
- ingredients: specific ingredients they have or want to use
- dietaryRestrictions: any dietary needs
- skillLevel: beginner, intermediate, advanced
- occasion: what this is for (dinner party, quick lunch, etc.)
- budget: any budget considerations

Respond with JSON:
{
  "shouldGenerateRecipe": boolean,
  "data": ConversationData,
  "response": "Your conversational response",
  "suggestions": ["suggestion1", "suggestion2", "suggestion3"]
}

Guidelines:
- Be natural and conversational
- Ask follow-up questions to gather missing essential information
- Don't overwhelm with too many questions at once
- Focus on understanding their cooking context and preferences
- When you have enough core information (intent, basic dish idea, portions, time/complexity), suggest generating the recipe
- Make suggestions relevant to their current context`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
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
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system",
          content: "You are an expert chef. Generate detailed recipes in JSON format based on user requirements."
        },
        {
          role: "user",
          content: `${prompt}

Create a detailed recipe following this exact JSON structure:
{
  "title": "string",
  "description": "string", 
  "cuisine": "string",
  "servings": number,
  "cookTime": "string",
  "difficulty": "string",
  "ingredients": ["array of strings"],
  "instructions": ["array of strings"],
  "tips": ["array of strings"],
  "nutritionHighlights": ["array of strings"]
}

Make sure all fields are properly filled out with practical, actionable content.`
        }
      ],
      response_format: { type: "json_object" },
      max_tokens: 2000,
      temperature: 0.7
    });

    const recipe = JSON.parse(response.choices[0]?.message?.content || '{}');
    
    // Add metadata from conversation
    recipe.mode = mode;
    recipe.conversationalData = data;
    recipe.id = Date.now().toString();
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
    // Log structured user interaction data for B2B insights
    const logEntry = {
      userId,
      timestamp: new Date(),
      interactionType: 'conversational_recipe',
      data: interactionData,
      // B2B valuable data points
      customerProfile: {
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
    };

    console.log('B2B User Interaction Data:', JSON.stringify(logEntry, null, 2));
    
    // In production, this would save to a dedicated analytics database
    // For now, we'll use the existing developer logs structure
    
  } catch (error) {
    console.error("Failed to log user interaction data:", error);
  }
}