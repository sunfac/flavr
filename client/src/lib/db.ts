// Client-side database utilities for local storage and caching

export interface LocalRecipe {
  id: string;
  title: string;
  description: string;
  ingredients: string[];
  instructions: string[];
  mode: string;
  createdAt: string;
}

export interface LocalUser {
  id: number;
  username: string;
  email: string;
  isPlus: boolean;
  recipesThisMonth: number;
}

class LocalDB {
  private readonly RECIPES_KEY = "flavr_recipes";
  private readonly USER_KEY = "flavr_user";
  private readonly PREFERENCES_KEY = "flavr_preferences";

  // Recipe storage
  saveRecipe(recipe: LocalRecipe): void {
    const recipes = this.getRecipes();
    recipes.push(recipe);
    localStorage.setItem(this.RECIPES_KEY, JSON.stringify(recipes));
  }

  getRecipes(): LocalRecipe[] {
    const stored = localStorage.getItem(this.RECIPES_KEY);
    return stored ? JSON.parse(stored) : [];
  }

  getRecipe(id: string): LocalRecipe | null {
    const recipes = this.getRecipes();
    return recipes.find(r => r.id === id) || null;
  }

  deleteRecipe(id: string): void {
    const recipes = this.getRecipes().filter(r => r.id !== id);
    localStorage.setItem(this.RECIPES_KEY, JSON.stringify(recipes));
  }

  // User preferences
  saveUserPreferences(preferences: any): void {
    localStorage.setItem(this.PREFERENCES_KEY, JSON.stringify(preferences));
  }

  getUserPreferences(): any {
    const stored = localStorage.getItem(this.PREFERENCES_KEY);
    return stored ? JSON.parse(stored) : {
      favoriteMode: "shopping",
      dietaryRestrictions: [],
      defaultCookingTime: "30",
      preferredCuisines: [],
    };
  }

  // Cache management
  clearCache(): void {
    localStorage.removeItem(this.RECIPES_KEY);
    localStorage.removeItem(this.PREFERENCES_KEY);
  }

  // Offline recipe storage
  cacheRecipeForOffline(recipe: any): void {
    const offlineRecipes = this.getOfflineRecipes();
    offlineRecipes.push({
      ...recipe,
      cachedAt: new Date().toISOString(),
    });
    localStorage.setItem("flavr_offline_recipes", JSON.stringify(offlineRecipes));
  }

  getOfflineRecipes(): any[] {
    const stored = localStorage.getItem("flavr_offline_recipes");
    return stored ? JSON.parse(stored) : [];
  }

  // Search functionality
  searchRecipes(query: string): LocalRecipe[] {
    const recipes = this.getRecipes();
    const lowercaseQuery = query.toLowerCase();
    
    return recipes.filter(recipe => 
      recipe.title.toLowerCase().includes(lowercaseQuery) ||
      recipe.description.toLowerCase().includes(lowercaseQuery) ||
      recipe.ingredients.some(ingredient => 
        ingredient.toLowerCase().includes(lowercaseQuery)
      )
    );
  }

  // Statistics
  getRecipeStats(): {
    totalRecipes: number;
    recipesByMode: Record<string, number>;
    recentRecipes: LocalRecipe[];
  } {
    const recipes = this.getRecipes();
    const recipesByMode = recipes.reduce((acc, recipe) => {
      acc[recipe.mode] = (acc[recipe.mode] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const recentRecipes = recipes
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);

    return {
      totalRecipes: recipes.length,
      recipesByMode,
      recentRecipes,
    };
  }
}

export const localDB = new LocalDB();
export default localDB;
