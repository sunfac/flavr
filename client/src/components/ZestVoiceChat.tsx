import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, Volume2, MessageSquare } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { GoogleLiveAudioChat } from './GoogleLiveAudioChat';

interface ZestVoiceChatProps {
  onChatMessage?: (message: string) => void;
  onAIResponse?: (response: string) => void;
  className?: string;
  recipeContext?: {
    title: string;
    currentStep: number;
    totalSteps: number;
    ingredients: string[];
    instructions: string[];
  };
}

export default function ZestVoiceChat({ 
  onChatMessage, 
  onAIResponse,
  className = "",
  recipeContext 
}: ZestVoiceChatProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
  const [lastUserMessage, setLastUserMessage] = useState('');
  const [lastAIResponse, setLastAIResponse] = useState('');
  
  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const { toast } = useToast();

  // Connect to OpenAI Realtime API via server proxy
  const connectToRealtimeAPI = async () => {
    if (connectionStatus === 'connecting' || connectionStatus === 'connected') return;
    
    setConnectionStatus('connecting');
    
    try {
      // Request microphone permission first
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      // Connect to our server proxy for OpenAI Realtime API
      const ws = new WebSocket(`ws://${window.location.host}/api/voice/realtime`);
      
      ws.onopen = () => {
        console.log('Connected to voice chat');
        setConnectionStatus('connected');
        setIsConnected(true);
        
        // Send session configuration
        ws.send(JSON.stringify({
          type: 'session.update',
          session: {
            modalities: ['text', 'audio'],
            instructions: `You are Zest, a bold and clever private chef AI assistant helping with cooking. 

${recipeContext ? `Current recipe context:
- Recipe: ${recipeContext.title}
- Current Step: ${recipeContext.currentStep + 1} of ${recipeContext.totalSteps}
- Current Instruction: ${recipeContext.instructions[recipeContext.currentStep] || 'Recipe complete'}
- Available Ingredients: ${recipeContext.ingredients.join(', ')}` : 'No active recipe'}

Provide cooking guidance in a confident, encouraging tone. Help users navigate through recipe steps, answer cooking questions naturally, and give practical tips. Keep responses concise but helpful. Respond conversationally as if you're right there in the kitchen with them.`,
            voice: 'nova',
            input_audio_format: 'pcm16',
            output_audio_format: 'pcm16',
            input_audio_transcription: {
              model: 'whisper-1'
            },
            turn_detection: {
              type: 'server_vad',
              threshold: 0.5,
              prefix_padding_ms: 300,
              silence_duration_ms: 500
            },
            temperature: 0.8,
            max_response_output_tokens: 4096
          }
        }));
        
        toast({
          title: "Voice Chat Connected",
          description: "You can now talk to Zest naturally!"
        });
      };

      ws.onmessage = (event) => {
        const message = JSON.parse(event.data);
        handleRealtimeMessage(message);
      };

      ws.onerror = (error) => {
        console.error('Voice chat error:', error);
        setConnectionStatus('error');
        toast({
          title: "Connection Error",
          description: "Failed to connect to voice chat",
          variant: "destructive"
        });
      };

      ws.onclose = () => {
        console.log('Voice chat disconnected');
        setConnectionStatus('disconnected');
        setIsConnected(false);
        setIsRecording(false);
        cleanupAudio();
      };

      wsRef.current = ws;
      
    } catch (error) {
      console.error('Failed to initialize voice chat:', error);
      setConnectionStatus('error');
      toast({
        title: "Microphone Access Required",
        description: "Please allow microphone access to use voice chat",
        variant: "destructive"
      });
    }
  };

  // Handle incoming realtime messages
  const handleRealtimeMessage = (message: any) => {
    switch (message.type) {
      case 'conversation.item.input_audio_transcription.completed':
        const userText = message.transcript;
        setLastUserMessage(userText);
        
        // Add to chat history
        if (onChatMessage) {
          onChatMessage(userText);
        }
        break;
        
      case 'response.audio.delta':
        // Play audio chunk from AI
        if (message.delta) {
          playAudioChunk(message.delta);
        }
        break;
        
      case 'response.text.delta':
        // Handle text response for chat display
        if (message.delta) {
          setLastAIResponse(prev => prev + message.delta);
        }
        break;
        
      case 'response.done':
        // Response complete
        if (lastAIResponse && onAIResponse) {
          onAIResponse(lastAIResponse);
        }
        setLastAIResponse('');
        break;
        
      case 'error':
        console.error('Realtime API error:', message.error);
        toast({
          title: "Voice Error",
          description: message.error.message || "Voice chat error occurred",
          variant: "destructive"
        });
        break;
    }
  };

  // Play audio chunk from OpenAI
  const playAudioChunk = (base64Audio: string) => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext();
      }
      
      const audioData = atob(base64Audio);
      const arrayBuffer = new ArrayBuffer(audioData.length);
      const view = new Uint8Array(arrayBuffer);
      
      for (let i = 0; i < audioData.length; i++) {
        view[i] = audioData.charCodeAt(i);
      }
      
      audioContextRef.current.decodeAudioData(arrayBuffer).then(audioBuffer => {
        const source = audioContextRef.current!.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioContextRef.current!.destination);
        source.start();
      });
    } catch (error) {
      console.error('Error playing audio chunk:', error);
    }
  };

  // Start/stop recording
  const toggleRecording = async () => {
    if (!isConnected) {
      await connectToRealtimeAPI();
      return;
    }

    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  // Start recording audio
  const startRecording = async () => {
    if (!wsRef.current || !streamRef.current) return;
    
    setIsRecording(true);
    
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext({ sampleRate: 24000 });
      }
      
      const source = audioContextRef.current.createMediaStreamSource(streamRef.current);
      const processor = audioContextRef.current.createScriptProcessor(4096, 1, 1);
      
      processor.onaudioprocess = (event) => {
        if (!isRecording || !wsRef.current) return;
        
        const inputBuffer = event.inputBuffer.getChannelData(0);
        
        // Convert float32 to int16 PCM
        const pcm16 = new Int16Array(inputBuffer.length);
        for (let i = 0; i < inputBuffer.length; i++) {
          pcm16[i] = Math.max(-32768, Math.min(32767, inputBuffer[i] * 32768));
        }
        
        const uint8Array = new Uint8Array(pcm16.buffer);
        const base64Audio = btoa(String.fromCharCode.apply(null, Array.from(uint8Array)));
        
        wsRef.current.send(JSON.stringify({
          type: 'input_audio_buffer.append',
          audio: base64Audio
        }));
      };
      
      source.connect(processor);
      processor.connect(audioContextRef.current.destination);
      processorRef.current = processor;
      
    } catch (error) {
      console.error('Error starting recording:', error);
      setIsRecording(false);
    }
  };

  // Stop recording
  const stopRecording = () => {
    setIsRecording(false);
    
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    
    // Commit audio buffer and create response
    if (wsRef.current) {
      wsRef.current.send(JSON.stringify({
        type: 'input_audio_buffer.commit'
      }));
      
      wsRef.current.send(JSON.stringify({
        type: 'response.create',
        response: {
          modalities: ['text', 'audio'],
          instructions: "Respond to the user's cooking question or request naturally and helpfully."
        }
      }));
    }
  };

  // Cleanup audio resources
  const cleanupAudio = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      cleanupAudio();
    };
  }, []);

  return (
    <div className={`flex flex-col items-center space-y-3 ${className}`}>
      {/* Voice Chat Button */}
      <Button
        onClick={toggleRecording}
        variant={isRecording ? "destructive" : isConnected ? "default" : "outline"}
        size="lg"
        className={`w-16 h-16 rounded-full transition-all duration-300 ${
          isRecording 
            ? "bg-red-500 hover:bg-red-600 animate-pulse" 
            : isConnected 
              ? "bg-orange-500 hover:bg-orange-600" 
              : connectionStatus === 'connecting'
                ? "bg-yellow-500 hover:bg-yellow-600"
                : "bg-slate-700 hover:bg-slate-600"
        }`}
        disabled={connectionStatus === 'connecting'}
      >
        {isRecording ? (
          <MicOff className="w-6 h-6 text-white" />
        ) : (
          <Mic className="w-6 h-6 text-white" />
        )}
      </Button>

      {/* Status and Last Messages */}
      <div className="text-center">
        <p className="text-xs text-slate-400 mb-1">
          {connectionStatus === 'connecting' 
            ? "Connecting..." 
            : isRecording 
              ? "Listening..." 
              : isConnected 
                ? "Tap to talk to Zest" 
                : "Tap to start voice chat"
          }
        </p>
        
        {lastUserMessage && (
          <div className="max-w-48 p-2 bg-slate-800/50 rounded-lg border border-slate-600 mb-2">
            <div className="flex items-center space-x-1 mb-1">
              <Volume2 className="w-3 h-3 text-blue-400" />
              <span className="text-xs text-blue-400">You said:</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">"{lastUserMessage}"</p>
          </div>
        )}
      </div>
    </div>
  );
}