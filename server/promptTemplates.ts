import type { 
  AIModel, 
  ChatMessage, 
  WeeklyPlanPreferences, 
  AIRequestOptions 
} from "@shared/aiSchemas";

// === PROMPT TEMPLATE SYSTEM ===
export interface PromptContext {
  userId?: number;
  userPreferences?: Record<string, any>;
  conversationHistory?: ChatMessage[];
  mode?: string;
  variant?: string;
  modelOptimization?: {
    model: AIModel;
    maxTokens?: number;
    reduceVerbosity?: boolean;
  };
}

export interface CompiledPrompt {
  systemPrompt: string;
  userPrompt: string;
  estimatedTokens: number;
  optimizations: string[];
  variant: string;
}

export interface PromptTemplate {
  id: string;
  variants: Record<string, {
    system: string;
    user: string;
    modelOverrides?: Partial<Record<AIModel, {
      system?: string;
      user?: string;
      maxTokens?: number;
    }>>;
  }>;
  defaultVariant: string;
  tokenOptimizations: {
    [K in AIModel]?: {
      removeExamples?: boolean;
      shortenInstructions?: boolean;
      compactFormat?: boolean;
      maxContextTokens?: number;
    };
  };
}

// === TOKEN OPTIMIZATION UTILITIES ===
class TokenOptimizer {
  private static readonly APPROX_TOKENS_PER_CHAR = 0.25; // Conservative estimate

  static estimateTokens(text: string): number {
    return Math.ceil(text.length * this.APPROX_TOKENS_PER_CHAR);
  }

  static optimizeForModel(prompt: string, model: AIModel, maxTokens?: number): {
    optimized: string;
    savings: number;
    optimizations: string[];
  } {
    let optimized = prompt;
    const original = prompt;
    const optimizations: string[] = [];

    // Model-specific optimizations
    switch (model) {
      case "gpt-4o-mini":
        // Aggressive optimization for cost efficiency
        optimized = this.removeRedundancy(optimized);
        optimizations.push("redundancy_removal");
        
        optimized = this.compactInstructions(optimized);
        optimizations.push("instruction_compacting");
        
        optimized = this.shortenExamples(optimized);
        optimizations.push("example_shortening");
        break;

      case "gpt-4o":
        // Moderate optimization maintaining quality
        optimized = this.removeRedundancy(optimized);
        optimizations.push("redundancy_removal");
        break;

      case "gpt-5":
        // Minimal optimization, preserve all context
        // GPT-5 benefits from detailed context
        break;

      case "gemini-1.5-flash":
        // Optimize for Gemini's preferences
        optimized = this.optimizeForGemini(optimized);
        optimizations.push("gemini_optimization");
        break;
    }

    // Apply token limit if specified
    if (maxTokens && this.estimateTokens(optimized) > maxTokens) {
      optimized = this.truncateToTokenLimit(optimized, maxTokens);
      optimizations.push("token_truncation");
    }

    const savings = this.estimateTokens(original) - this.estimateTokens(optimized);
    return { optimized, savings, optimizations };
  }

  private static removeRedundancy(text: string): string {
    return text
      .replace(/\n\s*\n\s*\n/g, '\n\n') // Remove excessive line breaks
      .replace(/\s{3,}/g, ' ') // Remove excessive spaces
      .replace(/(\w+)\s+\1(\s)/g, '$1$2') // Remove word repetition
      .trim();
  }

  private static compactInstructions(text: string): string {
    return text
      .replace(/Please ensure that you/g, 'Ensure')
      .replace(/It is important that/g, 'Must')
      .replace(/Make sure to/g, 'Must')
      .replace(/You should/g, 'Should')
      .replace(/Be sure to/g, 'Must')
      .replace(/Remember to/g, 'Must')
      .replace(/Don't forget to/g, 'Must');
  }

  private static shortenExamples(text: string): string {
    // Reduce example length while preserving key information
    return text.replace(
      /Example:\s*(.{200,}?)(?=\n|$)/g,
      (match, content) => {
        const shortened = content.substring(0, 150) + '...';
        return `Example: ${shortened}`;
      }
    );
  }

  private static optimizeForGemini(text: string): string {
    // Gemini prefers structured, clear instructions
    return text
      .replace(/###\s*/g, '**') // Convert headers to bold
      .replace(/\*\*(.*?)\*\*/g, '$1:') // Simplify emphasis
      .replace(/- /g, '• '); // Use bullet points
  }

  private static truncateToTokenLimit(text: string, maxTokens: number): string {
    const maxChars = Math.floor(maxTokens / this.APPROX_TOKENS_PER_CHAR);
    if (text.length <= maxChars) return text;
    
    // Truncate intelligently at sentence boundaries
    const truncated = text.substring(0, maxChars);
    const lastSentence = truncated.lastIndexOf('.');
    
    if (lastSentence > maxChars * 0.8) {
      return text.substring(0, lastSentence + 1);
    }
    
    return truncated + '...';
  }
}

// === PROMPT TEMPLATE REGISTRY ===
export class PromptTemplates {
  private static templates: Map<string, PromptTemplate> = new Map();

  static registerTemplate(template: PromptTemplate): void {
    this.templates.set(template.id, template);
  }

  static compile(
    templateId: string, 
    context: PromptContext,
    data: Record<string, any> = {}
  ): CompiledPrompt {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    const variant = context.variant || template.defaultVariant;
    const variantData = template.variants[variant];
    
    if (!variantData) {
      throw new Error(`Variant not found: ${variant} for template ${templateId}`);
    }

    let systemPrompt = variantData.system;
    let userPrompt = variantData.user;

    // Apply model-specific overrides
    if (context.modelOptimization?.model && variantData.modelOverrides?.[context.modelOptimization.model]) {
      const override = variantData.modelOverrides[context.modelOptimization.model];
      systemPrompt = override.system || systemPrompt;
      userPrompt = override.user || userPrompt;
    }

    // Interpolate data into prompts
    systemPrompt = this.interpolate(systemPrompt, { ...context, ...data });
    userPrompt = this.interpolate(userPrompt, { ...context, ...data });

    // Apply token optimizations
    let optimizations: string[] = [];
    if (context.modelOptimization?.model) {
      const model = context.modelOptimization.model;
      const maxTokens = context.modelOptimization.maxTokens;

      const systemOpt = TokenOptimizer.optimizeForModel(systemPrompt, model, maxTokens ? maxTokens * 0.7 : undefined);
      const userOpt = TokenOptimizer.optimizeForModel(userPrompt, model, maxTokens ? maxTokens * 0.3 : undefined);

      systemPrompt = systemOpt.optimized;
      userPrompt = userOpt.optimized;
      optimizations = [...systemOpt.optimizations, ...userOpt.optimizations];
    }

    return {
      systemPrompt,
      userPrompt,
      estimatedTokens: TokenOptimizer.estimateTokens(systemPrompt + userPrompt),
      optimizations,
      variant
    };
  }

  private static interpolate(template: string, data: Record<string, any>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return data[key] !== undefined ? String(data[key]) : match;
    });
  }
}

// === CHAT TEMPLATES ===
const CHAT_CONVERSATION_TEMPLATE: PromptTemplate = {
  id: "chat.conversation",
  defaultVariant: "friendly_chef",
  variants: {
    friendly_chef: {
      system: `You are Zest, Flavr's friendly AI cooking assistant. You're warm, encouraging, and passionate about helping people cook amazing food.

CORE BEHAVIOR:
- Be conversational and supportive, like a knowledgeable friend
- Focus on practical cooking advice and recipe help
- Remember user preferences from conversation history: {{conversationHistory}}
- If asked about recipes, suggest using Flavr's recipe generation modes
- Keep responses concise but helpful (2-3 sentences ideal)

RECIPE INTENT DETECTION:
- If user asks for a specific recipe or cooking help, offer to create a full Flavr recipe
- Suggest relevant cooking techniques and ingredient substitutions
- Always be encouraging about their cooking journey

CONVERSATION STYLE:
- Use cooking emojis sparingly and naturally
- Ask follow-up questions to understand their needs better
- Share quick tips and techniques when relevant`,
      
      user: `{{userMessage}}

{{#conversationHistory}}
Previous conversation context:
{{conversationHistory}}
{{/conversationHistory}}

{{#userPreferences}}
User preferences: {{userPreferences}}
{{/userPreferences}}`,

      modelOverrides: {
        "gpt-4o-mini": {
          system: `You are Zest, Flavr's AI cooking assistant. Be helpful and concise.

BEHAVIOR:
- Give practical cooking advice
- Remember user preferences: {{conversationHistory}}
- Suggest Flavr recipe generation for recipe requests
- Keep responses under 2 sentences

STYLE: Friendly, encouraging, brief.`,
        }
      }
    },

    technical_advisor: {
      system: `You are a technical cooking advisor focused on precise culinary guidance.

APPROACH:
- Provide specific techniques and scientific explanations
- Focus on "why" behind cooking methods
- Reference temperatures, timings, and ratios when relevant
- Maintain professional but approachable tone`,
      
      user: `Technical cooking question: {{userMessage}}`
    }
  },

  tokenOptimizations: {
    "gpt-4o-mini": {
      removeExamples: true,
      shortenInstructions: true,
      maxContextTokens: 500
    },
    "gemini-1.5-flash": {
      compactFormat: true,
      maxContextTokens: 800
    }
  }
};

// === RECIPE GENERATION TEMPLATES ===
const RECIPE_GENERATE_TEMPLATE: PromptTemplate = {
  id: "recipe.generate",
  defaultVariant: "michelin_quality",
  variants: {
    michelin_quality: {
      system: `You are a Michelin-starred executive chef creating restaurant-quality recipes for passionate home cooks.

CULINARY PHILOSOPHY:
- Maximum flavor through scientific precision and technique
- Layer flavors using Maillard reaction, umami depth, acid balance
- Professional techniques adapted for home kitchens
- Focus on ingredient synergy and compound interactions

OUTPUT FORMAT (JSON):
{
  "title": "Precise, appetizing recipe name",
  "description": "Brief description highlighting key flavors",
  "cuisine": "Primary cuisine style",
  "difficulty": "Easy|Medium|Hard",
  "cookTime": 45,
  "prepTime": 15,
  "servings": 4,
  "ingredients": ["Precise quantities with quality notes"],
  "instructions": [
    {
      "step": 1,
      "instruction": "Detailed technique with timing",
      "timing": "5 minutes",
      "technique": "searing"
    }
  ],
  "tips": "Professional secrets for success",
  "equipment": ["Essential tools"],
  "dietary": ["vegan", "gluten-free"]
}

QUALITY STANDARDS:
- Use specific techniques (not just "cook until done")
- Include timing and temperature guidance
- Explain the "why" behind key steps
- Optimize for maximum flavor impact`,

      user: `Create a {{difficulty}} {{cuisine}} recipe for {{servings}} people.

REQUEST: {{recipeRequest}}

{{#dietaryRestrictions}}
DIETARY REQUIREMENTS: {{dietaryRestrictions}}
{{/dietaryRestrictions}}

{{#timeConstraint}}
TIME CONSTRAINT: Maximum {{timeConstraint}} minutes
{{/timeConstraint}}

{{#userPreferences}}
USER PREFERENCES: {{userPreferences}}
{{/userPreferences}}`,

      modelOverrides: {
        "gpt-4o-mini": {
          system: `You are a professional chef. Create restaurant-quality recipes for home cooking.

OUTPUT JSON:
{
  "title": "Recipe name",
  "difficulty": "Easy|Medium|Hard", 
  "cookTime": 30,
  "servings": 4,
  "ingredients": ["Precise quantities"],
  "instructions": ["Step-by-step with timing"],
  "tips": "Key success factors"
}

FOCUS: Maximum flavor, clear techniques, specific timing.`,
        }
      }
    },

    quick_weeknight: {
      system: `Create quick, practical recipes for busy weeknight cooking.

PRIORITIES:
- 30 minutes or less total time
- Minimal prep and cleanup
- Accessible ingredients
- Family-friendly flavors
- One-pan/sheet pan preferred

STYLE: Efficient, clear, encouraging`,

      user: `Quick weeknight recipe request: {{recipeRequest}}
Time limit: {{timeConstraint}} minutes
Serves: {{servings}}`
    }
  },

  tokenOptimizations: {
    "gpt-4o-mini": {
      removeExamples: true,
      shortenInstructions: true,
      compactFormat: true
    }
  }
};

// === WEEKLY PLANNER TEMPLATES ===
const WEEKLY_PLANNER_TEMPLATE: PromptTemplate = {
  id: "planner.weeklyTitles",
  defaultVariant: "balanced_planning",
  variants: {
    balanced_planning: {
      system: `You are a meal planning expert creating diverse, practical weekly menu suggestions.

PLANNING PRINCIPLES:
- Ensure cuisine variety across the week
- Balance cooking complexity (mix easy and ambitious)
- Consider prep efficiency and ingredient overlap
- Account for household size and dietary needs
- Avoid repetitive proteins or cooking methods

OUTPUT FORMAT (JSON):
{
  "plannedMeals": [
    {
      "day": "monday",
      "recipeTitle": "Specific, appetizing recipe name",
      "cuisine": "Italian",
      "estimatedTime": 35,
      "difficulty": "Medium",
      "description": "Brief flavor description"
    }
  ],
  "varietyScore": 85,
  "balanceNotes": "Explanation of weekly balance"
}`,

      user: `Create {{totalMeals}} meal suggestions for the week.

HOUSEHOLD: {{adults}} adults, {{kids}} kids
TIME COMFORT: Weeknight max {{weeknightTime}}min, Weekend max {{weekendTime}}min
AMBITION LEVEL: {{ambitionLevel}}
DIETARY NEEDS: {{dietaryNeeds}}

{{#cuisinePreferences}}
CUISINE PREFERENCES: {{cuisinePreferences}}
{{/cuisinePreferences}}

{{#avoidSimilarTo}}
AVOID SIMILAR TO: {{avoidSimilarTo}}
{{/avoidSimilarTo}}

Focus on variety, balance, and practical execution.`,

      modelOverrides: {
        "gpt-4o-mini": {
          system: `Meal planning expert. Create diverse weekly menus.

OUTPUT JSON:
{
  "plannedMeals": [
    {
      "day": "monday", 
      "recipeTitle": "Recipe name",
      "cuisine": "Type",
      "estimatedTime": 30,
      "difficulty": "Easy|Medium|Hard"
    }
  ]
}

FOCUS: Variety, balance, time constraints.`,
        }
      }
    }
  },

  tokenOptimizations: {
    "gpt-4o-mini": {
      removeExamples: true,
      compactFormat: true,
      maxContextTokens: 300
    }
  }
};

// === IMAGE-TO-RECIPE TEMPLATES ===
const IMAGE_TO_RECIPE_TEMPLATE: PromptTemplate = {
  id: "image.photoToRecipe",
  defaultVariant: "ingredient_detection",
  variants: {
    ingredient_detection: {
      system: `You are an expert at analyzing food photos to identify ingredients and suggest recipes.

ANALYSIS APPROACH:
- Identify visible ingredients with confidence levels
- Assess freshness and quality from visual cues
- Consider kitchen context and equipment visible
- Suggest recipes based on detected ingredients
- Account for missing common ingredients

OUTPUT FORMAT (JSON):
{
  "detectedIngredients": [
    {
      "name": "ingredient name",
      "confidence": 0.95,
      "quantity": "estimated amount",
      "freshness": "fresh|good|wilting"
    }
  ],
  "suggestedRecipes": [
    {
      "title": "Recipe using detected ingredients",
      "confidence": 0.8,
      "missingIngredients": ["pantry staples needed"],
      "estimatedTime": 30
    }
  ],
  "imageAnalysis": {
    "imageQuality": "excellent|good|fair|poor",
    "confidence": 0.9
  }
}`,

      user: `Analyze this food/ingredient photo and suggest recipes.

{{#userPreferences}}
User dietary preferences: {{userPreferences}}
{{/userPreferences}}

Focus on practical recipes using the visible ingredients.`
    }
  },

  tokenOptimizations: {
    "gpt-4o-mini": {
      compactFormat: true,
      maxContextTokens: 200
    }
  }
};

// === INITIALIZE TEMPLATES ===
export function initializePromptTemplates(): void {
  PromptTemplates.registerTemplate(CHAT_CONVERSATION_TEMPLATE);
  PromptTemplates.registerTemplate(RECIPE_GENERATE_TEMPLATE);
  PromptTemplates.registerTemplate(WEEKLY_PLANNER_TEMPLATE);
  PromptTemplates.registerTemplate(IMAGE_TO_RECIPE_TEMPLATE);
}

// === CONVENIENCE FUNCTIONS ===
export function compileChatPrompt(
  userMessage: string,
  options: {
    conversationHistory?: ChatMessage[];
    userPreferences?: Record<string, any>;
    variant?: string;
    model?: AIModel;
    maxTokens?: number;
  } = {}
): CompiledPrompt {
  return PromptTemplates.compile("chat.conversation", {
    variant: options.variant,
    conversationHistory: options.conversationHistory,
    userPreferences: options.userPreferences,
    modelOptimization: options.model ? {
      model: options.model,
      maxTokens: options.maxTokens
    } : undefined
  }, {
    userMessage
  });
}

export function compileRecipePrompt(
  recipeRequest: string,
  options: {
    difficulty?: string;
    cuisine?: string;
    servings?: number;
    timeConstraint?: number;
    dietaryRestrictions?: string[];
    userPreferences?: Record<string, any>;
    variant?: string;
    model?: AIModel;
    maxTokens?: number;
  } = {}
): CompiledPrompt {
  return PromptTemplates.compile("recipe.generate", {
    variant: options.variant,
    userPreferences: options.userPreferences,
    modelOptimization: options.model ? {
      model: options.model,
      maxTokens: options.maxTokens
    } : undefined
  }, {
    recipeRequest,
    difficulty: options.difficulty || "Medium",
    cuisine: options.cuisine || "International",
    servings: options.servings || 4,
    timeConstraint: options.timeConstraint,
    dietaryRestrictions: options.dietaryRestrictions?.join(", ")
  });
}

export function compileWeeklyPlannerPrompt(
  preferences: WeeklyPlanPreferences,
  options: {
    totalMeals: number;
    variant?: string;
    model?: AIModel;
    maxTokens?: number;
  }
): CompiledPrompt {
  return PromptTemplates.compile("planner.weeklyTitles", {
    variant: options.variant,
    modelOptimization: options.model ? {
      model: options.model,
      maxTokens: options.maxTokens
    } : undefined
  }, {
    totalMeals: options.totalMeals,
    adults: preferences.householdSize.adults,
    kids: preferences.householdSize.kids,
    weeknightTime: preferences.timeComfort.weeknight,
    weekendTime: preferences.timeComfort.weekend,
    ambitionLevel: preferences.ambitionLevel,
    dietaryNeeds: preferences.dietaryNeeds.join(", "),
    cuisinePreferences: preferences.cuisinePreferences?.join(", "),
    avoidSimilarTo: preferences.avoidSimilarTo
  });
}

export function compileImageToRecipePrompt(
  options: {
    userPreferences?: Record<string, any>;
    variant?: string;
    model?: AIModel;
    maxTokens?: number;
  } = {}
): CompiledPrompt {
  return PromptTemplates.compile("image.photoToRecipe", {
    variant: options.variant,
    userPreferences: options.userPreferences,
    modelOptimization: options.model ? {
      model: options.model,
      maxTokens: options.maxTokens
    } : undefined
  }, {});
}

// Auto-initialize templates when module loads
initializePromptTemplates();