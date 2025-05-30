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
// import ChefAssistMode from "@/pages/ChefAssistMode"; // Temporarily disabled due to icon issues
import FlavrRituals from "@/pages/FlavrRituals";
import FlavrRitualsPhase2 from "@/pages/FlavrRitualsPhase2";
import FlavrPlus from "@/pages/FlavrPlus";
import SettingsPage from "@/pages/SettingsPage";
import Subscribe from "@/pages/Subscribe";
import MyRecipes from "@/pages/MyRecipes";
import RecipeView from "@/pages/RecipeView";
import DeveloperLogs from "@/pages/DeveloperLogs";
import NotFound from "@/pages/not-found";
import PWAInstallPrompt from "@/components/PWAInstallPrompt";

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
      <Route path="/settings" component={SettingsPage} />
      <Route path="/subscribe" component={Subscribe} />
      <Route path="/developer-logs" component={DeveloperLogs} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  try {
    return (
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Router />
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    );
  } catch (error) {
    console.error('App rendering error:', error);
    return (
      <div className="min-h-screen bg-slate-900 text-white p-8">
        <h1 className="text-2xl font-bold mb-4">Flavr</h1>
        <p className="mb-4">App is initializing...</p>
        <div className="text-sm text-slate-400">
          If this message persists, please refresh the page.
        </div>
      </div>
    );
  }
}

export default App;
