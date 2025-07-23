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
                
                // Force complete recipe store replacement to trigger UI refresh
                console.log('🔄 Forcing complete recipe store update with:', data);
                recipeActions.replaceRecipe({
                  id: data.id,
                  servings: data.servings,
                  meta: data.meta,
                  ingredients: data.ingredients,
                  steps: data.steps,
                  currentStep: 0,
                  completedSteps: [],
                  lastUpdated: Date.now()
                });
                
                // Trigger recipe update callback if available
                if (onRecipeUpdate) {
                  onRecipeUpdate({
                    id: data.id,
                    title: data.meta.title,
                    description: data.meta.description,
                    cookTime: data.meta.cookTime,
                    servings: data.servings,
                    difficulty: data.meta.difficulty,
                    cuisine: data.meta.cuisine,
                    ingredients: data.ingredients.map((ing: any) => ing.text),
                    instructions: data.steps.map((step: any) => step.description)
                  });
                }
                
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

      // Legacy recipe update support - only if no function calls were processed
      if (result.updatedRecipe && (!result.functionCalls || result.functionCalls.length === 0)) {
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

  // Initialize with welcome message and history
  useEffect(() => {
    if (isOpen && chatHistory) {
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
  }, [isOpen, chatHistory, hasShownWelcome, recipeStore.meta.title]);

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
        
        <CardContent className="flex-1 overflow-hidden p-0 flex flex-col">
          {/* Messages Area */}
          <div 
            ref={scrollAreaRef}
            className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 min-h-0"
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

          {/* Suggestion Chips */}
          {showSuggestions && localMessages.length === 1 && (
            <div className="px-3 sm:px-4 pb-2">
              <div className="flex flex-wrap gap-2">
                {suggestionChips.slice(0, 4).map((chip, index) => (
                  <Badge
                    key={index}
                    variant={chip.updatesRecipe ? "secondary" : "outline"}
                    className="cursor-pointer hover:bg-orange-500 hover:text-white transition-all duration-300 flex items-center gap-1 shadow-md backdrop-blur-sm bg-slate-700/80 border-slate-600"
                    onClick={handleSuggestionClick(chip.text)}
                  >
                    <chip.icon className="w-3 h-3" />
                    <span className="text-xs">{chip.text}</span>
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Input Area */}
          <div className="p-3 sm:p-4 border-t border-slate-700/50 bg-slate-800/50 backdrop-blur-sm flex-shrink-0">
            <div className="flex items-center space-x-2">
              <Input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask me anything..."
                className="flex-1 bg-slate-700/70 border-slate-600 text-white placeholder:text-slate-400 focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
                disabled={sendMessageMutation.isPending}
              />
              <Button
                onClick={() => handleSend()}
                disabled={!message.trim() || sendMessageMutation.isPending}
                size="sm"
                className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-lg"
              >
                {sendMessageMutation.isPending ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <iconMap.send className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
        </CardContent>


      </div>
    </>
  );
}
