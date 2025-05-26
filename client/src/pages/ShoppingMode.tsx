import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Clock, Utensils } from "lucide-react";
import GlobalHeader from "@/components/GlobalHeader";
import GlobalFooter from "@/components/GlobalFooter";
import GlobalNavigation from "@/components/GlobalNavigation";
import SettingsPanel from "@/components/SettingsPanel";
import UserMenu from "@/components/UserMenu";
import SlideQuizShell from "@/components/SlideQuizShell";
import TinderRecipeCards from "@/components/TinderRecipeCards";
import { shoppingQuestions } from "@/config/shoppingQuestions";
import RecipeCard from "@/components/RecipeCard";
import ChatBot from "@/components/ChatBot";
import Loading from "@/components/Loading";
import { checkQuotaBeforeGPT, getRemainingRecipes } from "@/lib/quotaManager";
import { apiRequest } from "@/lib/queryClient";
import AuthModal from "@/components/AuthModal";

export default function ShoppingMode() {
  const [, navigate] = useLocation();
  const [currentStep, setCurrentStep] = useState<"quiz" | "suggestions" | "recipe">("quiz");
  const [quizData, setQuizData] = useState<any>(null);
  const [recipeIdeas, setRecipeIdeas] = useState<any[]>([]);
  const [selectedRecipe, setSelectedRecipe] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
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

    try {
      setIsLoading(true);

      // Generate recipe ideas (no quota check - this is just ideas)
      const response = await apiRequest("POST", "/api/recipe-ideas", {
        mode: "shopping",
        quizData: transformedData,
        prompt: `Generate recipe ideas for shopping mode with mood: ${transformedData.mood}, budget: ${transformedData.budget}`
      });
      
      if (response.ok) {
        const result = await response.json();
        setRecipeIdeas(result.ideas || []);
      } else {
        throw new Error('Failed to generate recipe ideas');
      }
    } catch (error) {
      console.error("API call failed, using fallback recipes:", error);
      // Use curated fallback recipes based on quiz data
      const fallbackRecipes = [
        {
          title: "Quick Asian Stir-Fry Bowl",
          description: "Colorful vegetables and protein in savory sauce over steamed rice."
        },
        {
          title: "Mediterranean Chicken Wrap",
          description: "Herb-marinated chicken with fresh veggies in warm pita bread."
        },
        {
          title: "Creamy Tuscan Pasta",
          description: "Rich garlic cream sauce with sun-dried tomatoes and spinach."
        },
        {
          title: "Classic Caesar Salad",
          description: "Crisp romaine with homemade dressing and parmesan croutons."
        }
      ];
      setRecipeIdeas(fallbackRecipes);
    } finally {
      setCurrentStep("suggestions");
      setIsLoading(false);
    }
  };

  const handleRecipeSelect = async (recipe: any) => {
    // Check quota for final recipe generation (this is what counts against limit)
    if (!isAuthenticated) {
      const canProceed = await checkQuotaBeforeGPT();
      if (!canProceed) {
        setShowAuthModal(true);
        return;
      }
    }

    // Generate full recipe immediately when selected
    try {
      setIsLoading(true);
      
      const fullRecipeResponse = await apiRequest("POST", "/api/generate-recipe", {
        selectedRecipe: recipe,
        mode: "shopping",
        quizData: quizData,
        prompt: `Generate a complete recipe for "${recipe.title}" based on shopping mode preferences: ${JSON.stringify(quizData)}. Include title, description, ingredients list, step-by-step instructions, cook time, servings, and difficulty level.`
      });

      if (fullRecipeResponse.ok) {
        const result = await fullRecipeResponse.json();
        setSelectedRecipe(result.recipe);
        setCurrentStep("recipe");
      } else {
        throw new Error('Failed to generate recipe');
      }
    } catch (error) {
      console.error("Failed to generate full recipe:", error);
      // Fallback to basic recipe structure
      setSelectedRecipe({
        ...recipe,
        ingredients: ["Ingredients will be generated based on your preferences"],
        instructions: ["Instructions will be provided once generated"],
        cookTime: 30,
        servings: 4,
        difficulty: "Medium"
      });
      setCurrentStep("recipe");
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToQuiz = () => {
    setCurrentStep("quiz");
    setQuizData(null);
    setRecipeIdeas([]);
    setSelectedRecipe(null);
  };

  const handleAuthSuccess = () => {
    setShowAuthModal(false);
    // Continue with recipe generation after successful auth
    if (quizData && currentStep === "quiz") {
      handleQuizComplete(quizData);
    }
  };

  if (isLoading) {
    return <Loading message="Creating your perfect shopping recipe..." />;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <GlobalHeader 
        onMenuClick={() => setShowNavigation(true)}
        onSettingsClick={() => setShowSettings(true)}
        onUserClick={() => {
          if (isAuthenticated) {
            setShowUserMenu(true);
          } else {
            setShowAuthModal(true);
          }
        }}
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

      <main className="flex-1 p-4 pb-20">

        {currentStep === "quiz" && (
          <SlideQuizShell
            title="Shopping Mode"
            subtitle="Let's create your perfect shopping list and recipe"
            questions={shoppingQuestions}
            onSubmit={handleQuizComplete}
            theme="shopping"
          />
        )}

        {currentStep === "suggestions" && (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-heading mb-2">Recipe Suggestions</h2>
              <p className="text-muted-foreground">Swipe right to select a recipe</p>
            </div>
            
            <TinderRecipeCards
              recipes={recipeIdeas}
              onSelectRecipe={handleRecipeSelect}
              quizData={quizData}
              theme="shopping"
            />

            <div className="text-center">
              <button
                onClick={handleBackToQuiz}
                className="btn-ghost"
              >
                Back to Quiz
              </button>
            </div>
          </div>
        )}

        {currentStep === "recipe" && selectedRecipe && (
          <RecipeCard
            recipe={selectedRecipe}
            mode="shopping"
            quizData={quizData}
            isFullView={true}
            onBack={() => setCurrentStep("suggestions")}
            showNewSearchButton={true}
            onNewSearch={handleBackToQuiz}
          />
        )}
      </main>

      <GlobalFooter currentMode="shopping" />

      {showNavigation && (
        <GlobalNavigation onClose={() => setShowNavigation(false)} />
      )}

      {showSettings && (
        <SettingsPanel onClose={() => setShowSettings(false)} />
      )}

      {showUserMenu && (
        <UserMenu onClose={() => setShowUserMenu(false)} />
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

      {selectedRecipe && (
        <ChatBot
          currentRecipe={selectedRecipe}
          currentMode="shopping"
        />
      )}
    </div>
  );
}