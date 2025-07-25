import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { PageLayout } from "@/components/PageLayout";
import { EnhancedRecipeCard } from "@/components/recipe/EnhancedRecipeCard";
import ChatBot from "@/components/ChatBot";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { MessageCircle } from "lucide-react";
import { useRecipeStore } from "@/stores/recipeStore";

export default function Recipe() {
  const [location, navigate] = useLocation();
  const [showChat, setShowChat] = useState(false);
  const recipeStore = useRecipeStore();
  
  // Check if we have recipe data in the store
  const hasRecipe = recipeStore.meta.title && recipeStore.ingredients.length > 0;
  const shouldShowRecipe = hasRecipe && (!recipeStore.meta.imageLoading || recipeStore.meta.image);
  
  // Debug logging
  useEffect(() => {
    console.log('🧪 Recipe page loaded with:', {
      hasRecipe,
      showChat,
      recipeTitle: recipeStore.meta.title,
      ingredientsCount: recipeStore.ingredients.length
    });
  }, [hasRecipe, showChat, recipeStore.meta.title, recipeStore.ingredients.length]);
  
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

  if (!hasRecipe) {
    return null;
  }

  // Show loading if recipe is present but image is still loading
  if (!shouldShowRecipe) {
    return (
      <PageLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="animate-pulse mb-4">
              <div className="w-32 h-32 bg-orange-200 rounded-full mx-auto mb-4 flex items-center justify-center">
                <span className="text-4xl">🍽️</span>
              </div>
            </div>
            <h2 className="text-xl font-semibold text-slate-700 mb-2">
              Preparing your recipe...
            </h2>
            <p className="text-slate-500 text-sm">
              Generating beautiful food image
            </p>
          </div>
        </div>
      </PageLayout>
    );
  }

  // Try to fetch image if not already present
  const [recipeImage, setRecipeImage] = useState(recipeStore.meta.image || '');
  const [imageLoadAttempts, setImageLoadAttempts] = useState(0);
  
  useEffect(() => {
    // If no image is present, try to fetch one based on recipe title
    if (!recipeImage && recipeStore.meta.title && imageLoadAttempts < 5) {
      const pollForImage = async () => {
        try {
          console.log('🖼️ Polling for image (attempt', imageLoadAttempts + 1, '):', recipeStore.meta.title);
          const response = await fetch(`/api/recipe-image/${encodeURIComponent(recipeStore.meta.title)}`);
          if (response.ok) {
            const data = await response.json();
            if (data.imageUrl) {
              console.log('🖼️ Image found:', data.imageUrl);
              setRecipeImage(data.imageUrl);
              // Also update the recipe store via the patchRecipe method
              recipeStore.patchRecipe({
                meta: {
                  ...recipeStore.meta,
                  image: data.imageUrl,
                  imageLoading: false
                }
              });
              return; // Stop polling
            }
          } else {
            console.log('🖼️ Image not ready yet');
          }
          
          // Schedule next attempt
          setImageLoadAttempts(prev => prev + 1);
          if (imageLoadAttempts < 4) {
            setTimeout(pollForImage, 3000); // Try again in 3 seconds
          }
        } catch (error) {
          console.log('🖼️ Image polling failed:', error);
          setImageLoadAttempts(prev => prev + 1);
        }
      };
      
      // Start polling after a short delay
      setTimeout(pollForImage, 2000);
    }
  }, [recipeStore.meta.title, recipeImage, imageLoadAttempts]);
  
  // Also check if the store has been updated with an image
  useEffect(() => {
    if (recipeStore.meta.image && !recipeImage) {
      setRecipeImage(recipeStore.meta.image);
    }
  }, [recipeStore.meta.image, recipeImage]);

  // Create activeRecipe object from store data for EnhancedRecipeCard
  const activeRecipe = {
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

  return (
    <>
      <PageLayout className="max-w-7xl mx-auto">
        <div className="w-full">
          {/* Recipe Card - Full Width */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full"
          >
            <EnhancedRecipeCard 
              recipe={activeRecipe}
            />
          </motion.div>
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
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 20 }}
              className="w-screen sm:w-[400px] h-full bg-slate-900 shadow-2xl flex flex-col"
            >
              <ChatBot 
                isOpen={showChat}
                onClose={() => setShowChat(false)}
                currentRecipe={activeRecipe as any}
                onRecipeUpdate={(updatedRecipe) => {
                  console.log('Recipe updated from ChatBot:', updatedRecipe);
                }}
              />
            </motion.div>
          </div>
        </div>
      )}

      {/* Floating Chat Button - Fixed above mobile nav */}
      {!showChat && (
        <div
          className="fixed right-4"
          style={{
            position: 'fixed',
            bottom: '80px', // Above mobile navigation
            right: '16px',
            zIndex: 50,
            pointerEvents: 'auto'
          }}
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.5, type: "spring" }}
          >
            <Button
              onClick={() => {
                console.log('🔥 Chat button clicked! Current showChat:', showChat);
                setShowChat(!showChat);
              }}
              className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-lg w-12 h-12 rounded-full p-0 relative group"
            >
              <MessageCircle className="w-5 h-5" />
              
              {/* Tooltip */}
              <div className="absolute bottom-full right-0 mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                <div className="bg-slate-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                  Chat with Zest
                </div>
              </div>
            </Button>
          </motion.div>
        </div>
      )}
    </>
  );
}