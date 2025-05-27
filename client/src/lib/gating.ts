// Flavr+ Gating System - Client-side utilities
import { apiRequest } from "./queryClient";

export interface UsageStatus {
  canGenerate: boolean;
  recipesUsed: number;
  recipesLimit: number;
  hasFlavrPlus: boolean;
  isLastRecipe: boolean;
}

// Generate a persistent pseudo-user ID for free users
export function getPseudoUserId(): string {
  const storageKey = 'flavr_pseudo_id';
  
  // Try to get existing ID from localStorage
  let pseudoId = localStorage.getItem(storageKey);
  
  if (!pseudoId) {
    // Generate new pseudo ID with timestamp and random component
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    const browserHash = generateBrowserFingerprint();
    
    pseudoId = `pseudo_${timestamp}_${random}_${browserHash}`;
    localStorage.setItem(storageKey, pseudoId);
  }
  
  return pseudoId;
}

// Generate a simple browser fingerprint for anti-abuse
function generateBrowserFingerprint(): string {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  ctx?.fillText('flavr', 0, 0);
  
  const fingerprint = [
    navigator.userAgent,
    navigator.language,
    screen.width + 'x' + screen.height,
    new Date().getTimezoneOffset(),
    canvas.toDataURL()
  ].join('|');
  
  // Simple hash function
  let hash = 0;
  for (let i = 0; i < fingerprint.length; i++) {
    const char = fingerprint.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  return Math.abs(hash).toString(36).substring(0, 6);
}

// Check if user can generate recipes
export async function checkUsageLimit(isAuthenticated: boolean): Promise<UsageStatus> {
  try {
    let endpoint = '/api/usage/check';
    let body: any = {};
    
    if (!isAuthenticated) {
      body.pseudoId = getPseudoUserId();
      body.browserFingerprint = generateBrowserFingerprint();
    }
    
    const response = await apiRequest('POST', endpoint, body);
    const data = await response.json();
    
    return {
      canGenerate: data.canGenerate,
      recipesUsed: data.recipesUsed,
      recipesLimit: data.recipesLimit,
      hasFlavrPlus: data.hasFlavrPlus,
      isLastRecipe: data.recipesUsed === data.recipesLimit - 1
    };
  } catch (error) {
    console.error('Failed to check usage limit:', error);
    // Fallback: allow generation but assume free limits
    return {
      canGenerate: true,
      recipesUsed: 0,
      recipesLimit: 3,
      hasFlavrPlus: false,
      isLastRecipe: false
    };
  }
}

// Increment usage count after successful recipe generation
export async function incrementUsage(isAuthenticated: boolean): Promise<void> {
  try {
    let endpoint = '/api/usage/increment';
    let body: any = {};
    
    if (!isAuthenticated) {
      body.pseudoId = getPseudoUserId();
    }
    
    await apiRequest('POST', endpoint, body);
  } catch (error) {
    console.error('Failed to increment usage:', error);
  }
}

// Reset monthly usage (for testing/admin)
export async function resetMonthlyUsage(isAuthenticated: boolean): Promise<void> {
  try {
    let endpoint = '/api/usage/reset';
    let body: any = {};
    
    if (!isAuthenticated) {
      body.pseudoId = getPseudoUserId();
    }
    
    await apiRequest('POST', endpoint, body);
  } catch (error) {
    console.error('Failed to reset usage:', error);
  }
}

// Format usage display text
export function formatUsageText(status: UsageStatus): string {
  if (status.hasFlavrPlus) {
    return "Unlimited recipes with Flavr+";
  }
  
  const remaining = status.recipesLimit - status.recipesUsed;
  
  if (remaining === 0) {
    return "Recipe limit reached this month";
  }
  
  if (status.isLastRecipe) {
    return "This is your last free recipe this month";
  }
  
  return `You have ${remaining}/${status.recipesLimit} free recipes left`;
}