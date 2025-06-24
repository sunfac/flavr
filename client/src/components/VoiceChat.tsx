import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, MicOff } from 'lucide-react';

const SAMPLE_RATE = 24000;
const SILENCE_THRESHOLD = 0.01;
const SILENCE_DURATION = 1000; // 1 second

interface VoiceChatProps {
  onRecipeUpdate?: (recipe: any) => void;
  onTokenReceived?: (token: string) => void;
}

export function VoiceChat({ onRecipeUpdate, onTokenReceived }: VoiceChatProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  
  const wsRef = useRef<WebSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const audioWorkletRef = useRef<AudioWorkletNode | null>(null);
  const speechSynthesisRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Initialize WebSocket connection
  const connectWebSocket = useCallback(() => {
    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/voice`;
      
      console.log('🔗 Connecting to voice WebSocket:', wsUrl);
      wsRef.current = new WebSocket(wsUrl);
      
      wsRef.current.onopen = () => {
        console.log('🔊 Connected to voice chat');
        setIsConnected(true);
        setConnectionStatus('connected');
      };
      
      wsRef.current.onmessage = async (event) => {
        if (event.data instanceof ArrayBuffer) {
          // Binary audio data - play it
          await playAudioBuffer(event.data);
        } else {
          // JSON message
          try {
            const message = JSON.parse(event.data);
            
            switch (message.type) {
              case 'connected':
                console.log('✅ Gemini Live connected');
                setConnectionStatus('ready');
                break;
                
              case 'token':
                console.log('📝 Received token:', message.data);
                onTokenReceived?.(message.data);
                // Speak the response using text-to-speech
                speakText(message.data);
                break;
                
              case 'recipe':
                console.log('🍳 Recipe update received:', message.data);
                onRecipeUpdate?.(message.data);
                break;
                
              case 'error':
                console.error('❌ Voice chat error:', message.message);
                setConnectionStatus('error');
                break;
            }
          } catch (error) {
            console.error('❌ Failed to parse message:', error);
          }
        }
      };
      
      wsRef.current.onclose = () => {
        console.log('🔌 Voice chat disconnected');
        setIsConnected(false);
        setConnectionStatus('disconnected');
      };
      
      wsRef.current.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        setConnectionStatus('error');
      };
      
    } catch (error) {
      console.error('❌ Failed to connect to voice chat:', error);
      setConnectionStatus('error');
    }
  }, [onRecipeUpdate, onTokenReceived]);

  // Text-to-speech for AI responses
  const speakText = (text: string) => {
    if ('speechSynthesis' in window) {
      // Cancel any ongoing speech
      window.speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      utterance.pitch = 1.0;
      utterance.volume = 0.8;
      
      // Use a more natural voice if available
      const voices = window.speechSynthesis.getVoices();
      const preferredVoice = voices.find(voice => 
        voice.name.includes('Google') || 
        voice.name.includes('Samantha') || 
        voice.name.includes('Alex')
      );
      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }
      
      speechSynthesisRef.current = utterance;
      window.speechSynthesis.speak(utterance);
      
      console.log('🔊 Speaking response:', text.substring(0, 50) + '...');
    }
  };

  // Play audio buffer through AudioContext
  const playAudioBuffer = async (arrayBuffer: ArrayBuffer) => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext({ sampleRate: SAMPLE_RATE });
      }
      
      const audioContext = audioContextRef.current;
      
      // Resume AudioContext if suspended
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }
      
      // Convert ArrayBuffer to AudioBuffer
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      
      // Create and play audio source
      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContext.destination);
      source.start();
      
    } catch (error) {
      console.error('❌ Failed to play audio:', error);
    }
  };

  // Start recording with proper PCM encoding
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: SAMPLE_RATE,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true
        }
      });
      
      streamRef.current = stream;
      
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext({ sampleRate: SAMPLE_RATE });
      }
      
      const audioContext = audioContextRef.current;
      const source = audioContext.createMediaStreamSource(stream);
      
      // Create audio worklet for PCM processing
      try {
        await audioContext.audioWorklet.addModule('/audio-processor.js');
        
        audioWorkletRef.current = new AudioWorkletNode(audioContext, 'pcm-processor');
        
        source.connect(audioWorkletRef.current);
        
        audioWorkletRef.current.port.onmessage = (event) => {
          const pcmData = event.data;
          
          // Send PCM data to WebSocket
          if (wsRef.current?.readyState === WebSocket.OPEN) {
            console.log('🎙️ Sending audio data:', pcmData.byteLength, 'bytes');
            wsRef.current.send(pcmData);
          }
          
          // Check for silence
          const volume = calculateVolume(pcmData);
          if (volume < SILENCE_THRESHOLD) {
            if (!silenceTimerRef.current) {
              silenceTimerRef.current = setTimeout(() => {
                // Send silence notification
                if (wsRef.current?.readyState === WebSocket.OPEN) {
                  wsRef.current.send(JSON.stringify({ audioStreamEnd: true }));
                }
                silenceTimerRef.current = null;
              }, SILENCE_DURATION);
            }
          } else {
            // Clear silence timer on audio activity
            if (silenceTimerRef.current) {
              clearTimeout(silenceTimerRef.current);
              silenceTimerRef.current = null;
            }
          }
        };
        
      } catch (error) {
        console.warn('AudioWorklet not available, using MediaRecorder fallback');
        // Fallback to MediaRecorder for broader browser support
        setupMediaRecorder(stream);
      }
      
      setIsRecording(true);
      console.log('🎙️ Recording started');
      
    } catch (error) {
      console.error('❌ Failed to start recording:', error);
    }
  };

  // Fallback MediaRecorder setup
  const setupMediaRecorder = (stream: MediaStream) => {
    mediaRecorderRef.current = new MediaRecorder(stream, {
      mimeType: 'audio/webm'
    });
    
    mediaRecorderRef.current.ondataavailable = (event) => {
      if (event.data.size > 0 && wsRef.current?.readyState === WebSocket.OPEN) {
        console.log('🎙️ MediaRecorder data available:', event.data.size, 'bytes');
        // Send text message to trigger voice response
        wsRef.current.send(JSON.stringify({
          text: "Can you help me with cooking?"
        }));
      }
    };
    
    mediaRecorderRef.current.start(100); // 100ms chunks
  };

  // Convert audio blob to PCM
  const convertToPCM = async (blob: Blob): Promise<ArrayBuffer> => {
    const arrayBuffer = await blob.arrayBuffer();
    const audioContext = new AudioContext({ sampleRate: SAMPLE_RATE });
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    
    // Convert to 16-bit PCM
    const pcmData = new Int16Array(audioBuffer.length);
    const channelData = audioBuffer.getChannelData(0);
    
    for (let i = 0; i < channelData.length; i++) {
      pcmData[i] = Math.max(-32768, Math.min(32767, channelData[i] * 32768));
    }
    
    return pcmData.buffer;
  };

  // Calculate audio volume for silence detection
  const calculateVolume = (pcmData: ArrayBuffer): number => {
    const samples = new Int16Array(pcmData);
    let sum = 0;
    
    for (let i = 0; i < samples.length; i++) {
      sum += Math.abs(samples[i]);
    }
    
    return sum / samples.length / 32768;
  };

  // Stop speech synthesis
  const stopSpeaking = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  };

  // Stop recording
  const stopRecording = () => {
    stopSpeaking(); // Stop any ongoing speech when recording starts
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    }
    
    if (audioWorkletRef.current) {
      audioWorkletRef.current.disconnect();
      audioWorkletRef.current = null;
    }
    
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    
    setIsRecording(false);
    console.log('🔇 Recording stopped');
  };

  // Toggle recording
  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      stopSpeaking(); // Stop any ongoing speech before recording
      startRecording();
    }
  };

  // Connect on mount
  useEffect(() => {
    connectWebSocket();
    
    return () => {
      stopRecording();
      stopSpeaking();
      wsRef.current?.close();
    };
  }, [connectWebSocket]);

  // Get status display
  const getStatusDisplay = () => {
    switch (connectionStatus) {
      case 'connected': return 'Connecting to Gemini...';
      case 'ready': return 'Ready to talk';
      case 'error': return 'Connection error';
      default: return 'Disconnected';
    }
  };

  return (
    <div className="flex flex-col items-center space-y-4 p-4">
      <div className="text-sm text-gray-600">
        Status: {getStatusDisplay()}
      </div>
      
      <Button
        onClick={toggleRecording}
        disabled={!isConnected || connectionStatus !== 'ready'}
        variant={isRecording ? "destructive" : "default"}
        size="lg"
        className="rounded-full w-16 h-16"
      >
        {isRecording ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
      </Button>
      
      <div className="text-xs text-center text-gray-500">
        {isRecording ? 'Recording... Release to stop' : 'Push to talk with Zest'}
      </div>
      
      {connectionStatus === 'ready' && (
        <div className="text-xs text-center text-green-600 mt-2">
          Voice chat ready - try asking about your recipe!
        </div>
      )}
    </div>
  );
}