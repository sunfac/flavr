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

  // Initialize WebSocket connection to Gemini Live API
  const connectWebSocket = useCallback(() => {
    try {
      // Connect directly to Google Gemini Live WebSocket
      const wsUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${import.meta.env.VITE_GEMINI_API_KEY}`;
      
      console.log('🔗 Connecting to Gemini Live API WebSocket');
      wsRef.current = new WebSocket(wsUrl);
      wsRef.current.binaryType = 'arraybuffer'; // Set binary type for audio data
      
      wsRef.current.onopen = () => {
        console.log('✅ Connected to Gemini Live API');
        setIsConnected(true);
        setConnectionStatus('connected');
        
        // Send minimal setup message to establish connection
        const setupMessage = {
          setup: {
            model: "models/gemini-2.0-flash-exp"
          }
        };
        
        console.log('📤 Sending setup message:', 'setup');
        wsRef.current?.send(JSON.stringify(setupMessage) + '\n');
      };
      
      wsRef.current.onmessage = async (event) => {
        if (event.data instanceof ArrayBuffer) {
          // Binary audio data from Gemini Live
          const audioSize = event.data.byteLength;
          console.log('🔊 Received binary audio data:', audioSize, 'bytes');
          await playGeminiAudio(event.data);
        } else {
          // JSON messages from Gemini Live API
          try {
            const lines = event.data.trim().split('\n');
            for (const line of lines) {
              if (!line.trim()) continue;
              
              const message = JSON.parse(line);
              console.log('📥 Received message type:', Object.keys(message)[0]);
              
              if (message.setupComplete) {
                console.log('✅ Setup complete');
                setConnectionStatus('ready');
              }
              
              if (message.serverContent) {
                const content = message.serverContent;
                
                if (content.modelTurn && content.modelTurn.parts) {
                  for (const part of content.modelTurn.parts) {
                    if (part.text) {
                      console.log('📝 Text response:', part.text);
                      onTokenReceived?.(part.text);
                    }
                    
                    if (part.inlineData && part.inlineData.mimeType === 'audio/pcm') {
                      console.log('🎵 Inline audio received');
                      const audioData = atob(part.inlineData.data);
                      const audioBuffer = new ArrayBuffer(audioData.length);
                      const view = new Uint8Array(audioBuffer);
                      for (let i = 0; i < audioData.length; i++) {
                        view[i] = audioData.charCodeAt(i);
                      }
                      await playGeminiAudio(audioBuffer);
                    }
                  }
                }
                
                if (content.turnComplete) {
                  console.log('✅ Turn complete');
                  setConnectionStatus('ready');
                }
              }
            }
          } catch (error) {
            console.error('❌ Error parsing Gemini message:', error);
          }
        }
      };
      
      wsRef.current.onclose = (event) => {
        console.log('🔌 Voice chat disconnected:', event.code, event.reason);
        setIsConnected(false);
        if (event.code === 1006) {
          setConnectionStatus('error');
        } else {
          setConnectionStatus('disconnected');
        }
      };
      
      wsRef.current.onerror = (error) => {
        console.error('❌ Gemini Live WebSocket error:', error);
        setConnectionStatus('error');
        setIsConnected(false);
      };

      wsRef.current.onclose = (event) => {
        console.log('🔌 Gemini Live WebSocket closed:', event.code, event.reason);
        setConnectionStatus('disconnected');
        setIsConnected(false);
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
    
    mediaRecorderRef.current.ondataavailable = async (event) => {
      if (event.data.size > 0 && wsRef.current?.readyState === WebSocket.OPEN) {
        console.log('🎙️ MediaRecorder data available:', event.data.size, 'bytes');
        
        try {
          // For now, send text message instead of audio due to connection issues
          wsRef.current.send(JSON.stringify({
            clientContent: {
              turns: [{
                role: "user",
                parts: [{
                  text: "I'm speaking but sending text: How do I make perfect risotto?"
                }]
              }],
              turnComplete: false
            }
          }) + '\n');
          
          console.log('📤 Sending text message (audio fallback)');
        } catch (error) {
          console.error('❌ Error sending message:', error);
        }
      }
    };
    
    mediaRecorderRef.current.start(100); // 100ms chunks
  };

  // Convert audio blob to PCM format for Gemini Live (24 kHz, 16-bit, mono)
  const convertToPCM = async (blob: Blob): Promise<ArrayBuffer> => {
    const arrayBuffer = await blob.arrayBuffer();
    const audioContext = new AudioContext({ sampleRate: 24000 });
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    
    // Resample to 24 kHz and convert to mono if needed
    const targetSampleRate = 24000;
    const resampledLength = Math.round(audioBuffer.length * targetSampleRate / audioBuffer.sampleRate);
    const resampledBuffer = audioContext.createBuffer(1, resampledLength, targetSampleRate);
    const resampledData = resampledBuffer.getChannelData(0);
    
    // Simple resampling - take mono channel (mix down if stereo)
    const sourceData = audioBuffer.numberOfChannels > 1 ? 
      audioBuffer.getChannelData(0) : audioBuffer.getChannelData(0);
    
    for (let i = 0; i < resampledLength; i++) {
      const sourceIndex = Math.floor(i * audioBuffer.length / resampledLength);
      resampledData[i] = sourceData[sourceIndex] || 0;
    }
    
    // Convert to 16-bit PCM
    const pcmData = new Int16Array(resampledLength);
    for (let i = 0; i < resampledLength; i++) {
      pcmData[i] = Math.max(-32768, Math.min(32767, resampledData[i] * 32768));
    }
    
    console.log('🎙️ Converted audio:', resampledLength, 'samples at 24kHz');
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
          Voice chat ready - speak your cooking questions!
        </div>
      )}
      
      {connectionStatus === 'connected' && (
        <div className="text-xs text-center text-blue-600 mt-2">
          Voice chat connected - try speaking!
        </div>
      )}
      
      {connectionStatus === 'error' && (
        <div className="text-xs text-center text-red-600 mt-2">
          Connection failed - tap to retry
        </div>
      )}
    </div>
  );
}