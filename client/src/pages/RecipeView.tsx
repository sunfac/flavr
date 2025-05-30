import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ChefHat, Clock, Refrigerator, ShoppingCart, Users } from 'lucide-react';
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { iconMap } from "@/lib/iconMap";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import GlobalHeader from "@/components/GlobalHeader";
import GlobalFooter from "@/components/GlobalFooter";
import ChatBot from "@/components/ChatBot";
import SocialShareTools from "@/components/SocialShareTools";

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
  const { data: recipeData, isLoading, error } = useQuery({
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
    const shareUrl = `${window.location.origin}/share/${shareId}`;
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

  // Get mode details
  const getModeDetails = (mode: string) => {
    switch (mode) {
      case "shopping":
        return {
          icon: {<ShoppingCart className="w-5 h-5" />},
          label: "Shopping Mode",
          color: "bg-orange-500/20 text-orange-300 border-orange-500/30"
        };
      case "fridge":
        return {
          icon: {<Refrigerator className="w-5 h-5" />},
          label: "Fridge to Fork",
          color: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
        };
      case "chef":
        return {
          icon: {<ChefHat className="w-5 h-5" />},
          label: "Chef Assist",
          color: "bg-amber-500/20 text-amber-300 border-amber-500/30"
        };
      default:
        return {
          icon: {<ChefHat className="w-5 h-5" />},
          label: "Recipe",
          color: "bg-slate-500/20 text-slate-300 border-slate-500/30"
        };
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
          {<ChefHat className="w-16 h-16 text-slate-600 mx-auto mb-4" />}
          <h2 className="text-xl font-semibold text-foreground mb-2">Recipe not found</h2>
          <p className="text-muted-foreground mb-6">This recipe may have been removed or is no longer available.</p>
          <Button onClick={() => navigate("/my-recipes")} variant="outline">
            {<ArrowLeft className="w-4 h-4 mr-2" />}
            Back to My Recipes
          </Button>
        </div>
      </div>
    );
  }

  const recipe: Recipe = recipeData.recipe;
  const modeDetails = getModeDetails(recipe.mode);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-black relative overflow-hidden">
      <GlobalHeader />
      
      <main className="container mx-auto px-6 py-8 relative z-10 pb-24 pt-24">
        {/* Back Button */}
        <Button 
          variant="ghost" 
          onClick={() => navigate("/my-recipes")}
          className="mb-6 text-muted-foreground hover:text-foreground"
        >
          {<ArrowLeft className="w-4 h-4 mr-2" />}
          Back to My Recipes
        </Button>

        <div className="max-w-4xl mx-auto">
          {/* Recipe Header */}
          <div className="mb-8">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <Badge className={`mb-3 ${modeDetails.color}`}>
                  {modeDetails.icon}
                  <span className="ml-2">{modeDetails.label}</span>
                </Badge>
                
                <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-3 leading-tight">
                  {recipe.title}
                </h1>
                
                <p className="text-lg text-muted-foreground leading-relaxed">
                  {recipe.description}
                </p>
              </div>

              {recipe.isShared && recipe.shareId && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyShareLink(recipe.shareId!)}
                  className="ml-4 hover:bg-orange-500/10 hover:border-orange-500/50"
                >
                  {<span>🔧</span>}
                  Share
                </Button>
              )}
            </div>

            {/* Recipe Meta */}
            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              {recipe.cookTime && (
                <div className="flex items-center gap-1">
                  {<Clock className="w-4 h-4" />}
                  <span>{recipe.cookTime} minutes</span>
                </div>
              )}
              
              {recipe.servings && (
                <div className="flex items-center gap-1">
                  {<Users className="w-4 h-4" />}
                  <span>{recipe.servings} servings</span>
                </div>
              )}
              
              {recipe.difficulty && (
                <Badge variant="secondary" className="text-xs">
                  {recipe.difficulty}
                </Badge>
              )}
            </div>
          </div>

          {/* Recipe Image */}
          {recipe.imageUrl && (
            <div className="mb-8">
              <div className="aspect-video rounded-2xl overflow-hidden shadow-2xl">
                <img 
                  src={recipe.imageUrl} 
                  alt={recipe.title}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Ingredients */}
            <Card className="bg-card/90 backdrop-blur-xl border border-border/50">
              <CardContent className="p-6">
                <h2 className="text-xl font-bold text-foreground mb-4 flex items-center">
                  {<ChefHat className="w-5 h-5 mr-2 text-orange-400" />}
                  Ingredients
                </h2>
                
                <ul className="space-y-2">
                  {recipe.ingredients.map((ingredient, index) => (
                    <li key={index} className="flex items-start">
                      <span className="w-2 h-2 bg-orange-400 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                      <span className="text-muted-foreground">{ingredient}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Instructions */}
            <Card className="bg-card/90 backdrop-blur-xl border border-border/50">
              <CardContent className="p-6">
                <h2 className="text-xl font-bold text-foreground mb-4 flex items-center">
                  {<Clock className="w-5 h-5 mr-2 text-orange-400" />}
                  Instructions
                </h2>
                
                <ol className="space-y-4">
                  {recipe.instructions.map((instruction, index) => (
                    <li key={index} className="flex items-start">
                      <span className="w-6 h-6 bg-orange-500 text-white rounded-full flex items-center justify-center text-sm font-medium mr-3 flex-shrink-0 mt-0.5">
                        {index + 1}
                      </span>
                      <span className="text-muted-foreground leading-relaxed">{instruction}</span>
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          </div>

          {/* Tips */}
          {recipe.tips && (
            <Card className="bg-orange-500/10 border-orange-500/20 mt-8">
              <CardContent className="p-6">
                <h3 className="font-bold text-orange-300 mb-2 flex items-center">
                  {<ChefHat className="w-4 h-4 mr-2" />}
                  Chef's Tip
                </h3>
                <p className="text-foreground text-sm leading-relaxed">{recipe.tips}</p>
              </CardContent>
            </Card>
          )}

          {/* Shopping List */}
          {recipe.shoppingList && recipe.shoppingList.length > 0 && (
            <Card className="bg-card/90 backdrop-blur-xl border border-border/50 mt-8">
              <CardContent className="p-6">
                <h3 className="font-bold text-foreground mb-4 flex items-center">
                  {<ShoppingCart className="w-5 h-5 mr-2 text-orange-400" />}
                  Shopping List
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {recipe.shoppingList.map((item, index) => (
                    <div key={index} className="flex items-center">
                      <span className="w-2 h-2 bg-orange-400 rounded-full mr-3"></span>
                      <span className="text-muted-foreground text-sm">{item}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Social Share Tools */}
          <div className="mt-8">
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

          {/* AI Chef Chat */}
          <div className="mt-8">
            <ChatBot 
              currentRecipe={recipe}
              currentMode={recipe.mode}
            />
          </div>
        </div>
      </main>

      <GlobalFooter />
    </div>
  );
}