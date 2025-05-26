import { useState } from "react";
import { apiRequest } from "@/lib/queryClient";
import SlideQuizShell from "@/components/SlideQuizShell";
import TinderRecipeCards from "@/components/TinderRecipeCards";
import RecipeCard from "@/components/RecipeCard";
import Loading from "@/components/Loading";
import GlobalHeader from "@/components/GlobalHeader";
import GlobalFooter from "@/components/GlobalFooter";
import GlobalNavigation from "@/components/GlobalNavigation";
import SettingsPanel from "@/components/SettingsPanel";
import AuthModal from "@/components/AuthModal";
import { shoppingQuestions } from "@/config/shoppingQuestions";

export default function ShoppingMode() {
  const [currentStep, setCurrentStep] = useState("quiz");
  const [quizData, setQuizData] = useState<any>(null);
  const [recipeIdeas, setRecipeIdeas] = useState<any[]>([]);
  const [selectedRecipe, setSelectedRecipe] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showNavigation, setShowNavigation] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [hasSentPrompt1Twice, setHasSentPrompt1Twice] = useState(false);

  // Mock user state for demo
  const user = {};
  const isAuthenticated = false;

  const checkQuotaBeforeGPT = async () => {
    // Quota check logic here
    return true;
  };

  const generateRecipeIdeas = async (data: any, isSecondAttempt = false) => {
    try {
      setIsLoading(true);
      
      const response = await apiRequest("POST", "/api/generate-recipe-ideas", {
        mode: "shopping",
        quizData: data,
        isSecondAttempt,
        prompt: "Generate 5 diverse recipe ideas for shopping mode"
      });
      
      setRecipeIdeas(response.recipes || []);
      setCurrentStep("suggestions");
    } catch (error) {
      console.error("Recipe generation failed:", error);
      // Fallback recipes
      const fallbackRecipes = [
        {
          title: "Quick Pasta Delight",
          description: "Simple and satisfying pasta with fresh ingredients."
        },
        {
          title: "Hearty Soup Bowl", 
          description: "Warming and nutritious soup perfect for any day."
        }
      ];
      setRecipeIdeas(fallbackRecipes);
      setCurrentStep("suggestions");
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuizComplete = async (data: any) => {
    const transformedData = {
      mood: data.mood,
      cuisine: data.cuisine,
      time: data.cookingTime,
      budget: data.budget,
      dietary: data.diet ? [data.diet] : [],
      equipment: data.equipment ? [data.equipment] : [],
      ambition: data.ambition,
      servings: data.servings || 4,
      supermarket: data.supermarket
    };

    setQuizData(transformedData);
    setHasSentPrompt1Twice(false);
    
    await generateRecipeIdeas(transformedData);
  };

  const handleAllRecipesRejected = async () => {
    if (!hasSentPrompt1Twice && quizData) {
      setHasSentPrompt1Twice(true);
      await generateRecipeIdeas(quizData, true);
    }
  };

  const handleRecipeSelect = async (recipe: any) => {
    if (!isAuthenticated) {
      const canProceed = await checkQuotaBeforeGPT();
      if (!canProceed) {
        setShowAuthModal(true);
        return;
      }
    }

    try {
      setIsLoading(true);
      
      const response = await apiRequest("POST", "/api/generate-full-recipe", {
        selectedRecipe: recipe,
        mode: "shopping",
        quizData: quizData,
        prompt: `Generate a complete recipe for ${recipe.title}`
      });
      
      setSelectedRecipe(response);
      setCurrentStep("recipe");
    } catch (error) {
      console.error("Recipe generation failed:", error);
      setSelectedRecipe(recipe);
      setCurrentStep("recipe");
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToSuggestions = () => {
    setSelectedRecipe(null);
    setCurrentStep("suggestions");
  };

  const handleNewSearch = () => {
    setCurrentStep("quiz");
    setQuizData(null);
    setRecipeIdeas([]);
    setSelectedRecipe(null);
  };

  const handleAuthSuccess = () => {
    setShowAuthModal(false);
  };

  if (!quizData && currentStep === "quiz") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-black">
        <GlobalHeader 
          onMenuClick={() => setShowNavigation(true)}
          onSettingsClick={() => setShowSettings(true)}
          onUserClick={() => setShowUserMenu(true)}
        />
        
        <main className="pt-20 pb-24">
          <SlideQuizShell
            title="Shopping Mode"
            subtitle="Plan your perfect shopping trip"
            questions={shoppingQuestions}
            onSubmit={handleQuizComplete}
            theme="shopping"
          />
        </main>

        <GlobalFooter currentMode="shopping" />
        
        {showNavigation && <GlobalNavigation onClose={() => setShowNavigation(false)} />}
        {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} />}
        {showAuthModal && (
          <AuthModal
            isOpen={showAuthModal}
            onClose={() => setShowAuthModal(false)}
            onSuccess={handleAuthSuccess}
            title="Continue Your Culinary Journey"
            description="Sign up to unlock unlimited recipes and save your favorites!"
          />
        )}
      </div>
    );
  }

  if (isLoading) {
    return <Loading message="Creating your perfect recipe..." showDidYouKnow />;
  }

  if (currentStep === "suggestions") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-black">
        <GlobalHeader 
          onMenuClick={() => setShowNavigation(true)}
          onSettingsClick={() => setShowSettings(true)}
          onUserClick={() => setShowUserMenu(true)}
        />
        
        <main className="pt-20 pb-24">
          <TinderRecipeCards
            recipes={recipeIdeas}
            onSelectRecipe={handleRecipeSelect}
            quizData={quizData}
            theme="shopping"
          />
        </main>

        <GlobalFooter currentMode="shopping" />
        
        {showNavigation && <GlobalNavigation onClose={() => setShowNavigation(false)} />}
        {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} />}
        {showAuthModal && (
          <AuthModal
            isOpen={showAuthModal}
            onClose={() => setShowAuthModal(false)}
            onSuccess={handleAuthSuccess}
            title="Continue Your Culinary Journey"
            description="Sign up to unlock unlimited recipes and save your favorites!"
          />
        )}
      </div>
    );
  }

  if (currentStep === "recipe" && selectedRecipe) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-black">
        <GlobalHeader 
          onMenuClick={() => setShowNavigation(true)}
          onSettingsClick={() => setShowSettings(true)}
          onUserClick={() => setShowUserMenu(true)}
        />
        
        <main className="pt-20 pb-24">
          <RecipeCard
            recipe={selectedRecipe}
            mode="shopping"
            quizData={quizData}
            isFullView={true}
            onBack={handleBackToSuggestions}
            showNewSearchButton={true}
            onNewSearch={handleNewSearch}
          />
        </main>

        <GlobalFooter currentMode="shopping" />
        
        {showNavigation && <GlobalNavigation onClose={() => setShowNavigation(false)} />}
        {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} />}
      </div>
    );
  }

  return null;
}