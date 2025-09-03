import { useState } from 'react';
import { motion } from 'framer-motion';
import { ExternalLink, Loader2, ChefHat } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { useLocation } from 'wouter';

interface SubRecipeButtonProps {
  recipeId: number;
  ingredientText: string;
  subRecipeName: string;
  pageReference?: string;
  className?: string;
}

export function SubRecipeButton({ 
  recipeId, 
  ingredientText, 
  subRecipeName, 
  pageReference,
  className = '' 
}: SubRecipeButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const handleGenerateSubRecipe = async () => {
    try {
      setIsGenerating(true);
      
      console.log('🍽️ Generating sub-recipe for:', { ingredientText, subRecipeName });
      
      const response = await apiRequest('POST', `/api/recipes/${recipeId}/sub-recipes`, {
        ingredientName: subRecipeName
      });
      
      const data = await response.json();
      
      if (data.subRecipe) {
        toast({
          title: "Sub-recipe created!",
          description: `${data.subRecipe.title} is ready. Taking you there now...`,
        });
        
        // Navigate to the generated sub-recipe
        setTimeout(() => {
          setLocation(`/recipe/${data.subRecipe.id}`);
        }, 1000);
      } else {
        throw new Error('No sub-recipe data received');
      }
      
    } catch (error: any) {
      console.error('Error generating sub-recipe:', error);
      toast({
        title: "Generation failed",
        description: error.message || "Failed to generate sub-recipe. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={className}
    >
      <Button
        size="sm"
        variant="ghost"
        onClick={handleGenerateSubRecipe}
        disabled={isGenerating}
        className="h-auto p-2 bg-gradient-to-r from-orange-500/10 to-orange-600/10 hover:from-orange-500/20 hover:to-orange-600/20 border border-orange-500/30 hover:border-orange-400/50 transition-all text-orange-300 hover:text-orange-200"
        title={pageReference ? `Recipe referenced on ${pageReference}` : `Generate homemade ${subRecipeName} recipe`}
      >
        <div className="flex items-center gap-1.5">
          {isGenerating ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <ChefHat className="w-3 h-3" />
          )}
          <span className="text-xs font-medium">
            {isGenerating ? 'Creating...' : (
              pageReference ? 'Cookbook Recipe' : 'Make it'
            )}
          </span>
          {!isGenerating && <ExternalLink className="w-3 h-3 opacity-70" />}
        </div>
      </Button>
    </motion.div>
  );
}