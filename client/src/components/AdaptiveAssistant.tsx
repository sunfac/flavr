import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { iconMap } from "@/lib/iconMap";
import { useRecipeStore, recipeActions, Step } from "@/stores/recipeStore";
import { useTimerStore } from "@/stores/timerStore";
import { Mic, MicOff, Send, Volume2, VolumeX, Radio } from 'lucide-react';

interface Message {
  id: string;
  message?: string; // Legacy support for ChatBot format
  text: string;
  sender: 'user' | 'assistant';
  isUser: boolean; // Legacy support for ChatBot format
  response?: string; // Legacy support for ChatBot format
  timestamp: Date;
  isStreaming?: boolean;
  isConfirmation?: boolean;
  originalMessage?: string;
  isRecipeCreated?: boolean;
  recipeTitle?: string;
  suggestedRecipeTitle?: string;
  savedRecipeId?: number;
  waitingForAlternative?: boolean;
  originalContext?: string;
  suggestedActions?: Array<{
    type: 'quick_recipe' | 'full_recipe' | 'continue_chat';
    label: string;
    data?: any;
  }>;
  requiresIntentClarification?: boolean;
  clarificationOptions?: Array<{
    type: 'quick_recipe' | 'full_recipe' | 'recipe_options' | 'continue_chat';
    label: string;
    description: string;
    icon: string;
  }>;
  isOptimized?: boolean;
  metadata?: {
    modelUsed: string;
    processingTimeMs: number;
    estimatedCost: number;
  };
}

interface Recipe {
  id?: number;
  title: string;
  description: string;
  ingredients: string[];
  instructions: string[];
  cookTime?: number;
  servings?: number;
  difficulty?: string;
  cuisine?: string;
  imageUrl?: string;
  shoppingList?: string[];
}

interface AdaptiveAssistantProps {
  currentRecipe?: Recipe;
  onRecipeUpdate?: (updatedRecipe: Recipe) => void;
  currentMode?: "discover" | "plan" | "capture" | "cookbook";
  chatContext?: "cooking" | "recipe-editing";
  isOpen?: boolean;
  onClose?: () => void;
  enableVoice?: boolean;
  enableLiveAudio?: boolean;
}

export default function AdaptiveAssistant({ 
  currentRecipe, 
  onRecipeUpdate, 
  currentMode = "discover",
  chatContext = "cooking",
  isOpen = true,
  onClose,
  enableVoice = true,
  enableLiveAudio = false
}: AdaptiveAssistantProps) {
  // Authentication check
  const { data: userData } = useQuery({
    queryKey: ["/api/me"],
    retry: false,
  });
  const isAuthenticated = !!(userData as any)?.user;

  // State management
  const [inputValue, setInputValue] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [showLiveAudio, setShowLiveAudio] = useState(false);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  // Stores
  const recipeStore = useRecipeStore();
  const timerStore = useTimerStore();
  const { toast } = useToast();
  const [, navigate] = useLocation();

  // Initialize speech recognition
  useEffect(() => {
    if (!enableVoice) return;
    
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
  }, [enableVoice]);

  // Get current recipe context
  const getCurrentRecipeContext = () => {
    const activeRecipe = currentRecipe || {
      title: recipeStore.meta.title,
      description: recipeStore.meta.description,
      ingredients: recipeStore.ingredients,
      instructions: recipeStore.steps.map((step: Step) => step.description),
      cookTime: recipeStore.meta.cookTime,
      servings: recipeStore.servings || 4,
      difficulty: recipeStore.meta.difficulty
    };

    return {
      recipe: {
        ...activeRecipe,
        description: activeRecipe.description || ""
      } as Recipe,
      hasRecipe: !!(activeRecipe.title && activeRecipe.ingredients?.length > 0),
      currentMode: currentMode
    };
  };

  // Generate unique key for current recipe to persist chat per recipe
  const getRecipeKey = () => {
    const recipe = getCurrentRecipeContext().recipe;
    if (!recipe || !recipe.title) return 'no-recipe';
    return `recipe-${recipe.title.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}`;
  };

  // Save and load chat history
  const saveChatHistory = (messages: Message[]) => {
    const recipeKey = getRecipeKey();
    localStorage.setItem(`adaptive-chat-history-${recipeKey}`, JSON.stringify(messages));
  };

  const loadChatHistory = (): Message[] => {
    const recipeKey = getRecipeKey();
    const saved = localStorage.getItem(`adaptive-chat-history-${recipeKey}`);
    return saved ? JSON.parse(saved) : [];
  };

  // Load chat history on mount
  useEffect(() => {
    const history = loadChatHistory();
    setMessages(history);
  }, [currentRecipe?.title]);

  // Save messages when they change
  useEffect(() => {
    saveChatHistory(messages);
  }, [messages]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Conversation history for context
  const conversationHistory = useMemo(() => {
    return messages.slice(-10).map(msg => ({
      role: msg.sender === 'user' ? 'user' : 'assistant',
      content: msg.text || msg.message || ''
    }));
  }, [messages]);

  // Voice input toggle
  const toggleListening = () => {
    if (!recognitionRef.current || !enableVoice) return;

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  // Optimized chat mutation
  const optimizedChatMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch('/api/chat/optimized', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return response.json();
    },
    onSuccess: (response: any) => {
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: response.message || response.response,
        sender: 'assistant',
        isUser: false,
        timestamp: new Date(),
        suggestedActions: response.suggestedActions,
        requiresIntentClarification: response.requiresIntentClarification,
        clarificationOptions: response.clarificationOptions,
        isOptimized: true,
        metadata: response.metadata
      };
      
      setMessages(prev => [...prev, assistantMessage]);
      setIsStreaming(false);
    },
    onError: (error) => {
      console.error('Optimized chat error:', error);
      setIsStreaming(false);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive"
      });
    }
  });

  // Gemini streaming chat mutation
  const streamingChatMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch('/api/gemini-streaming-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return response;
    },
    onSuccess: async (response: Response) => {
      if (!response.body) return;

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      // Create streaming assistant message
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: '',
        sender: 'assistant',
        isUser: false,
        timestamp: new Date(),
        isStreaming: true
      };

      setMessages(prev => [...prev, assistantMessage]);

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.content) {
                  setMessages(prev => prev.map(msg => 
                    msg.id === assistantMessage.id 
                      ? { ...msg, text: msg.text + data.content }
                      : msg
                  ));
                }
                
                if (data.done) {
                  setMessages(prev => prev.map(msg => 
                    msg.id === assistantMessage.id 
                      ? { ...msg, isStreaming: false }
                      : msg
                  ));
                  setIsStreaming(false);
                }

                if (data.recipeUpdate) {
                  // Handle recipe updates from streaming
                  onRecipeUpdate?.(data.recipeUpdate);
                }
              } catch (parseError) {
                console.error('Error parsing streaming data:', parseError);
              }
            }
          }
        }
      } catch (streamError) {
        console.error('Error reading stream:', streamError);
        setIsStreaming(false);
      }
    },
    onError: (error) => {
      console.error('Streaming chat error:', error);
      setIsStreaming(false);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive"
      });
    }
  });

  // Send message handler
  const handleSendMessage = async () => {
    if (!inputValue.trim() || isStreaming) return;

    const currentMessage = inputValue;
    const userMessage: Message = {
      id: Date.now().toString(),
      text: currentMessage,
      message: currentMessage, // Legacy support
      sender: 'user',
      isUser: true,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsStreaming(true);

    const context = getCurrentRecipeContext();
    
    const requestData = {
      message: currentMessage,
      conversationHistory: [...conversationHistory, { role: 'user', content: currentMessage }],
      currentRecipe: context.hasRecipe ? context.recipe : undefined,
      userContext: {
        userId: isAuthenticated ? (userData as any)?.user?.id : undefined,
        pseudoUserId: !isAuthenticated ? localStorage.getItem('flavrUserId') : undefined,
        isAuthenticated,
      },
      chatContext,
      currentMode
    };

    // Use optimized chat for most interactions, streaming for complex recipe modifications
    if (chatContext === 'recipe-editing' && context.hasRecipe) {
      streamingChatMutation.mutate(requestData);
    } else {
      optimizedChatMutation.mutate(requestData);
    }
  };

  // Handle suggested actions
  const handleSuggestedAction = (action: any) => {
    if (action.type === 'quick_recipe' || action.type === 'full_recipe') {
      setInputValue(action.label);
      handleSendMessage();
    } else if (action.data?.navigate) {
      navigate(action.data.navigate);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="flex flex-col h-full bg-slate-900 text-white">
      {/* Header */}
      <CardHeader className="flex flex-row items-center justify-between p-4 border-b border-slate-700">
        <div className="flex items-center space-x-2">
          <iconMap.sparkles className="w-5 h-5 text-orange-400" />
          <h3 className="text-lg font-semibold">AI Assistant</h3>
          {currentMode && (
            <Badge variant="outline" className="text-xs">
              {currentMode.charAt(0).toUpperCase() + currentMode.slice(1)}
            </Badge>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          {enableLiveAudio && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowLiveAudio(!showLiveAudio)}
              className={`${showLiveAudio ? 'bg-red-500/20 text-red-400 border-red-500/50' : ''}`}
            >
              <Radio className="w-4 h-4" />
            </Button>
          )}
          
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose}>
              <iconMap.x className="w-4 h-4" />
            </Button>
          )}
        </div>
      </CardHeader>

      {/* Messages */}
      <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-lg p-3 ${
              msg.sender === 'user' 
                ? 'bg-orange-500 text-white' 
                : 'bg-slate-700 text-slate-100'
            }`}>
              <p className="text-sm">{msg.text || msg.message || msg.response}</p>
              
              {/* Suggested Actions */}
              {msg.suggestedActions && msg.suggestedActions.length > 0 && (
                <div className="mt-3 space-y-2">
                  {msg.suggestedActions.map((action, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      size="sm"
                      onClick={() => handleSuggestedAction(action)}
                      className="w-full text-left justify-start"
                    >
                      {action.label}
                    </Button>
                  ))}
                </div>
              )}

              {/* Clarification Options */}
              {msg.clarificationOptions && msg.clarificationOptions.length > 0 && (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {msg.clarificationOptions.map((option, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      size="sm"
                      onClick={() => handleSuggestedAction(option)}
                      className="text-xs"
                    >
                      {option.icon && <span className="mr-1">{option.icon}</span>}
                      {option.label}
                    </Button>
                  ))}
                </div>
              )}

              {/* Metadata for optimized responses */}
              {msg.metadata && msg.isOptimized && (
                <div className="mt-2 text-xs opacity-70">
                  {msg.metadata.modelUsed} • {msg.metadata.processingTimeMs}ms
                </div>
              )}

              {/* Streaming indicator */}
              {msg.isStreaming && (
                <div className="mt-2 flex items-center space-x-1">
                  <div className="w-2 h-2 bg-orange-400 rounded-full animate-pulse"></div>
                  <span className="text-xs opacity-70">AI is thinking...</span>
                </div>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </CardContent>

      {/* Input Area */}
      <div className="p-4 border-t border-slate-700">
        <div className="flex items-center space-x-2">
          <div className="flex-1 relative">
            <Input
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Ask me anything about cooking..."
              className="bg-slate-800 border-slate-600 text-white pr-12"
              disabled={isStreaming}
              data-testid="input-chat-message"
            />
            
            {enableVoice && recognitionRef.current && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={toggleListening}
                className={`absolute right-2 top-1/2 transform -translate-y-1/2 p-1 ${
                  isListening ? 'text-red-400' : 'text-slate-400 hover:text-white'
                }`}
                data-testid="button-voice-input"
              >
                {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </Button>
            )}
          </div>
          
          <Button
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isStreaming}
            size="sm"
            className="bg-orange-500 hover:bg-orange-600"
            data-testid="button-send-message"
          >
            {isStreaming ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
        
        {isListening && (
          <div className="mt-2 flex items-center justify-center space-x-2 text-sm text-slate-400">
            <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse"></div>
            <span>Listening...</span>
          </div>
        )}
      </div>
    </div>
  );
}