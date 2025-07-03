import { GoogleAuth } from 'google-auth-library';
import WebSocket from 'ws';

interface GoogleLiveApiClientConfig {
  apiKey?: string;
  model: string;
  systemInstruction?: string;
}

export class GoogleLiveApiClient {
  private config: GoogleLiveApiClientConfig;
  private auth: GoogleAuth | null = null;
  private websocket: WebSocket | null = null;
  private accessToken: string | null = null;
  private messageHandlers: Array<(data: any) => void> = [];
  private isConnected = false;

  constructor(config: GoogleLiveApiClientConfig) {
    this.config = config;
  }

  /**
   * Generates an OAuth2 access token using service account credentials from environment variables.
   * Falls back to API key if service account credentials are not available.
   */
  private async getAccessToken(): Promise<string> {
    // Try OAuth2 service account authentication first
    if (this.canUseServiceAccount()) {
      try {
        return await this.getServiceAccountToken();
      } catch (error) {
        console.warn('Failed to get service account token, falling back to API key:', error);
      }
    }

    // Fallback to API key authentication
    if (this.config.apiKey) {
      console.log('Using API key authentication');
      return this.config.apiKey;
    }

    throw new Error('No authentication method available. Provide either service account credentials or API key.');
  }

  /**
   * Checks if service account credentials are available in environment variables
   */
  private canUseServiceAccount(): boolean {
    return !!(
      process.env.GOOGLE_CLOUD_PROJECT_ID &&
      (process.env.GOOGLE_CLOUD_CREDENTIALS || process.env.GOOGLE_APPLICATION_CREDENTIALS)
    );
  }

  /**
   * Generates OAuth2 token using service account credentials
   */
  private async getServiceAccountToken(): Promise<string> {
    try {
      // Initialize Google Auth with service account credentials
      this.auth = new GoogleAuth({
        projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
        credentials: process.env.GOOGLE_CLOUD_CREDENTIALS 
          ? JSON.parse(process.env.GOOGLE_CLOUD_CREDENTIALS)
          : undefined,
        keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
        scopes: [
          'https://www.googleapis.com/auth/cloud-platform',
          'https://www.googleapis.com/auth/generative-language'
        ]
      });

      // Get access token
      const client = await this.auth.getClient();
      const tokenResponse = await client.getAccessToken();
      
      if (!tokenResponse.token) {
        throw new Error('Failed to obtain access token from service account');
      }

      console.log('Successfully obtained service account OAuth2 token');
      return tokenResponse.token;
      
    } catch (error) {
      console.error('Error generating service account token:', error);
      throw new Error(`Service account authentication failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Connects to the Google Live API using WebSocket
   */
  async connect(): Promise<void> {
    try {
      // Get authentication token
      this.accessToken = await this.getAccessToken();

      // Determine endpoint based on authentication method
      const isServiceAccount = this.canUseServiceAccount() && this.accessToken !== this.config.apiKey;
      
      const endpoint = isServiceAccount
        ? `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent`
        : `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${this.accessToken}`;

      // Connect to WebSocket
      this.websocket = new WebSocket(endpoint, {
        headers: isServiceAccount ? {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        } : {}
      });

      return new Promise((resolve, reject) => {
        if (!this.websocket) {
          reject(new Error('WebSocket not initialized'));
          return;
        }

        this.websocket.on('open', () => {
          console.log('✅ Connected to Google Live API');
          this.isConnected = true;
          this.sendSetupMessage();
          resolve();
        });

        this.websocket.on('message', (data) => {
          try {
            const message = JSON.parse(data.toString());
            this.messageHandlers.forEach(handler => handler(message));
          } catch (error) {
            console.error('Error parsing Google Live API message:', error);
          }
        });

        this.websocket.on('error', (error) => {
          console.error('Google Live API WebSocket error:', error);
          this.isConnected = false;
          reject(error);
        });

        this.websocket.on('close', () => {
          console.log('🔌 Google Live API connection closed');
          this.isConnected = false;
        });

        // Set connection timeout
        setTimeout(() => {
          if (!this.isConnected) {
            reject(new Error('Connection timeout'));
          }
        }, 10000);
      });

    } catch (error) {
      console.error('Failed to connect to Google Live API:', error);
      throw error;
    }
  }

  /**
   * Sends initial setup message to configure the API session
   */
  private sendSetupMessage(): void {
    if (!this.websocket || !this.isConnected) {
      throw new Error('WebSocket not connected');
    }

    const setupMessage: any = {
      setup: {
        model: `models/${this.config.model}`,
        generation_config: {
          response_modalities: ["AUDIO", "TEXT"],
          speech_config: {
            voice_config: {
              prebuilt_voice_config: {
                voice_name: "Puck"
              }
            }
          }
        }
      }
    };

    if (this.config.systemInstruction) {
      (setupMessage.setup as any).system_instruction = {
        parts: [{ text: this.config.systemInstruction }]
      };
    }

    this.websocket.send(JSON.stringify(setupMessage));
    console.log('📡 Sent setup message to Google Live API');
  }

  /**
   * Registers a message handler for incoming messages
   */
  onMessage(handler: (data: any) => void): void {
    this.messageHandlers.push(handler);
  }

  /**
   * Sends audio data to the API
   */
  sendAudio(audioData: Buffer): void {
    if (!this.websocket || !this.isConnected) {
      throw new Error('WebSocket not connected');
    }

    const message = {
      client_content: {
        turns: [{
          parts: [{
            inline_data: {
              mime_type: "audio/pcm;rate=24000",
              data: audioData.toString('base64')
            }
          }]
        }],
        turn_complete: false
      }
    };

    this.websocket.send(JSON.stringify(message));
  }

  /**
   * Marks the end of audio input
   */
  markAudioEnd(): void {
    if (!this.websocket || !this.isConnected) {
      throw new Error('WebSocket not connected');
    }

    const message = {
      client_content: {
        turns: [{
          parts: []
        }],
        turn_complete: true
      }
    };

    this.websocket.send(JSON.stringify(message));
  }

  /**
   * Sends text message to the API
   */
  sendText(text: string): void {
    if (!this.websocket || !this.isConnected) {
      throw new Error('WebSocket not connected');
    }

    const message = {
      client_content: {
        turns: [{
          parts: [{ text }]
        }],
        turn_complete: true
      }
    };

    this.websocket.send(JSON.stringify(message));
  }

  /**
   * Checks if the connection is active
   */
  isConnectionActive(): boolean {
    return this.isConnected && this.websocket?.readyState === WebSocket.OPEN;
  }

  /**
   * Closes the connection
   */
  disconnect(): void {
    if (this.websocket) {
      this.websocket.close();
      this.websocket = null;
    }
    this.isConnected = false;
    this.accessToken = null;
    console.log('🔌 Google Live API client disconnected');
  }

  /**
   * Refreshes the access token (useful for long-running sessions)
   */
  async refreshToken(): Promise<void> {
    try {
      const newToken = await this.getAccessToken();
      this.accessToken = newToken;
      console.log('🔄 Access token refreshed');
    } catch (error) {
      console.error('Failed to refresh access token:', error);
      throw error;
    }
  }
}