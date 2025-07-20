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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

interface Message {
  id: string;
  type: 'user' | 'assistant' | 'system' | 'question';
  content: string;
  timestamp: Date;
  suggestions?: string[];
  questionType?: 'radio' | 'text' | 'multi-select';
  options?: string[];
  field?: string;
  answered?: boolean;
  recipePreview?: any;
}

interface ConversationData {
  intent?: 'shopping' | 'ingredients' | 'idea' | 'general';
  cuisine?: string;
  portions?: number;
  equipment?: string[] | string;
  timeAvailable?: string;
  mood?: string;
  ingredients?: string[] | string;
  dietaryRestrictions?: string[] | string;
  skillLevel?: string;
  occasion?: string;
  budget?: string;
  fridgePhoto?: string;
  dishIdea?: string;
  specificDish?: string;
}

interface QuestionFlow {
  id: string;
  question: string;
  type: 'radio' | 'text' | 'multi-select';
  options?: string[];
  field: string;
  required: boolean;
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
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isStructuredFlow, setIsStructuredFlow] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recipeStore = useRecipeStore();

  // Structured question flow based on user intent
  const questionFlows: Record<string, QuestionFlow[]> = {
    shopping: [
      {
        id: 'cuisine',
        question: 'What type of cuisine are you in the mood for?',
        type: 'radio',
        options: ['Italian', 'Asian', 'Mexican', 'Mediterranean', 'American', 'Indian', 'French', 'Surprise me!'],
        field: 'cuisine',
        required: true
      },
      {
        id: 'portions',
        question: 'How many people are you cooking for?',
        type: 'radio',
        options: ['Just me (1)', 'Couple (2)', 'Small family (3-4)', 'Large group (5+)'],
        field: 'portions',
        required: true
      },
      {
        id: 'time',
        question: 'How much time do you have for cooking?',
        type: 'radio',
        options: ['Quick (15-20 min)', 'Moderate (30-45 min)', 'Relaxed (1+ hour)', 'All day project'],
        field: 'timeAvailable',
        required: true
      },
      {
        id: 'mood',
        question: 'What kind of meal are you envisioning?',
        type: 'radio',
        options: ['Comfort food', 'Healthy & fresh', 'Indulgent treat', 'Something new', 'Classic favorite'],
        field: 'mood',
        required: true
      },
      {
        id: 'budget',
        question: 'What\'s your budget preference?',
        type: 'radio',
        options: ['Budget-friendly', 'Moderate', 'Premium ingredients', 'No preference'],
        field: 'budget',
        required: false
      }
    ],
    ingredients: [
      {
        id: 'ingredients',
        question: 'What ingredients do you have available?',
        type: 'text',
        field: 'ingredients',
        required: true
      },
      {
        id: 'cuisine',
        question: 'Any cuisine preference for these ingredients?',
        type: 'radio',
        options: ['Italian', 'Asian', 'Mexican', 'Mediterranean', 'American', 'Indian', 'French', 'Whatever works best'],
        field: 'cuisine',
        required: false
      },
      {
        id: 'portions',
        question: 'How many servings do you need?',
        type: 'radio',
        options: ['1 serving', '2 servings', '3-4 servings', '5+ servings'],
        field: 'portions',
        required: true
      },
      {
        id: 'time',
        question: 'How much cooking time do you have?',
        type: 'radio',
        options: ['Quick (15-20 min)', 'Moderate (30-45 min)', 'Relaxed (1+ hour)'],
        field: 'timeAvailable',
        required: true
      }
    ],
    idea: [
      {
        id: 'dish',
        question: 'What specific dish would you like to make? (e.g., "paella", "chicken tikka masala", "beef wellington")',
        type: 'text',
        field: 'specificDish',
        required: true
      },
      {
        id: 'portions',
        question: 'How many people will this serve?',
        type: 'radio',
        options: ['Just me (1)', 'Couple (2)', 'Small family (3-4)', 'Large group (5+)'],
        field: 'portions',
        required: true
      },
      {
        id: 'skill',
        question: 'What\'s your cooking skill level?',
        type: 'radio',
        options: ['Beginner', 'Intermediate', 'Advanced', 'Professional'],
        field: 'skillLevel',
        required: true
      },
      {
        id: 'occasion',
        question: 'What\'s the occasion?',
        type: 'radio',
        options: ['Everyday meal', 'Special dinner', 'Party/gathering', 'Romantic date', 'Family celebration'],
        field: 'occasion',
        required: false
      }
    ]
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Handle radio button answer selection
  const handleRadioAnswer = (value: string, field: string) => {
    const updatedData = { ...conversationData, [field]: value };
    setConversationData(updatedData);

    // Mark current question as answered
    setMessages(prev => prev.map(msg => 
      msg.type === 'question' && !msg.answered 
        ? { ...msg, answered: true }
        : msg
    ));

    // Add user response message
    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: value,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);

    // Move to next question or generate recipe
    proceedToNextQuestion(updatedData);
  };

  // Handle text input answer
  const handleTextAnswer = (value: string, field: string) => {
    const updatedData = { ...conversationData, [field]: value };
    setConversationData(updatedData);

    // Mark current question as answered
    setMessages(prev => prev.map(msg => 
      msg.type === 'question' && !msg.answered 
        ? { ...msg, answered: true }
        : msg
    ));

    // Add user response message
    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: value,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);

    // Move to next question or generate recipe
    proceedToNextQuestion(updatedData);
  };

  // Progress through structured question flow
  const proceedToNextQuestion = (data: ConversationData) => {
    const intent = data.intent;
    if (!intent || !questionFlows[intent]) return;

    const questions = questionFlows[intent];
    const nextIndex = currentQuestionIndex + 1;

    if (nextIndex < questions.length) {
      // Ask next question
      setCurrentQuestionIndex(nextIndex);
      askStructuredQuestion(questions[nextIndex]);
    } else {
      // All questions answered, generate recipe
      generateRecipeFromData(data);
    }
  };

  // Ask a structured question with radio buttons or text input
  const askStructuredQuestion = (question: QuestionFlow) => {
    const questionMessage: Message = {
      id: Date.now().toString(),
      type: 'question',
      content: question.question,
      timestamp: new Date(),
      questionType: question.type,
      options: question.options,
      field: question.field,
      answered: false
    };
    setMessages(prev => [...prev, questionMessage]);
  };

  // Start structured question flow based on intent
  const startStructuredFlow = (intent: string) => {
    setIsStructuredFlow(true);
    setCurrentQuestionIndex(0);
    const updatedData = { ...conversationData, intent: intent as any };
    setConversationData(updatedData);

    if (questionFlows[intent] && questionFlows[intent].length > 0) {
      askStructuredQuestion(questionFlows[intent][0]);
    }
  };

  // Generate recipe from collected data
  const generateRecipeFromData = async (data: ConversationData) => {
    setIsLoading(true);
    try {
      const response = await apiRequest("POST", "/api/conversational-recipe", {
        message: "Generate recipe with collected preferences",
        conversationHistory: messages,
        currentData: data,
        generateRecipe: true
      });

      const result = await response.json();
      
      if (result.recipe) {
        setGeneratedRecipe(result.recipe);
        setConversationComplete(true);
        setShowRecipeCard(true);
        
        const recipePreviewMessage: Message = {
          id: (Date.now() + 1).toString(),
          type: 'assistant',
          content: `Perfect! I've created "${result.recipe.title}" based on your preferences.`,
          timestamp: new Date(),
          recipePreview: result.recipe
        };

        const actionsMessage: Message = {
          id: (Date.now() + 2).toString(),
          type: 'assistant',
          content: "Click the recipe above to view full details, or choose what you'd like to do next:",
          timestamp: new Date(),
          suggestions: [
            "Save to cookbook",
            "Modify the recipe", 
            "Generate shopping list",
            "Start cooking mode"
          ]
        };
        
        setMessages(prev => [...prev, recipePreviewMessage, actionsMessage]);
      }
    } catch (error) {
      console.error("Recipe generation error:", error);
      toast({
        title: "Recipe Generation Failed",
        description: "Let me try creating your recipe again...",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

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

  const handleSuggestionClick = async (suggestion: string) => {
    // Check if this is an initial intent selection
    if (suggestion === "I need recipes for shopping") {
      startStructuredFlow('shopping');
    } else if (suggestion === "I have ingredients to use up") {
      startStructuredFlow('ingredients');
    } else if (suggestion === "I have a specific dish in mind") {
      startStructuredFlow('idea');
    } else if (suggestion === "Just looking for inspiration") {
      // For inspiration, use free-form conversation
      handleSendMessage(suggestion);
    } else if (suggestion === "Save to cookbook") {
      // Save current recipe to cookbook
      await saveRecipeToCookbook();
    } else {
      // Handle other suggestions normally
      handleSendMessage(suggestion);
    }
  };

  // Save recipe to cookbook functionality
  const saveRecipeToCookbook = async () => {
    if (!generatedRecipe) return;
    
    try {
      const response = await apiRequest("POST", "/api/save-recipe", {
        title: generatedRecipe.title,
        description: generatedRecipe.description,
        cookTime: generatedRecipe.cookTime,
        servings: generatedRecipe.servings,
        difficulty: generatedRecipe.difficulty,
        cuisine: generatedRecipe.cuisine,
        ingredients: generatedRecipe.ingredients,
        instructions: generatedRecipe.instructions,
        tips: generatedRecipe.tips,
        mode: 'conversational',
        quizData: conversationData
      });

      if (response.ok) {
        toast({
          title: "Recipe Saved!",
          description: "Recipe has been added to your digital cookbook"
        });
        
        // Add success message to chat
        const saveMessage: Message = {
          id: Date.now().toString(),
          type: 'assistant',
          content: "Great! I've saved this recipe to your digital cookbook. You can find it anytime by visiting your cookbook.",
          timestamp: new Date(),
          suggestions: [
            "View my cookbook",
            "Create another recipe",
            "Modify this recipe"
          ]
        };
        setMessages(prev => [...prev, saveMessage]);
      }
    } catch (error) {
      toast({
        title: "Save Failed",
        description: "Could not save recipe. Please try again.",
        variant: "destructive"
      });
    }
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
        ingredients: Array.isArray(data.ingredients) ? data.ingredients : [],
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

        <div className="max-w-4xl mx-auto">
          {/* Chat Interface */}
          <div>
            <Card className="bg-white/5 border-white/10 backdrop-blur-sm min-h-[600px] flex flex-col">
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
                <div className="flex-1 overflow-y-auto p-6 space-y-4 min-h-0">
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
                          className={`rounded-2xl p-4 ${
                            message.type === 'user'
                              ? 'bg-orange-500 text-white max-w-[80%]'
                              : message.type === 'question'
                              ? 'bg-purple-500/20 text-white border border-purple-400/30 max-w-[90%]'
                              : 'bg-white/10 text-white border border-white/20 max-w-[90%]'
                          }`}
                        >
                          <p className="text-sm leading-relaxed break-all whitespace-pre-wrap">
                            {message.content}
                          </p>

                          {/* Recipe Preview */}
                          {message.recipePreview && (
                            <div className="mt-4 p-4 bg-white/10 rounded-lg border border-white/20 cursor-pointer hover:bg-white/15 transition-colors"
                                 onClick={() => {
                                   setGeneratedRecipe(message.recipePreview);
                                   setShowRecipeCard(true);
                                 }}>
                              <h3 className="text-lg font-semibold text-white mb-2">{message.recipePreview.title}</h3>
                              <p className="text-sm text-gray-300 mb-3">{message.recipePreview.description}</p>
                              <div className="flex flex-wrap gap-2 mb-3">
                                <span className="px-2 py-1 bg-purple-500/30 text-purple-200 text-xs rounded-full">
                                  {message.recipePreview.cuisine}
                                </span>
                                <span className="px-2 py-1 bg-orange-500/30 text-orange-200 text-xs rounded-full">
                                  {message.recipePreview.difficulty}
                                </span>
                                <span className="px-2 py-1 bg-blue-500/30 text-blue-200 text-xs rounded-full">
                                  {message.recipePreview.cookTime} min
                                </span>
                                <span className="px-2 py-1 bg-green-500/30 text-green-200 text-xs rounded-full">
                                  {message.recipePreview.servings} servings
                                </span>
                              </div>
                              <p className="text-xs text-gray-400">Click to view full recipe</p>
                            </div>
                          )}
                          
                          {/* Radio Button Questions */}
                          {message.type === 'question' && message.questionType === 'radio' && !message.answered && message.options && (
                            <div className="mt-4">
                              <RadioGroup onValueChange={(value) => handleRadioAnswer(value, message.field!)}>
                                <div className="grid grid-cols-1 gap-2">
                                  {message.options.map((option, index) => (
                                    <div key={index} className="flex items-center space-x-2 p-2 rounded-lg hover:bg-white/10 transition-colors">
                                      <RadioGroupItem value={option} id={`${message.id}-${index}`} className="text-purple-400" />
                                      <Label 
                                        htmlFor={`${message.id}-${index}`} 
                                        className="text-sm text-white flex-1 cursor-pointer"
                                      >
                                        {option}
                                      </Label>
                                    </div>
                                  ))}
                                </div>
                              </RadioGroup>
                              <p className="text-xs text-gray-400 mt-2">
                                Select an option or type your own answer below
                              </p>
                            </div>
                          )}

                          {/* Text Input Questions */}
                          {message.type === 'question' && message.questionType === 'text' && !message.answered && (
                            <div className="mt-4">
                              <div className="flex space-x-2">
                                <Input
                                  placeholder="Type your answer..."
                                  className="bg-white/10 border-white/20 text-white placeholder:text-gray-400 flex-1"
                                  onKeyPress={(e) => {
                                    if (e.key === 'Enter') {
                                      const value = (e.target as HTMLInputElement).value;
                                      if (value.trim()) {
                                        handleTextAnswer(value, message.field!);
                                        (e.target as HTMLInputElement).value = '';
                                      }
                                    }
                                  }}
                                />
                                <Button
                                  size="sm"
                                  onClick={(e) => {
                                    const input = e.currentTarget.parentElement?.querySelector('input') as HTMLInputElement;
                                    const value = input?.value;
                                    if (value?.trim()) {
                                      handleTextAnswer(value, message.field!);
                                      input.value = '';
                                    }
                                  }}
                                  className="bg-purple-500 hover:bg-purple-600 text-white"
                                >
                                  <iconMap.send className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          )}
                          
                          {/* Regular Suggestion Buttons */}
                          {message.suggestions && message.suggestions.length > 0 && message.type !== 'question' && (
                            <div className="mt-3 space-y-2">
                              {message.suggestions.map((suggestion, index) => (
                                <Button
                                  key={index}
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleSuggestionClick(suggestion)}
                                  className="w-full justify-start text-left text-xs bg-white/10 hover:bg-white/20 text-white h-auto py-2 px-3"
                                  style={{ 
                                    whiteSpace: 'normal', 
                                    wordWrap: 'break-word',
                                    overflowWrap: 'anywhere'
                                  }}
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

          {/* Voice Chat Modal */}
          {showVoiceChat && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6"
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

          {/* Recipe Card Modal */}
          {showRecipeCard && generatedRecipe && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              onClick={() => setShowRecipeCard(false)}
            >
              <div className="max-w-4xl max-h-[90vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
                <EnhancedRecipeCard 
                  recipe={generatedRecipe}
                />
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}