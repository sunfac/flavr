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
  const [showSuggestions, setShowSuggestions] = useState(false);
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
    { text: "Add wine pairing", icon: "🍷" },
    { text: "Make it spicier", icon: "🌶️" },
    { text: "Increase servings", icon: "👥" },
    { text: "Add a side dish", icon: "🥗" },
    { text: "Substitute an ingredient", icon: "🔄" },
    { text: "Change the protein", icon: "🥩" }
  ];

  // Get chat history
  const { data: historyData } = useQuery({
    queryKey: ["/api/chat/history"],
    enabled: isOpen,
  });

  // Send chat message
  const sendMessageMutation = useMutation({
    mutationFn: (data: { message: string }) =>
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
    },
  });

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
      <div className="fixed bottom-20 right-4 z-40">
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
        className={`fixed bottom-0 left-0 right-0 glass border-t border-white/20 max-h-[32rem] transition-all duration-500 z-50 backdrop-blur-xl ${
          isOpen ? "translate-y-0 opacity-100" : "translate-y-full opacity-0"
        }`}
      >
        <CardHeader className="p-6 border-b border-white/10 flex flex-row items-center justify-between space-y-0">
          <div className="flex items-center space-x-4">
            <div className="relative group">
              <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-all duration-300">
                <ChefHat className="text-white w-5 h-5" />
              </div>
              <div className="absolute inset-0 bg-gradient-to-r from-orange-500 to-orange-600 rounded-2xl blur-lg opacity-30 group-hover:opacity-50 transition-opacity duration-300"></div>
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-lg">Chef Assistant</h3>
              <p className="text-sm text-slate-600">Ask me anything about cooking!</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-10 h-10 p-0 rounded-xl glass hover:scale-110 transition-all duration-300 group"
            onClick={() => setIsOpen(false)}
          >
            <X className="w-4 h-4 text-slate-600 group-hover:text-slate-800" />
          </Button>
        </CardHeader>
        
        <ScrollArea className="h-72 p-6" ref={scrollAreaRef}>
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
                  <p className="text-sm leading-relaxed">{msg.text}</p>
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

        <div className="p-6 border-t border-white/10 space-y-4">
          {/* Suggestion Chips */}
          {showSuggestions && currentRecipe && (
            <div className="space-y-3">
              <p className="text-sm font-medium text-slate-600">Quick suggestions:</p>
              <div className="flex flex-wrap gap-2">
                {suggestionChips.map((chip, index) => (
                  <Badge
                    key={index}
                    variant="secondary"
                    className="cursor-pointer glass border border-white/20 hover:scale-105 transition-all duration-300 px-3 py-2 text-sm"
                    onClick={handleSuggestionClick(chip.text)}
                  >
                    <span className="mr-2">{chip.icon}</span>
                    {chip.text}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Input Area */}
          <div className="flex space-x-3">
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask about substitutions, cooking tips..."
              className="flex-1 h-12 input-modern glass border-white/20 placeholder:text-slate-500"
              disabled={sendMessageMutation.isPending}
            />
            <Button 
              onClick={() => handleSend()}
              className="w-12 h-12 p-0 gradient-primary btn-modern shadow-lg hover:shadow-xl"
              disabled={!message.trim() || sendMessageMutation.isPending}
            >
              <i className="fas fa-paper-plane text-white"></i>
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
