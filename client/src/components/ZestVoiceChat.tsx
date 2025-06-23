import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, Volume2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

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
  const [isRecording, setIsRecording] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState('');
  const [lastResponse, setLastResponse] = useState('');
  const recognitionRef = useRef<any>(null);
  const { toast } = useToast();

  // Initialize voice chat
  const initializeVoiceChat = async () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      toast({
        title: "Voice Not Supported",
        description: "Your browser doesn't support voice recognition",
        variant: "destructive"
      });
      return;
    }

    try {
      // Request microphone permission
      await navigator.mediaDevices.getUserMedia({ audio: true });
      setIsConnected(true);
      toast({
        title: "Voice Chat Ready",
        description: "You can now talk to Zest!"
      });
    } catch (error) {
      toast({
        title: "Microphone Access Required", 
        description: "Please allow microphone access to use voice chat",
        variant: "destructive"
      });
    }
  };

  // Start/stop recording
  const toggleRecording = async () => {
    if (!isConnected) {
      await initializeVoiceChat();
      return;
    }

    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  // Start speech recognition
  const startRecording = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';
    
    recognition.onstart = () => {
      setIsRecording(true);
    };
    
    recognition.onresult = async (event: any) => {
      const transcript = event.results[0][0].transcript;
      setLastMessage(transcript);
      
      // Send to chat
      if (onChatMessage) {
        onChatMessage(transcript);
      }
      
      // Get AI response and speak it
      await getVoiceResponse(transcript);
    };
    
    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setIsRecording(false);
      toast({
        title: "Voice Recognition Error",
        description: "Could not understand speech. Try again.",
        variant: "destructive"
      });
    };
    
    recognition.onend = () => {
      setIsRecording(false);
    };
    
    recognitionRef.current = recognition;
    recognition.start();
  };

  // Stop recording
  const stopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsRecording(false);
  };

  // Get AI response with full context and natural voice
  const getVoiceResponse = async (transcript: string) => {
    try {
      // Use the same chat endpoint that maintains context and can modify recipes
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: transcript,
          currentRecipe: recipeContext ? {
            id: 'voice-recipe',
            title: recipeContext.title,
            ingredients: recipeContext.ingredients,
            instructions: recipeContext.instructions,
            servings: 2,
            cookTime: 30,
            difficulty: 'Medium'
          } : null,
          mode: 'voice'
        })
      });

      if (!response.ok) throw new Error('Failed to get response');
      
      const data = await response.json();
      
      // Generate natural voice audio using OpenAI TTS
      if (data.response) {
        setLastResponse(data.response);
        
        // Add AI response to chat history
        if (onAIResponse) {
          onAIResponse(data.response);
        }
        
        await generateNaturalVoice(data.response);
      }
      
      // Handle any recipe updates from function calls
      if (data.functionCalls && data.functionCalls.length > 0) {
        // Recipe was updated via voice command
        console.log('Recipe updated via voice:', data.functionCalls);
      }
      
    } catch (error) {
      console.error('Error getting voice response:', error);
      toast({
        title: "Response Error",
        description: "Could not get response from Zest",
        variant: "destructive"
      });
    }
  };

  // Generate natural voice using OpenAI TTS API
  const generateNaturalVoice = async (text: string) => {
    try {
      const response = await fetch('/api/chat/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: text,
          voice: 'nova' // Natural female voice
        })
      });

      if (!response.ok) throw new Error('Failed to generate voice');
      
      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      
      audio.onended = () => URL.revokeObjectURL(audioUrl);
      await audio.play();
      
    } catch (error) {
      console.error('Error generating natural voice:', error);
      // Fallback to browser TTS
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.9;
        utterance.pitch = 1.0;
        utterance.volume = 0.8;
        speechSynthesis.speak(utterance);
      }
    }
  };

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
              : "bg-slate-700 hover:bg-slate-600"
        }`}
      >
        {isRecording ? (
          <MicOff className="w-6 h-6 text-white" />
        ) : (
          <Mic className="w-6 h-6 text-white" />
        )}
      </Button>

      {/* Status and Instructions */}
      <div className="text-center">
        <p className="text-xs text-slate-400 mb-1">
          {isRecording 
            ? "Listening..." 
            : isConnected 
              ? "Tap to talk to Zest" 
              : "Tap to start voice chat"
          }
        </p>
        
        {lastMessage && (
          <div className="max-w-48 p-2 bg-slate-800/50 rounded-lg border border-slate-600">
            <div className="flex items-center space-x-1 mb-1">
              <Volume2 className="w-3 h-3 text-orange-400" />
              <span className="text-xs text-orange-400">You said:</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">"{lastMessage}"</p>
          </div>
        )}
      </div>
    </div>
  );
}