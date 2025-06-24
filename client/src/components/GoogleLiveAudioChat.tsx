import React, { useState, useRef, useEffect } from 'react';
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
        try {
          const response = await fetch('/api/gemini-key');
          if (response.ok) {
            const data = await response.json();
            apiKey = data.key;
          }
        } catch (error) {
          console.error('Failed to fetch API key:', error);
          return;
        }
      }
      
      if (!apiKey) {
        console.error('No Gemini API key available');
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

  const disconnect = () => {
    if (websocketRef.current) {
      websocketRef.current.close();
      websocketRef.current = null;
    }
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
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

  const startAudioCapture = (stream: MediaStream, websocket: WebSocket) => {
    const mediaRecorder = new MediaRecorder(stream, {
      mimeType: 'audio/webm;codecs=opus'
    });
    
    mediaRecorderRef.current = mediaRecorder;
    
    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0 && websocket.readyState === WebSocket.OPEN) {
        // Send audio data to Google Live API
        websocket.send(JSON.stringify({
          type: 'audio_input',
          audio: event.data
        }));
      }
    };
    
    mediaRecorder.start(100); // Send chunks every 100ms
    setIsListening(true);
  };

  const handleWebSocketMessage = (data: any) => {
    switch (data.type) {
      case 'audio_response':
        // Handle incoming audio from Google
        if (data.audio && !isMuted) {
          playAudioResponse(data.audio);
        }
        break;
        
      case 'transcript':
        console.log('🎤 User said:', data.text);
        break;
        
      case 'response_transcript':
        console.log('🤖 Zest said:', data.text);
        break;
        
      case 'recipe_update':
        console.log('📝 Recipe updated:', data.recipe);
        if (onRecipeUpdate) {
          onRecipeUpdate(data.recipe);
        }
        break;
        
      case 'error':
        console.error('Google Live Audio error:', data.message);
        setConnectionStatus('error');
        break;
    }
  };

  const playAudioResponse = async (audioData: any) => {
    try {
      if (audioElementRef.current && !isMuted) {
        // Convert base64 or blob to playable URL
        let audioUrl;
        if (typeof audioData === 'string') {
          // Base64 encoded audio
          audioUrl = `data:audio/mp3;base64,${audioData}`;
        } else {
          // Blob audio data
          audioUrl = URL.createObjectURL(audioData);
        }
        
        audioElementRef.current.src = audioUrl;
        await audioElementRef.current.play();
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
      case 'connected': return 'Live conversation active';
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