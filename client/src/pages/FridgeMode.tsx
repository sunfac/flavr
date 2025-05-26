import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import GlobalHeader from "@/components/GlobalHeader";
import GlobalFooter from "@/components/GlobalFooter";
import GlobalNavigation from "@/components/GlobalNavigation";
import SettingsPanel from "@/components/SettingsPanel";
import UserMenu from "@/components/UserMenu";
import SlideQuizShell from "@/components/SlideQuizShell";
import { fridgeQuestions } from "@/config/fridgeQuestions";
import RecipeCard from "@/components/RecipeCard";
import ChatBot from "@/components/ChatBot";
import Loading from "@/components/Loading";
import { checkQuotaBeforeGPT, getRemainingRecipes } from "@/lib/quotaManager";
import { apiRequest } from "@/lib/queryClient";
import AuthModal from "@/components/AuthModal";
import { Clock } from "lucide-react";

export default function FridgeMode() {
  const [, navigate] = useLocation();
  const [currentStep, setCurrentStep] = useState<"quiz" | "suggestions" | "recipe">("quiz");
  const [quizData, setQuizData] = useState<any>(null);
  const [recipeIdeas, setRecipeIdeas] = useState<any[]>([]);
  const [selectedRecipe, setSelectedRecipe] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showGate, setShowGate] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showNavigation, setShowNavigation] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

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
    // Transform quiz data
    const transformedData = {
      ingredients: data.ingredients || [],
      vibe: data.vibe || "",
      cuisines: data.cuisines || [],
      time: data.time || 30,
      dietary: data.dietary || [],
      equipment: data.equipment || [],
      ambition: data.ambition || 3
    };

    setQuizData(transformedData);

    // Check global quota before proceeding with GPT
    const allowed = await checkQuotaBeforeGPT();
    if (!allowed) {
      setShowAuthModal(true);
      return;
    }

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

      // Generate recipe ideas using the global quota system
      const response = await apiRequest("POST", "/api/recipe-ideas", {
        mode: "fridge",
        quizData: transformedData,
        prompt: `Generate recipe ideas for fridge mode with ingredients: ${transformedData.ingredients.join(', ')}, vibe: ${transformedData.vibe}`
      });

      if (response.ok) {
        const result = await response.json();
        setRecipeIdeas(result.ideas || []);
      } else {
        // Fallback recipes for fridge mode
        setRecipeIdeas([
          {
            title: "Quick Vegetable Stir-Fry",
            description: "Use whatever vegetables you have on hand with garlic and soy sauce."
          },
          {
            title: "Simple Pasta Dish",
            description: "Combine available ingredients with pasta for a satisfying meal."
          }
        ]);
      }
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

  const handleAuthSuccess = () => {
    setShowAuthModal(false);
    // Refresh user data after successful auth
    window.location.reload();
  };

  return (
    <div className="min-h-screen">
      {/* Consistent header across all modes */}
      <GlobalHeader 
        onMenuClick={() => setShowNavigation(true)}
        onSettingsClick={() => setShowSettings(true)}
        onUserClick={() => setShowUserMenu(true)}
      />
      
      {/* Recipe Remaining Banner - positioned below header */}
      {!isAuthenticated && (
        <div className="w-full bg-card/90 backdrop-blur-sm border-b border-border">
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span>{getRemainingRecipes()} free recipes remaining</span>
            </div>
          </div>
        </div>
      )}
      
      <main>
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
      
      {/* Consistent footer across all modes */}
      <GlobalFooter currentMode="fridge" />

      {/* Navigation overlays */}
      {showNavigation && (
        <GlobalNavigation onClose={() => setShowNavigation(false)} />
      )}
      
      {showSettings && (
        <SettingsPanel onClose={() => setShowSettings(false)} />
      )}
      
      {showUserMenu && (
        <UserMenu onClose={() => setShowUserMenu(false)} />
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
