/**
 * Template-Assisted Recipe Generation System
 * Reduces AI costs by using pre-built templates for common recipe patterns
 */
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface RecipeTemplate {
  name: string;
  pattern: string;
  costPerGeneration: number;
  structure: {
    baseIngredients: string[];
    cookingMethod: string;
    flavorProfile: string[];
    servingStyle: string;
  };
}

// Define common recipe templates to reduce AI generation costs
export const RECIPE_TEMPLATES: RecipeTemplate[] = [
  {
    name: "Quick Stir-Fry",
    pattern: "protein + vegetables + sauce + aromatics",
    costPerGeneration: 0.001, // Very low cost - template-based
    structure: {
      baseIngredients: ["protein", "2-3 vegetables", "cooking oil", "aromatics"],
      cookingMethod: "high-heat stir-frying",
      flavorProfile: ["umami", "fresh", "vibrant"],
      servingStyle: "over rice or noodles"
    }
  },
  {
    name: "Classic Pasta",
    pattern: "pasta + sauce base + protein + vegetables + cheese",
    costPerGeneration: 0.001,
    structure: {
      baseIngredients: ["pasta", "sauce base", "protein", "vegetables", "cheese"],
      cookingMethod: "boiling + sautéing",
      flavorProfile: ["savory", "rich", "comforting"],
      servingStyle: "hot with garnish"
    }
  },
  {
    name: "One-Pot Curry",
    pattern: "protein + vegetables + curry base + coconut/tomato + spices",
    costPerGeneration: 0.001,
    structure: {
      baseIngredients: ["protein", "vegetables", "curry base", "liquid", "spices"],
      cookingMethod: "building layers + simmering",
      flavorProfile: ["aromatic", "warming", "complex"],
      servingStyle: "with rice or bread"
    }
  },
  {
    name: "Roasted Protein & Veg",
    pattern: "main protein + seasonal vegetables + herbs + oil",
    costPerGeneration: 0.001,
    structure: {
      baseIngredients: ["main protein", "vegetables", "herbs", "oil", "seasonings"],
      cookingMethod: "oven roasting",
      flavorProfile: ["caramelized", "natural", "herbaceous"],
      servingStyle: "family-style platter"
    }
  }
];

/**
 * Analyze user input to determine if it matches a template pattern
 */
export async function analyzeForTemplate(userInput: string): Promise<{
  useTemplate: boolean;
  templateMatch?: RecipeTemplate;
  confidence: number;
  costSavings?: number;
}> {
  try {
    // Quick pattern matching for template eligibility
    const inputLower = userInput.toLowerCase();
    
    // Check for template patterns
    for (const template of RECIPE_TEMPLATES) {
      const templateKeywords = template.pattern.split(' + ').map(p => p.toLowerCase());
      const matches = templateKeywords.filter(keyword => 
        inputLower.includes(keyword) || 
        inputLower.includes(keyword.replace(/s$/, '')) // Handle plurals
      );
      
      const confidence = matches.length / templateKeywords.length;
      
      if (confidence >= 0.6) { // 60% match threshold
        console.log(`✅ Template match found: ${template.name} (${Math.round(confidence * 100)}% confidence)`);
        return {
          useTemplate: true,
          templateMatch: template,
          confidence,
          costSavings: 0.015 - template.costPerGeneration // vs full AI generation
        };
      }
    }
    
    return { useTemplate: false, confidence: 0 };
    
  } catch (error) {
    console.error('Template analysis failed:', error);
    return { useTemplate: false, confidence: 0 };
  }
}

/**
 * Generate recipe using template approach (much cheaper)
 */
export async function generateTemplateRecipe(
  template: RecipeTemplate,
  userInput: string,
  ingredients?: string[],
  servings: number = 4
): Promise<any> {
  try {
    console.log(`🎯 Generating recipe using ${template.name} template (cost-optimized)`);
    
    // Much shorter, focused prompt for template-based generation
    const templatePrompt = `Using the ${template.name} template pattern: ${template.pattern}

User wants: ${userInput}
Available ingredients: ${ingredients?.join(', ') || 'flexible'}
Servings: ${servings}

Generate a recipe following this exact structure:
- Base: ${template.structure.baseIngredients.join(', ')}
- Method: ${template.structure.cookingMethod}
- Flavors: ${template.structure.flavorProfile.join(', ')}
- Serving: ${template.structure.servingStyle}

Respond with complete recipe in JSON format with title, ingredients (with measurements), instructions, cookTime, and servings.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini", // Always use mini for templates
      messages: [
        { 
          role: "system", 
          content: "You are a recipe generator using efficient templates. Generate cookbook-quality recipes quickly and concisely." 
        },
        { role: "user", content: templatePrompt }
      ],
      temperature: 0.7,
      max_tokens: 1200 // Reduced tokens for template approach
    });

    const content = response.choices[0]?.message?.content || '';
    const recipe = JSON.parse(content);
    
    console.log(`✅ Template recipe generated: ${recipe.title}`);
    return recipe;
    
  } catch (error) {
    console.error('Template recipe generation failed:', error);
    throw new Error('Failed to generate template recipe');
  }
}

/**
 * Enhanced cost tracking for template vs full AI generation
 */
export function calculateCostSavings(templateUsed: boolean, originalTokens: number): {
  originalCost: number;
  templateCost: number;
  savings: number;
  savingsPercentage: number;
} {
  const gptMiniInputRate = 0.00015; // per 1K tokens
  const gptMiniOutputRate = 0.0006; // per 1K tokens
  
  const originalCost = (originalTokens / 1000) * (gptMiniInputRate + gptMiniOutputRate);
  const templateCost = templateUsed ? 0.001 : originalCost; // Fixed low cost for templates
  
  return {
    originalCost,
    templateCost,
    savings: originalCost - templateCost,
    savingsPercentage: ((originalCost - templateCost) / originalCost) * 100
  };
}

/**
 * Template usage analytics for optimization
 */
export class TemplateAnalytics {
  private static templateUsage = new Map<string, number>();
  private static totalSavings = 0;
  
  static recordTemplateUsage(templateName: string, savings: number) {
    const current = this.templateUsage.get(templateName) || 0;
    this.templateUsage.set(templateName, current + 1);
    this.totalSavings += savings;
    
    console.log(`📊 Template analytics: ${templateName} used ${current + 1} times, total savings: $${this.totalSavings.toFixed(4)}`);
  }
  
  static getAnalytics() {
    return {
      templateUsage: Object.fromEntries(this.templateUsage),
      totalSavings: this.totalSavings,
      averageSavingsPerRecipe: this.totalSavings / Array.from(this.templateUsage.values()).reduce((a, b) => a + b, 0) || 0
    };
  }
}