import { useState, useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import { PageLayout } from "@/components/PageLayout";
import { EnhancedRecipeCard } from "@/components/recipe/EnhancedRecipeCard";
import RecipeChat from "@/components/RecipeChat";

import { Button } from "@/components/ui/button";
import { MessageCircle } from "lucide-react";
import { useRecipeStore } from "@/stores/recipeStore";

export default function Recipe() {
  const [location, navigate] = useLocation();
  const [showChat, setShowChat] = useState(false);
  const recipeStore = useRecipeStore();
  
  // ALL hooks must be declared at the top before any conditional returns
  const [recipeImage, setRecipeImage] = useState(recipeStore.meta.image || '');
  const [imageLoadAttempts, setImageLoadAttempts] = useState(0);
  
  // Check if we have recipe data in the store
  const hasRecipe = recipeStore.meta.title && recipeStore.ingredients.length > 0;
  // Don't show loading screen if we already have a recipe (even if image is loading)
  const shouldShowRecipe = hasRecipe;
  
  // Create activeRecipe object from store data for EnhancedRecipeCard
  const activeRecipe = useMemo(() => {
    console.log('🔍 Building activeRecipe from store:', {
      storeId: recipeStore.id,
      title: recipeStore.meta.title,
      ingredientsCount: recipeStore.ingredients.length,
      stepsCount: recipeStore.steps.length,
      rawIngredients: recipeStore.ingredients.slice(0, 2), // First 2 for debugging
      rawSteps: recipeStore.steps.slice(0, 2) // First 2 for debugging
    });
    
    return {
      id: recipeStore.id || '1',
      title: recipeStore.meta.title,
      description: recipeStore.meta.description || '',
      cuisine: recipeStore.meta.cuisine || '',
      difficulty: recipeStore.meta.difficulty,
      cookTime: recipeStore.meta.cookTime,
      prepTime: 15, // Default prep time
      servings: recipeStore.servings,
      image: recipeImage || recipeStore.meta.image || '',
      ingredients: recipeStore.ingredients.map(ing => ing.text || ''), // Convert to string array
      instructions: recipeStore.steps.map(step => step.description || ''), // Convert to string array
      tips: "Try garnishing with fresh herbs for extra flavor!" // Default tip
    };
  }, [
    recipeStore.id,
    recipeStore.meta.title,
    recipeStore.meta.cuisine,
    recipeStore.meta.cookTime,
    recipeStore.meta.difficulty,
    recipeStore.servings,
    recipeStore.ingredients,
    recipeStore.steps,
    recipeImage
  ]);
  
  // Debug logging - only log once when recipe loads
  useEffect(() => {
    if (hasRecipe) {
      console.log('🧪 Recipe page loaded with:', {
        hasRecipe,
        showChat,
        recipeTitle: recipeStore.meta.title,
        ingredientsCount: recipeStore.ingredients.length
      });
    }
  }, [recipeStore.meta.title]); // Only depend on title to avoid constant re-renders
  
  useEffect(() => {
    if (!hasRecipe) {
      // No recipe in store, redirect to mode selection
      navigate("/app");
    } else {
      // Scroll to top when recipe loads
      window.scrollTo(0, 0);
    }
  }, [hasRecipe, navigate]);

  // Listen for custom event to open chat
  useEffect(() => {
    const handleOpenChat = () => {
      setShowChat(true);
    };
    window.addEventListener('openChat', handleOpenChat);
    return () => window.removeEventListener('openChat', handleOpenChat);
  }, []);

  // Simple image sync - no polling to avoid flickering
  useEffect(() => {
    if (recipeStore.meta.image) {
      setRecipeImage(recipeStore.meta.image);
    }
  }, [recipeStore.meta.image]);

  // ALL HOOKS DECLARED ABOVE - NOW SAFE FOR CONDITIONAL RETURNS
  
  if (!hasRecipe) {
    return null;
  }

  return (
    <>
      <PageLayout className="max-w-7xl mx-auto">
        <div className="w-full">
          {/* Recipe Card - Full Width */}
          <div className="w-full">
            <EnhancedRecipeCard 
              recipe={activeRecipe}
            />
          </div>
        </div>
      </PageLayout>

      {/* Chat Panel - Slide-out Drawer */}
      {showChat && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/60"
            onClick={() => setShowChat(false)}
          />
          
          {/* Chat Panel Container */}
          <div className="relative ml-auto h-full">
            <div className="w-screen sm:w-[400px] h-full bg-slate-900 shadow-2xl flex flex-col">
              <RecipeChat 
                isOpen={showChat}
                onClose={() => setShowChat(false)}
                currentRecipe={activeRecipe as any}
                onRecipeUpdate={(updatedRecipe) => {
                  console.log('Recipe updated from RecipeChat:', updatedRecipe);
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Floating Chat Button - Fixed above mobile nav */}
      {!showChat && (
        <Button
          onClick={() => {
            console.log('🔥 Chat button clicked! Current showChat:', showChat);
            setShowChat(!showChat);
          }}
          className="fixed bottom-20 right-4 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-lg w-12 h-12 rounded-full p-0 z-50"
          style={{
            zIndex: 100
          }}
          data-testid="button-open-chat"
        >
          <MessageCircle className="w-5 h-5" />
        </Button>
      )}
    </>
  );
}