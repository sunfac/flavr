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
import SubRecipeModal from './SubRecipeModal';
import { RecipeNavigation } from './RecipeNavigation';
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
  tempId?: string;
  subRecipes?: Record<string, {
    ingredients: string[];
    instructions: string[];
  }>;
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
  const [subRecipeModal, setSubRecipeModal] = useState<{
    isOpen: boolean;
    recipeName: string;
    subRecipe: { ingredients: string[]; instructions: string[] };
  }>({
    isOpen: false,
    recipeName: '',
    subRecipe: { ingredients: [], instructions: [] }
  });
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

  // Initialize recipe store on mount if not already active
  useEffect(() => {
    // Only initialize if store is empty or has different recipe
    if (!recipeStore.id || recipeStore.id !== recipe.id) {
      console.log('🔄 Recipe Store: Initializing for new recipe', recipe.id, 'with servings:', recipe.servings);
      recipeActions.replaceRecipe({
        id: recipe.id,
        servings: recipe.servings, // Keep original servings as baseline
        ingredients: recipe.ingredients.map((text: string, index: number) => ({
          id: `ingredient-${index}`,
          text,
          checked: false
        })),
        steps: recipe.instructions.map((instruction: string, index: number) => ({
          id: `step-${index}`,
          title: `Step ${index + 1}`,
          description: instruction,
          duration: 0
        })),
        meta: {
          title: recipe.title,
          cookTime: recipe.cookTime,
          difficulty: recipe.difficulty,
          cuisine: recipe.cuisine,
          description: recipe.description,
          image: recipe.image,
          originalServings: recipe.servings || 4 // Store original servings for scaling reference
        },
        currentStep: 0,
        completedSteps: [],
        lastUpdated: Date.now()
      });
    }
  }, [recipe.id]); // Only re-run if recipe ID changes

  // Sync servings from store without causing infinite loops
  const activeServings = useMemo(() => {
    // Always use store servings if store is initialized with this recipe
    if (recipeStore.id === recipe.id && recipeStore.servings > 0) {
      console.log('🔄 Using store servings:', recipeStore.servings, 'for recipe', recipe.id);
      return recipeStore.servings;
    }
    console.log('🔄 Using recipe servings:', recipe.servings, 'for recipe', recipe.id);
    return recipe.servings;
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
  // ALWAYS use 4 as the fixed baseline since all recipes are generated for 4 servings
  const originalServings = 4; // Fixed baseline - all generated recipes are 4 servings
  
  console.log('🎯 SCALING DEBUG:', {
    'Recipe servings (from prop)': recipe.servings,
    'Store servings (current)': recipeStore.servings, 
    'Active servings (current)': activeServings,
    'FIXED original baseline': originalServings,
    'Will use for scaling calc': originalServings + ' → ' + activeServings,
    'Expected scaling factor': activeServings / originalServings
  });
  
  const scaledIngredients = useScaledIngredients(
    activeIngredients, // Use activeIngredients to show substitutions (these come from store which includes substituted ingredients)
    originalServings, // Use original servings for scaling calculation
    activeServings || originalServings
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





  // Handle sub-recipe display
  const handleSubRecipeRequest = (ingredientText: string, subRecipeName: string) => {
    console.log('🍽️ Sub-recipe requested:', { ingredientText, subRecipeName });
    
    // Check both the recipe prop and the recipe store for sub-recipes
    const availableSubRecipes = recipe.subRecipes || recipeStore.subRecipes;
    console.log('📚 Available sub-recipes:', availableSubRecipes ? Object.keys(availableSubRecipes) : 'None');
    
    // Look for the sub-recipe in the available subRecipes with flexible matching
    if (availableSubRecipes) {
      // Try exact match first
      if (availableSubRecipes[subRecipeName]) {
        console.log('✅ Found exact match for sub-recipe:', subRecipeName);
        const subRecipe = availableSubRecipes[subRecipeName];
        setSubRecipeModal({
          isOpen: true,
          recipeName: subRecipeName,
          subRecipe
        });
        return;
      }
      
      // Try fuzzy matching - look for partial matches in keys
      const subRecipeKeys = Object.keys(availableSubRecipes);
      const fuzzyMatch = subRecipeKeys.find(key => 
        key.toLowerCase().includes(subRecipeName.toLowerCase()) ||
        subRecipeName.toLowerCase().includes(key.toLowerCase())
      );
      
      if (fuzzyMatch) {
        console.log('✅ Found fuzzy match for sub-recipe:', { requested: subRecipeName, found: fuzzyMatch });
        const subRecipe = availableSubRecipes[fuzzyMatch];
        setSubRecipeModal({
          isOpen: true,
          recipeName: fuzzyMatch,
          subRecipe
        });
        return;
      }
    }
    
    // Fallback to chatbot if sub-recipe not found in extracted data
    console.log('❌ Sub-recipe not found in extracted data, falling back to chat');
    const questionText = ingredientText.includes('page') 
      ? `Show me the recipe for ${subRecipeName} from the cookbook photos`
      : `How to make ${subRecipeName}?`;
    
    // This will trigger the chatbot
    handleIngredientSubstitute('sub-recipe-request', questionText);
  };

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
      const indexMatch = ingredientId.match(/ingredient-(\d+)/);
      const index = indexMatch ? parseInt(indexMatch[1]) : -1;
      
      console.log('🔍 Parsing ingredient ID:', { ingredientId, index, activeIngredientsLength: activeIngredients.length });
      
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
      
      // Provide better error feedback
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast({
        title: "Substitution failed",
        description: `Could not find a suitable substitute: ${errorMessage}`,
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
        
        const response = await apiRequest("POST", "/api/save-recipe", { recipe: recipeData });
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
            console.log('🔄 Servings changed to:', newServings);
            
            // Update the recipe store immediately for live ingredient scaling
            const currentStore = useRecipeStore.getState();
            if (currentStore.id === recipe.id) {
              useRecipeStore.setState({
                ...currentStore,
                servings: newServings
              });
              console.log('✅ Recipe store updated with new servings:', newServings);
            }
          }}
        />

        {/* Recipe Navigation - Sub-recipes and parent navigation */}
        <div className="px-4 md:px-6 pb-4">
          <RecipeNavigation recipeId={parseInt(recipe.id)} />
        </div>

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
            onSubRecipe={handleSubRecipeRequest}
            recipeId={parseInt(recipe.id)}
            className="md:h-auto md:max-h-[80vh] md:sticky md:top-4"
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

      {/* Sub-Recipe Modal */}
      <SubRecipeModal
        isOpen={subRecipeModal.isOpen}
        onClose={() => setSubRecipeModal(prev => ({ ...prev, isOpen: false }))}
        recipeName={subRecipeModal.recipeName}
        subRecipe={subRecipeModal.subRecipe}
        onBack={() => setSubRecipeModal(prev => ({ ...prev, isOpen: false }))}
      />

    </div>
  );
}



// Export enhanced version as both named and default export
export { EnhancedRecipeCard };
export default EnhancedRecipeCard;