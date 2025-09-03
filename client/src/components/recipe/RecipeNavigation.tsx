import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, ChefHat, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useLocation } from 'wouter';
import { apiRequest } from '@/lib/queryClient';

interface RecipeNavigationProps {
  recipeId: number;
  className?: string;
}

interface SubRecipe {
  id: number;
  title: string;
  subRecipeFor: string;
}

interface ParentRecipe {
  id: number;
  title: string;
  subRecipeFor?: string;
}

export function RecipeNavigation({ recipeId, className = '' }: RecipeNavigationProps) {
  const [parentRecipe, setParentRecipe] = useState<ParentRecipe | null>(null);
  const [subRecipes, setSubRecipes] = useState<SubRecipe[]>([]);
  const [isSubRecipe, setIsSubRecipe] = useState(false);
  const [loading, setLoading] = useState(true);
  const [, setLocation] = useLocation();

  useEffect(() => {
    const loadNavigationData = async () => {
      try {
        setLoading(true);
        
        // Check if current recipe is a sub-recipe
        const subRecipeResponse = await apiRequest('GET', `/api/recipes/${recipeId}/is-sub-recipe`);
        const subRecipeData = await subRecipeResponse.json();
        
        setIsSubRecipe(subRecipeData.isSubRecipe);
        
        if (subRecipeData.isSubRecipe && subRecipeData.parentRecipeId) {
          // Load parent recipe info
          const parentResponse = await apiRequest('GET', `/api/sub-recipes/${recipeId}/parent`);
          const parentData = await parentResponse.json();
          setParentRecipe(parentData.parentRecipe);
        } else {
          // Load sub-recipes for this main recipe
          const subRecipesResponse = await apiRequest('GET', `/api/recipes/${recipeId}/sub-recipes`);
          const subRecipesData = await subRecipesResponse.json();
          setSubRecipes(subRecipesData.subRecipes || []);
        }
      } catch (error) {
        console.error('Error loading navigation data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadNavigationData();
  }, [recipeId]);

  if (loading) {
    return null; // Don't show anything while loading
  }

  // Don't show navigation if no parent or sub-recipes
  if (!isSubRecipe && subRecipes.length === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`bg-slate-800/50 rounded-xl p-4 border border-slate-700/50 ${className}`}
    >
      {/* Sub-recipe navigation - return to parent */}
      {isSubRecipe && parentRecipe && (
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation(`/recipe/${parentRecipe.id}`)}
            className="h-auto p-2 bg-slate-700/50 hover:bg-orange-500/20 border border-slate-600 hover:border-orange-400/50 transition-all text-slate-200 hover:text-orange-200"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            <div className="text-left">
              <div className="text-xs font-medium">Back to main recipe</div>
              <div className="text-xs opacity-80">{parentRecipe.title}</div>
            </div>
          </Button>
          <Badge variant="secondary" className="bg-orange-500/20 text-orange-300 border border-orange-500/30">
            <ChefHat className="w-3 h-3 mr-1" />
            Sub-recipe
          </Badge>
        </div>
      )}

      {/* Main recipe navigation - show sub-recipes */}
      {!isSubRecipe && subRecipes.length > 0 && (
        <div>
          <h4 className="font-medium text-white mb-3 flex items-center gap-2">
            <ChefHat className="w-4 h-4 text-orange-400" />
            Related Sub-recipes ({subRecipes.length})
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {subRecipes.map((subRecipe) => (
              <motion.div
                key={subRecipe.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setLocation(`/recipe/${subRecipe.id}`)}
                  className="h-auto p-3 w-full bg-slate-700/30 hover:bg-orange-500/10 border border-slate-600/50 hover:border-orange-400/40 transition-all text-left"
                >
                  <div className="flex items-center gap-2 w-full">
                    <ExternalLink className="w-3 h-3 text-orange-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-slate-200 truncate">
                        {subRecipe.title}
                      </div>
                      <div className="text-xs text-slate-400 truncate">
                        For: {subRecipe.subRecipeFor}
                      </div>
                    </div>
                  </div>
                </Button>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}