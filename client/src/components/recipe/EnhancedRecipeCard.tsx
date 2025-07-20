import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Share2, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useScaledIngredients } from '@/hooks/useScaledIngredients';
import { useRecipeStore, recipeActions } from '@/stores/recipeStore';

// Extract duration from instruction text
function extractDuration(instruction: string): number | undefined {
  const text = instruction.toLowerCase();
  
  // Look for time patterns
  const patterns = [
    /(\d+)\s*(?:to\s*)?(\d+)?\s*minutes?/,
    /(\d+)\s*(?:to\s*)?(\d+)?\s*mins?/,
    /(\d+)\s*(?:to\s*)?(\d+)?\s*hours?/,
    /(\d+)\s*(?:to\s*)?(\d+)?\s*hrs?/,
    /(\d+)\s*(?:to\s*)?(\d+)?\s*seconds?/,
    /(\d+)\s*(?:to\s*)?(\d+)?\s*secs?/
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const firstNum = parseInt(match[1]);
      const secondNum = match[2] ? parseInt(match[2]) : firstNum;
      
      // Use the average if it's a range, otherwise use the single value
      const duration = match[2] ? Math.round((firstNum + secondNum) / 2) : firstNum;
      
      // Convert to minutes if needed
      if (text.includes('hour') || text.includes('hr')) {
        return duration * 60;
      } else if (text.includes('second') || text.includes('sec')) {
        return Math.round(duration / 60);
      } else {
        return duration; // Already in minutes
      }
    }
  }
  
  // Default durations based on common cooking terms
  if (text.includes('bring to a boil') || text.includes('boil')) return 5;
  if (text.includes('simmer')) return 15;
  if (text.includes('bake') || text.includes('roast')) return 30;
  if (text.includes('sauté') || text.includes('fry')) return 8;
  if (text.includes('marinate')) return 30;
  if (text.includes('rest') || text.includes('cool')) return 10;
  if (text.includes('preheat')) return 10;
  
  return undefined;
}
import HeaderSection from './HeaderSection';
import IngredientPanel from './IngredientPanel';
import StepStack from './StepStack';
import ProgressBar from './ProgressBar';
import FooterSection from './FooterSection';
import { animations, layout } from '@/styles/tokens';

interface Recipe {
  id: string;
  title: string;
  description?: string;
  cookTime: number;
  servings: number;
  difficulty: string;
  cuisine?: string;
  image?: string;
  ingredients: string[];
  instructions: string[];
  tips?: string;
  shareId?: string;
  isShared?: boolean;
}

interface EnhancedRecipeCardProps {
  recipe: Recipe;
  onBack?: () => void;
  onShare?: () => void;
  className?: string;
}

function EnhancedRecipeCard({ 
  recipe, 
  onBack,
  onShare,
  className = '' 
}: EnhancedRecipeCardProps) {

  const [currentStep, setCurrentStep] = useState(0);
  const [key, setKey] = useState(0); // Force re-render key
  const [ingredientStates, setIngredientStates] = useState<Record<string, boolean>>({});
  const { toast } = useToast();
  
  const recipeStore = useRecipeStore();
  
  // Listen for recipe updates from Zest chatbot and auto-scroll to top
  useEffect(() => {
    const handleRecipeUpdate = (event: CustomEvent) => {
      console.log('🎯 EnhancedRecipeCard received recipe update:', event.detail);
      
      // Update the recipe store with new data if available
      if (event.detail && event.detail.recipe) {
        const updatedRecipe = event.detail.recipe;
        recipeActions.replaceRecipe({
          id: recipe.id,
          servings: updatedRecipe.servings || recipe.servings,
          ingredients: updatedRecipe.ingredients.map((text: string, index: number) => ({
            id: `ingredient-${index}`,
            text,
            checked: false
          })),
          steps: updatedRecipe.instructions.map((instruction: string, index: number) => ({
            id: `step-${index}`,
            title: `Step ${index + 1}`,
            description: instruction
          })),
          meta: {
            title: updatedRecipe.title,
            servings: updatedRecipe.servings || recipe.servings,
            cookTime: updatedRecipe.cookTime || recipe.cookTime,
            difficulty: updatedRecipe.difficulty || recipe.difficulty,
            cuisine: updatedRecipe.cuisine || recipe.cuisine,
            description: updatedRecipe.description || recipe.description,
            image: updatedRecipe.image || updatedRecipe.imageUrl || recipe.image
          },
          currentStep: 0,
          completedSteps: [],
          lastUpdated: Date.now()
        });
      }
      
      // Force component re-render
      setKey(prev => prev + 1);
      
      // Scroll to absolute top of page after update
      setTimeout(() => {
        window.scrollTo(0, 0);
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
      }, 300);
      
      toast({
        title: "Recipe updated!",
        description: `${updatedRecipe.title || "Your recipe"} has been modified`,
      });
    };
    
    window.addEventListener('recipe-updated', handleRecipeUpdate as EventListener);
    return () => window.removeEventListener('recipe-updated', handleRecipeUpdate as EventListener);
  }, [toast, recipe.id]);

  // Sync servings from store without causing infinite loops
  const activeServings = useMemo(() => {
    const isStoreActive = recipeStore.id === recipe.id && recipeStore.servings > 0;
    return isStoreActive ? recipeStore.servings : recipe.servings;
  }, [recipeStore.id, recipe.id, recipeStore.servings, recipe.servings]);

  // Use updated data from store if available, otherwise fall back to original
  const activeIngredients = useMemo(() => {
    const isStoreActive = recipeStore.id === recipe.id && recipeStore.ingredients.length > 0;
    if (isStoreActive) {
      return recipeStore.ingredients.map(ing => ing.text);
    }
    return recipe.ingredients;
  }, [recipeStore.id, recipe.id, recipeStore.ingredients, recipe.ingredients]);

  const activeInstructions = useMemo(() => {
    const isStoreActive = recipeStore.id === recipe.id && recipeStore.steps.length > 0;
    if (isStoreActive) {
      return recipeStore.steps.map(step => step.description);
    }
    return recipe.instructions;
  }, [recipeStore.id, recipe.id, recipeStore.steps, recipe.instructions]);

  const activeTitle = useMemo(() => {
    const isStoreActive = recipeStore.id === recipe.id && recipeStore.meta.title;
    return isStoreActive ? recipeStore.meta.title : recipe.title;
  }, [recipeStore.id, recipe.id, recipeStore.meta.title, recipe.title]);

  const activeCookTime = useMemo(() => {
    const isStoreActive = recipeStore.id === recipe.id && recipeStore.meta.cookTime;
    return isStoreActive ? recipeStore.meta.cookTime : recipe.cookTime;
  }, [recipeStore.id, recipe.id, recipeStore.meta.cookTime, recipe.cookTime]);

  const activeDifficulty = useMemo(() => {
    const isStoreActive = recipeStore.id === recipe.id && recipeStore.meta.difficulty;
    return isStoreActive ? recipeStore.meta.difficulty : recipe.difficulty;
  }, [recipeStore.id, recipe.id, recipeStore.meta.difficulty, recipe.difficulty]);



  // Transform ingredients into the correct format for IngredientPanel
  const formattedIngredients = useMemo(() => {
    return activeIngredients.map((ingredient, index) => ({
      id: `ingredient-${index}`,
      text: ingredient,
      checked: ingredientStates[`ingredient-${index}`] || false
    }));
  }, [activeIngredients, ingredientStates]);

  // Scale ingredients based on serving adjustments
  const scaledIngredients = useScaledIngredients(
    activeIngredients, 
    activeServings, 
    activeServings
  );

  // Transform instructions to steps format for StepStack
  const steps = activeInstructions.map((instruction, index) => ({
    id: `step-${index}`,
    title: `Step ${index + 1}`,
    description: instruction,
    duration: extractDuration(instruction)
  }));

  // Note: Removed Zustand store sync useEffect that was causing infinite loops
  // Voice commands and recipe updates are now handled through other mechanisms

  // Note: Removed voice command listener useEffect to prevent infinite loops
  // Voice commands are handled through other mechanisms





  const handleIngredientToggle = (ingredientId: string) => {
    setIngredientStates(prev => ({
      ...prev,
      [ingredientId]: !prev[ingredientId]
    }));
  };

  const handleRating = (recipeId: string, rating: number) => {
    // Store rating (implement your rating logic here)
    toast({
      title: "Rating saved",
      description: `You rated this recipe ${rating} stars`,
    });
  };

  // Note: Removed ingredient state sync useEffect to prevent infinite loops
  // Ingredient states are now managed directly through user interactions

  return (
    <div className={`min-h-screen bg-slate-900 text-white ${className}`}>
      {/* Progress Bar */}
      <ProgressBar
        currentStep={currentStep}
        totalSteps={steps.length}
        completedSteps={[]}
      />

      {/* Header Controls */}
      <div className="flex items-center justify-between p-4 md:p-6 relative z-30">
        {onBack && (
          <Button
            onClick={onBack}
            variant="outline"
            size="sm"
            className="bg-slate-800/80 border-slate-600 text-slate-200 hover:bg-slate-700/80 backdrop-blur-sm"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back
          </Button>
        )}
        
        <div className="flex gap-2 ml-auto">
          {onShare && (
            <Button
              onClick={onShare}
              variant="outline"
              size="sm"
              className="bg-slate-800/80 border-slate-600 text-slate-200 hover:bg-slate-700/80 backdrop-blur-sm"
            >
              <Share2 className="w-4 h-4 mr-1" />
              Share
            </Button>
          )}
        </div>
      </div>

      {/* Main Recipe Card */}
      <motion.div
        className="max-w-7xl mx-auto bg-slate-800/30 backdrop-blur-sm rounded-xl overflow-hidden shadow-2xl"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        {/* Header Section */}
        <HeaderSection
          recipe={{
            ...recipe,
            title: activeTitle,
            cookTime: activeCookTime,
            difficulty: activeDifficulty,
            servings: activeServings
          }}
          currentServings={activeServings}
          onServingsChange={(newServings) => {
            // Note: HeaderSection slider was removed to prevent infinite loops
            // Servings are now managed through the recipe store only
            recipeActions.updateServings(newServings);
          }}
        />

        {/* Main Grid - Responsive Layout */}
        <div 
          className="recipe-main-grid relative"
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1fr)',
            gap: '0',
            containerType: 'inline-size'
          }}
        >
          {/* CSS for container queries */}
          <style dangerouslySetInnerHTML={{
            __html: `
              @container (min-width: 768px) {
                .recipe-main-grid {
                  grid-template-columns: 320px 1fr;
                  gap: 0;
                }
              }
            `
          }} />

          {/* Ingredient Panel */}
          <IngredientPanel
            ingredients={formattedIngredients}
            onToggle={handleIngredientToggle}
            className="md:h-[600px] md:sticky md:top-0"
          />

          {/* Step Stack */}
          <StepStack
            steps={steps}
            currentStep={currentStep}
            onStepChange={setCurrentStep}
            className="min-h-[600px]"
          />
        </div>

        {/* Recipe Tips - Above Footer to Prevent Overlap */}
        {recipe.tips && (
          <div className="p-6 bg-slate-800/20 border-t border-slate-700/50 mb-4">
            <div className="flex items-start gap-3">
              <BookOpen className="w-5 h-5 text-orange-400 mt-0.5 flex-shrink-0" />
              <div className="w-full">
                <h4 className="font-medium text-orange-400 mb-2">Chef's Tips</h4>
                <p className="text-slate-300 leading-relaxed pr-4">{recipe.tips}</p>
              </div>
            </div>
          </div>
        )}



        {/* Footer Section */}
        <FooterSection
          recipeId={recipe.id}
          onRate={handleRating}
        />
      </motion.div>


    </div>
  );
}



// Export enhanced version as both named and default export
export { EnhancedRecipeCard };
export default EnhancedRecipeCard;