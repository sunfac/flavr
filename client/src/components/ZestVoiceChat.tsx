import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, Volume2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

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
  className = "",
  recipeContext 
}: ZestVoiceChatProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState('');
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

  // Get AI response and speak it
  const getVoiceResponse = async (transcript: string) => {
    try {
      const contextPrompt = recipeContext ? `
You are Zest, helping with: ${recipeContext.title}
Current step: ${recipeContext.currentStep + 1} of ${recipeContext.totalSteps}
Current instruction: ${recipeContext.instructions[recipeContext.currentStep] || 'Recipe complete'}
Available ingredients: ${recipeContext.ingredients.join(', ')}

Respond naturally and helpfully in a conversational tone.
` : 'You are Zest, a helpful cooking assistant. Respond conversationally.';

      const response = await fetch('/api/chat/voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: transcript,
          context: contextPrompt
        })
      });

      if (!response.ok) throw new Error('Failed to get response');
      
      const data = await response.json();
      
      // Speak the response
      if ('speechSynthesis' in window && data.response) {
        const utterance = new SpeechSynthesisUtterance(data.response);
        utterance.rate = 0.9;
        utterance.pitch = 1.0;
        utterance.volume = 0.8;
        speechSynthesis.speak(utterance);
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