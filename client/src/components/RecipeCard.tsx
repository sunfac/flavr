import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import ShoppingList from "./ShoppingList";
import RecipeChat from "./RecipeChat";
import RecipeShareTools from "./RecipeShareTools";
import VoiceControl from "./VoiceControl";
import { generateShoppingPrompt2 } from "@/prompts/shoppingPrompt2";
import { generateFridgePrompt2 } from "@/prompts/fridgePrompt2";
import { motion, AnimatePresence } from "framer-motion";
import { iconMap } from "@/lib/iconMap";
import EnhancedRecipeCard from "./recipe/EnhancedRecipeCard";
import { useRecipeStore } from "@/stores/recipeStore";

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
  // Chat functionality is now handled by parent pages using RecipeChat or FloatingChatButton
  const [showVoiceControl, setShowVoiceControl] = useState(false);
  const { toast } = useToast();
  const recipeStore = useRecipeStore();
  const updateActiveRecipe = useRecipeStore((state) => state.updateActiveRecipe);

  // Sync with global recipe store if generationParams are present
  useEffect(() => {
    if (fullRecipe && fullRecipe.generationParams) {
      console.log('🔄 RecipeCard: Syncing recipe with global store for reroll functionality');
      updateActiveRecipe(fullRecipe, fullRecipe.generationParams);
    }
  }, [fullRecipe, updateActiveRecipe]);

  // Handle recipe updates from chatbot
  const handleRecipeUpdate = (updatedRecipe: any) => {
    console.log('🔄 Recipe card received update:', updatedRecipe);
    
    // Preserve generationParams if they exist
    if (fullRecipe && fullRecipe.generationParams) {
      updatedRecipe.generationParams = fullRecipe.generationParams;
    }
    
    setFullRecipe(updatedRecipe);
    
    // Dispatch custom event for EnhancedRecipeCard to listen
    window.dispatchEvent(new CustomEvent('recipe-updated', { 
      detail: updatedRecipe 
    }));
    
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
      console.log('🔍 Full recipe API response:', result);
      console.log('🍽️ Recipe data structure:', result.recipe);
      console.log('📋 Ingredients:', result.recipe?.ingredients);
      console.log('📝 Instructions:', result.recipe?.instructions);
      console.log('🖼️ Image URL:', result.recipe?.imageUrl);
      
      // Ensure the recipe data has the expected structure
      const recipeData = {
        ...result.recipe,
        ingredients: Array.isArray(result.recipe?.ingredients) ? result.recipe.ingredients : [],
        instructions: Array.isArray(result.recipe?.instructions) ? result.recipe.instructions : []
      };
      
      console.log('✅ Processed recipe data:', recipeData);
      console.log('✅ Processed ingredients count:', recipeData.ingredients.length);
      console.log('✅ Processed instructions count:', recipeData.instructions.length);
      
      setFullRecipe(recipeData);
      
      // Immediate scroll to recipe header where the image and title are
      const scrollToRecipeHeader = () => {
        // Always scroll to absolute top first
        window.scrollTo(0, 0);
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
        
        // Then try to find the recipe header anchor
        setTimeout(() => {
          const recipeHeader = document.getElementById('recipe-header-top');
          if (recipeHeader) {
            recipeHeader.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 100);
      };
      
      // Execute with delays to ensure DOM is ready
      setTimeout(scrollToRecipeHeader, 300);
      setTimeout(scrollToRecipeHeader, 600);
      
      // Additional scroll after potential image load
      setTimeout(() => {
        const headerElement = document.getElementById('recipe-header-top');
        if (headerElement) {
          headerElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 500);
      
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

  // Handle ingredient substitution - now handled by parent RecipeChat component
  const handleSubstitution = (ingredient: string) => {
    // This functionality is now handled by the parent RecipeChat component
    console.log(`Substitution requested for: ${ingredient}`);
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

  // Handle nested recipe structure - check if data is nested under 'recipe' property
  const actualRecipe = fullRecipe.recipe || fullRecipe;
  
  // Transform recipe data to match EnhancedRecipeCard interface
  const enhancedRecipe = {
    id: actualRecipe.id?.toString() || 'temp-recipe',
    title: actualRecipe.title,
    description: actualRecipe.description,
    cookTime: actualRecipe.cookTime || 30,
    servings: actualRecipe.servings || 4,
    difficulty: actualRecipe.difficulty || "Medium",
    cuisine: actualRecipe.cuisine || (mode === "fridge" ? "Fresh & Simple" : mode === "chef" ? "Gourmet" : "Everyday"),
    image: actualRecipe.imageUrl || actualRecipe.image, // Check both imageUrl and image fields
    ingredients: actualRecipe.ingredients || [],
    instructions: actualRecipe.instructions || [],
    tips: actualRecipe.tips
  };
  
  console.log('🖼️ Enhanced recipe image check:', {
    actualImageUrl: actualRecipe.imageUrl,
    actualImage: actualRecipe.image,
    enhancedImage: enhancedRecipe.image,
    hasImage: !!enhancedRecipe.image
  });
  
  // Force image refresh if missing
  if (!enhancedRecipe.image && actualRecipe.enhanced) {
    enhancedRecipe.image = actualRecipe.enhanced;
    console.log('🔧 Using enhanced image URL:', actualRecipe.enhanced);
  }

  console.log('🎯 Enhanced recipe for display:', enhancedRecipe);
  console.log('🔍 Original fullRecipe data:', fullRecipe);
  console.log('🖼️ Image URLs:', { 
    imageUrl: actualRecipe.imageUrl, 
    image: actualRecipe.image,
    enhanced: enhancedRecipe.image 
  });
  console.log('🥘 Enhanced ingredients count:', enhancedRecipe.ingredients.length);
  console.log('📋 Enhanced instructions count:', enhancedRecipe.instructions.length);
  
  // Debug: Check if there's a nested recipe structure
  if (fullRecipe.recipe) {
    console.log('🔍 Found nested recipe structure!');
    console.log('🥘 Nested recipe ingredients:', fullRecipe.recipe.ingredients);
    console.log('📋 Nested recipe instructions:', fullRecipe.recipe.instructions);
  }

  const handleShare = async () => {
    try {
      // First ensure recipe is saved and shared
      if (fullRecipe.id) {
        await apiRequest("POST", `/api/recipes/${fullRecipe.id}/share`, { 
          isShared: true 
        });
      }

      const shareUrl = fullRecipe.shareId 
        ? `https://getflavr.ai/recipe/share/${fullRecipe.shareId}`
        : `https://getflavr.ai/recipe/${fullRecipe.id}`;

      if (navigator.share && fullRecipe.title) {
        await navigator.share({
          title: fullRecipe.title,
          text: fullRecipe.description || `Check out this recipe: ${fullRecipe.title}`,
          url: shareUrl,
        });
      } else {
        // Fallback to copy link
        await navigator.clipboard.writeText(shareUrl);
        toast({
          title: "Link copied!",
          description: "Recipe sharing link copied to clipboard",
        });
      }
    } catch (error) {
      console.error('Sharing failed:', error);
      toast({
        title: "Error",
        description: "Failed to share recipe",
        variant: "destructive",
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
        onRecipeUpdate={handleRecipeUpdate}
        key={`recipe-${enhancedRecipe.id}-${Date.now()}`} // Force re-render when recipe updates
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

        {/* Additional Sharing Tools for Shopping Mode */}
        {mode === "shopping" && fullRecipe.id && (
          <div className="mb-8 bg-slate-800/30 rounded-xl backdrop-blur-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <iconMap.share className="w-5 h-5 text-orange-400" />
              <h3 className="text-lg font-semibold text-white">Share Recipe</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Button
                onClick={handleShare}
                className="bg-orange-500 hover:bg-orange-600 text-white"
              >
                <iconMap.share className="w-4 h-4 mr-2" />
                Share Recipe
              </Button>
              <Button
                onClick={async () => {
                  const shareUrl = fullRecipe.shareId 
                    ? `https://getflavr.ai/recipe/share/${fullRecipe.shareId}`
                    : `https://getflavr.ai/recipe/${fullRecipe.id}`;
                  await navigator.clipboard.writeText(shareUrl);
                  toast({
                    title: "Link copied!",
                    description: "Recipe link copied to clipboard",
                  });
                }}
                variant="outline"
                className="border-slate-600 text-slate-200 hover:bg-slate-700/50"
              >
                <iconMap.copy className="w-4 h-4 mr-2" />
                Copy Link
              </Button>
            </div>
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

        {/* Recipe Share Tools - For Shopping and Chef Modes */}
        {(mode === "shopping" || mode === "chef") && fullRecipe && (
          <div className="mt-12 mb-8">
            <RecipeShareTools
              id={fullRecipe.id || 'temp-recipe'}
              shareId={fullRecipe.shareId}
              title={fullRecipe.title || 'Recipe'}
              description={fullRecipe.description || ''}
              imageUrl={fullRecipe.imageUrl || fullRecipe.image}
              isShared={fullRecipe.isShared || false}
              recipe={fullRecipe}
            />
          </div>
        )}
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
