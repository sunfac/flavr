import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import ShoppingList from "./ShoppingList";
import ChatBot from "./ChatBot";
import { generateShoppingPrompt2 } from "@/prompts/shoppingPrompt2";
import { generateFridgePrompt2 } from "@/prompts/fridgePrompt2";
import { motion, AnimatePresence } from "framer-motion";

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
  const [checkedIngredients, setCheckedIngredients] = useState<Set<number>>(new Set());
  const { toast } = useToast();

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

  const handleIngredientCheck = (index: number) => {
    const newChecked = new Set(checkedIngredients);
    if (newChecked.has(index)) {
      newChecked.delete(index);
    } else {
      newChecked.add(index);
    }
    setCheckedIngredients(newChecked);
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

  // Full recipe view
  return (
    <div className="bg-background min-h-screen">
      {/* Recipe Header */}
      <div className="relative">
        <div className="w-full h-64 bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
          {fullRecipe.imageUrl ? (
            <img 
              src={fullRecipe.imageUrl} 
              alt={fullRecipe.title}
              className="w-full h-full object-cover" 
            />
          ) : (
            <i className="fas fa-utensils text-6xl text-muted-foreground"></i>
          )}
        </div>
        <div className="gradient-overlay absolute inset-0"></div>
        <Button
          variant="ghost"
          size="sm"
          className="absolute top-4 left-4 w-10 h-10 bg-white bg-opacity-20 backdrop-blur-sm rounded-full text-white hover:bg-white hover:bg-opacity-30"
          onClick={onBack}
        >
          <i className="fas fa-arrow-left"></i>
        </Button>
        <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
          <h1 className="font-playfair font-bold text-3xl mb-2">{fullRecipe.title}</h1>
          <div className="flex items-center space-x-4 text-sm">
            <span><i className="fas fa-clock mr-1"></i>{fullRecipe.cookTime} min</span>
            <span><i className="fas fa-users mr-1"></i>{fullRecipe.servings} servings</span>
            <span><i className="fas fa-signal mr-1"></i>{fullRecipe.difficulty || "Easy"}</span>
          </div>
        </div>
      </div>

      {/* Recipe Content */}
      <div className="p-6 space-y-8">
        {/* Ingredients Section */}
        <div>
          <h2 className="text-xl font-playfair font-bold text-foreground mb-4">Ingredients</h2>
          <div className="space-y-3">
            {fullRecipe.ingredients?.map((ingredient: string, index: number) => (
              <div key={index} className="flex items-center space-x-3 p-3 bg-muted rounded-lg">
                <Checkbox 
                  checked={checkedIngredients.has(index)}
                  onCheckedChange={() => handleIngredientCheck(index)}
                />
                <span className={`flex-1 ${checkedIngredients.has(index) ? "line-through text-muted-foreground" : "text-foreground"}`}>
                  {ingredient}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Shopping List Button (only for shopping mode) */}
        {mode === "shopping" && fullRecipe.shoppingList && (
          <Button 
            onClick={() => setShowShoppingList(true)}
            className="w-full bg-secondary text-secondary-foreground hover:bg-secondary/90"
          >
            <i className="fas fa-shopping-cart mr-2"></i>Generate Shopping List
          </Button>
        )}

        {/* Instructions Section */}
        <div>
          <h2 className="text-xl font-playfair font-bold text-foreground mb-4">Instructions</h2>
          <div className="space-y-4">
            {fullRecipe.instructions?.map((step: string, index: number) => (
              <div key={index} className="flex space-x-4">
                <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">
                  {index + 1}
                </div>
                <p className="text-foreground leading-relaxed pt-1">{step}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Chef Tips */}
        {fullRecipe.tips && (
          <Card className="bg-accent/10 border-accent/20">
            <CardContent className="pt-4">
              <h3 className="font-bold text-foreground mb-2">
                <i className="fas fa-lightbulb text-accent mr-2"></i>Chef's Tip
              </h3>
              <p className="text-foreground text-sm">{fullRecipe.tips}</p>
            </CardContent>
          </Card>
        )}

        {/* New Search Button (for chef mode) */}
        {showNewSearchButton && onNewSearch && (
          <Button 
            onClick={onNewSearch}
            variant="outline"
            className="w-full"
          >
            <i className="fas fa-redo mr-2"></i>Create Another Recipe
          </Button>
        )}
        
        {/* AI Chef Chat */}
        <div className="mt-6">
          <ChatBot 
            currentRecipe={fullRecipe}
            currentMode={mode}
          />
        </div>
      </div>

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
