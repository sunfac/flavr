import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import GlobalHeader from "@/components/GlobalHeader";
import GlobalFooter from "@/components/GlobalFooter";
import GlobalNavigation from "@/components/GlobalNavigation";
import SettingsPanel from "@/components/SettingsPanel";
import UserMenu from "@/components/UserMenu";
import SlideQuizShell from "@/components/SlideQuizShell";
import { chefQuestions } from "@/config/chefQuestions";
import RecipeCard from "@/components/RecipeCard";
import ChatBot from "@/components/ChatBot";
import Loading from "@/components/Loading";
import FlavrPlusGate from "@/components/FlavrPlusGate";
import { useFlavrGate } from "@/hooks/useFlavrGate";
import { api } from "@/lib/api";

export default function ChefAssistMode() {
  const [, navigate] = useLocation();
  const [currentStep, setCurrentStep] = useState<"quiz" | "recipe">("quiz");
  const [quizData, setQuizData] = useState<any>(null);
  const [generatedRecipe, setGeneratedRecipe] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showGate, setShowGate] = useState(false);
  const [showNavigation, setShowNavigation] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

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
        intent: data.intent,
        dietary: data.dietary || [],
        time: data.time || 60,
        ambition: data.ambition || 3,
        equipment: data.equipment || [],
        extras: data.extras || []
      };

      setQuizData(transformedData);

      // Generate recipe directly for Chef mode
      const response = await api.generateFullRecipe({
        mode: "chef",
        quizData: transformedData,
        prompt: `Create a recipe for: ${transformedData.intent}`
      });

      setGeneratedRecipe(response.recipe);
      setCurrentStep("recipe");
    } catch (error) {
      console.error("Failed to generate recipe:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewSearch = () => {
    setCurrentStep("quiz");
    setQuizData(null);
    setGeneratedRecipe(null);
  };

  const handleBackToQuiz = () => {
    setCurrentStep("quiz");
    setGeneratedRecipe(null);
  };

  return (
    <div className="min-h-screen">
      {/* Consistent header across all modes */}
      <GlobalHeader 
        onMenuClick={() => setShowNavigation(true)}
        onSettingsClick={() => setShowSettings(true)}
        onUserClick={() => setShowUserMenu(true)}
      />
      
      <main>
        {currentStep === "quiz" && (
          <SlideQuizShell
            title="Chef Assist Quiz"
            questions={chefQuestions}
            onSubmit={handleQuizComplete}
            onLoading={setIsLoading}
            theme="chef"
          />
        )}

        {currentStep === "recipe" && generatedRecipe && (
          <div className="bg-background min-h-screen">
            <RecipeCard
              recipe={generatedRecipe}
              mode="chef"
              quizData={quizData}
              isFullView={true}
              onBack={handleBackToQuiz}
              showNewSearchButton={true}
              onNewSearch={handleNewSearch}
            />
          </div>
        )}

        {isLoading && (
          <Loading message="Creating your bespoke culinary experience..." />
        )}

        {showGate && (
          <FlavrPlusGate onClose={() => setShowGate(false)} />
        )}
      </main>

      <ChatBot />
      
      {/* Consistent footer across all modes */}
      <GlobalFooter currentMode="chef" />

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
    </div>
  );
}
