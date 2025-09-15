import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import GlobalHeader from "@/components/GlobalHeader";
import GlobalFooter from "@/components/GlobalFooter";
import GlobalNavigation from "@/components/GlobalNavigation";
import SettingsPanel from "@/components/SettingsPanel";
import UserMenu from "@/components/UserMenu";
import RecipeCard from "@/components/RecipeCard";
import FloatingChatButton from "@/components/FloatingChatButton";
import Loading from "@/components/Loading";
import { checkQuotaBeforeGPT, getRemainingRecipes } from "@/lib/quotaManager";
import { apiRequest } from "@/lib/queryClient";
import AuthModal from "@/components/AuthModal";
import { iconMap } from "@/lib/iconMap";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Wand2, Loader2, Settings, Clock, ChefHat, Utensils } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function ChefAssistMode() {
  const [, navigate] = useLocation();
  const [currentStep, setCurrentStep] = useState<"main" | "inspire" | "recipe">("main");
  const [generatedRecipe, setGeneratedRecipe] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showNavigation, setShowNavigation] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [inspirationTitles, setInspirationTitles] = useState<string[]>([]);
  const [selectedTitle, setSelectedTitle] = useState<string | null>(null);
  const [isGeneratingInspiration, setIsGeneratingInspiration] = useState(false);
  const [showPreferencesEdit, setShowPreferencesEdit] = useState(false);
  const [editingPreferences, setEditingPreferences] = useState<any>(null);
  const { toast } = useToast();

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

  // Get user preferences
  const { data: preferences, isLoading: preferencesLoading, refetch: refetchPreferences } = useQuery({
    queryKey: ["/api/user-preferences"],
    enabled: !!(user as any)?.user,
    retry: false,
  });

  if (userLoading) {
    return <Loading message="Loading your profile..." />;
  }

  const isAuthenticated = !!(user as any)?.user;

  // Close all menus on component mount
  useEffect(() => {
    closeAllMenus();
  }, []);

  // Generate recipe from preferences
  const generateRecipeFromPreferences = async (customIntent?: string) => {
    // Check global quota before proceeding with GPT
    const allowed = await checkQuotaBeforeGPT();
    if (!allowed) {
      setShowAuthModal(true);
      return;
    }

    try {
      setIsLoading(true);
      
      // Use current preferences or defaults
      const prefs = preferences as any;
      
      const requestData = {
        intent: customIntent || "Create a delicious recipe based on my preferences",
        dietary: prefs?.dietaryRestrictions || [],
        time: prefs?.timePreference || 60,
        ambition: prefs?.ambitionLevel || "balanced",
        equipment: prefs?.availableEquipment || [],
        servings: "4",
        cuisinePreference: prefs?.preferredCuisines?.[0] || ""
      };

      // Generate recipe using the chef endpoint
      const fetchResponse = await fetch("/api/chef-assist-recipe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestData)
      });
      
      if (!fetchResponse.ok) {
        throw new Error(`API call failed with status: ${fetchResponse.status}`);
      }

      const response = await fetchResponse.json();
      console.log("Chef API Response:", response);
      
      if (response && (response.title || response.recipe)) {
        setGeneratedRecipe(response.recipe || response);
        setCurrentStep("recipe");
      } else {
        throw new Error("No recipe data received");
      }
    } catch (error) {
      console.error("Failed to generate recipe:", error);
      toast({
        title: "Generation Failed",
        description: "Failed to generate recipe. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Generate recipe inspiration titles
  const generateInspiration = async () => {
    if (!isAuthenticated) {
      setShowAuthModal(true);
      return;
    }

    const allowed = await checkQuotaBeforeGPT();
    if (!allowed) {
      setShowAuthModal(true);
      return;
    }

    setIsGeneratingInspiration(true);
    try {
      const prefs = preferences as any;
      
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
          clientId: (user as any)?.user?.id || 'anonymous',
          cuisinePreference: prefs?.preferredCuisines?.[0] || '',
          avoid: prefs?.avoidedIngredients || []
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
              clientId: (user as any)?.user?.id || 'anonymous',
              cuisinePreference: prefs?.preferredCuisines?.[0] || '',
              avoid: prefs?.avoidedIngredients || []
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
      toast({
        title: "Inspiration Failed",
        description: "Failed to generate inspiration. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsGeneratingInspiration(false);
    }
  };

  // Handle selecting an inspiration title
  const handleTitleSelection = async (title: string) => {
    setSelectedTitle(title);
    await generateRecipeFromPreferences(title);
  };

  const handleBackToMain = () => {
    setCurrentStep("main");
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
    refetchPreferences();
  };

  // Show preferences editing
  const handleEditPreferences = () => {
    if (!isAuthenticated) {
      setShowAuthModal(true);
      return;
    }
    setEditingPreferences(preferences ? { ...preferences } : {
      preferredCuisines: [],
      dietaryRestrictions: [],
      timePreference: 60,
      ambitionLevel: "balanced",
      availableEquipment: [],
      avoidedIngredients: []
    });
    setShowPreferencesEdit(true);
  };

  // Save preferences
  const handleSavePreferences = async () => {
    if (!editingPreferences) return;
    
    try {
      const response = await apiRequest("POST", "/api/user-preferences", editingPreferences);
      if (!response.ok) throw new Error("Failed to save preferences");
      
      await refetchPreferences();
      setShowPreferencesEdit(false);
      
      toast({
        title: "Preferences Saved",
        description: "Your cooking preferences have been updated."
      });
    } catch (error: any) {
      toast({
        title: "Save Failed",
        description: error.message || "Failed to save preferences.",
        variant: "destructive"
      });
    }
  };

  // Quick generate without inspiration
  const handleQuickGenerate = () => {
    if (!isAuthenticated) {
      setShowAuthModal(true);
      return;
    }
    generateRecipeFromPreferences();
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

        {currentStep === "main" && (
          <div className="max-w-4xl mx-auto space-y-8">
            {/* Header */}
            <div className="text-center space-y-4">
              <div className="flex items-center justify-center gap-3 mb-4">
                <ChefHat className="w-8 h-8 text-orange-500" />
                <h1 className="text-3xl font-bold text-foreground">Chef Assist Mode</h1>
              </div>
              <p className="text-lg text-muted-foreground">
                Get personalized recipe suggestions based on your cooking preferences
              </p>
            </div>

            {/* Main Action Buttons */}
            <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto">
              {/* Primary: Inspire Me Button */}
              <Card className="border-2 border-orange-200 dark:border-orange-800 bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/20 dark:to-amber-950/20">
                <CardContent className="p-6 text-center space-y-4">
                  <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center">
                    <Sparkles className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-orange-900 dark:text-orange-100 mb-2">
                      Get Inspired
                    </h3>
                    <p className="text-sm text-orange-700 dark:text-orange-200 mb-4">
                      Let AI suggest creative recipe ideas based on your taste
                    </p>
                  </div>
                  <Button
                    onClick={generateInspiration}
                    disabled={isGeneratingInspiration}
                    className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-medium py-3 h-auto"
                    data-testid="button-inspire-me"
                  >
                    {isGeneratingInspiration ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Generating Ideas...
                      </>
                    ) : (
                      <>
                        <Wand2 className="w-5 h-5 mr-2" />
                        Inspire Me!
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              {/* Secondary: Quick Generate */}
              <Card className="border-2 border-slate-200 dark:border-slate-700">
                <CardContent className="p-6 text-center space-y-4">
                  <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-slate-500 to-slate-600 flex items-center justify-center">
                    <Utensils className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-foreground mb-2">
                      Quick Recipe
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Generate a recipe instantly using your saved preferences
                    </p>
                  </div>
                  <Button
                    onClick={handleQuickGenerate}
                    disabled={isLoading}
                    className="w-full"
                    variant="outline"
                    data-testid="button-quick-generate"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Clock className="w-5 h-5 mr-2" />
                        Quick Generate
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Preferences Summary & Edit */}
            <Card className="max-w-3xl mx-auto">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Settings className="w-5 h-5" />
                    <span>Your Cooking Preferences</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleEditPreferences}
                    data-testid="button-edit-preferences"
                  >
                    {preferences ? "Edit" : "Set Up"}
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {preferences ? (
                  <div className="grid md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-muted-foreground">Cooking Time:</span>
                      <span className="ml-2">{(preferences as any)?.timePreference || 60} minutes</span>
                    </div>
                    <div>
                      <span className="font-medium text-muted-foreground">Ambition Level:</span>
                      <span className="ml-2 capitalize">{(preferences as any)?.ambitionLevel || "Balanced"}</span>
                    </div>
                    <div>
                      <span className="font-medium text-muted-foreground">Dietary:</span>
                      <span className="ml-2">
                        {(preferences as any)?.dietaryRestrictions?.length > 0 
                          ? (preferences as any).dietaryRestrictions.join(", ") 
                          : "No restrictions"}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium text-muted-foreground">Cuisines:</span>
                      <span className="ml-2">
                        {(preferences as any)?.preferredCuisines?.length > 0 
                          ? (preferences as any).preferredCuisines.slice(0, 3).join(", ") + ((preferences as any).preferredCuisines.length > 3 ? "..." : "")
                          : "All cuisines"}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground mb-4">
                      Set up your cooking preferences to get personalized recipe suggestions
                    </p>
                    <Button
                      onClick={handleEditPreferences}
                      variant="outline"
                      data-testid="button-setup-preferences"
                    >
                      <Settings className="w-4 h-4 mr-2" />
                      Set Up Preferences
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
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
                          <ChefHat className="w-6 h-6 text-white" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold text-foreground mb-2 leading-tight">
                          {title}
                        </h3>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-xs">
                            <Clock className="w-3 h-3 mr-1" />
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
                onClick={handleBackToMain}
                className="flex-1"
                data-testid="button-back-to-main"
              >
                <iconMap.arrowLeft className="w-4 h-4 mr-2" />
                Back to Main
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
              quizData={null}
              isFullView={true}
              onBack={handleBackToMain}
              showNewSearchButton={true}
              onNewSearch={handleBackToMain}
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

      {/* Preferences Editing Modal */}
      {showPreferencesEdit && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-card rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <Card className="border-0">
              <CardHeader>
                <CardTitle className="text-xl text-center flex items-center justify-center gap-2">
                  <Settings className="w-5 h-5" />
                  Your Cooking Preferences
                </CardTitle>
                <p className="text-muted-foreground text-center">
                  Customize your preferences to get better recipe suggestions
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Time Preference */}
                  <div className="space-y-2">
                    <Label htmlFor="timePreference" className="text-foreground">Cooking Time Preference (minutes)</Label>
                    <Input
                      id="timePreference"
                      type="number"
                      min="15"
                      max="180"
                      value={editingPreferences?.timePreference || ""}
                      onChange={(e) => setEditingPreferences((prev: any) => ({ ...prev, timePreference: parseInt(e.target.value) || 60 }))}
                      className="bg-background border-border text-foreground"
                      placeholder="60"
                    />
                  </div>

                  {/* Ambition Level */}
                  <div className="space-y-2">
                    <Label className="text-foreground">Cooking Ambition</Label>
                    <Select
                      value={editingPreferences?.ambitionLevel || "balanced"}
                      onValueChange={(value) => setEditingPreferences((prev: any) => ({ ...prev, ambitionLevel: value }))}
                    >
                      <SelectTrigger className="bg-background border-border text-foreground">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="quick">Quick & Simple</SelectItem>
                        <SelectItem value="balanced">Balanced</SelectItem>
                        <SelectItem value="ambitious">Adventurous</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Skill Level */}
                  <div className="space-y-2">
                    <Label className="text-foreground">Skill Level</Label>
                    <Select
                      value={editingPreferences?.skillLevel || "intermediate"}
                      onValueChange={(value) => setEditingPreferences((prev: any) => ({ ...prev, skillLevel: value }))}
                    >
                      <SelectTrigger className="bg-background border-border text-foreground">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="beginner">Beginner</SelectItem>
                        <SelectItem value="intermediate">Intermediate</SelectItem>
                        <SelectItem value="advanced">Advanced</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Budget Preference */}
                  <div className="space-y-2">
                    <Label className="text-foreground">Budget Preference</Label>
                    <Select
                      value={editingPreferences?.budgetPreference || "moderate"}
                      onValueChange={(value) => setEditingPreferences((prev: any) => ({ ...prev, budgetPreference: value }))}
                    >
                      <SelectTrigger className="bg-background border-border text-foreground">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="budget">Budget-Friendly</SelectItem>
                        <SelectItem value="moderate">Moderate</SelectItem>
                        <SelectItem value="premium">Premium</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Cuisine Preferences */}
                  <div className="space-y-2 md:col-span-2">
                    <Label className="text-foreground">Preferred Cuisines</Label>
                    <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
                      {['British', 'Mediterranean', 'Asian', 'Indian', 'Mexican', 'Italian', 'French', 'Thai', 'Chinese', 'Japanese', 'Greek', 'Middle Eastern'].map((cuisine) => {
                        const cuisineKey = cuisine.toLowerCase();
                        const currentPrefs = editingPreferences?.preferredCuisines || [];
                        const isSelected = currentPrefs.includes(cuisineKey);
                        
                        return (
                          <Button
                            key={cuisine}
                            type="button"
                            variant={isSelected ? "default" : "outline"}
                            size="sm"
                            onClick={() => {
                              const current = editingPreferences?.preferredCuisines || [];
                              const updated = isSelected 
                                ? current.filter((c: string) => c !== cuisineKey)
                                : [...current, cuisineKey];
                              setEditingPreferences((prev: any) => ({ ...prev, preferredCuisines: updated }));
                            }}
                            className={isSelected 
                              ? "bg-orange-500 hover:bg-orange-600 text-white" 
                              : "border-border text-foreground hover:bg-muted"
                            }
                          >
                            {cuisine}
                          </Button>
                        );
                      })}
                    </div>
                    <p className="text-xs text-muted-foreground">Select multiple cuisines you enjoy</p>
                  </div>
                </div>

                {/* Dietary Restrictions */}
                <div className="space-y-2">
                  <Label className="text-foreground">Dietary Restrictions</Label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {['Vegetarian', 'Vegan', 'Gluten-free', 'Dairy-free', 'Nut-free', 'Low-carb', 'Keto', 'Paleo'].map((diet) => {
                      const dietKey = diet.toLowerCase();
                      const currentRestrictions = editingPreferences?.dietaryRestrictions || [];
                      const isSelected = currentRestrictions.includes(dietKey);
                      
                      return (
                        <Button
                          key={diet}
                          type="button"
                          variant={isSelected ? "default" : "outline"}
                          size="sm"
                          onClick={() => {
                            const current = editingPreferences?.dietaryRestrictions || [];
                            const updated = isSelected 
                              ? current.filter((d: string) => d !== dietKey)
                              : [...current, dietKey];
                            setEditingPreferences((prev: any) => ({ ...prev, dietaryRestrictions: updated }));
                          }}
                          className={isSelected 
                            ? "bg-green-500 hover:bg-green-600 text-white" 
                            : "border-border text-foreground hover:bg-muted"
                          }
                        >
                          {diet}
                        </Button>
                      );
                    })}
                  </div>
                </div>

                {/* Avoided Ingredients */}
                <div className="space-y-2">
                  <Label htmlFor="avoidedIngredients" className="text-foreground">Ingredients to Avoid</Label>
                  <Textarea
                    id="avoidedIngredients"
                    value={editingPreferences?.avoidedIngredients?.join(', ') || ""}
                    onChange={(e) => {
                      const ingredients = e.target.value ? e.target.value.split(',').map(i => i.trim()).filter(Boolean) : [];
                      setEditingPreferences((prev: any) => ({ ...prev, avoidedIngredients: ingredients }));
                    }}
                    className="bg-background border-border text-foreground min-h-[80px]"
                    placeholder="e.g., mushrooms, cilantro, blue cheese..."
                  />
                  <p className="text-xs text-muted-foreground">Separate multiple ingredients with commas</p>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 justify-center pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setShowPreferencesEdit(false)}
                    className="border-border text-foreground hover:bg-muted"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSavePreferences}
                    className="bg-orange-500 hover:bg-orange-600 text-white px-8"
                  >
                    Save Preferences
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

    </div>
  );
}