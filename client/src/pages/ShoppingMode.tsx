import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SlideQuizShell from "@/components/SlideQuizShell";
import { shoppingQuestions } from "@/config/shoppingQuestions";
import RecipeCard from "@/components/RecipeCard";
import ChatBot from "@/components/ChatBot";
import Loading from "@/components/Loading";
import FlavrPlusGate from "@/components/FlavrPlusGate";
import { useFlavrGate } from "@/hooks/useFlavrGate";
import { api } from "@/lib/api";

export default function ShoppingMode() {
  const [, navigate] = useLocation();
  const [currentStep, setCurrentStep] = useState<"quiz" | "suggestions" | "recipe">("quiz");
  const [quizData, setQuizData] = useState<any>(null);
  const [recipeIdeas, setRecipeIdeas] = useState<any[]>([]);
  const [selectedRecipe, setSelectedRecipe] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showGate, setShowGate] = useState(false);

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
    // Transform SlideQuizShell data to match expected API format
    const transformedData = {
      mood: data.mood,
      cuisine: data.cuisine || [],
      time: data.time || 30,
      budget: data.budget,
      dietary: data.dietary || [],
      equipment: data.equipment || [],
      ambition: data.ambition || 3,
      supermarket: data.supermarket
    };

    setQuizData(transformedData);

    if (!isAuthenticated) {
      // Show suggestions step with login prompt for unauthenticated users
      setCurrentStep("suggestions");
      return;
    }

    try {
      setIsLoading(true);

      // Generate recipe ideas for authenticated users
      const response = await api.generateRecipeIdeas({
        mode: "shopping",
        quizData: transformedData,
        prompt: `Generate recipe ideas for shopping mode with mood: ${transformedData.mood}, budget: ${transformedData.budget}`
      });

      setRecipeIdeas(response.ideas || []);
      setCurrentStep("suggestions");
    } catch (error) {
      console.error("Failed to generate recipe ideas:", error);
      setCurrentStep("suggestions");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRecipeSelect = (recipe: any) => {
    if (!isAuthenticated) {
      // Show login prompt for unauthenticated users
      navigate("/");
      return;
    }
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
      <Header currentMode="shopping" />
      
      <main className="pb-20">
        {currentStep === "quiz" && (
          <SlideQuizShell
            title="Shopping Mode Quiz"
            questions={shoppingQuestions}
            onSubmit={handleQuizComplete}
            onLoading={setIsLoading}
            theme="shopping"
          />
        )}

        {currentStep === "suggestions" && (
          <div className="p-4 space-y-4">
            {!isAuthenticated ? (
              <div className="max-w-md mx-auto text-center space-y-6 pt-8">
                <div className="space-y-3">
                  <h2 className="text-2xl font-bold text-foreground">
                    Your personalized recipes are ready!
                  </h2>
                  <p className="text-muted-foreground">
                    Based on your preferences, we've created amazing recipes just for you. Sign up to see them and start cooking!
                  </p>
                </div>
                
                <div className="bg-gradient-to-r from-primary/10 to-secondary/10 rounded-lg p-6 space-y-4">
                  <div className="text-sm text-muted-foreground">
                    <div className="font-medium">Your quiz results:</div>
                    <div className="mt-2 space-y-1">
                      <div>• Mood: {quizData?.mood}</div>
                      <div>• Budget: {quizData?.budget}</div>
                      <div>• Time: {quizData?.time} minutes</div>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => navigate("/")}
                  className="w-full h-12 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 transition-colors"
                >
                  Sign Up to See Your Recipes
                </button>
              </div>
            ) : (
              <>
                <div className="text-center">
                  <h2 className="text-xl font-playfair font-bold text-foreground mb-1">
                    Perfect matches for you
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
              </>
            )}

            <button
              onClick={handleNewSearch}
              className="w-full bg-muted text-foreground py-3 rounded-xl font-medium hover:bg-muted/80 transition-colors"
            >
              <i className="fas fa-redo mr-2"></i>Try Different Preferences
            </button>
          </div>
        )}

        {currentStep === "recipe" && selectedRecipe && (
          <div className="bg-background min-h-screen">
            {/* Recipe content will be handled by RecipeCard component in full view mode */}
            <RecipeCard
              recipe={selectedRecipe}
              mode="shopping"
              quizData={quizData}
              isFullView={true}
              onBack={handleBackToSuggestions}
            />
          </div>
        )}

        {isLoading && (
          <Loading message="Creating your perfect recipe..." />
        )}

        {showGate && (
          <FlavrPlusGate onClose={() => setShowGate(false)} />
        )}
      </main>

      <ChatBot />
      <Footer currentMode="shopping" />
    </div>
  );
}
