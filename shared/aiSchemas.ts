import { z } from "zod";

// Core AI Operation Types
export const AIProviderType = z.enum(["openai", "gemini", "anthropic"]);
export const AIModel = z.enum([
  // OpenAI Models
  "gpt-4o", "gpt-4o-mini", "gpt-5", "dall-e-3",
  // Gemini Models
  "gemini-1.5-pro", "gemini-1.5-flash", "imagen-3",
  // Future models
  "claude-3-sonnet", "claude-3-haiku"
]);

// Common AI Request Options
export const AIRequestOptions = z.object({
  userId: z.number().optional(),
  pseudoUserId: z.string().optional(),
  traceId: z.string().optional(),
  stream: z.boolean().default(false),
  timeoutMs: z.number().default(30000),
  variant: z.string().optional(), // For A/B testing prompts
  maxTokens: z.number().optional(),
  temperature: z.number().min(0).max(2).optional(),
  retries: z.number().min(0).max(3).default(1)
});

// Metadata for all AI responses
export const AIResponseMetadata = z.object({
  model: AIModel,
  provider: AIProviderType,
  requestId: z.string(),
  traceId: z.string().optional(),
  processingTimeMs: z.number(),
  inputTokens: z.number().optional(),
  outputTokens: z.number().optional(),
  estimatedCostUsd: z.string().optional(),
  retryCount: z.number().default(0),
  cacheHit: z.boolean().default(false),
  fallbackUsed: z.boolean().default(false),
  promptVariant: z.string().optional()
});

// === CHAT SCHEMAS ===
export const ChatRole = z.enum(["user", "assistant", "system", "function"]);

export const ChatMessage = z.object({
  role: ChatRole,
  content: z.string(),
  name: z.string().optional(), // For function calls
  functionCall: z.object({
    name: z.string(),
    arguments: z.string()
  }).optional()
});

export const ChatIntent = z.enum([
  "conversational", "recipe_request", "recipe_modification", 
  "quick_recipe", "ingredient_substitution", "cooking_advice",
  "error", "unclear"
]);

export const SuggestedAction = z.object({
  type: z.enum(["quick_recipe", "full_recipe", "continue_chat", "modify_recipe"]),
  label: z.string(),
  icon: z.string().optional(),
  data: z.record(z.any()).optional()
});

export const ClarificationOption = z.object({
  type: z.enum(["quick_recipe", "full_recipe", "recipe_options", "continue_chat"]),
  label: z.string(),
  description: z.string(),
  icon: z.string()
});

export const ChatResponse = z.object({
  message: z.string(),
  intent: ChatIntent,
  confidence: z.number().min(0).max(1),
  requiresIntentClarification: z.boolean().default(false),
  clarificationOptions: z.array(ClarificationOption).optional(),
  suggestedActions: z.array(SuggestedAction).optional(),
  isRecipeModification: z.boolean().default(false),
  modifiedRecipe: z.any().optional(), // Will be RecipeLLM when available
  userMemory: z.record(z.any()).optional(),
  metadata: AIResponseMetadata
});

// === RECIPE SCHEMAS ===
export const DifficultyLevel = z.enum(["Easy", "Medium", "Hard"]);
export const MoodType = z.enum([
  "comfort", "adventurous", "healthy", "indulgent", "quick", "impressive"
]);

export const RecipeIngredient = z.object({
  text: z.string(),
  quantity: z.string().optional(),
  unit: z.string().optional(),
  ingredient: z.string().optional(), // Parsed ingredient name
  notes: z.string().optional()
});

export const RecipeInstruction = z.object({
  step: z.number(),
  instruction: z.string(),
  timing: z.string().optional(), // e.g., "10 minutes"
  temperature: z.string().optional(),
  technique: z.string().optional()
});

export const NutritionalInfo = z.object({
  calories: z.number().optional(),
  protein: z.string().optional(),
  carbs: z.string().optional(),
  fat: z.string().optional(),
  fiber: z.string().optional(),
  sugar: z.string().optional()
});

export const RecipeLLM = z.object({
  title: z.string(),
  description: z.string().optional(),
  cuisine: z.string().optional(),
  difficulty: DifficultyLevel,
  cookTime: z.number(), // in minutes
  prepTime: z.number().optional(),
  totalTime: z.number().optional(),
  servings: z.number(),
  mood: MoodType.optional(),
  
  // Core recipe data
  ingredients: z.array(z.union([z.string(), RecipeIngredient])),
  instructions: z.array(z.union([z.string(), RecipeInstruction])),
  
  // Enhanced data
  tips: z.string().optional(),
  variations: z.array(z.string()).optional(),
  equipment: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  
  // Nutritional and dietary info
  dietary: z.array(z.string()).optional(), // vegan, gluten-free, etc.
  nutritional: NutritionalInfo.optional(),
  
  // Source and generation context
  originalPrompt: z.string().optional(),
  mode: z.string().optional(), // shopping, fridge, chef
  quizData: z.record(z.any()).optional(),
  
  // Sub-recipe support
  isSubRecipe: z.boolean().default(false),
  subRecipeFor: z.string().optional(),
  subRecipes: z.array(z.lazy(() => RecipeLLM)).optional(),
  
  // Media and sharing
  imageUrl: z.string().optional(),
  imagePrompt: z.string().optional(),
  isShared: z.boolean().default(false),
  shareId: z.string().optional(),
  
  // Response metadata
  metadata: AIResponseMetadata
});

// === WEEKLY PLANNER SCHEMAS ===
export const PlannedMeal = z.object({
  day: z.string(), // monday, tuesday, etc.
  mealType: z.enum(["breakfast", "lunch", "dinner", "snack"]),
  recipeId: z.number().optional(),
  recipeTitle: z.string(),
  cuisine: z.string().optional(),
  cookTime: z.number(),
  servings: z.number(),
  difficulty: DifficultyLevel.optional(),
  isFlexible: z.boolean().default(false), // can be easily swapped
  estimatedCost: z.number().optional(),
  description: z.string().optional()
});

export const WeeklyPlanPreferences = z.object({
  householdSize: z.object({
    adults: z.number(),
    kids: z.number()
  }),
  cookingFrequency: z.number(), // meals per week
  timeComfort: z.object({
    weeknight: z.number(), // max minutes
    weekend: z.number()
  }),
  ambitionLevel: z.enum(["quick_simple", "balanced", "experimental_creative"]),
  cuisineWeighting: z.record(z.number()).optional(), // cuisine preferences with weights
  cuisinePreferences: z.array(z.string()).optional(),
  dietaryNeeds: z.array(z.string()),
  budgetPerServing: z.number().optional(), // in pence for Flavr+
  avoidSimilarTo: z.string().optional()
});

export const WeeklyPlanLLM = z.object({
  weekStartDate: z.string(), // ISO date string
  totalMeals: z.number(),
  estimatedTotalCost: z.number().optional(),
  plannedMeals: z.array(PlannedMeal),
  consolidatedShoppingList: z.array(z.object({
    ingredient: z.string(),
    quantity: z.string(),
    aisle: z.string().optional(),
    recipes: z.array(z.string()) // which recipes need this
  })).optional(),
  varietyScore: z.number().min(0).max(100).optional(), // cuisine diversity
  balanceScore: z.number().min(0).max(100).optional(), // nutritional balance
  metadata: AIResponseMetadata
});

// === IMAGE-TO-RECIPE SCHEMAS ===
export const DetectedIngredient = z.object({
  name: z.string(),
  confidence: z.number().min(0).max(1),
  quantity: z.string().optional(),
  freshness: z.enum(["fresh", "good", "wilting", "unknown"]).optional()
});

export const PhotoToRecipeLLM = z.object({
  detectedIngredients: z.array(DetectedIngredient),
  suggestedRecipes: z.array(z.object({
    title: z.string(),
    description: z.string(),
    confidence: z.number().min(0).max(1),
    missingIngredients: z.array(z.string()).optional(),
    cuisine: z.string().optional(),
    difficulty: DifficultyLevel.optional(),
    estimatedTime: z.number().optional()
  })),
  imageAnalysis: z.object({
    kitchenType: z.string().optional(), // home, professional, etc.
    imageQuality: z.enum(["excellent", "good", "fair", "poor"]),
    lightingCondition: z.string().optional(),
    confidence: z.number().min(0).max(1)
  }),
  metadata: AIResponseMetadata
});

// === COST OPTIMIZATION SCHEMAS ===
export const TokenUsage = z.object({
  inputTokens: z.number(),
  outputTokens: z.number(),
  totalTokens: z.number(),
  cacheTokens: z.number().optional()
});

export const CostAnalysis = z.object({
  estimatedCostUsd: z.string(),
  tokenUsage: TokenUsage,
  modelTier: z.enum(["premium", "standard", "budget"]),
  optimization: z.object({
    promptOptimized: z.boolean(),
    cacheUsed: z.boolean(),
    fallbackTriggered: z.boolean(),
    costSavingPercent: z.number().optional()
  }).optional()
});

// === ERROR AND FALLBACK SCHEMAS ===
export const AIErrorType = z.enum([
  "RATE_LIMIT", "TIMEOUT", "INVALID_RESPONSE", "MODEL_UNAVAILABLE",
  "QUOTA_EXCEEDED", "CONTENT_FILTER", "NETWORK_ERROR", "UNKNOWN"
]);

export const AIError = z.object({
  type: AIErrorType,
  message: z.string(),
  retryable: z.boolean(),
  retryAfterMs: z.number().optional(),
  originalError: z.any().optional(),
  fallbackAvailable: z.boolean(),
  metadata: z.record(z.any()).optional()
});

export const FallbackResponse = z.object({
  success: z.boolean(),
  fallbackUsed: z.boolean(),
  fallbackReason: z.string().optional(),
  originalError: AIError.optional(),
  response: z.union([ChatResponse, RecipeLLM, WeeklyPlanLLM, PhotoToRecipeLLM]).optional()
});

// === UTILITY TYPES ===
export type AIRequestOptions = z.infer<typeof AIRequestOptions>;
export type AIResponseMetadata = z.infer<typeof AIResponseMetadata>;
export type ChatResponse = z.infer<typeof ChatResponse>;
export type RecipeLLM = z.infer<typeof RecipeLLM>;
export type WeeklyPlanLLM = z.infer<typeof WeeklyPlanLLM>;
export type PhotoToRecipeLLM = z.infer<typeof PhotoToRecipeLLM>;
export type WeeklyPlanPreferences = z.infer<typeof WeeklyPlanPreferences>;
export type AIError = z.infer<typeof AIError>;
export type FallbackResponse = z.infer<typeof FallbackResponse>;
export type CostAnalysis = z.infer<typeof CostAnalysis>;
export type PlannedMeal = z.infer<typeof PlannedMeal>;
export type DetectedIngredient = z.infer<typeof DetectedIngredient>;
export type ChatMessage = z.infer<typeof ChatMessage>;
export type SuggestedAction = z.infer<typeof SuggestedAction>;
export type ClarificationOption = z.infer<typeof ClarificationOption>;

// === ENHANCED VALIDATION FOR GPT-4O MINI MIGRATION ===

// Quality validation for recipe responses
export const RecipeQualityValidation = z.object({
  hasTitle: z.boolean(),
  hasInstructions: z.boolean(),
  hasIngredients: z.boolean(),
  instructionCount: z.number().min(3), // At least 3 steps
  ingredientCount: z.number().min(2),  // At least 2 ingredients
  hasCookTime: z.boolean(),
  hasServings: z.boolean(),
  structuralScore: z.number().min(0).max(100), // Overall structure quality
  contentQuality: z.enum(["excellent", "good", "acceptable", "poor"])
});

// Enhanced recipe validation with quality checks
export const RecipeLLMWithValidation = RecipeLLM.extend({
  qualityMetrics: RecipeQualityValidation.optional(),
  validationPassed: z.boolean().default(true),
  fallbackReason: z.string().optional(),
  modelUsed: AIModel // Track which model generated this
});

// Validation thresholds for different models
export const QUALITY_THRESHOLDS = {
  "gpt-4o": {
    minStructuralScore: 85,
    minContentQuality: "good",
    requiredFields: ["title", "ingredients", "instructions", "cookTime", "servings"]
  },
  "gpt-4o-mini": {
    minStructuralScore: 80, // Slightly lower threshold for mini
    minContentQuality: "acceptable",
    requiredFields: ["title", "ingredients", "instructions", "cookTime"]
  }
} as const;

// === VALIDATION HELPERS ===
export function validateAIResponse<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
  fallbackData?: Partial<T>
): { success: true; data: T } | { success: false; error: string; fallback?: T } {
  try {
    const validated = schema.parse(data);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessage = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
      
      // Attempt to create fallback response if provided
      if (fallbackData) {
        try {
          const fallback = schema.parse({ ...fallbackData, ...data });
          return { success: false, error: errorMessage, fallback };
        } catch {
          // Fallback failed, return error only
        }
      }
      
      return { success: false, error: errorMessage };
    }
    return { success: false, error: 'Unknown validation error' };
  }
}

// Enhanced validation with quality assessment for recipe responses
export function validateRecipeResponse(
  data: unknown,
  model: AIModel,
  fallbackToGPT4o: boolean = true
): {
  success: boolean;
  data?: any;
  qualityMetrics?: any;
  error?: string;
  shouldFallback?: boolean;
  fallbackReason?: string;
} {
  try {
    // First, basic schema validation
    const basicValidation = validateAIResponse(RecipeLLM, data);
    if (!basicValidation.success) {
      return {
        success: false,
        error: basicValidation.error,
        shouldFallback: fallbackToGPT4o,
        fallbackReason: "Schema validation failed"
      };
    }

    const recipe = basicValidation.data;
    
    // Quality assessment
    const qualityMetrics = assessRecipeQuality(recipe);
    const threshold = QUALITY_THRESHOLDS[model] || QUALITY_THRESHOLDS["gpt-4o-mini"];
    
    // Check if recipe meets quality standards
    const meetsQuality = 
      qualityMetrics.structuralScore >= threshold.minStructuralScore &&
      isQualityAcceptable(qualityMetrics.contentQuality, threshold.minContentQuality);
    
    if (!meetsQuality && model === "gpt-4o-mini" && fallbackToGPT4o) {
      return {
        success: false,
        qualityMetrics,
        shouldFallback: true,
        fallbackReason: `Quality below threshold: ${qualityMetrics.structuralScore}/${threshold.minStructuralScore}, ${qualityMetrics.contentQuality}/${threshold.minContentQuality}`
      };
    }

    return {
      success: true,
      data: {
        ...recipe,
        qualityMetrics,
        validationPassed: meetsQuality,
        modelUsed: model
      }
    };
    
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown validation error",
      shouldFallback: fallbackToGPT4o,
      fallbackReason: "Exception during validation"
    };
  }
}

// Assess recipe quality based on structure and content
function assessRecipeQuality(recipe: any): any {
  const hasTitle = Boolean(recipe.title && recipe.title.trim().length > 0);
  const hasInstructions = Boolean(recipe.instructions && Array.isArray(recipe.instructions) && recipe.instructions.length > 0);
  const hasIngredients = Boolean(recipe.ingredients && Array.isArray(recipe.ingredients) && recipe.ingredients.length > 0);
  const hasCookTime = Boolean(recipe.cookTime && typeof recipe.cookTime === 'number' && recipe.cookTime > 0);
  const hasServings = Boolean(recipe.servings && typeof recipe.servings === 'number' && recipe.servings > 0);
  
  const instructionCount = hasInstructions ? recipe.instructions.length : 0;
  const ingredientCount = hasIngredients ? recipe.ingredients.length : 0;
  
  // Calculate structural score (0-100)
  let structuralScore = 0;
  if (hasTitle) structuralScore += 20;
  if (hasInstructions) structuralScore += 25;
  if (hasIngredients) structuralScore += 25;
  if (hasCookTime) structuralScore += 15;
  if (hasServings) structuralScore += 15;
  
  // Bonus points for detailed content
  if (instructionCount >= 5) structuralScore += 5;
  if (ingredientCount >= 5) structuralScore += 5;
  if (recipe.description) structuralScore += 3;
  if (recipe.tips) structuralScore += 2;
  
  // Determine content quality
  let contentQuality: "excellent" | "good" | "acceptable" | "poor" = "poor";
  if (structuralScore >= 90) contentQuality = "excellent";
  else if (structuralScore >= 80) contentQuality = "good";
  else if (structuralScore >= 70) contentQuality = "acceptable";
  
  return {
    hasTitle,
    hasInstructions,
    hasIngredients,
    hasCookTime,
    hasServings,
    instructionCount,
    ingredientCount,
    structuralScore: Math.min(100, structuralScore),
    contentQuality
  };
}

// Helper to compare quality levels
function isQualityAcceptable(
  actual: "excellent" | "good" | "acceptable" | "poor",
  required: "excellent" | "good" | "acceptable" | "poor"
): boolean {
  const levels = { "poor": 0, "acceptable": 1, "good": 2, "excellent": 3 };
  return levels[actual] >= levels[required];
}

// === FALLBACK DATA TEMPLATES ===
export const FALLBACK_CHAT_RESPONSE: Partial<ChatResponse> = {
  message: "I'm having trouble processing your request right now. Please try again in a moment.",
  intent: "error",
  confidence: 0,
  requiresIntentClarification: false,
  metadata: {
    model: "gpt-4o-mini",
    provider: "openai",
    requestId: "fallback",
    processingTimeMs: 0,
    fallbackUsed: true
  }
};

export const FALLBACK_RECIPE: Partial<RecipeLLM> = {
  title: "Simple Recipe",
  description: "A basic recipe when specific generation fails",
  difficulty: "Easy",
  cookTime: 30,
  servings: 4,
  ingredients: ["Basic ingredients as requested"],
  instructions: ["Follow standard cooking method for your ingredients"],
  metadata: {
    model: "gpt-4o-mini",
    provider: "openai",
    requestId: "fallback",
    processingTimeMs: 0,
    fallbackUsed: true
  }
};

export const FALLBACK_WEEKLY_PLAN: Partial<WeeklyPlanLLM> = {
  weekStartDate: new Date().toISOString(),
  totalMeals: 0,
  plannedMeals: [],
  metadata: {
    model: "gpt-4o-mini",
    provider: "openai",
    requestId: "fallback",
    processingTimeMs: 0,
    fallbackUsed: true
  }
};