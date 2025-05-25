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
import AuthModal from "@/components/AuthModal";

export default function ShoppingMode() {
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
      // Show auth modal for unauthenticated users
      setShowAuthModal(true);
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

  const handleAuthSuccess = async () => {
    // After successful login/signup, generate recipes with stored quiz data
    if (quizData) {
      try {
        setIsLoading(true);
        const response = await api.generateRecipeIdeas({
          mode: "shopping",
          quizData: quizData,
          prompt: `Generate recipe ideas for shopping mode with mood: ${quizData.mood}, budget: ${quizData.budget}`
        });
        setRecipeIdeas(response.ideas || []);
        setCurrentStep("suggestions");
      } catch (error) {
        console.error("Failed to generate recipe ideas:", error);
        setCurrentStep("suggestions");
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleBackToSuggestions = () => {
    setCurrentStep("suggestions");
    setSelectedRecipe(null);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Only show header/footer when not in quiz mode */}
      {currentStep !== "quiz" && <Header currentMode="shopping" />}
      
      <main className={currentStep !== "quiz" ? "pb-20" : ""}>
        {currentStep === "quiz" && (
          <SlideQuizShell
            title="Shopping Mode"
            questions={shoppingQuestions}
            onSubmit={handleQuizComplete}
            theme="shopping"
          />
        )}

        {currentStep === "suggestions" && (
          <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-black text-white p-6">
            <div className="max-w-md mx-auto">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold bg-gradient-to-r from-orange-400 to-amber-400 bg-clip-text text-transparent mb-4">
                  Perfect matches for you
                </h2>
                <p className="text-slate-300 text-lg">
                  Swipe to explore • Tap to see full recipe
                </p>
              </div>

              <div className="space-y-4 mb-8">
                {recipeIdeas.map((recipe, index) => (
                  <div
                    key={index}
                    onClick={() => handleRecipeSelect(recipe)}
                    className="bg-slate-800/50 border border-slate-600 rounded-xl p-6 cursor-pointer hover:border-orange-400/50 transition-all duration-300 hover:shadow-lg hover:shadow-orange-500/25"
                  >
                    <h3 className="text-xl font-semibold text-white mb-2">{recipe.title}</h3>
                    <p className="text-slate-300 mb-3">{recipe.description}</p>
                    <div className="flex items-center text-sm text-slate-400">
                      <span className="mr-4">🕒 {recipe.cookTime || '30'} min</span>
                      <span>👥 {recipe.servings || '2-4'} servings</span>
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={handleNewSearch}
                className="w-full bg-slate-700 hover:bg-slate-600 text-white py-4 rounded-xl font-semibold transition-all duration-300 border border-slate-600 hover:border-orange-400/50"
              >
                Try Different Preferences
              </button>
            </div>
          </div>
        )}

        {currentStep === "recipe" && selectedRecipe && (
          <div className="bg-background min-h-screen">
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

      {currentStep !== "quiz" && (
        <>
          <ChatBot />
          <Footer currentMode="shopping" />
        </>
      )}

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={handleAuthSuccess}
        title="Your personalized recipes are ready!"
        description="Sign up to unlock your custom AI-generated recipes based on your preferences"
      />
    </div>
  );
}
