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
  isConfirmation?: boolean;
  originalMessage?: string;
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

  // Recipe modification suggestions (when a recipe exists)
  const recipeModificationChips = [
    { text: "Make this for 6 people", icon: iconMap.users, updatesRecipe: true },
    { text: "Make it vegan", icon: iconMap.heart, updatesRecipe: true },
    { text: "Add more spice", icon: iconMap.flame, updatesRecipe: true },
    { text: "Make it gluten-free", icon: iconMap.shield, updatesRecipe: true },
    { text: "Add a side dish", icon: iconMap.utensilsCrossed, updatesRecipe: false },
    { text: "Make it healthier", icon: iconMap.target, updatesRecipe: true },
    { text: "Double the recipe", icon: iconMap.plus, updatesRecipe: true },
    { text: "Make it dairy-free", icon: iconMap.droplets, updatesRecipe: true },
    { text: "Suggest wine pairing", icon: iconMap.wine, updatesRecipe: false },
    { text: "How can I prep ahead?", icon: iconMap.timer, updatesRecipe: false },
    { text: "Make it easier to cook", icon: iconMap.chefHat, updatesRecipe: true },
    { text: "Add more vegetables", icon: iconMap.leaf, updatesRecipe: true },
    { text: "Make it low-carb", icon: iconMap.zap, updatesRecipe: true },
    { text: "Turn into meal prep", icon: iconMap.calendar, updatesRecipe: true },
    { text: "Make it kid-friendly", icon: iconMap.smile, updatesRecipe: true },
    { text: "Add protein options", icon: iconMap.beef, updatesRecipe: true },
    { text: "Make it spicier", icon: iconMap.sparkles, updatesRecipe: true },
    { text: "Suggest leftovers ideas", icon: iconMap.refrigerator, updatesRecipe: false }
  ];

  // General cooking help suggestions (when no recipe exists)
  const generalCookingChips = [
    { text: "I need a quick dinner idea", icon: iconMap.clock, updatesRecipe: false },
    { text: "What can I make with pasta?", icon: iconMap.utensilsCrossed, updatesRecipe: false },
    { text: "Suggest a healthy breakfast", icon: iconMap.coffee, updatesRecipe: false },
    { text: "Easy recipes for beginners", icon: iconMap.smile, updatesRecipe: false },
    { text: "What's good for meal prep?", icon: iconMap.calendar, updatesRecipe: false },
    { text: "I have chicken, what to make?", icon: iconMap.beef, updatesRecipe: false },
    { text: "Comfort food recipes", icon: iconMap.heart, updatesRecipe: false },
    { text: "Quick 30-minute meals", icon: iconMap.timer, updatesRecipe: false },
    { text: "Vegetarian dinner ideas", icon: iconMap.leaf, updatesRecipe: false },
    { text: "One-pot meal suggestions", icon: iconMap.chef, updatesRecipe: false },
    { text: "Best dessert to impress?", icon: iconMap.sparkles, updatesRecipe: false },
    { text: "Cooking techniques to learn", icon: iconMap.chefHat, updatesRecipe: false },
    { text: "Seasonal ingredient ideas", icon: iconMap.calendar, updatesRecipe: false },
    { text: "Budget-friendly recipes", icon: iconMap.dollarSign, updatesRecipe: false },
    { text: "Kid-friendly meal ideas", icon: iconMap.users, updatesRecipe: false },
    { text: "Date night cooking ideas", icon: iconMap.wine, updatesRecipe: false }
  ];

  // Determine which suggestion set to use
  const hasCurrentRecipe = currentRecipe || (recipeStore.meta.title && recipeStore.ingredients.length > 0);
  const allSuggestionChips = hasCurrentRecipe ? recipeModificationChips : generalCookingChips;

  // Rotating chips state - show 6 at a time, rotate every 6 seconds
  const [chipRotationIndex, setChipRotationIndex] = useState(0);
  
  useEffect(() => {
    const interval = setInterval(() => {
      setChipRotationIndex(prev => (prev + 6) % allSuggestionChips.length);
    }, 6000);
    
    return () => clearInterval(interval);
  }, [allSuggestionChips.length]);
  
  // Get current 6 chips to display
  const suggestionChips = allSuggestionChips.slice(chipRotationIndex, chipRotationIndex + 6);

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

  // Enhanced Zest chat with user memory and intent detection
  const sendMessageMutation = useMutation({
    mutationFn: async (data: { message: string; currentRecipe?: Recipe; mode?: string }) => {
      // Build conversation history from local messages
      const conversationHistory = localMessages.map(msg => ({
        role: msg.isUser ? 'user' : 'assistant',
        content: msg.isUser ? msg.message : msg.response
      }));

      // Use enhanced Zest endpoint
      const response = await fetch("/api/zest/chat", {
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

      // Parse JSON response from enhanced Zest
      const result = await response.json();
      
      return { 
        response: result.message,
        isRecipeIntent: result.isRecipeIntent,
        requiresConfirmation: result.requiresConfirmation,
        confidence: result.confidence,
        userMemory: result.userMemory
      };
    },
    onSuccess: async (result) => {
      console.log('🧠 Zest response received:', {
        hasRecipeIntent: result.isRecipeIntent,
        requiresConfirmation: result.requiresConfirmation,
        userMemory: result.userMemory,
        responseLength: result.response?.length || 0
      });

      // Create Zest response message
      const zestMessage: ChatMessage = {
        id: Date.now(),
        message,
        response: result.response,
        isUser: false,
        text: result.response,
        timestamp: new Date(),
      };

      // Add the Zest response to chat
      setLocalMessages(prev => [...prev, zestMessage]);
      setMessage("");

      // Handle recipe intent confirmation
      if (result.isRecipeIntent && result.requiresConfirmation) {
        // Add confirmation buttons
        const confirmationMessage: ChatMessage = {
          id: Date.now() + 1,
          message: "",
          response: "Create Recipe",
          isUser: false,
          text: "Create Recipe",
          timestamp: new Date(),
          isConfirmation: true,
          originalMessage: message // Store original message for recipe generation
        };
        
        setLocalMessages(prev => [...prev, confirmationMessage]);
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

  // Recipe generation mutation for confirmed intent
  const generateRecipeMutation = useMutation({
    mutationFn: async (data: { message: string }) => {
      const response = await fetch("/api/zest/generate-recipe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: data.message,
          userConfirmed: true
        }),
      });

      if (!response.ok) {
        throw new Error(`Recipe generation failed: ${response.statusText}`);
      }

      return response.json();
    },
    onSuccess: (result) => {
      console.log('🧪 Recipe generated:', result);
      
      // Add recipe confirmation message
      const recipeMessage: ChatMessage = {
        id: Date.now(),
        message: "",
        response: result.message,
        isUser: false,
        text: result.message,
        timestamp: new Date(),
      };
      
      setLocalMessages(prev => [...prev, recipeMessage]);

      // Navigate to the generated recipe if it was saved
      if (result.recipe) {
        // TODO: Update this to navigate to recipe or update current recipe context
        console.log('Generated recipe:', result.recipe);
      }
    },
    onError: (error) => {
      console.error('Recipe generation error:', error);
      toast({
        title: "Recipe Generation Error",
        description: "Failed to generate recipe. Please try again.",
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
              // Account for header height (64px) when adjusting for keyboard
              chatPanel.style.height = `${Math.max(viewport.height - 64, 300)}px`;
            }
          }
        };
        
        window.visualViewport?.addEventListener('resize', handleViewportChange);
        
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
    <div className="h-full flex flex-col bg-slate-900">
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
        
        <CardContent className="flex-1 overflow-hidden p-0 flex flex-col min-h-0" style={{ flex: '1 1 0%' }}>
          {/* Messages Area */}
          <div 
            ref={scrollAreaRef}
            className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 chat-messages"
            style={{ 
              flex: '1 1 0%',
              minHeight: '0',
              overscrollBehavior: 'contain'
            }}
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
                  
                  {/* Recipe generation confirmation buttons */}
                  {msg.isConfirmation && msg.originalMessage && (
                    <div className="mt-3 flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => {
                          generateRecipeMutation.mutate({ message: msg.originalMessage! });
                          // Remove confirmation message after click
                          setLocalMessages(prev => prev.filter(m => m.id !== msg.id));
                        }}
                        disabled={generateRecipeMutation.isPending}
                        className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white text-xs px-3 py-1"
                      >
                        {generateRecipeMutation.isPending ? "Creating..." : "Yes, Create Recipe!"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          // Remove confirmation message
                          setLocalMessages(prev => prev.filter(m => m.id !== msg.id));
                        }}
                        className="border-slate-500 text-slate-300 hover:bg-slate-600 text-xs px-3 py-1"
                      >
                        No Thanks
                      </Button>
                    </div>
                  )}
                  
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

          {/* Input Area - Mobile Keyboard Safe */}
          <div 
            className="border-t-2 border-orange-500/60 bg-slate-900 p-3 sm:p-4 flex-shrink-0 chat-input-area"
            style={{
              position: 'relative',
              zIndex: 10,
              paddingBottom: 'max(env(safe-area-inset-bottom), 16px)'
            }}
          >
            <form 
              onSubmit={(e) => { e.preventDefault(); handleSend(); }} 
              className="flex gap-2 sm:gap-3 w-full items-center"
            >
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask me anything..."
                disabled={sendMessageMutation.isPending}
                className="flex-1 min-h-[44px] sm:min-h-[52px] px-3 sm:px-4 py-2 sm:py-3 bg-slate-700 border-2 border-slate-600 rounded-xl text-white placeholder-slate-400 text-sm sm:text-base focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 disabled:opacity-50"
                style={{
                  fontSize: '16px', // Prevent zoom on iOS
                  WebkitAppearance: 'none',
                  WebkitBorderRadius: '12px',
                  touchAction: 'manipulation'
                }}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck="false"
              />
              <Button
                type="submit"
                disabled={!message.trim() || sendMessageMutation.isPending}
                className="min-h-[44px] min-w-[44px] sm:min-h-[52px] sm:min-w-[52px] p-2 sm:p-3 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-xl transition-all duration-200 disabled:opacity-50 flex-shrink-0"
              >
                {sendMessageMutation.isPending ? (
                  <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <iconMap.send className="w-4 h-4 sm:w-5 sm:h-5" />
                )}
              </Button>
            </form>
          </div>
        </CardContent>
    </div>
  );
}
