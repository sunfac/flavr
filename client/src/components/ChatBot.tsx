import { useState, useRef, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

interface ChatMessage {
  id: number;
  message: string;
  response: string;
  isUser: boolean;
  text: string;
  timestamp: Date;
}

export default function ChatBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [localMessages, setLocalMessages] = useState<ChatMessage[]>([]);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

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

  const handleSend = () => {
    if (!message.trim()) return;

    // Add user message immediately
    const userMessage: ChatMessage = {
      id: Date.now(),
      message,
      response: "",
      isUser: true,
      text: message,
      timestamp: new Date(),
    };
    setLocalMessages(prev => [...prev, userMessage]);

    // Send to API
    sendMessageMutation.mutate({ message });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* Floating Button */}
      <div className="fixed bottom-20 right-4 z-40">
        <Button
          onClick={() => setIsOpen(!isOpen)}
          className="w-14 h-14 bg-gradient-to-br from-primary to-secondary text-white rounded-full shadow-lg hover:shadow-xl transition-all animate-pulse-slow"
          size="sm"
        >
          <i className="fas fa-comment-alt text-xl"></i>
        </Button>
      </div>

      {/* Chat Panel */}
      <div 
        className={`fixed bottom-0 left-0 right-0 bg-card border-t border-border max-h-96 transition-transform duration-300 z-50 ${
          isOpen ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <CardHeader className="p-4 border-b border-border flex flex-row items-center justify-between space-y-0">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-primary to-secondary rounded-full flex items-center justify-center">
              <i className="fas fa-chef-hat text-white text-sm"></i>
            </div>
            <div>
              <h3 className="font-medium text-foreground">Chef Assistant</h3>
              <p className="text-xs text-muted-foreground">Ask me anything about cooking!</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-8 h-8 p-0 rounded-full"
            onClick={() => setIsOpen(false)}
          >
            <i className="fas fa-times text-muted-foreground text-sm"></i>
          </Button>
        </CardHeader>
        
        <ScrollArea className="h-64 p-4" ref={scrollAreaRef}>
          <div className="space-y-3">
            {localMessages.map((msg) => (
              <div key={msg.id} className="flex space-x-3">
                <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                  <i className={`fas ${msg.isUser ? "fa-user" : "fa-robot"} text-white text-xs`}></i>
                </div>
                <div className={`rounded-xl p-3 max-w-xs ${
                  msg.isUser ? "bg-primary text-primary-foreground ml-auto" : "bg-muted text-foreground"
                }`}>
                  <p className="text-sm">{msg.text}</p>
                </div>
              </div>
            ))}
            {sendMessageMutation.isPending && (
              <div className="flex space-x-3">
                <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                  <i className="fas fa-robot text-white text-xs"></i>
                </div>
                <div className="bg-muted rounded-xl p-3 max-w-xs">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "0.1s" }}></div>
                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="p-4 border-t border-border">
          <div className="flex space-x-2">
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask about substitutions, cooking tips..."
              className="flex-1"
              disabled={sendMessageMutation.isPending}
            />
            <Button 
              onClick={handleSend}
              className="w-12 h-12 p-0"
              disabled={!message.trim() || sendMessageMutation.isPending}
            >
              <i className="fas fa-paper-plane"></i>
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
