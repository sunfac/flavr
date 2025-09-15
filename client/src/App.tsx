import React from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import LandingPage from "@/pages/LandingPage";
import LoginPage from "@/pages/LoginPage";
import ModeSelection from "@/pages/ModeSelection";
import ShoppingMode from "@/pages/ShoppingMode";
import ChefAssistMode from "@/pages/ChefAssistMode";
import FlavrRituals from "@/pages/FlavrRituals";
import FlavrRitualsPhase2 from "@/pages/FlavrRitualsPhase2";
import FlavrPlus from "@/pages/FlavrPlus";
import SettingsPage from "@/pages/SettingsPage";
import Subscribe from "@/pages/Subscribe";
import MyRecipes from "@/pages/MyRecipes";
import RecipeView from "@/pages/RecipeView";
import RecipeCardTest from "@/pages/RecipeCardTest";
import DeveloperLogs from "@/pages/DeveloperLogs";
import DeveloperRecipes from "@/pages/DeveloperRecipes";
import ImageMigration from "@/pages/ImageMigration";
import AICostsDashboard from "@/pages/developer/AICostsDashboard";
import PhotoToRecipe from "@/pages/PhotoToRecipe";
import DiagnosticPage from "@/pages/DiagnosticPage";
import NotFound from "@/pages/not-found";
import PWAInstallPrompt from "@/components/PWAInstallPrompt";

import DigitalCookbook from "@/pages/DigitalCookbook";
import BudgetPlanner from "@/pages/BudgetPlanner";
import ChefAssist from "@/pages/ChefAssist";
import ChatMode from "@/pages/ChatMode";
import Recipe from "@/pages/Recipe";
import RecipeSelection from "@/pages/RecipeSelection";
import LoadingPage from "@/pages/LoadingPage";
import PublicRecipeView from "./pages/PublicRecipeView";
import TempRecipe from "@/pages/TempRecipe";
import WeeklyPlanner from "@/pages/WeeklyPlanner";
import WelcomePreferences from "@/pages/WelcomePreferences";
import { ThemeProvider } from "@/providers/ThemeProvider";

function Router() {
  return (
    <Switch>
      <Route path="/" component={LandingPage} />
      <Route path="/login" component={LoginPage} />
      <Route path="/app" component={ModeSelection} />
      <Route path="/app/shopping" component={ShoppingMode} />
      <Route path="/app/chef" component={ChefAssistMode} />
      <Route path="/shopping" component={ShoppingMode} />
      <Route path="/chef" component={ChefAssistMode} />
      <Route path="/rituals" component={FlavrRituals} />
      <Route path="/flavr-rituals" component={FlavrRituals} />
      <Route path="/flavr-rituals/phase2" component={FlavrRitualsPhase2} />
      <Route path="/flavr-plus" component={FlavrPlus} />
      <Route path="/my-recipes" component={MyRecipes} />
      <Route path="/recipe/:id" component={RecipeView} />
      <Route path="/recipe-test" component={RecipeCardTest} />
      <Route path="/settings" component={SettingsPage} />
      <Route path="/subscribe" component={Subscribe} />
      <Route path="/welcome-preferences" component={WelcomePreferences} />
      <Route path="/developer-logs" component={DeveloperLogs} />
      <Route path="/developer-recipes" component={DeveloperRecipes} />
      <Route path="/image-migration" component={ImageMigration} />
      <Route path="/ai-costs" component={AICostsDashboard} />
      <Route path="/photo-to-recipe" component={PhotoToRecipe} />
      <Route path="/diagnostic" component={DiagnosticPage} />

      <Route path="/cookbook" component={DigitalCookbook} />
      <Route path="/budget-planner" component={BudgetPlanner} />
      <Route path="/chef-assist" component={ChefAssist} />
      <Route path="/chat" component={ChatMode} />
      <Route path="/recipe" component={Recipe} />
      <Route path="/recipe-selection" component={RecipeSelection} />
      <Route path="/share/:shareId" component={PublicRecipeView} />
      <Route path="/temp-recipe" component={TempRecipe} />
      <Route path="/weekly-planner" component={WeeklyPlanner} />
      <Route path="/loading" component={() => <LoadingPage title="Loading..." subtitle="Please wait while we prepare your experience" />} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  // Initialize pseudo user ID on app load
  React.useEffect(() => {
    if (!localStorage.getItem('flavrUserId')) {
      const newId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('flavrUserId', newId);
      console.log('Generated new pseudo user ID:', newId);
    }
  }, []);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <TooltipProvider>
            <ErrorBoundary>
              <Router />
            </ErrorBoundary>
            <Toaster />
          </TooltipProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
