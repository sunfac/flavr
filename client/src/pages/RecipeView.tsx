import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ChefHat } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import GlobalHeader from "@/components/GlobalHeader";
import GlobalFooter from "@/components/GlobalFooter";
import FloatingChatButton from "@/components/FloatingChatButton";
import SocialShareTools from "@/components/SocialShareTools";
import EnhancedRecipeCard from "@/components/recipe/EnhancedRecipeCard";

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
  
  // Extract recipe ID from URL
  const recipeId = location.split('/')[2];

  // Fetch recipe data
  const { data: recipeData, isLoading, error } = useQuery<{ recipe: Recipe }>({
    queryKey: [`/api/recipe/${recipeId}`],
    enabled: !!recipeId,
  });

  // Share toggle mutation
  const shareToggleMutation = useMutation({
    mutationFn: (data: { id: number; isShared: boolean }) =>
      apiRequest("POST", "/api/toggle-recipe-share", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/recipe/${recipeId}`] });
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

  if (error || !recipeData?.recipe) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-black flex items-center justify-center">
        <div className="text-center">
          <ChefHat className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-foreground mb-2">Recipe not found</h2>
          <p className="text-muted-foreground mb-6">This recipe may have been removed or is no longer available.</p>
          <Button onClick={() => navigate("/my-recipes")} variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to My Recipes
          </Button>
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
    queryClient.setQueryData([`/api/recipe/${recipeId}`], { recipe: updatedData });
    
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
          {/* Social Share Tools */}
          <div className="mb-8">
            <SocialShareTools
              id={recipe.id.toString()}
              shareId={recipe.shareId || undefined}
              title={recipe.title}
              description={recipe.description || ""}
              imageUrl={recipe.imageUrl || undefined}
              isShared={recipe.isShared || false}
              onShareToggle={() => 
                shareToggleMutation.mutate({
                  id: recipe.id,
                  isShared: !recipe.isShared
                })
              }
            />
          </div>

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