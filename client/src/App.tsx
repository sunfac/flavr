import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import LandingPage from "@/pages/LandingPage";
import ShoppingMode from "@/pages/ShoppingMode";
import FridgeMode from "@/pages/FridgeMode";
import ChefAssistMode from "@/pages/ChefAssistMode";
import SettingsPage from "@/pages/SettingsPage";
import Subscribe from "@/pages/Subscribe";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={LandingPage} />
      <Route path="/shopping" component={ShoppingMode} />
      <Route path="/fridge" component={FridgeMode} />
      <Route path="/chef" component={ChefAssistMode} />
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
