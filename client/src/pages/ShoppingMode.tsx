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
  const [hasSentPrompt1Twice, setHasSentPrompt1Twice] = useState(false);
  const [rejectedRecipes, setRejectedRecipes] = useState<Set<string>>(new Set());

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

  // Extract recipe generation function to allow retry
  const generateRecipeIdeas = async (data: any, isRetry = false) => {
    try {
      setIsLoading(true);
      
      if (isRetry) {
        console.log("Generating fresh batch of recipe ideas...");
      } else {
        console.log("Generating recipe ideas with mapped prompts...");
      }
      
      // Build mapped prompt for Shopping Mode using your sophisticated 6D framework
      const moodText = data.mood ? `The user wants ${data.mood} food that brings comfort and satisfaction.` : '';
      const budgetText = data.budget ? `Budget level: ${data.budget} - suggest recipes that fit this price range.` : '';
      const timeText = data.time ? `Cooking time preference: ${data.time} minutes maximum.` : '';
      const dietaryText = data.dietary?.length ? `Dietary requirements: ${data.dietary.join(', ')}.` : '';
      const equipmentText = data.equipment?.length ? `Available equipment: ${data.equipment.join(', ')}.` : '';
      const ambitionText = data.ambition ? `Cooking ambition level: ${data.ambition}/5 - adjust complexity accordingly.` : '';
      
      const shoppingPrompt = `You are an elite private chef.

Based on the following preferences, suggest 6 unique, flavour-packed recipe ideas. Each idea should have a title and a one-sentence description:

${moodText}

${ambitionText}

${dietaryText}

${budgetText}

${timeText}

${equipmentText}

Cuisine preference: ${data.cuisine || 'Any cuisine'}

Creative Guidance:
Do not include kitchen equipment in the recipe title. Focus on flavor, cuisine, or emotional theme. Assume the user has access to standard kitchen tools. Equipment should not define the identity of the dish.

Ensure the 6 ideas are meaningfully distinct from each other in ingredients, style, or technique.
Avoid repeating the same ingredient combinations across recipes.

Return a JSON object with this exact structure:
{
  "recipes": [
    {
      "title": "Recipe Name", 
      "description": "Brief appealing description in one sentence"
    }
  ]
}`;

      const response = await fetch('/api/openai-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: "gpt-4o",
          messages: [{ role: "user", content: shoppingPrompt }],
          response_format: { type: "json_object" }
        })
      });

      if (response.ok) {
        const result = await response.json();
        const parsedResult = JSON.parse(result.choices[0].message.content);
        setRecipeIdeas(parsedResult.recipes || []);
        setRejectedRecipes(new Set()); // Reset rejected recipes for new batch
        console.log("Successfully generated recipes with your mapped prompt system!");
        return parsedResult.recipes || [];
      } else {
        throw new Error('Recipe generation failed');
      }
      
    } catch (error) {
      console.error("Recipe generation failed:", error);
      // Basic fallback if everything fails
      const basicFallback = [
        {
          title: "Simple Pasta Bowl",
          description: "Quick and satisfying pasta with your favorite sauce and toppings."
        }
      ];
      setRecipeIdeas(basicFallback);
      return basicFallback;
    } finally {
      setCurrentStep("suggestions");
      setIsLoading(false);
    }
  };

  const handleQuizComplete = async (data: any) => {
    // Handle random cuisine selection if multiple are chosen
    let selectedCuisine = data.cuisine || [];
    if (Array.isArray(selectedCuisine) && selectedCuisine.length > 1) {
      // Randomly select one cuisine from the array - this changes each time
      selectedCuisine = [selectedCuisine[Math.floor(Math.random() * selectedCuisine.length)]];
    }

    // Transform SlideQuizShell data to match expected API format
    const transformedData = {
      mood: data.mood,
      cuisine: selectedCuisine,
      time: data.time || 30,
      budget: data.budget,
      dietary: data.dietary || [],
      equipment: data.equipment || [],
      ambition: data.ambition || 3,
      servings: data.servings || 4,
      supermarket: data.supermarket
    };

    setQuizData(transformedData);
    setHasSentPrompt1Twice(false); // Reset retry state for new quiz
    
    // Generate initial batch of recipe ideas
    await generateRecipeIdeas(transformedData);
  };

  // Handle when all recipes are rejected - trigger second batch
  const handleAllRecipesRejected = async () => {
    if (!hasSentPrompt1Twice && quizData) {
      setHasSentPrompt1Twice(true);
      await generateRecipeIdeas(quizData, true);
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

    // Generate full recipe using backend API
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
        {showUserMenu && <UserMenu onClose={() => setShowUserMenu(false)} />}
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
        {showUserMenu && <UserMenu onClose={() => setShowUserMenu(false)} />}
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
        {showUserMenu && <UserMenu onClose={() => setShowUserMenu(false)} />}
      </div>
    );
  }

  return null;
}

Creative guidance: Add one unexpected ingredient or technique that elevates each dish beyond the ordinary while respecting the constraints.

Ensure the 5 ideas are meaningfully distinct from each other in ingredients, style, or technique.

Return a JSON object with this exact structure:
{
  "recipes": [
    {
      "title": "Recipe Name", 
      "description": "Brief appealing description in one sentence"
    }
  ]
}`;

      // Make direct OpenAI API call from frontend with your mapped prompts
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [{ role: 'user', content: enhancedPrompt }],
          response_format: { type: "json_object" }
        })
      });

      if (response.ok) {
        const result = await response.json();
        const parsedResult = JSON.parse(result.choices[0].message.content);
        setRecipeIdeas(parsedResult.recipes || []);
        console.log("Successfully generated recipes with your mapped prompt system!");
      } else {
        throw new Error('OpenAI API call failed');
      }
      
    } catch (error) {
      console.error("Recipe generation failed:", error);
      // Basic fallback if everything fails
      const basicFallback = [
        {
          title: "Simple Pasta Bowl",
          description: "Quick and satisfying pasta with your favorite sauce and toppings."
        }
      ];
      setRecipeIdeas(basicFallback);
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

    // Generate full recipe using direct OpenAI API call
    try {
      setIsLoading(true);
      
      // Build mapped prompt for full recipe generation (Prompt 2)
      const moodText = quizData.mood ? `The user wants ${quizData.mood} food that brings comfort and satisfaction.` : '';
      const budgetText = quizData.budget ? `Budget level: ${quizData.budget} - suggest ingredients that fit this price range.` : '';
      const timeText = quizData.time ? `Cooking time preference: ${quizData.time} minutes maximum.` : '';
      const dietaryText = quizData.dietary?.length ? `Dietary requirements: ${quizData.dietary.join(', ')}.` : '';
      const equipmentText = quizData.equipment?.length ? `Available equipment: ${quizData.equipment.join(', ')}.` : '';
      const ambitionText = quizData.ambition ? `Cooking ambition level: ${quizData.ambition}/5 - adjust complexity accordingly.` : '';
      
      const fullRecipePrompt = `You are an elite private chef creating a complete recipe.

Generate a detailed recipe for "${recipe.title}": ${recipe.description}

Personalization requirements:
${moodText}
${budgetText}
${timeText}
${dietaryText}
${equipmentText}
${ambitionText}

Create a shopping list optimized for ${quizData.supermarket || 'any supermarket'}.

Creative guidance: Include one technique or ingredient substitution that elevates this dish beyond the ordinary while respecting all constraints.

Return a JSON object with this exact structure:
{
  "title": "Recipe Name",
  "description": "Appealing description",
  "ingredients": ["ingredient 1", "ingredient 2"],
  "instructions": ["step 1", "step 2"],
  "cookTime": 30,
  "servings": 4,
  "difficulty": "Easy/Medium/Hard",
  "shoppingList": ["shopping item 1", "shopping item 2"]
}`;

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [{ role: 'user', content: fullRecipePrompt }],
          response_format: { type: "json_object" }
        })
      });

      if (response.ok) {
        const result = await response.json();
        const parsedRecipe = JSON.parse(result.choices[0].message.content);
        setSelectedRecipe(parsedRecipe);
        setCurrentStep("recipe");
        console.log("Successfully generated complete recipe with mapped prompts!");
      } else {
        throw new Error('OpenAI API call failed for full recipe');
      }
    } catch (error) {
      console.error("Failed to generate full recipe:", error);
      setSelectedRecipe({
        ...recipe,
        ingredients: ["Recipe generation temporarily unavailable"],
        instructions: ["Please try again or refresh the page"],
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