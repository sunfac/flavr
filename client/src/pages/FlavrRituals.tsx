import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { 
  Calendar, 
  Crown, 
  ChefHat, 
  Clock, 
  DollarSign,
  Heart,
  Utensils,
  Plus,
  Check,
  ChevronRight,
  ChevronLeft,
  Sparkles
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import GlobalHeader from "@/components/GlobalHeader";
import GlobalFooter from "@/components/GlobalFooter";
import AuthModal from "@/components/AuthModal";
import { useLocation } from "wouter";

// Quiz data matching other cooking modes
const cuisineOptions = [
  { value: "italian", label: "Italian", icon: "🍝" },
  { value: "asian", label: "Asian", icon: "🥢" },
  { value: "mexican", label: "Mexican", icon: "🌶️" },
  { value: "mediterranean", label: "Mediterranean", icon: "🫒" },
  { value: "indian", label: "Indian", icon: "🍛" },
  { value: "french", label: "French", icon: "🥖" },
  { value: "american", label: "American", icon: "🍔" },
  { value: "thai", label: "Thai", icon: "🍜" },
];

const moodOptions = [
  { value: "adventurous", label: "Adventurous", icon: <Sparkles className="w-4 h-4" /> },
  { value: "comfort", label: "Comfort", icon: <Heart className="w-4 h-4" /> },
  { value: "healthy", label: "Healthy", icon: <Utensils className="w-4 h-4" /> },
  { value: "quick", label: "Quick & Easy", icon: <Clock className="w-4 h-4" /> },
];

const ambitionOptions = [
  { value: "low", label: "Simple", icon: <Clock className="w-4 h-4" /> },
  { value: "medium", label: "Moderate", icon: <ChefHat className="w-4 h-4" /> },
  { value: "high", label: "Challenge", icon: <Crown className="w-4 h-4" /> },
];

const budgetOptions = [
  { value: "low", label: "Budget", icon: <DollarSign className="w-4 h-4" /> },
  { value: "medium", label: "Moderate", icon: <DollarSign className="w-4 h-4" /> },
  { value: "high", label: "Premium", icon: <DollarSign className="w-4 h-4" /> },
];

interface DayPreferences {
  skip: boolean;
  cuisine: string[];
  mood: string;
  ambition: string;
  budget: string;
  dietary: string[];
}

interface WeeklyPreferences {
  monday: DayPreferences;
  tuesday: DayPreferences;
  wednesday: DayPreferences;
  thursday: DayPreferences;
  friday: DayPreferences;
  saturday: DayPreferences;
  sunday: DayPreferences;
}

const defaultDayPreferences: DayPreferences = {
  skip: false,
  cuisine: [],
  mood: "",
  ambition: "",
  budget: "",
  dietary: [],
};

const dayNames = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] as const;
const dayLabels = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export default function FlavrRituals() {
  const [, navigate] = useLocation();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [weeklyPrefs, setWeeklyPrefs] = useState<WeeklyPreferences>({
    monday: { ...defaultDayPreferences },
    tuesday: { ...defaultDayPreferences },
    wednesday: { ...defaultDayPreferences },
    thursday: { ...defaultDayPreferences },
    friday: { ...defaultDayPreferences },
    saturday: { ...defaultDayPreferences },
    sunday: { ...defaultDayPreferences },
  });
  
  const [expandedDay, setExpandedDay] = useState<string | null>("monday");

  // Debug effect to track state changes
  React.useEffect(() => {
    console.log("showAuthModal state changed:", showAuthModal);
  }, [showAuthModal]);

  // Get current user data
  const { data: userData, isLoading } = useQuery({
    queryKey: ["/api/me"],
    retry: false,
  });

  // Show loading while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-purple-400 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-purple-200">Loading...</p>
        </div>
      </div>
    );
  }

  // Fix the user data structure access
  const user = userData?.user;
  const hasFlavrPlus = user?.hasFlavrPlus || false;

  // Temporary: Allow all authenticated users to test Rituals
  const isAuthenticated = !!user;
  
  // Flavr+ Lock Screen for non-subscribers (temporarily disabled for testing)
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900">
        <GlobalHeader 
          onMenuClick={() => {}}
          onSettingsClick={() => {}}
          onAuthRequired={() => {}}
        />
        
        <div className="flex items-center justify-center min-h-screen p-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center bg-white/10 backdrop-blur-md rounded-2xl p-8 max-w-md mx-auto border border-purple-500/20"
          >
            <Crown className="w-16 h-16 text-purple-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-4">Authentication Required</h2>
            <p className="text-purple-200 mb-6">
              Please log in to access Flavr Rituals and start planning your weekly meals.
            </p>
            <Button 
              className="bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white"
              onClick={() => {
                console.log("Login button clicked! User:", user);
                console.log("Setting auth modal to true");
                setAuthMode("login");
                setShowAuthModal(true);
                console.log("Auth modal state should now be true");
              }}
            >
              Log In
            </Button>
          </motion.div>
        </div>
      </div>
    );
  }

  const updateDayPreference = (day: string, field: keyof DayPreferences, value: any) => {
    setWeeklyPrefs(prev => ({
      ...prev,
      [day]: {
        ...prev[day as keyof WeeklyPreferences],
        [field]: value
      }
    }));
  };

  const toggleCuisine = (day: string, cuisine: string) => {
    const currentCuisines = weeklyPrefs[day as keyof WeeklyPreferences].cuisine;
    const newCuisines = currentCuisines.includes(cuisine)
      ? currentCuisines.filter(c => c !== cuisine)
      : [...currentCuisines, cuisine];
    updateDayPreference(day, 'cuisine', newCuisines);
  };

  const confirmWeeklyPlan = () => {
    console.log('Weekly meal plan confirmed:', weeklyPrefs);
    // TODO: Navigate to next phase or store in context
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900">
      {/* Fixed Header with proper z-index */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-purple-900/90 via-indigo-900/90 to-blue-900/90 backdrop-blur-md border-b border-purple-500/20">
        <GlobalHeader 
          onMenuClick={() => {}}
          onSettingsClick={() => {}}
          onAuthRequired={() => {}}
        />
      </div>
      
      {/* Slide Quiz Shell Design for Rituals */}
      <div className="relative min-h-screen pt-16">
        {/* Floating particles background effect */}
        <div className="absolute inset-0 overflow-hidden">
          {[...Array(20)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-2 bg-purple-400/20 rounded-full"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
              }}
              animate={{
                y: [0, -100, 0],
                opacity: [0.2, 0.8, 0.2],
              }}
              transition={{
                duration: 3 + Math.random() * 2,
                repeat: Infinity,
                delay: Math.random() * 2,
              }}
            />
          ))}
        </div>

        {/* Main Content Container */}
        <div className="relative z-10 flex flex-col min-h-screen pt-8 pb-24">
          {/* Header Section */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center px-6 mb-8"
          >
            <div className="flex items-center justify-center mb-4">
              <Calendar className="w-8 h-8 text-purple-400 mr-3" />
              <h1 className="text-3xl font-bold text-white">✨ Flavr Rituals</h1>
              <Badge className="ml-3 bg-gradient-to-r from-purple-400 to-indigo-400 text-white border-0">
                <Crown className="w-3 h-3 mr-1" />
                Premium
              </Badge>
            </div>
            <p className="text-purple-200 max-w-2xl mx-auto text-lg">
              Plan your perfect week of cooking with personalized meal rituals
            </p>
          </motion.div>

          {/* Weekly Calendar Grid - Slide Quiz Style */}
          <div className="flex-1 px-4 max-w-4xl mx-auto w-full">
            <div className="space-y-4">
              {dayNames.map((day, index) => {
                const isExpanded = expandedDay === day;
                const dayPrefs = weeklyPrefs[day];
                
                return (
                  <motion.div
                    key={day}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Card className={`border-0 bg-purple-800/30 backdrop-blur-md transition-all duration-300 ${
                      isExpanded ? 'border-purple-400 shadow-lg shadow-purple-500/25' : 'border-purple-600/50'
                    }`}>
                      <CardHeader 
                        className="cursor-pointer hover:bg-purple-700/20 transition-colors"
                        onClick={() => setExpandedDay(isExpanded ? null : day)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <Calendar className="w-5 h-5 text-purple-400" />
                            <CardTitle className="text-lg text-white">{dayLabels[index]}</CardTitle>
                            {!dayPrefs.skip && (
                              <Badge variant="outline" className="text-xs border-purple-400 text-purple-200">
                                {dayPrefs.cuisine.length > 0 ? `${dayPrefs.cuisine.length} cuisines` : 'Not configured'}
                              </Badge>
                            )}
                            {dayPrefs.skip && (
                              <Badge className="bg-purple-600 text-white text-xs">Skip Day</Badge>
                            )}
                          </div>
                          <div className="flex items-center space-x-2">
                            {dayPrefs.mood && <Heart className="w-4 h-4 text-purple-400" />}
                            {dayPrefs.ambition && <ChefHat className="w-4 h-4 text-purple-400" />}
                            {dayPrefs.budget && <DollarSign className="w-4 h-4 text-purple-400" />}
                            {isExpanded ? 
                              <ChevronLeft className="w-5 h-5 text-purple-400" /> : 
                              <ChevronRight className="w-5 h-5 text-purple-400" />
                            }
                          </div>
                        </div>
                      </CardHeader>

                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3 }}
                          >
                            <CardContent className="space-y-6">
                              {/* Skip Day Toggle */}
                              <div className="flex items-center justify-between p-4 bg-purple-700/20 rounded-xl">
                                <span className="text-white font-medium">Skip this day</span>
                                <Button
                                  variant={dayPrefs.skip ? "default" : "outline"}
                                  size="sm"
                                  onClick={() => updateDayPreference(day, 'skip', !dayPrefs.skip)}
                                  className={dayPrefs.skip ? 
                                    "bg-purple-500 hover:bg-purple-600" : 
                                    "border-purple-400 text-purple-200 hover:bg-purple-700/20"
                                  }
                                >
                                  {dayPrefs.skip ? <Check className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                                  {dayPrefs.skip ? "Skipping" : "Cook"}
                                </Button>
                              </div>

                              {!dayPrefs.skip && (
                                <>
                                  {/* Cuisine Selection */}
                                  <div className="space-y-3">
                                    <h4 className="text-white font-medium">Preferred Cuisines</h4>
                                    <div className="grid grid-cols-2 gap-2">
                                      {cuisineOptions.map((cuisine) => (
                                        <motion.div
                                          key={cuisine.value}
                                          whileHover={{ scale: 1.02 }}
                                          whileTap={{ scale: 0.98 }}
                                        >
                                          <Card 
                                            className={`cursor-pointer transition-all duration-300 border-2 h-16 ${
                                              dayPrefs.cuisine.includes(cuisine.value)
                                                ? 'border-purple-400 bg-purple-500/20 shadow-lg shadow-purple-500/25' 
                                                : 'border-purple-600/50 bg-purple-800/30 hover:border-purple-400/50'
                                            }`}
                                            onClick={() => toggleCuisine(day, cuisine.value)}
                                          >
                                            <CardContent className="p-3 text-center flex flex-col justify-center h-full">
                                              <div className="text-2xl mb-1">{cuisine.icon}</div>
                                              <div className="text-white font-medium text-xs">{cuisine.label}</div>
                                            </CardContent>
                                          </Card>
                                        </motion.div>
                                      ))}
                                    </div>
                                  </div>

                                  {/* Mood Selection */}
                                  <div className="space-y-3">
                                    <h4 className="text-white font-medium">Cooking Mood</h4>
                                    <div className="grid grid-cols-2 gap-2">
                                      {moodOptions.map((mood) => (
                                        <motion.div
                                          key={mood.value}
                                          whileHover={{ scale: 1.02 }}
                                          whileTap={{ scale: 0.98 }}
                                        >
                                          <Card 
                                            className={`cursor-pointer transition-all duration-300 border-2 h-16 ${
                                              dayPrefs.mood === mood.value
                                                ? 'border-purple-400 bg-purple-500/20 shadow-lg shadow-purple-500/25' 
                                                : 'border-purple-600/50 bg-purple-800/30 hover:border-purple-400/50'
                                            }`}
                                            onClick={() => updateDayPreference(day, 'mood', mood.value)}
                                          >
                                            <CardContent className="p-3 text-center flex flex-col justify-center h-full">
                                              <div className="mb-1 flex justify-center text-purple-400">
                                                {mood.icon}
                                              </div>
                                              <div className="text-white font-medium text-xs">{mood.label}</div>
                                            </CardContent>
                                          </Card>
                                        </motion.div>
                                      ))}
                                    </div>
                                  </div>

                                  {/* Ambition & Budget */}
                                  <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-3">
                                      <h4 className="text-white font-medium">Ambition</h4>
                                      <div className="space-y-2">
                                        {ambitionOptions.map((ambition) => (
                                          <Card 
                                            key={ambition.value}
                                            className={`cursor-pointer transition-all duration-300 border-2 h-12 ${
                                              dayPrefs.ambition === ambition.value
                                                ? 'border-purple-400 bg-purple-500/20' 
                                                : 'border-purple-600/50 bg-purple-800/30 hover:border-purple-400/50'
                                            }`}
                                            onClick={() => updateDayPreference(day, 'ambition', ambition.value)}
                                          >
                                            <CardContent className="p-2 flex items-center justify-center h-full">
                                              <div className="flex items-center space-x-2">
                                                <div className="text-purple-400">{ambition.icon}</div>
                                                <span className="text-white text-xs">{ambition.label}</span>
                                              </div>
                                            </CardContent>
                                          </Card>
                                        ))}
                                      </div>
                                    </div>

                                    <div className="space-y-3">
                                      <h4 className="text-white font-medium">Budget</h4>
                                      <div className="space-y-2">
                                        {budgetOptions.map((budget) => (
                                          <Card 
                                            key={budget.value}
                                            className={`cursor-pointer transition-all duration-300 border-2 h-12 ${
                                              dayPrefs.budget === budget.value
                                                ? 'border-purple-400 bg-purple-500/20' 
                                                : 'border-purple-600/50 bg-purple-800/30 hover:border-purple-400/50'
                                            }`}
                                            onClick={() => updateDayPreference(day, 'budget', budget.value)}
                                          >
                                            <CardContent className="p-2 flex items-center justify-center h-full">
                                              <div className="flex items-center space-x-2">
                                                <div className="text-purple-400">{budget.icon}</div>
                                                <span className="text-white text-xs">{budget.label}</span>
                                              </div>
                                            </CardContent>
                                          </Card>
                                        ))}
                                      </div>
                                    </div>
                                  </div>
                                </>
                              )}
                            </CardContent>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </Card>
                  </motion.div>
                );
              })}
            </div>

            {/* Confirm Week Button */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-8 text-center"
            >
              <Button
                onClick={confirmWeeklyPlan}
                className="bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white px-8 py-3 text-lg font-semibold rounded-xl shadow-lg shadow-purple-500/25"
              >
                <Sparkles className="w-5 h-5 mr-2" />
                Generate Weekly Recipes
              </Button>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 z-40">
        <GlobalFooter currentMode="rituals" />
      </div>

      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={() => {
          setShowAuthModal(false);
          // Refresh the page to show authenticated content
          window.location.reload();
        }}
        title={authMode === "login" ? "Welcome back!" : "Join Flavr today!"}
        description={authMode === "login" ? "Sign in to access Flavr Rituals" : "Create your account to unlock personalized meal planning"}
      />
    </div>
  );
}