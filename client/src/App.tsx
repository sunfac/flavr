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
import FridgeMode from "@/pages/FridgeMode";
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
import DiagnosticPage from "@/pages/DiagnosticPage";
import NotFound from "@/pages/not-found";
import PWAInstallPrompt from "@/components/PWAInstallPrompt";

import DigitalCookbook from "@/pages/DigitalCookbook";
import BudgetPlanner from "@/pages/BudgetPlanner";

function Router() {
  return (
    <Switch>
      <Route path="/" component={LandingPage} />
      <Route path="/login" component={LoginPage} />
      <Route path="/app" component={ModeSelection} />
      <Route path="/app/shopping" component={ShoppingMode} />
      <Route path="/app/fridge" component={FridgeMode} />
      <Route path="/app/chef" component={ChefAssistMode} />
      <Route path="/shopping" component={ShoppingMode} />
      <Route path="/fridge" component={FridgeMode} />
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
      <Route path="/developer-logs" component={DeveloperLogs} />
      <Route path="/diagnostic" component={DiagnosticPage} />

      <Route path="/cookbook" component={DigitalCookbook} />
      <Route path="/budget-planner" component={BudgetPlanner} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <ErrorBoundary>
            <Router />
          </ErrorBoundary>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
