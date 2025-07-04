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
import TinderRecipeCards from "@/components/TinderRecipeCards";
import ChatBot from "@/components/ChatBot";
import Loading from "@/components/Loading";
import { checkQuotaBeforeGPT, getRemainingRecipes, canGenerateRecipe } from "@/lib/quotaManager";
import { apiRequest } from "@/lib/queryClient";
import AuthModal from "@/components/AuthModal";
import FlavrPlusGate from "@/components/FlavrPlusGate";
import UpgradeModal from "@/components/UpgradeModal";
import { Clock } from "lucide-react";

export default function FridgeMode() {
  const [, navigate] = useLocation();
  const [currentStep, setCurrentStep] = useState<"quiz" | "suggestions" | "recipe">("quiz");
  const [quizData, setQuizData] = useState<any>(null);
  const [recipeIdeas, setRecipeIdeas] = useState<any[]>([]);
  const [selectedRecipe, setSelectedRecipe] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasGeneratedSecondBatch, setHasGeneratedSecondBatch] = useState(false);
  const [showGate, setShowGate] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showNavigation, setShowNavigation] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  // Smart menu management - only one menu open at a time
  const openMenu = (menuType: 'navigation' | 'settings' | 'user') => {
    setShowNavigation(menuType === 'navigation');
    setShowSettings(menuType === 'settings');
    setShowUserMenu(menuType === 'user');
  };

  const closeAllMenus = () => {
    setShowNavigation(false);
    setShowSettings(false);
    setShowUserMenu(false);
  };

  // Check if user is logged in - allow graceful fallback for non-authenticated users
  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ["/api/me"],
    retry: false,
    enabled: false, // Don't auto-fetch on load to prevent 401 errors
  });

  // Allow users to try the quiz without authentication
  const isAuthenticated = user?.user;

  const handleQuizComplete = async (data: any) => {
    console.log("Quiz completed with data:", data);
    
    // Handle random cuisine selection if multiple are chosen
    let selectedCuisines = data.cuisines || [];
    if (Array.isArray(selectedCuisines) && selectedCuisines.length > 1) {
      // Randomly select one cuisine from the array - this changes each time
      selectedCuisines = [selectedCuisines[Math.floor(Math.random() * selectedCuisines.length)]];
    }

    // Transform quiz data
    const transformedData = {
      ingredients: data.ingredients || [],
      vibe: data.vibe || "",
      cuisines: selectedCuisines,
      time: data.time || 30,
      dietary: data.dietary || [],
      equipment: data.equipment || [],
      ambition: data.ambition || 3,
      servings: data.servings || 4
    };

    console.log("Transformed data:", transformedData);
    setQuizData(transformedData);

    // Check global quota before proceeding with GPT
    console.log("Checking quota...");
    const allowed = await checkQuotaBeforeGPT();
    console.log("Quota check result:", allowed);
    if (!allowed) {
      console.log("Quota exceeded, showing auth modal");
      setShowAuthModal(true);
      return;
    }

    console.log("Quota approved, starting API call...");
    try {
      setIsLoading(true);
      
      // Use the already transformed data with random cuisine selection
      const apiData = {
        ingredients: transformedData.ingredients || [],
        vibe: transformedData.vibe,
        cuisines: transformedData.cuisines, // Use the randomly selected cuisine
        time: transformedData.time || 30,
        dietary: transformedData.dietary || [],
        equipment: transformedData.equipment || [],
        ambition: transformedData.ambition || 3
      };
      
      console.log("Final API data prepared:", apiData);

      // Generate recipe ideas using the same pattern as Shopping mode
      // Use the proper Prompt 1 system for Tinder cards
      const { generateFridgePrompt1 } = await import("@/prompts/fridgePrompt1");
      const properPrompt = generateFridgePrompt1(apiData);
      
      console.log("Making API call to /api/generate-recipe-ideas with data:", {
        mode: "fridge",
        quizData: apiData,
        prompt: properPrompt
      });
      
      const fetchResponse = await fetch("/api/generate-recipe-ideas", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mode: "fridge",
          quizData: apiData,
          prompt: properPrompt
        })
      });
      
      console.log("Fetch response status:", fetchResponse.status);
      console.log("Fetch response ok:", fetchResponse.ok);
      
      if (!fetchResponse.ok) {
        throw new Error(`API call failed with status: ${fetchResponse.status}`);
      }
      
      const response = await fetchResponse.json();
      console.log("API Response:", response);
      console.log("Recipe ideas received:", response.recipes || []);
      setRecipeIdeas(response.recipes || []);
      setCurrentStep("suggestions");
    } catch (error) {
      console.error("Failed to generate recipe ideas:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRecipeSelect = async (recipe: any) => {
    // Use the same developer mode bypass logic as in quota check
    const currentUser = user?.user;
    if (currentUser && !canGenerateRecipe(currentUser)) {
      setShowGate(true);
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Generate the full recipe with ingredients and instructions using Prompt 2
      const { generateFridgePrompt2 } = await import("@/prompts/fridgePrompt2");
      const fullPrompt = generateFridgePrompt2(recipe, quizData);
      
      const apiData = {
        selectedRecipe: recipe,
        mode: "fridge",
        quizData: quizData,
        prompt: fullPrompt
      };

      const response = await fetch("/api/generate-full-recipe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(apiData)
      });
      
      if (response.ok) {
        const result = await response.json();
        setSelectedRecipe(result);
        setCurrentStep("recipe");
      } else {
        console.error("Failed to generate full recipe");
        setSelectedRecipe(recipe); // Fallback to basic recipe
        setCurrentStep("recipe");
      }
    } catch (error) {
      console.error("Error generating full recipe:", error);
      setSelectedRecipe(recipe); // Fallback to basic recipe
      setCurrentStep("recipe");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAllRecipesRejected = async () => {
    if (!hasGeneratedSecondBatch) {
      // First rejection - generate second batch of recipes
      setHasGeneratedSecondBatch(true);
      setIsLoading(true);
      
      try {
        // Generate second batch with slightly modified prompt for variety
        const apiData = {
          ingredients: quizData.ingredients || [],
          vibe: quizData.vibe,
          cuisines: quizData.cuisines,
          time: quizData.time || 30,
          dietary: quizData.dietary || [],
          equipment: quizData.equipment || [],
          ambition: quizData.ambition || 3
        };

        // Use the proper Prompt 1 system for second batch too
        const { generateFridgePrompt1 } = await import("@/prompts/fridgePrompt1");
        const secondBatchPrompt = generateFridgePrompt1(apiData);
        
        const fetchResponse = await fetch("/api/generate-recipe-ideas", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            mode: "fridge",
            quizData: apiData,
            prompt: secondBatchPrompt
          })
        });
        
        if (fetchResponse.ok) {
          const response = await fetchResponse.json();
          setRecipeIdeas(response.recipes || []);
        }
      } catch (error) {
        console.error("Failed to generate second batch:", error);
      } finally {
        setIsLoading(false);
      }
    } else {
      // Second rejection - suggest trying different ingredients
      setCurrentStep("quiz");
      setQuizData(null);
      setRecipeIdeas([]);
      setSelectedRecipe(null);
      setHasGeneratedSecondBatch(false);
    }
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
      
      <main className="pt-20 pb-24">
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
          <TinderRecipeCards
            recipes={recipeIdeas}
            onSelectRecipe={handleRecipeSelect}
            onAllRecipesExhausted={handleAllRecipesRejected}
            quizData={quizData}
            theme="fridge"
          />
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

      {/* Only show ChatBot when not in quiz mode */}
      {currentStep !== "quiz" && (
        <ChatBot 
          currentRecipe={selectedRecipe}
          currentMode="fridge"
          onRecipeUpdate={(updatedRecipe: any) => {
            setSelectedRecipe(updatedRecipe);
          }}
        />
      )}
      
      {/* Consistent footer across all modes */}
      <GlobalFooter currentMode="fridge" />

      {/* Navigation overlays */}
      {showNavigation && (
        <GlobalNavigation onClose={closeAllMenus} onAuthRequired={() => navigate("/")} />
      )}
      
      {showSettings && (
        <SettingsPanel onClose={closeAllMenus} />
      )}
      
      {showUserMenu && (
        <UserMenu onClose={closeAllMenus} />
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
