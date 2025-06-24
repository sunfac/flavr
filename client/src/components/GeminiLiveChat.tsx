import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, Volume2, VolumeX, Send, Square } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

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
      
      // Create audio context matching Gemini Live format
      audioContextRef.current = new AudioContext({ sampleRate: 24000 });
      
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
      
      // Use the verified Google Live API endpoint format
      const wsUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${apiKey}`;
      console.log('Connecting to Google Live API via verified v1alpha endpoint...');
      
      const ws = new WebSocket(wsUrl);
      websocketRef.current = ws;
      ws.binaryType = 'arraybuffer';
      
      ws.onopen = () => {
        console.log('🌐 Connected to Gemini Live API WebSocket');
        setConnectionStatus('connected');
        setIsConnected(true);
        
        // Test Live API specific models in order of preference
        const testModels = [
          "models/gemini-2.5-flash-preview-native-audio-dialog",
          "models/gemini-2.5-flash-exp-native-audio-thinking-dialog", 
          "models/gemini-live-2.5-flash-preview",
          "models/gemini-2.0-flash-live-001"
        ];
        
        const setupMessage = {
          "setup": {
            "model": testModels[0], // Start with experimental model
            "generationConfig": {
              "responseModalities": ["AUDIO"]
            },
            "inputAudioTranscription": {},
            "outputAudioTranscription": {}
          }
        };
        
        console.log('Sending setup message to Gemini Live');
        console.log('Setup message content:', JSON.stringify(setupMessage, null, 2));
        ws.send(JSON.stringify(setupMessage));
        
        // Store model list for fallback attempts
        ws.userData = { testModels, currentModelIndex: 0 };
        
        // Set a timeout to force ready state if no setup response received
        setTimeout(() => {
          if (websocketRef.current?.readyState === WebSocket.OPEN) {
            console.log('⏰ Timeout reached - forcing ready state for testing');
            setConnectionStatus('ready');
            setIsListening(true);
            startAudioStreaming();
          }
        }, 2000);
      };
      
      ws.onmessage = (event) => {
        console.log('🔄 Raw message received from Gemini Live:', event.data);
        
        if (typeof event.data === 'string') {
          // Check if it's an empty string or just whitespace
          if (!event.data.trim()) {
            console.log('⚠️ Received empty string from API');
            return;
          }
          
          try {
            const message = JSON.parse(event.data);
            console.log('📋 Parsed Gemini Live message:', JSON.stringify(message, null, 2));
            
            // Handle setup complete
            if (message.setupComplete) {
              console.log('✅ Setup complete - ready for conversation');
              setConnectionStatus('ready');
              setIsListening(true);
              startAudioStreaming();
              return;
            }
            
            // Also check for setup.done or similar
            if (message.setup?.done || message.setup?.status === 'complete') {
              console.log('✅ Setup done - ready for conversation');
              setConnectionStatus('ready');
              setIsListening(true);
              startAudioStreaming();
              return;
            }
            
            // Force ready state if we get any setup response
            if (message.setup || message.setupResponse) {
              console.log('🔧 Setup response received - forcing ready state');
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
            
            // Check for different response formats that Gemini Live might send
            if (message.candidates && message.candidates.length > 0) {
              console.log('📥 Found candidates in response');
              const candidate = message.candidates[0];
              if (candidate.content && candidate.content.parts) {
                candidate.content.parts.forEach((part: any, index: number) => {
                  console.log(`🔍 Candidate part ${index}:`, part);
                  if (part.text) {
                    console.log('💬 Text response from candidate:', part.text);
                  }
                  if (part.inlineData) {
                    console.log('🎵 Audio response in candidate');
                    playAudio(part.inlineData.data);
                  }
                });
              }
            }
            
            // Check for server content format
            if (message.serverContent?.modelTurn) {
              console.log('📥 Found modelTurn in serverContent');
              const modelTurn = message.serverContent.modelTurn;
              if (modelTurn.parts) {
                modelTurn.parts.forEach((part: any, index: number) => {
                  console.log(`🔍 ModelTurn part ${index}:`, part);
                  if (part.text) {
                    console.log('💬 Text response from modelTurn:', part.text);
                  }
                  if (part.inlineData) {
                    console.log('🎵 Audio response in modelTurn');
                    playAudio(part.inlineData.data);
                  }
                });
              }
            }
            
            // Check for setup completion confirmation
            if (message.setupComplete || message.type === 'setupComplete') {
              console.log('✅ Setup confirmed by Live API - connection ready');
              setConnectionStatus('ready');
              setIsListening(true);
              startAudioStreaming();
            }
            
            // Check for API errors
            if (message.error) {
              console.log('❌ Live API Error received:', message.error);
            }
            
            // Log any other message types
            if (!message.setupComplete && !message.serverContent && !message.setup && !message.setupResponse) {
              console.log('🔍 Unknown message type with keys:', Object.keys(message));
              console.log('🔍 Full unknown message:', message);
            }
            
          } catch (error) {
            console.error('❌ Error parsing JSON message:', error);
          }
        } else if (event.data instanceof ArrayBuffer) {
          console.log('📦 Received binary ArrayBuffer, length:', event.data.byteLength);
          // Play Gemini Live PCM audio data
          if (event.data.byteLength > 0) {
            playAudio(event.data);
          }
        } else {
          console.log('📦 Received data of type:', typeof event.data, 'data:', event.data);
        }
      };
      
      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        console.error('WebSocket readyState:', ws.readyState);
        console.error('WebSocket URL:', ws.url);
        setConnectionStatus('error');
      };
      
      ws.onclose = (event) => {
        console.log('Disconnected from Gemini Live');
        console.log('Close event code:', event.code);
        console.log('Close event reason:', event.reason);
        console.log('Close event wasClean:', event.wasClean);
        
        // Log specific error codes and suggest fixes
        if (event.code === 1002) {
          console.error('❌ Protocol error - invalid message format. Will try alternative formats.');
        } else if (event.code === 1003) {
          console.error('❌ Unsupported data - check message content. Will try minimal setup.');
        } else if (event.code === 1008) {
          console.error('❌ Policy violation - check API key or permissions.');
        } else if (event.code === 1011) {
          console.error('❌ Server error - unexpected condition on Google servers.');
        } else if (event.code === 1006) {
          console.error('❌ Abnormal closure - connection lost unexpectedly.');
        } else if (event.code === 1000) {
          console.log('✅ Normal closure - connection ended gracefully');
        } else {
          console.error(`❌ Unknown close code: ${event.code}`);
        }
        
        setIsConnected(false);
        setConnectionStatus('disconnected');
        
        // Attempt fallback with next Live API model if available
        if (event.code === 1008 && ws.userData?.testModels && ws.userData.currentModelIndex < ws.userData.testModels.length - 1) {
          console.log('🔄 Model not supported, trying next Live API model...');
          const nextIndex = ws.userData.currentModelIndex + 1;
          const nextModel = ws.userData.testModels[nextIndex];
          console.log(`Testing Live API model: ${nextModel}`);
          
          // Update model index and retry
          setTimeout(() => {
            setConnectionStatus('connecting');
            const newWs = new WebSocket(`wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${import.meta.env.VITE_GEMINI_API_KEY}`);
            websocketRef.current = newWs;
            newWs.binaryType = 'arraybuffer';
            
            newWs.onopen = () => {
              console.log(`🌐 Connected with model: ${nextModel}`);
              setConnectionStatus('connected');
              setIsConnected(true);
              
              const setupMessage = {
                "setup": {
                  "model": nextModel,
                  "generationConfig": {
                    "responseModalities": ["AUDIO"]
                  },
                  "inputAudioTranscription": {},
                  "outputAudioTranscription": {}
                }
              };
              
              console.log('Sending setup with fallback model:', JSON.stringify(setupMessage, null, 2));
              newWs.send(JSON.stringify(setupMessage));
              newWs.userData = { testModels: ws.userData.testModels, currentModelIndex: nextIndex };
            };
            
            // Reattach event handlers
            newWs.onmessage = ws.onmessage;
            newWs.onerror = ws.onerror;
            newWs.onclose = ws.onclose;
          }, 1000);
        } else {
          cleanup();
        }
      };
      
    } catch (error) {
      console.error('Failed to connect:', error);
      setConnectionStatus('error');
    }
  };

  const startAudioStreaming = useCallback(() => {
    if (!streamRef.current || !audioContextRef.current || !websocketRef.current) return;
    
    console.log('Starting continuous audio streaming to Gemini Live');
    
    const source = audioContextRef.current.createMediaStreamSource(streamRef.current);
    const processor = audioContextRef.current.createScriptProcessorNode(4096, 1, 1);
    processorRef.current = processor;
    
    let chunkCount = 0;
    processor.onaudioprocess = (event) => {
      if (websocketRef.current?.readyState === WebSocket.OPEN && isListening) {
        const inputBuffer = event.inputBuffer.getChannelData(0);
        
        // Check for audio activity (basic voice detection)
        const sum = inputBuffer.reduce((acc, val) => acc + Math.abs(val), 0);
        const average = sum / inputBuffer.length;
        
        // Log audio levels for debugging (every 50 chunks)
        chunkCount++;
        if (chunkCount % 50 === 0) {
          console.log(`🎤 Audio level: ${average.toFixed(6)} (threshold: 0.001) - chunk ${chunkCount}`);
        }
        
        if (average > 0.001) { // Voice activity detected
          // Convert to 16-bit PCM
          const pcmData = new Int16Array(inputBuffer.length);
          for (let i = 0; i < inputBuffer.length; i++) {
            pcmData[i] = Math.max(-32768, Math.min(32767, inputBuffer[i] * 32768));
          }
          
          // Send audio data using Gemini Live format
          const audioMessage = {
            realtime_input: {
              media_chunks: [{
                mime_type: "audio/pcm",
                data: btoa(String.fromCharCode.apply(null, new Uint8Array(pcmData.buffer)))
              }]
            }
          };
          
          console.log(`📤 Sending audio chunk ${chunkCount} (${pcmData.length} samples, level: ${average.toFixed(4)})`);
          websocketRef.current.send(JSON.stringify(audioMessage));
          
          try {
            websocketRef.current.send(JSON.stringify(audioMessage));
          } catch (error) {
            console.error('❌ Failed to send audio message:', error);
          }
        } else {
          // Log silence detection for debugging  
          if (chunkCount % 200 === 0) {
            console.log(`🔇 Silence detected (level: ${average.toFixed(6)}) - chunk ${chunkCount}`);
          }
        }
      }
    };
    
    source.connect(processor);
    processor.connect(audioContextRef.current.destination);
    processorRef.current = processor;
    
    console.log('Audio streaming active');
  }, [isListening]);

  // Buffer management for continuous audio playback
  const audioBufferQueue = useRef<ArrayBuffer[]>([]);
  const isPlaying = useRef(false);

  const playAudio = async (audioBuffer: ArrayBuffer) => {
    try {
      if (!isMuted && audioContextRef.current) {
        // Add to queue for continuous playback
        audioBufferQueue.current.push(audioBuffer);
        
        if (!isPlaying.current) {
          processAudioQueue();
        }
      }
    } catch (error) {
      console.error('❌ Error queuing Gemini audio:', error);
    }
  };

  const processAudioQueue = async () => {
    if (isPlaying.current || audioBufferQueue.current.length === 0) return;
    
    isPlaying.current = true;
    console.log('🎵 Processing audio queue, chunks:', audioBufferQueue.current.length);
    
    try {
      while (audioBufferQueue.current.length > 0) {
        const audioBuffer = audioBufferQueue.current.shift()!;
        
        // Handle odd byte lengths by padding to even number
        let processedBuffer = audioBuffer;
        if (audioBuffer.byteLength % 2 !== 0) {
          const paddedBuffer = new ArrayBuffer(audioBuffer.byteLength + 1);
          const paddedView = new Uint8Array(paddedBuffer);
          const originalView = new Uint8Array(audioBuffer);
          paddedView.set(originalView);
          paddedView[audioBuffer.byteLength] = 0;
          processedBuffer = paddedBuffer;
        }
        
        // Gemini Live sends raw 16-bit PCM at 24kHz mono
        const pcmData = new Int16Array(processedBuffer);
        
        if (pcmData.length === 0) continue;
        
        // Create AudioBuffer for Web Audio API
        const audioBufferDecoded = audioContextRef.current!.createBuffer(1, pcmData.length, 24000);
        const channelData = audioBufferDecoded.getChannelData(0);
        
        // Convert 16-bit PCM to float32 (-1 to 1 range)
        for (let i = 0; i < pcmData.length; i++) {
          channelData[i] = pcmData[i] / 32768.0;
        }
        
        // Play using Web Audio API
        const source = audioContextRef.current!.createBufferSource();
        source.buffer = audioBufferDecoded;
        
        const gainNode = audioContextRef.current!.createGain();
        gainNode.gain.value = 0.8; // Comfortable volume
        
        source.connect(gainNode);
        gainNode.connect(audioContextRef.current!.destination);
        
        source.start();
        
        // Wait for this chunk to finish before playing next
        await new Promise(resolve => {
          source.onended = resolve;
          setTimeout(resolve, audioBufferDecoded.duration * 1000 + 10); // Backup timeout
        });
      }
      
      console.log('✅ Audio queue processed completely');
    } catch (error) {
      console.error('❌ Error processing audio queue:', error);
    } finally {
      isPlaying.current = false;
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

  const sendTestMessage = () => {
    if (websocketRef.current?.readyState === WebSocket.OPEN) {
      console.log('🧪 Sending test text message via Live API');
      const testMessage = {
        client_content: {
          turns: [{
            role: "user",
            parts: [{
              text: "Hello Zest, please respond with a short greeting to test our connection."
            }]
          }],
          turn_complete: true
        }
      };
      console.log('📤 Test message content:', JSON.stringify(testMessage, null, 2));
      websocketRef.current.send(JSON.stringify(testMessage));
    } else {
      console.log('❌ WebSocket not ready for test message');
    }
  };

  const endCurrentTurn = () => {
    if (websocketRef.current?.readyState === WebSocket.OPEN) {
      console.log('🔚 Ending current turn to trigger response');
      const turnCompleteMessage = {
        client_content: {
          turn_complete: true
        }
      };
      websocketRef.current.send(JSON.stringify(turnCompleteMessage));
    }
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
        <div className="space-y-2">
          <div className="flex items-center justify-center space-x-2 text-xs text-gray-600 dark:text-gray-400">
            <div className={`w-2 h-2 rounded-full ${isListening ? 'bg-red-500 animate-pulse' : 'bg-gray-400'}`} />
            <span>Audio streaming active</span>
          </div>
          
          <div className="flex gap-2 justify-center">
            <Button
              onClick={sendTestMessage}
              variant="outline"
              size="sm"
              className="text-xs bg-blue-50 hover:bg-blue-100 border-blue-200"
            >
              <Send className="w-3 h-3 mr-1" />
              Test Text
            </Button>
            <Button
              onClick={endCurrentTurn}
              variant="outline"
              size="sm"
              className="text-xs bg-orange-50 hover:bg-orange-100 border-orange-200"
            >
              <Square className="w-3 h-3 mr-1" />
              End Turn
            </Button>
          </div>
          
          <div className="text-xs text-center text-gray-500">
            Speak naturally - audio levels are being monitored
          </div>
        </div>
      )}
      
      {/* Debug info always visible */}
      <div className="text-xs text-center text-gray-400 mt-2">
        Status: {connectionStatus} | Listening: {isListening ? 'Yes' : 'No'} | Connected: {isConnected ? 'Yes' : 'No'}
      </div>
    </div>
  );
}