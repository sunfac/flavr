import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { iconMap } from "@/lib/iconMap";
import { motion, AnimatePresence } from "framer-motion";
import { apiRequest } from "@/lib/queryClient";
import EnhancedRecipeCard from "@/components/recipe/EnhancedRecipeCard";
import { useRecipeStore } from "@/stores/recipeStore";
import { GoogleLiveAudioChat } from "@/components/GoogleLiveAudioChat";

interface Message {
  id: string;
  type: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  suggestions?: string[];
}

interface ConversationData {
  intent?: 'shopping' | 'ingredients' | 'idea' | 'general';
  cuisine?: string;
  portions?: number;
  equipment?: string[];
  timeAvailable?: string;
  mood?: string;
  ingredients?: string[];
  dietaryRestrictions?: string[];
  skillLevel?: string;
  occasion?: string;
  budget?: string;
  fridgePhoto?: string;
}

export default function ConversationalMode() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [conversationData, setConversationData] = useState<ConversationData>({});
  const [generatedRecipe, setGeneratedRecipe] = useState(null);
  const [showRecipeCard, setShowRecipeCard] = useState(false);
  const [conversationComplete, setConversationComplete] = useState(false);
  const [showVoiceChat, setShowVoiceChat] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recipeStore = useRecipeStore();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Initialize conversation with welcome message
    const welcomeMessage: Message = {
      id: '1',
      type: 'assistant',
      content: "Hi! I'm your personal cooking assistant. I'd love to help you create the perfect recipe today. What brings you to the kitchen?",
      timestamp: new Date(),
      suggestions: [
        "I need recipes for shopping",
        "I have ingredients to use up",
        "I have a specific dish in mind",
        "Just looking for inspiration"
      ]
    };
    setMessages([welcomeMessage]);
  }, []);

  const handleSuggestionClick = (suggestion: string) => {
    handleSendMessage(suggestion);
  };

  const handleSendMessage = async (messageText?: string) => {
    const text = messageText || input;
    if (!text.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: text,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await apiRequest("POST", "/api/conversational-recipe", {
        message: text,
        conversationHistory: messages,
        currentData: conversationData
      });

      const data = await response.json();

      if (data.recipe) {
        // Recipe generation complete
        setGeneratedRecipe(data.recipe);
        // Store recipe for potential modifications
        setConversationComplete(true);
        setShowRecipeCard(true);
        
        const completionMessage: Message = {
          id: (Date.now() + 1).toString(),
          type: 'assistant',
          content: `Perfect! I've created "${data.recipe.title}" for you. The recipe card shows all the details. Would you like me to guide you through cooking it, or would you like to modify anything?`,
          timestamp: new Date(),
          suggestions: [
            "Guide me through cooking",
            "Modify the recipe",
            "Change serving size",
            "Add wine pairing"
          ]
        };
        setMessages(prev => [...prev, completionMessage]);
      } else {
        // Continue conversation
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          type: 'assistant',
          content: data.response,
          timestamp: new Date(),
          suggestions: data.suggestions || []
        };
        setMessages(prev => [...prev, assistantMessage]);
        setConversationData(data.updatedData || conversationData);
      }
    } catch (error) {
      console.error("Conversation error:", error);
      toast({
        title: "Communication Error",
        description: "Let me try that again...",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('image', file);

    try {
      setIsLoading(true);
      const response = await apiRequest("POST", "/api/analyze-fridge", formData);
      const data = await response.json();

      const fridgeMessage: Message = {
        id: Date.now().toString(),
        type: 'user',
        content: "I've shared a photo of my fridge",
        timestamp: new Date()
      };

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: `I can see you have: ${data.ingredients.join(', ')}. ${data.response}`,
        timestamp: new Date(),
        suggestions: data.suggestions || []
      };

      setMessages(prev => [...prev, fridgeMessage, assistantMessage]);
      setConversationData(prev => ({
        ...prev,
        ingredients: data.ingredients,
        fridgePhoto: data.imageUrl
      }));
    } catch (error) {
      console.error("Fridge analysis error:", error);
      toast({
        title: "Image Analysis Failed",
        description: "Could you describe what you have instead?",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              onClick={() => navigate("/app")}
              className="text-white hover:bg-white/10"
            >
              <iconMap.arrowLeft className="w-5 h-5 mr-2" />
              Back to Modes
            </Button>
            <h1 className="text-2xl font-bold text-white">Conversational Recipe Creation</h1>
          </div>
          <Button
            variant="outline"
            onClick={() => setShowVoiceChat(!showVoiceChat)}
            className="bg-orange-500/20 border-orange-500/30 text-orange-300 hover:bg-orange-500/30"
          >
            <iconMap.mic className="w-4 h-4 mr-2" />
            {showVoiceChat ? 'Hide' : 'Voice Chat'}
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Chat Interface */}
          <div className="lg:col-span-2">
            <Card className="bg-white/5 border-white/10 backdrop-blur-sm h-[600px] flex flex-col">
              <CardHeader className="pb-4">
                <CardTitle className="text-white flex items-center">
                  <iconMap.messageCircle className="w-5 h-5 mr-2 text-orange-400" />
                  Chat with Your Cooking Assistant
                  {conversationData.intent && (
                    <Badge variant="secondary" className="ml-auto bg-orange-500/20 text-orange-300">
                      {conversationData.intent}
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              
              <CardContent className="flex-1 flex flex-col p-0">
                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                  <AnimatePresence>
                    {messages.map((message) => (
                      <motion.div
                        key={message.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[80%] rounded-2xl p-4 ${
                            message.type === 'user'
                              ? 'bg-orange-500 text-white'
                              : 'bg-white/10 text-white border border-white/20'
                          }`}
                        >
                          <p className="text-sm">{message.content}</p>
                          
                          {message.suggestions && message.suggestions.length > 0 && (
                            <div className="mt-3 space-y-2">
                              {message.suggestions.map((suggestion, index) => (
                                <Button
                                  key={index}
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleSuggestionClick(suggestion)}
                                  className="w-full justify-start text-left text-xs bg-white/10 hover:bg-white/20 text-white h-auto py-2 px-3"
                                >
                                  {suggestion}
                                </Button>
                              ))}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  
                  {isLoading && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex justify-start"
                    >
                      <div className="bg-white/10 border border-white/20 rounded-2xl p-4">
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-orange-400 rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-orange-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                          <div className="w-2 h-2 bg-orange-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="p-6 border-t border-white/10">
                  <div className="flex space-x-4">
                    <div className="flex-1 relative">
                      <Input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="Type your message..."
                        className="bg-white/10 border-white/20 text-white placeholder:text-gray-400 pr-12"
                        disabled={isLoading}
                      />
                      
                      {/* File upload for fridge photos */}
                      {!conversationComplete && (
                        <label className="absolute right-2 top-1/2 transform -translate-y-1/2 cursor-pointer">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleFileUpload}
                            className="hidden"
                          />
                          <iconMap.camera className="w-5 h-5 text-gray-400 hover:text-orange-400 transition-colors" />
                        </label>
                      )}
                    </div>
                    
                    <Button
                      onClick={() => handleSendMessage()}
                      disabled={!input.trim() || isLoading}
                      className="bg-orange-500 hover:bg-orange-600 text-white"
                    >
                      <iconMap.send className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recipe Card & Voice Chat */}
          <div className="space-y-6">
            {/* Recipe Card */}
            {showRecipeCard && generatedRecipe && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="h-fit"
              >
                <EnhancedRecipeCard 
                  recipe={generatedRecipe}
                />
              </motion.div>
            )}

            {/* Voice Chat */}
            {showVoiceChat && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="h-fit"
              >
                <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="text-white text-sm flex items-center">
                      <iconMap.mic className="w-4 h-4 mr-2 text-orange-400" />
                      Voice Chat
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <GoogleLiveAudioChat />
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Conversation Context Display */}
            {Object.keys(conversationData).length > 0 && (
              <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-white text-sm">Recipe Context</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {conversationData.cuisine && (
                    <div className="flex justify-between">
                      <span className="text-gray-400 text-xs">Cuisine:</span>
                      <span className="text-white text-xs">{conversationData.cuisine}</span>
                    </div>
                  )}
                  {conversationData.portions && (
                    <div className="flex justify-between">
                      <span className="text-gray-400 text-xs">Portions:</span>
                      <span className="text-white text-xs">{conversationData.portions}</span>
                    </div>
                  )}
                  {conversationData.timeAvailable && (
                    <div className="flex justify-between">
                      <span className="text-gray-400 text-xs">Time:</span>
                      <span className="text-white text-xs">{conversationData.timeAvailable}</span>
                    </div>
                  )}
                  {conversationData.mood && (
                    <div className="flex justify-between">
                      <span className="text-gray-400 text-xs">Mood:</span>
                      <span className="text-white text-xs">{conversationData.mood}</span>
                    </div>
                  )}
                  {conversationData.ingredients && conversationData.ingredients.length > 0 && (
                    <div>
                      <span className="text-gray-400 text-xs block mb-1">Ingredients:</span>
                      <div className="flex flex-wrap gap-1">
                        {conversationData.ingredients.slice(0, 4).map((ingredient, index) => (
                          <Badge key={index} variant="secondary" className="text-xs bg-orange-500/20 text-orange-300">
                            {ingredient}
                          </Badge>
                        ))}
                        {conversationData.ingredients.length > 4 && (
                          <Badge variant="secondary" className="text-xs bg-gray-500/20 text-gray-300">
                            +{conversationData.ingredients.length - 4} more
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}