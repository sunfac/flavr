import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import RecipeCard from '@/components/RecipeCard';
import { Button } from '@/components/ui/button';
import { ArrowLeft, LogIn } from 'lucide-react';

interface TempRecipeData {
  meta: {
    title: string;
    description: string;
    cookTime: number;
    difficulty: string;
    cuisine: string;
    image?: string;
  };
  ingredients: Array<{ id: string; text: string; checked: boolean }>;
  steps: Array<{ id: string; title: string; description: string; completed: boolean }>;
  servings: number;
}

export default function TempRecipe() {
  const [, setLocation] = useLocation();
  const [recipeData, setRecipeData] = useState<TempRecipeData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      // Get recipe data from URL parameters
      const urlParams = new URLSearchParams(window.location.search);
      const dataParam = urlParams.get('data');
      
      if (dataParam) {
        const parsedData = JSON.parse(decodeURIComponent(dataParam));
        setRecipeData(parsedData);
      } else {
        setError('No recipe data found');
      }
    } catch (err) {
      console.error('Error parsing recipe data:', err);
      setError('Invalid recipe data');
    }
  }, []);

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Recipe Not Found</h1>
          <p className="text-slate-400 mb-6">{error}</p>
          <Button onClick={() => setLocation('/')} className="bg-orange-500 hover:bg-orange-600">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
        </div>
      </div>
    );
  }

  if (!recipeData) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p>Loading recipe...</p>
        </div>
      </div>
    );
  }

  // Transform the data to match RecipeCard expected format
  const recipe = {
    id: 'temp-' + Date.now(),
    title: recipeData.meta.title,
    description: recipeData.meta.description,
    cookTime: recipeData.meta.cookTime,
    difficulty: recipeData.meta.difficulty,
    cuisine: recipeData.meta.cuisine,
    image: recipeData.meta.image,
    servings: recipeData.servings,
    ingredients: recipeData.ingredients.map(ing => ing.text),
    instructions: recipeData.steps.map(step => step.description),
    tips: '',
    createdAt: new Date().toISOString(),
    userId: null
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Header with temporary recipe notice */}
      <div className="bg-gradient-to-r from-orange-600/20 to-red-600/20 border-b border-orange-500/30">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLocation('/')}
                className="text-orange-300 hover:text-orange-200 hover:bg-orange-500/10 p-2"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <div>
                <p className="text-sm font-medium text-orange-200">Temporary Recipe View</p>
                <p className="text-xs text-orange-300/80">Sign up to save this recipe permanently</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => setLocation('/signup')}
                className="bg-orange-500 hover:bg-orange-600 text-white"
              >
                <LogIn className="w-4 h-4 mr-2" />
                Sign Up to Save
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Recipe Card */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        <RecipeCard 
          recipe={recipe}
        />
      </div>
    </div>
  );
}