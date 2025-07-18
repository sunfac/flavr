import { useState } from "react";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import SlideQuizShell from "@/components/SlideQuizShell";
import TinderRecipeCards from "@/components/TinderRecipeCards";
import RecipeCard from "@/components/RecipeCard";
import Loading from "@/components/Loading";
import GlobalHeader from "@/components/GlobalHeader";
import GlobalFooter from "@/components/GlobalFooter";
import GlobalNavigation from "@/components/GlobalNavigation";
import SettingsPanel from "@/components/SettingsPanel";
import UserMenu from "@/components/UserMenu";
import AuthModal from "@/components/AuthModal";
import ChatBot from "@/components/ChatBot";
import UpgradeModal from "@/components/UpgradeModal";
import { shoppingQuestions } from "@/config/shoppingQuestions";
import { useQuery } from "@tanstack/react-query";
import { checkQuotaBeforeGPT } from "@/lib/quotaManager";

export default function ShoppingMode() {
  const [, navigate] = useLocation();
  const [currentStep, setCurrentStep] = useState("quiz");
  const [quizData, setQuizData] = useState<any>(null);
  const [recipeIdeas, setRecipeIdeas] = useState<any[]>([]);
  const [selectedRecipe, setSelectedRecipe] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
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
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [hasSentPrompt1Twice, setHasSentPrompt1Twice] = useState(false);
  const [usageData, setUsageData] = useState<any>(null);

  // Get user authentication status
  const { data: user } = useQuery({
    queryKey: ["/api/me"],
    retry: false,
  });
  const isAuthenticated = !!user?.user;

  const checkUsageLimit = async () => {
    try {
      const response = await apiRequest("GET", "/api/check-usage-limit");
      const data = await response.json();
      setUsageData(data);
      
      // If user can't generate more recipes, show upgrade modal
      if (!data.canGenerate && !data.hasFlavrPlus) {
        setShowUpgradeModal(true);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error("Usage check failed:", error);
      return true; // Allow generation if check fails
    }
  };

  const generateRecipeIdeas = async (data: any, isSecondAttempt = false) => {
    // Check usage limit before generating
    const canGenerate = await checkUsageLimit();
    if (!canGenerate) {
      return; // Stop if user hit their limit
    }

    try {
      setIsLoading(true);
      
      const fetchResponse = await fetch("/api/generate-recipe-ideas", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mode: "shopping",
          quizData: data,
          isSecondAttempt,
          prompt: "Generate 5 diverse recipe ideas for shopping mode"
        })
      });
      
      const response = await fetchResponse.json();
      console.log("API Response:", response);
      console.log("Recipe ideas received:", response.recipes || []);
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
      time: data.time,  // Fixed: use data.time instead of data.cookingTime
      budget: data.budget,
      dietary: data.dietary || [],
      equipment: data.equipment || [],  // Fixed: use array directly, don't wrap in another array
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
      
      const fetchResponse = await fetch("/api/generate-full-recipe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          selectedRecipe: recipe,
          mode: "shopping",
          quizData: quizData,
          prompt: `Generate a complete recipe for ${recipe.title}`
        })
      });
      
      const response = await fetchResponse.json();
      console.log("Full recipe response:", response);
      
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
          onMenuClick={() => openMenu('navigation')}
          onSettingsClick={() => openMenu('settings')}
          onAuthRequired={() => navigate("/")}
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
        
        {showNavigation && <GlobalNavigation onClose={closeAllMenus} onAuthRequired={() => navigate("/")} />}
        {showSettings && <SettingsPanel onClose={closeAllMenus} />}
        {showUserMenu && <UserMenu onClose={closeAllMenus} />}
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
          onMenuClick={() => openMenu('navigation')}
          onSettingsClick={() => openMenu('settings')}
          onAuthRequired={() => navigate("/")}
        />
        
        <main className="pt-20 pb-24">
          <TinderRecipeCards
            recipes={recipeIdeas}
            onSelectRecipe={handleRecipeSelect}
            onAllRecipesExhausted={handleAllRecipesRejected}
            quizData={quizData}
            theme="shopping"
          />
        </main>

        <GlobalFooter currentMode="shopping" />
        
        {showNavigation && <GlobalNavigation onClose={closeAllMenus} onAuthRequired={() => navigate("/")} />}
        {showSettings && <SettingsPanel onClose={closeAllMenus} />}
        {showUserMenu && <UserMenu onClose={closeAllMenus} />}
        {showAuthModal && (
          <AuthModal
            isOpen={showAuthModal}
            onClose={() => setShowAuthModal(false)}
            onSuccess={handleAuthSuccess}
            title="Continue Your Culinary Journey"
            description="Sign up to unlock unlimited recipes and save your favorites!"
          />
        )}
        {showUpgradeModal && (
          <UpgradeModal
            isOpen={showUpgradeModal}
            onClose={() => setShowUpgradeModal(false)}
            recipesUsed={usageData?.recipesUsed || 3}
            recipesLimit={usageData?.recipesLimit || 3}
          />
        )}
      </div>
    );
  }

  if (currentStep === "recipe" && selectedRecipe) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-black">
        <GlobalHeader 
          onMenuClick={() => openMenu('navigation')}
          onSettingsClick={() => openMenu('settings')}
          onAuthRequired={() => navigate("/")}
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
          
          {/* Floating Zest Chatbot - Always visible when recipe is shown */}
          <ChatBot 
            currentRecipe={selectedRecipe}
            currentMode="shopping"
            onRecipeUpdate={(updatedRecipe: any) => {
              setSelectedRecipe(updatedRecipe);
            }}
          />
        </main>

        <GlobalFooter currentMode="shopping" />
        
        {showNavigation && <GlobalNavigation onClose={closeAllMenus} onAuthRequired={() => navigate("/")} />}
        {showSettings && <SettingsPanel onClose={closeAllMenus} />}
        {showUserMenu && <UserMenu onClose={closeAllMenus} />}
        {showUpgradeModal && (
          <UpgradeModal
            isOpen={showUpgradeModal}
            onClose={() => setShowUpgradeModal(false)}
            recipesUsed={usageData?.recipesUsed || 3}
            recipesLimit={usageData?.recipesLimit || 3}
          />
        )}
      </div>
    );
  }

  return null;
}