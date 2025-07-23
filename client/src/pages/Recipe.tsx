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
  const { activeRecipe, setActiveRecipe } = useRecipeStore();
  
  // Use activeRecipe from store as primary source
  useEffect(() => {
    if (!activeRecipe) {
      // No recipe in store, redirect to mode selection
      navigate("/app");
    }
  }, [activeRecipe, navigate]);

  if (!activeRecipe) {
    return null;
  }

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
          {showChat ? (
            <div className="sticky top-24">
              <div className="bg-card rounded-lg shadow-lg">
                <div className="p-4 border-b flex items-center justify-between">
                  <h3 className="font-semibold">Customize with Zest</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowChat(false)}
                  >
                    ×
                  </Button>
                </div>
                <div className="h-[600px]">
                  <ChatBot />
                </div>
              </div>
              
              {/* Customization Examples */}
              <div className="mt-4 p-4 bg-muted/50 rounded-lg text-sm">
                <p className="font-medium mb-2">Try asking Zest:</p>
                <ul className="space-y-1 text-muted-foreground">
                  <li>• "Make this for 10 people"</li>
                  <li>• "I have a nut allergy"</li>
                  <li>• "Make it spicier"</li>
                  <li>• "I have an hour to cook"</li>
                  <li>• "Add more vegetables"</li>
                  <li>• "Make it budget-friendly"</li>
                </ul>
              </div>
            </div>
          ) : (
            <Button
              onClick={() => setShowChat(true)}
              variant="outline"
              className="w-full"
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              Open Chat
            </Button>
          )}
        </motion.div>
      </div>
    </PageLayout>
  );
}