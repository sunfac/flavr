import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Share2, BookOpen, Mic } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useScaledIngredients } from '@/hooks/useScaledIngredients';
import { useRecipeStore, recipeActions } from '@/stores/recipeStore';
import VoiceAssistant from '@/components/VoiceAssistant';

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
  const [currentServings, setCurrentServings] = useState(recipe.servings);
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [ingredientStates, setIngredientStates] = useState<Record<string, boolean>>({});
  const [showVoiceControl, setShowVoiceControl] = useState(false);
  const { toast } = useToast();
  
  const recipeStore = useRecipeStore();

  // Sync with recipe store updates from chatbot (servings and ingredients)
  useEffect(() => {
    if (recipeStore.lastUpdated && recipeStore.id === recipe.id) {
      // Update servings if they changed in the store
      if (recipeStore.servings !== currentServings) {
        setCurrentServings(recipeStore.servings);
      }
    }
  }, [recipeStore.servings, recipeStore.lastUpdated, recipeStore.id, recipe.id, currentServings]);

  // Use updated ingredients from store if available, otherwise fall back to original
  const activeIngredients = recipeStore.id === recipe.id && recipeStore.ingredients.length > 0 
    ? recipeStore.ingredients.map(ing => ing.text)
    : recipe.ingredients;

  const activeServings = recipeStore.id === recipe.id 
    ? recipeStore.servings 
    : recipe.servings;

  // Scale ingredients based on serving adjustments
  const scaledIngredients = useScaledIngredients(
    activeIngredients, 
    activeServings, 
    currentServings
  );

  // Sync with Zustand store for voice commands
  useEffect(() => {
    // Transform recipe data to Zustand format
    const zustandRecipe = {
      id: recipe.id,
      servings: currentServings,
      ingredients: recipe.ingredients.map((ingredient, index) => ({
        id: `ingredient-${index}`,
        text: ingredient,
        amount: '',
        unit: '',
        checked: ingredientStates[ingredient] || false
      })),
      steps: recipe.instructions.map((instruction, index) => ({
        id: `step-${index}`,
        title: `Step ${index + 1}`,
        description: instruction,
        duration: extractDuration(instruction)
      })),
      meta: {
        title: recipe.title,
        description: recipe.description || '',
        cookTime: recipe.cookTime,
        difficulty: recipe.difficulty,
        cuisine: recipe.cuisine || '',
        image: recipe.image
      },
      currentStep: currentStep,
      completedSteps: completedSteps,
      lastUpdated: Date.now()
    };

    // Update Zustand store
    recipeActions.replaceRecipe(zustandRecipe);
  }, [recipe, currentServings, currentStep, completedSteps, ingredientStates]);

  // Listen for voice command changes from Zustand store
  useEffect(() => {
    if (recipeStore.currentStep !== currentStep) {
      setCurrentStep(recipeStore.currentStep);
    }
    if (recipeStore.servings !== currentServings) {
      setCurrentServings(recipeStore.servings);
    }
    if (recipeStore.completedSteps !== completedSteps) {
      setCompletedSteps(recipeStore.completedSteps);
    }
  }, [recipeStore.currentStep, recipeStore.servings, recipeStore.completedSteps]);

  // Convert instructions to steps
  const steps = recipe.instructions.map((instruction, index) => ({
    id: `step-${index}`,
    title: `Step ${index + 1}`,
    description: instruction,
    duration: extractDuration(instruction) // Extract timing from instruction text
  }));

  const handleStepComplete = (stepId: string) => {
    const stepIndex = steps.findIndex(step => step.id === stepId);
    if (stepIndex >= 0 && !completedSteps.includes(stepIndex)) {
      setCompletedSteps(prev => [...prev, stepIndex]);
      toast({
        title: "Step completed!",
        description: `Step ${stepIndex + 1} marked as complete`,
      });
    }
  };

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

  // Update ingredient states when scaled ingredients change
  useEffect(() => {
    const newStates: Record<string, boolean> = {};
    scaledIngredients.forEach(ingredient => {
      newStates[ingredient.id] = ingredientStates[ingredient.id] || false;
    });
    setIngredientStates(newStates);
  }, [scaledIngredients]);

  const ingredientsWithState = scaledIngredients.map(ingredient => ({
    ...ingredient,
    checked: ingredientStates[ingredient.id] || false
  }));

  return (
    <div className={`min-h-screen bg-slate-900 text-white ${className}`}>
      {/* Progress Bar */}
      <ProgressBar
        currentStep={currentStep}
        totalSteps={steps.length}
        completedSteps={completedSteps}
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
          <Button
            onClick={() => setShowVoiceControl(!showVoiceControl)}
            variant={showVoiceControl ? "default" : "outline"}
            size="sm"
            className="bg-slate-800/80 border-slate-600 text-slate-200 hover:bg-slate-700/80 backdrop-blur-sm"
          >
            <Mic className="w-4 h-4 mr-1" />
            Voice
          </Button>
          
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
          recipe={recipe}
          currentServings={currentServings}
          onServingsChange={(newServings) => {
            setCurrentServings(newServings);
            // Also update the recipe store to keep everything in sync
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
            ingredients={ingredientsWithState}
            onToggle={handleIngredientToggle}
            className="md:h-[600px] md:sticky md:top-0"
          />

          {/* Step Stack */}
          <StepStack
            steps={steps}
            currentStep={currentStep}
            onStepComplete={handleStepComplete}
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

      {/* Voice Control Panel */}
      <AnimatePresence>
        {showVoiceControl && (
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            transition={{ duration: 0.3 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-slate-800/95 backdrop-blur-md border-t border-slate-600 p-4"
          >
            <div className="max-w-7xl mx-auto">
              <VoiceAssistant 
                onChatMessage={(message: string) => {
                  // Handle voice messages sent to chatbot
                  toast({
                    title: "Voice Command",
                    description: `Sent to Zest: "${message}"`,
                  });
                }}
                className="max-w-lg mx-auto"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}



// Export enhanced version as both named and default export
export { EnhancedRecipeCard };
export default EnhancedRecipeCard;