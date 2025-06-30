import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Mic, MicOff, Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface GoogleLiveAudioChatProps {
  currentRecipe?: any;
  onRecipeUpdate?: (recipe: any) => void;
}

export function GoogleLiveAudioChat({ currentRecipe, onRecipeUpdate }: GoogleLiveAudioChatProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
  
  const websocketRef = useRef<WebSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);

  // Initialize audio context and elements
  useEffect(() => {
    audioElementRef.current = new Audio();
    audioElementRef.current.autoplay = true;
    
    return () => {
      disconnect();
    };
  }, []);

  const connect = async () => {
    try {
      setConnectionStatus('connecting');
      
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 24000
        } 
      });
      
      streamRef.current = stream;
      
      // Create audio context for processing
      audioContextRef.current = new AudioContext({ sampleRate: 24000 });
      
      // Connect to Google Live API WebSocket
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      // Get API key from environment or server endpoint
      let apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      
      if (!apiKey) {
        console.log('🔄 Fetching API key from server fallback...');
        try {
          const response = await fetch('/api/gemini-key');
          if (response.ok) {
            const data = await response.json();
            apiKey = data.key;
            console.log('✅ API key fetched from server successfully');
          } else {
            console.error('❌ Server responded with error:', response.status);
            return;
          }
        } catch (error) {
          console.error('❌ Network error fetching API key:', error);
          return;
        }
      } else {
        console.log('✅ API key available from environment');
      }
      
      if (!apiKey) {
        console.error('❌ No Gemini API key available from any source');
        return;
      }
      const websocket = new WebSocket(`wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${apiKey}`);
      websocketRef.current = websocket;
      
      websocket.onopen = () => {
        console.log('🔊 Connected to Google Live Audio API');
        setConnectionStatus('connected');
        setIsConnected(true);
        
        // Send initial context
        websocket.send(JSON.stringify({
          type: 'session_setup',
          currentRecipe,
          instructions: `You are Zest, Flavr's cooking assistant. Help with recipe questions, modifications, and cooking guidance. 
          
          Current recipe: ${currentRecipe?.title || 'None'}
          Be conversational, helpful, and maintain natural dialogue flow.`
        }));
        
        // Start recording audio
        startAudioCapture(stream, websocket);
      };
      
      websocket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          handleWebSocketMessage(data);
        } catch (error) {
          // Handle binary audio data
          if (event.data instanceof Blob) {
            playAudioResponse(event.data);
          }
        }
      };
      
      websocket.onerror = (error) => {
        console.error('WebSocket error:', error);
        setConnectionStatus('error');
      };
      
      websocket.onclose = () => {
        console.log('🔇 Disconnected from Google Live Audio API');
        setConnectionStatus('disconnected');
        setIsConnected(false);
      };
      
    } catch (error) {
      console.error('Failed to connect to Google Live Audio:', error);
      setConnectionStatus('error');
    }
  };

  // Start audio streaming to Gemini Live API
  const startAudioStreaming = useCallback(() => {
    if (!streamRef.current || !audioContextRef.current || !websocketRef.current) return;
    
    console.log('Starting audio streaming to Gemini Live API');
    
    try {
      const source = audioContextRef.current.createMediaStreamSource(streamRef.current);
      const processor = audioContextRef.current.createScriptProcessor(4096, 1, 1);
      
      processor.onaudioprocess = (event) => {
        if (websocketRef.current?.readyState === WebSocket.OPEN) {
          const inputBuffer = event.inputBuffer.getChannelData(0);
          
          // Convert to 16-bit PCM at 24kHz for Gemini Live
          const pcmData = new Int16Array(inputBuffer.length);
          for (let i = 0; i < inputBuffer.length; i++) {
            pcmData[i] = Math.max(-32768, Math.min(32767, inputBuffer[i] * 32768));
          }
          
          // Send proper Gemini Live client content message
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
      
      audioProcessorRef.current = processor;
      console.log('Audio streaming pipeline established');
    } catch (error) {
      console.error('Error starting audio streaming:', error);
    }
  }, []);

  const disconnect = () => {
    if (audioProcessorRef.current) {
      audioProcessorRef.current.disconnect();
      audioProcessorRef.current = null;
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

  const handleAudioResponse = async (audioData: any) => {
    try {
      if (!isMuted) {
        let audioBuffer;
        
        if (typeof audioData === 'string') {
          // Base64 encoded audio from Gemini Live
          const binaryString = atob(audioData);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          audioBuffer = bytes.buffer;
        } else {
          // Direct ArrayBuffer
          audioBuffer = audioData;
        }
        
        if (audioContextRef.current) {
          const decodedAudio = await audioContextRef.current.decodeAudioData(audioBuffer);
          const source = audioContextRef.current.createBufferSource();
          source.buffer = decodedAudio;
          source.connect(audioContextRef.current.destination);
          source.start();
          console.log('Playing AI audio response');
        }
      }
    } catch (error) {
      console.error('Error playing audio response:', error);
    }
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    if (audioElementRef.current) {
      audioElementRef.current.muted = !isMuted;
    }
  };

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return 'text-green-500';
      case 'connecting': return 'text-yellow-500';
      case 'error': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  const getStatusText = () => {
    switch (connectionStatus) {
      case 'connected': return 'Setting up conversation...';
      case 'ready': return 'Ready - speak naturally!';
      case 'connecting': return 'Connecting...';
      case 'error': return 'Connection error';
      default: return 'Click to start voice conversation';
    }
  };

  return (
    <div className="flex flex-col space-y-3 p-3 bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-950 dark:to-red-950 rounded-lg border border-orange-200 dark:border-orange-800 w-full">
      <div className="text-center">
        <p className={`text-sm font-medium ${getStatusColor()}`}>
          {getStatusText()}
        </p>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-3 sm:space-x-4">
        {!isConnected ? (
          <Button
            onClick={connect}
            disabled={connectionStatus === 'connecting'}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm transition-all duration-200"
          >
            <Mic className="w-4 h-4 mr-2" />
            Start Voice Chat
          </Button>
        ) : (
          <div className="flex w-full gap-2">
            <Button
              onClick={disconnect}
              variant="destructive"
              className="flex-1 px-4 py-2 rounded-lg text-sm"
            >
              <MicOff className="w-4 h-4 mr-2" />
              End Chat
            </Button>
            
            <Button
              onClick={toggleMute}
              variant="outline"
              className="px-3 py-2 rounded-lg"
            >
              {isMuted ? (
                <VolumeX className="w-4 h-4" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
            </Button>
          </div>
        )}
      </div>

      {isConnected && (
        <div className="flex items-center justify-center space-x-2 text-xs text-gray-600 dark:text-gray-400">
          <div className={`w-2 h-2 rounded-full ${isListening ? 'bg-red-500 animate-pulse' : 'bg-gray-400'}`} />
          <span>{isListening ? 'Listening...' : 'Microphone off'}</span>
        </div>
      )}
    </div>
  );
}