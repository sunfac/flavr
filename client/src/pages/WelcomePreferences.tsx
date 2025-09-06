import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Users, Clock, ChefHat, Crown } from "lucide-react";
import GlobalHeader from "@/components/GlobalHeader";
import GlobalFooter from "@/components/GlobalFooter";

const preferencesSchema = z.object({
  householdSize: z.object({
    adults: z.number().min(1).max(10),
    kids: z.number().min(0).max(10),
  }),
  timeComfort: z.enum(["15", "30", "45", "60"]),
  ambitionLevel: z.enum(["simple", "medium", "adventurous"]),
  dietaryNeeds: z.array(z.string()).optional(),
  budgetPerServing: z.number().min(1).max(50).optional(),
});

type PreferencesFormData = z.infer<typeof preferencesSchema>;

const dietaryOptions = [
  { value: "vegan", label: "Vegan" },
  { value: "vegetarian", label: "Vegetarian" },
  { value: "glutenFree", label: "Gluten-free" },
  { value: "dairyFree", label: "Dairy-free" },
  { value: "nutFree", label: "Nut-free" },
  { value: "lowCarb", label: "Low carb" },
  { value: "keto", label: "Ketogenic" },
  { value: "paleo", label: "Paleo" },
];

export default function WelcomePreferences() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<PreferencesFormData>({
    resolver: zodResolver(preferencesSchema),
    defaultValues: {
      householdSize: { adults: 2, kids: 0 },
      timeComfort: "30",
      ambitionLevel: "medium",
      dietaryNeeds: [],
      budgetPerServing: 5,
    },
  });

  const onSubmit = async (data: PreferencesFormData) => {
    setIsSubmitting(true);
    try {
      const preferences = {
        ...data,
        cookingFrequency: 3, // Default for new subscribers
        cuisineWeighting: {}, // Can be set later
        onboardingCompleted: true,
        createdAt: new Date().toISOString(),
      };

      await apiRequest("POST", "/api/weekly-plan-preferences", preferences);
      
      toast({
        title: "Welcome to Flavr+! 🎉",
        description: "Your preferences have been saved. Let's start cooking!",
      });
      
      // Redirect to cooking modes after a brief delay
      setTimeout(() => {
        navigate("/app");
      }, 1500);
      
    } catch (error: any) {
      toast({
        title: "Error Saving Preferences",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedDietaryNeeds = form.watch("dietaryNeeds") || [];

  return (
    <div className="min-h-screen bg-background">
      <GlobalHeader 
        onMenuClick={() => {}}
        onSettingsClick={() => {}}
        onAuthRequired={() => navigate("/")}
      />
      
      <main className="container mx-auto px-4 pt-24 py-6 pb-20 max-w-2xl">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Crown className="w-8 h-8 text-orange-500" />
            <h1 className="text-3xl font-playfair font-bold text-foreground">Welcome to Flavr+!</h1>
          </div>
          <p className="text-muted-foreground text-lg">
            Let's set up your cooking preferences to personalize your experience
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="font-playfair text-center">Quick Setup</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                
                {/* Household Size */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-orange-500" />
                    <h3 className="text-lg font-semibold">Household Size</h3>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="householdSize.adults"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Adults</FormLabel>
                          <Select value={field.value.toString()} onValueChange={(v) => field.onChange(parseInt(v))}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {[1,2,3,4,5,6,7,8,9,10].map(num => (
                                <SelectItem key={num} value={num.toString()}>{num}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="householdSize.kids"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Kids</FormLabel>
                          <Select value={field.value.toString()} onValueChange={(v) => field.onChange(parseInt(v))}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {[0,1,2,3,4,5,6,7,8,9,10].map(num => (
                                <SelectItem key={num} value={num.toString()}>{num}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Cooking Time */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-orange-500" />
                    <h3 className="text-lg font-semibold">Preferred Cooking Time</h3>
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="timeComfort"
                    render={({ field }) => (
                      <FormItem>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="15">15 minutes (Quick meals)</SelectItem>
                            <SelectItem value="30">30 minutes (Standard)</SelectItem>
                            <SelectItem value="45">45 minutes (Leisurely)</SelectItem>
                            <SelectItem value="60">1+ hours (Weekend cooking)</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                </div>

                {/* Cooking Ambition */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <ChefHat className="w-5 h-5 text-orange-500" />
                    <h3 className="text-lg font-semibold">Cooking Ambition</h3>
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="ambitionLevel"
                    render={({ field }) => (
                      <FormItem>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="simple">Simple (Easy everyday meals)</SelectItem>
                            <SelectItem value="medium">Medium (Mix of simple and special dishes)</SelectItem>
                            <SelectItem value="adventurous">Adventurous (Love trying new techniques)</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                </div>

                {/* Dietary Preferences */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Dietary Preferences</h3>
                  <FormField
                    control={form.control}
                    name="dietaryNeeds"
                    render={() => (
                      <FormItem>
                        <div className="grid grid-cols-2 gap-3">
                          {dietaryOptions.map((option) => (
                            <FormField
                              key={option.value}
                              control={form.control}
                              name="dietaryNeeds"
                              render={({ field }) => {
                                return (
                                  <FormItem
                                    key={option.value}
                                    className="flex flex-row items-start space-x-3 space-y-0"
                                  >
                                    <FormControl>
                                      <Checkbox
                                        checked={field.value?.includes(option.value)}
                                        onCheckedChange={(checked) => {
                                          const current = field.value || [];
                                          if (checked) {
                                            field.onChange([...current, option.value]);
                                          } else {
                                            field.onChange(current.filter((value) => value !== option.value));
                                          }
                                        }}
                                      />
                                    </FormControl>
                                    <FormLabel className="text-sm font-normal">
                                      {option.label}
                                    </FormLabel>
                                  </FormItem>
                                );
                              }}
                            />
                          ))}
                        </div>
                      </FormItem>
                    )}
                  />
                </div>

                {/* Budget */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Budget per Serving</h3>
                  <FormField
                    control={form.control}
                    name="budgetPerServing"
                    render={({ field }) => (
                      <FormItem>
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">£1</span>
                            <span className="font-medium">£{field.value}</span>
                            <span className="text-sm text-muted-foreground">£50</span>
                          </div>
                          <Slider
                            min={1}
                            max={50}
                            step={1}
                            value={[field.value || 5]}
                            onValueChange={(value) => field.onChange(value[0])}
                            className="w-full"
                          />
                        </div>
                      </FormItem>
                    )}
                  />
                </div>

                {/* Submit Button */}
                <Button 
                  type="submit" 
                  className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold text-lg py-6 shadow-lg hover:shadow-xl transition-all duration-300"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
                      <span>Saving Preferences...</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Crown className="w-5 h-5" />
                      <span>Start Cooking with Flavr+</span>
                    </div>
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </main>

      <GlobalFooter />
    </div>
  );
}