import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { Camera, Upload, Loader2, Refrigerator, Plus, X, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PageLayout } from "@/components/PageLayout";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Badge } from "@/components/ui/badge";
import LoadingPage from "./LoadingPage";
import { useRecipeStore } from "@/stores/recipeStore";
import RecipeSelectionCards from "@/components/RecipeSelectionCards";
import FlavrPlusUpgradeModal from "@/components/FlavrPlusUpgradeModal";
import { useQuery } from "@tanstack/react-query";
import DietaryToggleSection from "@/components/DietaryToggleSection";
import { filterConflictingIngredients, getRemovedIngredientsMessage } from "@/utils/dietaryFilters";

export default function Fridge2Fork() {
  const [, navigate] = useLocation();
  const [ingredients, setIngredients] = useState<string[]>([]);
  const [ingredientsWithConfidence, setIngredientsWithConfidence] = useState<Array<{name: string, confidence: number}>>([]);
  const [currentIngredient, setCurrentIngredient] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [recipeOptions, setRecipeOptions] = useState<any[]>([]);
  const [showSelection, setShowSelection] = useState(false);
  const [savedQuizData, setSavedQuizData] = useState<any>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [selectedDietary, setSelectedDietary] = useState<string[]>([]);
  const [selectedNutritional, setSelectedNutritional] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { updateActiveRecipe } = useRecipeStore();

  // Check quota status
  const { data: quotaData } = useQuery({
    queryKey: ['/api/quota-status'],
    refetchInterval: 10000, // Refetch every 10 seconds
  });

  // Check subscription status
  const { data: subscriptionData } = useQuery({
    queryKey: ['/api/subscription-status'],
    retry: false,
  });

  // Check if user has Flavr+ subscription OR is unlimited (developer account)
  const hasFlavrPlus = (subscriptionData && (subscriptionData as any).hasFlavrPlus) || (quotaData && (quotaData as any).isUnlimited);
  const hasReachedLimit = quotaData && (quotaData as any).remainingRecipes === 0 && !(quotaData as any).isUnlimited;

  const handleImageUpload = async (file: File) => {
    if (!file) return;

    // Show preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Process with Google Vision
    setIsProcessing(true);
    try {
      const formData = new FormData();
      formData.append("image", file);

      const response = await fetch("/api/vision/analyze-ingredients", {
        method: "POST",
        body: formData
      });
      
      if (!response.ok) {
        throw new Error("Failed to analyze image");
      }
      
      const data = await response.json();
      const detectedIngredients = data.ingredients || [];
      const confidenceData = data.ingredientsWithConfidence || [];
      
      if (detectedIngredients.length > 0) {
        setIngredients(prev => {
          const combined = [...prev, ...detectedIngredients];
          return combined.filter((item, index) => combined.indexOf(item) === index);
        });
        
        // Store confidence data for detected ingredients
        setIngredientsWithConfidence(prev => {
          const existingNames = prev.map(item => item.name);
          const newConfidenceData = confidenceData.filter((item: any) => !existingNames.includes(item.name));
          return [...prev, ...newConfidenceData];
        });
        
        toast({
          title: "Ingredients detected!",
          description: `Found ${detectedIngredients.length} ingredients in your photo`,
        });
      } else {
        // Handle no ingredients found
        const errorMessage = data.message || data.error || "No ingredients detected in the photo";
        toast({
          title: "No ingredients found",
          description: errorMessage,
          variant: "default",
        });
      }
    } catch (error) {
      toast({
        title: "Error processing image",
        description: "Please try again or add ingredients manually",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
      setImagePreview(null);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleImageUpload(file);
    }
  };

  const addIngredient = () => {
    if (currentIngredient.trim()) {
      // Split by commas and clean up each ingredient
      const newIngredients = currentIngredient
        .split(',')
        .map(item => item.trim())
        .filter(item => item && !ingredients.includes(item));
      
      if (newIngredients.length > 0) {
        // Filter out conflicting ingredients based on dietary preferences
        const { filteredIngredients, removedIngredients } = filterConflictingIngredients(
          newIngredients, 
          selectedDietary
        );
        
        // Show message if ingredients were removed
        if (removedIngredients.length > 0) {
          const message = getRemovedIngredientsMessage(removedIngredients, selectedDietary);
          toast({
            title: "Ingredients filtered",
            description: message,
            variant: "default"
          });
        }
        
        setIngredients([...ingredients, ...filteredIngredients]);
        setCurrentIngredient("");
      }
    }
  };

  const removeIngredient = (index: number) => {
    const ingredientToRemove = ingredients[index];
    setIngredients(ingredients.filter((_, i) => i !== index));
    // Also remove from confidence data
    setIngredientsWithConfidence(prev => prev.filter(item => item.name !== ingredientToRemove));
  };

  // Handle dietary preference changes and filter existing ingredients
  const handleDietaryChange = (newDietary: string[]) => {
    setSelectedDietary(newDietary);
    
    // Filter existing ingredients
    const { filteredIngredients, removedIngredients } = filterConflictingIngredients(
      ingredients, 
      newDietary
    );
    
    // Update ingredients if any were removed
    if (removedIngredients.length > 0) {
      setIngredients(filteredIngredients);
      // Also remove from confidence data
      setIngredientsWithConfidence(prev => 
        prev.filter(item => !removedIngredients.includes(item.name))
      );
      
      const message = getRemovedIngredientsMessage(removedIngredients, newDietary);
      toast({
        title: "Ingredients filtered",
        description: message,
        variant: "default"
      });
    }
  };

  const handleGenerateRecipes = async () => {
    if (ingredients.length === 0) {
      toast({
        title: "No ingredients added",
        description: "Please add some ingredients first",
        variant: "destructive",
      });
      return;
    }

    // Only check quota limit for non-subscribers
    if (!hasFlavrPlus && hasReachedLimit) {
      setShowUpgradeModal(true);
      return;
    }

    setIsGenerating(true);
    try {
      // Create quiz data with randomized defaults
      const quizData = {
        ingredients: ingredients,
        servings: 4,
        cookingTime: Math.floor(Math.random() * 21) + 20, // 20-40 minutes
        budget: Math.floor(Math.random() * 4) + 3, // £3-6
        equipment: ["oven", "stovetop", "basic kitchen tools"],
        dietaryRestrictions: [...selectedDietary, ...selectedNutritional],
        ingredientFlexibility: "pantry", // Allow pantry staples
        mode: "fridge"
      };

      const response = await apiRequest("POST", "/api/generate-fridge-recipe", { quizData });
      const data = await response.json();
      
      if (data.recipes && data.recipes.length > 0) {
        // Show recipe selection cards instead of directly generating
        setRecipeOptions(data.recipes);
        setSavedQuizData(quizData);
        setShowSelection(true);
        setIsGenerating(false);
      } else {
        throw new Error("No recipes generated");
      }
    } catch (error: any) {
      console.error("Recipe generation error:", error);
      
      // Handle quota limit error specifically
      let errorMessage = "Please try again";
      let errorTitle = "Error generating recipes";
      
      try {
        // Try to parse the response error from apiRequest
        if (error.message && error.message.includes("403:")) {
          // Format is "403: {JSON response}"
          const jsonPart = error.message.substring(error.message.indexOf(': ') + 2);
          const errorData = JSON.parse(jsonPart);
          if (errorData.error) {
            // Show upgrade modal instead of toast for quota exceeded
            if (errorData.error.includes("no free recipes") || errorData.error.includes("recipe limit")) {
              setShowUpgradeModal(true);
              setIsGenerating(false);
              return;
            }
            errorMessage = errorData.error;
            errorTitle = "Recipe limit reached";
          }
        } else if (error.message && error.message.includes("You have no free recipes")) {
          // Show upgrade modal for quota errors
          setShowUpgradeModal(true);
          setIsGenerating(false);
          return;
        }
      } catch (parseError) {
        console.log("Could not parse error, using default message");
      }
      
      toast({
        title: errorTitle,
        description: errorMessage,
        variant: "destructive",
      });
      setIsGenerating(false);
    }
  };

  // Show loading page when generating recipe suggestions
  if (isGenerating) {
    return <LoadingPage 
      title="Finding Recipe Ideas" 
      subtitle="Looking for the perfect recipes using your ingredients..."
    />;
  }

  // Show recipe selection cards
  if (showSelection && recipeOptions.length > 0) {
    return (
      <RecipeSelectionCards 
        recipes={recipeOptions}
        quizData={savedQuizData}
        onBack={() => {
          setShowSelection(false);
          setRecipeOptions([]);
          setSavedQuizData(null);
        }}
      />
    );
  }

  return (
    <PageLayout>
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Original quiz-style layout */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full"
        >
          <Card className="bg-slate-900/50 border-slate-700">
            <CardContent className="p-8">
              {/* Question header matching original fridge mode style */}
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-white mb-2">What's in your fridge?</h2>
                <p className="text-lg text-slate-400">Add ingredients you want to use</p>
              </div>

              {/* Ingredient input section - original quiz style */}
              <div className="space-y-6">
                {/* Photo upload buttons matching original style */}
                <div className="flex gap-3 justify-center">
                  <Button
                    variant="outline"
                    onClick={() => cameraInputRef.current?.click()}
                    disabled={isProcessing}
                    className="border-orange-400 text-orange-400 hover:bg-orange-400/10"
                  >
                    <Camera className="w-4 h-4 mr-2" />
                    Take Photo
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isProcessing}
                    className="border-orange-400 text-orange-400 hover:bg-orange-400/10"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Photo
                  </Button>
                </div>

                {/* Separate inputs for camera and photo library */}
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />

                {/* Image Preview */}
                {imagePreview && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="relative rounded-xl overflow-hidden max-w-md mx-auto"
                  >
                    <img 
                      src={imagePreview} 
                      alt="Ingredient photo" 
                      className="w-full h-48 object-cover"
                    />
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                      <Loader2 className="w-8 h-8 text-white animate-spin" />
                      <span className="text-white ml-2 font-medium">Analyzing ingredients...</span>
                    </div>
                  </motion.div>
                )}

                {/* Manual ingredient input - matching original style */}
                <div className="flex gap-2 max-w-2xl mx-auto">
                  <Input
                    placeholder="Add ingredients (separate with commas): eggs, spinach, chicken..."
                    value={currentIngredient}
                    onChange={(e) => setCurrentIngredient(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && addIngredient()}
                    className="text-lg bg-slate-800/50 border-slate-600 text-white focus:border-orange-400 rounded-xl placeholder:text-slate-500"
                  />
                  <Button 
                    onClick={addIngredient} 
                    size="icon"
                    className="bg-orange-500 hover:bg-orange-600 rounded-xl"
                  >
                    <Plus className="w-5 h-5" />
                  </Button>
                </div>

                {/* Ingredient tags - enhanced with clear delete functionality */}
                <AnimatePresence>
                  {ingredients.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="space-y-3"
                    >
                      <p className="text-center text-sm text-slate-400">
                        Click the × to remove any ingredients you don't want to use
                      </p>
                      <div className="flex flex-wrap gap-2 justify-center max-w-2xl mx-auto">
                        {ingredients.map((ingredient, index) => (
                          <motion.div
                            key={ingredient}
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                          >
                            <Badge 
                              variant="secondary" 
                              className="pl-3 pr-1 py-2 bg-orange-500/20 border-orange-400/50 text-orange-200 hover:bg-orange-500/30 transition-colors flex items-center gap-2"
                            >
                              <span>{ingredient}</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="ml-2 h-auto p-1 hover:bg-red-400/20 rounded-full"
                                onClick={() => removeIngredient(index)}
                                title={`Remove ${ingredient}`}
                              >
                                <X className="w-3 h-3 text-red-300 hover:text-red-200" />
                              </Button>
                            </Badge>
                          </motion.div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Dietary and Nutritional Toggle Section */}
                <DietaryToggleSection
                  selectedDietary={selectedDietary}
                  selectedNutritional={selectedNutritional}
                  onDietaryChange={handleDietaryChange}
                  onNutritionalChange={setSelectedNutritional}
                  className="mt-8 pt-6 border-t border-slate-600"
                />

                {/* Continue button matching original quiz style */}
                <Button
                  onClick={handleGenerateRecipes}
                  disabled={ingredients.length === 0 || isProcessing}
                  className="w-full h-14 font-medium text-lg rounded-xl shadow-lg bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white"
                  size="lg"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Generating recipes...
                    </>
                  ) : (
                    <>
                      Continue
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </>
                  )}
                </Button>

                {/* Helper text */}
                <p className="text-center text-sm text-slate-400">
                  We'll create recipes using your ingredients plus common pantry staples
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
      
      <FlavrPlusUpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        recipesUsed={3}
      />
    </PageLayout>
  );
}