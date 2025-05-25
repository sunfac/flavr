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
      <div className="fixed bottom-24 right-6 z-40">
        <div className="relative group">
          <Button
            onClick={() => setIsOpen(!isOpen)}
            className="w-16 h-16 gradient-primary text-white rounded-2xl shadow-2xl hover:shadow-orange-300/50 transition-all duration-500 group-hover:scale-110 btn-modern animate-bounce-gentle"
            size="sm"
          >
            <i className={`fas ${isOpen ? 'fa-times' : 'fa-comment-alt'} text-2xl transition-all duration-300`}></i>
          </Button>
          <div className="absolute inset-0 gradient-primary rounded-2xl blur-xl opacity-40 group-hover:opacity-60 transition-opacity duration-500"></div>
          {!isOpen && (
            <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center animate-pulse">
              <div className="w-2 h-2 bg-white rounded-full"></div>
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
              <div className="w-12 h-12 gradient-primary rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-all duration-300">
                <i className="fas fa-chef-hat text-white text-lg"></i>
              </div>
              <div className="absolute inset-0 gradient-primary rounded-2xl blur-lg opacity-30 group-hover:opacity-50 transition-opacity duration-300"></div>
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
            <i className="fas fa-times text-slate-600 group-hover:text-slate-800"></i>
          </Button>
        </CardHeader>
        
        <ScrollArea className="h-72 p-6" ref={scrollAreaRef}>
          <div className="space-y-4">
            {localMessages.map((msg) => (
              <div key={msg.id} className={`flex space-x-3 ${msg.isUser ? 'justify-end' : 'justify-start'}`}>
                {!msg.isUser && (
                  <div className="w-8 h-8 gradient-primary rounded-xl flex items-center justify-center flex-shrink-0 shadow-md">
                    <i className="fas fa-robot text-white text-sm"></i>
                  </div>
                )}
                <div className={`rounded-2xl p-4 max-w-xs shadow-lg transition-all duration-300 hover:scale-105 ${
                  msg.isUser 
                    ? "gradient-primary text-white ml-4" 
                    : "glass text-slate-800 border border-white/20"
                }`}>
                  <p className="text-sm leading-relaxed">{msg.text}</p>
                </div>
                {msg.isUser && (
                  <div className="w-8 h-8 bg-slate-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md">
                    <i className="fas fa-user text-white text-sm"></i>
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

        <div className="p-6 border-t border-white/10">
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
              onClick={handleSend}
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
