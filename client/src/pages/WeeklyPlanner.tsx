import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import GlobalHeader from "@/components/GlobalHeader";
import GlobalFooter from "@/components/GlobalFooter";
import GlobalNavigation from "@/components/GlobalNavigation";
// import SettingsPanel from "@/components/SettingsPanel";
// import UserMenu from "@/components/UserMenu";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Calendar, Clock, Users, ShoppingCart, Download, RefreshCw, Settings, ImageIcon, ChefHat, TrendingUp, PieChart, Share2, BarChart3 } from "lucide-react";

// Analytics interfaces
interface SavingsMetrics {
  weeklyHomeCookingSavings: number;
  monthlyHomeCookingSavings: number;
  estimatedFoodWasteAvoided: number;
  efficiencyScore: number;
  takeawayComparison: {
    averageRecipeCost: number;
    averageTakeawayCost: number;
    savingsPerMeal: number;
  };
}

interface TasteProfile {
  cuisinePreferences: Array<{
    cuisine: string;
    percentage: number;
    recipeCount: number;
    completionRate: number;
  }>;
  cookingPatterns: {
    preferredDifficulty: string;
    averageCookTime: number;
    mostActiveDay: string;
    seasonality: Record<string, number>;
  };
  dietaryTrends: {
    vegetarianRecipes: number;
    healthyRecipes: number;
    comfortFoodRecipes: number;
  };
  confidenceScore: number;
}
import { useToast } from "@/hooks/use-toast";
import AuthModal from "@/components/AuthModal";
import FlavrPlusUpgradeModal from "@/components/FlavrPlusUpgradeModal";
import WeeklyPlannerOnboarding from "@/components/WeeklyPlannerOnboarding";
import ShoppingListModal from "@/components/ShoppingListModal";

export default function WeeklyPlanner() {
  const [, navigate] = useLocation();
  const [showNavigation, setShowNavigation] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [currentWeekPlan, setCurrentWeekPlan] = useState<any>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Three-step generation states
  const [showPreferencesReview, setShowPreferencesReview] = useState(false);
  const [showMealCountSelection, setShowMealCountSelection] = useState(false);
  const [selectedMealCount, setSelectedMealCount] = useState<number>(7);
  const [showTitleReview, setShowTitleReview] = useState(false);
  const [proposedTitles, setProposedTitles] = useState<any[]>([]);
  const [isGeneratingTitles, setIsGeneratingTitles] = useState(false);
  const [isGeneratingRecipes, setIsGeneratingRecipes] = useState(false);
  const [editingPreferences, setEditingPreferences] = useState<any>(null);
  // Shopping list modal state
  const [showShoppingListModal, setShowShoppingListModal] = useState(false);
  const [shoppingListData, setShoppingListData] = useState<string[]>([]);
  // Removed estimatedCost state - users shouldn't see internal costs
  const { toast } = useToast();

  // Close all menus
  const closeAllMenus = () => {
    setShowNavigation(false);
    setShowSettings(false);
    setShowUserMenu(false);
  };

  // Get user authentication status
  const { data: user } = useQuery({
    queryKey: ["/api/me"],
    retry: false,
  });
  const isAuthenticated = !!(user as any)?.user;

  // Close all menus on component mount
  useEffect(() => {
    closeAllMenus();
  }, []);

  // Open specific menu and close others
  const openMenu = (menuType: 'navigation' | 'settings' | 'userMenu') => {
    closeAllMenus();
    if (menuType === 'navigation') setShowNavigation(true);
    if (menuType === 'settings') setShowSettings(true);
    if (menuType === 'userMenu') setShowUserMenu(true);
  };

  // Get user's weekly planning preferences
  const { data: preferences, isLoading: preferencesLoading, refetch: refetchPreferences } = useQuery({
    queryKey: ["/api/weekly-plan-preferences"],
    enabled: isAuthenticated,
    retry: false,
  });

  // Get current week's plan
  const { data: weeklyPlans, refetch: refetchPlans } = useQuery({
    queryKey: ["/api/weekly-plans"],
    enabled: isAuthenticated && !!preferences && !(preferences as any)?.onboardingRequired,
    retry: false,
  });

  // Get user's savings metrics
  const { data: savingsData } = useQuery<SavingsMetrics>({
    queryKey: ["/api/analytics/my-savings"],
    enabled: isAuthenticated && (user as any)?.user?.hasFlavrPlus,
    retry: false,
  });

  // Get user's taste profile
  const { data: tasteData } = useQuery<TasteProfile>({
    queryKey: ["/api/analytics/my-taste-profile"],
    enabled: isAuthenticated && (user as any)?.user?.hasFlavrPlus,
    retry: false,
  });

  useEffect(() => {
    if (weeklyPlans && (weeklyPlans as any).length > 0) {
      const plans = weeklyPlans as any[];
      
      // Always show the most recently generated plan (first in array since ordered by generatedAt desc)
      // This ensures users see their latest creation after app restart
      setCurrentWeekPlan(plans[0]);
    }
  }, [weeklyPlans]);

  // STEP 1: Generate recipe titles for review
  const handleGenerateWeeklyTitles = async () => {
    if (!isAuthenticated) {
      setShowAuthModal(true);
      return;
    }

    if (!preferences || (preferences as any)?.onboardingRequired) {
      toast({
        title: "Setup Required",
        description: "Please complete your weekly planning preferences first.",
        variant: "destructive"
      });
      return;
    }

    setIsGeneratingTitles(true);
    try {
      const response = await apiRequest("POST", "/api/generate-weekly-titles", {
        mealCount: selectedMealCount
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate titles');
      }
      
      const titleProposal = await response.json();
      setProposedTitles(titleProposal.titles);
      // Cost removed from UI
      setShowTitleReview(true);
      setShowMealCountSelection(false); // Ensure we stay on title review
      
      toast({
        title: "Recipe Ideas Generated!",
        description: `${titleProposal.titles.length} recipe titles ready for review.`,
      });
    } catch (error: any) {
      console.error("Error generating titles:", error);
      toast({
        title: "Generation Failed",
        description: error.message || "Failed to generate recipe ideas. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsGeneratingTitles(false);
    }
  };

  // STEP 2: Generate full recipes from approved titles
  const handleGenerateFromTitles = async (approvedTitles: any[]) => {
    setIsGeneratingRecipes(true);
    try {
      const response = await apiRequest("POST", "/api/generate-from-titles", {
        approvedTitles,
        weekStartDate: getThisMonday().toISOString()
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate recipes');
      }
      
      const newPlan = await response.json();
      setCurrentWeekPlan(newPlan);
      setShowTitleReview(false);
      setProposedTitles([]);
      refetchPlans();
      
      toast({
        title: "Weekly Plan Generated!",
        description: "Your personalized meal plan has been automatically saved and is ready to use.",
      });
    } catch (error: any) {
      console.error("Error generating recipes:", error);
      toast({
        title: "Generation Failed",
        description: error.message || "Failed to generate recipes. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsGeneratingRecipes(false);
    }
  };

  // Regenerate single title
  const handleRegenerateTitle = async (day: string, index: number) => {
    try {
      const response = await apiRequest("POST", "/api/regenerate-title", {
        day,
        currentTitle: proposedTitles[index]?.title
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to regenerate title');
      }
      
      const { title } = await response.json();
      const updatedTitles = [...proposedTitles];
      updatedTitles[index] = title;
      setProposedTitles(updatedTitles);
      
    } catch (error: any) {
      console.error("Error regenerating title:", error);
      toast({
        title: "Regeneration Failed",
        description: error.message || "Failed to regenerate title. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Go directly to meal count selection (preferences are optional)
  const handleGenerateWeeklyPlan = () => {
    setShowMealCountSelection(true);
  };

  // Show preferences editing as optional step
  const handleEditPreferences = () => {
    if (!preferences) return;
    setEditingPreferences({ ...preferences });
    setShowPreferencesReview(true);
  };

  // Save preferences and proceed to meal count selection
  const handleSavePreferencesAndContinue = async () => {
    if (!editingPreferences) return;
    
    try {
      const response = await apiRequest("PUT", "/api/weekly-plan-preferences", editingPreferences);
      if (!response.ok) throw new Error("Failed to update preferences");
      
      await refetchPreferences();
      setShowPreferencesReview(false);
      setShowMealCountSelection(true);
      
      toast({
        title: "Preferences Updated",
        description: "Your weekly planning preferences have been saved."
      });
    } catch (error: any) {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update preferences.",
        variant: "destructive"
      });
    }
  };

  // Start title generation with selected meal count
  const handleStartTitleGeneration = async () => {
    // Don't hide meal count selection until titles are ready
    await handleGenerateWeeklyTitles();
  };

  // Reset all states to start fresh
  const handleStartAgain = () => {
    setCurrentWeekPlan(null);
    setShowPreferencesReview(false);
    setShowMealCountSelection(false);
    setSelectedMealCount(7);
    setShowTitleReview(false);
    setProposedTitles([]);
    setIsGenerating(false);
    setIsGeneratingTitles(false);
    setIsGeneratingRecipes(false);
    setEditingPreferences(null);
    
    // Refetch fresh data
    refetchPlans();
    refetchPreferences();
    
    toast({
      title: "Reset Complete",
      description: "Ready to create a new weekly plan!"
    });
  };



  const handleViewRecipe = (recipeId: number) => {
    // Navigate to recipe view page
    window.open(`/recipe/${recipeId}`, '_blank');
  };


  const handleExportPlan = async () => {
    if (!currentWeekPlan) return;

    try {
      const response = await fetch(`/api/weekly-plans/${currentWeekPlan.id}/export`);
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `flavr-weekly-plan-${currentWeekPlan.weekStartDate}.ics`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        toast({
          title: "Plan Exported",
          description: "Your weekly plan has been exported to your calendar! Import the .ics file to sync with any calendar app."
        });
      }
    } catch (error) {
      console.error("Error exporting plan:", error);
      toast({
        title: "Error",
        description: "Failed to export plan. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleShoppingList = async () => {
    if (!currentWeekPlan) return;

    try {
      const response = await apiRequest("GET", `/api/weekly-plans/${currentWeekPlan.id}/shopping-list`);
      
      if (response.ok) {
        const shoppingData = await response.json();
        const shoppingList = shoppingData.shoppingList || [];
        
        if (shoppingList.length === 0) {
          toast({
            title: "Shopping List Empty",
            description: "No ingredients found. Make sure your recipes have been fully generated.",
            variant: "destructive"
          });
          return;
        }

        // Store shopping list data and open modal
        setShoppingListData(shoppingList);
        setShowShoppingListModal(true);
        
      }
    } catch (error) {
      console.error("Error getting shopping list:", error);
      toast({
        title: "Error",
        description: "Failed to generate shopping list. Please try again.",
        variant: "destructive"
      });
    }
  };

  const getThisMonday = () => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(today);
    monday.setDate(monday.getDate() + daysToMonday);
    return monday;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short'
    });
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
        <GlobalHeader 
          onMenuClick={() => openMenu('navigation')}
          onBackClick={() => navigate("/app")}
          backButtonText="Back to Modes"
        />
        
        <main className="pt-20 pb-24">
          <div className="max-w-4xl mx-auto px-4 py-16 text-center">
            <Calendar className="w-16 h-16 text-orange-400 mx-auto mb-6" />
            <h1 className="text-3xl font-bold text-white mb-4">Weekly Meal Planner</h1>
            <p className="text-slate-300 mb-8 max-w-2xl mx-auto">
              Get personalized weekly meal plans with shopping lists and calendar integration. 
              Perfect for busy families who want to eat well without the planning stress.
            </p>
            
            <Button 
              onClick={() => setShowAuthModal(true)}
              className="bg-orange-500 hover:bg-orange-600 text-white px-8 py-3 text-lg"
            >
              Get Started
            </Button>
          </div>
        </main>

        <GlobalFooter currentMode="weekly-planner" />
        <GlobalNavigation 
          isOpen={showNavigation}
          onClose={closeAllMenus}
        />
        <AuthModal 
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
        />
      </div>
    );
  }

  if (preferencesLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
        <GlobalHeader 
          onMenuClick={() => openMenu('navigation')}
          onBackClick={() => navigate("/app")}
          backButtonText="Back to Modes"
        />
        <main className="pt-20 pb-24">
          <div className="max-w-4xl mx-auto px-4 py-16 text-center">
            <div className="animate-spin w-8 h-8 border-4 border-orange-400 border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-slate-300">Loading your weekly planner...</p>
          </div>
        </main>
      </div>
    );
  }

  if (!preferences || preferences?.onboardingRequired) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
        <GlobalHeader 
          onMenuClick={() => openMenu('navigation')}
          onBackClick={() => navigate("/app")}
          backButtonText="Back to Modes"
        />
        
        <main className="pt-20 pb-24">
          <div className="max-w-4xl mx-auto px-4 py-16">
            <div className="text-center mb-8">
              <Calendar className="w-16 h-16 text-orange-400 mx-auto mb-6" />
              <h1 className="text-3xl font-bold text-white mb-4">Set Up Your Weekly Planner</h1>
              <p className="text-slate-300 mb-8">
                Tell us about your household and cooking preferences to get personalized weekly meal plans.
              </p>
            </div>
            
            <WeeklyPlannerOnboarding 
              onComplete={() => {
                refetchPreferences();
                refetchPlans();
                toast({
                  title: "Setup Complete!",
                  description: "You're ready to generate your first weekly meal plan.",
                });
              }} 
            />
          </div>
        </main>

        <GlobalFooter currentMode="weekly-planner" />
        <GlobalNavigation isOpen={showNavigation} onClose={closeAllMenus} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
      <GlobalHeader 
        onMenuClick={() => openMenu('navigation')}
        onBackClick={() => window.location.href = "/app"}
        backButtonText="Back to Modes"
      />
      
      <main className="pt-20 pb-24">
        <div className="max-w-6xl mx-auto px-4 py-8">
          
          {/* Header */}
          <div className="text-center mb-8">
            <Calendar className="w-12 h-12 text-orange-400 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-white mb-2">Weekly Meal Planner</h1>
            <p className="text-slate-300">Your personalized cooking schedule</p>
          </div>

          {/* Analytics Dashboard - Only for Flavr+ members */}
          {isAuthenticated && (user as any)?.user?.hasFlavrPlus && (
            <div className="mb-8 space-y-4">
              {/* Savings & Waste Meter */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-green-500/20">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-green-400 text-lg flex items-center gap-2">
                      <TrendingUp className="w-5 h-5" />
                      Savings & Waste Meter
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-300 text-sm">vs Takeaway</span>
                        <span className="text-green-400 font-bold">
                          £{savingsData?.weeklyHomeCookingSavings || 0} saved
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-300 text-sm">Food Waste Avoided</span>
                        <span className="text-green-400 font-bold">
                          {savingsData?.estimatedFoodWasteAvoided || 0}kg this week
                        </span>
                      </div>
                      <div className="w-full bg-slate-700 rounded-full h-2">
                        <div 
                          className="bg-green-400 h-2 rounded-full transition-all duration-500" 
                          style={{ width: `${savingsData?.efficiencyScore || 0}%` }}
                        ></div>
                      </div>
                      <p className="text-xs text-slate-400">
                        {savingsData?.efficiencyScore > 0 
                          ? `You're ${savingsData.efficiencyScore}% more efficient than average!`
                          : "Start cooking to see your savings!"
                        }
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Taste Portrait Preview */}
                <Card className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-purple-500/20">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-purple-400 text-lg flex items-center gap-2">
                      <PieChart className="w-5 h-5" />
                      This Month's Taste Portrait
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {tasteData?.cuisinePreferences?.length > 0 ? (
                        <>
                          {tasteData.cuisinePreferences.slice(0, 3).map((cuisine: any, index: number) => (
                            <div key={cuisine.cuisine} className="flex justify-between items-center">
                              <span className="text-slate-300 text-sm capitalize">{cuisine.cuisine}</span>
                              <span className="text-purple-400 font-semibold">{cuisine.percentage}%</span>
                            </div>
                          ))}
                        </>
                      ) : (
                        <div className="text-center py-2">
                          <p className="text-slate-400 text-sm">Generate more recipes to see your taste profile!</p>
                        </div>
                      )}
                      
                      <div className="flex items-center gap-2 mt-3">
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-purple-500/50 text-purple-400 hover:bg-purple-500/10 text-xs"
                          onClick={() => {
                            if (tasteData?.cuisinePreferences?.length > 0) {
                              const shareText = `My Flavr cooking style: ${tasteData.cuisinePreferences.slice(0, 3).map((c: any) => `${c.cuisine} ${c.percentage}%`).join(', ')}`;
                              navigator.clipboard.writeText(shareText);
                              toast({
                                title: "Taste Portrait Copied!",
                                description: "Your cooking style has been copied to clipboard."
                              });
                            }
                          }}
                        >
                          <Share2 className="w-3 h-3 mr-1" />
                          Share Portrait
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-purple-500/50 text-purple-400 hover:bg-purple-500/10 text-xs"
                        >
                          <BarChart3 className="w-3 h-3 mr-1" />
                          Full Report
                        </Button>
                      </div>
                      
                      {tasteData?.confidenceScore !== undefined && (
                        <p className="text-xs text-slate-500 mt-2">
                          Profile confidence: {tasteData.confidenceScore}%
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* Title Review Step */}
          {showTitleReview ? (
            <div className="space-y-6">
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white text-xl">
                    Review Your Weekly Recipe Ideas
                  </CardTitle>
                  <p className="text-slate-300">
                    Review and customize your recipe selections before generating the full meal plan.
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {proposedTitles.map((titleData, index) => (
                      <div 
                        key={titleData.day}
                        className="bg-slate-700/50 rounded-lg p-4 border border-slate-600"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="text-white font-semibold capitalize">{titleData.day}</h3>
                          <Badge variant="outline" className="border-slate-500 text-slate-300">
                            {titleData.cuisine}
                          </Badge>
                        </div>
                        
                        <h4 className="text-slate-200 font-medium mb-2 min-h-[3rem]">
                          {titleData.title}
                        </h4>
                        
                        <p className="text-slate-400 text-sm mb-3 min-h-[2.5rem]">
                          {titleData.description}
                        </p>
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1 text-sm text-slate-400">
                            <Clock className="w-3 h-3" />
                            {titleData.estimatedTime} min
                          </div>
                          
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRegenerateTitle(titleData.day, index)}
                            className="border-orange-500 text-orange-400 hover:bg-orange-500/10"
                          >
                            <RefreshCw className="w-3 h-3 mr-1" />
                            Change
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="flex flex-wrap gap-3 mt-6 justify-center">
                    <Button
                      onClick={() => handleGenerateFromTitles(proposedTitles)}
                      disabled={isGeneratingRecipes}
                      className="bg-green-600 hover:bg-green-700 text-white px-6"
                    >
                      {isGeneratingRecipes ? (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                          Generating Recipes...
                        </>
                      ) : (
                        <>
                          Generate Full Recipes
                        </>
                      )}
                    </Button>
                    
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowTitleReview(false);
                        setProposedTitles([]);
                      }}
                      className="border-slate-600 text-slate-300 hover:bg-slate-700"
                    >
                      Cancel
                    </Button>
                    
                    <Button
                      variant="outline"
                      onClick={handleGenerateWeeklyTitles}
                      disabled={isGeneratingTitles}
                      className="border-orange-500 text-orange-400 hover:bg-orange-500/10"
                    >
                      {isGeneratingTitles ? (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2" />
                          Generate New Ideas
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : 
          
          /* Current Week Plan */
          currentWeekPlan ? (
            <div className="space-y-6">
              {/* Plan Status */}
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader className="pb-4">
                  {/* Header with title and status */}
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-4">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                      <CardTitle className="text-white text-xl">
                        Week of {formatDate(currentWeekPlan.weekStartDate)}
                      </CardTitle>
                      
                    </div>
                  </div>
                  
                  {/* Action buttons - distributed across the width */}
                  <div className="flex flex-wrap justify-center lg:justify-between gap-3">
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-slate-600 text-slate-300 hover:bg-slate-700"
                        onClick={handleExportPlan}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Add to Calendar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-slate-600 text-slate-300 hover:bg-slate-700"
                        onClick={handleShoppingList}
                      >
                        <ShoppingCart className="w-4 h-4 mr-2" />
                        Shopping List
                      </Button>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleStartAgain}
                        disabled={isGenerating}
                        className="border-orange-500 text-orange-400 hover:bg-orange-500/10"
                      >
                        {isGenerating ? (
                          <>
                            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                            Generating...
                          </>
                        ) : (
                          <>
                            <RefreshCw className="w-4 h-4 mr-2" />
                            Start Again
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Planned Meals */}
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {currentWeekPlan.plannedRecipes?.map((meal: any) => (
                      <RecipeCardWithImage 
                        key={`${meal.day}-${meal.mealType}`}
                        meal={meal}
                        onClick={() => handleViewRecipe(meal.recipeId)}
                      />
                    ))}
                  </div>

                  {/* Plan Status */}
                  <div className="mt-6 text-center">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-500/20 rounded-lg border border-green-500/30">
                      <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                      <span className="text-green-400 font-medium">Plan Finalized & Ready</span>
                    </div>
                    <p className="text-slate-400 text-sm mt-2">
                      Your weekly meal plan has been automatically saved and is ready to use.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : showPreferencesReview ? (
            /* Preferences Review & Edit */
            <div className="max-w-4xl mx-auto">
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white text-xl text-center flex items-center justify-center gap-2">
                    <Settings className="w-5 h-5" />
                    Review Your Weekly Planning Preferences
                  </CardTitle>
                  <p className="text-slate-300 text-center">
                    Make sure your preferences are up to date before generating recipes
                  </p>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    {/* Household Size */}
                    <div className="space-y-3">
                      <Label className="text-slate-200">Household Size</Label>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="adults" className="text-slate-300 text-sm">Adults</Label>
                          <Select
                            value={editingPreferences?.householdSize?.adults?.toString() || "2"}
                            onValueChange={(value) => setEditingPreferences((prev: any) => ({ 
                              ...prev, 
                              householdSize: { 
                                ...prev?.householdSize, 
                                adults: parseInt(value) 
                              } 
                            }))}
                          >
                            <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="1">1 adult</SelectItem>
                              <SelectItem value="2">2 adults</SelectItem>
                              <SelectItem value="3">3 adults</SelectItem>
                              <SelectItem value="4">4 adults</SelectItem>
                              <SelectItem value="5">5+ adults</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="kids" className="text-slate-300 text-sm">Children</Label>
                          <Select
                            value={editingPreferences?.householdSize?.kids?.toString() || "0"}
                            onValueChange={(value) => setEditingPreferences((prev: any) => ({ 
                              ...prev, 
                              householdSize: { 
                                ...prev?.householdSize, 
                                kids: parseInt(value) 
                              } 
                            }))}
                          >
                            <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="0">No children</SelectItem>
                              <SelectItem value="1">1 child</SelectItem>
                              <SelectItem value="2">2 children</SelectItem>
                              <SelectItem value="3">3 children</SelectItem>
                              <SelectItem value="4">4+ children</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>

                    {/* Budget Per Serving */}
                    <div className="space-y-2">
                      <Label htmlFor="budgetPerServing" className="text-slate-200">Budget Per Serving (£)</Label>
                      <Input
                        id="budgetPerServing"
                        type="number"
                        step="0.50"
                        min="1"
                        max="20"
                        value={editingPreferences?.budgetPerServing || ""}
                        onChange={(e) => setEditingPreferences((prev: any) => ({ ...prev, budgetPerServing: parseFloat(e.target.value) }))}
                        className="bg-slate-700 border-slate-600 text-white"
                        placeholder="4.50"
                      />
                    </div>

                    {/* Cooking Ambition */}
                    <div className="space-y-2">
                      <Label className="text-slate-200">Cooking Ambition</Label>
                      <Select
                        value={editingPreferences?.ambitionLevel || "medium"}
                        onValueChange={(value) => setEditingPreferences((prev: any) => ({ ...prev, ambitionLevel: value }))}
                      >
                        <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Quick & Simple</SelectItem>
                          <SelectItem value="medium">Balanced</SelectItem>
                          <SelectItem value="high">Adventurous</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Cuisine Preferences */}
                    <div className="space-y-2">
                      <Label className="text-slate-200">Cuisine Preferences</Label>
                      <div className="grid grid-cols-3 gap-2">
                        {['British', 'Mediterranean', 'Asian', 'Indian', 'Mexican', 'Italian', 'French', 'Thai', 'Chinese', 'Japanese', 'Greek', 'Middle Eastern'].map((cuisine) => {
                          const cuisineKey = cuisine.toLowerCase();
                          const currentPrefs = editingPreferences?.cuisinePreferences || [];
                          const isSelected = currentPrefs.includes(cuisineKey);
                          
                          return (
                            <Button
                              key={cuisine}
                              type="button"
                              variant={isSelected ? "default" : "outline"}
                              size="sm"
                              onClick={() => {
                                const current = editingPreferences?.cuisinePreferences || [];
                                const updated = isSelected 
                                  ? current.filter((c: string) => c !== cuisineKey)
                                  : [...current, cuisineKey];
                                setEditingPreferences((prev: any) => ({ ...prev, cuisinePreferences: updated }));
                              }}
                              className={isSelected 
                                ? "bg-orange-500 hover:bg-orange-600 text-white" 
                                : "border-slate-600 text-slate-300 hover:bg-slate-700"
                              }
                            >
                              {cuisine}
                            </Button>
                          );
                        })}
                      </div>
                      <p className="text-xs text-slate-400">Select multiple cuisines you enjoy</p>
                    </div>
                  </div>

                  {/* Dietary Needs */}
                  <div className="space-y-2">
                    <Label htmlFor="dietaryNeeds" className="text-slate-200">Dietary Requirements & Preferences</Label>
                    <Textarea
                      id="dietaryNeeds"
                      value={editingPreferences?.dietaryNeeds || ""}
                      onChange={(e) => setEditingPreferences((prev: any) => ({ ...prev, dietaryNeeds: e.target.value }))}
                      className="bg-slate-700 border-slate-600 text-white min-h-[80px]"
                      placeholder="e.g., vegetarian, gluten-free, no nuts, loves spicy food..."
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3 justify-center pt-4">
                    <Button
                      variant="outline"
                      onClick={() => setShowPreferencesReview(false)}
                      className="border-slate-600 text-slate-300 hover:bg-slate-700"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleSavePreferencesAndContinue}
                      className="bg-orange-500 hover:bg-orange-600 text-white px-8"
                    >
                      Save & Continue
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : showMealCountSelection ? (
            /* Meal Count Selection */
            <div className="max-w-2xl mx-auto">
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white text-xl text-center">
                    How many recipes would you like this week?
                  </CardTitle>
                  <p className="text-slate-300 text-center">
                    Choose the number of dinner recipes for your weekly plan
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
                    {[2, 3, 4, 5, 6, 7].map((count) => (
                      <Button
                        key={count}
                        variant={selectedMealCount === count ? "default" : "outline"}
                        onClick={() => setSelectedMealCount(count)}
                        className={selectedMealCount === count 
                          ? "bg-orange-500 hover:bg-orange-600 text-white border-orange-500" 
                          : "border-slate-600 text-slate-300 hover:bg-slate-700 hover:border-orange-500"
                        }
                      >
                        <span className="text-lg font-bold">{count}</span>
                        <span className="text-xs ml-2">
                          {count === 2 ? "recipes" : count === 7 ? "full week" : "recipes"}
                        </span>
                      </Button>
                    ))}
                  </div>
                  
                  <div className="flex gap-3 justify-center flex-wrap">
                    <Button
                      variant="outline"
                      onClick={() => setShowMealCountSelection(false)}
                      className="border-slate-600 text-slate-300 hover:bg-slate-700"
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleEditPreferences}
                      className="border-orange-500 text-orange-400 hover:bg-orange-500/10"
                    >
                      <Settings className="w-4 h-4 mr-2" />
                      Edit Preferences
                    </Button>
                    <Button
                      onClick={handleStartTitleGeneration}
                      disabled={isGeneratingTitles}
                      className="bg-orange-500 hover:bg-orange-600 text-white px-8"
                    >
                      {isGeneratingTitles ? (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          Generate {selectedMealCount} Recipes
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            /* No Plan - Generate New */
            <div className="text-center py-16">
              <Calendar className="w-16 h-16 text-slate-400 mx-auto mb-6" />
              <h2 className="text-2xl font-bold text-white mb-4">Ready for This Week?</h2>
              <p className="text-slate-300 mb-8 max-w-md mx-auto">
                Generate a personalized meal plan based on your preferences and household needs.
              </p>
              
              <Button
                onClick={handleGenerateWeeklyPlan}
                disabled={isGenerating}
                className="bg-orange-500 hover:bg-orange-600 text-white px-8 py-3 text-lg"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                    Generating Plan...
                  </>
                ) : (
                  <>
                    <Calendar className="w-5 h-5 mr-2" />
                    Generate Weekly Plan
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </main>

      <GlobalFooter />
      <GlobalNavigation isOpen={showNavigation} onClose={closeAllMenus} />
      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} onSuccess={() => setShowAuthModal(false)} />
      <FlavrPlusUpgradeModal isOpen={showUpgradeModal} onClose={() => setShowUpgradeModal(false)} />
      <ShoppingListModal 
        isOpen={showShoppingListModal} 
        onClose={() => setShowShoppingListModal(false)}
        shoppingList={shoppingListData}
        weekStartDate={currentWeekPlan?.weekStartDate}
      />
    </div>
  );
}

// Recipe Card with Image Component
function RecipeCardWithImage({ meal, onClick }: { meal: any; onClick: () => void }) {
  const [recipeImage, setRecipeImage] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(true);

  // Fetch recipe details to get image
  const { data: recipe } = useQuery({
    queryKey: ["/api/recipes", meal.recipeId],
    enabled: !!meal.recipeId,
    retry: false,
  });

  useEffect(() => {
    if (recipe) {
      const imageUrl = recipe.imageUrl || recipe.image;
      if (imageUrl) {
        setRecipeImage(imageUrl);
        setImageLoading(false);
      } else {
        setImageLoading(false);
      }
    }
  }, [recipe]);

  return (
    <div 
      className="bg-slate-700/50 rounded-lg border border-slate-600 cursor-pointer hover:bg-slate-700/70 transition-colors overflow-hidden"
      onClick={onClick}
    >
      {/* Recipe Image */}
      <div className="relative w-full h-32 bg-gradient-to-br from-orange-400 to-orange-600">
        {recipeImage && !imageLoading ? (
          <img 
            src={recipeImage} 
            alt={meal.recipeTitle}
            className="w-full h-full object-cover"
            loading="lazy"
            onError={() => {
              setRecipeImage(null);
              setImageLoading(false);
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-white/80">
            {imageLoading ? (
              <div className="animate-pulse">
                <ImageIcon className="w-8 h-8" />
              </div>
            ) : (
              <div className="text-center">
                <ChefHat className="w-6 h-6 mx-auto mb-1" />
                <p className="text-xs">Recipe Image</p>
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Recipe Info */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-white font-semibold capitalize">{meal.day}</h3>
          <Badge variant="outline" className="border-slate-500 text-slate-300">
            {meal.mealType}
          </Badge>
        </div>
        <h4 className="text-slate-200 font-medium mb-2 line-clamp-2">{meal.recipeTitle}</h4>
        <div className="flex items-center gap-4 text-sm text-slate-400">
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {meal.cookTime} min
          </div>
          <div className="flex items-center gap-1">
            <Users className="w-3 h-3" />
            {meal.servings}
          </div>
        </div>
      </div>
    </div>
  );
}