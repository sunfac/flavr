import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { RefreshCw, Loader2, MessageCircle, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SubRecipeButton } from './SubRecipeButton';
import { animations } from '@/styles/tokens';

function extractIngredientName(ingredientText: string): string {
  // Remove common measurements and quantities
  const cleanText = ingredientText
    .replace(/^\d+[\s\-]*(cups?|tbsp|tsp|tablespoons?|teaspoons?|oz|ounces?|lbs?|pounds?|g|grams?|kg|kilograms?|ml|milliliters?|l|liters?|pints?|quarts?|gallons?)\s*/i, '')
    .replace(/^\d+[\s\-]*x\s*/i, '') // Remove "2x" style multipliers
    .replace(/^a\s+pinch\s+of\s*/i, '') // Remove "a pinch of"
    .replace(/^a\s+handful\s+of\s*/i, '') // Remove "a handful of"
    .replace(/^some\s*/i, '') // Remove "some"
    .replace(/^fresh\s*/i, '') // Remove "fresh" prefix
    .replace(/^dried\s*/i, '') // Remove "dried" prefix
    .replace(/^ground\s*/i, '') // Remove "ground" prefix
    .replace(/^\d+\/\d+\s*/g, '') // Remove fractions like "1/2"
    .replace(/^\d+\.\d+\s*/g, '') // Remove decimals like "2.5"
    .replace(/^\d+\s*/g, '') // Remove standalone numbers
    .replace(/^(large|medium|small)\s*/i, '') // Remove size descriptors
    .replace(/\s*\([^)]*\)$/, '') // Remove anything in parentheses at the end
    .trim();
  
  return cleanText;
}

function detectSubRecipe(ingredientText: string): { hasSubRecipe: boolean; subRecipe?: string; pageReference?: string } {
  const lowerText = ingredientText.toLowerCase();
  
  // First check for page references in brackets
  const pageRefPatterns = [
    /\(see page (\d+)\)/i,
    /\(p\.?\s*(\d+)\)/i, 
    /\(page (\d+)\)/i,
    /\(turn to page (\d+)\)/i,
    /\(recipe on page (\d+)\)/i
  ];
  
  for (const pattern of pageRefPatterns) {
    const match = ingredientText.match(pattern);
    if (match) {
      // Extract the ingredient name before the page reference
      const ingredientName = ingredientText.replace(pattern, '').trim();
      return {
        hasSubRecipe: true,
        subRecipe: ingredientName,
        pageReference: `page ${match[1]}`
      };
    }
  }
  
  // Sub-recipe buttons should only appear for ingredients with page references
  // This feature is specifically for image-to-recipe functionality where cookbook pages reference other recipes
  
  return {
    hasSubRecipe: false
  };
}

interface ScaledIngredient {
  id: string;
  text: string;
  isSubstituted?: boolean;
  isLoading?: boolean;
  hasSubRecipe?: boolean;
  subRecipe?: string;
}

interface IngredientPanelProps {
  ingredients: ScaledIngredient[];
  onSubstitute: (id: string, currentIngredient: string) => void;
  onSubRecipe?: (ingredientText: string, subRecipeName: string) => void;
  recipeId?: number; // Added for sub-recipe generation
  className?: string;
}

export default function IngredientPanel({ 
  ingredients, 
  onSubstitute, 
  onSubRecipe,
  recipeId,
  className = '' 
}: IngredientPanelProps) {
  const [showScrollHint, setShowScrollHint] = useState(true);

  // Hide scroll hint after 1.5 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowScrollHint(false);
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      {/* Desktop: Fixed Sidebar */}
      <div className={`hidden md:block ${className}`}>
        <div className="h-full overflow-y-auto bg-slate-800/50 rounded-xl p-6" style={{ scrollbarGutter: 'stable' }}>
          {/* Chat Feature Guide */}
          <motion.div
            className="mb-4"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="bg-gradient-to-r from-orange-500/20 to-orange-600/20 border border-orange-500/40 rounded-lg p-3 backdrop-blur-sm">
              <div className="flex items-center gap-2 mb-1">
                <MessageCircle className="w-4 h-4 text-orange-400" />
                <span className="text-orange-200 font-medium text-xs">Ask Zest to customize!</span>
              </div>
              <p className="text-orange-100/80 text-xs leading-relaxed">
                Dietary requirements • Servings • Spice level • Side dishes • Cooking method • Ingredient swaps • and more
              </p>
            </div>
          </motion.div>

          <h3 className="font-semibold text-white mb-4" style={{ fontSize: 'var(--step-1)' }}>
            Ingredients ({ingredients.length})
          </h3>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {ingredients.map((ingredient) => (
              <IngredientSubstituteItem
                key={ingredient.id}
                ingredient={ingredient}
                onSubstitute={onSubstitute}
                onSubRecipe={onSubRecipe}
                recipeId={recipeId}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Mobile: Compact Card Layout */}
      <div className={`md:hidden ${className}`}>
        <div className="p-4 bg-slate-800/40 border-b border-slate-700/50 mb-0">
          {/* Mobile Chat Feature Guide */}
          <motion.div
            className="mb-4"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="bg-gradient-to-r from-orange-500/20 to-orange-600/20 border border-orange-500/40 rounded-lg p-2.5 backdrop-blur-sm">
              <div className="flex items-center gap-2 mb-1">
                <MessageCircle className="w-3.5 h-3.5 text-orange-400" />
                <span className="text-orange-200 font-medium text-xs">Chat to customize</span>
              </div>
              <p className="text-orange-100/80 text-xs leading-relaxed">
                Dietary requirements • Servings • Spice level • Side dishes • Cooking method • Ingredient swaps • and more
              </p>
            </div>
          </motion.div>

          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-white" style={{ fontSize: 'var(--step-0)' }}>
              Ingredients
            </h3>
            <Badge variant="secondary" className="bg-slate-700/50 text-slate-300">
              {ingredients.length} items
            </Badge>
          </div>
          
          <div className="grid grid-cols-2 gap-2">
            {ingredients.map((ingredient) => (
              <IngredientMobileItem
                key={ingredient.id}
                ingredient={ingredient}
                onSubstitute={onSubstitute}
                onSubRecipe={onSubRecipe}
                recipeId={recipeId}
              />
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

function IngredientSubstituteItem({ 
  ingredient, 
  onSubstitute,
  onSubRecipe,
  recipeId 
}: { 
  ingredient: ScaledIngredient; 
  onSubstitute: (id: string, currentIngredient: string) => void; 
  onSubRecipe?: (ingredientText: string, subRecipeName: string) => void;
  recipeId?: number;
}) {
  return (
    <motion.div
      className="flex items-center gap-3 group"
      whileHover={{ scale: 1.01 }}
      transition={{ duration: 0.15 }}
    >
      <div className={`flex-1 text-sm transition-all duration-300 ${
        ingredient.isSubstituted 
          ? 'text-orange-300 font-medium' 
          : 'text-slate-200'
      }`}>
        {ingredient.text}
        {(() => {
          const subRecipeInfo = detectSubRecipe(ingredient.text);
          if (subRecipeInfo.hasSubRecipe && recipeId && subRecipeInfo.subRecipe) {
            return (
              <SubRecipeButton
                recipeId={recipeId}
                ingredientText={ingredient.text}
                subRecipeName={subRecipeInfo.subRecipe}
                pageReference={subRecipeInfo.pageReference}
                className="ml-2 inline-block"
              />
            );
          }
          return null;
        })()}
      </div>
      
      <Button
        size="sm"
        variant="ghost"
        onClick={() => onSubstitute(ingredient.id, ingredient.text)}
        disabled={ingredient.isLoading}
        className="h-7 px-2 bg-slate-700/50 hover:bg-orange-500/20 border border-slate-600 hover:border-orange-400/50 transition-all"
      >
        {ingredient.isLoading ? (
          <Loader2 className="w-3 h-3 animate-spin" />
        ) : (
          <>
            <RefreshCw className="w-3 h-3 mr-1" />
            <span className="text-xs">Substitute</span>
          </>
        )}
      </Button>
    </motion.div>
  );
}

function IngredientMobileItem({ 
  ingredient, 
  onSubstitute,
  onSubRecipe,
  recipeId 
}: { 
  ingredient: ScaledIngredient; 
  onSubstitute: (id: string, currentIngredient: string) => void; 
  onSubRecipe?: (ingredientText: string, subRecipeName: string) => void;
  recipeId?: number;
}) {
  return (
    <motion.div
      className="flex items-center gap-2 p-2 bg-slate-700/30 rounded-lg border border-slate-600/30 hover:border-orange-400/40 transition-all duration-200"
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      transition={{ duration: 0.1 }}
    >
      <div className={`text-xs flex-1 transition-all duration-300 ${
        ingredient.isSubstituted 
          ? 'text-orange-300 font-medium' 
          : 'text-slate-100'
      }`}>
        {ingredient.text}
        {(() => {
          const subRecipeInfo = detectSubRecipe(ingredient.text);
          if (subRecipeInfo.hasSubRecipe && recipeId && subRecipeInfo.subRecipe) {
            return (
              <SubRecipeButton
                recipeId={recipeId}
                ingredientText={ingredient.text}
                subRecipeName={subRecipeInfo.subRecipe}
                pageReference={subRecipeInfo.pageReference}
                className="block mt-1"
              />
            );
          }
          return null;
        })()}
      </div>
      
      <Button
        size="sm"
        variant="ghost"
        onClick={() => onSubstitute(ingredient.id, ingredient.text)}
        disabled={ingredient.isLoading}
        className="h-6 px-1.5 bg-slate-700/50 hover:bg-orange-500/20 border border-slate-600 hover:border-orange-400/50 transition-all"
      >
        {ingredient.isLoading ? (
          <Loader2 className="w-3 h-3 animate-spin" />
        ) : (
          <RefreshCw className="w-3 h-3" />
        )}
      </Button>
    </motion.div>
  );
}

