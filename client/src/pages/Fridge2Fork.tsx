import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { Camera, Upload, Loader2, Refrigerator, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PageLayout } from "@/components/PageLayout";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Badge } from "@/components/ui/badge";

export default function Fridge2Fork() {
  const [, navigate] = useLocation();
  const [ingredients, setIngredients] = useState<string[]>([]);
  const [currentIngredient, setCurrentIngredient] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

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
      
      setIngredients(prev => {
        const combined = [...prev, ...detectedIngredients];
        return combined.filter((item, index) => combined.indexOf(item) === index);
      });
      
      toast({
        title: "Ingredients detected!",
        description: `Found ${detectedIngredients.length} ingredients in your photo`,
      });
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
    if (currentIngredient.trim() && !ingredients.includes(currentIngredient.trim())) {
      setIngredients([...ingredients, currentIngredient.trim()]);
      setCurrentIngredient("");
    }
  };

  const removeIngredient = (index: number) => {
    setIngredients(ingredients.filter((_, i) => i !== index));
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

    setIsProcessing(true);
    try {
      // Create quiz data with randomized defaults
      const quizData = {
        ingredients: ingredients,
        servings: 4,
        cookingTime: Math.floor(Math.random() * 21) + 20, // 20-40 minutes
        budget: Math.floor(Math.random() * 4) + 3, // £3-6
        equipment: ["oven", "stovetop", "basic kitchen tools"],
        dietaryRestrictions: [],
        ingredientFlexibility: "pantry", // Allow pantry staples
        mode: "fridge"
      };

      const response = await apiRequest("POST", "/api/generate-fridge-recipe", { quizData });
      
      // Navigate to recipe selection with the generated ideas
      navigate("/recipe-selection", { 
        state: { 
          recipes: response.recipes, 
          mode: "fridge2fork",
          quizData 
        } 
      });
    } catch (error) {
      toast({
        title: "Error generating recipes",
        description: "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <PageLayout>
      <div className="max-w-2xl mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="inline-flex p-3 bg-green-500/10 rounded-full mb-4">
            <Refrigerator className="w-8 h-8 text-green-500" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Fridge2Fork</h1>
          <p className="text-muted-foreground">
            Turn your ingredients into delicious recipes instantly
          </p>
        </motion.div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Add Your Ingredients</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Photo Upload Section */}
            <div className="flex gap-4">
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessing}
                className="flex-1"
              >
                <Camera className="w-4 h-4 mr-2" />
                Take Photo
              </Button>
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessing}
                className="flex-1"
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload Photo
              </Button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileSelect}
              className="hidden"
            />

            {/* Image Preview */}
            {imagePreview && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative rounded-lg overflow-hidden"
              >
                <img 
                  src={imagePreview} 
                  alt="Ingredient photo" 
                  className="w-full h-48 object-cover"
                />
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <Loader2 className="w-8 h-8 text-white animate-spin" />
                  <span className="text-white ml-2">Analyzing ingredients...</span>
                </div>
              </motion.div>
            )}

            {/* Manual Input */}
            <div className="flex gap-2">
              <Input
                placeholder="Add ingredient manually..."
                value={currentIngredient}
                onChange={(e) => setCurrentIngredient(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && addIngredient()}
              />
              <Button onClick={addIngredient} size="icon">
                <Plus className="w-4 h-4" />
              </Button>
            </div>

            {/* Ingredient List */}
            <AnimatePresence>
              {ingredients.length > 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-wrap gap-2"
                >
                  {ingredients.map((ingredient, index) => (
                    <motion.div
                      key={ingredient}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                    >
                      <Badge variant="secondary" className="pl-3 pr-1 py-1.5">
                        {ingredient}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="ml-1 h-auto p-1"
                          onClick={() => removeIngredient(index)}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </Badge>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>

        <Button
          onClick={handleGenerateRecipes}
          disabled={ingredients.length === 0 || isProcessing}
          className="w-full bg-green-600 hover:bg-green-700"
          size="lg"
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Generating recipes...
            </>
          ) : (
            <>
              Generate Recipes
              <Refrigerator className="w-4 h-4 ml-2" />
            </>
          )}
        </Button>

        <p className="text-center text-sm text-muted-foreground mt-4">
          We'll create recipes for 4 servings that take 20-40 minutes using ingredients available at UK supermarkets
        </p>
      </div>
    </PageLayout>
  );
}