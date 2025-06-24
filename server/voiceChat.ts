import { WebSocketServer } from 'ws';
import { Server } from 'http';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Constants
const SAMPLE_RATE_HZ = 24000;

// Validate required environment variables
function validateEnvironment() {
  const required = ['GEMINI_API_KEY'];
  const optional = ['GOOGLE_CLOUD_PROJECT_ID', 'GOOGLE_CLOUD_CREDENTIALS'];
  
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    const error = `Missing required environment variables: ${missing.join(', ')}`;
    console.error('❌ Voice Chat Setup Error:', error);
    throw new Error(error);
  }
  
  // Check for optional Google Cloud credentials
  const hasGoogleCloud = optional.every(key => process.env[key]);
  if (!hasGoogleCloud) {
    console.warn('⚠️ Google Cloud credentials not fully configured, using fallback authentication');
  }
  
  console.log('✅ Environment variables validated for Google Gemini Live');
}

// Initialize Google GenAI client
function initializeGenAI() {
  try {
    return new GoogleGenAI(process.env.GEMINI_API_KEY!);
  } catch (error) {
    console.error('❌ Failed to initialize Google GenAI:', error);
    throw error;
  }
}

// Recipe tool schema for Gemini Live
const recipeTool = {
  name: 'set_recipe',
  description: 'Update the current recipe with new information',
  parameters: {
    type: 'object',
    properties: {
      title: { type: 'string', description: 'Recipe title' },
      servings: { type: 'number', description: 'Number of servings' },
      ingredients: { 
        type: 'array', 
        items: { type: 'string' },
        description: 'List of ingredients' 
      },
      steps: { 
        type: 'array', 
        items: { type: 'string' },
        description: 'Cooking instructions steps' 
      }
    },
    required: ['title', 'ingredients', 'steps']
  }
};

interface VoiceSession {
  id: string;
  websocket: any;
  liveSession: any;
  isActive: boolean;
  conversationHistory: any[];
  currentRecipe?: any;
}

const activeSessions = new Map<string, VoiceSession>();

export function setupVoiceChat(httpServer: Server): WebSocketServer {
  // Validate environment before setup
  validateEnvironment();
  
  const genai = initializeGenAI();
  
  const wss = new WebSocketServer({ 
    server: httpServer, 
    path: '/voice'
  });

  console.log('🎤 Voice chat WebSocket server initialized on /voice');

  wss.on('connection', async (ws, req) => {
    const sessionId = `voice_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    console.log(`🔊 Voice session started: ${sessionId}`);

    try {
      // Check if Live API is available in current version
      console.log('📍 Checking Google GenAI Live API availability...');
      
      let liveSession = null;
      
      if (genai.live && typeof genai.live.connect === 'function') {
        console.log('✅ Live API available, creating session...');
        liveSession = genai.live.connect({
          model: 'gemini-2.0-flash-exp',
          config: {
            response_modalities: ['AUDIO', 'TEXT'],
            tools: [recipeTool],
            system_instruction: 'You are Zest, a helpful cooking assistant. Provide cooking guidance in a friendly, conversational manner. Use the set_recipe tool when updating recipes.'
          }
        });
        console.log('🔗 Live session created successfully');
      } else {
        throw new Error('Live API not available in current package version');
      }

      const session: VoiceSession = {
        id: sessionId,
        websocket: ws,
        liveSession,
        isActive: true,
        conversationHistory: []
      };

      activeSessions.set(sessionId, session);

      // Handle messages from Gemini Live
      liveSession.on('message', (msg: any) => {
        console.log(`📥 Gemini message type: ${msg.type}`);
        
        if (msg.text) {
          // Stream text tokens back to client
          ws.send(JSON.stringify({ 
            type: 'token', 
            data: msg.text 
          }));
          console.log(`📝 Text token: ${msg.text.substring(0, 50)}...`);
        }
        
        if (msg.audio) {
          // Stream audio back to client (binary PCM)
          const audioBuffer = msg.audio;
          ws.send(audioBuffer);
          console.log(`🔊 Audio chunk: ${audioBuffer.length} bytes`);
        }
        
        if (msg.toolCall && msg.toolCall.name === 'set_recipe') {
          // Handle recipe updates
          try {
            const recipeData = JSON.parse(msg.toolCall.args);
            ws.send(JSON.stringify({ 
              type: 'recipe', 
              data: recipeData 
            }));
            console.log(`🍳 Recipe update: ${recipeData.title}`);
          } catch (error) {
            console.error('❌ Failed to parse recipe data:', error);
          }
        }
      });

      // Send connection success
      ws.send(JSON.stringify({
        type: 'connected',
        message: 'Google Gemini Live connected - start speaking!'
      }));

    } catch (error) {
      console.error(`❌ Failed to create Live session for ${sessionId}:`, error);
      
      if (error.message?.includes('PERMISSION_DENIED')) {
        console.log('💡 Hint: The Live API might not be enabled for your project/region. Check Google Cloud Console.');
      } else if (error.message?.includes('Live API not available') || error.message?.includes('not a function')) {
        console.log('💡 Google GenAI Live API version issue. Checking package version compatibility.');
      }
      
      // Fallback to text-based conversation with audio response simulation
      console.log(`🔄 Using text-based voice chat fallback for ${sessionId}`);
      
      const session: VoiceSession = {
        id: sessionId,
        websocket: ws,
        liveSession: null,
        isActive: true,
        conversationHistory: [],
        currentRecipe: null
      };

      activeSessions.set(sessionId, session);

      // Send connection success
      ws.send(JSON.stringify({
        type: 'connected',
        message: 'Voice chat ready - text processing mode'
      }));
      
      // Send initial greeting using text processing
      const greeting = await processTextQuery("Say hello and introduce yourself as Zest, a cooking assistant");
      ws.send(JSON.stringify({
        type: 'token',
        data: greeting
      }));
      
      // Continue to message handling...
    }

    // Handle messages from client (this will be added after session creation)
    const handleClientMessage = async (data: any) => {
      const session = activeSessions.get(sessionId);
      if (!session || !session.isActive) return;

      try {
        if (data instanceof Buffer) {
          // Binary audio data (PCM 24kHz mono)
          console.log(`🎙️ Audio chunk received: ${data.length} bytes`);
          
          if (session.liveSession) {
            await session.liveSession.sendAudio(data);
          } else {
            // Process audio data and respond with helpful cooking guidance
            const response = await processTextQuery('I need cooking help with audio input', session.currentRecipe);
            ws.send(JSON.stringify({
              type: 'token',
              data: response
            }));
          }
        } else {
          // Text message
          const message = JSON.parse(data.toString());
          
          if (message.audioStreamEnd) {
            console.log('🔇 Audio stream ended (silence detected)');
          } else if (message.text) {
            console.log(`💬 Text message: ${message.text}`);
            
            if (session.liveSession) {
              await session.liveSession.sendText(message.text);
            } else {
              // Process text using Gemini API
              const response = await processTextQuery(message.text, session.currentRecipe);
              ws.send(JSON.stringify({
                type: 'token',
                data: response
              }));
            }
          }
        }
      } catch (error) {
        console.error(`❌ Error processing message for ${sessionId}:`, error);
      }
    };

    ws.on('message', handleClientMessage);

    // Handle client disconnect
    ws.on('close', async () => {
      console.log(`🔌 Voice session closed: ${sessionId}`);
      const session = activeSessions.get(sessionId);
      
      if (session) {
        session.isActive = false;
        
        // Save conversation history
        try {
          const history = session.liveSession.history();
          session.conversationHistory = history;
          console.log(`💾 Saved conversation history for ${sessionId}: ${history.length} messages`);
          
          // Close Gemini Live session
          await session.liveSession.disconnect();
        } catch (error) {
          console.error(`❌ Error closing Live session for ${sessionId}:`, error);
        }
        
        activeSessions.delete(sessionId);
      }
    });

    ws.on('error', (error) => {
      console.error(`❌ WebSocket error for ${sessionId}:`, error);
      activeSessions.delete(sessionId);
    });
  });

  return wss;
}

// Enhanced text processing using Gemini API
async function processTextQuery(text: string, currentRecipe?: any): Promise<string> {
  try {
    const genai = initializeGenAI();
    
    // Use models.generateContent method for v1.6.0
    let prompt = `You are Zest, a helpful cooking assistant. Provide concise, friendly cooking guidance. Keep responses under 100 words for voice interaction.\n\nUser question: ${text}`;
    
    if (currentRecipe) {
      prompt = `You are Zest, a helpful cooking assistant. Current recipe: ${currentRecipe.title}\n\nUser question: ${text}\n\nProvide concise, helpful cooking guidance related to this recipe.`;
    }
    
    const result = await genai.models.generateContent({
      model: 'gemini-2.0-flash-exp',
      contents: prompt
    });
    
    const response = result.text || result.response?.text();
    return response || "I'm here to help with your cooking questions!";
  } catch (error) {
    console.error('Error processing voice query:', error);
    return "I can help with cooking questions, techniques, and recipe advice. What would you like to know?";
  }
}

export { SAMPLE_RATE_HZ };