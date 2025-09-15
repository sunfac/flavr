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
import { useRecipeStore, recipeActions, Step } from "@/stores/recipeStore";
import { useTimerStore } from "@/stores/timerStore";
// Authentication check using /api/me endpoint


interface ChatMessage {
  id: number;
  message: string;
  response: string;
  isUser: boolean;
  text: string;
  timestamp: Date;
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

interface ChatBotProps {
  currentRecipe?: Recipe;
  onRecipeUpdate?: (updatedRecipe: Recipe) => void;
  currentMode?: "shopping" | "fridge" | "chef";
  chatContext?: "cooking" | "recipe-editing"; // New prop to distinguish context
}

export default function ChatBot({ 
  currentRecipe, 
  onRecipeUpdate, 
  currentMode,
  chatContext = "cooking", // Default to cooking mode
  isOpen = true,
  onClose
}: ChatBotProps & { isOpen?: boolean; onClose?: () => void }) {
  // Check authentication status via /api/me endpoint
  const { data: userData } = useQuery({
    queryKey: ["/api/me"],
    retry: false,
  });
  const isAuthenticated = !!(userData as any)?.user;
  // Use isOpen prop if provided, otherwise default to true
  const actualIsOpen = isOpen !== undefined ? isOpen : true;
  const [message, setMessage] = useState("");
  const [localMessages, setLocalMessages] = useState<ChatMessage[]>([]);

  // Connect to global recipe store
  const recipeStore = useRecipeStore();
  
  // Get current recipe data from store or props with full context
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
  
  // Save chat history to localStorage per recipe
  const saveChatHistory = (messages: ChatMessage[]) => {
    const recipeKey = getRecipeKey();
    localStorage.setItem(`chat-history-${recipeKey}`, JSON.stringify(messages));
  };
  
  // Load chat history from localStorage for current recipe
  const loadChatHistory = (): ChatMessage[] => {
    const recipeKey = getRecipeKey();
    const saved = localStorage.getItem(`chat-history-${recipeKey}`);
    return saved ? JSON.parse(saved) : [];
  };
  const [showSuggestions, setShowSuggestions] = useState(true);
  
  // Connect to timer store
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
    { text: "Show me dinner recipe options", icon: iconMap.clock, updatesRecipe: false },
    { text: "What can I make with pasta?", icon: iconMap.utensilsCrossed, updatesRecipe: false },
    { text: "Give me breakfast recipe ideas", icon: iconMap.coffee, updatesRecipe: false },
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

  // Rotating chips state - show 4 at a time (2x2 grid), rotate every 8 seconds with fade
  const [chipRotationIndex, setChipRotationIndex] = useState(0);
  const [isRotating, setIsRotating] = useState(false);
  const chipsToShow = 4;
  
  useEffect(() => {
    const interval = setInterval(() => {
      setIsRotating(true);
      
      // After fade out, change the chips
      setTimeout(() => {
        setChipRotationIndex(prev => {
          const nextIndex = prev + chipsToShow;
          // Reset to 0 when we've shown all chips
          return nextIndex >= allSuggestionChips.length ? 0 : nextIndex;
        });
        setIsRotating(false);
      }, 200); // 200ms fade out duration
    }, 8000);
    
    return () => clearInterval(interval);
  }, [allSuggestionChips.length]);
  
  // Get current 4 chips to display
  const suggestionChips = allSuggestionChips.slice(chipRotationIndex, chipRotationIndex + chipsToShow);

  // Get chat history
  const { data: historyData } = useQuery({
    queryKey: ["/api/chat/history"],
    enabled: isOpen,
  });

  // Extract history from response
  const chatHistory = Array.isArray(historyData) ? historyData : (historyData as any)?.history || [];

  // Load chat history when component mounts - use context-aware keys
  useEffect(() => {
    if (localMessages.length === 0) { // Only load if chat is empty
      let stableKey: string;
      
      if (chatContext === "recipe-editing" && currentRecipe?.id) {
        // Recipe editing mode: load recipe-specific chat
        stableKey = `recipe-edit-${currentRecipe.id}`;
      } else if (chatContext === "cooking") {
        // Cooking mode: always start fresh, don't load history
        stableKey = `cooking-session-${Date.now()}`; // Always unique to start fresh
        return; // Don't load any history for cooking mode
      } else {
        // Fallback to general chat
        stableKey = 'general-chat';
      }
      
      const saved = localStorage.getItem(`chat-history-${stableKey}`);
      if (saved) {
        try {
          const savedMessages = JSON.parse(saved);
          setLocalMessages(savedMessages);
        } catch (error) {
          console.warn('Failed to parse saved chat messages:', error);
        }
      }
    }
  }, [currentRecipe?.id, chatContext]); // Depend on context too
  
  // Save chat history whenever localMessages changes
  useEffect(() => {
    if (localMessages.length > 0) {
      let stableKey: string;
      
      if (chatContext === "recipe-editing" && currentRecipe?.id) {
        // Recipe editing mode: save recipe-specific chat
        stableKey = `recipe-edit-${currentRecipe.id}`;
      } else if (chatContext === "cooking") {
        // Cooking mode: use temporary key (will be cleared on new session)
        stableKey = `cooking-session-temp`;
      } else {
        // Fallback to general chat
        stableKey = 'general-chat';
      }
      
      localStorage.setItem(`chat-history-${stableKey}`, JSON.stringify(localMessages));
    }
  }, [localMessages, currentRecipe?.id, chatContext]);


  // Enhanced Zest chat with user memory and intent detection
  const sendMessageMutation = useMutation({
    mutationFn: async (data: { message: string; currentRecipe?: Recipe; mode?: string }) => {
      // Build conversation history from local messages
      const conversationHistory = localMessages.map(msg => ({
        role: msg.isUser ? 'user' : 'assistant',
        content: msg.isUser ? msg.message : msg.response
      }));

      // Use optimized Zest endpoint for faster responses  
      const response = await fetch("/api/chat/optimized", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: data.message,
          conversationHistory, // Use local messages for continuity
          currentRecipe: getCurrentRecipeContext().recipe,
          userContext: {
            userId: (userData as any)?.user?.id,
            pseudoUserId: localStorage.getItem('pseudoUserId') || `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            isAuthenticated: !!(userData as any)?.user
          }
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
        userMemory: result.userMemory,
        suggestedRecipeTitle: result.suggestedRecipeTitle,
        isRecipeModification: result.isRecipeModification,
        modifiedRecipe: result.modifiedRecipe,
        streamingUpdate: result.streamingUpdate
      };
    },
    onSuccess: async (result, variables) => {
      // Handle recipe modification first (live streaming updates)
      if (result.isRecipeModification && result.modifiedRecipe) {
        console.log('🔄 Applying recipe modification:', result.modifiedRecipe.title);
        
        // Update the recipe store directly with the modified recipe
        recipeActions.updateActiveRecipe(result.modifiedRecipe);
        
        // Also update parent component if callback exists
        if (onRecipeUpdate) {
          onRecipeUpdate(result.modifiedRecipe);
        }
        
        // Show success message
        const modificationMessage: ChatMessage = {
          id: Date.now(),
          message: variables.message,
          response: `✅ Recipe updated! ${result.modifiedRecipe.modifications || 'Changes applied successfully.'}`,
          isUser: false,
          text: `✅ Recipe updated! ${result.modifiedRecipe.modifications || 'Changes applied successfully.'}`,
          timestamp: new Date(),
        };

        setLocalMessages(prev => [...prev, modificationMessage]);
        setMessage("");
        
        toast({
          title: "Recipe Updated",
          description: result.modifiedRecipe.modifications || "Your recipe has been modified successfully!",
        });
        
        return; // Don't process as regular message
      }

      // Create Zest response message
      const zestMessage: ChatMessage = {
        id: Date.now(),
        message: variables.message,
        response: result.response,
        isUser: false,
        text: result.response,
        timestamp: new Date(),
      };

      // Add the Zest response to chat
      setLocalMessages(prev => [...prev, zestMessage]);
      setMessage("");

      // Debug logging for chat flow
      console.log('🔍 ChatBot Debug - Zest Response:', {
        isRecipeIntent: result.isRecipeIntent,
        requiresConfirmation: result.requiresConfirmation,
        suggestedRecipeTitle: result.suggestedRecipeTitle,
        confidence: result.confidence
      });

      // Handle recipe intent confirmation
      if (result.isRecipeIntent && result.requiresConfirmation) {
        // Add confirmation buttons
        const confirmationMessage: ChatMessage = {
          id: Date.now() + 1,
          message: "",
          response: "Would you like me to create this recipe?",
          isUser: false,
          text: "Would you like me to create this recipe?",
          timestamp: new Date(),
          isConfirmation: true,
          originalMessage: variables.message, // Use the original message from mutation variables
          suggestedRecipeTitle: result.suggestedRecipeTitle
        };
        
        setLocalMessages(prev => [...prev, confirmationMessage]);
      }
    },
    onError: (error) => {
      console.error('Chat error:', error);
      
      // Add error message to chat instead of toast
      const errorMessage: ChatMessage = {
        id: Date.now(),
        message: "",
        response: "❌ Sorry, I'm having trouble processing your message right now. Please try again in a moment.",
        isUser: false,
        text: "❌ Sorry, I'm having trouble processing your message right now. Please try again in a moment.",
        timestamp: new Date(),
      };
      
      setLocalMessages(prev => [...prev, errorMessage]);
    }
  });

  // NEW: Optimized chat mutation (cost-efficient with action buttons)
  const optimizedChatMutation = useMutation({
    mutationFn: async (data: { message: string; currentRecipe?: Recipe; mode?: string }) => {
      // Build conversation history from local messages
      const conversationHistory = localMessages.map(msg => ({
        role: msg.isUser ? 'user' : 'assistant',
        content: msg.isUser ? msg.message : msg.response
      }));

      const response = await fetch("/api/chat/optimized", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: data.message,
          conversationHistory: chatContext === "cooking" ? [] : conversationHistory, // Fresh context for cooking mode
          currentRecipe: chatContext === "recipe-editing" ? getCurrentRecipeContext().recipe : null, // Only pass recipe in editing mode
          chatContext: chatContext, // Pass the context mode
          pseudoUserId: !isAuthenticated ? 'anon-' + Date.now() : undefined
        }),
      });

      if (!response.ok) {
        throw new Error(`Optimized chat request failed: ${response.statusText}`);
      }

      return response.json();
    },
    onSuccess: (result, variables) => {
      console.log('⚡ Optimized chat result:', {
        intent: result.intent,
        confidence: result.confidence,
        estimatedCost: result.metadata?.estimatedCost,
        modelUsed: result.metadata?.modelUsed,
        processingTime: result.metadata?.processingTimeMs
      });

      // Create optimized chat message with action buttons
      const optimizedMessage: ChatMessage = {
        id: Date.now(),
        message: variables.message,
        response: result.message,
        isUser: false,
        text: result.message,
        timestamp: new Date(),
        suggestedActions: result.suggestedActions,
        requiresIntentClarification: result.requiresIntentClarification,
        clarificationOptions: result.clarificationOptions,
        isOptimized: true,
        metadata: result.metadata
      };

      setLocalMessages(prev => [...prev, optimizedMessage]);
      setMessage("");
    },
    onError: (error) => {
      console.error('⚡ Optimized chat error:', error);
      
      const errorMessage: ChatMessage = {
        id: Date.now(),
        message: "",
        response: "❌ Sorry, I'm having trouble processing your message right now. Please try again in a moment.",
        isUser: false,
        text: "❌ Sorry, I'm having trouble processing your message right now. Please try again in a moment.",
        timestamp: new Date(),
      };
      
      setLocalMessages(prev => [...prev, errorMessage]);
    }
  });

  // Optimized recipe generation mutation
  const optimizedRecipeMutation = useMutation({
    mutationFn: async (data: { 
      suggestedTitle: string;
      originalMessage?: string;
      type?: 'quick' | 'full';
    }) => {
      const response = await fetch("/api/chat/optimized/recipe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          suggestedTitle: data.suggestedTitle,
          originalMessage: data.originalMessage,
          type: data.type || 'full',
          pseudoUserId: !isAuthenticated ? 'anon-' + Date.now() : undefined
        }),
      });

      if (!response.ok) {
        throw new Error(`Optimized recipe generation failed: ${response.statusText}`);
      }

      return response.json();
    },
    onSuccess: (result, variables) => {
      console.log('⚡ Optimized recipe generated:', result.recipe?.title);
      
      if (result.recipe) {
        // Update recipe store
        const ingredients = (result.recipe.ingredients || []).map((ingredient: string, index: number) => ({
          id: (index + 1).toString(),
          text: ingredient,
          checked: false
        }));
        
        const steps = (result.recipe.instructions || []).map((instruction: string, index: number) => ({
          id: (index + 1).toString(),
          title: `Step ${index + 1}`,
          description: instruction,
          completed: false
        }));
        
        recipeActions.updateActiveRecipe({
          title: result.recipe.title,
          description: result.recipe.description || '',
          cookTime: result.recipe.cookTime || 30,
          servings: result.recipe.servings || 4,
          difficulty: result.recipe.difficulty || 'medium',
          cuisine: result.recipe.cuisine || '',
          ingredients: ingredients,
          instructions: steps,
          tips: result.recipe.tips || ''
        });
        
        // Add success message
        const successMessage: ChatMessage = {
          id: Date.now(),
          message: "",
          response: `✅ Success! ${result.recipe.title} has been created and is ready to cook.`,
          isUser: false,
          text: `✅ Success! ${result.recipe.title} has been created and is ready to cook.`,
          timestamp: new Date(),
          isRecipeCreated: true,
          recipeTitle: result.recipe.title,
          isOptimized: true
        };
        
        setLocalMessages(prev => [...prev, successMessage]);
      }
    },
    onError: (error) => {
      console.error('⚡ Optimized recipe generation error:', error);
      
      const errorMessage: ChatMessage = {
        id: Date.now(),
        message: "",
        response: "❌ Sorry, I couldn't create the recipe right now. Please try again or check your subscription status.",
        isUser: false,
        text: "❌ Sorry, I couldn't create the recipe right now. Please try again or check your subscription status.",
        timestamp: new Date(),
      };
      
      setLocalMessages(prev => [...prev, errorMessage]);
    }
  });

  // Recipe generation mutation for confirmed intent
  const generateRecipeMutation = useMutation({
    mutationFn: async (data: { 
      message: string; 
      suggestedRecipeTitle?: string;
      isFlavorMaximized?: boolean;
      selectedInspiration?: string;
      originalMessage?: string;
    }) => {
      const response = await fetch("/api/zest/generate-recipe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: data.message,
          userConfirmed: true,
          suggestedRecipeTitle: data.suggestedRecipeTitle,
          isFlavorMaximized: data.isFlavorMaximized,
          selectedInspiration: data.selectedInspiration,
          originalMessage: data.originalMessage
        }),
      });

      if (!response.ok) {
        throw new Error(`Recipe generation failed: ${response.statusText}`);
      }

      return response.json();
    },
    onSuccess: (result) => {
      console.log('🧪 Recipe generated successfully! Response:', result);
      console.log('🔍 Recipe data check:', {
        hasRecipe: !!result.recipe,
        recipeTitle: result.recipe?.title,
        savedRecipeId: result.savedRecipeId,
        messageContent: result.message
      });
      
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

      // Update recipe store with generated recipe and navigate
      if (result.recipe) {
        console.log('Generated recipe:', result.recipe);
        
        // Update the global recipe store with the generated recipe
        const ingredients = (result.recipe.ingredients || []).map((ingredient: string, index: number) => ({
          id: (index + 1).toString(),
          text: ingredient,
          checked: false
        }));
        
        const steps = (result.recipe.instructions || []).map((instruction: string, index: number) => ({
          id: (index + 1).toString(),
          title: `Step ${index + 1}`,
          description: instruction,
          completed: false
        }));
        
        // Use updateActiveRecipe to properly update the store
        recipeActions.updateActiveRecipe({
          title: result.recipe.title,
          description: result.recipe.description || '',
          cookTime: result.recipe.cookTime || 30,
          servings: result.recipe.servings || 4,
          difficulty: result.recipe.difficulty || 'medium',
          cuisine: result.recipe.cuisine || '',
          ingredients: ingredients,
          instructions: steps,
          tips: result.recipe.tips || ''
        });
        
        // Add success message with View Recipe button
        const successMessage: ChatMessage = {
          id: Date.now() + 1,
          message: "",
          response: `✅ Success! ${result.recipe.title} has been created and is ready to cook.`,
          isUser: false,
          text: `✅ Success! ${result.recipe.title} has been created and is ready to cook.`,
          timestamp: new Date(),
          isRecipeCreated: true,
          recipeTitle: result.recipe.title,
          savedRecipeId: result.savedRecipeId
        };
        
        setLocalMessages(prev => [...prev, successMessage]);
      }
    },
    onError: (error) => {
      console.error('Recipe generation error:', error);
      
      // Add error message to chat instead of toast
      const errorMessage: ChatMessage = {
        id: Date.now(),
        message: "",
        response: "❌ Sorry, I couldn't create the recipe right now. This might be because you've reached your monthly recipe limit or there was a technical issue. Please try again or check your subscription status.",
        isUser: false,
        text: "❌ Sorry, I couldn't create the recipe right now. This might be because you've reached your monthly recipe limit or there was a technical issue. Please try again or check your subscription status.",
        timestamp: new Date(),
      };
      
      setLocalMessages(prev => [...prev, errorMessage]);
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
    if (actualIsOpen && chatHistory && !hasInitialized) {
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

      setLocalMessages(messages);
      setHasInitialized(true);
    }
  }, [actualIsOpen, chatHistory, hasInitialized]);

  const handleSend = (messageText?: string, useOptimized: boolean = true) => {
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

    // Use optimized chat by default for cost efficiency
    if (useOptimized) {
      optimizedChatMutation.mutate({ 
        message: textToSend,
        currentRecipe,
        mode: detectedMode
      });
    } else {
      // Fallback to original chat for complex cases
      sendMessageMutation.mutate({ 
        message: textToSend,
        currentRecipe,
        mode: detectedMode
      });
    }
    
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
    <div className="h-full flex flex-col bg-slate-900 md:static md:h-full mobile-chat-panel">
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
            className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 chat-messages mobile-chat-messages"
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
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        onClick={() => {
                          generateRecipeMutation.mutate({ 
                            message: msg.originalMessage!, 
                            suggestedRecipeTitle: msg.suggestedRecipeTitle,
                            isFlavorMaximized: (msg as any).isFlavorMaximized,
                            selectedInspiration: (msg as any).selectedInspiration,
                            originalMessage: (msg as any).originalMessage
                          });
                          // Remove confirmation message after click
                          setLocalMessages(prev => prev.filter(m => m.id !== msg.id));
                        }}
                        disabled={generateRecipeMutation.isPending}
                        className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white text-xs px-3 py-1"
                      >
                        {generateRecipeMutation.isPending ? "Creating..." : "Recipe Card"}
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => {
                          // Generate quick recipe directly in chat
                          sendMessageMutation.mutate({ 
                            message: `Quick recipe for: ${msg.suggestedRecipeTitle || msg.originalMessage}`, 
                            currentRecipe: getCurrentRecipeContext().recipe || undefined,
                            mode: detectedMode 
                          });
                          // Remove confirmation message after click
                          setLocalMessages(prev => prev.filter(m => m.id !== msg.id));
                        }}
                        disabled={sendMessageMutation.isPending}
                        className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white text-xs px-3 py-1"
                      >
                        {sendMessageMutation.isPending ? "Getting..." : "Quick Recipe"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          // Remove confirmation message and send alternative request to backend
                          setLocalMessages(prev => prev.filter(m => m.id !== msg.id));
                          
                          // Extract context from original message for smart suggestions  
                          const originalLower = msg.originalMessage?.toLowerCase() || '';
                          let contextType = '';
                          
                          if (originalLower.includes('healthy breakfast') || originalLower.includes('breakfast')) {
                            contextType = 'healthy breakfast';
                          } else if (originalLower.includes('pasta')) {
                            contextType = 'pasta';
                          } else if (originalLower.includes('chicken')) {
                            contextType = 'chicken';
                          } else if (originalLower.includes('beef')) {
                            contextType = 'beef';
                          } else if (originalLower.includes('fish') || originalLower.includes('salmon')) {
                            contextType = 'fish';
                          } else if (originalLower.includes('vegetarian') || originalLower.includes('vegan')) {
                            contextType = 'vegetarian';
                          } else if (originalLower.includes('dinner')) {
                            contextType = 'dinner';
                          } else if (originalLower.includes('lunch')) {
                            contextType = 'lunch';
                          } else {
                            contextType = 'recipe';
                          }
                          
                          // Send alternative request message to backend to create proper conversation history
                          const alternativeRequest = `No thanks to that recipe. Would you like me to suggest another ${contextType} recipe instead?`;
                          
                          // Add the alternative request message to local chat
                          const botMessage: ChatMessage = {
                            id: Date.now(),
                            message: '',
                            response: alternativeRequest,
                            isUser: false,
                            text: alternativeRequest,
                            timestamp: new Date(),
                            waitingForAlternative: true,
                            originalContext: msg.originalMessage
                          };
                          
                          setLocalMessages(prev => [...prev, botMessage]);
                          
                          // Also send to backend to save in conversation history
                          sendMessageMutation.mutate({ 
                            message: alternativeRequest,
                            currentRecipe,
                            mode: detectedMode,
                            // System message for alternative suggestions
                          });
                        }}
                        className="border-slate-500 text-slate-300 hover:bg-slate-600 text-xs px-3 py-1"
                      >
                        No Thanks
                      </Button>
                    </div>
                  )}

                  {/* NEW: Optimized chat action buttons */}
                  {msg.suggestedActions && msg.suggestedActions.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {msg.suggestedActions.map((action, actionIndex) => {
                        if (action.type === 'quick_recipe') {
                          return (
                            <Button
                              key={actionIndex}
                              size="sm"
                              onClick={() => {
                                // Generate quick recipe directly in chat
                                handleSend(`Quick recipe for: ${action.data?.title || 'recipe'}`, false);
                              }}
                              disabled={sendMessageMutation.isPending}
                              className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white text-xs px-3 py-1"
                            >
                              {action.label}
                            </Button>
                          );
                        } else if (action.type === 'full_recipe') {
                          return (
                            <Button
                              key={actionIndex}
                              size="sm"
                              onClick={() => {
                                optimizedRecipeMutation.mutate({
                                  suggestedTitle: action.data?.title,
                                  originalMessage: action.data?.originalMessage,
                                  type: 'full'
                                });
                              }}
                              disabled={optimizedRecipeMutation.isPending}
                              className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white text-xs px-3 py-1"
                            >
                              {optimizedRecipeMutation.isPending ? "Creating..." : action.label}
                            </Button>
                          );
                        } else if (action.type === 'continue_chat') {
                          return (
                            <Button
                              key={actionIndex}
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                // Continue conversation or ask for alternatives
                                if (action.data?.alternatives) {
                                  // Show alternatives
                                  const altMessage = `Here are some other ideas: ${action.data.alternatives.slice(0, 2).join(', ')}. Would you like one of these instead?`;
                                  setLocalMessages(prev => [...prev, {
                                    id: Date.now(),
                                    message: "",
                                    response: altMessage,
                                    isUser: false,
                                    text: altMessage,
                                    timestamp: new Date(),
                                  }]);
                                } else {
                                  handleSend("Could you suggest something different?");
                                }
                              }}
                              className="text-orange-500 border-orange-500 hover:bg-orange-500 hover:text-white text-xs px-3 py-1"
                            >
                              {action.label}
                            </Button>
                          );
                        }
                        return null;
                      })}
                      
                    </div>
                  )}

                  {/* NEW: Intent clarification options with radio buttons */}
                  {msg.requiresIntentClarification && msg.clarificationOptions && (
                    <div className="mt-4 p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                      <h4 className="text-sm font-medium text-white mb-3">How would you like your recipe?</h4>
                      <div className="space-y-3">
                        {msg.clarificationOptions.map((option, optionIndex) => (
                          <label
                            key={optionIndex}
                            className="flex items-start space-x-3 p-3 rounded-lg border border-slate-600 hover:border-orange-500 hover:bg-slate-700/50 cursor-pointer transition-all"
                          >
                            <input
                              type="radio"
                              name={`clarification-${msg.id}`}
                              value={option.type}
                              className="mt-1 text-orange-500 focus:ring-orange-500 focus:ring-2"
                              onChange={() => {
                                const originalMessage = msg.message;
                                
                                if (option.type === 'quick_recipe') {
                                  // Send request for quick recipe in chat
                                  optimizedChatMutation.mutate({ message: `Quick recipe for: ${originalMessage}` });
                                } else if (option.type === 'full_recipe') {
                                  // Generate full recipe card
                                  optimizedRecipeMutation.mutate({
                                    suggestedTitle: originalMessage,
                                    originalMessage: originalMessage,
                                    type: 'full'
                                  });
                                } else if (option.type === 'recipe_options') {
                                  // Show 3 recipe options
                                  optimizedChatMutation.mutate({ message: `Show me 3 recipe options for: ${originalMessage}` });
                                }
                              }}
                            />
                            <div className="flex-1">
                              <div className="flex items-center space-x-2">
                                <span className="text-lg">{option.icon}</span>
                                <span className="font-medium text-white">{option.label}</span>
                              </div>
                              <p className="text-sm text-slate-400 mt-1">{option.description}</p>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* View Recipe Card button after successful generation */}
                  {msg.isRecipeCreated && (
                    <div className="mt-3">
                      <Button
                        size="sm"
                        onClick={() => {
                          // Navigate to the generated recipe
                          if (!isAuthenticated) {
                            // Create temporary recipe view URL and navigate
                            const recipeData = encodeURIComponent(JSON.stringify(recipeStore));
                            window.location.href = `/temp-recipe?data=${recipeData}`;
                          } else {
                            // For authenticated users, navigate to the recipe view page
                            // First close the chat, then navigate
                            if (onClose) onClose();
                            
                            // Navigate to the recipe view after a brief delay
                            setTimeout(() => {
                              // Use the saved recipe ID from the message if available
                              const savedRecipeId = msg.savedRecipeId;
                              if (savedRecipeId) {
                                window.location.href = `/recipe/${savedRecipeId}`;
                              } else {
                                // Fallback: navigate to recipes list and it will show the latest recipe
                                window.location.href = '/recipes';
                              }
                            }, 100);
                          }
                        }}
                        className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white text-xs px-3 py-1 flex items-center gap-2"
                      >
                        <iconMap.chefHat className="w-3 h-3" />
                        View Recipe Card
                      </Button>
                    </div>
                  )}
                  
                  <p className="text-[10px] sm:text-xs opacity-70 mt-1">
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}
            {(sendMessageMutation.isPending || generateRecipeMutation.isPending || optimizedChatMutation.isPending || optimizedRecipeMutation.isPending) && (
              <div className="text-left">
                <div className="inline-block px-4 py-2 rounded-xl bg-slate-700/90 backdrop-blur-sm border border-slate-600/50">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    <span className="text-slate-300 text-sm ml-2">
                      {generateRecipeMutation.isPending || optimizedRecipeMutation.isPending
                        ? "Creating your recipe..." 
                        : optimizedChatMutation.isPending
                        ? "Zest is thinking (optimized)..."
                        : hasCurrentRecipe 
                        ? "Updating your recipe..." 
                        : "Zest is thinking..."}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Suggestion Chips - Keep visible throughout conversation */}
          {showSuggestions && (
            <div className="px-3 sm:px-4 py-3 border-t border-slate-700/50 flex-shrink-0 bg-slate-900/50">
              <div className="text-xs text-slate-400 mb-2">Quick suggestions:</div>
              <div 
                className={`grid grid-cols-1 sm:grid-cols-2 gap-2 transition-opacity duration-200 ${isRotating ? 'opacity-0' : 'opacity-100'}`}
              >
                {suggestionChips.map((chip, index) => (
                  <Badge
                    key={`${chipRotationIndex}-${index}`}
                    variant={chip.updatesRecipe ? "secondary" : "outline"}
                    className="cursor-pointer hover:bg-orange-500 hover:text-white transition-all duration-300 flex items-center gap-1 shadow-md backdrop-blur-sm bg-slate-700/80 border-slate-600 text-white justify-start p-2 h-auto min-h-[36px] text-left"
                    onClick={handleSuggestionClick(chip.text)}
                  >
                    <chip.icon className="w-3 h-3 flex-shrink-0" />
                    <span className="text-xs leading-tight">{chip.text}</span>
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Input Area - Mobile Keyboard Safe */}
          <div 
            className="border-t-2 border-orange-500/60 bg-slate-900 p-3 sm:p-4 flex-shrink-0 chat-input-area"
            style={{
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
