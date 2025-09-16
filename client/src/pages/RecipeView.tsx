import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ChefHat, RefreshCw, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import GlobalHeader from "@/components/GlobalHeader";
import GlobalFooter from "@/components/GlobalFooter";
import FloatingChatButton from "@/components/FloatingChatButton";
import EnhancedRecipeCard from "@/components/recipe/EnhancedRecipeCard";
import { useState, useEffect } from "react";

interface Recipe {
  id: number;
  title: string;
  description: string;
  ingredients: string[];
  instructions: string[];
  imageUrl?: string;
  mode: "shopping" | "fridge" | "chef";
  mood?: string;
  createdAt: string;
  isShared: boolean;
  shareId?: string;
  cookTime?: number;
  servings?: number;
  difficulty?: string;
  tips?: string;
  shoppingList?: string[];
}

export default function RecipeView() {
  const [location, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  
  // Extract recipe ID from URL
  const recipeId = location.split('/')[2];
  
  // Enhanced logging for debugging
  useEffect(() => {
    if (recipeId) {
      console.log(`🔍 RecipeView: Loading recipe ID ${recipeId}`);
    }
  }, [recipeId]);

  // Fetch recipe data with enhanced error handling and retry logic
  const { data: recipeData, isLoading, error, refetch } = useQuery<{ recipe: Recipe }>({
    queryKey: [`/api/recipes/${recipeId}`],
    enabled: !!recipeId,
    retry: (failureCount, error) => {
      // Retry up to 3 times for network errors, but not for 404s
      if (failureCount < 3) {
        const errorMessage = error?.message || '';
        const isNetworkError = errorMessage.includes('fetch') || errorMessage.includes('network');
        const is404 = errorMessage.includes('404') || errorMessage.includes('not found');
        
        console.log(`🔄 Recipe ${recipeId} fetch failed (attempt ${failureCount + 1}):`, errorMessage);
        
        // Retry network errors but not 404s
        if (isNetworkError && !is404) {
          console.log(`🔄 Retrying recipe ${recipeId} (${failureCount + 1}/3)`);
          return true;
        }
      }
      
      console.error(`❌ Recipe ${recipeId} failed after ${failureCount} attempts:`, error);
      return false;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
  });

  // Share toggle mutation
  const shareToggleMutation = useMutation({
    mutationFn: (data: { id: number; isShared: boolean }) =>
      apiRequest("POST", "/api/toggle-recipe-share", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/recipes/${recipeId}`] });
    },
  });

  // Copy share link to clipboard
  const copyShareLink = async (shareId: string) => {
    const shareUrl = `https://getflavr.ai/share/${shareId}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast({
        title: "Link copied!",
        description: "Share link copied to clipboard.",
      });
    } catch (error) {
      toast({
        title: "Copy failed",
        description: "Could not copy link to clipboard.",
        variant: "destructive",
      });
    }
  };



  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-black flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  // Manual retry function
  const handleRetry = async () => {
    setIsRetrying(true);
    setRetryCount(prev => prev + 1);
    
    console.log(`🔄 Manual retry for recipe ${recipeId} (attempt ${retryCount + 1})`);
    
    try {
      await refetch();
      toast({
        title: "Retrying...",
        description: "Attempting to load the recipe again.",
      });
    } catch (error) {
      console.error(`❌ Manual retry failed for recipe ${recipeId}:`, error);
    } finally {
      setIsRetrying(false);
    }
  };
  
  // Enhanced error handling with better user feedback
  if (error || !recipeData?.recipe) {
    const errorMessage = error?.message || '';
    const is404 = errorMessage.includes('404') || errorMessage.includes('not found');
    const isNetworkError = errorMessage.includes('fetch') || errorMessage.includes('network');
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-black flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          {isNetworkError ? (
            <AlertCircle className="w-16 h-16 text-orange-500 mx-auto mb-4" />
          ) : (
            <ChefHat className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          )}
          
          <h2 className="text-xl font-semibold text-white mb-2">
            {isNetworkError ? "Connection Issue" : "Recipe Not Found"}
          </h2>
          
          <p className="text-slate-300 mb-6">
            {isNetworkError 
              ? "We're having trouble connecting. Please check your internet connection and try again."
              : is404 
                ? "This recipe may have been removed or is no longer available."
                : "Something went wrong while loading this recipe."}
          </p>
          
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {(isNetworkError || !is404) && (
              <Button 
                onClick={handleRetry} 
                disabled={isRetrying}
                className="bg-orange-500 hover:bg-orange-600 text-white"
              >
                {isRetrying ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Retrying...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Try Again
                  </>
                )}
              </Button>
            )}
            
            <Button onClick={() => navigate("/weekly-planner")} variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Weekly Planner
            </Button>
          </div>
          
          {retryCount > 0 && (
            <p className="text-xs text-slate-500 mt-4">
              Retry attempts: {retryCount}
            </p>
          )}
        </div>
      </div>
    );
  }

  const recipe = recipeData.recipe;

  // Transform recipe data to match EnhancedRecipeCard interface
  const enhancedRecipe = {
    id: recipe.id.toString(),
    title: recipe.title,
    description: recipe.description,
    cookTime: recipe.cookTime || 30,
    servings: recipe.servings || 4,
    difficulty: recipe.difficulty || "Medium",
    cuisine: recipe.mode === "fridge" ? "Fresh & Simple" : recipe.mode === "chef" ? "Gourmet" : "Everyday",
    image: recipe.imageUrl,
    ingredients: recipe.ingredients,
    instructions: recipe.instructions,
    tips: recipe.tips
  };

  const handleBack = () => {
    navigate("/my-recipes");
  };

  const handleShare = () => {
    if (recipe.shareId) {
      copyShareLink(recipe.shareId);
    } else {
      shareToggleMutation.mutate({
        id: recipe.id,
        isShared: !recipe.isShared
      });
    }
  };

  const handleRating = (recipeId: string, rating: number) => {
    toast({
      title: "Rating saved",
      description: `You rated "${recipe.title}" ${rating} stars`,
    });
  };

  // Handle recipe updates from chat bot
  const handleRecipeUpdate = (updatedRecipe: any) => {
    console.log('🔄 Recipe update received from chat bot:', updatedRecipe.title);
    
    // Create updated recipe object
    const updatedData = {
      ...recipe,
      title: updatedRecipe.title,
      description: updatedRecipe.description,
      ingredients: updatedRecipe.ingredients,
      instructions: updatedRecipe.instructions,
      servings: updatedRecipe.servings,
      cookTime: updatedRecipe.cookTime,
      difficulty: updatedRecipe.difficulty,
      cuisine: updatedRecipe.cuisine
    };
    
    // Force component re-render by updating query data
    queryClient.setQueryData([`/api/recipes/${recipeId}`], { recipe: updatedData });
    
    toast({
      title: "Recipe Updated",
      description: updatedRecipe.modifications || "Your recipe has been successfully modified!",
    });
  };

  return (
    <div className="min-h-screen bg-slate-900">
      <GlobalHeader />
      
      <main className="relative z-10 pt-20">
        {/* Enhanced Recipe Card */}
        <EnhancedRecipeCard
          recipe={enhancedRecipe}
          onBack={handleBack}
          onShare={handleShare}
        />

        {/* Additional Content Section */}
        <div className="max-w-7xl mx-auto px-6 py-8">

          {/* Floating AI Chef Chat Button */}
          <FloatingChatButton 
            variant="floating" 
            currentRecipe={recipe}
            currentMode={recipe.mode}
            onRecipeUpdate={handleRecipeUpdate}
          />
        </div>
      </main>

      <GlobalFooter />
    </div>
  );
}