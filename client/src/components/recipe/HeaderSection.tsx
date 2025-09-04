import { useMemo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, ChefHat, Clock, RotateCcw, Heart, RefreshCw, Loader2, Copy } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { useLocation } from 'wouter';
import { animations, spacing } from '@/styles/tokens';
import { useRecipeStore } from '@/stores/recipeStore';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

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

// Save Button Component for Header Section
function SaveButton() {
  const queryClient = useQueryClient();
  const [isSaved, setIsSaved] = useState(false);
  const { toast } = useToast();
  const activeRecipe = useRecipeStore((state) => state);
  
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
    if (savedRecipes && activeRecipe.meta.title) {
      const alreadySaved = savedRecipes.some((r: any) => 
        r.title === activeRecipe.meta.title && r.description === activeRecipe.meta.description
      );
      setIsSaved(alreadySaved);
    }
  }, [savedRecipes, activeRecipe.meta.title, activeRecipe.meta.description]);
  
  const saveMutation = useMutation({
    mutationFn: async () => {
      const recipeData = {
        title: activeRecipe.meta.title,
        description: activeRecipe.meta.description,
        cuisine: activeRecipe.meta.cuisine || '',
        difficulty: activeRecipe.meta.difficulty || 'Medium',
        cookTime: activeRecipe.meta.cookTime || 30,
        servings: activeRecipe.servings || 4,
        ingredients: activeRecipe.ingredients.map((ing: any) => ing.text || ing),
        instructions: activeRecipe.steps.map((step: any) => step.description || step),
        tips: '',
        mode: 'shopping',
        imageUrl: activeRecipe.meta.image || ''
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
      size="sm"
      variant="secondary"
      className={`${
        isSaved 
          ? 'bg-red-500/20 border-red-500 text-red-300 hover:bg-red-500/30' 
          : 'bg-black/40 hover:bg-black/60 text-white'
      } backdrop-blur-md shadow-lg hover:shadow-xl transition-all duration-200 px-1.5 py-1 sm:px-2 sm:py-1.5 md:px-3 md:py-2 text-xs relative z-20 cursor-pointer`}
      style={{ pointerEvents: 'auto' }}
    >
      <Heart className={`w-3 h-3 sm:w-4 sm:h-4 mr-0.5 sm:mr-1 ${isSaved ? 'fill-current' : ''}`} />
      <span className="text-xs font-medium">{isSaved ? 'Saved' : 'Save'}</span>
    </Button>
  );
}

export default function HeaderSection({ 
  recipe, 
  currentServings,
  onServingsChange
}: HeaderSectionProps) {
  const [location, navigate] = useLocation();
  const [isRerolling, setIsRerolling] = useState(false);
  const [localServings, setLocalServings] = useState(currentServings);
  const [currentImage, setCurrentImage] = useState(recipe.image);
  const { toast } = useToast();
  const generationParams = useRecipeStore((state) => state.generationParams);
  const updateActiveRecipe = useRecipeStore((state) => state.updateActiveRecipe);
  const setImageLoading = useRecipeStore((state) => state.setImageLoading);
  const activeRecipe = useRecipeStore((state) => state);
  
  // Poll for image updates if recipe has tempId but no image
  useEffect(() => {
    const tempId = (recipe as any).tempId;
    if (tempId && !currentImage) {
      let pollCount = 0;
      const maxPolls = 30; // Poll for up to 30 seconds
      
      const pollForImage = () => {
        pollCount++;
        console.log(`🔍 Polling for image update ${pollCount}/${maxPolls} for tempId: ${tempId}`);
        
        apiRequest("GET", `/api/recipe-update/${tempId}`)
          .then(response => response.json())
          .then(data => {
            if (data.hasImage && data.imageUrl) {
              console.log('✅ Image URL received from polling:', data.imageUrl);
              setCurrentImage(data.imageUrl);
              setImageLoading(false);
              
              // Update the recipe store with the image
              const recipeStore = useRecipeStore.getState();
              if (recipeStore.id === (recipe as any).id || recipeStore.meta.title === recipe.title) {
                useRecipeStore.setState({
                  ...recipeStore,
                  meta: {
                    ...recipeStore.meta,
                    image: data.imageUrl
                  }
                });
              }
            } else if (pollCount < maxPolls) {
              // Continue polling
              setTimeout(pollForImage, 1000);
            } else {
              console.log('⏰ Stopped polling for image - max attempts reached');
              setImageLoading(false);
            }
          })
          .catch(error => {
            console.error('Error polling for image:', error);
            if (pollCount < maxPolls) {
              setTimeout(pollForImage, 2000); // Longer delay on error
            } else {
              setImageLoading(false);
            }
          });
      };
      
      // Start polling after a short delay
      setImageLoading(true);
      setTimeout(pollForImage, 2000);
    }
  }, [(recipe as any).tempId, currentImage]);
  
  // Update currentImage when recipe.image changes
  useEffect(() => {
    if (recipe.image && recipe.image !== currentImage) {
      setCurrentImage(recipe.image);
    }
  }, [recipe.image]);

  // Sync local servings with current servings when it changes
  useEffect(() => {
    setLocalServings(currentServings);
  }, [currentServings]);
  
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
        {currentImage && !recipe.imageLoading ? (
          <div className="relative w-full aspect-[4/3] sm:aspect-[3/2] lg:aspect-[16/9] bg-gradient-to-br from-orange-400 to-orange-600 rounded-t-xl overflow-hidden">
            <img 
              src={currentImage} 
              alt={recipe.title}
              className="w-full h-full object-cover"
              loading="eager"
              style={{ objectPosition: 'center' }}
              onLoad={() => {
                console.log('✅ Image loaded successfully:', currentImage);
                setImageLoading(false); // Clear loading state when image loads
                // Scroll to absolute top after image loads
                window.scrollTo(0, 0);
                document.documentElement.scrollTop = 0;
                document.body.scrollTop = 0;
              }}
              onError={(e) => {
                console.log('❌ Image failed to load:', currentImage);
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
            <div className="absolute top-2 right-2 flex items-center gap-0.5 sm:gap-1 md:gap-2 flex-wrap z-10">
              <SaveButton />
              
              <Button
                onClick={handleCopyIngredients}
                size="sm"
                variant="secondary"
                className="bg-black/40 hover:bg-black/60 text-white backdrop-blur-md shadow-lg hover:shadow-xl transition-all duration-200 px-1.5 py-1 sm:px-2 sm:py-1.5 md:px-3 md:py-2 text-xs relative z-20 cursor-pointer"
                style={{ pointerEvents: 'auto' }}
              >
                <Copy className="w-3 h-3 sm:w-4 sm:h-4 mr-0.5 sm:mr-1" />
                <span className="text-xs font-medium">Copy</span>
              </Button>
              
              <Button
                onClick={handleReroll}
                disabled={isRerolling || !generationParams}
                size="sm"
                variant="secondary"
                className="bg-orange-500/80 hover:bg-orange-500/90 text-white backdrop-blur-md shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-70 px-1.5 py-1 sm:px-2 sm:py-1.5 md:px-3 md:py-2 text-xs relative z-20 cursor-pointer"
                style={{ pointerEvents: 'auto' }}
              >
                {isRerolling ? (
                  <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 animate-spin mr-0.5 sm:mr-1" />
                ) : (
                  <RefreshCw className="w-3 h-3 sm:w-4 sm:h-4 mr-0.5 sm:mr-1" />
                )}
                <span className="text-xs font-medium">Reroll</span>
              </Button>
              
              <Button
                onClick={handleStartAgain}
                size="sm"
                variant="secondary"
                className="bg-black/40 hover:bg-black/60 text-white backdrop-blur-md shadow-lg hover:shadow-xl transition-all duration-200 px-1.5 py-1 sm:px-2 sm:py-1.5 md:px-3 md:py-2 text-xs relative z-20 cursor-pointer"
                style={{ pointerEvents: 'auto' }}
              >
                <RotateCcw className="w-3 h-3 sm:w-4 sm:h-4 mr-0.5 sm:mr-1" />
                <span className="text-xs font-medium">Start Over</span>
              </Button>
            </div>
          </div>
        ) : (
          <div className="relative w-full aspect-[4/3] sm:aspect-[3/2] lg:aspect-[16/9] bg-gradient-to-br from-orange-400 to-orange-600 rounded-t-xl overflow-hidden flex items-center justify-center">
            <div className="text-center p-6 text-white">
              <h1 className="font-bold text-lg sm:text-xl md:text-2xl lg:text-3xl leading-tight break-words mb-2">
                {recipe.title}
              </h1>
              <div className="mt-4 text-xs text-white/60 animate-pulse">
              {isRerolling ? "🔄 Creating new recipe and image..." : "✨ Generating beautiful food image..."}
            </div>
            </div>
            
            {/* Action Buttons - Top Right Corner (for no image state) */}
            <div className="absolute top-2 right-2 flex items-center gap-0.5 sm:gap-1 md:gap-2 flex-wrap z-10">
              <SaveButton />
              
              <Button
                onClick={handleCopyIngredients}
                size="sm"
                variant="secondary"
                className="bg-black/40 hover:bg-black/60 text-white backdrop-blur-md shadow-lg hover:shadow-xl transition-all duration-200 px-1.5 py-1 sm:px-2 sm:py-1.5 md:px-3 md:py-2 text-xs relative z-20 cursor-pointer"
                style={{ pointerEvents: 'auto' }}
              >
                <Copy className="w-3 h-3 sm:w-4 sm:h-4 mr-0.5 sm:mr-1" />
                <span className="text-xs font-medium">Copy</span>
              </Button>
              
              <Button
                onClick={handleReroll}
                disabled={isRerolling || !generationParams}
                size="sm"
                variant="secondary"
                className="bg-orange-500/80 hover:bg-orange-500/90 text-white backdrop-blur-md shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-70 px-1.5 py-1 sm:px-2 sm:py-1.5 md:px-3 md:py-2 text-xs relative z-20 cursor-pointer"
                style={{ pointerEvents: 'auto' }}
              >
                {isRerolling ? (
                  <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 animate-spin mr-0.5 sm:mr-1" />
                ) : (
                  <RefreshCw className="w-3 h-3 sm:w-4 sm:h-4 mr-0.5 sm:mr-1" />
                )}
                <span className="text-xs font-medium">Reroll</span>
              </Button>
              
              <Button
                onClick={handleStartAgain}
                size="sm"
                variant="secondary"
                className="bg-black/40 hover:bg-black/60 text-white backdrop-blur-md shadow-lg hover:shadow-xl transition-all duration-200 px-1.5 py-1 sm:px-2 sm:py-1.5 md:px-3 md:py-2 text-xs relative z-20 cursor-pointer"
                style={{ pointerEvents: 'auto' }}
              >
                <RotateCcw className="w-3 h-3 sm:w-4 sm:h-4 mr-0.5 sm:mr-1" />
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

        {/* Servings Slider */}
        <div className="space-y-4">
          <div className="text-center">
            <Badge variant="secondary" className="bg-orange-500/20 text-orange-200 px-4 py-2 text-lg border border-orange-400/30">
              Serves {localServings}
            </Badge>
          </div>
          
          <div className="max-w-xs mx-auto space-y-3">
            <div className="flex items-center gap-4">
              <span className="text-sm text-slate-400 min-w-[20px]">1</span>
              <Slider
                value={[localServings]}
                onValueChange={(value) => {
                  const newServings = value[0];
                  setLocalServings(newServings);
                  
                  // Update the recipe store immediately for live ingredient scaling
                  const recipeStore = useRecipeStore.getState();
                  useRecipeStore.setState({
                    ...recipeStore,
                    servings: newServings
                  });
                  
                  if (onServingsChange) {
                    onServingsChange(newServings);
                  }
                }}
                min={1}
                max={12}
                step={1}
                className="flex-1"
              />
              <span className="text-sm text-slate-400 min-w-[20px]">12</span>
            </div>
            <div className="text-center">
              <span className="text-xs text-slate-500">Adjust servings to scale ingredients</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}