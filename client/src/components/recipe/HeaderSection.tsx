import { useMemo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, ChefHat, Clock, RotateCcw, Heart, RefreshCw, Loader2, Copy } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useLocation } from 'wouter';
import { animations, spacing } from '@/styles/tokens';
import { useRecipeStore } from '@/stores/recipeStore';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useMutation } from '@tanstack/react-query';

interface HeaderSectionProps {
  recipe: {
    title: string;
    description?: string;
    cookTime: number | string;
    servings: number;
    difficulty: string;
    cuisine?: string;
    image?: string;
    imageLoading?: boolean;
  };
  currentServings: number;
  onServingsChange?: (servings: number) => void;
}

export default function HeaderSection({ 
  recipe, 
  currentServings
}: HeaderSectionProps) {
  const [location, navigate] = useLocation();
  const [isRerolling, setIsRerolling] = useState(false);
  const { toast } = useToast();
  const generationParams = useRecipeStore((state) => state.generationParams);
  const updateActiveRecipe = useRecipeStore((state) => state.updateActiveRecipe);
  const setImageLoading = useRecipeStore((state) => state.setImageLoading);
  const activeRecipe = useRecipeStore((state) => state);
  
  const fastFacts = useMemo(() => {
    return [
      { icon: Users, label: `Serves ${currentServings}`, value: 'servings' },
      { icon: Clock, label: `${recipe.cookTime} min`, value: 'timer' },
    ];
  }, [currentServings, recipe.cookTime]);

  const handleStartAgain = () => {
    navigate('/app');
  };



  const handleCopyIngredients = async () => {
    const ingredients = activeRecipe.ingredients?.map((ing: any) => ing.text || ing) || [];
    const instructions = activeRecipe.steps?.map((step: any) => step.description || step) || [];
    
    const fullRecipeText = `${recipe.title}

${recipe.description ? `${recipe.description}\n\n` : ''}📝 Ingredients (serves ${currentServings || 4}):
${ingredients.map((ing: any) => `• ${ing}`).join('\n')}

👨‍🍳 Instructions:
${instructions.map((step: any, index: number) => `${index + 1}. ${step}`).join('\n\n')}

Cook Time: ${recipe.cookTime} minutes
Difficulty: ${recipe.difficulty}
${recipe.cuisine ? `Cuisine: ${recipe.cuisine}` : ''}

Created with Flavr AI`;
    
    try {
      await navigator.clipboard.writeText(fullRecipeText);
      toast({
        title: "Recipe copied!",
        description: "Full recipe with ingredients & steps copied",
      });
    } catch (error) {
      toast({
        title: "Copy failed",
        description: "Could not copy recipe",
        variant: "destructive",
      });
    }
  };

  const handleReroll = async () => {
    if (!generationParams) {
      toast({
        title: "Unable to reroll",
        description: "Recipe generation parameters not found",
        variant: "destructive",
      });
      return;
    }

    setIsRerolling(true);
    setImageLoading(true); // Set placeholder image during reroll
    
    // Clear the current image to show loading state immediately
    updateActiveRecipe({
      ...useRecipeStore.getState(),
      meta: {
        ...useRecipeStore.getState().meta,
        image: undefined,
        imageLoading: true
      }
    }, generationParams);
    
    try {
      const { mode, originalInputs } = generationParams;
      let response;

      if (mode === 'chef') {
        response = await apiRequest('POST', '/api/chef-assist/generate', {
          prompt: originalInputs.prompt,
          servings: originalInputs.servings,
          cookingTime: originalInputs.cookingTime,
          isReroll: true // Flag to indicate this is a reroll for enhanced variation
        });
      } else if (mode === 'fridge') {
        // For fridge mode, regenerate from the recipe idea
        // For fridge mode, need to check if we're using generate-fridge-recipe instead
        if (originalInputs.ingredients) {
          response = await apiRequest('POST', '/api/generate-fridge-recipe', {
            ingredients: originalInputs.ingredients,
            servings: originalInputs.servings || 4,
            cookingTime: originalInputs.cookingTime || 30,
            budget: originalInputs.budget || 4.5,
            equipment: originalInputs.equipment || ["oven", "stovetop"],
            dietaryRestrictions: originalInputs.dietaryRestrictions || [],
            ingredientFlexibility: originalInputs.ingredientFlexibility || "pantry",
            isReroll: true // Flag to indicate this is a reroll for enhanced variation
          });
        } else {
          response = await apiRequest('POST', '/api/generate-full-recipe', {
            recipeIdea: originalInputs.recipeIdea,
            quizData: originalInputs.quizData,
            isReroll: true // Flag to indicate this is a reroll for enhanced variation
          });
        }
      } else if (mode === 'shopping') {
        // For shopping mode, regenerate from the selected recipe
        response = await apiRequest('POST', '/api/generate-full-recipe', {
          selectedRecipe: originalInputs.selectedRecipe,
          mode: 'shopping',
          quizData: originalInputs.quizData,
          isReroll: true // Flag to indicate this is a reroll for enhanced variation
        });
      } else {
        throw new Error('Unsupported reroll mode');
      }

      const data = await response.json();
      
      // Handle different response formats from different endpoints
      const newRecipe = data.recipe || data;
      
      if (newRecipe && (newRecipe.title || newRecipe.ingredients)) {
        // Preserve generation parameters for future rerolls
        newRecipe.generationParams = generationParams;
        updateActiveRecipe(newRecipe, generationParams);
        
        toast({
          title: "Recipe rerolled successfully!",
          description: "Here's a fresh variation using the same inputs",
        });
        
        // Scroll to top to show new recipe
        window.scrollTo(0, 0);
      } else {
        throw new Error("No recipe data received");
      }
    } catch (error: any) {
      console.error('Error rerolling recipe:', error);
      
      // Check for quota limit errors
      if (error.message && error.message.includes('You have no free recipes remaining')) {
        toast({
          title: "You have no free recipes remaining this month",
          description: "Sign up for Flavr+ to get unlimited recipes!",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Failed to reroll recipe",
          description: error.message || "Please try again",
          variant: "destructive",
        });
      }
    } finally {
      setIsRerolling(false);
      setImageLoading(false); // Clear loading state when done
    }
  };

  return (
    <div className="relative">
      {/* Recipe header anchor for scroll targeting */}
      <div id="recipe-header-top"></div>
      
      {/* Hero Image - Mobile First Design */}
      <div className="relative w-full">
        {/* Main Image Display */}
        {recipe.image && !recipe.imageLoading ? (
          <div className="relative w-full aspect-[16/10] sm:aspect-video bg-gradient-to-br from-orange-400 to-orange-600 rounded-t-xl overflow-hidden">
            <img 
              src={recipe.image} 
              alt={recipe.title}
              className="w-full h-full object-cover"
              loading="eager"
              style={{ objectPosition: 'center' }}
              onLoad={() => {
                console.log('✅ Image loaded successfully:', recipe.image);
                setImageLoading(false); // Clear loading state when image loads
                // Scroll to absolute top after image loads
                window.scrollTo(0, 0);
                document.documentElement.scrollTop = 0;
                document.body.scrollTop = 0;
              }}
              onError={(e) => {
                console.log('❌ Image failed to load:', recipe.image);
                setImageLoading(false); // Clear loading state on error
                // Don't hide the image container, just show fallback
                e.currentTarget.style.display = 'none';
                // Show the fallback gradient container
                const container = e.currentTarget.parentElement;
                if (container) {
                  container.style.background = 'linear-gradient(to bottom right, #fb923c, #ea580c)';
                }
              }}
            />
            {/* Minimal overlay for mobile readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent sm:bg-black/30" />
            
            {/* Mobile: Only title overlay, Desktop: Title + description overlay */}
            <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-4 md:p-6 text-white">
              <h1 className="font-bold mb-1 sm:mb-2 text-shadow-lg text-lg sm:text-xl md:text-2xl lg:text-3xl leading-tight break-words hyphens-auto text-wrap-balance">
                {recipe.title}
              </h1>
            </div>
            
            {/* Action Buttons - Top Right Corner */}
            <div className="absolute top-3 right-3 flex items-center gap-1 sm:gap-2">
              <Button
                onClick={handleCopyIngredients}
                size="sm"
                variant="secondary"
                className="bg-black/40 hover:bg-black/60 text-white backdrop-blur-md shadow-lg hover:shadow-xl transition-all duration-200 px-3 py-2"
              >
                <Copy className="w-4 h-4 mr-1.5" />
                <span className="text-xs font-medium">Copy</span>
              </Button>
              
              <Button
                onClick={handleReroll}
                disabled={isRerolling || !generationParams}
                size="sm"
                variant="secondary"
                className="bg-orange-500/80 hover:bg-orange-500/90 text-white backdrop-blur-md shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-70 px-3 py-2"
              >
                {isRerolling ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-1.5" />
                )}
                <span className="text-xs font-medium">Reroll</span>
              </Button>
              
              <Button
                onClick={handleStartAgain}
                size="sm"
                variant="secondary"
                className="bg-black/40 hover:bg-black/60 text-white backdrop-blur-md shadow-lg hover:shadow-xl transition-all duration-200 px-3 py-2"
              >
                <RotateCcw className="w-4 h-4 mr-1.5" />
                <span className="text-xs font-medium">Start Over</span>
              </Button>
            </div>
          </div>
        ) : (
          <div className="relative w-full aspect-[16/10] sm:aspect-video bg-gradient-to-br from-orange-400 to-orange-600 rounded-t-xl overflow-hidden flex items-center justify-center">
            <div className="text-center p-6 text-white">
              <h1 className="font-bold text-lg sm:text-xl md:text-2xl lg:text-3xl leading-tight break-words mb-2">
                {recipe.title}
              </h1>
              <div className="mt-4 text-xs text-white/60 animate-pulse">
              {isRerolling ? "🔄 Creating new recipe and image..." : "✨ Generating beautiful food image..."}
            </div>
            </div>
            
            {/* Action Buttons - Top Right Corner (for no image state) */}
            <div className="absolute top-3 right-3 flex items-center gap-1 sm:gap-2">
              <Button
                onClick={handleCopyIngredients}
                size="sm"
                variant="secondary"
                className="bg-black/40 hover:bg-black/60 text-white backdrop-blur-md shadow-lg hover:shadow-xl transition-all duration-200 px-3 py-2"
              >
                <Copy className="w-4 h-4 mr-1.5" />
                <span className="text-xs font-medium">Copy</span>
              </Button>
              
              <Button
                onClick={handleReroll}
                disabled={isRerolling || !generationParams}
                size="sm"
                variant="secondary"
                className="bg-orange-500/80 hover:bg-orange-500/90 text-white backdrop-blur-md shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-70 px-3 py-2"
              >
                {isRerolling ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-1.5" />
                )}
                <span className="text-xs font-medium">Reroll</span>
              </Button>
              
              <Button
                onClick={handleStartAgain}
                size="sm"
                variant="secondary"
                className="bg-black/40 hover:bg-black/60 text-white backdrop-blur-md shadow-lg hover:shadow-xl transition-all duration-200 px-3 py-2"
              >
                <RotateCcw className="w-4 h-4 mr-1.5" />
                <span className="text-xs font-medium">Start Over</span>
              </Button>
            </div>
          </div>
        )}
        

      </div>

      {/* Description - Show full description below image on all devices */}
      {recipe.description && (
        <div className="p-3 sm:p-4 bg-slate-800/50">
          <p className="text-slate-200 text-sm sm:text-base leading-relaxed">
            {recipe.description}
          </p>
        </div>
      )}

      {/* Fast Facts & Serving Controls */}
      <div className="p-3 sm:p-4 md:p-6 bg-slate-800/50 backdrop-blur-sm">
        {/* Fast Facts Chips - Mobile Responsive */}
        <div className="flex items-center gap-2 md:gap-3 mb-4 flex-wrap">
          {fastFacts.map((fact, index) => {
            const IconComponent = fact.icon;
            return (
              <Badge
                key={index}
                variant="outline"
                className="flex items-center gap-1.5 md:gap-2 px-2 md:px-3 py-1 md:py-1.5 bg-slate-700/50 border-slate-600 text-slate-200 hover:bg-slate-600/50 transition-colors text-xs md:text-sm whitespace-nowrap"
              >
                <IconComponent className="w-3 h-3 md:w-4 md:h-4" />
                <span className="font-medium">{fact.label}</span>
              </Badge>
            );
          })}
          {recipe.cuisine && (
            <Badge
              variant="outline"
              className="px-2 md:px-3 py-1 md:py-1.5 bg-orange-500/20 border-orange-400/30 text-orange-200 text-xs md:text-sm whitespace-nowrap"
            >
              {recipe.cuisine}
            </Badge>
          )}
        </div>

        {/* Servings Display - No Interactive Controls */}
        <div className="flex items-center justify-center">
          <Badge variant="secondary" className="bg-orange-500/20 text-orange-200 px-4 py-2 text-lg border border-orange-400/30">
            Serves {currentServings}
          </Badge>
        </div>
      </div>
    </div>
  );
}