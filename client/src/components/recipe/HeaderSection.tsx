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
          variant: "destructive",
        });
      } else {
        toast({
          title: "Failed to save recipe",
          description: error.message || "Please try again",
          variant: "destructive",
        });
      }
    }
  });
  
  return (
    <Button
      onClick={() => saveMutation.mutate()}
      disabled={saveMutation.isPending || isSaved}
      size="sm"
      variant="secondary"
      className={`bg-black/40 hover:bg-black/60 text-white backdrop-blur-md shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-70 px-1.5 py-1 sm:px-2 sm:py-1.5 md:px-3 md:py-2 text-xs relative z-20 cursor-pointer ${
        isSaved ? 'bg-green-600/80 hover:bg-green-600/80' : ''
      }`}
      style={{ pointerEvents: 'auto' }}
    >
      {saveMutation.isPending ? (
        <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 animate-spin mr-0.5 sm:mr-1" />
      ) : isSaved ? (
        <Heart className="w-3 h-3 sm:w-4 sm:h-4 mr-0.5 sm:mr-1 fill-current" />
      ) : (
        <BookOpen className="w-3 h-3 sm:w-4 sm:h-4 mr-0.5 sm:mr-1" />
      )}
      <span className="text-xs font-medium">
        {isSaved ? 'Saved' : saveMutation.isPending ? 'Saving...' : 'Save'}
      </span>
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
  const [imagePollingId, setImagePollingId] = useState<string | null>(null);
  const { toast } = useToast();
  const generationParams = useRecipeStore((state) => state.generationParams);
  const updateActiveRecipe = useRecipeStore((state) => state.updateActiveRecipe);
  const setImageLoading = useRecipeStore((state) => state.setImageLoading);
  const activeRecipe = useRecipeStore((state) => state);
  
  // Check if recipe has tempRecipeId for parallel image polling
  useEffect(() => {
    const recipeWithTempId = recipe as any;
    if (recipeWithTempId?.tempRecipeId && !currentImage) {
      setImagePollingId(recipeWithTempId.tempRecipeId.toString());
      setImageLoading(true);
    }
  }, [recipe]);

  // Poll for parallel image generation
  useEffect(() => {
    if (!imagePollingId) return;

    const pollForImage = async () => {
      try {
        const response = await apiRequest("GET", `/api/recipe-image/${imagePollingId}`);
        if (!response.ok) return;
        
        const data = await response.json();
        
        if (data.status === 'ready' && data.imageUrl) {
          console.log('✅ Parallel image ready:', data.imageUrl);
          setCurrentImage(data.imageUrl);
          setImageLoading(false);
          setImagePollingId(null);
        } else if (data.status === 'expired') {
          console.log('⏰ Image generation expired');
          setImageLoading(false);
          setImagePollingId(null);
        }
        // If status is 'generating', continue polling
      } catch (error) {
        console.error('Image polling error:', error);
        setImageLoading(false);
        setImagePollingId(null);
      }
    };

    // Poll every 2 seconds
    const interval = setInterval(pollForImage, 2000);
    
    // Initial poll
    pollForImage();
    
    // Cleanup
    return () => clearInterval(interval);
  }, [imagePollingId]);

  // Update local state when recipe image changes
  useEffect(() => {
    setCurrentImage(recipe.image);
  }, [recipe.image]);

  const fastFacts = useMemo(() => {
    const cookTimeStr = typeof recipe.cookTime === 'number' 
      ? `${recipe.cookTime}m` 
      : recipe.cookTime;
    
    return [
      { icon: Clock, label: cookTimeStr },
      { icon: Users, label: `${currentServings} servings` },
      { icon: ChefHat, label: recipe.difficulty }
    ];
  }, [recipe.cookTime, recipe.difficulty, currentServings]);

  const handleCopyIngredients = async () => {
    try {
      const ingredients = activeRecipe.ingredients
        .map((ing: any) => ing.text || ing)
        .join('\n');
      
      await navigator.clipboard.writeText(ingredients);
      toast({
        title: "Ingredients copied!",
        description: "Recipe ingredients copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Copy failed",
        description: "Could not copy to clipboard",
        variant: "destructive",
      });
    }
  };

  const handleStartAgain = () => {
    navigate('/');
  };

  const handleReroll = async () => {
    if (!generationParams || isRerolling) return;
    
    setIsRerolling(true);
    
    try {
      updateActiveRecipe({
        ...useRecipeStore.getState(),
        meta: {
          ...useRecipeStore.getState().meta,
          image: undefined,
          imageLoading: true
        }
      }, generationParams);
      
      const { mode, originalInputs } = generationParams;
      
      if (mode === 'shopping') {
        const response = await apiRequest("POST", "/api/generate-shopping-recipe", {
          ...originalInputs,
          isReroll: true
        });
        
        if (!response.ok) {
          throw new Error(`Failed to generate recipe: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.recipe) {
          console.log('🔄 Reroll successful, navigating to new recipe');
          window.scrollTo(0, 0);
        } else {
          throw new Error("No recipe data received");
        }
      }
    } catch (error: any) {
      console.error('Error rerolling recipe:', error);
      
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
      setImageLoading(false);
    }
  };

  return (
    <div className="relative">
      {/* Recipe header anchor for scroll targeting */}
      <div id="recipe-header-top"></div>
      
      {/* Hero Image - Mobile First Design */}
      <div className="relative w-full">
        {/* Image Container - Always Visible */}
        <div className="relative w-full aspect-[4/3] sm:aspect-[3/2] lg:aspect-[16/9] bg-gradient-to-br from-orange-400 to-orange-600 rounded-t-xl overflow-hidden">
          {currentImage && !recipe.imageLoading ? (
            /* Actual Image */
            <motion.img 
              src={currentImage} 
              alt={recipe.title}
              className="w-full h-full object-cover"
              loading="eager"
              style={{ objectPosition: 'center' }}
              initial={{ opacity: 0, scale: 1.05 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              onLoad={() => {
                console.log('✅ Image loaded successfully:', currentImage);
                setImageLoading(false);
                window.scrollTo(0, 0);
                document.documentElement.scrollTop = 0;
                document.body.scrollTop = 0;
              }}
              onError={(e) => {
                console.log('❌ Image failed to load:', currentImage);
                setImageLoading(false);
                e.currentTarget.style.display = 'none';
                const container = e.currentTarget.parentElement;
                if (container) {
                  container.style.background = 'linear-gradient(to bottom right, #fb923c, #ea580c)';
                }
              }}
            />
          ) : (
            /* Elegant Loading Placeholder */
            <div className="w-full h-full relative bg-gradient-to-br from-orange-300 to-orange-500">
              {/* Shimmer Effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse"></div>
              
              {/* Loading Content */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center text-white/90 px-4">
                  <motion.div 
                    className="inline-block"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  >
                    <ChefHat className="w-8 h-8 sm:w-10 sm:h-10 mb-3" />
                  </motion.div>
                  
                  <motion.p 
                    className="text-sm sm:text-base font-medium"
                    animate={{ opacity: [1, 0.6, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                  >
                    Creating your recipe image...
                  </motion.p>
                </div>
              </div>
              
              {/* Subtle gradient overlay for text readability */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
            </div>
          )}
          
          {/* Overlay for mobile readability - always present */}
          {currentImage && <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent sm:bg-black/30" />}
          
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
        <div className="mt-3 md:mt-4">
          <div className="flex items-center gap-3 mb-2">
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
  );
}