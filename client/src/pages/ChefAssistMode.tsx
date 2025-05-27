import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import GlobalHeader from "@/components/GlobalHeader";
import GlobalFooter from "@/components/GlobalFooter";
import GlobalNavigation from "@/components/GlobalNavigation";
import SettingsPanel from "@/components/SettingsPanel";
import UserMenu from "@/components/UserMenu";
import SlideQuizShell from "@/components/SlideQuizShell";
import RecipeCard from "@/components/RecipeCard";
import ChatBot from "@/components/ChatBot";
import Loading from "@/components/Loading";
import { checkQuotaBeforeGPT, getRemainingRecipes } from "@/lib/quotaManager";
import { apiRequest } from "@/lib/queryClient";
import AuthModal from "@/components/AuthModal";
import { chefQuestions } from "@/config/chefQuestions";
import { Clock } from "lucide-react";

export default function ChefAssistMode() {
  const [, navigate] = useLocation();
  const [currentStep, setCurrentStep] = useState<"quiz" | "recipe">("quiz");
  const [quizData, setQuizData] = useState<any>(null);
  const [generatedRecipe, setGeneratedRecipe] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showNavigation, setShowNavigation] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  // Close all menus
  const closeAllMenus = () => {
    setShowNavigation(false);
    setShowSettings(false);
    setShowUserMenu(false);
  };

  // Open specific menu and close others
  const openMenu = (menuType: 'navigation' | 'settings' | 'userMenu') => {
    closeAllMenus();
    if (menuType === 'navigation') setShowNavigation(true);
    if (menuType === 'settings') setShowSettings(true);
    if (menuType === 'userMenu') setShowUserMenu(true);
  };

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
    // Transform quiz data for server-side processing
    const transformedData = {
      intent: data.intent,
      dietary: data.dietary || [],
      time: data.time || 60,
      ambition: data.ambition || "confidentCook",
      equipment: data.equipment || [],
      servings: data.servings || "4"
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

      // Generate recipe directly for Chef mode using the same pattern as Shopping mode
      const fetchResponse = await fetch("/api/generate-recipe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mode: "chef",
          quizData: transformedData,
          prompt: `Create a recipe for: ${transformedData.intent}`
        })
      });
      
      const response = await fetchResponse.json();
      console.log("Chef API Response:", response);
      setGeneratedRecipe(response.recipe);

      setCurrentStep("recipe");
    } catch (error) {
      console.error("Failed to generate recipe:", error);
      setCurrentStep("recipe");
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToQuiz = () => {
    setCurrentStep("quiz");
    setQuizData(null);
    setGeneratedRecipe(null);
  };

  const handleAuthSuccess = () => {
    setShowAuthModal(false);
    // Continue with recipe generation after successful auth
    if (quizData) {
      handleQuizComplete(quizData);
    }
  };

  if (isLoading) {
    return <Loading message="Creating your culinary masterpiece..." />;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <GlobalHeader 
        onMenuClick={() => openMenu('navigation')}
        onSettingsClick={() => openMenu('settings')}
        onAuthRequired={() => navigate("/")}
      />

      {/* Recipe Remaining Banner - positioned below header with proper spacing */}
      {!isAuthenticated && (
        <div className="w-full bg-card/90 backdrop-blur-sm border-b border-border mt-16 md:mt-20">
          <div className="max-w-sm mx-auto px-4 py-2">
            <div className="flex items-center justify-center gap-1.5 text-xs md:text-sm text-muted-foreground">
              <Clock className="w-3 h-3 md:w-4 md:h-4" />
              <span>{getRemainingRecipes()} free recipes remaining</span>
            </div>
          </div>
        </div>
      )}

      <main className="flex-1 pt-20 pb-24 p-4">

        {currentStep === "quiz" && (
          <SlideQuizShell
            title="Chef Assist Mode"
            subtitle="Tell me your culinary vision and I'll help you create something amazing"
            questions={chefQuestions}
            onSubmit={handleQuizComplete}
            onLoading={setIsLoading}
            theme="chef"
          />
        )}

        {currentStep === "recipe" && generatedRecipe && (
          <>
            <RecipeCard
              recipe={generatedRecipe}
              mode="chef"
              quizData={quizData}
              isFullView={true}
              onBack={handleBackToQuiz}
              showNewSearchButton={true}
              onNewSearch={handleBackToQuiz}
            />
            
            {/* Floating Zest Chatbot - Always visible when recipe is shown */}
            <ChatBot 
              currentRecipe={generatedRecipe}
              currentMode="chef"
              onRecipeUpdate={(updatedRecipe: any) => {
                setGeneratedRecipe(updatedRecipe);
              }}
            />
          </>
        )}
      </main>

      <GlobalFooter currentMode="chef" />

      {showNavigation && (
        <GlobalNavigation 
          onClose={closeAllMenus}
          onAuthRequired={() => navigate("/")}
        />
      )}

      {showSettings && (
        <SettingsPanel 
          onClose={closeAllMenus}
        />
      )}

      {showUserMenu && (
        <UserMenu 
          onClose={closeAllMenus}
        />
      )}

      {showAuthModal && (
        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          onSuccess={handleAuthSuccess}
          title="Join Flavr to Continue"
          description="Sign up for free to unlock unlimited recipe generation and save your favorites!"
        />
      )}

      {generatedRecipe && (
        <ChatBot
          currentRecipe={generatedRecipe}
          currentMode="chef"
        />
      )}
    </div>
  );
}