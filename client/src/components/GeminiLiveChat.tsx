import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, Volume2, VolumeX } from 'lucide-react';

interface GeminiLiveChatProps {
  currentRecipe?: any;
  onRecipeUpdate?: (recipe: any) => void;
}

export function GeminiLiveChat({ currentRecipe, onRecipeUpdate }: GeminiLiveChatProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'ready' | 'error'>('disconnected');
  
  const websocketRef = useRef<WebSocket | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);

  const connect = async () => {
    try {
      setConnectionStatus('connecting');
      console.log('Starting Gemini Live Audio connection...');
      
      // Get microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000,
          channelCount: 1
        } 
      });
      
      streamRef.current = stream;
      
      // Create audio context
      audioContextRef.current = new AudioContext({ sampleRate: 16000 });
      
      // Get API key
      let apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) {
        const response = await fetch('/api/gemini-key');
        if (response.ok) {
          const data = await response.json();
          apiKey = data.key;
        }
      }
      
      if (!apiKey) {
        throw new Error('No Gemini API key available');
      }
      
      // Connect to Gemini Live API
      const ws = new WebSocket(`wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${apiKey}`);
      websocketRef.current = ws;
      ws.binaryType = 'arraybuffer';
      
      ws.onopen = () => {
        console.log('Connected to Gemini Live API');
        setConnectionStatus('connected');
        setIsConnected(true);
        
        // Send setup message
        const setupMessage = {
          setup: {
            model: "models/gemini-2.0-flash-exp",
            generation_config: {
              response_modalities: ["AUDIO"],
              speech_config: {
                voice_config: {
                  prebuilt_voice_config: {
                    voice_name: "Puck"
                  }
                }
              },
              temperature: 0.8,
              max_output_tokens: 200
            },
            system_instruction: {
              parts: [{
                text: `You are Zest, Flavr's cooking assistant. Give short, helpful cooking advice. Keep all responses under 30 seconds. Be encouraging and personable. ${currentRecipe ? `Current recipe: ${currentRecipe.title}` : ''}`
              }]
            }
          }
        };
        
        console.log('Sending setup message to Gemini Live');
        ws.send(JSON.stringify(setupMessage));
      };
      
      ws.onmessage = (event) => {
        console.log('Raw message received:', event.data);
        
        if (typeof event.data === 'string') {
          try {
            const message = JSON.parse(event.data);
            console.log('Parsed Gemini Live message:', JSON.stringify(message, null, 2));
            
            // Handle setup complete
            if (message.setupComplete) {
              console.log('✅ Setup complete - ready for conversation');
              setConnectionStatus('ready');
              setIsListening(true);
              startAudioStreaming();
              return;
            }
            
            // Handle server content with detailed logging
            if (message.serverContent) {
              console.log('📥 Server content received:', message.serverContent);
              
              if (message.serverContent.modelTurn?.parts) {
                const parts = message.serverContent.modelTurn.parts;
                console.log('🔍 Processing parts:', parts);
                
                // Handle text responses
                const textParts = parts.filter((part: any) => part.text);
                if (textParts.length > 0) {
                  const text = textParts.map((part: any) => part.text).join(' ');
                  console.log('💬 AI text response:', text);
                }
                
                // Handle audio responses
                const audioParts = parts.filter((part: any) => part.inlineData?.mimeType?.includes('audio'));
                if (audioParts.length > 0) {
                  console.log('🔊 Found audio parts:', audioParts.length);
                  audioParts.forEach((part: any, index: number) => {
                    console.log(`🎵 Processing audio part ${index + 1}:`, part.inlineData.mimeType);
                    playAudio(part.inlineData.data);
                  });
                } else {
                  console.log('⚠️ No audio parts found in response, all parts:', parts);
                }
              }
            } else {
              console.log('⚠️ No serverContent in message');
            }
            
            // Log any other message types
            if (!message.setupComplete && !message.serverContent) {
              console.log('🔍 Unknown message type:', Object.keys(message));
            }
            
          } catch (error) {
            console.error('❌ Error parsing JSON message:', error);
          }
        } else {
          console.log('📦 Received binary data:', event.data);
        }
      };
      
      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setConnectionStatus('error');
      };
      
      ws.onclose = () => {
        console.log('Disconnected from Gemini Live');
        cleanup();
      };
      
    } catch (error) {
      console.error('Failed to connect:', error);
      setConnectionStatus('error');
    }
  };

  const startAudioStreaming = useCallback(() => {
    if (!streamRef.current || !audioContextRef.current || !websocketRef.current) return;
    
    console.log('Starting continuous audio streaming');
    
    const source = audioContextRef.current.createMediaStreamSource(streamRef.current);
    const processor = audioContextRef.current.createScriptProcessor(4096, 1, 1);
    
    let chunkCount = 0;
    processor.onaudioprocess = (event) => {
      if (websocketRef.current?.readyState === WebSocket.OPEN && isListening) {
        const inputBuffer = event.inputBuffer.getChannelData(0);
        
        // Check for audio activity (basic voice detection)
        const sum = inputBuffer.reduce((acc, val) => acc + Math.abs(val), 0);
        const average = sum / inputBuffer.length;
        
        // Log audio levels for debugging (every 100 samples)
        if (chunkCount % 100 === 0) {
          console.log(`🎤 Audio level: ${average.toFixed(6)} (threshold: 0.001)`);
        }
        
        if (average > 0.001) { // Lower threshold for voice detection
          chunkCount++;
          
          // Convert to 16-bit PCM
          const pcmData = new Int16Array(inputBuffer.length);
          for (let i = 0; i < inputBuffer.length; i++) {
            pcmData[i] = Math.max(-32768, Math.min(32767, inputBuffer[i] * 32768));
          }
          
          // Send to Gemini Live with proper format
          const audioMessage = {
            client_content: {
              turns: [{
                role: "user", 
                parts: [{
                  inline_data: {
                    mime_type: "audio/pcm",
                    data: btoa(String.fromCharCode(...new Uint8Array(pcmData.buffer)))
                  }
                }]
              }],
              turn_complete: false
            }
          };
          
          console.log(`📤 Sending audio message (${pcmData.length} samples, level: ${average.toFixed(4)})`);
          console.log('Audio data size:', btoa(String.fromCharCode(...new Uint8Array(pcmData.buffer))).length);
          
          if (chunkCount % 10 === 0) { // Log every 10th chunk for better debugging
            console.log(`🎤 Sending audio chunk ${chunkCount} (level: ${average.toFixed(4)})`);
          }
          
          websocketRef.current.send(JSON.stringify(audioMessage));
        } else {
          // Log silence detection for debugging
          if (chunkCount % 500 === 0) {
            console.log(`🔇 Silence detected (level: ${average.toFixed(6)})`);
          }
        }
      }
    };
    
    source.connect(processor);
    processor.connect(audioContextRef.current.destination);
    processorRef.current = processor;
    
    console.log('Audio streaming active');
  }, [isListening]);

  const playAudio = async (base64Audio: string) => {
    try {
      if (!isMuted && audioContextRef.current) {
        console.log('🎵 Attempting to play audio response...');
        
        const binaryString = atob(base64Audio);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        
        console.log('🔊 Decoded audio data, length:', bytes.length);
        
        const audioBuffer = await audioContextRef.current.decodeAudioData(bytes.buffer);
        const source = audioContextRef.current.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioContextRef.current.destination);
        source.start();
        
        console.log('✅ Playing AI audio response, duration:', audioBuffer.duration);
      } else {
        console.log('⚠️ Audio playback skipped - muted or no audio context');
      }
    } catch (error) {
      console.error('❌ Error playing audio:', error);
      
      // Try alternative playback method
      try {
        const audioUrl = `data:audio/wav;base64,${base64Audio}`;
        const audio = new Audio(audioUrl);
        await audio.play();
        console.log('✅ Fallback audio playback successful');
      } catch (fallbackError) {
        console.error('❌ Fallback audio playback failed:', fallbackError);
      }
    }
  };

  const cleanup = () => {
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    
    if (websocketRef.current) {
      websocketRef.current.close();
      websocketRef.current = null;
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    
    setIsConnected(false);
    setIsListening(false);
    setConnectionStatus('disconnected');
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'ready': return 'text-green-500';
      case 'connected': return 'text-blue-500';
      case 'connecting': return 'text-yellow-500';
      case 'error': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  const getStatusText = () => {
    switch (connectionStatus) {
      case 'ready': return 'Listening - speak naturally!';
      case 'connected': return 'Setting up...';
      case 'connecting': return 'Connecting...';
      case 'error': return 'Connection error';
      default: return 'Voice chat with Zest';
    }
  };

  return (
    <div className="flex flex-col space-y-3 p-4 bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-950 dark:to-red-950 rounded-lg border border-orange-200 dark:border-orange-800">
      <div className="text-center">
        <p className={`text-sm font-medium ${getStatusColor()}`}>
          {getStatusText()}
        </p>
      </div>

      <div className="flex items-center gap-3">
        {!isConnected ? (
          <Button
            onClick={connect}
            disabled={connectionStatus === 'connecting'}
            className="flex-1 bg-orange-500 hover:bg-orange-600 text-white"
          >
            <Mic className="w-4 h-4 mr-2" />
            Start Voice Chat
          </Button>
        ) : (
          <div className="flex w-full gap-2">
            <Button
              onClick={cleanup}
              variant="destructive"
              className="flex-1"
            >
              <MicOff className="w-4 h-4 mr-2" />
              End Chat
            </Button>
            
            <Button
              onClick={toggleMute}
              variant="outline"
              className="px-3"
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </Button>
          </div>
        )}
      </div>

      {connectionStatus === 'ready' && (
        <div className="flex items-center justify-center space-x-2 text-xs text-gray-600 dark:text-gray-400">
          <div className={`w-2 h-2 rounded-full ${isListening ? 'bg-red-500 animate-pulse' : 'bg-gray-400'}`} />
          <span>Two-way conversation active</span>
        </div>
      )}
    </div>
  );
}