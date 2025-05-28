import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Crown, Calendar, ChefHat, Clock, DollarSign, Utensils, ChevronDown, ChevronUp, Lock, Sparkles } from "lucide-react";
import { useLocation } from "wouter";
import GlobalHeader from "@/components/GlobalHeader";

interface DayPreferences {
  skip: boolean;
  cuisine: string[];
  mood: string;
  ambition: string;
  time: string;
  budget: string;
  dietary: string[];
  equipment: string[];
}

interface WeeklyPreferences {
  monday: DayPreferences;
  tuesday: DayPreferences;
  wednesday: DayPreferences;
  thursday: DayPreferences;
  friday: DayPreferences;
  saturday: DayPreferences;
  sunday: DayPreferences;
}

const defaultDayPreferences: DayPreferences = {
  skip: false,
  cuisine: [],
  mood: '',
  ambition: '',
  time: '',
  budget: '',
  dietary: [],
  equipment: []
};

const cuisineOptions = [
  { value: 'italian', label: '🇮🇹 Italian' },
  { value: 'thai', label: '🇹🇭 Thai' },
  { value: 'indian', label: '🇮🇳 Indian' },
  { value: 'mexican', label: '🇲🇽 Mexican' },
  { value: 'chinese', label: '🇨🇳 Chinese' },
  { value: 'mediterranean', label: '🌊 Mediterranean' },
  { value: 'british', label: '🇬🇧 British' },
  { value: 'french', label: '🇫🇷 French' },
  { value: 'japanese', label: '🇯🇵 Japanese' },
  { value: 'korean', label: '🇰🇷 Korean' }
];

const moodOptions = [
  { value: 'comforting', label: '😌 Comforting' },
  { value: 'indulgent', label: '🎉 Indulgent' },
  { value: 'healthy', label: '🥗 Healthy' },
  { value: 'adventurous', label: '🌟 Adventurous' },
  { value: 'quick', label: '⚡ Quick & Easy' },
  { value: 'social', label: '👥 Social' }
];

const ambitionOptions = [
  { value: 'simple', label: '🟢 Simple' },
  { value: 'moderate', label: '🟡 Moderate' },
  { value: 'ambitious', label: '🔴 Ambitious' }
];

const timeOptions = [
  { value: '15-30', label: '15-30 minutes' },
  { value: '30-45', label: '30-45 minutes' },
  { value: '45-60', label: '45-60 minutes' },
  { value: '60+', label: '60+ minutes' }
];

const budgetOptions = [
  { value: 'budget', label: '£1-£3 per person' },
  { value: 'moderate', label: '£3-£6 per person' },
  { value: 'premium', label: '£6+ per person' }
];

const dietaryOptions = [
  { value: 'vegan', label: '🌱 Vegan' },
  { value: 'vegetarian', label: '🥕 Vegetarian' },
  { value: 'glutenFree', label: '🌾 Gluten-free' },
  { value: 'dairyFree', label: '🥛 Dairy-free' },
  { value: 'keto', label: '🥑 Keto' },
  { value: 'paleo', label: '🦴 Paleo' }
];

const equipmentOptions = [
  { value: 'oven', label: '🔥 Oven', icon: '🔥' },
  { value: 'stovetop', label: '🍳 Stovetop', icon: '🍳' },
  { value: 'airfryer', label: '💨 Air Fryer', icon: '💨' },
  { value: 'slowcooker', label: '⏰ Slow Cooker', icon: '⏰' },
  { value: 'microwave', label: '📡 Microwave', icon: '📡' },
  { value: 'bbq', label: '🔥 BBQ/Grill', icon: '🔥' }
];

const dayNames = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;
const dayLabels = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function FlavrRituals() {
  const [, setLocation] = useLocation();
  const [weeklyPrefs, setWeeklyPrefs] = useState<WeeklyPreferences>(() => {
    const initial = {} as WeeklyPreferences;
    dayNames.forEach(day => {
      initial[day] = { ...defaultDayPreferences };
    });
    return initial;
  });
  
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set(['monday']));

  // Get current user data
  const { data: userData } = useQuery({
    queryKey: ["/api/me"],
    retry: false,
  });

  const user = userData?.user;
  const hasFlavrPlus = userData?.user?.hasFlavrPlus || false;

  // Flavr+ Lock Screen for non-subscribers
  if (!hasFlavrPlus) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-red-50 to-pink-50">
        <GlobalHeader 
          onMenuClick={() => {}}
          onSettingsClick={() => {}}
          onAuthRequired={() => {}}
        />
        
        <div className="flex items-center justify-center min-h-screen p-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-md mx-auto"
          >
            <Card className="border-0 shadow-2xl bg-white/95 backdrop-blur-sm">
              <CardContent className="p-8 text-center">
                <div className="relative mb-6">
                  <div className="absolute inset-0 bg-gradient-to-r from-orange-400 to-red-400 rounded-full blur-lg opacity-30"></div>
                  <div className="relative bg-gradient-to-r from-orange-400 to-red-400 rounded-full p-4 w-20 h-20 mx-auto flex items-center justify-center">
                    <Lock className="w-8 h-8 text-white" />
                  </div>
                </div>
                
                <div className="mb-6">
                  <h1 className="text-2xl font-bold text-gray-900 mb-2">Flavr Rituals</h1>
                  <Badge className="bg-gradient-to-r from-orange-400 to-red-400 text-white border-0">
                    <Crown className="w-3 h-3 mr-1" />
                    Flavr+ Exclusive
                  </Badge>
                </div>
                
                <div className="space-y-4 mb-6 text-left">
                  <div className="flex items-start space-x-3">
                    <Calendar className="w-5 h-5 text-orange-500 mt-0.5 flex-shrink-0" />
                    <p className="text-gray-600 text-sm">Weekly meal planner that learns your preferences</p>
                  </div>
                  <div className="flex items-start space-x-3">
                    <Sparkles className="w-5 h-5 text-orange-500 mt-0.5 flex-shrink-0" />
                    <p className="text-gray-600 text-sm">Reduces food waste with smart ingredient planning</p>
                  </div>
                  <div className="flex items-start space-x-3">
                    <ChefHat className="w-5 h-5 text-orange-500 mt-0.5 flex-shrink-0" />
                    <p className="text-gray-600 text-sm">Generates supermarket-optimized shopping lists</p>
                  </div>
                </div>
                
                <Button 
                  onClick={() => setLocation("/flavr-plus")}
                  className="w-full bg-gradient-to-r from-orange-400 to-red-400 hover:from-orange-500 hover:to-red-500 text-white border-0 py-3"
                >
                  <Crown className="w-4 h-4 mr-2" />
                  Upgrade to Flavr+ to Access Rituals
                </Button>
                
                <p className="text-xs text-gray-500 mt-4">
                  Only £4.99/month • Cancel anytime
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    );
  }

  const toggleDay = (day: string) => {
    setExpandedDays(prev => {
      const newSet = new Set(prev);
      if (newSet.has(day)) {
        newSet.delete(day);
      } else {
        newSet.add(day);
      }
      return newSet;
    });
  };

  const updateDayPreference = (day: keyof WeeklyPreferences, field: keyof DayPreferences, value: any) => {
    setWeeklyPrefs(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        [field]: value
      }
    }));
  };

  const toggleDaySkip = (day: keyof WeeklyPreferences) => {
    setWeeklyPrefs(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        skip: !prev[day].skip
      }
    }));
  };

  const isFormValid = () => {
    const nonSkippedDays = dayNames.filter(day => !weeklyPrefs[day].skip);
    if (nonSkippedDays.length === 0) return false;
    
    return nonSkippedDays.every(day => {
      const prefs = weeklyPrefs[day];
      return prefs.cuisine.length > 0 && prefs.mood && prefs.ambition && 
             prefs.time && prefs.budget && prefs.equipment.length > 0;
    });
  };

  const handleConfirmPlan = () => {
    // Store weekly preferences in context/state for later use
    console.log('Weekly meal plan confirmed:', weeklyPrefs);
    // TODO: Navigate to next phase or store in context
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-red-50 to-pink-50">
      <GlobalHeader 
        onMenuClick={() => {}}
        onSettingsClick={() => {}}
        onAuthRequired={() => {}}
      />
      
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 text-center"
        >
          <div className="flex items-center justify-center mb-4">
            <Calendar className="w-8 h-8 text-orange-500 mr-3" />
            <h1 className="text-3xl font-bold text-gray-900">Flavr Rituals</h1>
            <Badge className="ml-3 bg-gradient-to-r from-orange-400 to-red-400 text-white border-0">
              <Crown className="w-3 h-3 mr-1" />
              Flavr+ Exclusive
            </Badge>
          </div>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Plan your perfect week of cooking. Set preferences for each day and we'll create 
            personalized recipes with smart shopping lists.
          </p>
        </motion.div>

        <div className="space-y-4 mb-8">
          {dayNames.map((day, index) => {
            const isExpanded = expandedDays.has(day);
            const dayPrefs = weeklyPrefs[day];
            
            return (
              <motion.div
                key={day}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className={`border-0 shadow-md transition-all duration-200 ${dayPrefs.skip ? 'opacity-60' : ''}`}>
                  <CardHeader 
                    className="cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => toggleDay(day)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <CardTitle className="text-lg">{dayLabels[index]}</CardTitle>
                        {!dayPrefs.skip && (
                          <Badge variant="outline" className="text-xs">
                            {dayPrefs.cuisine.length > 0 ? `${dayPrefs.cuisine.length} cuisines` : 'Not configured'}
                          </Badge>
                        )}
                        {dayPrefs.skip && (
                          <Badge variant="secondary" className="text-xs">Skipped</Badge>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="flex items-center space-x-2">
                          <Label htmlFor={`skip-${day}`} className="text-sm">Skip this day</Label>
                          <Switch
                            id={`skip-${day}`}
                            checked={dayPrefs.skip}
                            onCheckedChange={() => toggleDaySkip(day)}
                          />
                        </div>
                        {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                      </div>
                    </div>
                  </CardHeader>
                  
                  <AnimatePresence>
                    {isExpanded && !dayPrefs.skip && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <CardContent className="pt-0 space-y-4">
                          {/* Cuisine Preference */}
                          <div>
                            <Label className="text-sm font-medium mb-2 block">Cuisine Preferences</Label>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                              {cuisineOptions.map(cuisine => (
                                <div key={cuisine.value} className="flex items-center space-x-2">
                                  <Checkbox
                                    id={`${day}-${cuisine.value}`}
                                    checked={dayPrefs.cuisine.includes(cuisine.value)}
                                    onCheckedChange={(checked) => {
                                      const newCuisines = checked 
                                        ? [...dayPrefs.cuisine, cuisine.value]
                                        : dayPrefs.cuisine.filter(c => c !== cuisine.value);
                                      updateDayPreference(day, 'cuisine', newCuisines);
                                    }}
                                  />
                                  <Label htmlFor={`${day}-${cuisine.value}`} className="text-sm">
                                    {cuisine.label}
                                  </Label>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Mood */}
                            <div>
                              <Label className="text-sm font-medium mb-2 block">Mood</Label>
                              <Select value={dayPrefs.mood} onValueChange={(value) => updateDayPreference(day, 'mood', value)}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select mood..." />
                                </SelectTrigger>
                                <SelectContent>
                                  {moodOptions.map(mood => (
                                    <SelectItem key={mood.value} value={mood.value}>
                                      {mood.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            {/* Ambition */}
                            <div>
                              <Label className="text-sm font-medium mb-2 block">Cooking Ambition</Label>
                              <Select value={dayPrefs.ambition} onValueChange={(value) => updateDayPreference(day, 'ambition', value)}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select ambition..." />
                                </SelectTrigger>
                                <SelectContent>
                                  {ambitionOptions.map(ambition => (
                                    <SelectItem key={ambition.value} value={ambition.value}>
                                      {ambition.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            {/* Time */}
                            <div>
                              <Label className="text-sm font-medium mb-2 block">Cooking Time</Label>
                              <Select value={dayPrefs.time} onValueChange={(value) => updateDayPreference(day, 'time', value)}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select time..." />
                                </SelectTrigger>
                                <SelectContent>
                                  {timeOptions.map(time => (
                                    <SelectItem key={time.value} value={time.value}>
                                      {time.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            {/* Budget */}
                            <div>
                              <Label className="text-sm font-medium mb-2 block">Budget</Label>
                              <Select value={dayPrefs.budget} onValueChange={(value) => updateDayPreference(day, 'budget', value)}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select budget..." />
                                </SelectTrigger>
                                <SelectContent>
                                  {budgetOptions.map(budget => (
                                    <SelectItem key={budget.value} value={budget.value}>
                                      {budget.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          {/* Dietary Requirements */}
                          <div>
                            <Label className="text-sm font-medium mb-2 block">Dietary Requirements</Label>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                              {dietaryOptions.map(diet => (
                                <div key={diet.value} className="flex items-center space-x-2">
                                  <Checkbox
                                    id={`${day}-${diet.value}`}
                                    checked={dayPrefs.dietary.includes(diet.value)}
                                    onCheckedChange={(checked) => {
                                      const newDietary = checked 
                                        ? [...dayPrefs.dietary, diet.value]
                                        : dayPrefs.dietary.filter(d => d !== diet.value);
                                      updateDayPreference(day, 'dietary', newDietary);
                                    }}
                                  />
                                  <Label htmlFor={`${day}-${diet.value}`} className="text-sm">
                                    {diet.label}
                                  </Label>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Equipment */}
                          <div>
                            <Label className="text-sm font-medium mb-2 block">Available Equipment</Label>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                              {equipmentOptions.map(equipment => (
                                <div key={equipment.value} className="flex items-center space-x-2">
                                  <Checkbox
                                    id={`${day}-${equipment.value}`}
                                    checked={dayPrefs.equipment.includes(equipment.value)}
                                    onCheckedChange={(checked) => {
                                      const newEquipment = checked 
                                        ? [...dayPrefs.equipment, equipment.value]
                                        : dayPrefs.equipment.filter(e => e !== equipment.value);
                                      updateDayPreference(day, 'equipment', newEquipment);
                                    }}
                                  />
                                  <Label htmlFor={`${day}-${equipment.value}`} className="text-sm">
                                    {equipment.label}
                                  </Label>
                                </div>
                              ))}
                            </div>
                          </div>
                        </CardContent>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Card>
              </motion.div>
            );
          })}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="text-center"
        >
          <Button
            onClick={handleConfirmPlan}
            disabled={!isFormValid()}
            className={`px-8 py-3 text-lg font-medium transition-all duration-200 ${
              isFormValid() 
                ? 'bg-gradient-to-r from-orange-400 to-red-400 hover:from-orange-500 hover:to-red-500 text-white' 
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            <Calendar className="w-5 h-5 mr-2" />
            Confirm Weekly Plan
          </Button>
          
          {!isFormValid() && (
            <p className="text-sm text-gray-500 mt-2">
              Please configure at least one day to continue
            </p>
          )}
        </motion.div>
      </div>
    </div>
  );
}