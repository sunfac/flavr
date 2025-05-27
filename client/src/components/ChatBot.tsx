import { useState, useRef, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { MessageCircle, X, Send, ChefHat, User, Bot } from "lucide-react";

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
  const [hasInitialized, setHasInitialized] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const [location] = useLocation();

  // Get current mode from URL if not provided
  const detectedMode = currentMode || 
    (location.includes('/shopping') ? 'shopping' : 
     location.includes('/fridge') ? 'fridge' : 
     location.includes('/chef') ? 'chef' : undefined);

  // Conversation suggestion chips
  const suggestionChips = [
    { text: "Use chicken instead", icon: "🍗", updatesRecipe: true },
    { text: "Use beef instead", icon: "🥩", updatesRecipe: true },
    { text: "Make it vegetarian", icon: "🌱", updatesRecipe: true },
    { text: "Make it dairy-free", icon: "🥛", updatesRecipe: true },
    { text: "Make it spicier", icon: "🌶️", updatesRecipe: true },
    { text: "Add wine pairing", icon: "🍷", updatesRecipe: false },
    { text: "Add a side dish", icon: "🥗", updatesRecipe: false },
    { text: "Increase servings", icon: "👥", updatesRecipe: true }
  ];

  // Get chat history
  const { data: historyData } = useQuery({
    queryKey: ["/api/chat/history"],
    enabled: isOpen,
  });

  // Send chat message
  const sendMessageMutation = useMutation({
    mutationFn: (data: { message: string; currentRecipe?: Recipe; mode?: string }) =>
      apiRequest("POST", "/api/chat", data),
    onSuccess: async (response) => {
      const result = await response.json();
      const newMessage: ChatMessage = {
        id: Date.now(),
        message,
        response: result.response,
        isUser: false,
        text: result.response,
        timestamp: new Date(),
      };
      setLocalMessages(prev => [...prev, newMessage]);
      setMessage("");

      // Check if the response includes recipe updates
      if (result.updatedRecipe && onRecipeUpdate) {
        onRecipeUpdate(result.updatedRecipe);
      }
    },
  });

  // Initialize with welcome message
  useEffect(() => {
    if (!hasInitialized && isOpen) {
      const welcomeMessage: ChatMessage = {
        id: Date.now(),
        message: "",
        response: "Let's cook something unforgettable. What do you feel like today?",
        isUser: false,
        text: "Let's cook something unforgettable. What do you feel like today?",
        timestamp: new Date(),
      };
      setLocalMessages([welcomeMessage]);
      setHasInitialized(true);
    }
  }, [isOpen, hasInitialized]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [localMessages]);

  // Initialize with welcome message and history
  useEffect(() => {
    if (isOpen && historyData?.history) {
      const messages: ChatMessage[] = [];
      
      // Add welcome message
      messages.push({
        id: 0,
        message: "",
        response: "Hi! I'm here to help with any cooking questions. Need substitutions, cooking tips, or modifications to your recipe?",
        isUser: false,
        text: "Hi! I'm here to help with any cooking questions. Need substitutions, cooking tips, or modifications to your recipe?",
        timestamp: new Date(),
      });

      // Add history messages
      historyData.history.forEach((msg: any) => {
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
    }
  }, [isOpen, historyData]);

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
              <X className="w-5 h-5" />
            ) : (
              <MessageCircle className="w-5 h-5" />
            )}
          </Button>
          {!isOpen && (
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
              <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
            </div>
          )}
        </div>
      </div>

      {/* Chat Panel */}
      <div 
        className={`fixed bottom-24 left-4 right-4 glass border border-white/20 rounded-t-3xl transition-all duration-500 z-50 backdrop-blur-xl flex flex-col ${
          isOpen ? "translate-y-0 opacity-100" : "translate-y-full opacity-0"
        }`}
        style={{ maxHeight: 'calc(100vh - 200px)' }}
      >
        <CardHeader className="p-4 border-b border-white/10 flex flex-row items-center justify-between space-y-0 flex-shrink-0">
          <div className="flex items-center space-x-3">
            <div className="relative group">
              <div className="w-10 h-10 bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-all duration-300">
                <ChefHat className="text-white w-4 h-4" />
              </div>
              <div className="absolute inset-0 bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl blur-lg opacity-30 group-hover:opacity-50 transition-opacity duration-300"></div>
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-lg">Chef Assistant</h3>
              <p className="text-sm text-slate-600">Ask me anything about cooking!</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-8 h-8 p-0 rounded-xl glass hover:scale-110 transition-all duration-300 group"
            onClick={() => setIsOpen(false)}
          >
            <X className="w-4 h-4 text-slate-600 group-hover:text-slate-800" />
          </Button>
        </CardHeader>
        
        <ScrollArea className="flex-1 p-4 min-h-0 max-h-64 overflow-y-auto" ref={scrollAreaRef}>
          <div className="space-y-4">
            {localMessages.map((msg) => (
              <div key={msg.id} className={`flex space-x-3 ${msg.isUser ? 'justify-end' : 'justify-start'}`}>
                {!msg.isUser && (
                  <div className="w-8 h-8 bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md">
                    <Bot className="text-white w-4 h-4" />
                  </div>
                )}
                <div className={`rounded-2xl p-4 max-w-xs shadow-lg transition-all duration-300 hover:scale-105 ${
                  msg.isUser 
                    ? "bg-gradient-to-r from-orange-500 to-orange-600 text-white ml-4" 
                    : "bg-card/90 backdrop-blur-sm text-foreground border border-border"
                }`}>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{msg.text}</p>
                </div>
                {msg.isUser && (
                  <div className="w-8 h-8 bg-slate-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md">
                    <User className="text-white w-4 h-4" />
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

        {/* Suggestion Chips - Above input */}
        {showSuggestions && currentRecipe && (
          <div className="px-4 py-2 border-t border-white/10 flex-shrink-0">
            <p className="text-xs font-medium text-slate-600 mb-2">Quick suggestions:</p>
            <div className="flex flex-wrap gap-1">
              {suggestionChips.map((chip, index) => (
                <Badge
                  key={index}
                  variant="outline"
                  className={`cursor-pointer transition-all duration-300 px-2 py-1 text-xs hover:scale-105 ${
                    chip.updatesRecipe 
                      ? 'bg-blue-500/10 border-blue-400/30 text-blue-600 hover:bg-blue-500/20 hover:border-blue-400/50' 
                      : 'bg-orange-500/10 border-orange-400/30 text-orange-400 hover:bg-orange-500/20 hover:border-orange-400/50'
                  }`}
                  onClick={handleSuggestionClick(chip.text)}
                >
                  <span className="mr-1">{chip.icon}</span>
                  {chip.text}
                  {chip.updatesRecipe && <span className="ml-1 text-xs">📝</span>}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Input Area */}
        <div className="p-4 border-t border-white/10 flex-shrink-0">
          <div className="flex space-x-2">
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask about substitutions, cooking tips..."
              className="flex-1 h-10 input-modern glass border-white/20 placeholder:text-slate-500 text-sm"
              disabled={sendMessageMutation.isPending}
            />
            <Button 
              onClick={() => handleSend()}
              className="h-10 px-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100"
              disabled={!message.trim() || sendMessageMutation.isPending}
            >
              {sendMessageMutation.isPending ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
