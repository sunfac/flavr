import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import InputQuizChef from "@/components/InputQuizChef";
import RecipeCard from "@/components/RecipeCard";
import ChatBot from "@/components/ChatBot";
import Loading from "@/components/Loading";
import FlavrPlusGate from "@/components/FlavrPlusGate";
import { useFlavrGate } from "@/hooks/useFlavrGate";

export default function ChefAssistMode() {
  const [, navigate] = useLocation();
  const [currentStep, setCurrentStep] = useState<"quiz" | "recipe">("quiz");
  const [quizData, setQuizData] = useState<any>(null);
  const [generatedRecipe, setGeneratedRecipe] = useState<any>(null);
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

  if (!user?.user) {
    navigate("/");
    return null;
  }

  const handleQuizComplete = (data: any, recipe: any) => {
    if (!canGenerateRecipe(user.user)) {
      setShowGate(true);
      return;
    }
    setQuizData(data);
    setGeneratedRecipe(recipe);
    setCurrentStep("recipe");
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
    <div className="min-h-screen bg-background">
      <Header currentMode="chef" />
      
      <main className="pb-20">
        {currentStep === "quiz" && (
          <InputQuizChef
            onComplete={handleQuizComplete}
            onLoading={setIsLoading}
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
      <Footer currentMode="chef" />
    </div>
  );
}
