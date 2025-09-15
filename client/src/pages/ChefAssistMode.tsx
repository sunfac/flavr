import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import GlobalHeader from "@/components/GlobalHeader";
import GlobalFooter from "@/components/GlobalFooter";
import GlobalNavigation from "@/components/GlobalNavigation";
import SettingsPanel from "@/components/SettingsPanel";
import UserMenu from "@/components/UserMenu";
import SlideQuizShell from "@/components/SlideQuizShell";
import RecipeCard from "@/components/RecipeCard";
import FloatingChatButton from "@/components/FloatingChatButton";
import Loading from "@/components/Loading";
import { checkQuotaBeforeGPT, getRemainingRecipes } from "@/lib/quotaManager";
import { apiRequest } from "@/lib/queryClient";
import AuthModal from "@/components/AuthModal";
import { chefQuestions } from "@/config/chefQuestions";
import { iconMap } from "@/lib/iconMap";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Wand2, Loader2 } from "lucide-react";

export default function ChefAssistMode() {
  const [, navigate] = useLocation();
  const [currentStep, setCurrentStep] = useState<"quiz" | "inspire" | "recipe">("quiz");
  const [quizData, setQuizData] = useState<any>(null);
  const [generatedRecipe, setGeneratedRecipe] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showNavigation, setShowNavigation] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [inspirationTitles, setInspirationTitles] = useState<string[]>([]);
  const [selectedTitle, setSelectedTitle] = useState<string | null>(null);
  const [isGeneratingInspiration, setIsGeneratingInspiration] = useState(false);

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
  const isAuthenticated = !!(user as any)?.user;

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
      // Navigate to dedicated loading page
      navigate("/loading");

      // Generate recipe directly for Chef mode using the dedicated chef endpoint
      const fetchResponse = await fetch("/api/chef-assist-recipe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          intent: transformedData.intent,
          dietary: transformedData.dietary,
          time: transformedData.time,
          ambition: transformedData.ambition,
          equipment: transformedData.equipment,
          servings: transformedData.servings
        })
      });
      
      if (!fetchResponse.ok) {
        throw new Error(`API call failed with status: ${fetchResponse.status}`);
      }

      const response = await fetchResponse.json();
      console.log("Chef API Response:", response);
      
      if (response && (response.title || response.recipe)) {
        setGeneratedRecipe(response.recipe || response);
        setCurrentStep("recipe");
        // Navigate back to chef assist mode with results
        navigate("/chef");
      } else {
        throw new Error("No recipe data received");
      }
    } catch (error) {
      console.error("Failed to generate recipe:", error);
      setCurrentStep("recipe");
      // Navigate back even with error
      navigate("/chef");
    }
  };

  // Generate recipe inspiration titles
  const generateInspiration = async () => {
    const allowed = await checkQuotaBeforeGPT();
    if (!allowed) {
      setShowAuthModal(true);
      return;
    }

    setIsGeneratingInspiration(true);
    try {
      const response = await fetch("/api/chef-assist/inspire", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          seeds: {
            randomSeed: Math.floor(Math.random() * 1000000),
            complexityLevel: Math.floor(Math.random() * 100),
            simpleStyle: Math.floor(Math.random() * 100),
            creativityMode: Math.floor(Math.random() * 100),
            seasonalFocus: Math.floor(Math.random() * 100),
            textureTheme: Math.floor(Math.random() * 100),
            flavorProfile: Math.floor(Math.random() * 100)
          },
          clientId: (user as any)?.user?.id || 'anonymous'
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to generate inspiration: ${response.status}`);
      }

      const data = await response.json();
      if (data.title) {
        // Generate multiple titles by calling the API multiple times
        const titles = [data.title];
        
        // Generate 2 more titles for variety
        for (let i = 0; i < 2; i++) {
          const additionalResponse = await fetch("/api/chef-assist/inspire", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              seeds: {
                randomSeed: Math.floor(Math.random() * 1000000) + i * 1000,
                complexityLevel: Math.floor(Math.random() * 100),
                simpleStyle: Math.floor(Math.random() * 100),
                creativityMode: Math.floor(Math.random() * 100),
                seasonalFocus: Math.floor(Math.random() * 100),
                textureTheme: Math.floor(Math.random() * 100),
                flavorProfile: Math.floor(Math.random() * 100)
              },
              clientId: (user as any)?.user?.id || 'anonymous'
            })
          });
          
          if (additionalResponse.ok) {
            const additionalData = await additionalResponse.json();
            if (additionalData.title) {
              titles.push(additionalData.title);
            }
          }
        }
        
        setInspirationTitles(titles);
        setCurrentStep("inspire");
      } else {
        throw new Error("No inspiration title received");
      }
    } catch (error) {
      console.error("Failed to generate inspiration:", error);
    } finally {
      setIsGeneratingInspiration(false);
    }
  };

  // Handle selecting an inspiration title
  const handleTitleSelection = async (title: string) => {
    setSelectedTitle(title);
    
    // Check quota again before proceeding
    const allowed = await checkQuotaBeforeGPT();
    if (!allowed) {
      setShowAuthModal(true);
      return;
    }

    try {
      // Navigate to loading page
      navigate("/loading");

      // Generate recipe using the selected title as the intent
      const fetchResponse = await fetch("/api/chef-assist-recipe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          intent: title,
          dietary: [],
          time: 60,
          ambition: "confidentCook",
          equipment: [],
          servings: "4"
        })
      });
      
      if (!fetchResponse.ok) {
        throw new Error(`API call failed with status: ${fetchResponse.status}`);
      }

      const response = await fetchResponse.json();
      console.log("Chef API Response:", response);
      
      if (response && (response.title || response.recipe)) {
        setGeneratedRecipe(response.recipe || response);
        setCurrentStep("recipe");
        // Navigate back to chef assist mode with results
        navigate("/chef");
      } else {
        throw new Error("No recipe data received");
      }
    } catch (error) {
      console.error("Failed to generate recipe from inspiration:", error);
      setCurrentStep("recipe");
      navigate("/chef");
    }
  };

  const handleBackToQuiz = () => {
    setCurrentStep("quiz");
    setQuizData(null);
    setGeneratedRecipe(null);
    setInspirationTitles([]);
    setSelectedTitle(null);
  };

  const handleBackToInspire = () => {
    setCurrentStep("inspire");
    setSelectedTitle(null);
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
              <iconMap.clock className="w-3 h-3 md:w-4 md:h-4" />
              <span>{getRemainingRecipes()} free recipes remaining</span>
            </div>
          </div>
        </div>
      )}

      <main className="flex-1 pt-20 pb-24 p-4">

        {currentStep === "quiz" && (
          <div className="space-y-6">
            {/* Inspire Me Button Section */}
            <div className="max-w-md mx-auto text-center space-y-4">
              <div className="bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950/20 dark:to-amber-950/20 p-6 rounded-xl border border-orange-200 dark:border-orange-800">
                <div className="flex items-center justify-center gap-2 mb-3">
                  <Sparkles className="w-5 h-5 text-orange-500" />
                  <h3 className="text-lg font-semibold text-orange-900 dark:text-orange-100">Need Instant Inspiration?</h3>
                </div>
                <p className="text-sm text-orange-700 dark:text-orange-200 mb-4">
                  Get creative recipe suggestions instantly without the quiz!
                </p>
                <Button
                  onClick={generateInspiration}
                  disabled={isGeneratingInspiration}
                  className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-medium py-3 h-auto"
                  data-testid="button-inspire-me"
                >
                  {isGeneratingInspiration ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generating Ideas...
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-4 h-4 mr-2" />
                      Inspire Me!
                    </>
                  )}
                </Button>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-border"></div>
                <span className="text-xs text-muted-foreground uppercase tracking-wide">OR</span>
                <div className="flex-1 h-px bg-border"></div>
              </div>
            </div>

            {/* Regular Quiz */}
            <SlideQuizShell
              title="Chef Assist Mode"
              subtitle="Tell me your culinary vision and I'll help you create something amazing"
              questions={chefQuestions}
              onSubmit={handleQuizComplete}
              onLoading={setIsLoading}
              theme="chef"
            />
          </div>
        )}

        {currentStep === "inspire" && (
          <div className="max-w-2xl mx-auto space-y-6">
            {/* Header */}
            <div className="text-center space-y-2">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Sparkles className="w-6 h-6 text-orange-500" />
                <h2 className="text-2xl font-bold text-foreground">Recipe Inspiration</h2>
              </div>
              <p className="text-muted-foreground">
                Choose a recipe that sparks your interest, or get new suggestions!
              </p>
            </div>

            {/* Inspiration Titles */}
            <div className="grid gap-4">
              {inspirationTitles.map((title, index) => (
                <Card 
                  key={index} 
                  className="cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-[1.02] border-2 hover:border-orange-200 dark:hover:border-orange-800"
                  onClick={() => handleTitleSelection(title)}
                  data-testid={`card-inspiration-${index}`}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center">
                          <iconMap.chefHat className="w-6 h-6 text-white" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold text-foreground mb-2 leading-tight">
                          {title}
                        </h3>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-xs">
                            <iconMap.clock className="w-3 h-3 mr-1" />
                            Quick Generate
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            Click to create full recipe
                          </span>
                        </div>
                      </div>
                      <div className="flex-shrink-0">
                        <iconMap.arrowRight className="w-5 h-5 text-muted-foreground" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={handleBackToQuiz}
                className="flex-1"
                data-testid="button-back-to-quiz"
              >
                <iconMap.arrowLeft className="w-4 h-4 mr-2" />
                Back to Quiz
              </Button>
              <Button
                onClick={generateInspiration}
                disabled={isGeneratingInspiration}
                className="flex-1 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600"
                data-testid="button-new-inspiration"
              >
                {isGeneratingInspiration ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Wand2 className="w-4 h-4 mr-2" />
                    New Ideas
                  </>
                )}
              </Button>
            </div>
          </div>
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
            
            {/* Floating Assistant - Always visible when recipe is shown */}
            <FloatingChatButton 
              currentRecipe={generatedRecipe}
              currentMode="discover"
              onRecipeUpdate={(updatedRecipe: any) => {
                setGeneratedRecipe(updatedRecipe);
              }}
            />
          </>
        )}
      </main>

      <GlobalFooter currentMode="discover" />

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

    </div>
  );
}