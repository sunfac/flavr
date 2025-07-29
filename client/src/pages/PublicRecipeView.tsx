import React from 'react';
import { useParams } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Users, Clock, ChefHat, Share2, Copy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import GlobalNavigation from '../components/GlobalNavigation';
import LoadingPage from './LoadingPage';

interface PublicRecipeViewProps {
  shareId: string;
}

interface SharedRecipe {
  id: number;
  title: string;
  description: string;
  cuisine?: string;
  difficulty: string;
  cookTime: number;
  servings: number;
  ingredients: string[];
  instructions: string[];
  tips?: string;
  imageUrl?: string;
  shareId: string;
  isShared: boolean;
}

export default function PublicRecipeView() {
  const { shareId } = useParams<{ shareId: string }>();
  const { toast } = useToast();

  const { data: recipe, isLoading, error } = useQuery({
    queryKey: ['/api/recipes/shared', shareId],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/recipes/shared/${shareId}`);
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Recipe not found or no longer shared');
        }
        throw new Error('Failed to load recipe');
      }
      return response.json() as Promise<SharedRecipe>;
    },
    enabled: !!shareId
  });

  const handleCopyLink = async () => {
    const currentUrl = window.location.href;
    try {
      await navigator.clipboard.writeText(currentUrl);
      toast({
        title: "Link copied!",
        description: "Recipe link copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Copy failed",
        description: "Could not copy link to clipboard",
        variant: "destructive",
      });
    }
  };

  const handleCopyRecipe = async () => {
    if (!recipe) return;
    
    const ingredientsList = recipe.ingredients.map((ing, idx) => `${idx + 1}. ${ing}`).join('\n');
    const instructionsList = recipe.instructions.map((inst, idx) => `${idx + 1}. ${inst}`).join('\n');
    
    const fullText = `${recipe.title}

${recipe.description}

Servings: ${recipe.servings}
Cook Time: ${recipe.cookTime} min
Difficulty: ${recipe.difficulty}
${recipe.cuisine ? `Cuisine: ${recipe.cuisine}` : ''}

INGREDIENTS:
${ingredientsList}

INSTRUCTIONS:
${instructionsList}

${recipe.tips ? `\nTIPS:\n${recipe.tips}\n` : ''}
Created with Flavr AI
Link: ${window.location.href}`;
    
    try {
      await navigator.clipboard.writeText(fullText);
      toast({
        title: "Recipe copied!",
        description: "Perfect for pasting into Apple Notes or anywhere",
      });
    } catch (error) {
      toast({
        title: "Copy failed",
        description: "Could not copy recipe",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return <LoadingPage title="Loading shared recipe..." subtitle="Please wait while we fetch this delicious recipe" />;
  }

  if (error || !recipe) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <GlobalNavigation />
        <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
          <div className="text-center p-8">
            <h1 className="text-2xl font-bold text-white mb-4">Recipe Not Found</h1>
            <p className="text-slate-300 mb-6">
              This recipe may have been removed or is no longer shared.
            </p>
            <Button 
              onClick={() => window.location.href = '/'}
              className="bg-orange-500 hover:bg-orange-600 text-white"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Go to Flavr
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <GlobalNavigation />
      
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <img src="/generated-icon.png" alt="Flavr" className="w-8 h-8" />
            <span className="text-orange-400 font-semibold">Shared on Flavr</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
            {recipe.title}
          </h1>
          {recipe.description && (
            <p className="text-xl text-slate-300 leading-relaxed max-w-2xl mx-auto">
              {recipe.description}
            </p>
          )}
        </div>

        {/* Recipe Image */}
        {recipe.imageUrl && (
          <div className="relative mb-8 rounded-2xl overflow-hidden aspect-video md:aspect-[16/10]">
            <img 
              src={recipe.imageUrl} 
              alt={recipe.title}
              className="w-full h-full object-cover"
            />
            
            {/* Share Actions Overlay */}
            <div className="absolute top-4 right-4 flex gap-2">
              <Button
                onClick={handleCopyLink}
                size="sm"
                className="bg-black/40 hover:bg-black/60 text-white border-white/50 backdrop-blur-md"
              >
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </Button>
              <Button
                onClick={handleCopyRecipe}
                size="sm"
                className="bg-green-500/80 hover:bg-green-600/90 text-white border-green-400/50 backdrop-blur-md"
              >
                <Copy className="w-4 h-4 mr-2" />
                Copy Recipe
              </Button>
            </div>
          </div>
        )}

        {/* Recipe Details */}
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl overflow-hidden">
          {/* Stats */}
          <div className="p-6 border-b border-slate-700/50">
            <div className="flex items-center gap-4 flex-wrap justify-center">
              <Badge className="flex items-center gap-2 px-3 py-2 bg-slate-700/50 border-slate-600 text-slate-200">
                <Users className="w-4 h-4" />
                Serves {recipe.servings}
              </Badge>
              <Badge className="flex items-center gap-2 px-3 py-2 bg-slate-700/50 border-slate-600 text-slate-200">
                <Clock className="w-4 h-4" />
                {recipe.cookTime} min
              </Badge>
              <Badge className="flex items-center gap-2 px-3 py-2 bg-slate-700/50 border-slate-600 text-slate-200">
                <ChefHat className="w-4 h-4" />
                {recipe.difficulty}
              </Badge>
              {recipe.cuisine && (
                <Badge className="px-3 py-2 bg-orange-500/20 border-orange-400/30 text-orange-200">
                  {recipe.cuisine}
                </Badge>
              )}
            </div>
          </div>

          {/* Ingredients */}
          <div className="p-6 border-b border-slate-700/50">
            <h2 className="text-xl font-semibold text-white mb-4">Ingredients</h2>
            <div className="grid gap-3">
              {recipe.ingredients.map((ingredient, index) => (
                <div key={index} className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-orange-500/20 border border-orange-400/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-medium text-orange-200">{index + 1}</span>
                  </div>
                  <span className="text-slate-200">{ingredient}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Instructions */}
          <div className="p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Instructions</h2>
            <div className="space-y-4">
              {recipe.instructions.map((instruction, index) => (
                <div key={index} className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-sm font-bold text-white">{index + 1}</span>
                  </div>
                  <p className="text-slate-200 leading-relaxed pt-1">{instruction}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Tips */}
          {recipe.tips && (
            <div className="p-6 bg-orange-500/10 border-t border-orange-400/20">
              <h3 className="text-lg font-semibold text-orange-200 mb-3">Chef's Tips</h3>
              <p className="text-slate-200 leading-relaxed">{recipe.tips}</p>
            </div>
          )}
        </div>

        {/* CTA */}
        <div className="text-center mt-8 p-6 bg-gradient-to-r from-orange-500/10 to-orange-600/10 rounded-2xl border border-orange-400/20">
          <h3 className="text-xl font-semibold text-white mb-2">Love this recipe?</h3>
          <p className="text-slate-300 mb-4">Create your own personalized recipes with Flavr AI</p>
          <Button 
            onClick={() => window.location.href = '/'}
            className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 text-lg"
          >
            Try Flavr Free
          </Button>
        </div>
      </div>
    </div>
  );
}