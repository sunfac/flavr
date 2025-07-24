import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { iconMap } from "@/lib/iconMap";
import { motion, AnimatePresence } from "framer-motion";
import { apiRequest } from "@/lib/queryClient";
import { useQuery } from "@tanstack/react-query";
import { useRecipeStore } from "@/stores/recipeStore";

interface SavedRecipe {
  id: number;
  title: string;
  description: string;
  cuisine: string;
  difficulty: string;
  cookTime: number;
  servings: number;
  mode: string;
  imageUrl?: string;
  createdAt: string;
  ingredients: string[];
  instructions: string[];
  tips?: string;
}

export default function DigitalCookbook() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFilter, setSelectedFilter] = useState<string>("all");


  // Fetch user's saved recipes
  const { data: recipes, isLoading, error, refetch } = useQuery({
    queryKey: ['/api/recipes'],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/recipes");
      if (!response.ok) {
        throw new Error('Failed to fetch recipes');
      }
      return response.json();
    }
  });

  // Filter recipes based on search and filter criteria
  const filteredRecipes = recipes?.filter((recipe: SavedRecipe) => {
    const matchesSearch = recipe.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         recipe.cuisine.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         recipe.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = selectedFilter === "all" || 
                         recipe.mode === selectedFilter ||
                         recipe.cuisine.toLowerCase() === selectedFilter.toLowerCase() ||
                         recipe.difficulty.toLowerCase() === selectedFilter.toLowerCase();
    
    return matchesSearch && matchesFilter;
  }) || [];

  // Get unique filter options from recipes
  const getFilterOptions = () => {
    if (!recipes) return [];
    
    const modes = Array.from(new Set(recipes.map((r: SavedRecipe) => r.mode))) as string[];
    const cuisines = Array.from(new Set(recipes.map((r: SavedRecipe) => r.cuisine))).filter(Boolean) as string[];
    const difficulties = Array.from(new Set(recipes.map((r: SavedRecipe) => r.difficulty))).filter(Boolean) as string[];
    
    // Filter out shopping mode from the modes
    const filteredModes = modes.filter(mode => mode !== 'shopping');
    
    return [
      { label: "All Recipes", value: "all" },
      ...filteredModes.map(mode => ({ label: `${mode.charAt(0).toUpperCase() + mode.slice(1)} Mode`, value: mode })),
      ...cuisines.map(cuisine => ({ label: cuisine, value: cuisine.toLowerCase() })),
      ...difficulties.map(diff => ({ label: diff, value: diff.toLowerCase() }))
    ];
  };

  const handleRecipeClick = (recipe: SavedRecipe) => {
    // Load recipe into store and navigate to Recipe page for full experience with chat
    const { replaceRecipe } = useRecipeStore.getState();
    
    replaceRecipe({
      id: recipe.id.toString(),
      servings: recipe.servings,
      ingredients: recipe.ingredients.map((text, index) => ({
        id: `ingredient-${index}`,
        text,
        checked: false
      })),
      steps: recipe.instructions.map((instruction, index) => ({
        id: `step-${index}`,
        title: `Step ${index + 1}`,
        description: instruction
      })),
      meta: {
        title: recipe.title,
        description: recipe.description,
        cookTime: recipe.cookTime,
        difficulty: recipe.difficulty,
        cuisine: recipe.cuisine,
        image: recipe.imageUrl
      },
      currentStep: 0,
      completedSteps: [],
      lastUpdated: Date.now()
    });
    
    // Navigate to Recipe page for full experience
    navigate("/recipe");
  };

  const handleDeleteRecipe = async (recipeId: number) => {
    try {
      await apiRequest("DELETE", `/api/recipes/${recipeId}`);
      toast({
        title: "Recipe Deleted",
        description: "Recipe has been removed from your cookbook"
      });
      refetch();
    } catch (error) {
      toast({
        title: "Delete Failed",
        description: "Could not delete the recipe. Please try again.",
        variant: "destructive"
      });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty?.toLowerCase()) {
      case 'easy': return 'bg-green-500/20 text-green-300 border-green-500/30';
      case 'medium': return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
      case 'hard': return 'bg-red-500/20 text-red-300 border-red-500/30';
      default: return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
    }
  };

  const getModeColor = (mode: string) => {
    switch (mode?.toLowerCase()) {
      case 'shopping': return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case 'fridge': return 'bg-green-500/20 text-green-300 border-green-500/30';
      case 'chef': return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
      case 'conversational': return 'bg-orange-500/20 text-orange-300 border-orange-500/30';
      default: return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
    }
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center">
        <Card className="bg-white/5 border-white/10 backdrop-blur-sm p-8">
          <CardContent className="text-center">
            <iconMap.alertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">Unable to Load Cookbook</h2>
            <p className="text-gray-400 mb-4">Please sign in to view your saved recipes</p>
            <Button onClick={() => navigate("/app")} className="bg-orange-500 hover:bg-orange-600">
              Return to Flavr
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              onClick={() => navigate("/app")}
              className="text-white hover:bg-white/10"
            >
              <iconMap.arrowLeft className="w-5 h-5 mr-2" />
              Back to Flavr
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-white">My Cookbook</h1>
              <p className="text-gray-400">
                {filteredRecipes.length} recipe{filteredRecipes.length !== 1 ? 's' : ''} saved
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <iconMap.book className="w-8 h-8 text-orange-400" />
          </div>
        </div>

        {/* Search and Filter Bar */}
        <div className="mb-8 space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <iconMap.search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search your recipes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-gray-400"
              />
            </div>
          </div>
          
          {/* Filter Chips */}
          <div className="flex flex-wrap gap-2">
            {getFilterOptions().map((option) => (
              <Button
                key={option.value}
                variant={selectedFilter === option.value ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedFilter(option.value)}
                className={`${
                  selectedFilter === option.value 
                    ? "bg-orange-500 text-white" 
                    : "bg-white/10 border-white/20 text-white hover:bg-white/20"
                }`}
              >
                {option.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <Card className="bg-white/5 border-white/10 backdrop-blur-sm h-80">
                  <CardContent className="p-0">
                    <div className="h-48 bg-white/10 rounded-t-lg"></div>
                    <div className="p-4 space-y-3">
                      <div className="h-4 bg-white/10 rounded w-3/4"></div>
                      <div className="h-3 bg-white/10 rounded w-1/2"></div>
                      <div className="flex space-x-2">
                        <div className="h-6 bg-white/10 rounded w-16"></div>
                        <div className="h-6 bg-white/10 rounded w-16"></div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && filteredRecipes.length === 0 && (
          <div className="text-center py-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-md mx-auto"
            >
              <iconMap.book className="w-20 h-20 text-gray-500 mx-auto mb-6" />
              <h2 className="text-2xl font-semibold text-white mb-4">
                {searchTerm || selectedFilter !== "all" ? "No recipes found" : "Your cookbook is empty"}
              </h2>
              <p className="text-gray-400 mb-8">
                {searchTerm || selectedFilter !== "all" 
                  ? "Try adjusting your search or filter criteria"
                  : "Start cooking with Flavr to save your first recipe"
                }
              </p>
              <Button 
                onClick={() => navigate("/app")}
                className="bg-orange-500 hover:bg-orange-600 text-white"
              >
                <iconMap.plus className="w-4 h-4 mr-2" />
                Create Your First Recipe
              </Button>
            </motion.div>
          </div>
        )}

        {/* Recipe Grid */}
        {!isLoading && filteredRecipes.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence>
              {filteredRecipes.map((recipe: SavedRecipe, index: number) => (
                <motion.div
                  key={recipe.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: index * 0.1 }}
                  className="group cursor-pointer"
                  onClick={() => handleRecipeClick(recipe)}
                >
                  <Card className="bg-white/5 border-white/10 backdrop-blur-sm hover:bg-white/10 transition-all duration-300 overflow-hidden h-full">
                    <CardContent className="p-0">
                      {/* Recipe Image */}
                      <div className="relative h-48 bg-gradient-to-br from-orange-500/20 to-purple-500/20 overflow-hidden">
                        {recipe.imageUrl ? (
                          <img 
                            src={recipe.imageUrl} 
                            alt={recipe.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <iconMap.chef className="w-16 h-16 text-white/50" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                        
                        {/* Quick Actions */}
                        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteRecipe(recipe.id);
                            }}
                            className="bg-red-500/20 hover:bg-red-500/40 text-red-300 backdrop-blur-sm"
                          >
                            <iconMap.trash className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Recipe Details */}
                      <div className="p-4 space-y-3">
                        <div>
                          <h3 className="font-semibold text-white text-lg line-clamp-2 group-hover:text-orange-300 transition-colors">
                            {recipe.title}
                          </h3>
                          {recipe.description && (
                            <p className="text-gray-400 text-sm line-clamp-2 mt-1">
                              {recipe.description}
                            </p>
                          )}
                        </div>

                        {/* Recipe Metadata */}
                        <div className="flex flex-wrap gap-2">
                          {recipe.cuisine && (
                            <Badge variant="outline" className="text-white border-white/20">
                              {recipe.cuisine}
                            </Badge>
                          )}
                        </div>

                        {/* Recipe Stats */}
                        <div className="flex justify-between items-center text-sm text-gray-400">
                          <div className="flex items-center">
                            <iconMap.users className="w-4 h-4 mr-1" />
                            {recipe.servings} servings
                          </div>
                          <div className="text-xs">
                            {formatDate(recipe.createdAt)}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}


      </div>
    </div>
  );
}