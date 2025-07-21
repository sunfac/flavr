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
    // Split by double newlines to separate recipes
    const recipeSections = recipesText.split('\n\n').filter(section => section.trim());
    const recipes: Array<{title: string, subtitle: string, content: string}> = [];
    
    let currentRecipe: {title: string, subtitle: string, content: string} | null = null;
    
    for (const section of recipeSections) {
      // Check if this is a recipe title (e.g., "Monday Dinner: Thai Red Curry")
      const titleMatch = section.match(/^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\s+(Dinner|Lunch|Breakfast):\s+(.+)$/i);
      
      if (titleMatch) {
        // Save previous recipe if exists
        if (currentRecipe) {
          recipes.push(currentRecipe);
        }
        
        // Start new recipe
        currentRecipe = {
          title: `${titleMatch[1]} ${titleMatch[2]}`,
          subtitle: titleMatch[3],
          content: ''
        };
      } else if (currentRecipe) {
        // Add to current recipe content
        currentRecipe.content += (currentRecipe.content ? '\n\n' : '') + section;
      }
    }
    
    // Don't forget the last recipe
    if (currentRecipe) {
      recipes.push(currentRecipe);
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
      let shoppingListMatch: RegExpMatchArray | null = null;
      let mealPlanMatch: RegExpMatchArray | null = null;
      let recipesMatch: RegExpMatchArray | null = null;
      
      if (data.response.includes('Shopping List:') || (data.response.includes('Produce:') && data.response.includes('Meal Plan:'))) {
        console.log('✅ Found shopping list section, parsing...');
        
        // Try to parse all sections from a complete response
        const response = data.response;
        
        // Look for shopping list section (now without markdown)
        const shoppingListIndex = response.search(/Shopping List:/i);
        const mealPlanIndex = response.search(/Meal Plan:/i);
        const recipesIndex = response.search(/Recipes:/i);
        
        if (shoppingListIndex !== -1) {
          const shoppingListEnd = mealPlanIndex !== -1 ? mealPlanIndex : (recipesIndex !== -1 ? recipesIndex : response.length);
          shoppingListMatch = ['Shopping List:\n' + response.substring(shoppingListIndex + 'Shopping List:'.length, shoppingListEnd).trim()];
        }
        
        if (mealPlanIndex !== -1) {
          const mealPlanEnd = recipesIndex !== -1 ? recipesIndex : response.length;
          mealPlanMatch = ['Meal Plan:\n' + response.substring(mealPlanIndex + 'Meal Plan:'.length, mealPlanEnd).trim()];
        }
        
        if (recipesIndex !== -1) {
          recipesMatch = ['Recipes:\n' + response.substring(recipesIndex + 'Recipes:'.length).trim()];
        }
        
        console.log('🔍 Parsing results:', {
          hasShoppingList: !!shoppingListMatch,
          hasMealPlan: !!mealPlanMatch,
          hasRecipes: !!recipesMatch,
          shoppingPreview: shoppingListMatch?.[0]?.substring(0, 100) + '...',
          mealPreview: mealPlanMatch?.[0]?.substring(0, 100) + '...',
          recipesPreview: recipesMatch?.[0]?.substring(0, 100) + '...'
        });
        
        if (shoppingListMatch || mealPlanMatch || recipesMatch) {
          const newContent = {
            shoppingList: shoppingListMatch ? shoppingListMatch[0] : '',
            mealPlan: mealPlanMatch ? mealPlanMatch[0] : '',
            recipes: recipesMatch ? recipesMatch[0] : ''
          };
          
          console.log('✅ Parsed content:', {
            shoppingList: newContent.shoppingList.substring(0, 100) + '...',
            mealPlan: newContent.mealPlan.substring(0, 100) + '...',
            recipes: newContent.recipes.substring(0, 100) + '...'
          });
          
          setParsedContent(prev => ({
            ...prev,
            ...newContent
          }));
          console.log('✅ Updated parsed content state with sections');
        }
      }
      
      // Show chat messages appropriately
      if (shoppingListMatch || mealPlanMatch || recipesMatch) {
        // This is a card content response - show completion message instead
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: "Perfect! I've created your complete budget meal plan with shopping list, weekly schedule, and detailed recipes. Check the cards below for all the details.",
          timestamp: new Date()
        }]);
      } else {
        // Regular chat message
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: data.response,
          timestamp: new Date()
        }]);
      }
      setIsLoading(false);
    },
    onError: (error: any) => {
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
      <style>{`
        /* Ensure proper scrolling on mobile */
        @media (max-width: 640px) {
          .budget-planner-container {
            padding-bottom: env(safe-area-inset-bottom);
          }
        }
      `}</style>
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
      <div className="budget-planner-container container mx-auto px-3 sm:px-4 pt-16 sm:pt-20 pb-4 sm:pb-8 min-h-screen flex flex-col max-w-6xl">
        {/* Header Section - Mobile Responsive */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate("/app")}
            className="text-white hover:bg-white/10 flex-shrink-0"
            type="button"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Modes
          </Button>
          
          <div className="flex items-center gap-3 w-full">
            <div className="p-2 bg-green-500 rounded-lg flex-shrink-0">
              <PiggyBank className="w-6 h-6 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-xl sm:text-2xl font-bold text-white break-words">Budget Planner</h1>
              <p className="text-green-100 text-xs sm:text-sm break-words">Smart weekly meal planning for maximum value</p>
            </div>
          </div>
        </div>

        {/* Chat Interface */}
        <Card className="flex-1 bg-card/90 backdrop-blur-sm border-green-200/20 flex flex-col min-h-0">
          <CardHeader className="pb-4 px-4 sm:px-6 flex-shrink-0">
            <CardTitle className="text-base sm:text-lg font-semibold flex items-center gap-2">
              <PiggyBank className="w-5 h-5 flex-shrink-0" />
              <span className="break-words min-w-0">Budget Planning Assistant</span>
            </CardTitle>
          </CardHeader>
          
          <CardContent className="flex-1 flex flex-col px-4 sm:px-6 pb-4 min-h-0">
            {/* Messages Area */}
            <ScrollArea ref={scrollAreaRef} className="flex-1 pr-2 mb-4 min-h-0">
              <div className="space-y-4 pb-2">
                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[85%] sm:max-w-[80%] px-3 sm:px-4 py-2 sm:py-3 rounded-lg ${
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
                    <div className="bg-muted px-3 sm:px-4 py-2 sm:py-3 rounded-lg max-w-[85%] sm:max-w-[80%]">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-600 rounded-full animate-bounce" />
                        <div className="w-2 h-2 bg-green-600 rounded-full animate-bounce animation-delay-100" />
                        <div className="w-2 h-2 bg-green-600 rounded-full animate-bounce animation-delay-200" />
                        <span className="text-xs sm:text-sm text-muted-foreground ml-2">Planning your budget meals...</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Input Area */}
            <div className="flex gap-2 sm:gap-3 flex-shrink-0">
              <Input
                value={currentMessage}
                onChange={(e) => setCurrentMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your response..."
                disabled={isLoading}
                className="flex-1 min-w-0 text-sm"
              />
              <Button 
                onClick={handleSendMessage}
                disabled={!currentMessage.trim() || isLoading}
                size="icon"
                className="bg-green-600 hover:bg-green-700 flex-shrink-0"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Content Cards - Mobile Responsive */}
        {(parsedContent.shoppingList || parsedContent.mealPlan || parsedContent.recipes) && (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6 mt-4 sm:mt-6">
            {/* Shopping List Card */}
            {parsedContent.shoppingList && (
              <Card className="bg-card/90 backdrop-blur-sm border-green-200/20">
                <CardHeader className="pb-3 px-4 sm:px-6">
                  <CardTitle className="text-base sm:text-lg font-semibold flex items-center gap-2 text-green-700">
                    <CheckSquare className="w-4 sm:w-5 h-4 sm:h-5 flex-shrink-0" />
                    <span className="break-words min-w-0">Weekly Shopping List</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 sm:px-6">
                  <div className="space-y-3">
                    {(() => {
                      const cleanedList = parsedContent.shoppingList.replace(/Shopping List:?\s*/i, '').trim();
                      console.log('🛒 Processing shopping list:', cleanedList.substring(0, 200) + '...');
                      
                      // Split by double newlines for sections, then process each section
                      const sections = cleanedList.split('\n\n').filter(section => section.trim());
                      console.log('🛒 Found sections:', sections.length);
                      
                      return sections.map((section, index) => {
                        const lines = section.split('\n').filter(line => line.trim());
                        if (lines.length === 0) return null;
                        
                        // First line is usually the category (with ** markers)
                        const categoryLine = lines[0];
                        const isCategory = categoryLine.includes('**');
                        
                        if (isCategory) {
                          const items = lines.slice(1).filter(line => line.includes('-') || line.includes('£'));
                          console.log(`🛒 Category "${categoryLine}" has ${items.length} items`);
                          
                          return (
                            <div key={index} className="border-l-4 border-green-200 pl-2 sm:pl-3">
                              <h4 className="font-semibold text-green-800 mb-2 text-sm sm:text-base break-words">{categoryLine.replace(/\*\*/g, '').replace(/:/g, '')}</h4>
                              <ul className="space-y-1">
                                {items.map((item, itemIndex) => (
                                  <li key={itemIndex} className="text-xs sm:text-sm flex items-start gap-2">
                                    <CheckSquare className="w-3 h-3 text-green-600 flex-shrink-0 mt-0.5" />
                                    <span className="text-white dark:text-gray-100 font-medium text-sm sm:text-base break-words min-w-0">{item.replace(/^-\s*/, '').trim()}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          );
                        } else {
                          // Handle items without clear category headers
                          const items = lines.filter(line => line.includes('-') || line.includes('£'));
                          if (items.length > 0) {
                            return (
                              <div key={index} className="border-l-4 border-green-200 pl-2 sm:pl-3">
                                <h4 className="font-semibold text-green-800 mb-2 text-sm sm:text-base">Items</h4>
                                <ul className="space-y-1">
                                  {items.map((item, itemIndex) => (
                                    <li key={itemIndex} className="text-xs sm:text-sm flex items-start gap-2">
                                      <CheckSquare className="w-3 h-3 text-green-600 flex-shrink-0 mt-0.5" />
                                      <span className="text-white dark:text-gray-100 font-medium text-sm sm:text-base break-words min-w-0">{item.replace(/^-\s*/, '').trim()}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            );
                          }
                          return null;
                        }
                      }).filter(Boolean);
                    })()}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Combined Meal Plan & Recipes Card */}
            {(parsedContent.mealPlan || parsedContent.recipes) && (
              <Card className="bg-card/90 backdrop-blur-sm border-green-200/20">
                <CardHeader className="pb-3 px-4 sm:px-6">
                  <CardTitle className="text-base sm:text-lg font-semibold flex items-center gap-2 text-green-700">
                    <BookOpen className="w-4 sm:w-5 h-4 sm:h-5 flex-shrink-0" />
                    <span className="break-words min-w-0">Weekly Meal Plan & Recipes</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {parsedContent.recipes && parseRecipes(parsedContent.recipes.replace(/Recipes:?\s*/i, '').trim()).map((recipe, index) => {
                      // Generate recipe image URL using a food image service
                      const generateFoodImageUrl = (dishName: string, index: number) => {
                        const foodImages = {
                          'thai red curry': 'https://images.unsplash.com/photo-1559847844-d721426d6edc?w=400&h=250&fit=crop&auto=format&q=80',
                          'thai green curry': 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=400&h=250&fit=crop&auto=format&q=80',
                          'butter chicken': 'https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=400&h=250&fit=crop&auto=format&q=80',
                          'tikka masala': 'https://images.unsplash.com/photo-1588166524941-3bf61a9c41db?w=400&h=250&fit=crop&auto=format&q=80',
                          'biryani': 'https://images.unsplash.com/photo-1563379091339-03246d8c5960?w=400&h=250&fit=crop&auto=format&q=80',
                          'dal': 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=400&h=250&fit=crop&auto=format&q=80',
                          'paella': 'https://images.unsplash.com/photo-1534080564583-6be75777b70a?w=400&h=250&fit=crop&auto=format&q=80',
                          'pasta': 'https://images.unsplash.com/photo-1621996346565-e3dbc353d2e5?w=400&h=250&fit=crop&auto=format&q=80',
                          'carbonara': 'https://images.unsplash.com/photo-1588013273468-315900bafd4d?w=400&h=250&fit=crop&auto=format&q=80',
                          'lasagna': 'https://images.unsplash.com/photo-1574894709920-11b28e7367e3?w=400&h=250&fit=crop&auto=format&q=80',
                          'risotto': 'https://images.unsplash.com/photo-1476124369491-e7addf5db371?w=400&h=250&fit=crop&auto=format&q=80',
                          'chicken': 'https://images.unsplash.com/photo-1604503468506-a8da13d82791?w=400&h=250&fit=crop&auto=format&q=80',
                          'lamb': 'https://images.unsplash.com/photo-1544025162-d76694265947?w=400&h=250&fit=crop&auto=format&q=80',
                          'paneer': 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=400&h=250&fit=crop&auto=format&q=80',
                          'stir fry': 'https://images.unsplash.com/photo-1556909114-44e3e70034e2?w=400&h=250&fit=crop&auto=format&q=80',
                          'stir-fry': 'https://images.unsplash.com/photo-1556909114-44e3e70034e2?w=400&h=250&fit=crop&auto=format&q=80',
                          'beef': 'https://images.unsplash.com/photo-1544025162-d76694265947?w=400&h=250&fit=crop&auto=format&q=80',
                          'pork': 'https://images.unsplash.com/photo-1620374644498-af87802db7fc?w=400&h=250&fit=crop&auto=format&q=80',
                          'fish': 'https://images.unsplash.com/photo-1534604973900-c43ab4c2e0ab?w=400&h=250&fit=crop&auto=format&q=80',
                          'salmon': 'https://images.unsplash.com/photo-1567067974934-75a3e4534c14?w=400&h=250&fit=crop&auto=format&q=80',
                          'shrimp': 'https://images.unsplash.com/photo-1559737558-2f5a35f4523b?w=400&h=250&fit=crop&auto=format&q=80',
                          'prawn': 'https://images.unsplash.com/photo-1559737558-2f5a35f4523b?w=400&h=250&fit=crop&auto=format&q=80'
                        };
                        
                        const dishLower = dishName.toLowerCase();
                        
                        // Try exact matches first for better accuracy
                        for (const [key, url] of Object.entries(foodImages)) {
                          if (dishLower.includes(key)) {
                            return url;
                          }
                        }
                        
                        // Fallback to different images based on index to ensure variety
                        const fallbackImages = [
                          'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=400&h=250&fit=crop&auto=format&q=80',
                          'https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=400&h=250&fit=crop&auto=format&q=80',
                          'https://images.unsplash.com/photo-1534080564583-6be75777b70a?w=400&h=250&fit=crop&auto=format&q=80',
                          'https://images.unsplash.com/photo-1621996346565-e3dbc353d2e5?w=400&h=250&fit=crop&auto=format&q=80'
                        ];
                        return fallbackImages[index % fallbackImages.length];
                      };
                      
                      return (
                        <Collapsible key={index}>
                          <CollapsibleTrigger 
                            className="w-full p-4 bg-gradient-to-r from-green-50 to-green-100 rounded-lg border border-green-200 hover:from-green-100 hover:to-green-150 transition-all duration-200 shadow-sm"
                            onClick={() => toggleRecipe(recipe.title)}
                          >
                            <div className="flex items-center gap-4">
                              <img 
                                src={generateFoodImageUrl(recipe.title, index)} 
                                alt={recipe.title}
                                className="w-16 h-16 rounded-lg object-cover shadow-md"
                                onError={(e) => {
                                  // Fallback to different images based on index
                                  const fallbackImages = [
                                    "https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=400&h=250&fit=crop&auto=format&q=80",
                                    "https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=400&h=250&fit=crop&auto=format&q=80",
                                    "https://images.unsplash.com/photo-1534080564583-6be75777b70a?w=400&h=250&fit=crop&auto=format&q=80"
                                  ];
                                  (e.target as HTMLImageElement).src = fallbackImages[index % fallbackImages.length];
                                }}
                              />
                              <div className="flex-1 text-left">
                                <h4 className="font-bold text-gray-950 text-lg">{recipe.title}</h4>
                                <p className="text-gray-800 font-semibold">{recipe.subtitle}</p>
                              </div>
                              <ChevronDown className={`w-5 h-5 text-green-700 transition-transform duration-200 ${expandedRecipes.has(recipe.title) ? 'rotate-180' : ''}`} />
                            </div>
                          </CollapsibleTrigger>
                          <CollapsibleContent className="pt-4">
                            <div className="pl-4 border-l-4 border-green-300 bg-gradient-to-r from-green-50 to-white p-4 rounded-r-lg">
                              <div className="whitespace-pre-wrap text-base sm:text-lg leading-relaxed text-white dark:text-gray-100 font-medium">
                                {recipe.content}
                              </div>
                            </div>
                          </CollapsibleContent>
                        </Collapsible>
                      );
                    })}
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