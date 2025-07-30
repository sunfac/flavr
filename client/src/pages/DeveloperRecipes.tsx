import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { iconMap } from "@/lib/iconMap";
import { motion } from "framer-motion";

interface RecipeWithUser {
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
  userId: number;
  userEmail: string;
  userName: string;
  ingredients: string[];
  instructions: string[];
}

export default function DeveloperRecipes() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMode, setSelectedMode] = useState<string>("all");

  // Fetch all recipes across all users (developer-only endpoint)
  const { data: recipeData, isLoading, error } = useQuery({
    queryKey: ['/api/developer/all-recipes'],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/developer/all-recipes");
      if (!response.ok) {
        throw new Error('Failed to fetch developer recipes');
      }
      return response.json();
    }
  });

  const recipes = recipeData?.recipes || [];
  const totalRecipes = recipeData?.totalRecipes || 0;
  const uniqueUsers = recipeData?.uniqueUsers || 0;

  // Filter recipes
  const filteredRecipes = recipes.filter((recipe: RecipeWithUser) => {
    const matchesSearch = recipe.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         recipe.cuisine.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         recipe.userEmail.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesMode = selectedMode === "all" || recipe.mode === selectedMode;
    
    return matchesSearch && matchesMode;
  });

  // Get unique modes for filtering
  const modes = Array.from(new Set(recipes.map((r: RecipeWithUser) => r.mode))) as string[];

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading all recipes...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-md mx-auto">
          <CardContent className="pt-6">
            <div className="text-center text-red-500">
              <iconMap.alertCircle className="h-12 w-12 mx-auto mb-4" />
              <p>Failed to load developer recipes</p>
              <p className="text-sm text-muted-foreground mt-2">
                Ensure you have developer privileges
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Developer Recipe Database</h1>
        <p className="text-muted-foreground">
          Complete access to all user recipes across all sessions
        </p>
        
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <Card>
            <CardContent className="pt-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-500">{totalRecipes}</div>
                <div className="text-sm text-muted-foreground">Total Recipes</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-500">{uniqueUsers}</div>
                <div className="text-sm text-muted-foreground">Unique Users</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-500">{filteredRecipes.length}</div>
                <div className="text-sm text-muted-foreground">Filtered Results</div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex-1">
          <Input
            placeholder="Search recipes, cuisines, or user emails..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant={selectedMode === "all" ? "default" : "outline"}
            onClick={() => setSelectedMode("all")}
            size="sm"
          >
            All Modes
          </Button>
          {modes.map((mode) => (
            <Button
              key={mode}
              variant={selectedMode === mode ? "default" : "outline"}
              onClick={() => setSelectedMode(mode)}
              size="sm"
              className="capitalize"
            >
              {mode}
            </Button>
          ))}
        </div>
      </div>

      {/* Recipes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredRecipes.map((recipe: RecipeWithUser, index: number) => (
          <motion.div
            key={recipe.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="h-full hover:shadow-lg transition-shadow">
              <CardHeader className="pb-2">
                <div className="w-full h-48 bg-gray-100 rounded-lg mb-3 overflow-hidden relative">
                  {recipe.imageUrl ? (
                    <>
                      <img
                        src={recipe.imageUrl}
                        alt={recipe.title}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                          if (fallback) fallback.style.display = 'flex';
                        }}
                      />
                      <div 
                        className="absolute inset-0 flex items-center justify-center bg-gray-100"
                        style={{ display: 'none' }}
                      >
                        <div className="text-center text-gray-500">
                          <iconMap.chef className="h-12 w-12 mx-auto mb-2" />
                          <p className="text-sm">Image expired</p>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-100">
                      <div className="text-center text-gray-500">
                        <iconMap.chef className="h-12 w-12 mx-auto mb-2" />
                        <p className="text-sm">No image</p>
                      </div>
                    </div>
                  )}
                </div>
                <CardTitle className="text-lg leading-tight">{recipe.title}</CardTitle>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <iconMap.user className="h-4 w-4" />
                  <span>{recipe.userEmail}</span>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary" className="capitalize">
                      {recipe.mode}
                    </Badge>
                    <Badge variant="outline">{recipe.cuisine}</Badge>
                    <Badge variant="outline">{recipe.difficulty}</Badge>
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <iconMap.clock className="h-4 w-4" />
                      <span>{recipe.cookTime}min</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <iconMap.users className="h-4 w-4" />
                      <span>{recipe.servings} servings</span>
                    </div>
                  </div>
                  
                  <div className="text-sm text-muted-foreground">
                    <div className="flex items-center gap-1 mb-1">
                      <iconMap.calendar className="h-4 w-4" />
                      <span>Created: {new Date(recipe.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div className="text-sm">
                    <div className="font-medium mb-1">Ingredients ({recipe.ingredients.length}):</div>
                    <div className="text-muted-foreground line-clamp-2">
                      {recipe.ingredients.slice(0, 3).join(", ")}
                      {recipe.ingredients.length > 3 && "..."}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {filteredRecipes.length === 0 && !isLoading && (
        <div className="text-center py-12">
          <iconMap.search className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">No recipes found</h3>
          <p className="text-muted-foreground">
            Try adjusting your search terms or filters
          </p>
        </div>
      )}
    </div>
  );
}