import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import ShoppingList from "./ShoppingList";
import ChatBot from "./ChatBot";
import RecipeShareTools from "./RecipeShareTools";
import VoiceControl from "./VoiceControl";
import SommelierModal from "./SommelierModal";
import { generateShoppingPrompt2 } from "@/prompts/shoppingPrompt2";
import { generateFridgePrompt2 } from "@/prompts/fridgePrompt2";
import { motion, AnimatePresence } from "framer-motion";
import { iconMap } from "@/lib/iconMap";
import { Wine } from "lucide-react";
import EnhancedRecipeCard from "./recipe/EnhancedRecipeCard";
import { useRecipeStore } from "@/stores/recipeStore";
import { RecipeCardSkeleton } from "@/components/ui/skeleton";
import { OptimisticSaveButton, OptimisticShareButton } from "@/components/ui/optimistic";
import { RecipeImage } from "@/components/ui/progressive-image";

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
  const [showVoiceControl, setShowVoiceControl] = useState(false);
  const [showSommelier, setShowSommelier] = useState(false);
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

  // Old save recipe mutation removed - now handled by OptimisticSaveButton

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
        {/* Hero Image Area with Progressive Loading */}
        <motion.div 
          whileHover={{ scale: 1.02 }}
          transition={{ duration: 0.3 }}
          className="relative"
        >
          <RecipeImage
            src={recipe.imageUrl || recipe.image}
            alt={recipe.title || "Recipe"}
            className="w-full h-56 rounded-t-xl"
            aspectRatio="wide"
            priority={false}
          />
          
          {/* Recipe Type Badge Overlay */}
          <div className="absolute top-4 right-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="bg-black/60 backdrop-blur-sm px-3 py-1 rounded-full"
            >
              <span className="text-white text-xs font-medium">
                {recipe.cuisine || recipe.mood || "Delicious"} ✨
              </span>
            </motion.div>
          </div>
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
    return <RecipeCardSkeleton />;
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
        await apiRequest("POST", `/api/recipe/${fullRecipe.id}/share`, { 
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
        key={`recipe-${enhancedRecipe.id}-${Date.now()}`} // Force re-render when recipe updates
      />

      {/* Additional Legacy Features */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Action Buttons Section */}
        <div className="space-y-4 mb-8">
          {/* Shopping List Button (only for shopping mode) */}
          {mode === "shopping" && fullRecipe.shoppingList && (
            <Button 
              onClick={() => setShowShoppingList(true)}
              className="w-full bg-secondary text-secondary-foreground hover:bg-secondary/90"
            >
              <iconMap.shoppingCart className="w-4 h-4 mr-2" />
              Generate Shopping List
            </Button>
          )}

          {/* Ask the Sommelier Button */}
          <Button
            onClick={() => setShowSommelier(true)}
            variant="outline"
            className="w-full bg-slate-800/50 border-slate-600/50 text-slate-200 hover:bg-slate-700/50 transition-all duration-200"
            data-testid="button-sommelier"
          >
            <Wine className="w-4 h-4 mr-2 text-purple-400" />
            Ask the Sommelier
          </Button>
        </div>

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

      {/* Sommelier Modal */}
      <SommelierModal
        isOpen={showSommelier}
        onClose={() => setShowSommelier(false)}
        recipe={{
          title: actualRecipe.title,
          cuisine: actualRecipe.cuisine,
          ingredients: actualRecipe.ingredients || [],
          instructions: actualRecipe.instructions || [],
          difficulty: actualRecipe.difficulty,
          cookTime: actualRecipe.cookTime
        }}
      />
    </div>
  );
}
