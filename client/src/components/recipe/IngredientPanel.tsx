import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { RefreshCw, Loader2, MessageCircle, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { animations } from '@/styles/tokens';

// Common ingredients that might have sub-recipes
const SUB_RECIPE_INGREDIENTS = [
  'chilli drizzle', 'chili drizzle', 'harissa', 'pesto', 'chimichurri',
  'tamarind chutney', 'mint chutney', 'salsa verde', 'tahini sauce',
  'sriracha mayo', 'garlic aioli', 'herb oil', 'compound butter',
  'spice mix', 'spice blend', 'curry paste', 'marinade'
];

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
  
  // Fallback to common ingredient detection
  const foundSubRecipe = SUB_RECIPE_INGREDIENTS.find(subRecipe => 
    lowerText.includes(subRecipe)
  );
  
  return {
    hasSubRecipe: !!foundSubRecipe,
    subRecipe: foundSubRecipe
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
  className?: string;
}

export default function IngredientPanel({ 
  ingredients, 
  onSubstitute, 
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
  onSubstitute 
}: { 
  ingredient: ScaledIngredient; 
  onSubstitute: (id: string, currentIngredient: string) => void; 
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
          if (subRecipeInfo.hasSubRecipe) {
            const questionText = subRecipeInfo.pageReference 
              ? `Show me the recipe for ${subRecipeInfo.subRecipe} from the cookbook photos`
              : `How to make ${subRecipeInfo.subRecipe}?`;
            
            return (
              <button 
                className="ml-2 inline-flex items-center gap-1 text-xs text-orange-400 hover:text-orange-300 underline transition-colors"
                onClick={() => onSubstitute(ingredient.id, questionText)}
                title={subRecipeInfo.pageReference ? `Referenced on ${subRecipeInfo.pageReference}` : 'Get recipe instructions'}
              >
                <ExternalLink className="w-3 h-3" />
                {subRecipeInfo.pageReference ? 'Cookbook Recipe' : 'Recipe'}
              </button>
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
  onSubstitute 
}: { 
  ingredient: ScaledIngredient; 
  onSubstitute: (id: string, currentIngredient: string) => void; 
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
          if (subRecipeInfo.hasSubRecipe) {
            const questionText = subRecipeInfo.pageReference 
              ? `Show me the recipe for ${subRecipeInfo.subRecipe} from the cookbook photos`
              : `How to make ${subRecipeInfo.subRecipe}?`;
              
            return (
              <button 
                className="block mt-1 text-xs text-orange-400 hover:text-orange-300 underline transition-colors"
                onClick={() => onSubstitute(ingredient.id, questionText)}
              >
                {subRecipeInfo.pageReference ? 'Cookbook Recipe' : 'Get Recipe'}
              </button>
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

