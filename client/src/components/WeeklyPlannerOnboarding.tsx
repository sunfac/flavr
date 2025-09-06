import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Users, Clock, ChefHat, Utensils, DollarSign } from "lucide-react";

const onboardingSchema = z.object({
  householdSize: z.object({
    adults: z.number().min(1).max(10),
    kids: z.number().min(0).max(10),
  }),
  cookingFrequency: z.number().min(1).max(7),
  timeComfort: z.enum(["15", "30", "45", "60"]),
  cuisineWeighting: z.record(z.number()).optional(),
  ambitionLevel: z.enum(["simple", "medium", "adventurous"]),
  dietaryNeeds: z.array(z.string()).optional(),
  budgetPerServing: z.number().min(1).max(50).optional(),
});

type OnboardingFormData = z.infer<typeof onboardingSchema>;

interface WeeklyPlannerOnboardingProps {
  onComplete: () => void;
}

const cuisineOptions = [
  { name: "British", emoji: "🇬🇧" },
  { name: "Italian", emoji: "🇮🇹" },
  { name: "Indian", emoji: "🇮🇳" },
  { name: "Chinese", emoji: "🇨🇳" },
  { name: "Mexican", emoji: "🇲🇽" },
  { name: "Thai", emoji: "🇹🇭" },
  { name: "French", emoji: "🇫🇷" },
  { name: "Mediterranean", emoji: "🇬🇷" },
  { name: "Japanese", emoji: "🇯🇵" },
  { name: "American", emoji: "🇺🇸" }
];

const dietaryOptions = [
  "vegetarian",
  "vegan", 
  "pescatarian",
  "gluten-free",
  "dairy-free",
  "nut-free",
  "low-carb",
  "keto",
  "halal",
  "kosher"
];

export default function WeeklyPlannerOnboarding({ onComplete }: WeeklyPlannerOnboardingProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedCuisines, setSelectedCuisines] = useState<Record<string, number>>({});
  const { toast } = useToast();

  const form = useForm<OnboardingFormData>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      householdSize: { adults: 2, kids: 0 },
      cookingFrequency: 3,
      timeComfort: "30",
      ambitionLevel: "medium",
      cuisineWeighting: {},
      dietaryNeeds: [],
      budgetPerServing: 5,
    },
  });

  const handleCuisineToggle = (cuisine: string) => {
    setSelectedCuisines(prev => {
      const newWeighting = { ...prev };
      if (newWeighting[cuisine]) {
        delete newWeighting[cuisine];
      } else {
        newWeighting[cuisine] = 1;
      }
      return newWeighting;
    });
  };

  const handleCuisineWeightChange = (cuisine: string, weight: number) => {
    setSelectedCuisines(prev => ({
      ...prev,
      [cuisine]: weight
    }));
  };

  const onSubmit = async (data: OnboardingFormData) => {
    setIsSubmitting(true);
    
    try {
      const preferences = {
        ...data,
        cuisineWeighting: selectedCuisines,
        onboardingCompleted: true,
        createdAt: new Date().toISOString(),
      };

      await apiRequest("POST", "/api/weekly-plan-preferences", preferences);
      
      toast({
        title: "Preferences Saved!",
        description: "Your weekly planning preferences have been set up successfully.",
      });
      
      onComplete();
    } catch (error) {
      console.error("Error saving preferences:", error);
      toast({
        title: "Save Failed",
        description: "Unable to save your preferences. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const nextStep = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <Users className="w-12 h-12 text-orange-400 mx-auto mb-3" />
              <h3 className="text-xl font-semibold text-white">Tell us about your household</h3>
              <p className="text-slate-300">We'll tailor portion sizes and recipe complexity to your family</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="householdSize.adults"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white">Adults</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="1"
                        max="10"
                        className="bg-slate-700 border-slate-600 text-white"
                        {...field}
                        onChange={(e) => {
                          const value = parseInt(e.target.value);
                          field.onChange(isNaN(value) ? 1 : value);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="householdSize.kids"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white">Kids</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        max="10"
                        className="bg-slate-700 border-slate-600 text-white"
                        {...field}
                        onChange={(e) => {
                          const value = parseInt(e.target.value);
                          field.onChange(isNaN(value) ? 1 : value);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="cookingFrequency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white">How many times per week do you want to cook?</FormLabel>
                  <FormControl>
                    <div className="px-3">
                      <Slider
                        min={1}
                        max={7}
                        step={1}
                        value={[field.value]}
                        onValueChange={(values) => field.onChange(values[0])}
                        className="w-full"
                      />
                      <div className="flex justify-between text-sm text-slate-400 mt-1">
                        <span>1</span>
                        <span className="font-medium text-orange-400">{field.value} times</span>
                        <span>7</span>
                      </div>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <Clock className="w-12 h-12 text-orange-400 mx-auto mb-3" />
              <h3 className="text-xl font-semibold text-white">Time & Cooking Style</h3>
              <p className="text-slate-300">How much time do you usually have for cooking?</p>
            </div>

            <FormField
              control={form.control}
              name="timeComfort"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white">Maximum cooking time per meal</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                        <SelectValue placeholder="Select cooking time" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-slate-700 border-slate-600">
                      <SelectItem value="15">15 minutes (Quick & Simple)</SelectItem>
                      <SelectItem value="30">30 minutes (Balanced)</SelectItem>
                      <SelectItem value="45">45 minutes (Relaxed)</SelectItem>
                      <SelectItem value="60">60+ minutes (Weekend Projects)</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="ambitionLevel"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white">Cooking ambition level</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                        <SelectValue placeholder="Select ambition level" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-slate-700 border-slate-600">
                      <SelectItem value="simple">Simple (Easy, familiar recipes)</SelectItem>
                      <SelectItem value="medium">Medium (Mix of easy and challenging)</SelectItem>
                      <SelectItem value="adventurous">Adventurous (Try new techniques)</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <Utensils className="w-12 h-12 text-orange-400 mx-auto mb-3" />
              <h3 className="text-xl font-semibold text-white">Cuisine Preferences</h3>
              <p className="text-slate-300">Select cuisines you enjoy (we'll mix these into your weekly plans)</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {cuisineOptions.map((cuisine) => (
                <div key={cuisine.name}>
                  <Button
                    type="button"
                    variant={selectedCuisines[cuisine.name] ? "default" : "outline"}
                    onClick={() => handleCuisineToggle(cuisine.name)}
                    className={`w-full justify-start ${
                      selectedCuisines[cuisine.name] 
                        ? "bg-orange-500 hover:bg-orange-600 text-white" 
                        : "border-slate-600 text-slate-300 hover:bg-slate-700"
                    }`}
                  >
                    <span className="mr-2">{cuisine.emoji}</span>
                    {cuisine.name}
                  </Button>
                  
                  {selectedCuisines[cuisine.name] && (
                    <div className="mt-2 px-3">
                      <div className="flex items-center justify-between text-sm text-slate-400 mb-1">
                        <span>Frequency</span>
                        <span>{selectedCuisines[cuisine.name] === 1 ? "Sometimes" : selectedCuisines[cuisine.name] === 2 ? "Often" : "Frequently"}</span>
                      </div>
                      <Slider
                        min={1}
                        max={3}
                        step={1}
                        value={[selectedCuisines[cuisine.name]]}
                        onValueChange={(values) => handleCuisineWeightChange(cuisine.name, values[0])}
                        className="w-full"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <ChefHat className="w-12 h-12 text-orange-400 mx-auto mb-3" />
              <h3 className="text-xl font-semibold text-white">Dietary Requirements & Budget</h3>
              <p className="text-slate-300">Any dietary restrictions or budget preferences?</p>
            </div>

            <FormField
              control={form.control}
              name="dietaryNeeds"
              render={() => (
                <FormItem>
                  <FormLabel className="text-white">Dietary requirements (optional)</FormLabel>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {dietaryOptions.map((dietary) => (
                      <FormField
                        key={dietary}
                        control={form.control}
                        name="dietaryNeeds"
                        render={({ field }) => {
                          return (
                            <FormItem
                              key={dietary}
                              className="flex flex-row items-start space-x-3 space-y-0"
                            >
                              <FormControl>
                                <Checkbox
                                  checked={field.value?.includes(dietary)}
                                  onCheckedChange={(checked) => {
                                    const current = field.value || [];
                                    return checked
                                      ? field.onChange([...current, dietary])
                                      : field.onChange(current.filter((value) => value !== dietary));
                                  }}
                                />
                              </FormControl>
                              <FormLabel className="text-sm text-slate-300 capitalize">
                                {dietary.replace("-", " ")}
                              </FormLabel>
                            </FormItem>
                          );
                        }}
                      />
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="budgetPerServing"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white">Target budget per serving (optional)</FormLabel>
                  <FormControl>
                    <div className="px-3">
                      <Slider
                        min={2}
                        max={15}
                        step={1}
                        value={[field.value || 5]}
                        onValueChange={(values) => field.onChange(values[0])}
                        className="w-full"
                      />
                      <div className="flex justify-between text-sm text-slate-400 mt-1">
                        <span>£2</span>
                        <span className="font-medium text-orange-400">£{field.value || 5} per serving</span>
                        <span>£15</span>
                      </div>
                    </div>
                  </FormControl>
                  <FormDescription className="text-slate-400">
                    This helps us suggest recipes that fit your budget
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Card className="bg-slate-800/50 border-slate-700 max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="text-white flex items-center justify-between">
          <span>Weekly Planner Setup</span>
          <Badge variant="outline" className="border-slate-500 text-slate-300">
            Step {currentStep} of 4
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {renderStep()}
            
            <div className="flex justify-between pt-6">
              <Button
                type="button"
                variant="outline"
                onClick={prevStep}
                disabled={currentStep === 1}
                className="border-slate-600 text-slate-300 hover:bg-slate-700"
              >
                Previous
              </Button>
              
              {currentStep < 4 ? (
                <Button
                  type="button"
                  onClick={nextStep}
                  className="bg-orange-500 hover:bg-orange-600 text-white"
                >
                  Next
                </Button>
              ) : (
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  {isSubmitting ? "Saving..." : "Complete Setup"}
                </Button>
              )}
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}