import { storage } from "./storage";
import type { InsertDeveloperLog } from "@shared/schema";

// GPT-3.5 Turbo pricing (as of 2024)
const GPT35_TURBO_INPUT_COST_PER_1K = 0.0005;  // $0.0005 per 1K input tokens
const GPT35_TURBO_OUTPUT_COST_PER_1K = 0.0015; // $0.0015 per 1K output tokens

// Stable Diffusion via Replicate pricing (typical API costs)
const STABLE_DIFFUSION_COST_PER_IMAGE = 0.0023; // $0.0023 per image generation

// Simple token estimation (rough approximation)
function estimateTokens(text: string): number {
  // Rough estimation: 1 token ≈ 4 characters for English text
  return Math.ceil(text.length / 4);
}

// Calculate cost based on token usage
function calculateCost(inputTokens: number, outputTokens: number): string {
  const inputCost = (inputTokens / 1000) * GPT35_TURBO_INPUT_COST_PER_1K;
  const outputCost = (outputTokens / 1000) * GPT35_TURBO_OUTPUT_COST_PER_1K;
  const totalCost = inputCost + outputCost;
  return `$${totalCost.toFixed(6)}`;
}

// Calculate image generation cost using Stable Diffusion pricing
function calculateImageCost(imageCount: number = 1): string {
  const totalCost = imageCount * STABLE_DIFFUSION_COST_PER_IMAGE;
  return `$${totalCost.toFixed(4)}`;
}

// Compare expected vs actual output values
function analyzeOutputMatch(expected: Record<string, any>, actual: Record<string, any>): {
  matches: boolean;
  discrepancies: string[];
} {
  const discrepancies: string[] = [];
  
  // Check key fields that should match quiz inputs
  const fieldsToCheck = ['servings', 'cookTime', 'difficulty', 'budget', 'cuisine'];
  
  for (const field of fieldsToCheck) {
    if (expected[field] && actual[field]) {
      if (String(expected[field]).toLowerCase() !== String(actual[field]).toLowerCase()) {
        discrepancies.push(`${field}: expected "${expected[field]}", got "${actual[field]}"`);
      }
    }
  }
  
  return {
    matches: discrepancies.length === 0,
    discrepancies
  };
}

export async function logGPTInteraction(
  userId: number,
  mode: string,
  quizInputs: Record<string, any>,
  promptSent: string,
  gptResponse: string,
  expectedOutput: Record<string, any>,
  actualOutput: Record<string, any>,
  imagePrompt?: string,
  imageGenerated?: boolean,
  imageUrl?: string,
  imageCost?: string
): Promise<void> {
  try {
    const inputTokens = estimateTokens(promptSent);
    const outputTokens = estimateTokens(gptResponse);
    const estimatedCost = calculateCost(inputTokens, outputTokens);
    
    const analysis = analyzeOutputMatch(expectedOutput, actualOutput);
    
    const logEntry: InsertDeveloperLog = {
      userId,
      mode,
      quizInputs,
      promptSent,
      gptResponse,
      expectedOutput,
      actualOutput,
      inputTokens,
      outputTokens,
      estimatedCost,
      matchStatus: analysis.matches,
      discrepancies: analysis.discrepancies.length > 0 ? analysis.discrepancies : null,
      imagePrompt,
      imageGenerated: imageGenerated || false,
      imageUrl,
      imageCost,
    };
    
    await storage.createDeveloperLog(logEntry);
    
    console.log(`🔍 DEVELOPER LOG - Mode: ${mode}, Cost: ${estimatedCost}, Match: ${analysis.matches ? '✅' : '❌'}`);
    if (!analysis.matches) {
      console.log(`   Discrepancies: ${analysis.discrepancies.join(', ')}`);
    }
  } catch (error) {
    console.error('Failed to log GPT interaction:', error);
  }
}