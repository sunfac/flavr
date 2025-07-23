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
  const [showChat, setShowChat] = useState(true);
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

  if (!hasRecipe) {
    return null;
  }

  // Create activeRecipe object from store data for EnhancedRecipeCard
  const activeRecipe = {
    id: recipeStore.id || 'recipe-1',
    title: recipeStore.meta.title,
    description: recipeStore.meta.description,
    cuisine: recipeStore.meta.cuisine,
    difficulty: recipeStore.meta.difficulty,
    cookTime: recipeStore.meta.cookTime,
    prepTime: 15, // Default prep time
    servings: recipeStore.servings,
    image: recipeStore.meta.image,
    ingredients: recipeStore.ingredients.map(ing => ing.text || ''), // Convert to string array
    instructions: recipeStore.steps.map(step => step.description || ''), // Convert to string array
    tips: [] // Default empty tips
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

        {/* Chat Panel - Modifications */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="w-full lg:w-96"
        >
          <div className="sticky top-24">
            <div className="bg-card rounded-lg shadow-lg">
              <div className="p-4 border-b">
                <h3 className="font-semibold">Chat with Zest</h3>
              </div>
              <div className="h-[600px]">
                <ChatBot />
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </PageLayout>
  );
}