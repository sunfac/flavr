import React, { useState, useRef, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  currentMode 
}: ChatBotProps = {}) {
  const [isOpen, setIsOpen] = useState(false);
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
    mutationFn: (data: { message: string; currentRecipe?: Recipe; mode?: string }) =>
      apiRequest("POST", "/api/chat", {
        ...data,
        currentRecipe: getCurrentRecipeContext().recipe,
        contextData: getCurrentRecipeContext(),
        enableFunctionCalling: true
      }),
    onSuccess: async (response) => {
      const result = await response.json();
      
      console.log('🔍 CHAT RESPONSE RECEIVED:', {
        hasFunctionCalls: !!result.functionCalls,
        hasUpdatedRecipe: !!result.updatedRecipe,
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
        hasUpdatedRecipe: !!result.updatedRecipe,
        functionCalls: result.functionCalls
      });

      if (result.functionCalls && Array.isArray(result.functionCalls)) {
        console.log('🎯 Processing function calls:', result.functionCalls);
        result.functionCalls.forEach((functionCall: any) => {
          if (functionCall.name === 'updateRecipe') {
            try {
              const { mode, data } = functionCall.arguments;
              console.log(`🔧 EXECUTING Function Call: ${mode} recipe update`, data);
              
              if (mode === 'replace') {
                console.log('🔄 REPLACING entire recipe in store');
                recipeActions.replaceRecipe(data);
              } else if (mode === 'patch') {
                console.log('🩹 PATCHING recipe in store with data:', data);
                recipeActions.patchRecipe(data);
                
                // Handle timer rescaling if step durations changed
                if (data.steps) {
                  data.steps.forEach((step: any) => {
                    if (step.duration && timerStore.timers[step.id]) {
                      timerStore.resetTimer(step.id);
                    }
                  });
                }
              }
              
              console.log('✅ Recipe store updated successfully');
              
            } catch (error) {
              console.error('Error processing function call:', error);
            }
          }
        });
      }

      // Add the message to local state AFTER processing function calls
      setLocalMessages(prev => [...prev, newMessage]);

      // Legacy recipe update support and direct recipe store sync
      if (result.updatedRecipe) {
        console.log('📝 Recipe update detected:', result.updatedRecipe);
        
        // Update the recipe store directly to sync with live recipe card
        if (result.updatedRecipe.servings !== recipeStore.servings) {
          console.log(`🔄 Updating servings: ${recipeStore.servings} → ${result.updatedRecipe.servings}`);
          recipeActions.updateServings(result.updatedRecipe.servings);
        }
        
        // Update recipe metadata
        recipeActions.patchRecipe({
          meta: {
            title: result.updatedRecipe.title,
            description: result.updatedRecipe.description,
            cookTime: result.updatedRecipe.cookTime,
            difficulty: result.updatedRecipe.difficulty,
            cuisine: result.updatedRecipe.cuisine
          }
        });
        
        // Update ingredients if they changed
        if (result.updatedRecipe.ingredients) {
          const updatedIngredients = result.updatedRecipe.ingredients.map((ingredient: string, index: number) => ({
            id: `ingredient-${index}`,
            text: ingredient,
            checked: false
          }));
          recipeActions.patchRecipe({
            ingredients: updatedIngredients
          });
        }
        
        // Update instructions if they changed
        if (result.updatedRecipe.instructions) {
          const updatedSteps = result.updatedRecipe.instructions.map((instruction: string, index: number) => ({
            id: `step-${index}`,
            title: `Step ${index + 1}`,
            description: instruction,
            duration: 0
          }));
          recipeActions.patchRecipe({
            steps: updatedSteps
          });
        }
        
        // Call legacy callback if provided
        if (onRecipeUpdate) {
          onRecipeUpdate(result.updatedRecipe);
        }
        
        const updateMessage: ChatMessage = {
          id: Date.now() + 1,
          message: "",
          response: "Recipe updated! Check out the changes above.",
          isUser: false,
          text: "Recipe updated! Check out the changes above.",
          timestamp: new Date(),
        };
        setTimeout(() => {
          setLocalMessages(prev => [...prev, updateMessage]);
        }, 500);
      }
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
    if (!hasInitialized && isOpen && currentRecipe) {
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
  }, [isOpen, hasInitialized, currentRecipe]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [localMessages]);

  // Initialize with welcome message and history
  useEffect(() => {
    if (isOpen && chatHistory) {
      const messages: ChatMessage[] = [];
      
      // Add Zest's welcome message if we have a recipe
      if (currentRecipe && !hasShownWelcome) {
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
  }, [isOpen, chatHistory, currentRecipe, hasShownWelcome]);

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

  const handleSuggestionClick = (suggestion: string) => {
    return () => handleSend(suggestion);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* WhatsApp-style Floating Chat Button */}
      <div className="fixed bottom-24 right-4 z-50">
        <div className="relative">
          <Button
            onClick={() => setIsOpen(!isOpen)}
            className="w-12 h-12 bg-orange-500 hover:bg-orange-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 border-2 border-white"
            size="sm"
          >
            {isOpen ? (
              <iconMap.x className="w-5 h-5" />
            ) : (
              <iconMap.messageCircle className="w-5 h-5" />
            )}
          </Button>
          {!isOpen && (
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
              <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
            </div>
          )}
        </div>
      </div>

      {/* Chat Panel - Right Side Panel */}
      <div 
        className={`fixed top-0 right-0 h-full w-full sm:w-96 bg-slate-900/95 backdrop-blur-md border-l border-orange-500/30 shadow-2xl transition-all duration-500 z-50 flex flex-col ${
          isOpen ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"
        }`}
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
            className="w-8 h-8 p-0 rounded-xl glass hover:scale-110 transition-all duration-300 group"
            onClick={() => setIsOpen(false)}
          >
            <iconMap.x className="w-4 h-4 text-slate-600 group-hover:text-slate-800" />
          </Button>
        </CardHeader>
        
        <ScrollArea className="flex-1 p-2 sm:p-4 min-h-0 max-h-96 sm:max-h-96 overflow-y-auto" ref={scrollAreaRef}>
          <div className="space-y-3 sm:space-y-4">
            {localMessages.map((msg) => (
              <div key={msg.id} className={`flex space-x-2 sm:space-x-3 ${msg.isUser ? 'justify-end' : 'justify-start'}`}>
                {!msg.isUser && (
                  <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md">
                    <iconMap.bot className="text-white w-3 h-3 sm:w-4 sm:h-4" />
                  </div>
                )}
                <div className={`rounded-2xl p-2 sm:p-4 max-w-[240px] sm:max-w-xs shadow-lg ${
                  msg.isUser 
                    ? "bg-gradient-to-r from-orange-500 to-orange-600 text-white ml-2 sm:ml-4" 
                    : "bg-card/90 backdrop-blur-sm text-foreground border border-border"
                }`}>
                  <p className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap break-words">{msg.text}</p>
                </div>
                {msg.isUser && (
                  <div className="w-6 h-6 sm:w-8 sm:h-8 bg-slate-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md">
                    <iconMap.user className="text-white w-3 h-3 sm:w-4 sm:h-4" />
                  </div>
                )}
              </div>
            ))}
            {sendMessageMutation.isPending && (
              <div className="flex space-x-3 justify-start">
                <div className="w-8 h-8 gradient-primary rounded-xl flex items-center justify-center flex-shrink-0 shadow-md">
                  <i className="fas fa-robot text-white text-sm"></i>
                </div>
                <div className="glass rounded-2xl p-4 max-w-xs border border-white/20">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }}></div>
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Recipe Context Summary */}
        {currentRecipe && (
          <div className="px-3 sm:px-4 py-2 border-t border-white/10 bg-orange-500/5 flex-shrink-0">
            <div className="text-xs text-white/70 mb-1">Current Recipe Context:</div>
            <div className="text-xs text-orange-300 truncate">
              {currentRecipe.title} • {currentRecipe.servings} servings • {currentRecipe.cookTime}min • {currentRecipe.difficulty}
            </div>
          </div>
        )}

        {/* Suggestion Chips - Mobile optimized with Lucide icons */}
        {currentRecipe && (
          <div className="px-3 sm:px-4 py-3 border-t border-white/10 flex-shrink-0">
            <p className="text-xs font-medium text-white/80 mb-3">Quick suggestions:</p>
            <div className="flex flex-wrap gap-1.5">
              {suggestionChips.map((chip, index) => (
                <Button
                  key={index}
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 py-1 bg-orange-500/10 border border-orange-400/30 text-orange-400 hover:bg-orange-500/20 hover:border-orange-400/50 transition-all duration-200 flex items-center space-x-1 text-xs rounded-full"
                  onClick={handleSuggestionClick(chip.text)}
                >
                  {React.createElement(chip.icon, { className: "w-3 h-3" })}
                  <span className="text-center leading-tight whitespace-nowrap">{chip.text}</span>
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Input Area - Mobile optimized */}
        <div className="p-3 sm:p-4 border-t border-white/10 flex-shrink-0">
          <div className="flex space-x-2">
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask about cooking..."
              className="flex-1 h-9 sm:h-10 input-modern glass border-white/20 placeholder:text-slate-500 text-sm"
              disabled={sendMessageMutation.isPending}
            />
            <Button 
              onClick={() => handleSend()}
              className="h-9 sm:h-10 px-2 sm:px-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!message.trim() || sendMessageMutation.isPending}
            >
              {sendMessageMutation.isPending ? (
                <div className="w-3 h-3 sm:w-4 sm:h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <iconMap.send className="w-3 h-3 sm:w-4 sm:h-4" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
