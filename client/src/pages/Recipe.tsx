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
                  image: data.imageUrl
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
    <PageLayout className="max-w-7xl mx-auto">


      <div className="flex flex-col lg:flex-row gap-6">
        {/* Recipe Card - Main Content */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex-1"
        >
          <EnhancedRecipeCard 
            recipe={activeRecipe}
          />
        </motion.div>


        
        {/* Desktop Chat Panel */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="hidden lg:block w-full lg:w-96"
        >
          {showChat && (
            <ChatBot 
              isOpen={showChat}
              onClose={() => setShowChat(false)}
              currentRecipe={activeRecipe as any}
              onRecipeUpdate={(updatedRecipe) => {
                // Force re-render when recipe updates
                console.log('Recipe updated from ChatBot:', updatedRecipe);
              }}
            />
          )}
        </motion.div>
      </div>

      {/* Mobile Chat Modal - Render outside of page layout */}
      {showChat && (
        <div className="lg:hidden">
          <ChatBot 
            isOpen={showChat}
            onClose={() => setShowChat(false)}
            currentRecipe={activeRecipe as any}
            onRecipeUpdate={(updatedRecipe) => {
              console.log('Recipe updated from ChatBot:', updatedRecipe);
            }}
          />
        </div>
      )}

      {/* Floating Chat Button - Only show when chat is closed */}
      {!showChat && (
        <motion.div
          className="fixed bottom-6 right-6 z-40"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 1.0, type: "spring" }}
        >
          <Button
            onClick={() => setShowChat(true)}
            className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-2xl w-14 h-14 rounded-full p-0 relative group"
          >
            <MessageCircle className="w-6 h-6" />
            
            {/* Tooltip */}
            <div className="absolute bottom-full right-0 mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
              <div className="bg-slate-900 text-white text-xs px-3 py-2 rounded-lg whitespace-nowrap">
                Customize recipe with Zest
                <div className="absolute top-full right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-slate-900"></div>
              </div>
            </div>
          </Button>
        </motion.div>
      )}
    </PageLayout>
  );
}