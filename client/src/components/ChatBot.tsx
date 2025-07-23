import React, { useState, useRef, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { iconMap } from "@/lib/iconMap";
import { useRecipeStore, recipeActions } from "@/stores/recipeStore";
import { useTimerStore } from "@/stores/timerStore";


interface ChatMessage {
  id: number;
  message: string;
  response: string;
  isUser: boolean;
  text: string;
  timestamp: Date;
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

interface ChatBotProps {
  currentRecipe?: Recipe;
  onRecipeUpdate?: (updatedRecipe: Recipe) => void;
  currentMode?: "shopping" | "fridge" | "chef";
}

export default function ChatBot({ 
  currentRecipe, 
  onRecipeUpdate, 
  currentMode,
  isOpen = true,
  onClose
}: ChatBotProps & { isOpen?: boolean; onClose?: () => void }) {
  // Use isOpen prop if provided, otherwise default to true
  const actualIsOpen = isOpen !== undefined ? isOpen : true;
  const [message, setMessage] = useState("");
  const [localMessages, setLocalMessages] = useState<ChatMessage[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(true);
  
  // Connect to global recipe store
  const recipeStore = useRecipeStore();
  const timerStore = useTimerStore();
  const [hasInitialized, setHasInitialized] = useState(false);
  const [hasShownWelcome, setHasShownWelcome] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const [location] = useLocation();

  // Get current mode from URL if not provided
  const detectedMode = currentMode || 
    (location.includes('/shopping') ? 'shopping' : 
     location.includes('/fridge') ? 'fridge' : 
     location.includes('/chef') ? 'chef' : undefined);

  // Conversation suggestion chips with Lucide icons
  const suggestionChips = [
    { text: "Make it spicier", icon: iconMap.flame, updatesRecipe: true },
    { text: "Suggest a side dish", icon: iconMap.utensilsCrossed, updatesRecipe: false },
    { text: "What can I prep ahead?", icon: iconMap.clock, updatesRecipe: false },
    { text: "Give me a wine pairing", icon: iconMap.wine, updatesRecipe: false },
    { text: "Swap an ingredient", icon: iconMap.refresh, updatesRecipe: true },
    { text: "Simplify the method", icon: iconMap.zap, updatesRecipe: true },
    { text: "Convert measurements", icon: iconMap.scale, updatesRecipe: true },
    { text: "Make a sauce", icon: iconMap.droplets, updatesRecipe: false }
  ];

  // Get chat history
  const { data: historyData } = useQuery({
    queryKey: ["/api/chat/history"],
    enabled: isOpen,
  });

  // Extract history from response
  const chatHistory = Array.isArray(historyData) ? historyData : (historyData as any)?.history || [];

  // Get current recipe data from store or props with full context
  const getCurrentRecipeContext = () => {
    const activeRecipe = currentRecipe || {
      title: recipeStore.meta.title,
      description: recipeStore.meta.description,
      cookTime: recipeStore.meta.cookTime,
      servings: recipeStore.servings,
      difficulty: recipeStore.meta.difficulty,
      cuisine: recipeStore.meta.cuisine,
      ingredients: recipeStore.ingredients.map(ing => ing.text),
      instructions: recipeStore.steps.map(step => step.description),
      tips: "",
      image: recipeStore.meta.image
    };

    return {
      recipe: activeRecipe,
      mode: detectedMode,
      currentStep: recipeStore.currentStep,
      completedSteps: recipeStore.completedSteps,
      activeTimers: Object.keys(timerStore.timers).filter(id => timerStore.timers[id].isActive)
    };
  };

  // Send chat message with function calling support
  const sendMessageMutation = useMutation({
    mutationFn: async (data: { message: string; currentRecipe?: Recipe; mode?: string }) => {
      // Build conversation history from local messages (not chatHistory from db)
      const conversationHistory = localMessages.map(msg => ({
        role: msg.isUser ? 'user' : 'assistant',
        content: msg.isUser ? msg.message : msg.response
      }));
      
      const response = await fetch("/api/chat/stream", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: data.message,
          conversationHistory, // Use local messages for continuity
          currentRecipe: getCurrentRecipeContext().recipe,
          openAIContext: getCurrentRecipeContext()
        }),
      });

      if (!response.ok) {
        throw new Error(`Chat request failed: ${response.statusText}`);
      }

      // Read streaming response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullResponse = "";
      let functionCalls: any[] = [];

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              
              if (data.done) {
                break;
              }
              
              if (data.content) {
                fullResponse += data.content;
              }
              
              if (data.function_call) {
                functionCalls.push(data.function_call);
              }
              
              if (data.type === 'recipeUpdate' && data.recipe) {
                // Handle recipe update from server
                functionCalls.push({
                  name: 'updateRecipe',
                  arguments: data.recipe
                });
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }

      return { 
        response: fullResponse,
        functionCalls 
      };
    },
    onSuccess: async (result) => {
      // Result is already parsed from streaming response
      
      console.log('🔍 CHAT RESPONSE RECEIVED:', {
        hasFunctionCalls: !!result.functionCalls,
        responseLength: result.response?.length || 0
      });
      
      const newMessage: ChatMessage = {
        id: Date.now(),
        message,
        response: result.response,
        isUser: false,
        text: result.response,
        timestamp: new Date(),
      };
      // Don't add the message to local state yet - preserve chat history
      setMessage("");

      // Handle OpenAI function calls for live recipe updates FIRST
      console.log('🔍 CHATBOT RESPONSE:', {
        hasFunctionCalls: !!result.functionCalls,
        functionCallsLength: result.functionCalls?.length || 0,
        functionCalls: result.functionCalls
      });

      if (result.functionCalls && Array.isArray(result.functionCalls)) {
        console.log('🎯 Processing function calls:', result.functionCalls);
        result.functionCalls.forEach((functionCall: any) => {
          if (functionCall.name === 'updateRecipe') {
            try {
              // Parse the arguments if they're a string
              const args = typeof functionCall.arguments === 'string' 
                ? JSON.parse(functionCall.arguments) 
                : functionCall.arguments;
              
              console.log(`🔧 EXECUTING Function Call: updateRecipe`, args);
              
              // Update the recipe with the new data
              console.log('🔄 Updating recipe in store with:', args);
              
              // Use the updateActiveRecipe action which handles both formats
              recipeActions.updateActiveRecipe(args);
              
              // Force a re-render by updating the recipe in parent component if available
              if (onRecipeUpdate) {
                onRecipeUpdate(args);
              }
              
              // Show confirmation message
              const updateMessage: ChatMessage = {
                id: Date.now() + 1,
                message: "",
                response: "✅ Recipe updated! I've made the changes you requested.",
                isUser: false,
                text: "✅ Recipe updated! I've made the changes you requested.",
                timestamp: new Date(),
              };
              setTimeout(() => {
                setLocalMessages(prev => [...prev, updateMessage]);
              }, 500);
              
              console.log('✅ Recipe store updated successfully');
              
            } catch (error) {
              console.error('Error processing function call:', error);
            }
          }
        });
      }

      // Add the message to local state AFTER processing function calls
      setLocalMessages(prev => [...prev, newMessage]);
    },
    onError: (error) => {
      console.error('Chat error:', error);
      toast({
        title: "Chat Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Initialize with Zest's welcome message when we have a recipe
  useEffect(() => {
    if (!hasInitialized && actualIsOpen && currentRecipe) {
      const welcomeMessage: ChatMessage = {
        id: Date.now(),
        message: "",
        response: "Boom — you picked a flavour bomb. Want to swap something, spice it up, or make it your own? I've got ideas. Just ask.",
        isUser: false,
        text: "Boom — you picked a flavour bomb. Want to swap something, spice it up, or make it your own? I've got ideas. Just ask.",
        timestamp: new Date(),
      };
      setLocalMessages([welcomeMessage]);
      setHasInitialized(true);
    }
  }, [actualIsOpen, hasInitialized, currentRecipe]);

  // Auto-scroll to latest message with debouncing
  useEffect(() => {
    const scrollToBottom = () => {
      if (scrollAreaRef.current) {
        scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
      }
    };

    if (localMessages.length > 0) {
      const timeoutId = setTimeout(scrollToBottom, 150);
      return () => clearTimeout(timeoutId);
    }
  }, [localMessages.length]); // Only depend on message count, not the entire array

  // Lock body scroll when chat opens on mobile and handle viewport changes
  useEffect(() => {
    if (actualIsOpen) {
      document.body.classList.add('chat-open');
      
      // Store the current scroll position
      const scrollY = window.scrollY;
      document.body.style.top = `-${scrollY}px`;
      
      // Handle Visual Viewport API for better keyboard support
      if ('visualViewport' in window) {
        const handleViewportChange = () => {
          const viewport = window.visualViewport;
          if (viewport) {
            // Adjust chat panel height when keyboard appears
            const chatPanel = document.querySelector('.mobile-chat-panel') as HTMLElement;
            if (chatPanel) {
              chatPanel.style.height = `${viewport.height}px`;
            }
          }
        };
        
        window.visualViewport.addEventListener('resize', handleViewportChange);
        
        return () => {
          if (window.visualViewport) {
            window.visualViewport.removeEventListener('resize', handleViewportChange);
          }
        };
      }
    } else {
      document.body.classList.remove('chat-open');
      
      // Restore scroll position
      const scrollY = document.body.style.top;
      document.body.style.top = '';
      window.scrollTo(0, parseInt(scrollY || '0') * -1);
    }
    
    // Cleanup on unmount
    return () => {
      document.body.classList.remove('chat-open');
      document.body.style.top = '';
    };
  }, [actualIsOpen]);

  // Initialize with welcome message and history
  useEffect(() => {
    if (actualIsOpen && chatHistory) {
      const messages: ChatMessage[] = [];
      
      // Add Zest's welcome message if we have a recipe (check recipe store instead of prop)
      const hasRecipe = recipeStore.meta.title || (currentRecipe && currentRecipe.title);
      if (hasRecipe && !hasShownWelcome) {
        messages.push({
          id: 0,
          message: "",
          response: "Boom — you picked a flavour bomb. Want to swap something, spice it up, or make it your own? I've got ideas. Just ask.",
          isUser: false,
          text: "Boom — you picked a flavour bomb. Want to swap something, spice it up, or make it your own? I've got ideas. Just ask.",
          timestamp: new Date(),
        });
        setHasShownWelcome(true);
      }

      // Add history messages
      chatHistory.forEach((msg: any) => {
        messages.push({
          id: msg.id,
          message: msg.message,
          response: msg.response,
          isUser: true,
          text: msg.message,
          timestamp: new Date(msg.createdAt),
        });
        messages.push({
          id: msg.id + 0.5,
          message: msg.message,
          response: msg.response,
          isUser: false,
          text: msg.response,
          timestamp: new Date(msg.createdAt),
        });
      });

      // Only set messages if we don't have any existing messages to preserve chat history
      if (localMessages.length === 0) {
        setLocalMessages(messages);
      }
    }
  }, [actualIsOpen, chatHistory, hasShownWelcome, recipeStore.meta.title]);

  const handleSend = (messageText?: string) => {
    const textToSend = messageText || message;
    if (!textToSend.trim()) return;

    // Add user message immediately
    const userMessage: ChatMessage = {
      id: Date.now(),
      message: textToSend,
      response: "",
      isUser: true,
      text: textToSend,
      timestamp: new Date(),
    };
    setLocalMessages(prev => [...prev, userMessage]);
    setShowSuggestions(false);

    // Send to API with enhanced context
    sendMessageMutation.mutate({ 
      message: textToSend,
      currentRecipe,
      mode: detectedMode
    });
    
    if (!messageText) {
      setMessage("");
    }
  };

  const handleSuggestionClick = (suggestion: string) => () => {
    handleSend(suggestion);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* WhatsApp-style Floating Chat Button - Only show when chat is closed */}
      {!actualIsOpen && (
        <div className="fixed bottom-24 right-4 z-40">
          <div className="relative">
            <Button
              onClick={() => {
                // Toggle chat open/closed
                const newIsOpen = !actualIsOpen;
                if (onClose) {
                  // If onClose is provided, we're controlling state externally
                  if (newIsOpen) {
                    // Need to trigger open - parent should handle this
                    window.dispatchEvent(new CustomEvent('openChat'));
                  } else {
                    onClose();
                  }
                } else {
                  // Internal state management would go here if needed
                }
              }}
              className="w-12 h-12 bg-orange-500 hover:bg-orange-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 border-2 border-white"
              size="sm"
            >
              <iconMap.messageCircle className="w-5 h-5" />
            </Button>
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
              <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
            </div>
          </div>
        </div>
      )}

      {/* Chat Panel - Right Side Panel with viewport lock */}
      <div 
        className={`fixed inset-0 sm:inset-y-0 sm:right-0 sm:left-auto sm:w-96 bg-slate-900/95 backdrop-blur-md border-l border-orange-500/30 shadow-2xl transition-all duration-500 flex flex-col mobile-chat-panel ${
          actualIsOpen ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"
        }`}
        style={{
          height: '100vh',
          position: 'fixed',
          top: 0,
          bottom: 0,
          maxHeight: '100vh',
          overflow: 'hidden',
          zIndex: actualIsOpen ? 1000 : -1 // High z-index when open, hidden when closed
        }}
      >
        <CardHeader className="p-3 sm:p-4 border-b border-white/10 flex flex-row items-center justify-between space-y-0 flex-shrink-0">
          <div className="flex items-center space-x-2 sm:space-x-3">
            <div className="relative group">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg">
                <iconMap.chefHat className="text-white w-3 h-3 sm:w-4 sm:h-4" />
              </div>
              {currentRecipe && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border border-white"></div>
              )}
            </div>
            <div>
              <h3 className="font-bold text-white text-sm sm:text-lg">Zest</h3>
              <p className="text-xs sm:text-sm text-white/80">
                {currentRecipe ? `Helping with "${currentRecipe.title}"` : "Ask me anything about cooking!"}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-8 h-8 p-0 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-white hover:text-orange-400 transition-all duration-300 group z-50"
            onClick={() => onClose && onClose()}
          >
            <iconMap.x className="w-4 h-4" />
          </Button>
        </CardHeader>
        
        <CardContent className="flex-1 overflow-hidden p-0 flex flex-col min-h-0 mobile-chat-content">
          {/* Messages Area */}
          <div 
            ref={scrollAreaRef}
            className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 min-h-0 mobile-chat-messages"
          >
            {localMessages.map((msg, index) => (
              <div key={msg.id} className={`mb-3 ${msg.isUser ? "text-right" : "text-left"}`}>
                <div
                  className={`inline-block px-3 sm:px-4 py-2 rounded-xl max-w-[85%] shadow-lg ${
                    msg.isUser
                      ? "bg-gradient-to-r from-orange-500 to-orange-600 text-white"
                      : "bg-slate-700/90 backdrop-blur-sm text-white border border-slate-600/50"
                  }`}
                >
                  <p className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap break-words">{msg.text}</p>
                  <p className="text-[10px] sm:text-xs opacity-70 mt-1">
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}
            {sendMessageMutation.isPending && (
              <div className="text-left">
                <div className="inline-block px-4 py-2 rounded-xl bg-slate-700/90 backdrop-blur-sm border border-slate-600/50">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Suggestion Chips - Always show at start of conversation */}
          {(localMessages.length <= 1 || (showSuggestions && localMessages.length <= 2)) && (
            <div className="px-3 sm:px-4 py-3 border-t border-slate-700/50 flex-shrink-0 bg-slate-900/50">
              <div className="text-xs text-slate-400 mb-2">Quick suggestions:</div>
              <div className="flex flex-wrap gap-2">
                {suggestionChips.slice(0, 6).map((chip, index) => (
                  <Badge
                    key={index}
                    variant={chip.updatesRecipe ? "secondary" : "outline"}
                    className="cursor-pointer hover:bg-orange-500 hover:text-white transition-all duration-300 flex items-center gap-1 shadow-md backdrop-blur-sm bg-slate-700/80 border-slate-600 text-white"
                    onClick={handleSuggestionClick(chip.text)}
                  >
                    <chip.icon className="w-3 h-3" />
                    <span className="text-xs">{chip.text}</span>
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Input Area - Fixed at bottom with guaranteed visibility */}
          <div className="border-t-2 border-orange-500/60 bg-slate-900/98 backdrop-blur-lg flex-shrink-0 mobile-chat-input" 
               style={{ 
                 position: 'relative', 
                 zIndex: 1001,
                 paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 16px)'
               }}>
            <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="p-4">
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask me anything..."
                  className="flex-1 bg-slate-700 border-2 border-slate-600 rounded-xl text-white placeholder:text-slate-400 px-4 py-4 text-base focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 shadow-xl"
                  disabled={sendMessageMutation.isPending}
                  style={{ 
                    fontSize: '16px', 
                    minHeight: '56px', 
                    WebkitAppearance: 'none',
                    transform: 'translateZ(0)',
                    position: 'relative',
                    zIndex: 1002
                  }}
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck="false"
                />
                <button
                  type="submit"
                  disabled={!message.trim() || sendMessageMutation.isPending}
                  className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-xl px-4 py-4 min-h-[56px] min-w-[56px] flex items-center justify-center disabled:opacity-50 shadow-xl"
                  style={{ position: 'relative', zIndex: 1002 }}
                >
                  {sendMessageMutation.isPending ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <iconMap.send className="w-5 h-5" />
                  )}
                </button>
              </div>
            </form>
          </div>
        </CardContent>


      </div>
    </>
  );
}
