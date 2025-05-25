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
      try {
        const response = await api.generateRecipeIdeas({
          mode: "shopping",
          quizData: transformedData,
          prompt: `Generate recipe ideas for shopping mode with mood: ${transformedData.mood}, budget: ${transformedData.budget}`
        });
        setRecipeIdeas(response.ideas || []);
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
            title: "Spicy Black Bean Tacos",
            description: "Seasoned beans with fresh salsa and creamy avocado slices."
          },
          {
            title: "Honey Garlic Salmon",
            description: "Glazed salmon fillet with roasted seasonal vegetables."
          },
          {
            title: "Classic Caesar Salad",
            description: "Crisp romaine with homemade dressing and parmesan croutons."
          }
        ];
        setRecipeIdeas(fallbackRecipes);
      }
      setCurrentStep("suggestions");
    } catch (error) {
      console.error("Failed to generate recipe ideas:", error);
      setCurrentStep("suggestions");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRecipeSelect = async (recipe: any) => {
    if (!isAuthenticated) {
      navigate("/");
      return;
    }
    if (!canGenerateRecipe(user?.user)) {
      setShowGate(true);
      return;
    }

    // Generate full recipe immediately when selected
    try {
      setIsLoading(true);
      
      const fullRecipeResponse = await api.generateFullRecipe({
        selectedRecipe: recipe,
        mode: "shopping",
        quizData: quizData,
        prompt: `Generate a complete recipe for "${recipe.title}" based on shopping mode preferences: ${JSON.stringify(quizData)}. Include title, description, ingredients list, step-by-step instructions, cook time, servings, and difficulty level.`
      });

      setSelectedRecipe(fullRecipeResponse.recipe);
      setCurrentStep("recipe");
    } catch (error) {
      console.error("Failed to generate full recipe:", error);
      // Fallback to basic recipe structure
      setSelectedRecipe({
        ...recipe,
        ingredients: [
          "Main protein or base ingredient",
          "Fresh vegetables or sides", 
          "Seasonings and spices",
          "Cooking oil or butter",
          "Optional garnish"
        ],
        instructions: [
          "Prepare all ingredients and equipment",
          "Cook the main component using your preferred method",
          "Add seasonings and complementary ingredients", 
          "Combine everything and cook until done",
          "Serve hot and enjoy your creation"
        ],
        cookTime: 30,
        servings: 4,
        difficulty: "Medium"
      });
      setCurrentStep("recipe");
    } finally {
      setIsLoading(false);
    }
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
        try {
          const response = await api.generateRecipeIdeas({
            mode: "shopping",
            quizData: quizData,
            prompt: `Generate recipe ideas for shopping mode with mood: ${quizData.mood}, budget: ${quizData.budget}`
          });
          setRecipeIdeas(response.ideas || []);
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
              title: "Spicy Black Bean Tacos",
              description: "Seasoned beans with fresh salsa and creamy avocado slices."
            },
            {
              title: "Honey Garlic Salmon", 
              description: "Glazed salmon fillet with roasted seasonal vegetables."
            },
            {
              title: "Classic Caesar Salad",
              description: "Crisp romaine with homemade dressing and parmesan croutons."
            }
          ];
          setRecipeIdeas(fallbackRecipes);
        }
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
            title="Shopping Mode"
            questions={shoppingQuestions}
            onSubmit={handleQuizComplete}
            theme="shopping"
          />
        )}

        {currentStep === "suggestions" && (
          <TinderRecipeCards 
            recipes={recipeIdeas}
            onSelectRecipe={handleRecipeSelect}
            quizData={quizData}
            theme="shopping"
          />
        )}

        {currentStep === "recipe" && selectedRecipe && (
          <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-black">
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

      {/* Chat bot positioned elegantly in bottom-right like landing page icons */}
      {currentStep !== "quiz" && (
        <div className="fixed bottom-6 right-6 z-50">
          <ChatBot />
        </div>
      )}

      {/* Consistent footer across all modes */}
      <GlobalFooter currentMode="shopping" />

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
