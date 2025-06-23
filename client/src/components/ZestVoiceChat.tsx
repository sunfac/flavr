import { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface ZestVoiceChatProps {
  onChatMessage?: (message: string) => void;
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
  className,
  recipeContext 
}: ZestVoiceChatProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
  const [lastMessage, setLastMessage] = useState<string>('');
  
  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const { toast } = useToast();

  // Initialize OpenAI Realtime API connection
  const connectToOpenAI = async () => {
    if (connectionStatus === 'connecting' || connectionStatus === 'connected') return;
    
    setConnectionStatus('connecting');
    
    try {
      // Create WebSocket connection to OpenAI Realtime API
      const ws = new WebSocket(
        'wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01',
        ['realtime', `openai-insecure-api-key.${import.meta.env.VITE_OPENAI_API_KEY}`]
      );

      ws.onopen = () => {
        console.log('Connected to OpenAI Realtime API');
        setConnectionStatus('connected');
        setIsConnected(true);
        
        // Send session configuration
        ws.send(JSON.stringify({
          type: 'session.update',
          session: {
            modalities: ['text', 'audio'],
            instructions: `You are Zest, a bold and clever private chef AI assistant. You're helping users cook through recipes with natural conversation.

Current recipe context: ${recipeContext ? `
- Recipe: ${recipeContext.title}
- Current Step: ${recipeContext.currentStep + 1} of ${recipeContext.totalSteps}
- Current Instruction: ${recipeContext.instructions[recipeContext.currentStep] || 'Recipe complete'}
- All Ingredients: ${recipeContext.ingredients.join(', ')}
` : 'No active recipe'}

You should:
- Provide cooking guidance in a confident, encouraging tone
- Help users navigate through recipe steps
- Answer cooking questions naturally
- Give practical tips and techniques
- Confirm when users complete steps and guide them to the next one
- Keep responses concise but helpful
- Use your chef expertise to give valuable insights

Respond conversationally as if you're right there in the kitchen with them.`,
            voice: 'shimmer',
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
            tools: [],
            tool_choice: 'none',
            temperature: 0.8,
            max_response_output_tokens: 4096
          }
        }));
      };

      ws.onmessage = (event) => {
        const message = JSON.parse(event.data);
        handleRealtimeMessage(message);
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setConnectionStatus('error');
        toast({
          title: "Connection Error",
          description: "Failed to connect to Zest voice chat",
          variant: "destructive"
        });
      };

      ws.onclose = () => {
        console.log('WebSocket connection closed');
        setConnectionStatus('disconnected');
        setIsConnected(false);
        setIsRecording(false);
      };

      wsRef.current = ws;
    } catch (error) {
      console.error('Failed to connect:', error);
      setConnectionStatus('error');
      toast({
        title: "Connection Failed",
        description: "Unable to start voice chat with Zest",
        variant: "destructive"
      });
    }
  };

  // Handle incoming realtime messages
  const handleRealtimeMessage = (message: any) => {
    switch (message.type) {
      case 'conversation.item.input_audio_transcription.completed':
        setLastMessage(message.transcript);
        if (onChatMessage) {
          onChatMessage(message.transcript);
        }
        break;
        
      case 'response.audio.delta':
        // Play audio chunk
        if (message.delta) {
          playAudioChunk(message.delta);
        }
        break;
        
      case 'response.audio.done':
        setIsSpeaking(false);
        break;
        
      case 'response.audio_transcript.delta':
        // Handle text response if needed
        break;
        
      case 'input_audio_buffer.speech_started':
        setIsRecording(true);
        break;
        
      case 'input_audio_buffer.speech_stopped':
        setIsRecording(false);
        break;
        
      case 'response.done':
        setIsSpeaking(false);
        break;
    }
  };

  // Play audio chunk from OpenAI
  const playAudioChunk = async (base64Audio: string) => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
    }

    try {
      setIsSpeaking(true);
      const audioData = atob(base64Audio);
      const arrayBuffer = new ArrayBuffer(audioData.length);
      const view = new Uint8Array(arrayBuffer);
      
      for (let i = 0; i < audioData.length; i++) {
        view[i] = audioData.charCodeAt(i);
      }

      const audioBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer);
      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContextRef.current.destination);
      source.start();
      
      source.onended = () => {
        setIsSpeaking(false);
      };
    } catch (error) {
      console.error('Error playing audio:', error);
      setIsSpeaking(false);
    }
  };

  // Start recording audio
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 24000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true
        } 
      });
      
      streamRef.current = stream;
      
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext({ sampleRate: 24000 });
      }

      const source = audioContextRef.current.createMediaStreamSource(stream);
      const processor = audioContextRef.current.createScriptProcessor(4096, 1, 1);
      
      processor.onaudioprocess = (event) => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          const inputBuffer = event.inputBuffer.getChannelData(0);
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
        }
      };
      
      source.connect(processor);
      processor.connect(audioContextRef.current.destination);
      
    } catch (error) {
      console.error('Error starting recording:', error);
      toast({
        title: "Microphone Error",
        description: "Unable to access microphone for voice chat",
        variant: "destructive"
      });
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  // Toggle voice chat
  const toggleVoiceChat = async () => {
    if (!isConnected) {
      await connectToOpenAI();
      await startRecording();
    } else {
      disconnect();
    }
  };

  // Disconnect from OpenAI
  const disconnect = () => {
    if (wsRef.current) {
      wsRef.current.close();
    }
    stopRecording();
    setIsConnected(false);
    setConnectionStatus('disconnected');
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return 'bg-green-500';
      case 'connecting': return 'bg-yellow-500';
      case 'error': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusText = () => {
    if (isRecording) return 'Listening...';
    if (isSpeaking) return 'Zest is speaking...';
    switch (connectionStatus) {
      case 'connected': return 'Connected to Zest';
      case 'connecting': return 'Connecting...';
      case 'error': return 'Connection failed';
      default: return 'Disconnected';
    }
  };

  return (
    <Card className={cn("bg-slate-800/90 border-slate-600/50 backdrop-blur-sm", className)}>
      <div className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={cn("w-2 h-2 rounded-full", getStatusColor())} />
            <span className="text-sm font-medium text-slate-200">Zest Voice Chat</span>
          </div>
          <Badge variant="outline" className="text-xs text-slate-300 border-slate-600">
            {getStatusText()}
          </Badge>
        </div>

        {/* Voice Controls */}
        <div className="flex items-center gap-3">
          <Button
            onClick={toggleVoiceChat}
            variant={isConnected ? "destructive" : "default"}
            size="sm"
            className={cn(
              "flex-1 transition-all duration-200",
              isConnected ? "bg-red-600 hover:bg-red-700" : "bg-blue-600 hover:bg-blue-700",
              isRecording && "ring-2 ring-blue-400 ring-offset-2 ring-offset-slate-800"
            )}
            disabled={connectionStatus === 'connecting'}
          >
            {isConnected ? (
              <>
                <MicOff className="w-4 h-4 mr-2" />
                End Chat
              </>
            ) : (
              <>
                <Mic className="w-4 h-4 mr-2" />
                Start Voice Chat
              </>
            )}
          </Button>

          {isConnected && (
            <Button
              variant="outline"
              size="sm"
              className="border-slate-600 text-slate-200 hover:bg-slate-700"
              disabled
            >
              {isSpeaking ? (
                <VolumeX className="w-4 h-4" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
            </Button>
          )}
        </div>

        {/* Last Message */}
        {lastMessage && (
          <div className="p-3 bg-slate-700/50 rounded-lg border border-slate-600">
            <p className="text-sm text-slate-300">
              <span className="text-slate-400">You said:</span> "{lastMessage}"
            </p>
          </div>
        )}

        {/* Recipe Context Display */}
        {recipeContext && isConnected && (
          <div className="p-3 bg-slate-700/30 rounded-lg border border-slate-600/50">
            <div className="text-xs text-slate-400 mb-1">Current Recipe Context:</div>
            <div className="text-sm text-slate-200 font-medium">{recipeContext.title}</div>
            <div className="text-xs text-slate-300 mt-1">
              Step {recipeContext.currentStep + 1} of {recipeContext.totalSteps}
            </div>
          </div>
        )}

        {/* Connection Help */}
        {connectionStatus === 'error' && (
          <div className="p-3 bg-red-900/20 border border-red-500/30 rounded-lg">
            <p className="text-sm text-red-200">
              Connection failed. Check your internet connection and try again.
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}