import { GoogleGenerativeAI } from "@google/generative-ai";

if (!process.env.GEMINI_API_KEY) {
  throw new Error("GEMINI_API_KEY is required for Gemini chat functionality");
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Recipe modification function schema for Gemini
const recipeModificationFunction = {
  name: "updateRecipe",
  description: "Update the current recipe with user's requested modifications. Use this when user confirms changes.",
  parameters: {
    type: "object",
    properties: {
      title: { type: "string", description: "Updated recipe title" },
      servings: { type: "number", description: "Number of servings" },
      cookTime: { type: "number", description: "Cooking time in minutes" },
      difficulty: { type: "string", enum: ["Easy", "Medium", "Hard"] },
      cuisine: { type: "string", description: "Type of cuisine" },
      ingredients: { 
        type: "array", 
        items: { type: "string" },
        description: "Complete updated ingredients list with quantities"
      },
      instructions: { 
        type: "array", 
        items: { type: "string" },
        description: "Complete updated cooking instructions"
      },
      tips: { type: "string", description: "Updated cooking tips" }
    },
    required: ["title", "ingredients", "instructions", "servings", "cookTime"]
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
  private conversationMemory: Array<{role: string, content: string}> = [];

  constructor() {
    this.model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-pro",
      tools: [{
        functionDeclarations: [recipeModificationFunction]
      }]
    });
  }

  async initializeChat(options: GeminiChatOptions) {
    const { currentRecipe, conversationHistory = [], openAIContext } = options;

    // Store conversation memory for continuity
    this.conversationMemory = [...conversationHistory];

    // Build comprehensive context prompt from OpenAI data
    const contextPrompt = this.buildContextPrompt(currentRecipe, openAIContext);
    
    // Convert conversation history to Gemini format
    const geminiHistory = this.convertConversationHistory(conversationHistory);

    console.log('🔧 Gemini Chat Initialization:');
    console.log('- Current Recipe:', currentRecipe?.title || 'None');
    console.log('- Conversation History Length:', conversationHistory.length);
    console.log('- OpenAI Context:', !!openAIContext);

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
    return `You are Zest, Flavr's intelligent cooking assistant. I'm taking over from OpenAI while maintaining full conversational context and memory.

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

CRITICAL FUNCTION CALLING INSTRUCTIONS:
1. When users request recipe modifications, give a brief suggestion (1-2 sentences)
2. Then ask "Update the recipe card?" 
3. ONLY call updateRecipe function when user confirms (says "yes", "update", "do it", "sure", "okay", etc.)
4. Keep modification suggestions concise - don't show full ingredient lists
5. When user confirms, immediately call updateRecipe with complete recipe data
6. Example flow: User: "make it spicier" → You: "I'd add jalapeños and extra cayenne. Update the recipe card?" → User: "yes" → Call updateRecipe immediately

CONVERSATION MEMORY INSTRUCTIONS:
1. Reference previous conversation turns naturally
2. Build upon what users said in earlier messages
3. Acknowledge context from previous exchanges
4. Show conversational continuity

BEHAVIOR:
- Propose recipe modifications clearly before making changes
- Ask for confirmation before calling updateRecipe function
- Provide cooking guidance and explanations naturally
- Use quiz preferences to inform suggestions
- Be conversational and helpful while respecting user control

I'm ready to suggest recipe modifications and update recipes when confirmed!`;
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

    // Add user message to memory
    this.conversationMemory.push({ role: 'user', content: message });

    console.log('🤖 Gemini Processing Message:', message);
    console.log('🧠 Current Memory Length:', this.conversationMemory.length);

    const result = await this.chatSession.sendMessage(message);
    const response = result.response;
    
    // Check for function calls
    const functionCall = response.functionCalls()?.[0];
    const responseText = response.text() || "";

    // Add assistant response to memory
    this.conversationMemory.push({ role: 'assistant', content: responseText });
    
    console.log('✅ Gemini Response Generated:', responseText.substring(0, 100) + '...');
    
    return {
      response: responseText,
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

    console.log('📥 Gemini receiving message:', message);
    console.log('🧠 Current conversation memory length:', this.conversationMemory.length);
    
    // Add user message to conversation memory BEFORE processing
    this.conversationMemory.push({ role: 'user', content: message });

    // Enhanced confirmation detection
    const confirmationWords = ['yes', 'do it', 'go ahead', 'please', 'ok', 'okay', 'sure', 'absolutely', 'definitely', 'update', 'change'];
    const isConfirmation = confirmationWords.some(word => 
      message.toLowerCase().trim() === word || message.toLowerCase().includes(word)
    ) && message.length < 50;

    // Check if previous message asked about updating recipe
    const previousMessage = this.conversationMemory.slice(-2).find(m => m.role === 'model');
    const askedAboutUpdate = previousMessage?.content.toLowerCase().includes('update the recipe card');

    if (isConfirmation && askedAboutUpdate) {
      console.log('🎯 RECIPE UPDATE CONFIRMATION DETECTED - User said:', message);
      console.log('📚 Previous bot message asked about update:', askedAboutUpdate);
      console.log('📝 Forcing function call execution');
    }

    let fullResponse = "";

    try {
      // Force function calling for confirmations
      const contextualMessage = (isConfirmation && askedAboutUpdate) ? 
        `CRITICAL: User confirmed recipe update. You MUST call updateRecipe function immediately with the previously discussed modifications. 

Previous context: ${this.conversationMemory.slice(-3).map(m => `${m.role}: ${m.content}`).join(' | ')}

User confirmation: ${message}

EXECUTE updateRecipe function now with the recipe changes we discussed.` : message;

      const result = await this.chatSession.sendMessageStream(contextualMessage);
      
      for await (const chunk of result.stream) {
        const chunkText = chunk.text();
        const functionCalls = chunk.functionCalls();
        
        if (chunkText) {
          fullResponse += chunkText;
          onChunk({ type: 'content', content: chunkText });
        }
        
        if (functionCalls && functionCalls.length > 0) {
          console.log('🔧 Gemini function call triggered:', functionCalls[0].name, functionCalls[0].args);
          onChunk({ 
            type: 'function_call', 
            functionCall: {
              name: functionCalls[0].name,
              args: functionCalls[0].args
            }
          });
        }
      }
      
      // Add assistant response to conversation memory
      if (fullResponse.trim()) {
        this.conversationMemory.push({ role: 'assistant', content: fullResponse });
        console.log('💾 Added response to memory. Total messages:', this.conversationMemory.length);
      }
      
      onChunk({ type: 'done' });
    } catch (error) {
      console.error('❌ Gemini Streaming Error:', error);
      onChunk({ type: 'error', message: error.message });
    }
  }

  getConversationMemory(): Array<{role: string, content: string}> {
    return [...this.conversationMemory];
  }

  clearMemory(): void {
    this.conversationMemory = [];
  }
}

export const geminiChat = new GeminiChatService();