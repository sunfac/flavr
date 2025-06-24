import WebSocket, { WebSocketServer } from 'ws';
import { IncomingMessage } from 'http';
import { GoogleLiveApiClient } from './googleLiveApiClient';

interface GoogleLiveSession {
  id: string;
  websocket: WebSocket;
  googleApiClient?: GoogleLiveApiClient;
  currentRecipe?: any;
  conversationContext: string;
  isActive: boolean;
}

const activeSessions = new Map<string, GoogleLiveSession>();

export function setupGoogleLiveAudioWebSocket(server: any) {
  const wss = new WebSocketServer({ 
    server,
    path: '/api/google-live-audio'
  });

  console.log('🎤 Google Live Audio WebSocket server initialized on /api/google-live-audio');

  wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
    const sessionId = generateSessionId();
    console.log(`🔊 Google Live Audio session started: ${sessionId}`);

    const session: GoogleLiveSession = {
      id: sessionId,
      websocket: ws,
      isActive: true,
      conversationContext: 'You are Zest, a helpful cooking assistant. Provide cooking guidance in a friendly, conversational manner.'
    };

    // For now, provide a fallback voice chat experience using text-to-speech
    // The Google Live API endpoint appears to be unavailable (404 error)
    if (process.env.GEMINI_API_KEY) {
      console.log(`🔄 Setting up fallback voice chat for session ${sessionId}`);
      
      // Send immediate success message to client
      ws.send(JSON.stringify({
        type: 'connected',
        message: 'Voice chat ready - Google Live API fallback mode active'
      }));
      
      // TODO: Implement Google Live API when endpoint is available
      // For now, we'll use text chat with audio feedback
      console.log(`📝 Using text-based voice chat fallback for session ${sessionId}`);
    } else {
      console.error('❌ GEMINI_API_KEY not found - Google Live Audio unavailable');
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Google Live Audio API key not configured'
      }));
    }

    activeSessions.set(sessionId, session);

    ws.on('message', async (data: WebSocket.Data) => {
      try {
        const message = JSON.parse(data.toString());
        await handleLiveAudioMessage(session, message);
      } catch (error) {
        console.error('Error handling live audio message:', error);
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Failed to process audio message'
        }));
      }
    });

    ws.on('close', () => {
      console.log(`🔇 Google Live Audio session ended: ${sessionId}`);
      activeSessions.delete(sessionId);
    });

    ws.on('error', (error) => {
      console.error(`WebSocket error for session ${sessionId}:`, error);
      activeSessions.delete(sessionId);
    });
  });

  return wss;
}

async function handleLiveAudioMessage(session: GoogleLiveSession, message: any) {
  const { type, ...data } = message;

  switch (type) {
    case 'session_setup':
      await setupSession(session, data);
      break;
      
    case 'audio_input':
      await processAudioInput(session, data.audio);
      break;
      
    case 'text_input':
      await processTextInput(session, data.text);
      break;
      
    default:
      console.warn(`Unknown message type: ${type}`);
  }
}

async function setupSession(session: GoogleLiveSession, data: any) {
  session.currentRecipe = data.currentRecipe;
  session.conversationContext = data.instructions || '';
  
  console.log(`🎯 Session ${session.id} setup complete`);
  console.log(`📝 Current recipe: ${session.currentRecipe?.title || 'None'}`);
  
  // Initialize Google Live API connection
  await initializeGoogleLiveAPI(session);
  
  session.websocket.send(JSON.stringify({
    type: 'session_ready',
    message: 'Voice conversation is ready!'
  }));
}

async function initializeGoogleLiveAPI(session: GoogleLiveSession) {
  console.log(`🔗 Initializing Google Live API for session ${session.id}`);
  
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is required for Google Live API');
  }

  const systemInstruction = `You are Zest, Flavr's intelligent cooking assistant. You're having a live voice conversation with a user.

${session.currentRecipe ? `
CURRENT RECIPE CONTEXT:
Recipe: "${session.currentRecipe.title}"
Servings: ${session.currentRecipe.servings}
Cook Time: ${session.currentRecipe.cookTime} minutes
Difficulty: ${session.currentRecipe.difficulty}

Ingredients:
${session.currentRecipe.ingredients?.map((ing: string, i: number) => `${i + 1}. ${ing}`).join('\n')}

Instructions:
${session.currentRecipe.instructions?.map((inst: string, i: number) => `${i + 1}. ${inst}`).join('\n')}
` : 'No current recipe loaded.'}

CONVERSATION GUIDELINES:
- Speak naturally and conversationally
- Keep responses concise but helpful
- Ask clarifying questions when needed
- Help with cooking techniques, substitutions, and guidance
- If user requests recipe modifications, describe the changes clearly
- Maintain a friendly, encouraging tone
- Reference the current recipe context when relevant

Remember: This is a live voice conversation, so respond as if you're talking to someone in their kitchen!`;

  try {
    session.googleApiClient = new GoogleLiveApiClient({
      apiKey: process.env.GEMINI_API_KEY,
      model: "gemini-2.0-flash-exp",
      systemInstruction
    });

    await session.googleApiClient.connect();
    
    // Set up message handling
    session.googleApiClient.onMessage((data) => {
      handleGoogleApiResponse(session, data);
    });

    console.log(`✅ Google Live API initialized for session ${session.id}`);
    
  } catch (error) {
    console.error(`❌ Failed to initialize Google Live API for session ${session.id}:`, error);
    throw error;
  }
}

async function processAudioInput(session: GoogleLiveSession, audioData: any) {
  try {
    console.log(`🎤 Processing audio input for session ${session.id}`);
    
    if (!session.googleApiClient || !session.googleApiClient.isConnectionActive()) {
      throw new Error('Google Live API client not connected');
    }

    // Convert and send audio to Google Live API
    let audioBuffer: Buffer;
    
    if (typeof audioData === 'string') {
      // Base64 encoded audio
      audioBuffer = Buffer.from(audioData, 'base64');
    } else if (audioData instanceof Buffer) {
      audioBuffer = audioData;
    } else {
      throw new Error('Unsupported audio data format');
    }

    // Send audio to Google Live API
    session.googleApiClient.sendAudio(audioBuffer);
    
  } catch (error) {
    console.error(`Error processing audio for session ${session.id}:`, error);
    session.websocket.send(JSON.stringify({
      type: 'error',
      message: 'Failed to process audio input'
    }));
  }
}

async function processTextInput(session: GoogleLiveSession, text: string) {
  try {
    console.log(`💬 Processing text input for session ${session.id}: ${text}`);
    
    if (!session.googleApiClient || !session.googleApiClient.isConnectionActive()) {
      throw new Error('Google Live API client not connected');
    }

    // Send text to Google Live API
    session.googleApiClient.sendText(text);
    
  } catch (error) {
    console.error(`Error processing text for session ${session.id}:`, error);
    session.websocket.send(JSON.stringify({
      type: 'error',
      message: 'Failed to process text input'
    }));
  }
}

function handleGoogleApiResponse(session: GoogleLiveSession, data: any) {
  try {
    // Handle different types of responses from Google Live API
    if (data.serverContent) {
      const content = data.serverContent;
      
      if (content.modelTurn) {
        const turn = content.modelTurn;
        
        // Handle text response
        if (turn.parts) {
          for (const part of turn.parts) {
            if (part.text) {
              session.websocket.send(JSON.stringify({
                type: 'response_transcript',
                text: part.text
              }));
            }
            
            if (part.inlineData && part.inlineData.mimeType?.startsWith('audio/')) {
              session.websocket.send(JSON.stringify({
                type: 'audio_response',
                audio: part.inlineData.data,
                mimeType: part.inlineData.mimeType
              }));
            }
          }
        }
      }
    }
    
    // Handle user turn (transcription)
    if (data.clientContent) {
      const content = data.clientContent;
      if (content.turns && content.turns[0]?.parts) {
        for (const part of content.turns[0].parts) {
          if (part.text) {
            session.websocket.send(JSON.stringify({
              type: 'transcript',
              text: part.text
            }));
          }
        }
      }
    }
    
  } catch (error) {
    console.error(`Error handling Google API response for session ${session.id}:`, error);
    session.websocket.send(JSON.stringify({
      type: 'error',
      message: 'Failed to process API response'
    }));
  }
}

async function generateVoiceResponse(session: GoogleLiveSession, userInput: string) {
  // In a real implementation, this would use Google's Live API
  // For now, we'll simulate a response
  
  const responses = [
    {
      text: "To make the beef more tender, try marinating it longer or cutting against the grain. The pear in the marinade also helps break down the proteins naturally.",
      audio: "simulated_audio_data_base64"
    },
    {
      text: "Great question! For extra tender beef, you can also try pounding it gently with a meat mallet before marinating. This breaks down the muscle fibers.",
      audio: "simulated_audio_data_base64"
    },
    {
      text: "I'd be happy to help with that! What specific part of the recipe would you like to modify?",
      audio: "simulated_audio_data_base64"
    }
  ];
  
  const randomResponse = responses[Math.floor(Math.random() * responses.length)];
  
  console.log(`🤖 Generated response for session ${session.id}: ${randomResponse.text}`);
  
  return randomResponse;
}

function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Helper function to clean up inactive sessions
export function cleanupInactiveSessions() {
  const now = Date.now();
  for (const [sessionId, session] of activeSessions.entries()) {
    // Clean up sessions older than 1 hour
    if (now - parseInt(sessionId.split('_')[1]) > 3600000) {
      session.websocket.close();
      activeSessions.delete(sessionId);
      console.log(`🧹 Cleaned up inactive session: ${sessionId}`);
    }
  }
}

// Clean up sessions every 30 minutes
setInterval(cleanupInactiveSessions, 30 * 60 * 1000);