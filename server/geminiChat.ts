import { GoogleGenerativeAI } from "@google/genai";

if (!process.env.GEMINI_API_KEY) {
  throw new Error("GEMINI_API_KEY is required for Gemini chat functionality");
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Recipe modification function schema for Gemini
const recipeModificationFunction = {
  name: "update_recipe",
  description: "Update the current recipe with modifications requested by the user",
  parameters: {
    type: "object",
    properties: {
      title: { type: "string", description: "Updated recipe title" },
      servings: { type: "number", description: "Number of servings" },
      cookTime: { type: "number", description: "Cooking time in minutes" },
      difficulty: { type: "string", enum: ["Easy", "Medium", "Hard"] },
      ingredients: { 
        type: "array", 
        items: { type: "string" },
        description: "Complete list of ingredients with updated substitutions"
      },
      instructions: { 
        type: "array", 
        items: { type: "string" },
        description: "Complete cooking instructions with modifications"
      }
    },
    required: ["title", "ingredients", "instructions"]
  }
};

export interface GeminiChatOptions {
  currentRecipe?: any;
  conversationHistory?: Array<{role: string, content: string}>;
  openAIContext?: {
    quizData?: any;
    originalPrompt?: string;
    userPreferences?: any;
  };
}

export class GeminiChatService {
  private model: any;
  private chatSession: any;

  constructor() {
    this.model = genAI.getGenerativeModel({ 
      model: "gemini-2.0-flash-exp",
      tools: [{
        functionDeclarations: [recipeModificationFunction]
      }]
    });
  }

  async initializeChat(options: GeminiChatOptions) {
    const { currentRecipe, conversationHistory = [], openAIContext } = options;

    // Build comprehensive context prompt from OpenAI data
    const contextPrompt = this.buildContextPrompt(currentRecipe, openAIContext);
    
    // Convert conversation history to Gemini format
    const geminiHistory = this.convertConversationHistory(conversationHistory);

    // Initialize chat session with context
    this.chatSession = this.model.startChat({
      history: [
        {
          role: "user",
          parts: [{ text: contextPrompt }]
        },
        {
          role: "model", 
          parts: [{ text: "I understand! I'm Zest, your cooking assistant. I have full context of your recipe and preferences from the quiz. I can help modify the recipe, answer cooking questions, and maintain our conversation naturally. What would you like to know or change?" }]
        },
        ...geminiHistory
      ]
    });

    return this.chatSession;
  }

  private buildContextPrompt(currentRecipe: any, openAIContext: any): string {
    return `You are Zest, Flavr's intelligent cooking assistant. You're taking over conversation from OpenAI while maintaining full context.

CURRENT RECIPE CONTEXT:
${currentRecipe ? `Recipe: "${currentRecipe.title}"
Servings: ${currentRecipe.servings}
Cook Time: ${currentRecipe.cookTime} minutes  
Difficulty: ${currentRecipe.difficulty}
Cuisine: ${currentRecipe.cuisine || 'Not specified'}

Ingredients:
${currentRecipe.ingredients?.map((ing: string, i: number) => `${i + 1}. ${ing}`).join('\n') || 'None specified'}

Instructions:
${currentRecipe.instructions?.map((inst: string, i: number) => `${i + 1}. ${inst}`).join('\n') || 'None specified'}

${currentRecipe.tips ? `Tips: ${currentRecipe.tips}` : ''}
` : 'No current recipe loaded.'}

ORIGINAL OPENAI CONTEXT:
${openAIContext?.quizData ? `User Quiz Preferences:
- Mood: ${openAIContext.quizData.mood || 'Not specified'}
- Ambition Level: ${openAIContext.quizData.ambition || 'Not specified'}
- Time Available: ${openAIContext.quizData.time || 'Not specified'} minutes
- Dietary Restrictions: ${openAIContext.quizData.diet?.join(', ') || 'None'}
- Equipment: ${openAIContext.quizData.equipment?.join(', ') || 'Standard kitchen'}
- Budget: ${openAIContext.quizData.budget || 'Not specified'}
- Cuisine Preference: ${openAIContext.quizData.cuisinePreference || 'Any'}
` : ''}

${openAIContext?.originalPrompt ? `Original Generation Prompt: ${openAIContext.originalPrompt}` : ''}

IMPORTANT INSTRUCTIONS:
1. Maintain conversational continuity - reference previous messages naturally
2. When users request recipe modifications, ALWAYS call the update_recipe function with complete updated data
3. Be helpful, friendly, and remember our conversation history
4. Provide cooking guidance, substitution suggestions, and technique explanations
5. Keep responses concise but informative
6. Use the user's quiz preferences to inform suggestions

Ready to continue our cooking conversation with full context maintained!`;
  }

  private convertConversationHistory(history: Array<{role: string, content: string}>) {
    return history.slice(-10).map(msg => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }]
    }));
  }

  async sendMessage(message: string): Promise<{
    response: string;
    functionCall?: any;
  }> {
    if (!this.chatSession) {
      throw new Error("Chat session not initialized. Call initializeChat first.");
    }

    const result = await this.chatSession.sendMessage(message);
    const response = result.response;
    
    // Check for function calls
    const functionCall = response.functionCalls()?.[0];
    
    return {
      response: response.text() || "",
      functionCall: functionCall ? {
        name: functionCall.name,
        args: functionCall.args
      } : null
    };
  }

  async sendMessageStream(message: string, onChunk: (chunk: any) => void): Promise<void> {
    if (!this.chatSession) {
      throw new Error("Chat session not initialized. Call initializeChat first.");
    }

    const result = await this.chatSession.sendMessageStream(message);
    
    for await (const chunk of result.stream) {
      const chunkText = chunk.text();
      const functionCalls = chunk.functionCalls();
      
      if (chunkText) {
        onChunk({ type: 'content', content: chunkText });
      }
      
      if (functionCalls && functionCalls.length > 0) {
        onChunk({ 
          type: 'function_call', 
          functionCall: {
            name: functionCalls[0].name,
            args: functionCalls[0].args
          }
        });
      }
    }
    
    onChunk({ type: 'done' });
  }
}

export const geminiChat = new GeminiChatService();