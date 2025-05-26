import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import LandingPage from "@/pages/LandingPage";
import ModeSelection from "@/pages/ModeSelection";
import ShoppingMode from "@/pages/ShoppingMode";
import FridgeMode from "@/pages/FridgeMode";
import ChefAssistMode from "@/pages/ChefAssistMode";
import SettingsPage from "@/pages/SettingsPage";
import Subscribe from "@/pages/Subscribe";
import MyRecipes from "@/pages/MyRecipes";
import RecipeView from "@/pages/RecipeView";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={LandingPage} />
      <Route path="/app" component={ModeSelection} />
      <Route path="/app/shopping" component={ShoppingMode} />
      <Route path="/app/fridge" component={FridgeMode} />
      <Route path="/app/chef" component={ChefAssistMode} />
      <Route path="/shopping" component={ShoppingMode} />
      <Route path="/fridge" component={FridgeMode} />
      <Route path="/chef" component={ChefAssistMode} />
      <Route path="/my-recipes" component={MyRecipes} />
      <Route path="/recipe/:id" component={RecipeView} />
      <Route path="/settings" component={SettingsPage} />
      <Route path="/subscribe" component={Subscribe} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
