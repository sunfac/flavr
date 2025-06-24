import WebSocket from 'ws';

interface GoogleLiveApiConfig {
  apiKey: string;
  model: string;
  projectId: string;
  location?: string;
  systemInstruction?: string;
}

export class GoogleLiveApiClient {
  private websocket: WebSocket | null = null;
  private config: GoogleLiveApiConfig;
  private isConnected = false;

  constructor(config: GoogleLiveApiConfig) {
    this.config = {
      location: 'us-central1',
      ...config
    };
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Google Vertex AI endpoint for Gemini Live API based on documentation
        const wsUrl = `wss://${this.config.location}-aiplatform.googleapis.com/ws/google.cloud.aiplatform.v1beta1.PredictionService/StreamingPredict`;
        
        // Add proper headers for Google Cloud authentication
        const headers = {
          'Authorization': `Bearer ${this.getAccessToken()}`,
          'Content-Type': 'application/json'
        };

        this.websocket = new WebSocket(wsUrl, { headers });

        this.websocket.on('open', () => {
          console.log('🔗 Connected to Google Vertex AI Live API');
          this.isConnected = true;
          
          // Send initial setup message
          this.sendSetupMessage();
          resolve();
        });

        this.websocket.on('error', (error) => {
          console.error('Google Live API connection error:', error);
          this.isConnected = false;
          reject(error);
        });

        this.websocket.on('close', () => {
          console.log('Disconnected from Google Live API');
          this.isConnected = false;
        });

      } catch (error) {
        reject(error);
      }
    });
  }

  private sendSetupMessage(): void {
    if (!this.websocket || !this.isConnected) return;

    const setupMessage = {
      setup: {
        model: `models/${this.config.model}`,
        generationConfig: {
          responseModalities: ["AUDIO", "TEXT"],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: "Puck" // Natural conversational voice
              }
            }
          }
        },
        systemInstruction: {
          parts: [{ text: this.config.systemInstruction || "You are a helpful assistant." }]
        }
      }
    };

    this.websocket.send(JSON.stringify(setupMessage));
  }

  sendAudio(audioData: Buffer): void {
    if (!this.websocket || !this.isConnected) return;

    const audioMessage = {
      realtimeInput: {
        mediaChunks: [
          {
            mimeType: "audio/pcm",
            data: audioData.toString('base64')
          }
        ]
      }
    };

    this.websocket.send(JSON.stringify(audioMessage));
  }

  sendText(text: string): void {
    if (!this.websocket || !this.isConnected) return;

    const textMessage = {
      clientContent: {
        turns: [
          {
            role: "user",
            parts: [{ text }]
          }
        ],
        turnComplete: true
      }
    };

    this.websocket.send(JSON.stringify(textMessage));
  }

  onMessage(callback: (data: any) => void): void {
    if (!this.websocket) return;

    this.websocket.on('message', (data) => {
      try {
        const parsed = JSON.parse(data.toString());
        callback(parsed);
      } catch (error) {
        console.error('Error parsing Google Live API response:', error);
      }
    });
  }

  disconnect(): void {
    if (this.websocket) {
      this.websocket.close();
      this.websocket = null;
      this.isConnected = false;
    }
  }

  isConnectionActive(): boolean {
    return this.isConnected && this.websocket?.readyState === WebSocket.OPEN;
  }

  private getAccessToken(): string {
    // For now, use API key authentication as fallback
    // TODO: Implement proper OAuth2 token generation from service account
    return this.config.apiKey;
  }
}