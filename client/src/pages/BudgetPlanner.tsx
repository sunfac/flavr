import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { PiggyBank, Send, ArrowLeft, ShoppingCart, Calendar, BookOpen, ChevronDown, CheckSquare } from "lucide-react";
import GlobalHeader from "@/components/GlobalHeader";
import GlobalNavigation from "@/components/GlobalNavigation";

import { apiRequest } from "@/lib/queryClient";

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface BudgetPlannerResult {
  response: string;
  stage?: string;
  complete?: boolean;
}

interface ParsedContent {
  shoppingList?: string;
  mealPlan?: string;
  recipes?: string;
}

export default function BudgetPlanner() {
  const [, navigate] = useLocation();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: "Welcome to Flavr's Budget Planner! I'll help you create a weekly meal plan that maximizes value while delivering authentic, delicious recipes.\n\nLet's start: How many dinners, lunches, and kids' dinners do you need recipes for this week? Please specify exact numbers for each.",
      timestamp: new Date()
    }
  ]);
  const [currentMessage, setCurrentMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showNavigation, setShowNavigation] = useState(false);
  const [parsedContent, setParsedContent] = useState<ParsedContent>({});
  const [expandedRecipes, setExpandedRecipes] = useState<Set<string>>(new Set());
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Helper function to parse individual recipes
  const parseRecipes = (recipesText: string) => {
    const recipePattern = /\*\*(.*?):\s*(.*?)\*\*([\s\S]*?)(?=\*\*[^:]*:\s*[^*]*\*\*|$)/g;
    const recipes: Array<{title: string, subtitle: string, content: string}> = [];
    let match;
    
    while ((match = recipePattern.exec(recipesText)) !== null) {
      recipes.push({
        title: match[1].trim(),
        subtitle: match[2].trim(),
        content: match[3].trim()
      });
    }
    
    return recipes;
  };

  const toggleRecipe = (recipeTitle: string) => {
    setExpandedRecipes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(recipeTitle)) {
        newSet.delete(recipeTitle);
      } else {
        newSet.add(recipeTitle);
      }
      return newSet;
    });
  };

  // Ensure navigation is closed when component mounts
  useEffect(() => {
    setShowNavigation(false);
  }, []);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollElement = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight;
      }
    }
  }, [messages]);

  const budgetPlannerMutation = useMutation({
    mutationFn: async (message: string) => {
      const conversationHistory = messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      return apiRequest('POST', '/api/budget-planner', {
        message,
        conversationHistory
      });
    },
    onSuccess: async (response) => {
      const data = await response.json();
      console.log('🎯 Budget planner response received:', data);
      
      // Parse content for cards - handle complete response with all sections
      if (data.stage === 'complete' || (data.response.includes('🔹 **Shopping List**') && data.response.includes('🔹 **Meal Plan**') && data.response.includes('🔹 **Recipes**'))) {
        // Parse all three sections from complete response
        const shoppingListMatch = data.response.match(/🔹 \*\*Shopping List\*\*([\s\S]*?)(?=🔹 \*\*Meal Plan\*\*|$)/);
        const mealPlanMatch = data.response.match(/🔹 \*\*Meal Plan\*\*([\s\S]*?)(?=🔹 \*\*Recipes\*\*|$)/);
        const recipesMatch = data.response.match(/🔹 \*\*Recipes\*\*([\s\S]*?)$/);
        
        setParsedContent({
          shoppingList: shoppingListMatch ? '🔹 **Shopping List**' + shoppingListMatch[1] : undefined,
          mealPlan: mealPlanMatch ? '🔹 **Meal Plan**' + mealPlanMatch[1] : undefined,
          recipes: recipesMatch ? '🔹 **Recipes**' + recipesMatch[1] : undefined
        });
      } else if (data.stage === 'shopping-list' && data.response.includes('🔹 **Shopping List**')) {
        setParsedContent(prev => ({ ...prev, shoppingList: data.response }));
      } else if (data.stage === 'meal-plan' && data.response.includes('🔹 **Meal Plan**')) {
        setParsedContent(prev => ({ ...prev, mealPlan: data.response }));
      } else if (data.response.includes('🔹 **Recipes**')) {
        setParsedContent(prev => ({ ...prev, recipes: data.response }));
      }
      
      // Don't add shopping list, meal plan, or recipes to chat - only show in cards
      // But do show completion message
      if (data.stage === 'complete') {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: "Perfect! I've created your complete budget meal plan with shopping list, weekly schedule, and detailed recipes. Check the cards below for all the details.",
          timestamp: new Date()
        }]);
      } else if (!data.response.includes('🔹 **Shopping List**') && 
          !data.response.includes('🔹 **Meal Plan**') && 
          !data.response.includes('🔹 **Recipes**')) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: data.response,
          timestamp: new Date()
        }]);
      }
      setIsLoading(false);
    },
    onError: (error) => {
      console.error('Budget planner error details:', {
        error,
        message: error?.message,
        stack: error?.stack,
        response: error?.response,
        status: error?.status
      });
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: "Sorry, I encountered an issue. Could you please try again?",
        timestamp: new Date()
      }]);
      setIsLoading(false);
    }
  });

  const handleSendMessage = () => {
    if (!currentMessage.trim() || isLoading) return;

    const userMessage = currentMessage.trim();
    setCurrentMessage("");
    setIsLoading(true);

    // Add user message to chat
    setMessages(prev => [...prev, {
      role: 'user',
      content: userMessage,
      timestamp: new Date()
    }]);

    // Send to budget planner processor
    budgetPlannerMutation.mutate(userMessage);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-900 via-green-800 to-emerald-900 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_80%,rgba(34,197,94,0.3),transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(16,185,129,0.2),transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_40%_40%,rgba(6,182,212,0.1),transparent_50%)]" />

      {/* Header */}
      <GlobalHeader 
        onMenuClick={() => setShowNavigation(true)}
      />

      {/* Navigation Panel */}
      <GlobalNavigation 
        isOpen={showNavigation} 
        onClose={() => setShowNavigation(false)} 
      />

      {/* Main Content */}
      <div className="container mx-auto px-4 pt-20 pb-8 min-h-screen flex flex-col">
        {/* Header Section */}
        <div className="flex items-center gap-4 mb-6">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate("/modes")}
            className="text-white hover:bg-white/10"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Modes
          </Button>
          
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-500 rounded-lg">
              <PiggyBank className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Budget Planner</h1>
              <p className="text-green-100 text-sm">Smart weekly meal planning for maximum value</p>
            </div>
          </div>
        </div>

        {/* Chat Interface */}
        <Card className="flex-1 bg-card/90 backdrop-blur-sm border-green-200/20 flex flex-col">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <PiggyBank className="w-5 h-5" />
              Budget Planning Assistant
            </CardTitle>
          </CardHeader>
          
          <CardContent className="flex-1 flex flex-col">
            {/* Messages Area */}
            <ScrollArea ref={scrollAreaRef} className="flex-1 pr-4 mb-4">
              <div className="space-y-4">
                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] px-4 py-3 rounded-lg ${
                        message.role === 'user'
                          ? 'bg-green-600 text-white'
                          : 'bg-muted text-foreground'
                      }`}
                    >
                      <div className="whitespace-pre-wrap break-words text-sm leading-relaxed">
                        {message.content}
                      </div>
                      <div className={`text-xs mt-2 opacity-70 ${
                        message.role === 'user' ? 'text-green-100' : 'text-muted-foreground'
                      }`}>
                        {message.timestamp.toLocaleTimeString([], { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </div>
                    </div>
                  </div>
                ))}
                
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-muted px-4 py-3 rounded-lg">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-600 rounded-full animate-bounce" />
                        <div className="w-2 h-2 bg-green-600 rounded-full animate-bounce animation-delay-100" />
                        <div className="w-2 h-2 bg-green-600 rounded-full animate-bounce animation-delay-200" />
                        <span className="text-sm text-muted-foreground ml-2">Planning your budget meals...</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Input Area */}
            <div className="flex gap-3">
              <Input
                value={currentMessage}
                onChange={(e) => setCurrentMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your response..."
                disabled={isLoading}
                className="flex-1"
              />
              <Button 
                onClick={handleSendMessage}
                disabled={!currentMessage.trim() || isLoading}
                size="icon"
                className="bg-green-600 hover:bg-green-700"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Content Cards */}
        {(parsedContent.shoppingList || parsedContent.mealPlan || parsedContent.recipes) && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
            {/* Shopping List Card */}
            {parsedContent.shoppingList && (
              <Card className="bg-card/90 backdrop-blur-sm border-green-200/20">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg font-semibold flex items-center gap-2 text-green-700">
                    <CheckSquare className="w-5 h-5" />
                    Weekly Shopping List
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {parsedContent.shoppingList.replace('🔹 **Shopping List**', '').trim().split('\n\n').map((section, index) => {
                      if (section.includes('**') && section.includes(':')) {
                        const lines = section.split('\n');
                        const categoryLine = lines[0];
                        const items = lines.slice(1);
                        return (
                          <div key={index} className="border-l-4 border-green-200 pl-3">
                            <h4 className="font-semibold text-green-800 mb-2">{categoryLine.replace(/\*\*/g, '')}</h4>
                            <ul className="space-y-1">
                              {items.map((item, itemIndex) => (
                                <li key={itemIndex} className="text-sm flex items-center gap-2">
                                  <CheckSquare className="w-3 h-3 text-green-600" />
                                  {item.replace(/^-\s*/, '')}
                                </li>
                              ))}
                            </ul>
                          </div>
                        );
                      }
                      return null;
                    }).filter(Boolean)}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Meal Plan Card */}
            {parsedContent.mealPlan && (
              <Card className="bg-card/90 backdrop-blur-sm border-green-200/20">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg font-semibold flex items-center gap-2 text-green-700">
                    <Calendar className="w-5 h-5" />
                    Weekly Meal Schedule
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {parsedContent.mealPlan.replace('🔹 **Meal Plan**', '').trim().split('\n').filter(line => line.includes('**') && line.includes(':')).map((meal, index) => {
                      const dayMatch = meal.match(/\*\*(.*?):\*\*/);
                      const dishMatch = meal.match(/\*\*.*?\*\*\s*(.+)/);
                      return (
                        <div key={index} className="p-3 bg-green-50 rounded-lg border border-green-200">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-semibold text-green-800">{dayMatch ? dayMatch[1] : 'Meal'}</h4>
                              <p className="text-sm text-green-700">{dishMatch ? dishMatch[1] : meal.replace(/\*\*/g, '')}</p>
                            </div>
                            <Calendar className="w-4 h-4 text-green-600" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Recipes Card */}
            {parsedContent.recipes && (
              <Card className="bg-card/90 backdrop-blur-sm border-green-200/20">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg font-semibold flex items-center gap-2 text-green-700">
                    <BookOpen className="w-5 h-5" />
                    Complete Recipes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {parseRecipes(parsedContent.recipes.replace('🔹 **Recipes**', '').trim()).map((recipe, index) => (
                      <Collapsible key={index}>
                        <CollapsibleTrigger 
                          className="w-full p-3 bg-green-50 rounded-lg border border-green-200 hover:bg-green-100 transition-colors"
                          onClick={() => toggleRecipe(recipe.title)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="text-left">
                              <h4 className="font-semibold text-green-800">{recipe.title}</h4>
                              <p className="text-sm text-green-700">{recipe.subtitle}</p>
                            </div>
                            <ChevronDown className={`w-4 h-4 text-green-600 transition-transform ${expandedRecipes.has(recipe.title) ? 'rotate-180' : ''}`} />
                          </div>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="pt-3">
                          <div className="pl-4 border-l-2 border-green-200">
                            <div className="whitespace-pre-wrap text-sm leading-relaxed text-gray-700">
                              {recipe.content}
                            </div>
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Quick Info Cards - Show when no content yet */}
        {!parsedContent.shoppingList && !parsedContent.mealPlan && !parsedContent.recipes && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <Card className="bg-green-800/30 border-green-300/20">
              <CardContent className="p-4 text-center">
                <ShoppingCart className="w-8 h-8 text-green-300 mx-auto mb-2" />
                <h3 className="font-semibold text-white mb-1">Smart Shopping Lists</h3>
                <p className="text-green-100 text-xs">Supermarket-specific with real pricing</p>
              </CardContent>
            </Card>
            
            <Card className="bg-green-800/30 border-green-300/20">
              <CardContent className="p-4 text-center">
                <Calendar className="w-8 h-8 text-green-300 mx-auto mb-2" />
                <h3 className="font-semibold text-white mb-1">Weekly Meal Plans</h3>
                <p className="text-green-100 text-xs">Organized by days with variety</p>
              </CardContent>
            </Card>
            
            <Card className="bg-green-800/30 border-green-300/20">
              <CardContent className="p-4 text-center">
                <BookOpen className="w-8 h-8 text-green-300 mx-auto mb-2" />
                <h3 className="font-semibold text-white mb-1">Authentic Recipes</h3>
                <p className="text-green-100 text-xs">Chef-quality with traditional techniques</p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}