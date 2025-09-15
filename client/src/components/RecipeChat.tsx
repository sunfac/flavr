import React, { useState, useRef, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { iconMap } from "@/lib/iconMap";
import { useRecipeStore, recipeActions, Step } from "@/stores/recipeStore";
import { X, Send, MessageCircle } from "lucide-react";

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
}

interface RecipeChatProps {
  currentRecipe?: Recipe;
  onRecipeUpdate?: (updatedRecipe: Recipe) => void;
  isOpen?: boolean;
  onClose?: () => void;
}

export default function RecipeChat({ 
  currentRecipe, 
  onRecipeUpdate, 
  isOpen = true,
  onClose
}: RecipeChatProps) {

  const [message, setMessage] = useState("");
  const [localMessages, setLocalMessages] = useState<ChatMessage[]>([]);
  const [hasShownWelcome, setHasShownWelcome] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Connect to global recipe store
  const recipeStore = useRecipeStore();
  
  // Get current recipe data from store or props
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
      hasRecipe: !!(activeRecipe.title && activeRecipe.ingredients?.length > 0)
    };
  };

  // Only render if there's an active recipe
  const { hasRecipe, recipe } = getCurrentRecipeContext();
  if (!hasRecipe || !isOpen) {
    return null;
  }

  // Generate unique key for current recipe to persist chat per recipe
  const getRecipeKey = () => {
    if (!recipe || !recipe.title) return 'no-recipe';
    // Use recipe ID if available for better stability, fallback to title slug
    const identifier = recipe.id 
      ? `id-${recipe.id}` 
      : `title-${recipe.title.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}`;
    return `recipe-chat-${identifier}`;
  };
  
  // Save chat history to localStorage per recipe
  const saveChatHistory = (messages: ChatMessage[]) => {
    try {
      const recipeKey = getRecipeKey();
      localStorage.setItem(`chat-history-${recipeKey}`, JSON.stringify(messages));
    } catch (error) {
      console.warn('Failed to save chat history:', error);
    }
  };
  
  // Load chat history from localStorage for current recipe
  const loadChatHistory = (): ChatMessage[] => {
    try {
      const recipeKey = getRecipeKey();
      const saved = localStorage.getItem(`chat-history-${recipeKey}`);
      if (!saved) return [];
      
      // Parse and fix timestamp deserialization bug
      const parsedMessages = JSON.parse(saved);
      return parsedMessages.map((msg: any) => ({
        ...msg,
        // Convert string timestamps back to Date objects
        timestamp: typeof msg.timestamp === 'string' ? new Date(msg.timestamp) : msg.timestamp
      }));
    } catch (error) {
      console.warn('Failed to load chat history:', error);
      return [];
    }
  };

  // Recipe modification suggestions
  const recipeModificationChips = [
    { text: "Make this for 6 people", icon: iconMap.users },
    { text: "Make it vegan", icon: iconMap.heart },
    { text: "Add more spice", icon: iconMap.sparkles },
    { text: "Make it gluten-free", icon: iconMap.shield },
    { text: "Add a side dish", icon: iconMap.utensilsCrossed },
    { text: "Make it healthier", icon: iconMap.target },
    { text: "Double the recipe", icon: iconMap.plus },
    { text: "Make it dairy-free", icon: iconMap.droplets },
    { text: "How can I prep ahead?", icon: iconMap.timer },
    { text: "Make it easier to cook", icon: iconMap.chefHat },
    { text: "Add more vegetables", icon: iconMap.leaf },
    { text: "Turn into meal prep", icon: iconMap.calendar },
  ];

  // Load chat history when component mounts or recipe changes
  useEffect(() => {
    const savedMessages = loadChatHistory();
    setLocalMessages(savedMessages);
    
    // Show welcome message if no chat history exists
    if (savedMessages.length === 0 && !hasShownWelcome && recipe.title) {
      const welcomeMessage: ChatMessage = {
        id: Date.now(),
        message: "",
        response: `Hi! I'm here to help you with "${recipe.title}". Ask me anything about modifying the recipe, cooking techniques, or any questions you have!`,
        isUser: false,
        text: `Hi! I'm here to help you with "${recipe.title}". Ask me anything about modifying the recipe, cooking techniques, or any questions you have!`,
        timestamp: new Date(),
      };
      
      setLocalMessages([welcomeMessage]);
      setHasShownWelcome(true);
    }
  }, [recipe.title, hasShownWelcome]);
  
  // Save chat history whenever localMessages changes
  useEffect(() => {
    if (localMessages.length > 0) {
      saveChatHistory(localMessages);
    }
  }, [localMessages]);

  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [localMessages]);

  // Enhanced Zest chat with recipe modification support
  const sendMessageMutation = useMutation({
    mutationFn: async (data: { message: string }) => {
      // Build conversation history from local messages
      const conversationHistory = localMessages.map(msg => ({
        role: msg.isUser ? 'user' : 'assistant',
        content: msg.isUser ? msg.message : msg.response
      }));

      const response = await fetch("/api/zest/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: data.message,
          conversationHistory,
          currentRecipe: getCurrentRecipeContext().recipe,
          openAIContext: getCurrentRecipeContext()
        }),
      });

      if (!response.ok) {
        throw new Error(`Chat request failed: ${response.statusText}`);
      }

      return await response.json();
    },
    onSuccess: async (result, variables) => {
      // Handle recipe modification with live streaming updates
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
        
        return;
      }

      // Create regular chat response message
      const chatMessage: ChatMessage = {
        id: Date.now(),
        message: variables.message,
        response: result.response || result.message,
        isUser: false,
        text: result.response || result.message,
        timestamp: new Date(),
      };

      setLocalMessages(prev => [...prev, chatMessage]);
      setMessage("");
    },
    onError: (error) => {
      console.error('Recipe chat error:', error);
      
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !sendMessageMutation.isPending) {
      // Add user message immediately
      const userMessage: ChatMessage = {
        id: Date.now(),
        message: message.trim(),
        response: "",
        isUser: true,
        text: message.trim(),
        timestamp: new Date(),
      };

      setLocalMessages(prev => [...prev, userMessage]);
      sendMessageMutation.mutate({ message: message.trim() });
      setMessage("");
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setMessage(suggestion);
    // Auto-submit the suggestion
    setTimeout(() => {
      const userMessage: ChatMessage = {
        id: Date.now(),
        message: suggestion,
        response: "",
        isUser: true,
        text: suggestion,
        timestamp: new Date(),
      };

      setLocalMessages(prev => [...prev, userMessage]);
      sendMessageMutation.mutate({ message: suggestion });
    }, 100);
  };

  return (
    <Card className="h-full flex flex-col bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
      {/* Header */}
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-2">
          <MessageCircle className="h-5 w-5 text-orange-500" />
          <h3 className="font-semibold text-gray-900 dark:text-white">Recipe Assistant</h3>
        </div>
        {onClose && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onClose}
            className="h-8 w-8 p-0 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            data-testid="button-close-chat"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </CardHeader>

      {/* Chat Messages */}
      <CardContent className="flex-1 flex flex-col p-4 space-y-4 overflow-hidden">
        <div 
          ref={scrollAreaRef}
          className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600"
          data-testid="chat-messages-container"
        >
          {localMessages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.isUser ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-xs lg:max-w-md px-3 py-2 rounded-lg ${
                  msg.isUser
                    ? 'bg-orange-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                }`}
                data-testid={msg.isUser ? "message-user" : "message-assistant"}
              >
                <p className="text-sm whitespace-pre-wrap">
                  {msg.isUser ? msg.message : msg.response}
                </p>
                <p className="text-xs opacity-70 mt-1">
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          ))}
          
          {sendMessageMutation.isPending && (
            <div className="flex justify-start">
              <div className="bg-gray-100 dark:bg-gray-700 px-3 py-2 rounded-lg max-w-xs">
                <p className="text-sm text-gray-600 dark:text-gray-300">Typing...</p>
              </div>
            </div>
          )}
        </div>

        {/* Suggestion Chips */}
        {localMessages.length <= 1 && (
          <div className="space-y-2">
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Quick suggestions:</p>
            <div className="grid grid-cols-2 gap-2">
              {recipeModificationChips.slice(0, 4).map((chip, index) => {
                const IconComponent = chip.icon;
                return (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    onClick={() => handleSuggestionClick(chip.text)}
                    className="text-xs h-auto py-2 px-3 justify-start text-left whitespace-normal"
                    data-testid={`suggestion-chip-${index}`}
                  >
                    <IconComponent className="h-3 w-3 mr-2 flex-shrink-0" />
                    <span className="truncate">{chip.text}</span>
                  </Button>
                );
              })}
            </div>
          </div>
        )}

        {/* Chat Input */}
        <form onSubmit={handleSubmit} className="flex space-x-2">
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Ask me about this recipe..."
            className="flex-1"
            disabled={sendMessageMutation.isPending}
            data-testid="input-chat-message"
          />
          <Button 
            type="submit" 
            disabled={!message.trim() || sendMessageMutation.isPending}
            className="bg-orange-500 hover:bg-orange-600 text-white"
            data-testid="button-send-message"
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}