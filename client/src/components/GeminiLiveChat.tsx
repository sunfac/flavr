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
              response_modalities: ["AUDIO", "TEXT"],
              speech_config: {
                voice_config: {
                  prebuilt_voice_config: {
                    voice_name: "Aoede"
                  }
                }
              }
            },
            system_instruction: {
              parts: [{
                text: `You are Zest, a bold cooking assistant. Provide helpful, concise cooking guidance. ${currentRecipe ? `Current recipe: ${currentRecipe.title}` : ''}`
              }]
            }
          }
        };
        
        console.log('Sending setup message to Gemini Live');
        ws.send(JSON.stringify(setupMessage));
      };
      
      ws.onmessage = (event) => {
        if (typeof event.data === 'string') {
          try {
            const message = JSON.parse(event.data);
            console.log('Gemini Live message:', message);
            
            if (message.setupComplete) {
              console.log('Setup complete - starting audio streaming');
              setConnectionStatus('ready');
              setIsListening(true);
              startAudioStreaming();
            }
            
            if (message.serverContent?.modelTurn?.parts) {
              const parts = message.serverContent.modelTurn.parts;
              
              // Handle text responses
              const textParts = parts.filter((part: any) => part.text);
              if (textParts.length > 0) {
                const text = textParts.map((part: any) => part.text).join(' ');
                console.log('AI response:', text);
              }
              
              // Handle audio responses
              const audioParts = parts.filter((part: any) => part.inlineData?.mimeType?.includes('audio'));
              audioParts.forEach((part: any) => {
                console.log('Playing AI audio response');
                playAudio(part.inlineData.data);
              });
            }
          } catch (error) {
            console.error('Error parsing message:', error);
          }
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
    
    processor.onaudioprocess = (event) => {
      if (websocketRef.current?.readyState === WebSocket.OPEN && isListening) {
        const inputBuffer = event.inputBuffer.getChannelData(0);
        
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
        
        websocketRef.current.send(JSON.stringify(audioMessage));
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
        const binaryString = atob(base64Audio);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        
        const audioBuffer = await audioContextRef.current.decodeAudioData(bytes.buffer);
        const source = audioContextRef.current.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioContextRef.current.destination);
        source.start();
        
        console.log('Playing AI audio response');
      }
    } catch (error) {
      console.error('Error playing audio:', error);
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