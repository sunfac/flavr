import { useState, useEffect, useRef, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Mic, MicOff, Send, Volume2, VolumeX } from 'lucide-react';
import { useRecipeStore } from '@/stores/recipeStore';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'assistant';
  timestamp: Date;
  isStreaming?: boolean;
}

interface StreamingChatBotProps {
  currentRecipe?: any;
  onRecipeUpdate?: (recipe: any) => void;
}

export function StreamingChatBot({ currentRecipe, onRecipeUpdate }: StreamingChatBotProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  const speechSynthRef = useRef<SpeechSynthesis | null>(null);
  const currentUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  
  const { updateActiveRecipe } = useRecipeStore();

  // Text-to-speech DISABLED per user request
  useEffect(() => {
    // TTS completely disabled - too robotic per user feedback
    speechSynthRef.current = null;
  }, []);

  // Initialize speech recognition with proper error handling
  useEffect(() => {
    if (typeof window !== 'undefined' && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      try {
        const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
        recognitionRef.current = new SpeechRecognition();
        
        recognitionRef.current.continuous = false;
        recognitionRef.current.interimResults = false;
        recognitionRef.current.lang = 'en-US';
        
        recognitionRef.current.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          setInputValue(transcript);
          setIsListening(false);
        };
        
        recognitionRef.current.onerror = (event: any) => {
          console.log('Speech recognition error:', event.error);
          setIsListening(false);
        };
        
        recognitionRef.current.onend = () => {
          setIsListening(false);
        };
      } catch (error) {
        console.log('Speech recognition not available:', error);
        recognitionRef.current = null;
      }
    }
  }, []);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Memoized conversation memory for context retention
  const conversationHistory = useMemo(() => {
    return messages.slice(-10).map(msg => ({
      role: msg.sender === 'user' ? 'user' : 'assistant',
      content: msg.text
    }));
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isStreaming) return;

    const currentMessage = inputValue;
    const userMessage: Message = {
      id: Date.now().toString(),
      text: currentMessage,
      sender: 'user',
      timestamp: new Date()
    };

    // Build conversation history INCLUDING the current user message for context
    const updatedHistory = [...messages, userMessage].map(msg => ({
      role: msg.sender === 'user' ? 'user' : 'assistant',
      content: msg.text
    }));

    console.log('🧠 Frontend: Sending conversation history with', updatedHistory.length, 'messages');
    console.log('🤖 Frontend: Using Gemini hybrid system');

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsStreaming(true);

    // Create streaming assistant message
    const assistantMessage: Message = {
      id: (Date.now() + 1).toString(),
      text: '',
      sender: 'assistant',
      timestamp: new Date(),
      isStreaming: true
    };

    setMessages(prev => [...prev, assistantMessage]);

    try {
      // Use streaming endpoint for enhanced conversational memory
      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: currentMessage,
          currentRecipe,
          conversationHistory: updatedHistory,
          openAIContext: {
            quizData: currentRecipe?.quizData,
            originalPrompt: currentRecipe?.originalPrompt,
            userPreferences: currentRecipe?.userPreferences
          }
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullResponse = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                
                if (data.type === 'content') {
                  fullResponse += data.content;
                  // Update streaming message
                  setMessages(prev => prev.map(msg => 
                    msg.id === assistantMessage.id 
                      ? { ...msg, text: fullResponse }
                      : msg
                  ));
                } else if (data.type === 'recipeUpdate') {
                  // Live recipe card refresh - force immediate update
                  console.log('🔄 Received recipe update from stream:', data.recipe);
                  
                  // Force recipe store update
                  updateActiveRecipe({
                    ...data.recipe,
                    id: currentRecipe?.id || data.recipe.id,
                    lastUpdated: Date.now() // Force re-render trigger
                  });
                  
                  // Trigger parent callback for recipe card refresh
                  if (onRecipeUpdate) {
                    onRecipeUpdate({
                      ...data.recipe,
                      id: currentRecipe?.id || data.recipe.id,
                      lastUpdated: Date.now()
                    });
                  }
                  
                  // Add confirmation message
                  fullResponse += `\n\n✅ Recipe updated: "${data.recipe.title}"`;
                  setMessages(prev => prev.map(msg => 
                    msg.id === assistantMessage.id 
                      ? { ...msg, text: fullResponse }
                      : msg
                  ));
                } else if (data.type === 'done') {
                  setIsStreaming(false);
                  // Mark message as complete
                  setMessages(prev => prev.map(msg => 
                    msg.id === assistantMessage.id 
                      ? { ...msg, isStreaming: false }
                      : msg
                  ));
                  
                  // TTS disabled - no auto-speak
                } else if (data.type === 'error') {
                  throw new Error(data.message);
                }
              } catch (error) {
                console.error('Error parsing streaming data:', error);
              }
            }
          }
        }
      }
    } catch (error: any) {
      console.error('Streaming chat error:', error);
      setMessages(prev => prev.map(msg => 
        msg.id === assistantMessage.id 
          ? { ...msg, text: 'Sorry, I encountered an error. Please try again.', isStreaming: false }
          : msg
      ));
      setIsStreaming(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const toggleListening = () => {
    if (!recognitionRef.current) return;

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  // Text-to-speech functionality completely removed per user request

  const suggestedQuestions = [
    "Make this recipe spicier",
    "Add a side dish",
    "Make it for 6 people",
    "Can I bake this instead?",
    "Make it dairy-free"
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Compact Header */}
      <div className="flex items-center justify-between p-2 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center">
            <span className="text-white text-xs font-bold">Z</span>
          </div>
          <div>
            <p className="text-sm font-medium text-white">
              {isStreaming ? 'Thinking...' : 'Chat with Zest'}
            </p>
          </div>
        </div>
        {/* TTS controls removed per user request */}
      </div>

      {/* Messages Area - Optimized for visibility */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2 min-h-0">
        {messages.length === 0 && (
          <div className="text-center text-white/70 p-2">
            <p className="text-sm mb-2">Hi! I'm Zest, your cooking assistant.</p>
            {currentRecipe && (
              <p className="text-xs mb-3">I can help modify "{currentRecipe.title}" or answer cooking questions!</p>
            )}
            <div className="flex flex-wrap gap-2 justify-center max-h-16 overflow-y-auto">
              {suggestedQuestions.map((question, index) => (
                <Badge 
                  key={index}
                  variant="secondary"
                  className="cursor-pointer hover:bg-orange-500 hover:text-white transition-colors text-xs px-2 py-1 whitespace-nowrap"
                  onClick={() => setInputValue(question)}
                >
                  {question}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`max-w-[85%] p-2 rounded-lg text-sm ${
              message.sender === 'user' 
                ? 'bg-orange-500 text-white' 
                : 'bg-slate-700/80 text-white border border-slate-600'
            }`}>
              <p className="whitespace-pre-wrap break-words leading-relaxed">
                {message.text}
                {message.isStreaming && (
                  <span className="inline-block w-1 h-3 bg-current ml-1 animate-pulse" />
                )}
              </p>
              <p className="text-xs opacity-60 mt-1">
                {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Compact Input Area */}
      <div className="p-2 border-t border-white/10 bg-slate-800/50">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Input
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={isListening ? "Listening..." : "Ask about cooking..."}
              disabled={isStreaming || isListening}
              className="h-8 text-sm bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400 pr-10"
            />
            {/* Note: Microphone functionality now handled by Google Live Audio Chat above */}
          </div>
          <Button 
            onClick={handleSendMessage} 
            disabled={!inputValue.trim() || isStreaming}
            size="sm"
            className="h-8 px-3 bg-orange-500 hover:bg-orange-600 text-white"
          >
            {isStreaming ? (
              <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Send className="w-3 h-3" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}