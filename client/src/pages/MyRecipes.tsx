import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { iconMap } from "@/lib/iconMap";
import GlobalHeader from "@/components/GlobalHeader";
import GlobalNavigation from "@/components/GlobalNavigation";
import SettingsPanel from "@/components/SettingsPanel";
import GlobalFooter from "@/components/GlobalFooter";

interface Recipe {
  id: number;
  title: string;
  description: string;
  imageUrl?: string;
  mode: "shopping" | "fridge" | "chef";
  mood?: string;
  createdAt: string;
  isShared: boolean;
  shareId?: string;
  cookTime?: number;
  servings?: number;
  difficulty?: string;
}

export default function MyRecipes() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showNavigation, setShowNavigation] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  // Close all menus
  const closeAllMenus = () => {
    setShowNavigation(false);
    setShowSettings(false);
    setShowUserMenu(false);
  };

  // Open specific menu and close others
  const openMenu = (menuType: 'navigation' | 'settings' | 'userMenu') => {
    closeAllMenus();
    if (menuType === 'navigation') setShowNavigation(true);
    if (menuType === 'settings') setShowSettings(true);
    if (menuType === 'userMenu') setShowUserMenu(true);
  };

  // Check authentication
  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ["/api/me"],
    retry: false,
  });

  // Fetch recipe history
  const { data: recipesData, isLoading: recipesLoading } = useQuery({
    queryKey: ["/api/recipes/history"],
    enabled: !!user?.user,
  });

  // Share toggle mutation
  const shareToggleMutation = useMutation({
    mutationFn: ({ recipeId, isShared }: { recipeId: number; isShared: boolean }) =>
      apiRequest("POST", `/api/recipe/${recipeId}/share`, { isShared }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/recipes/history"] });
      toast({
        title: "Sharing updated",
        description: "Recipe sharing preference saved successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update sharing settings.",
        variant: "destructive",
      });
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

  // Get mode icon
  const getModeIcon = (mode: string) => {
    switch (mode) {
      case "shopping":
        return <ShoppingCart className="w-4 h-4" />;
      case "fridge":
        return <Refrigerator className="w-4 h-4" />;
      case "chef":
        return <ChefHat className="w-4 h-4" />;
      default:
        return <Coffee className="w-4 h-4" />;
    }
  };

  // Get mood icon
  const getMoodIcon = (mood?: string) => {
    if (!mood) return <Smile className="w-4 h-4" />;
    
    const lowerMood = mood.toLowerCase();
    if (lowerMood.includes("comfort") || lowerMood.includes("cozy")) {
      return <Heart className="w-4 h-4 text-red-400" />;
    }
    if (lowerMood.includes("energy") || lowerMood.includes("vibrant")) {
      return <Zap className="w-4 h-4 text-yellow-400" />;
    }
    if (lowerMood.includes("adventure") || lowerMood.includes("bold")) {
      return <Zap className="w-4 h-4 text-orange-400" />;
    }
    return <Smile className="w-4 h-4 text-blue-400" />;
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  // Redirect if not authenticated
  useEffect(() => {
    if (!userLoading && !user?.user) {
      navigate("/");
    }
  }, [user, userLoading, navigate]);

  if (userLoading || !user?.user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-black flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  const recipes = recipesData?.recipes || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-black relative overflow-hidden">
      <GlobalHeader 
        onMenuClick={() => openMenu('navigation')}
        onSettingsClick={() => openMenu('settings')}
        onAuthRequired={() => navigate("/")}
      />
      
      <main className="container mx-auto px-6 py-8 relative z-10 pb-24 pt-24">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold leading-tight mb-3 bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent">
            My Recipes
          </h1>
          <p className="text-lg text-slate-400 max-w-lg mx-auto leading-relaxed">
            Your personal collection of AI-generated recipes
          </p>
        </div>

        {/* Recipes Grid */}
        {recipesLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} className="bg-card/90 backdrop-blur-xl border border-border/50 animate-pulse">
                <div className="aspect-video bg-muted rounded-t-lg"></div>
                <CardContent className="p-6">
                  <div className="h-4 bg-muted rounded mb-2"></div>
                  <div className="h-3 bg-muted rounded w-2/3 mb-4"></div>
                  <div className="flex justify-between items-center">
                    <div className="h-3 bg-muted rounded w-1/3"></div>
                    <div className="h-6 bg-muted rounded w-16"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : recipes.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-orange-500/20 to-orange-600/20 rounded-full flex items-center justify-center">
              <ChefHat className="w-12 h-12 text-orange-400" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">No recipes yet</h3>
            <p className="text-muted-foreground mb-6">Start creating delicious recipes with AI</p>
            <Button onClick={() => navigate("/app")} className="bg-orange-500 hover:bg-orange-600">
              Create Your First Recipe
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recipes.map((recipe: Recipe, index: number) => (
              <Card 
                key={recipe.id}
                className="bg-card/90 backdrop-blur-xl border border-border/50 group hover:shadow-orange-500/20 transition-all duration-300 hover:scale-[1.02] hover:border-orange-500/40"
                style={{ 
                  animationDelay: `${index * 100}ms`,
                  animation: "fadeInUp 0.5s ease-out forwards"
                }}
              >
                {/* Recipe Image */}
                <div className="aspect-video bg-gradient-to-br from-slate-800 to-slate-900 rounded-t-lg overflow-hidden relative">
                  {recipe.imageUrl ? (
                    <img 
                      src={recipe.imageUrl} 
                      alt={recipe.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ChefHat className="w-12 h-12 text-slate-600" />
                    </div>
                  )}
                  
                  {/* Mode Badge */}
                  <Badge 
                    variant="secondary" 
                    className="absolute top-3 left-3 bg-black/50 text-white border-0"
                  >
                    {getModeIcon(recipe.mode)}
                    <span className="ml-1 capitalize">{recipe.mode}</span>
                  </Badge>
                </div>

                <CardContent className="p-6">
                  {/* Recipe Title & Description */}
                  <h3 className="text-lg font-semibold text-foreground mb-2 line-clamp-2 group-hover:text-orange-300 transition-colors duration-300">
                    {recipe.title}
                  </h3>
                  
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                    {recipe.description}
                  </p>

                  {/* Recipe Meta */}
                  <div className="flex items-center gap-4 mb-4 text-xs text-muted-foreground">
                    {recipe.mood && (
                      <div className="flex items-center gap-1">
                        {getMoodIcon(recipe.mood)}
                        <span className="capitalize">{recipe.mood}</span>
                      </div>
                    )}
                    
                    {recipe.cookTime && (
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        <span>{recipe.cookTime}m</span>
                      </div>
                    )}
                    
                    <div className="flex items-center gap-1 text-orange-400">
                      <Clock className="w-3 h-3" />
                      <span>{formatDate(recipe.createdAt)}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => navigate(`/recipe/${recipe.id}`)}
                      className="hover:bg-orange-500/10 hover:border-orange-500/50"
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      View Recipe
                    </Button>

                    <div className="flex items-center gap-2">
                      <Switch
                        checked={recipe.isShared}
                        onCheckedChange={(checked) => 
                          shareToggleMutation.mutate({ 
                            recipeId: recipe.id, 
                            isShared: checked 
                          })
                        }
                        disabled={shareToggleMutation.isPending}
                      />
                      <Share2 className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </div>

                  {/* Share Link */}
                  {recipe.isShared && recipe.shareId && (
                    <div className="mt-4 p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-orange-300 font-medium">Public link</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyShareLink(recipe.shareId!)}
                          className="h-6 px-2 text-xs hover:bg-orange-500/20"
                        >
                          <Copy className="w-3 h-3 mr-1" />
                          Copy
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      <GlobalFooter currentMode="history" />

      {/* Navigation Menu */}
      {showNavigation && (
        <GlobalNavigation 
          onClose={closeAllMenus}
          onAuthRequired={() => navigate("/")}
        />
      )}

      {/* Settings Panel */}
      {showSettings && (
        <SettingsPanel 
          onClose={closeAllMenus}
        />
      )}

      {/* User Menu */}
      {showUserMenu && (
        <UserMenu 
          onClose={closeAllMenus}
        />
      )}
    </div>
  );
}