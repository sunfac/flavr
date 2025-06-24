import WebSocket from 'ws';

interface GoogleLiveApiConfig {
  apiKey: string;
  model: string;
  systemInstruction?: string;
}

export class GoogleLiveApiClient {
  private websocket: WebSocket | null = null;
  private config: GoogleLiveApiConfig;
  private isConnected = false;

  constructor(config: GoogleLiveApiConfig) {
    this.config = config;
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Google's Live API WebSocket endpoint (replace with actual endpoint when available)
        const wsUrl = `wss://generativelanguage.googleapis.com/ws/v1beta/models/${this.config.model}:streamGenerateContent?key=${this.config.apiKey}`;
        
        this.websocket = new WebSocket(wsUrl);

        this.websocket.on('open', () => {
          console.log('Connected to Google Live API');
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
}