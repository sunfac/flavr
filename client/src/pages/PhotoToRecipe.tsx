import React, { useState, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Upload, Camera, X, Plus, Loader2, Crown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { EnhancedRecipeCard } from "@/components/recipe/EnhancedRecipeCard";
import { useRecipeStore } from "@/stores/recipeStore";

interface PhotoUpload {
  file: File;
  preview: string;
  id: string;
  type: 'main' | 'sub';
  subRecipeName?: string;
}

interface ExtractedRecipe {
  id?: string;
  title: string;
  description: string;
  cuisine: string;
  difficulty: string;
  prepTime: number;
  cookTime: number;
  servings: number;
  ingredients: Array<{ name: string; amount: string }>;
  instructions: Array<{ step: number; instruction: string }>;
  tips: string[];
  nutritionalHighlights: string[];
  imageUrl?: string;
  tempId?: string;
  subRecipes?: Record<string, {
    ingredients: string[];
    instructions: string[];
  }>;
}

export default function PhotoToRecipe() {
  const queryClient = useQueryClient();
  const { data: userResponse, isLoading } = useQuery({
    queryKey: ["/api/me"],
    retry: false,
  });
  const user = (userResponse as any)?.user;
  const isAuthenticated = !!user;
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [photos, setPhotos] = useState<PhotoUpload[]>([]);
  const [subRecipeSlots, setSubRecipeSlots] = useState<Array<{id: string, name: string, photo: PhotoUpload | null}>>([]);
  const [extractedRecipe, setExtractedRecipe] = useState<ExtractedRecipe | null>(null);
  const [showRecipeCard, setShowRecipeCard] = useState(false);
  const { replaceRecipe } = useRecipeStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [newSubRecipeName, setNewSubRecipeName] = useState('');

  // Sub-recipe slot management functions
  const addSubRecipeSlot = (name: string) => {
    const newSlot = {
      id: Date.now().toString(),
      name: name.trim(),
      photo: null
    };
    setSubRecipeSlots(prev => [...prev, newSlot]);
  };

  const removeSubRecipeSlot = (slotId: string) => {
    setSubRecipeSlots(prev => prev.filter(slot => slot.id !== slotId));
  };

  // Check if user has Flavr+ subscription or is developer
  const hasFlavrPlus = user?.hasFlavrPlus || user?.email === 'william@blycontracting.co.uk';

  const extractRecipeMutation = useMutation({
    mutationFn: async () => {
      const formData = new FormData();
      
      // Add main recipe photos
      photos.forEach((photo, index) => {
        formData.append(`main_photo_${index}`, photo.file);
      });
      
      // Add sub-recipe photos
      subRecipeSlots.forEach((slot, slotIndex) => {
        if (slot.photo) {
          formData.append(`sub_${slot.name}`, slot.photo.file);
          formData.append(`sub_name_${slotIndex}`, slot.name);
        }
      });
      
      const response = await fetch('/api/extract-recipe-from-photos', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to extract recipe');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      const recipe = data.recipe;
      // Ensure recipe has a stable ID to prevent re-renders
      recipe.id = recipe.id || `extracted-${Date.now()}`;
      
      // Include sub-recipes from the response
      if (data.subRecipes) {
        recipe.subRecipes = data.subRecipes;
        console.log('📚 Sub-recipes included:', Object.keys(data.subRecipes));
      }
      
      setExtractedRecipe(recipe);
      
      // Convert extracted recipe to recipe store format for EnhancedRecipeCard
      const ingredientStrings = recipe.ingredients.map((ing: any) => {
        if (typeof ing === 'string') return ing;
        if (ing.name && ing.amount) return `${ing.amount} ${ing.name}`;
        return ing.toString();
      });

      const instructionStrings = recipe.instructions.map((inst: any) => {
        if (typeof inst === 'string') return inst;
        if (inst.instruction) return inst.instruction;
        return inst.toString();
      });
      
      replaceRecipe({
        id: recipe.id,
        servings: recipe.servings || 4,
        ingredients: ingredientStrings.map((text: string, index: number) => ({
          id: `ingredient-${index}`,
          text,
          checked: false
        })),
        steps: instructionStrings.map((instruction: string, index: number) => ({
          id: `step-${index}`,
          title: `Step ${index + 1}`,
          description: instruction
        })),
        meta: {
          title: recipe.title || '',
          description: recipe.description || '',
          cookTime: recipe.cookTime || 30,
          difficulty: recipe.difficulty || 'Medium',
          cuisine: recipe.cuisine || '',
          image: recipe.imageUrl || undefined
        },
        subRecipes: recipe.subRecipes || {},
        currentStep: 0,
        completedSteps: [],
        lastUpdated: Date.now()
      });
      
      setShowRecipeCard(true);
      
      toast({
        title: "Recipe Extracted!",
        description: "Your cookbook recipe has been converted successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Extraction Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const saveRecipeMutation = useMutation({
    mutationFn: async (recipe: ExtractedRecipe) => {
      const response = await fetch('/api/save-extracted-recipe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(recipe),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to save recipe');
      }
      
      return response.json();
    },
    onSuccess: () => {
      // Invalidate cookbook query to refresh the list
      queryClient.invalidateQueries({ queryKey: ['/api/recipes'] });
      
      toast({
        title: "Recipe Saved!",
        description: "Your recipe has been added to My Cookbook.",
      });
      setLocation('/cookbook');
    },
    onError: (error: Error) => {
      toast({
        title: "Save Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleFileSelect = (files: FileList | null, type: 'main' | 'sub' = 'main', subRecipeName?: string) => {
    if (!files) return;
    
    const newPhotos: PhotoUpload[] = [];
    const maxFiles = type === 'main' ? 3 - photos.length : 1;
    
    for (let i = 0; i < Math.min(files.length, maxFiles); i++) {
      const file = files[i];
      if (file.type.startsWith('image/')) {
        const id = Date.now().toString() + i;
        const preview = URL.createObjectURL(file);
        newPhotos.push({ file, preview, id, type, subRecipeName });
      }
    }
    
    if (type === 'main') {
      setPhotos(prev => [...prev, ...newPhotos]);
    } else if (subRecipeName) {
      // Handle sub-recipe photo upload
      setSubRecipeSlots(prev => prev.map(slot => 
        slot.name === subRecipeName 
          ? { ...slot, photo: newPhotos[0] || null }
          : slot
      ));
    }
  };

  const removePhoto = (id: string, type: 'main' | 'sub' = 'main') => {
    if (type === 'main') {
      setPhotos(prev => {
        const updated = prev.filter(photo => photo.id !== id);
        // Clean up preview URLs
        prev.forEach(photo => {
          if (photo.id === id) {
            URL.revokeObjectURL(photo.preview);
          }
        });
        return updated;
      });
    } else {
      // Remove sub-recipe photo
      setSubRecipeSlots(prev => prev.map(slot => {
        if (slot.photo?.id === id) {
          if (slot.photo) {
            URL.revokeObjectURL(slot.photo.preview);
          }
          return { ...slot, photo: null };
        }
        return slot;
      }));
    }
  };

  const handleExtractRecipe = () => {
    if (photos.length === 0) {
      toast({
        title: "No Photos",
        description: "Please add at least one photo of your cookbook recipe.",
        variant: "destructive",
      });
      return;
    }
    
    extractRecipeMutation.mutate();
  };

  const handleSaveRecipe = () => {
    if (extractedRecipe) {
      saveRecipeMutation.mutate(extractedRecipe);
    }
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center p-4">
        <div className="animate-spin w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  // Redirect if not authenticated or no Flavr+
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="text-center p-6">
            <h2 className="text-xl font-semibold mb-4">Authentication Required</h2>
            <p className="text-gray-600 mb-4">Please log in to access photo-to-recipe conversion.</p>
            <Button onClick={() => setLocation('/')}>Go to Login</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!hasFlavrPlus) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="text-center p-6">
            <Crown className="w-12 h-12 text-orange-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-4">Flavr+ Required</h2>
            <p className="text-gray-600 mb-4">
              Photo-to-recipe conversion is a premium feature. Upgrade to Flavr+ to photograph your cookbook recipes and convert them to digital format.
            </p>
            <Button onClick={() => setLocation('/subscribe')} className="bg-orange-500 hover:bg-orange-600">
              Upgrade to Flavr+
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-4 md:mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">Photo to Recipe</h1>
          <p className="text-sm md:text-base text-gray-300 leading-relaxed">
            Photograph your favorite cookbook recipes (up to 3 pages) and convert them to editable digital format
          </p>
        </div>

        {!extractedRecipe ? (
          <div className="space-y-6">
            {/* Main Recipe Photos */}
            <Card>
              <CardHeader>
                <CardTitle>Main Recipe Photos</CardTitle>
                <p className="text-sm text-gray-600">
                  Upload photos of your main recipe pages (ingredients, instructions, etc.).
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Upload Buttons */}
                  <div className="flex gap-4">
                    <Button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={photos.length >= 3}
                      className="flex items-center gap-2"
                    >
                      <Upload className="w-4 h-4" />
                      Choose Photos
                    </Button>
                    <Button
                      onClick={() => cameraInputRef.current?.click()}
                      disabled={photos.length >= 3}
                      variant="outline"
                      className="flex items-center gap-2"
                    >
                      <Camera className="w-4 h-4" />
                      Take Photo
                    </Button>
                  </div>

                  {/* Hidden File Inputs */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => handleFileSelect(e.target.files)}
                  />
                  <input
                    ref={cameraInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(e) => handleFileSelect(e.target.files)}
                  />

                  {/* Photo Previews */}
                  {photos.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {photos.map((photo) => (
                        <div key={photo.id} className="relative">
                          <img
                            src={photo.preview}
                            alt="Cookbook page"
                            className="w-full h-48 object-cover rounded-lg border-2 border-gray-200"
                          />
                          <Button
                            size="sm"
                            variant="destructive"
                            className="absolute top-2 right-2 w-6 h-6 p-0"
                            onClick={() => removePhoto(photo.id)}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                      
                      {/* Add More Photos Button */}
                      {photos.length < 3 && (
                        <div
                          className="h-48 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center cursor-pointer hover:border-orange-500 transition-colors"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          <div className="text-center">
                            <Plus className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                            <p className="text-sm text-gray-500">Add Photo</p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Extract Button */}
                  {photos.length > 0 && (
                    <Button
                      onClick={handleExtractRecipe}
                      disabled={extractRecipeMutation.isPending}
                      className="w-full bg-orange-500 hover:bg-orange-600"
                    >
                      {extractRecipeMutation.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Extracting Recipe...
                        </>
                      ) : (
                        'Extract Recipe from Photos'
                      )}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Sub-Recipe Photos Section */}
            <Card>
              <CardHeader>
                <CardTitle>Sub-Recipe Photos (Optional)</CardTitle>
                <p className="text-sm text-gray-600">
                  If your recipe references sub-recipes like "chilli drizzle" or "tamarind chutney", add them here for complete extraction.
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Add Sub-Recipe Form */}
                  <div className="flex gap-2">
                    <Input
                      placeholder="Sub-recipe name (e.g., chilli drizzle)"
                      value={newSubRecipeName}
                      onChange={(e) => setNewSubRecipeName(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && newSubRecipeName.trim()) {
                          addSubRecipeSlot(newSubRecipeName);
                          setNewSubRecipeName('');
                        }
                      }}
                      className="flex-1"
                    />
                    <Button
                      onClick={() => {
                        if (newSubRecipeName.trim()) {
                          addSubRecipeSlot(newSubRecipeName);
                          setNewSubRecipeName('');
                        }
                      }}
                      disabled={!newSubRecipeName.trim()}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* Sub-Recipe Slots */}
                  {subRecipeSlots.map((slot) => (
                    <div key={slot.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-sm">{slot.name}</h4>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeSubRecipeSlot(slot.id)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                      
                      {slot.photo ? (
                        <div className="relative">
                          <img
                            src={slot.photo.preview}
                            alt={slot.name}
                            className="w-full h-32 object-cover rounded border"
                          />
                          <Button
                            size="sm"
                            variant="destructive"
                            className="absolute top-1 right-1 w-6 h-6 p-0"
                            onClick={() => removePhoto(slot.photo!.id, 'sub')}
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      ) : (
                        <div
                          className="h-32 border-2 border-dashed border-gray-300 rounded flex items-center justify-center cursor-pointer hover:border-orange-500 transition-colors"
                          onClick={() => {
                            const input = document.createElement('input');
                            input.type = 'file';
                            input.accept = 'image/*';
                            input.onchange = (e) => {
                              const files = (e.target as HTMLInputElement).files;
                              handleFileSelect(files, 'sub', slot.name);
                            };
                            input.click();
                          }}
                        >
                          <div className="text-center">
                            <Upload className="w-6 h-6 text-gray-400 mx-auto mb-1" />
                            <p className="text-xs text-gray-500">Add Photo</p>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        ) : showRecipeCard ? (
          /* Enhanced Recipe Card Display */
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h1 className="text-2xl font-bold text-white">Your Extracted Recipe</h1>
              <div className="flex gap-3">
                <Button
                  onClick={() => {
                    setShowRecipeCard(false);
                    setExtractedRecipe(null);
                    setPhotos([]);
                  }}
                  variant="outline"
                  size="sm"
                >
                  Start Over
                </Button>
                <Button
                  onClick={handleSaveRecipe}
                  disabled={saveRecipeMutation.isPending}
                  className="bg-orange-500 hover:bg-orange-600"
                >
                  {saveRecipeMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save to My Cookbook'
                  )}
                </Button>
              </div>
            </div>
            <EnhancedRecipeCard 
              recipe={{
                id: extractedRecipe.id || Date.now().toString(),
                title: extractedRecipe.title,
                description: extractedRecipe.description,
                cookTime: extractedRecipe.cookTime,
                servings: extractedRecipe.servings,
                difficulty: extractedRecipe.difficulty,
                cuisine: extractedRecipe.cuisine,
                image: extractedRecipe.imageUrl || undefined,
                tempId: `photo-extracted-${extractedRecipe.id || extractedRecipe.title.replace(/\s+/g, '-').toLowerCase()}`,
                ingredients: extractedRecipe.ingredients?.map((ing: any) => {
                  if (typeof ing === 'string') return ing;
                  if (ing.amount && ing.name) return `${ing.amount} ${ing.name}`;
                  if (ing.text) return ing.text;
                  return ing.toString();
                }) || [],
                instructions: extractedRecipe.instructions?.map((inst: any) => {
                  if (typeof inst === 'string') return inst;
                  if (inst.instruction) return inst.instruction;
                  return inst.toString();
                }) || [],
                tips: extractedRecipe.tips?.join('\n') || ''
              }}
            />
          </div>
        ) : (
          /* Basic Extracted Recipe Display for editing */
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Extracted Recipe: {extractedRecipe.title}
                  <div className="flex gap-2">
                    <Button
                      onClick={() => {
                        setExtractedRecipe(null);
                        setPhotos([]);
                      }}
                      variant="outline"
                      size="sm"
                    >
                      Start Over
                    </Button>
                    <Button
                      onClick={handleSaveRecipe}
                      disabled={saveRecipeMutation.isPending}
                      className="bg-orange-500 hover:bg-orange-600"
                    >
                      {saveRecipeMutation.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        'Save to My Cookbook'
                      )}
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Recipe Details */}
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-semibold mb-2">Description</h3>
                      <p className="text-gray-600">{extractedRecipe.description}</p>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-medium">Cuisine</h4>
                        <p className="text-gray-600">{extractedRecipe.cuisine}</p>
                      </div>
                      <div>
                        <h4 className="font-medium">Difficulty</h4>
                        <p className="text-gray-600">{extractedRecipe.difficulty}</p>
                      </div>
                      <div>
                        <h4 className="font-medium">Prep Time</h4>
                        <p className="text-gray-600">{extractedRecipe.prepTime} min</p>
                      </div>
                      <div>
                        <h4 className="font-medium">Cook Time</h4>
                        <p className="text-gray-600">{extractedRecipe.cookTime} min</p>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium mb-2">Servings</h4>
                      <p className="text-gray-600">{extractedRecipe.servings} servings</p>
                    </div>
                  </div>

                  {/* Ingredients */}
                  <div>
                    <h3 className="font-semibold mb-3">Ingredients</h3>
                    <ul className="space-y-2">
                      {extractedRecipe.ingredients.map((ingredient, index) => (
                        <li key={index} className="flex justify-between">
                          <span>{ingredient.name}</span>
                          <span className="text-gray-600">{ingredient.amount}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Instructions */}
                <div className="mt-6">
                  <h3 className="font-semibold mb-3">Instructions</h3>
                  <ol className="space-y-3">
                    {extractedRecipe.instructions.map((instruction) => (
                      <li key={instruction.step} className="flex gap-3">
                        <span className="bg-orange-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium flex-shrink-0">
                          {instruction.step}
                        </span>
                        <span>{instruction.instruction}</span>
                      </li>
                    ))}
                  </ol>
                </div>

                {/* Tips */}
                {extractedRecipe.tips.length > 0 && (
                  <div className="mt-6">
                    <h3 className="font-semibold mb-3">Tips</h3>
                    <ul className="space-y-2">
                      {extractedRecipe.tips.map((tip, index) => (
                        <li key={index} className="text-gray-600">• {tip}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}