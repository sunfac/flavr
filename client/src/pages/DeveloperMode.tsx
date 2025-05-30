import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { iconMap } from "@/lib/iconMap";
import { format } from "date-fns";

export default function DeveloperMode() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRecipe, setSelectedRecipe] = useState<any>(null);

  // Fetch all recipes
  const { data: recipes = [], isLoading, refetch } = useQuery({
    queryKey: ['/api/developer/recipes'],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/developer/recipes");
      return response.json();
    }
  });

  // Delete recipe mutation
  const deleteRecipeMutation = useMutation({
    mutationFn: async (recipeId: string) => {
      await apiRequest("DELETE", `/api/developer/recipes/${recipeId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/developer/recipes'] });
      toast({
        title: "Recipe deleted",
        description: "Recipe has been removed from the database",
      });
    },
    onError: () => {
      toast({
        title: "Delete failed",
        description: "Could not delete recipe",
        variant: "destructive",
      });
    }
  });

  // Filter recipes based on search term
  const filteredRecipes = recipes.filter((recipe: any) =>
    recipe.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    recipe.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    recipe.mode?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleViewRecipe = (recipe: any) => {
    setSelectedRecipe(recipe);
  };

  const handleDeleteRecipe = (recipeId: string) => {
    if (confirm("Are you sure you want to delete this recipe? This action cannot be undone.")) {
      deleteRecipeMutation.mutate(recipeId);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 p-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            {React.createElement(iconMap.database, { className="w-8 h-8 text-orange-600" / })}
            <h1 className="text-3xl font-bold text-gray-900">Developer Mode</h1>
            <Badge variant="destructive" className="ml-auto">DEV ONLY</Badge>
          </div>
          <p className="text-gray-600">Recipe database management and analytics</p>
        </div>

        {/* Search and Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="md:col-span-2">
            <CardContent className="p-4">
              <div className="relative">
                {React.createElement(iconMap.search, { className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" / })}
                <Input
                  placeholder="Search recipes by title, description, or mode..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-orange-600">{recipes.length}</div>
              <div className="text-sm text-gray-600">Total Recipes</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-600">{filteredRecipes.length}</div>
              <div className="text-sm text-gray-600">Filtered Results</div>
            </CardContent>
          </Card>
        </div>

        {/* Recipe Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {React.createElement(iconMap.database, { className="w-5 h-5" / })}
              Recipe Database
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => refetch()}
                className="ml-auto"
              >
                Refresh
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-4 font-semibold">ID</th>
                    <th className="text-left p-4 font-semibold">Title</th>
                    <th className="text-left p-4 font-semibold">Mode</th>
                    <th className="text-left p-4 font-semibold">User</th>
                    <th className="text-left p-4 font-semibold">Created</th>
                    <th className="text-left p-4 font-semibold">Meta</th>
                    <th className="text-left p-4 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRecipes.map((recipe: any) => (
                    <tr key={recipe.id} className="border-b hover:bg-gray-50">
                      <td className="p-4 text-sm font-mono">{recipe.id}</td>
                      <td className="p-4">
                        <div className="font-medium">{recipe.title}</div>
                        <div className="text-sm text-gray-500 truncate max-w-xs">
                          {recipe.description}
                        </div>
                      </td>
                      <td className="p-4">
                        <Badge 
                          variant={recipe.mode === 'chef' ? 'default' : recipe.mode === 'shopping' ? 'secondary' : 'outline'}
                        >
                          {recipe.mode || 'unknown'}
                        </Badge>
                      </td>
                      <td className="p-4 text-sm">
                        {recipe.userId ? `User ${recipe.userId}` : 'Anonymous'}
                      </td>
                      <td className="p-4 text-sm">
                        {recipe.createdAt ? format(new Date(recipe.createdAt), 'MMM dd, yyyy') : 'Unknown'}
                      </td>
                      <td className="p-4">
                        <div className="flex gap-2 text-xs">
                          {recipe.cookTime && (
                            <div className="flex items-center gap-1">
                              {React.createElement(iconMap.clock, { className="w-3 h-3" / })}
                              {recipe.cookTime}m
                            </div>
                          )}
                          {recipe.servings && (
                            <div className="flex items-center gap-1">
                              {React.createElement(iconMap.users, { className="w-3 h-3" / })}
                              {recipe.servings}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewRecipe(recipe)}
                            className="w-8 h-8 p-0"
                          >
                            {React.createElement(iconMap.eye, { className="w-4 h-4" / })}
                          </Button>
                          {recipe.shareId && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => window.open(`/share/${recipe.shareId}`, '_blank')}
                              className="w-8 h-8 p-0"
                            >
                              {React.createElement(iconMap.externalLink, { className="w-4 h-4" / })}
                            </Button>
                          )}
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeleteRecipe(recipe.id)}
                            className="w-8 h-8 p-0"
                            disabled={deleteRecipeMutation.isPending}
                          >
                            {React.createElement(iconMap.trash2, { className="w-4 h-4" / })}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filteredRecipes.length === 0 && (
                <div className="text-center py-12">
                  {React.createElement(iconMap.database, { className="w-16 h-16 text-gray-300 mx-auto mb-4" / })}
                  <p className="text-gray-500">
                    {searchTerm ? "No recipes match your search" : "No recipes found"}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recipe Detail Modal */}
        {selectedRecipe && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <Card className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{selectedRecipe.title}</CardTitle>
                  <Button
                    variant="ghost"
                    onClick={() => setSelectedRecipe(null)}
                    className="w-8 h-8 p-0"
                  >
                    ×
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">Description</h4>
                    <p className="text-gray-600">{selectedRecipe.description}</p>
                  </div>

                  {selectedRecipe.ingredients && (
                    <div>
                      <h4 className="font-semibold mb-2">Ingredients</h4>
                      <ul className="list-disc pl-5 space-y-1">
                        {selectedRecipe.ingredients.map((ingredient: string, index: number) => (
                          <li key={index} className="text-gray-600">{ingredient}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {selectedRecipe.instructions && (
                    <div>
                      <h4 className="font-semibold mb-2">Instructions</h4>
                      <ol className="list-decimal pl-5 space-y-2">
                        {selectedRecipe.instructions.map((instruction: string, index: number) => (
                          <li key={index} className="text-gray-600">{instruction}</li>
                        ))}
                      </ol>
                    </div>
                  )}

                  {selectedRecipe.tips && (
                    <div>
                      <h4 className="font-semibold mb-2">Tips</h4>
                      <p className="text-gray-600 italic">{selectedRecipe.tips}</p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                    <div>
                      <span className="font-semibold">Recipe ID:</span> {selectedRecipe.id}
                    </div>
                    <div>
                      <span className="font-semibold">Mode:</span> {selectedRecipe.mode || 'Unknown'}
                    </div>
                    <div>
                      <span className="font-semibold">Cook Time:</span> {selectedRecipe.cookTime || 'N/A'}
                    </div>
                    <div>
                      <span className="font-semibold">Servings:</span> {selectedRecipe.servings || 'N/A'}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}