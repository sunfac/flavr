import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage } from 'http';
import { GoogleGenAI } from '@google/genai';

interface SimpleVoiceSession {
  id: string;
  websocket: WebSocket;
  isActive: boolean;
}

const activeSessions = new Map<string, SimpleVoiceSession>();

export function setupSimpleVoiceChat(server: any) {
  const wss = new WebSocketServer({ 
    server,
    path: '/ws/simple-voice',
    perMessageDeflate: false,
    maxPayload: 1024 * 1024
  });

  console.log('🎤 Simple voice chat WebSocket server initialized on /ws/simple-voice');

  wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
    const sessionId = `voice_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    console.log(`🔊 Simple voice session started: ${sessionId}`);

    const session: SimpleVoiceSession = {
      id: sessionId,
      websocket: ws,
      isActive: true
    };

    activeSessions.set(sessionId, session);

    // Send connection confirmation
    ws.send(JSON.stringify({
      type: 'connected',
      message: 'Voice chat ready'
    }));

    // Send ready status
    ws.send(JSON.stringify({
      type: 'ready',
      message: 'Ready for cooking questions'
    }));

    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString());
        console.log(`📥 Received message type: ${message.type}`);
        
        if (message.type === 'text' && message.text) {
          try {
            const response = await processVoiceQuestion(message.text);
            ws.send(JSON.stringify({
              type: 'token',
              data: response
            }));
          } catch (error) {
            console.error('Error processing question:', error);
            ws.send(JSON.stringify({
              type: 'token',
              data: "I'm here to help with cooking questions. What would you like to know?"
            }));
          }
        }
      } catch (error) {
        console.error('Message parsing error:', error);
      }
    });

    ws.on('close', () => {
      console.log(`🔇 Simple voice session ended: ${sessionId}`);
      activeSessions.delete(sessionId);
    });

    ws.on('error', (error) => {
      console.error(`❌ WebSocket error for session ${sessionId}:`, error.message);
    });
  });

  return wss;
}

async function processVoiceQuestion(text: string): Promise<string> {
  try {
    const genai = new GoogleGenAI({
      vertexAi: {
        project: process.env.GOOGLE_CLOUD_PROJECT_ID,
        location: process.env.GCP_LOCATION || "us-central1"
      }
    });
    
    const result = await genai.models.generateContent({
      model: 'gemini-2.0-flash-exp',
      contents: `You are Zest, a helpful cooking assistant. Provide concise, friendly cooking guidance. Keep responses under 100 words for voice interaction.\n\nUser: ${text}`
    });
    
    return result.text || "I'm here to help with cooking questions!";
  } catch (error) {
    console.error('Gemini API error:', error);
    return "I can help with cooking questions, techniques, and recipe advice. What would you like to know?";
  }
}