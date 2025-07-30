import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Share2, BookOpen, Heart, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useScaledIngredients } from '@/hooks/useScaledIngredients';
import { useRecipeStore, recipeActions } from '@/stores/recipeStore';
import { apiRequest } from '@/lib/queryClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import RecipeShareTools from '@/components/RecipeShareTools';
import NutritionalAnalysis from '@/components/NutritionalAnalysis';

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
import SocialShareTools from '@/components/SocialShareTools';

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
        description: `${event.detail.recipe.title || "Your recipe"} has been modified`,
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

  const activeImage = useMemo(() => {
    const isStoreActive = recipeStore.id === recipe.id && recipeStore.meta.image;
    return isStoreActive ? recipeStore.meta.image : recipe.image;
  }, [recipeStore.id, recipe.id, recipeStore.meta.image, recipe.image]);



  // Scale ingredients based on serving adjustments
  const scaledIngredients = useScaledIngredients(
    activeIngredients, 
    recipe.servings, // Use original servings for scaling calculation
    activeServings
  );

  // Transform scaled ingredients into the correct format for IngredientPanel
  const formattedIngredients = useMemo(() => {
    return scaledIngredients.map((ingredient, index) => ({
      id: ingredient.id,
      text: ingredient.text,
      isSubstituted: ingredientStates[`${ingredient.id}_substituted`] || false,
      isLoading: ingredientStates[`${ingredient.id}_loading`] || false
    }));
  }, [scaledIngredients, ingredientStates]);

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





  const handleIngredientSubstitute = async (ingredientId: string, currentIngredient: string) => {
    // Update the loading state
    setIngredientStates(prev => ({
      ...prev,
      [`${ingredientId}_loading`]: true
    }));

    try {
      console.log('🔄 Starting ingredient substitution:', { ingredientId, currentIngredient });
      
      // Call API to get substitute ingredient and updated instructions
      const response = await fetch('/api/ingredient-substitute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ingredient: currentIngredient,
          recipeContext: {
            title: activeTitle,
            cuisine: recipe.cuisine,
            allIngredients: activeIngredients,
            instructions: activeInstructions
          }
        })
      });

      if (!response.ok) throw new Error('Failed to get substitute');
      
      const data = await response.json();
      const substitute = data.substitute || data.suggestion || currentIngredient;
      const updatedInstructions = data.updatedInstructions || activeInstructions;
      
      console.log('🔄 Got substitute:', { original: currentIngredient, substitute });

      // Update the ingredient directly in local state and store
      const index = parseInt(ingredientId.split('-')[1]);
      if (index >= 0 && index < activeIngredients.length) {
        // Create updated ingredients array
        const updatedIngredients = [...activeIngredients];
        updatedIngredients[index] = substitute;
        
        console.log('🔄 Updating ingredients and instructions:', { 
          index, 
          updatedIngredients,
          instructionsUpdated: updatedInstructions.length
        });
        
        // Update recipe store with both ingredient and instruction changes while preserving step state
        const currentRecipeState = recipeStore;
        recipeActions.replaceRecipe({
          id: recipe.id,
          servings: activeServings,
          ingredients: updatedIngredients.map((text, i) => ({
            id: `ingredient-${i}`,
            text,
            checked: false
          })),
          steps: updatedInstructions.map((instruction: string, i: number) => ({
            id: `step-${i}`,
            title: `Step ${i + 1}`,
            description: instruction,
            duration: extractDuration(instruction),
            completed: currentRecipeState.steps[i]?.completed || false
          })),
          meta: {
            title: activeTitle,
            cookTime: activeCookTime,
            difficulty: activeDifficulty,
            cuisine: recipe.cuisine,
            description: recipe.description,
            image: recipe.image
          },
          currentStep: currentRecipeState.currentStep || 0,
          completedSteps: currentRecipeState.completedSteps || [],
          lastUpdated: Date.now()
        });
        
        // Update local state to mark as substituted
        setIngredientStates(prev => ({
          ...prev,
          [`${ingredientId}_substituted`]: true,
          [`${ingredientId}_loading`]: false
        }));
        
        // Force re-render with new key
        setKey(prev => prev + 1);
        
        console.log('🔄 Substitution complete - forcing re-render');

        toast({
          title: "Ingredient substituted!",
          description: `Replaced "${currentIngredient}" with "${substitute}"`,
        });
      }
      
    } catch (error) {
      console.error('Failed to substitute ingredient:', error);
      toast({
        title: "Substitution failed",
        description: "Could not find a suitable substitute",
        variant: "destructive"
      });
      
      // Clear loading state
      setIngredientStates(prev => ({
        ...prev,
        [`${ingredientId}_loading`]: false
      }));
    }
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

  // Favorite button component
  const FavoriteButton = ({ recipe }: { recipe: any }) => {
    const queryClient = useQueryClient();
    const [isSaved, setIsSaved] = useState(false);
    
    // Check if recipe is already saved in user's cookbook
    const { data: savedRecipes } = useQuery({
      queryKey: ['/api/recipes'],
      queryFn: async () => {
        const response = await apiRequest("GET", "/api/recipes");
        if (!response.ok) return [];
        return response.json();
      }
    });
    
    useEffect(() => {
      if (savedRecipes && recipe.title) {
        const alreadySaved = savedRecipes.some((r: any) => 
          r.title === recipe.title && r.description === recipe.description
        );
        setIsSaved(alreadySaved);
      }
    }, [savedRecipes, recipe]);
    
    const saveMutation = useMutation({
      mutationFn: async () => {
        const recipeData = {
          title: activeTitle,
          description: recipe.description,
          cuisine: recipe.cuisine || '',
          difficulty: activeDifficulty || 'Medium',
          cookTime: activeCookTime || 30,
          servings: activeServings || 4,
          ingredients: activeIngredients || [],
          instructions: activeInstructions || [],
          tips: recipe.tips || '',
          mode: recipe.mode || 'shopping',
          imageUrl: activeImage || recipe.image || ''
        };
        
        const response = await apiRequest("POST", "/api/save-recipe", recipeData);
        if (!response.ok) {
          throw new Error('Failed to save recipe');
        }
        return response.json();
      },
      onSuccess: () => {
        setIsSaved(true);
        queryClient.invalidateQueries({ queryKey: ['/api/recipes'] });
        toast({
          title: "Recipe saved!",
          description: "Recipe added to My Cookbook",
        });
      },
      onError: (error: any) => {
        if (error.message.includes('401')) {
          toast({
            title: "Sign in required",
            description: "Please sign in to save recipes to My Cookbook",
            variant: "destructive"
          });
        } else {
          toast({
            title: "Failed to save",
            description: "Could not save recipe. Please try again.",
            variant: "destructive"
          });
        }
      }
    });
    
    return (
      <Button
        onClick={() => !isSaved && saveMutation.mutate()}
        disabled={isSaved || saveMutation.isPending}
        variant="outline"
        size="sm"
        className={`${
          isSaved 
            ? 'bg-red-500/20 border-red-500 text-red-300 hover:bg-red-500/30' 
            : 'bg-slate-800/80 border-slate-600 text-slate-200 hover:bg-slate-700/80'
        } backdrop-blur-sm transition-colors`}
      >
        <Heart className={`w-4 h-4 mr-1 ${isSaved ? 'fill-current' : ''}`} />
        {isSaved ? 'Saved' : 'Save'}
      </Button>
    );
  };

  return (
    <div className={`text-white ${className}`}>
      {/* Progress Bar */}
      <ProgressBar
        currentStep={currentStep}
        totalSteps={steps.length}
        completedSteps={[]}
      />

      {/* Header Controls - Only show back button if needed */}
      {onBack && (
        <div className="flex items-center justify-between p-4 md:p-6 relative z-30">
          <Button
            onClick={onBack}
            variant="outline"
            size="sm"
            className="bg-slate-800/80 border-slate-600 text-slate-200 hover:bg-slate-700/80 backdrop-blur-sm"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back
          </Button>
          
          {onShare && (
            <div className="flex gap-2 ml-auto">
              <Button
                onClick={onShare}
                variant="outline"
                size="sm"
                className="bg-slate-800/80 border-slate-600 text-slate-200 hover:bg-slate-700/80 backdrop-blur-sm"
              >
                <Share2 className="w-4 h-4 mr-1" />
                Share
              </Button>
            </div>
          )}
        </div>
      )}



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
            servings: activeServings,
            description: recipe.description  // Explicitly pass description
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
            onSubstitute={handleIngredientSubstitute}
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

        {/* Nutritional Analysis Section */}
        <NutritionalAnalysis 
          recipe={{
            title: activeTitle,
            ingredients: formattedIngredients.map(ing => ing.text),
            servings: activeServings
          }}
        />

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

        {/* Share Recipe Section with Enhanced Tools */}
        <div className="p-6 bg-slate-800/20 border-t border-slate-700/50">
          <RecipeShareTools
            id={recipe.id}
            shareId={recipe.shareId}
            title={activeTitle}
            description={recipe.description || 'A delicious recipe created with Flavr AI'}
            imageUrl={activeImage}
            isShared={recipe.isShared || false}
            onShareToggle={onShare}
            recipe={{
              ...recipe,
              title: activeTitle,
              servings: activeServings,
              cookTime: activeCookTime,
              difficulty: activeDifficulty,
              image: activeImage,
              imageUrl: activeImage
            }}
          />
        </div>

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