import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import ShoppingList from "./ShoppingList";
import ChatBot from "./ChatBot";
import RecipeShareTools from "./RecipeShareTools";
import { generateShoppingPrompt2 } from "@/prompts/shoppingPrompt2";
import { generateFridgePrompt2 } from "@/prompts/fridgePrompt2";
import { motion, AnimatePresence } from "framer-motion";
import { iconMap } from "@/lib/iconMap";
import EnhancedRecipeCard from "./recipe/EnhancedRecipeCard";

interface RecipeCardProps {
  recipe: any;
  mode?: "shopping" | "fridge" | "chef";
  quizData?: any;
  isFullView?: boolean;
  onClick?: () => void;
  onBack?: () => void;
  showNewSearchButton?: boolean;
  onNewSearch?: () => void;
}

export default function RecipeCard({ 
  recipe, 
  mode, 
  quizData, 
  isFullView = false, 
  onClick, 
  onBack,
  showNewSearchButton = false,
  onNewSearch
}: RecipeCardProps) {
  const [fullRecipe, setFullRecipe] = useState<any>(isFullView ? recipe : null);
  const [showShoppingList, setShowShoppingList] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [showChatbot, setShowChatbot] = useState(false);
  const [chatbotMessage, setChatbotMessage] = useState("");
  const { toast } = useToast();

  // Handle recipe updates from chatbot
  const handleRecipeUpdate = (updatedRecipe: any) => {
    console.log('🔄 Recipe card received update:', updatedRecipe);
    setFullRecipe(updatedRecipe);
    toast({
      title: "Recipe updated!",
      description: "Your recipe has been modified based on your request.",
    });
  };

  const generateFullRecipeMutation = useMutation({
    mutationFn: (data: { selectedRecipe: any; mode: string; quizData: any; prompt: string }) =>
      apiRequest("POST", "/api/generate-full-recipe", data),
    onSuccess: async (response) => {
      const result = await response.json();
      setFullRecipe(result.recipe);
      queryClient.invalidateQueries({ queryKey: ["/api/me"] });
      queryClient.invalidateQueries({ queryKey: ["/api/recipes"] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to generate full recipe",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleCardClick = () => {
    if (!isFullView && onClick) {
      onClick();
    } else if (!fullRecipe && mode && quizData) {
      // Generate full recipe
      let prompt = "";
      if (mode === "shopping") {
        prompt = generateShoppingPrompt2(recipe, quizData);
      } else if (mode === "fridge") {
        prompt = generateFridgePrompt2(recipe, quizData);
      }
      
      if (prompt) {
        generateFullRecipeMutation.mutate({
          selectedRecipe: recipe,
          mode,
          quizData,
          prompt,
        });
      }
    }
  };

  // Save recipe mutation
  const saveRecipeMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/save-recipe", { recipe: fullRecipe }),
    onSuccess: () => {
      setIsSaved(true);
      toast({
        title: "Recipe saved!",
        description: "Added to your recipe collection",
      });
    },
    onError: () => {
      toast({
        title: "Save failed",
        description: "Could not save recipe",
        variant: "destructive",
      });
    },
  });

  // Handle ingredient substitution
  const handleSubstitution = (ingredient: string) => {
    setChatbotMessage(`Suggest a substitution for ${ingredient}`);
    setShowChatbot(true);
  };

  if (!isFullView) {
    // Modern Preview Card with Apple-inspired design
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ 
          scale: 1.03,
          y: -4,
          transition: { duration: 0.2, ease: [0.16, 1, 0.3, 1] }
        }}
        whileTap={{ scale: 0.98 }}
        className="recipe-card relative bg-card/90 backdrop-blur-lg rounded-3xl shadow-xl overflow-hidden cursor-pointer border border-white/20"
        onClick={handleCardClick}
        style={{ minWidth: "300px", minHeight: "400px" }}
      >
        {/* Hero Image Area */}
        <motion.div 
          className="w-full h-56 bg-gradient-to-br from-primary/30 via-secondary/20 to-accent/30 flex items-center justify-center relative overflow-hidden"
          whileHover={{ scale: 1.05 }}
          transition={{ duration: 0.3 }}
        >
          <motion.div
            animate={{ 
              rotate: [0, 5, -5, 0],
              scale: [1, 1.1, 1]
            }}
            transition={{ duration: 3, repeat: Infinity }}
            className="text-6xl"
          >
            🍽️
          </motion.div>
          
          {/* Floating elements */}
          <motion.div
            animate={{ y: [-10, 10, -10] }}
            transition={{ duration: 4, repeat: Infinity }}
            className="absolute top-4 right-4 text-2xl opacity-60"
          >
            ✨
          </motion.div>
          <motion.div
            animate={{ y: [10, -10, 10] }}
            transition={{ duration: 3, repeat: Infinity, delay: 1 }}
            className="absolute bottom-4 left-4 text-xl opacity-40"
          >
            👨‍🍳
          </motion.div>
        </motion.div>

        {/* Content Area */}
        <div className="p-6 space-y-4">
          {/* Tags */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="flex items-center gap-2 flex-wrap"
          >
            <motion.span 
              whileHover={{ scale: 1.05 }}
              className="bg-gradient-secondary text-white px-3 py-1 rounded-full text-xs font-semibold shadow-lg"
            >
              {recipe.cuisine || recipe.mood || "Delicious"} 🌟
            </motion.span>
            <motion.span 
              whileHover={{ scale: 1.05 }}
              className="bg-gradient-primary text-white px-3 py-1 rounded-full text-xs font-semibold shadow-lg"
            >
              ⏱️ {recipe.cookTime || "25 min"}
            </motion.span>
          </motion.div>

          {/* Title and Description */}
          <div className="space-y-2">
            <motion.h3 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="font-playfair font-bold text-xl text-foreground leading-tight"
            >
              {recipe.title}
            </motion.h3>
            <motion.p 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-muted-foreground text-sm leading-relaxed line-clamp-2"
            >
              {recipe.description}
            </motion.p>
          </div>

          {/* Action hint */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="flex items-center justify-center pt-2"
          >
            <span className="text-xs text-muted-foreground font-medium">
              Tap to view full recipe →
            </span>
          </motion.div>
        </div>
      </motion.div>
    );
  }

  if (generateFullRecipeMutation.isPending) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full mb-4 mx-auto"></div>
          <h3 className="text-lg font-medium text-foreground mb-2">Creating your perfect recipe...</h3>
          <p className="text-muted-foreground">
            Our AI chef is crafting something delicious just for you.
          </p>
        </div>
      </div>
    );
  }

  if (!fullRecipe) {
    return null;
  }

  // Transform recipe data to match EnhancedRecipeCard interface
  const enhancedRecipe = {
    id: fullRecipe.id?.toString() || 'temp-recipe',
    title: fullRecipe.title,
    description: fullRecipe.description,
    cookTime: fullRecipe.cookTime || 30,
    servings: fullRecipe.servings || 4,
    difficulty: fullRecipe.difficulty || "Medium",
    cuisine: mode === "fridge" ? "Fresh & Simple" : mode === "chef" ? "Gourmet" : "Everyday",
    image: fullRecipe.imageUrl,
    ingredients: fullRecipe.ingredients || [],
    instructions: fullRecipe.instructions || [],
    tips: fullRecipe.tips
  };

  const handleShare = () => {
    if (fullRecipe.shareId) {
      // Copy share link logic would go here
      toast({
        title: "Share Recipe",
        description: "Share functionality activated",
      });
    }
  };

  const handleRating = (recipeId: string, rating: number) => {
    toast({
      title: "Rating saved",
      description: `You rated "${fullRecipe.title}" ${rating} stars`,
    });
  };

  // Full recipe view using EnhancedRecipeCard
  return (
    <div className="min-h-screen bg-slate-900">
      <EnhancedRecipeCard
        recipe={enhancedRecipe}
        onBack={onBack}
        onShare={handleShare}
      />

      {/* Additional Legacy Features */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Shopping List Button (only for shopping mode) */}
        {mode === "shopping" && fullRecipe.shoppingList && (
          <div className="mb-8">
            <Button 
              onClick={() => setShowShoppingList(true)}
              className="w-full bg-secondary text-secondary-foreground hover:bg-secondary/90"
            >
              <iconMap.shoppingCart className="w-4 h-4 mr-2" />
              Generate Shopping List
            </Button>
          </div>
        )}

        {/* Save & Share Tools */}
        {fullRecipe.id && (
          <div className="mb-8 bg-slate-800/30 rounded-xl backdrop-blur-sm">
            <RecipeShareTools
              id={fullRecipe.id}
              shareId={fullRecipe.shareId}
              title={fullRecipe.title}
              description={fullRecipe.description}
              imageUrl={fullRecipe.imageUrl}
              isShared={fullRecipe.isShared || false}
              recipe={fullRecipe}
              onShareToggle={async () => {
                try {
                  await apiRequest("POST", `/api/recipe/${fullRecipe.id}/share`, { 
                    isShared: !fullRecipe.isShared 
                  });
                  toast({
                    title: "Sharing updated",
                    description: fullRecipe.isShared ? "Recipe is now private" : "Recipe is now public",
                  });
                } catch (error) {
                  toast({
                    title: "Error",
                    description: "Failed to update sharing settings",
                    variant: "destructive",
                  });
                }
              }}
            />
          </div>
        )}

        {/* New Search Button (for chef mode) */}
        {showNewSearchButton && onNewSearch && (
          <div className="mb-8">
            <Button 
              onClick={onNewSearch}
              variant="outline"
              className="w-full"
            >
              <iconMap.refresh className="w-4 h-4 mr-2" />
              Create Another Recipe
            </Button>
          </div>
        )}
      </div>

      {/* Floating Zest Chatbot - Only appears when triggered */}
      {showChatbot && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md bg-background border border-border rounded-t-3xl shadow-2xl">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h3 className="font-semibold text-foreground">Ask Zest</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowChatbot(false)}
                className="h-6 w-6 p-0"
              >
                ✕
              </Button>
            </div>
            <div className="max-h-96">
              <ChatBot 
                currentRecipe={fullRecipe}
                currentMode={mode}
                onRecipeUpdate={handleRecipeUpdate}
              />
            </div>
          </div>
        </div>
      )}

      {/* Shopping List Modal */}
      {showShoppingList && fullRecipe.shoppingList && (
        <ShoppingList 
          items={fullRecipe.shoppingList}
          onClose={() => setShowShoppingList(false)}
        />
      )}
    </div>
  );
}
