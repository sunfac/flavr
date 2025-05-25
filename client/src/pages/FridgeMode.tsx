import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SlideQuizShell from "@/components/SlideQuizShell";
import { fridgeQuestions } from "@/config/fridgeQuestions";
import RecipeCard from "@/components/RecipeCard";
import ChatBot from "@/components/ChatBot";
import Loading from "@/components/Loading";
import FlavrPlusGate from "@/components/FlavrPlusGate";
import { useFlavrGate } from "@/hooks/useFlavrGate";
import { api } from "@/lib/api";
import AuthModal from "@/components/AuthModal";

export default function FridgeMode() {
  const [, navigate] = useLocation();
  const [currentStep, setCurrentStep] = useState<"quiz" | "suggestions" | "recipe">("quiz");
  const [quizData, setQuizData] = useState<any>(null);
  const [recipeIdeas, setRecipeIdeas] = useState<any[]>([]);
  const [selectedRecipe, setSelectedRecipe] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showGate, setShowGate] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  const { canGenerateRecipe } = useFlavrGate();

  // Check if user is logged in
  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ["/api/me"],
    retry: false,
  });

  if (userLoading) {
    return <Loading message="Loading your profile..." />;
  }

  // Allow users to try the quiz without authentication
  const isAuthenticated = user?.user;

  const handleQuizComplete = async (data: any) => {
    try {
      setIsLoading(true);
      
      // Transform SlideQuizShell data to match expected API format
      const transformedData = {
        ingredients: data.ingredients?.split(',').map((i: string) => i.trim()) || [],
        vibe: data.vibe,
        cuisines: data.cuisines || [],
        time: data.time || 30,
        dietary: data.dietary || [],
        equipment: data.equipment || [],
        ambition: data.ambition || 3
      };

      setQuizData(transformedData);

      // Generate recipe ideas immediately
      const response = await api.generateRecipeIdeas({
        mode: "fridge",
        quizData: transformedData,
        prompt: `Generate recipe ideas for fridge mode with ingredients: ${transformedData.ingredients.join(', ')}, vibe: ${transformedData.vibe}`
      });

      setRecipeIdeas(response.ideas || []);
      setCurrentStep("suggestions");
    } catch (error) {
      console.error("Failed to generate recipe ideas:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRecipeSelect = (recipe: any) => {
    if (!canGenerateRecipe(user.user)) {
      setShowGate(true);
      return;
    }
    setSelectedRecipe(recipe);
    setCurrentStep("recipe");
  };

  const handleNewSearch = () => {
    setCurrentStep("quiz");
    setQuizData(null);
    setRecipeIdeas([]);
    setSelectedRecipe(null);
  };

  const handleBackToSuggestions = () => {
    setCurrentStep("suggestions");
    setSelectedRecipe(null);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header currentMode="fridge" />
      
      <main className="pb-20">
        {currentStep === "quiz" && (
          <SlideQuizShell
            title="Fridge to Fork Quiz"
            questions={fridgeQuestions}
            onSubmit={handleQuizComplete}
            onLoading={setIsLoading}
            theme="fridge"
          />
        )}

        {currentStep === "suggestions" && (
          <div className="p-4 space-y-4">
            <div className="text-center">
              <h2 className="text-xl font-playfair font-bold text-foreground mb-1">
                Made with your ingredients
              </h2>
              <p className="text-muted-foreground text-sm">
                Swipe to explore • Tap to see full recipe
              </p>
            </div>

            <div className="swipe-container flex space-x-4 overflow-x-auto pb-4">
              {recipeIdeas.map((recipe, index) => (
                <RecipeCard
                  key={index}
                  recipe={recipe}
                  onClick={() => handleRecipeSelect(recipe)}
                />
              ))}
            </div>

            <button
              onClick={handleNewSearch}
              className="w-full bg-muted text-foreground py-3 rounded-xl font-medium hover:bg-muted/80 transition-colors"
            >
              <i className="fas fa-redo mr-2"></i>Try Different Ingredients
            </button>
          </div>
        )}

        {currentStep === "recipe" && selectedRecipe && (
          <div className="bg-background min-h-screen">
            <RecipeCard
              recipe={selectedRecipe}
              mode="fridge"
              quizData={quizData}
              isFullView={true}
              onBack={handleBackToSuggestions}
            />
          </div>
        )}

        {isLoading && (
          <Loading message="Finding recipes with your ingredients..." />
        )}

        {showGate && (
          <FlavrPlusGate onClose={() => setShowGate(false)} />
        )}
      </main>

      <ChatBot />
      <Footer currentMode="fridge" />
    </div>
  );
}
