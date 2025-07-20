// User behavioral profiling and purchase intent tracking
import { apiRequest } from "./queryClient";

interface UserBehavioralProfile {
  // User identification
  userId: string;
  sessionId: string;
  profileCreatedAt: string;
  lastActiveAt: string;
  
  // Behavioral patterns
  engagementLevel: 'low' | 'medium' | 'high' | 'power_user';
  sessionCount: number;
  recipesGenerated: number;
  recipesCompleted: number;
  averageSessionDuration: number;
  
  // Time patterns
  mostActiveHour: number;
  mostActiveDay: string;
  cookingSchedule: 'weekday' | 'weekend' | 'mixed';
  mealPlanningFrequency: 'daily' | 'weekly' | 'sporadic';
  
  // Interaction patterns
  preferredMode: 'shopping' | 'fridge' | 'chef' | 'rituals';
  decisionSpeed: 'quick' | 'deliberate' | 'indecisive';
  recipeCompletionRate: number;
  sharingBehavior: 'private' | 'occasional' | 'frequent';
  
  // Device and context
  primaryDevice: 'mobile' | 'tablet' | 'desktop';
  accessPatterns: 'home' | 'work' | 'commute' | 'mixed';
  
  // Unique behavioral hash
  behavioralFingerprint: string;
}

interface PurchaseIntent {
  // Grocery shopping behavior
  supermarketPreference: string;
  alternativeSupermarkets: string[];
  shoppingFrequency: 'daily' | 'twice_weekly' | 'weekly' | 'biweekly' | 'monthly';
  preferredShoppingDay: string;
  preferredShoppingTime: 'morning' | 'afternoon' | 'evening' | 'night';
  averageBasketSize: 'small' | 'medium' | 'large' | 'bulk';
  
  // Budget and spending patterns
  budgetRange: 'budget' | 'midRange' | 'premium' | 'luxury';
  priceElasticity: 'very_sensitive' | 'somewhat_sensitive' | 'neutral' | 'quality_focused';
  promotionResponsiveness: 'high' | 'medium' | 'low';
  brandLoyalty: 'generic' | 'mixed' | 'brand_conscious' | 'premium_only';
  
  // Product preferences
  ingredientPreferences: {
    organic: boolean;
    local: boolean;
    sustainable: boolean;
    convenience: boolean;
    fresh: boolean;
    frozen: boolean;
    readyMade: boolean;
  };
  
  // Household composition
  householdSize: number;
  householdComposition: 'single' | 'couple' | 'family_young' | 'family_teen' | 'multi_gen';
  petOwnership: boolean;
  
  // Purchase patterns
  categorySpending: {
    produce: number; // percentage
    meat: number;
    dairy: number;
    pantry: number;
    snacks: number;
    beverages: number;
    prepared: number;
    international: number;
  };
  
  // Seasonal patterns
  seasonalityImpact: 'high' | 'medium' | 'low';
  holidaySpending: 'increased' | 'normal' | 'decreased';
  
  // Future purchase likelihood
  nextPurchaseWindow: number; // days until likely purchase
  upcomingEvents: string[]; // hosting, holidays, etc
  
  // Cross-sell opportunities
  complementaryCategories: string[];
  untappedCategories: string[];
}

interface UserPreferences {
  // Culinary preferences
  cuisinePreferences: {
    primary: string[];
    avoided: string[];
    adventurousness: 'conservative' | 'moderate' | 'adventurous' | 'experimental';
    authenticityPreference: 'traditional' | 'fusion' | 'modern' | 'flexible';
  };
  
  // Cooking behavior
  cookingProfile: {
    skillLevel: 'beginner' | 'intermediate' | 'advanced' | 'professional';
    learningInterest: 'low' | 'medium' | 'high';
    techniquePreference: 'simple' | 'moderate' | 'complex';
    recipeFollowing: 'exact' | 'flexible' | 'improvisational';
  };
  
  // Time and planning
  timePatterns: {
    weekdayAvailable: number; // minutes
    weekendAvailable: number;
    mealPrepInterest: boolean;
    batchCooking: boolean;
    lastMinuteCooking: boolean;
  };
  
  // Dietary profile
  dietaryProfile: {
    restrictions: string[];
    preferences: string[];
    healthFocus: string[];
    calorieAwareness: 'none' | 'moderate' | 'strict';
    nutritionInterest: 'low' | 'medium' | 'high';
  };
  
  // Ingredient attitudes
  ingredientBehavior: {
    favoriteIngredients: string[];
    dislikedIngredients: string[];
    willingnessToTry: 'low' | 'medium' | 'high';
    substitutionComfort: 'never' | 'sometimes' | 'often';
    wasteConsciousness: 'low' | 'medium' | 'high';
  };
  
  // Equipment and techniques
  kitchenProfile: {
    availableEquipment: string[];
    preferredCookingMethods: string[];
    avoidedTechniques: string[];
    gadgetEnthusiasm: 'minimal' | 'moderate' | 'high';
  };
  
  // Meal preferences
  mealPreferences: {
    portionControl: 'small' | 'medium' | 'large' | 'variable';
    leftoverAttitude: 'avoid' | 'tolerate' | 'prefer';
    presentationImportance: 'low' | 'medium' | 'high';
    comfortVsHealth: number; // 0-100 scale
  };
  
  // Social cooking
  socialCooking: {
    entertainmentFrequency: 'never' | 'occasional' | 'regular' | 'frequent';
    impressionMotivation: 'low' | 'medium' | 'high';
    familyConsiderations: boolean;
    culturalImportance: 'low' | 'medium' | 'high';
  };
}

// Behavioral analytics data
interface BehavioralAnalytics {
  // Session patterns
  sessionMetrics: {
    totalSessions: number;
    averageDuration: number;
    bounceRate: number;
    depthOfEngagement: number;
    returnFrequency: number;
  };
  
  // Recipe interaction
  recipeMetrics: {
    generatedCount: number;
    completedCount: number;
    abandonmentRate: number;
    averageTimeToDecision: number;
    modificationRate: number;
    satisfactionScore: number;
  };
  
  // Feature usage
  featureAdoption: {
    shoppingModeUsage: number;
    fridgeModeUsage: number;
    chefModeUsage: number;
    ritualsUsage: number;
    chatbotInteractions: number;
    voiceUsage: number;
  };
  
  // Conversion indicators
  conversionSignals: {
    recipeSaveRate: number;
    shareRate: number;
    printRate: number;
    shoppingListCreation: number;
    repeatRecipeRate: number;
  };
  
  // User journey
  journeyStage: 'discovery' | 'evaluation' | 'active' | 'loyal' | 'advocate';
  churnRisk: 'low' | 'medium' | 'high';
  lifetimeValue: number;
  
  // Engagement trends
  trends: {
    usageDirection: 'increasing' | 'stable' | 'decreasing';
    seasonalityPattern: boolean;
    weeklyPattern: string[];
    monthlyPattern: number[];
  };
}

// Generate behavioral profile ID
export function generateBehavioralId(userId: string, timestamp: number): string {
  const data = `${userId}-${timestamp}-${Math.random()}`;
  return btoa(data).replace(/[^a-zA-Z0-9]/g, '').substring(0, 16);
}

// Create comprehensive user profile
export async function createUserBehavioralProfile(
  userId: string,
  sessionHistory: any[],
  recipeHistory: any[]
): Promise<UserBehavioralProfile> {
  const now = new Date();
  const sessionId = sessionStorage.getItem('flavr_session_id') || generateSessionId();
  
  // Analyze engagement patterns
  const engagementLevel = calculateEngagementLevel(sessionHistory, recipeHistory);
  const preferredMode = calculatePreferredMode(recipeHistory);
  const decisionSpeed = calculateDecisionSpeed(sessionHistory);
  
  // Time analysis
  const timePatterns = analyzeTimePatterns(sessionHistory);
  
  // Device analysis
  const primaryDevice = getDeviceCategory();
  const accessPatterns = analyzeAccessPatterns(sessionHistory);
  
  const profile: UserBehavioralProfile = {
    userId,
    sessionId,
    profileCreatedAt: now.toISOString(),
    lastActiveAt: now.toISOString(),
    engagementLevel,
    sessionCount: sessionHistory.length,
    recipesGenerated: recipeHistory.length,
    recipesCompleted: recipeHistory.filter(r => r.completed).length,
    averageSessionDuration: calculateAverageSessionDuration(sessionHistory),
    mostActiveHour: timePatterns.hour,
    mostActiveDay: timePatterns.day,
    cookingSchedule: timePatterns.schedule,
    mealPlanningFrequency: calculatePlanningFrequency(recipeHistory),
    preferredMode,
    decisionSpeed,
    recipeCompletionRate: calculateCompletionRate(recipeHistory),
    sharingBehavior: calculateSharingBehavior(recipeHistory),
    primaryDevice,
    accessPatterns,
    behavioralFingerprint: generateBehavioralId(userId, now.getTime())
  };
  
  return profile;
}

// Track user interaction with behavioral insights
export async function trackUserInteraction(
  interactionType: string,
  data: any,
  quizData?: any,
  recipeData?: any
) {
  try {
    const sessionId = sessionStorage.getItem('flavr_session_id') || generateSessionId();
    const userId = localStorage.getItem('flavrUserId') || 'anonymous';
    
    // Extract purchase intent from quiz data
    const purchaseIntent = quizData ? extractPurchaseIntent(quizData) : undefined;
    
    // Build comprehensive interaction data
    const interactionData = {
      userId,
      pseudoUserId: userId === 'anonymous' ? userId : null,
      sessionId,
      interactionType,
      page: window.location.pathname,
      component: data.component || 'unknown',
      action: data.action || interactionType,
      data: {
        ...data,
        // Purchase intent indicators
        purchaseIntent: purchaseIntent ? {
          supermarket: purchaseIntent.supermarketPreference,
          budget: purchaseIntent.budgetRange,
          basketSize: purchaseIntent.averageBasketSize,
          shoppingFrequency: purchaseIntent.shoppingFrequency,
          householdSize: purchaseIntent.householdSize,
          brandLoyalty: purchaseIntent.brandLoyalty,
          priceElasticity: purchaseIntent.priceElasticity,
        } : undefined,
        
        // Recipe preferences
        recipePreferences: recipeData ? {
          cuisine: recipeData.cuisine,
          difficulty: recipeData.difficulty,
          cookTime: recipeData.cookTime,
          servings: recipeData.servings,
          dietaryNeeds: recipeData.dietary,
          equipment: recipeData.equipment,
        } : undefined,
        
        // Behavioral context
        behavioralContext: {
          deviceType: getDeviceCategory(),
          timeOfDay: getTimeOfDay(),
          dayOfWeek: getDayOfWeek(),
          sessionDuration: getSessionDuration(),
          interactionSpeed: calculateInteractionSpeed(),
          scrollDepth: getScrollDepth(),
          clickPattern: getClickPattern(),
        },
        
        // User journey stage
        journeyContext: {
          isFirstVisit: isFirstTimeUser(),
          sessionNumber: getSessionNumber(),
          recipesViewedThisSession: getRecipesViewedCount(),
          lastInteractionTime: getLastInteractionTime(),
          engagementScore: calculateEngagementScore(),
        },
        
        timestamp: new Date().toISOString(),
      },
      userAgent: navigator.userAgent,
      browserFingerprint: generateBehavioralId(userId, Date.now())
    };
    
    // Send to server immediately for real-time insights
    try {
      await apiRequest('POST', '/api/interactions', interactionData);
    } catch (postError) {
      console.warn('Failed to send interaction to server:', postError);
    }
    
    // Store for offline analysis
    storeInteractionLocally(interactionData);
    
  } catch (error) {
    console.error('Error tracking user interaction:', error);
  }
}

// Helper functions for behavioral tracking
function generateSessionId(): string {
  const id = crypto.randomUUID();
  sessionStorage.setItem('flavr_session_id', id);
  sessionStorage.setItem('flavr_session_start', Date.now().toString());
  sessionStorage.setItem('flavr_interaction_count', '0');
  sessionStorage.setItem('flavr_recipes_viewed', '0');
  return id;
}

function getDeviceCategory(): 'mobile' | 'tablet' | 'desktop' {
  const width = window.innerWidth;
  if (width < 768) return 'mobile';
  if (width < 1024) return 'tablet';
  return 'desktop';
}

function getTimeOfDay(): string {
  const hour = new Date().getHours();
  if (hour < 6) return 'night';
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  if (hour < 21) return 'evening';
  return 'night';
}

function getDayOfWeek(): string {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[new Date().getDay()];
}

function getSessionDuration(): number {
  const start = sessionStorage.getItem('flavr_session_start');
  if (!start) return 0;
  return Math.round((Date.now() - parseInt(start)) / 1000); // in seconds
}

function calculateInteractionSpeed(): 'fast' | 'moderate' | 'slow' {
  const interactions = parseInt(sessionStorage.getItem('flavr_interaction_count') || '0');
  const duration = getSessionDuration();
  if (duration === 0) return 'moderate';
  
  const speed = interactions / (duration / 60); // interactions per minute
  if (speed > 10) return 'fast';
  if (speed < 3) return 'slow';
  return 'moderate';
}

function getScrollDepth(): number {
  const scrolled = window.scrollY;
  const viewportHeight = window.innerHeight;
  const documentHeight = document.documentElement.scrollHeight;
  return Math.round((scrolled + viewportHeight) / documentHeight * 100);
}

function getClickPattern(): string {
  // Track click patterns in session
  const pattern = sessionStorage.getItem('flavr_click_pattern') || '';
  return pattern.slice(-20); // Last 20 interactions
}

function isFirstTimeUser(): boolean {
  return !localStorage.getItem('flavr_returning_user');
}

function getSessionNumber(): number {
  const sessions = parseInt(localStorage.getItem('flavr_session_count') || '0');
  return sessions + 1;
}

function getRecipesViewedCount(): number {
  return parseInt(sessionStorage.getItem('flavr_recipes_viewed') || '0');
}

function getLastInteractionTime(): number {
  const last = sessionStorage.getItem('flavr_last_interaction');
  return last ? Date.now() - parseInt(last) : 0;
}

function calculateEngagementScore(): number {
  const duration = getSessionDuration();
  const interactions = parseInt(sessionStorage.getItem('flavr_interaction_count') || '0');
  const recipes = getRecipesViewedCount();
  
  // Weighted engagement score (0-100)
  const durationScore = Math.min(duration / 600, 1) * 30; // 10 min = full score
  const interactionScore = Math.min(interactions / 20, 1) * 40; // 20 interactions = full
  const recipeScore = Math.min(recipes / 3, 1) * 30; // 3 recipes = full
  
  return Math.round(durationScore + interactionScore + recipeScore);
}

function storeInteractionLocally(data: any): void {
  try {
    // Update interaction count
    const count = parseInt(sessionStorage.getItem('flavr_interaction_count') || '0');
    sessionStorage.setItem('flavr_interaction_count', (count + 1).toString());
    sessionStorage.setItem('flavr_last_interaction', Date.now().toString());
    
    // Update click pattern
    const pattern = sessionStorage.getItem('flavr_click_pattern') || '';
    sessionStorage.setItem('flavr_click_pattern', pattern + data.action.charAt(0));
    
    // Mark as returning user
    localStorage.setItem('flavr_returning_user', 'true');
    
    // Store detailed interaction for batch processing
    const stored = JSON.parse(localStorage.getItem('flavr_stored_interactions') || '[]');
    stored.push(data);
    if (stored.length > 50) stored.shift(); // Keep last 50
    localStorage.setItem('flavr_stored_interactions', JSON.stringify(stored));
  } catch (e) {
    console.warn('Failed to store interaction locally:', e);
  }
}

// Extract purchase intent from quiz data
export function extractPurchaseIntent(quizData: any): Partial<PurchaseIntent> {
  const budget = quizData.budget || 'midRange';
  const servings = parseInt(quizData.servings) || 2;
  
  return {
    supermarketPreference: quizData.supermarket || 'unknown',
    alternativeSupermarkets: [],
    shoppingFrequency: inferShoppingFrequency(servings),
    budgetRange: budget,
    priceElasticity: budget === 'budget' ? 'very_sensitive' : budget === 'premium' ? 'quality_focused' : 'somewhat_sensitive',
    brandLoyalty: budget === 'premium' ? 'premium_only' : budget === 'budget' ? 'generic' : 'mixed',
    ingredientPreferences: {
      organic: budget === 'premium',
      local: budget === 'premium' || budget === 'midRange',
      sustainable: quizData.mood === 'sustainable',
      convenience: quizData.time < 30,
      fresh: true,
      frozen: quizData.ingredientFlexibility === 'flexible',
      readyMade: quizData.ambition === 'confidentCook' ? false : true,
    },
    householdSize: servings,
    householdComposition: inferHouseholdType(servings),
    categorySpending: inferCategorySpending(quizData),
    seasonalityImpact: 'medium',
    nextPurchaseWindow: 3, // days
  };
}

// Helper functions for analysis
function inferShoppingFrequency(servings: number): 'daily' | 'twice_weekly' | 'weekly' | 'biweekly' | 'monthly' {
  if (servings <= 2) return 'weekly';
  if (servings <= 4) return 'twice_weekly';
  return 'weekly';
}

function inferHouseholdType(servings: number): 'single' | 'couple' | 'family_young' | 'family_teen' | 'multi_gen' {
  if (servings === 1) return 'single';
  if (servings === 2) return 'couple';
  if (servings <= 4) return 'family_young';
  return 'family_teen';
}

function inferCategorySpending(quizData: any): any {
  const base = {
    produce: 25,
    meat: 20,
    dairy: 15,
    pantry: 20,
    snacks: 5,
    beverages: 10,
    prepared: 5,
    international: 0,
  };
  
  // Adjust based on dietary preferences
  if (quizData.dietary?.includes('vegetarian') || quizData.dietary?.includes('vegan')) {
    base.produce += 10;
    base.meat = 0;
    base.dairy = quizData.dietary.includes('vegan') ? 0 : 10;
  }
  
  if (quizData.cuisine === 'asian' || quizData.cuisine === 'mediterranean') {
    base.international = 10;
    base.pantry -= 5;
  }
  
  return base;
}

// Analyze user behavior patterns
function calculateEngagementLevel(sessions: any[], recipes: any[]): 'low' | 'medium' | 'high' | 'power_user' {
  const sessionCount = sessions.length;
  const recipeCount = recipes.length;
  const avgSessionDuration = sessions.reduce((sum, s) => sum + s.duration, 0) / sessionCount;
  
  if (sessionCount > 20 && recipeCount > 15 && avgSessionDuration > 600) return 'power_user';
  if (sessionCount > 10 && recipeCount > 8) return 'high';
  if (sessionCount > 5 && recipeCount > 3) return 'medium';
  return 'low';
}

function calculatePreferredMode(recipes: any[]): 'shopping' | 'fridge' | 'chef' | 'rituals' {
  const modeCounts = recipes.reduce((acc, r) => {
    acc[r.mode] = (acc[r.mode] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  return Object.entries(modeCounts)
    .sort(([, a], [, b]) => b - a)[0]?.[0] as any || 'shopping';
}

function calculateDecisionSpeed(sessions: any[]): 'quick' | 'deliberate' | 'indecisive' {
  const avgTimeToRecipe = sessions
    .filter(s => s.recipeGenerated)
    .reduce((sum, s) => sum + s.timeToRecipe, 0) / sessions.length;
  
  if (avgTimeToRecipe < 120) return 'quick'; // < 2 min
  if (avgTimeToRecipe < 300) return 'deliberate'; // < 5 min
  return 'indecisive';
}

function analyzeTimePatterns(sessions: any[]): { hour: number; day: string; schedule: 'weekday' | 'weekend' | 'mixed' } {
  const hours = sessions.map(s => new Date(s.timestamp).getHours());
  const days = sessions.map(s => new Date(s.timestamp).getDay());
  
  const mostActiveHour = mode(hours) || 18;
  const mostActiveDay = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][mode(days) || 0];
  
  const weekendCount = days.filter(d => d === 0 || d === 6).length;
  const weekdayCount = days.length - weekendCount;
  
  let schedule: 'weekday' | 'weekend' | 'mixed' = 'mixed';
  if (weekendCount > weekdayCount * 2) schedule = 'weekend';
  else if (weekdayCount > weekendCount * 2) schedule = 'weekday';
  
  return { hour: mostActiveHour, day: mostActiveDay, schedule };
}

function mode(arr: number[]): number | undefined {
  const counts: Record<number, number> = {};
  arr.forEach(v => counts[v] = (counts[v] || 0) + 1);
  return Object.entries(counts).sort(([, a], [, b]) => b - a)[0]?.[0] as any;
}

function calculatePlanningFrequency(recipes: any[]): 'daily' | 'weekly' | 'sporadic' {
  if (recipes.length < 3) return 'sporadic';
  
  const dates = recipes.map(r => new Date(r.createdAt).toDateString());
  const uniqueDates = new Set(dates).size;
  const daySpan = (new Date(recipes[recipes.length - 1].createdAt).getTime() - new Date(recipes[0].createdAt).getTime()) / (1000 * 60 * 60 * 24);
  
  const recipesPerDay = uniqueDates / daySpan;
  if (recipesPerDay > 0.7) return 'daily';
  if (recipesPerDay > 0.2) return 'weekly';
  return 'sporadic';
}

function calculateAverageSessionDuration(sessions: any[]): number {
  if (sessions.length === 0) return 0;
  return Math.round(sessions.reduce((sum, s) => sum + (s.duration || 0), 0) / sessions.length);
}

function calculateCompletionRate(recipes: any[]): number {
  if (recipes.length === 0) return 0;
  const completed = recipes.filter(r => r.completed || r.saved).length;
  return Math.round((completed / recipes.length) * 100);
}

function calculateSharingBehavior(recipes: any[]): 'private' | 'occasional' | 'frequent' {
  const shared = recipes.filter(r => r.shared).length;
  const shareRate = shared / recipes.length;
  
  if (shareRate === 0) return 'private';
  if (shareRate < 0.2) return 'occasional';
  return 'frequent';
}

function analyzeAccessPatterns(sessions: any[]): 'home' | 'work' | 'commute' | 'mixed' {
  const hourPatterns = sessions.map(s => new Date(s.timestamp).getHours());
  const workHours = hourPatterns.filter(h => h >= 9 && h <= 17).length;
  const eveningHours = hourPatterns.filter(h => h >= 18 && h <= 23).length;
  const commuteHours = hourPatterns.filter(h => (h >= 7 && h <= 9) || (h >= 17 && h <= 19)).length;
  
  const total = hourPatterns.length;
  if (workHours / total > 0.6) return 'work';
  if (eveningHours / total > 0.6) return 'home';
  if (commuteHours / total > 0.3) return 'commute';
  return 'mixed';
}