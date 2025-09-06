/**
 * Shared Variety Tracking System
 * Prevents repetition across all cooking modes (Weekly Planner, Chat Mode, Chef Assist, Inspire Me)
 */

// Cross-mode variety tracking storage
const globalTitleWordTracker = new Map<string, string[]>(); // clientId -> recent words across all modes
const MAX_TRACKED_WORDS = 20; // Increased for cross-mode tracking

// Mode-specific tracking for better insights
const modeSpecificTracker = new Map<string, Map<string, string[]>>(); // mode -> clientId -> words

export interface VarietyTrackingOptions {
  clientId: string;
  mode: 'weekly-planner' | 'chat-mode' | 'chef-assist' | 'inspire-me';
  title: string;
}

/**
 * Track words and phrases from generated titles across all modes
 */
export function trackTitleWords(options: VarietyTrackingOptions): void {
  const { clientId, mode, title } = options;
  
  if (!clientId || !title) return;
  
  const words = extractDescriptiveWords(title);
  const phrases = extractCulinaryPhrases(title);
  const allTerms = [...words, ...phrases];
  
  // Track globally across all modes
  if (!globalTitleWordTracker.has(clientId)) {
    globalTitleWordTracker.set(clientId, []);
  }
  
  const globalUserWords = globalTitleWordTracker.get(clientId)!;
  globalUserWords.push(...allTerms);
  
  // Keep only the most recent words globally
  if (globalUserWords.length > MAX_TRACKED_WORDS) {
    globalUserWords.splice(0, globalUserWords.length - MAX_TRACKED_WORDS);
  }
  
  // Track by mode for analytics
  if (!modeSpecificTracker.has(mode)) {
    modeSpecificTracker.set(mode, new Map());
  }
  
  const modeTracker = modeSpecificTracker.get(mode)!;
  if (!modeTracker.has(clientId)) {
    modeTracker.set(clientId, []);
  }
  
  const modeUserWords = modeTracker.get(clientId)!;
  modeUserWords.push(...allTerms);
  
  // Keep mode-specific history smaller
  if (modeUserWords.length > 10) {
    modeUserWords.splice(0, modeUserWords.length - 10);
  }
}

/**
 * Get words to avoid for better variety across all modes
 */
export function getAvoidWords(clientId: string): string[] {
  const recentWords = globalTitleWordTracker.get(clientId) || [];
  const wordCounts = new Map<string, number>();
  
  // Count frequency of recent words across all modes
  recentWords.forEach(word => {
    wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
  });
  
  // Return words that appear 2+ times recently across any mode
  return Array.from(wordCounts.entries())
    .filter(([word, count]) => count >= 2)
    .map(([word]) => word);
}

/**
 * Get mode-specific avoid words for advanced variety
 */
export function getModeSpecificAvoidWords(clientId: string, mode: string): string[] {
  const modeTracker = modeSpecificTracker.get(mode);
  if (!modeTracker) return [];
  
  const recentWords = modeTracker.get(clientId) || [];
  const wordCounts = new Map<string, number>();
  
  recentWords.forEach(word => {
    wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
  });
  
  return Array.from(wordCounts.entries())
    .filter(([word, count]) => count >= 2)
    .map(([word]) => word);
}

/**
 * Generate variety notes for prompts
 */
export function generateVarietyNotes(clientId: string, mode?: string): string {
  const globalAvoid = getAvoidWords(clientId);
  const modeAvoid = mode ? getModeSpecificAvoidWords(clientId, mode) : [];
  
  const allAvoid = Array.from(new Set([...globalAvoid, ...modeAvoid]));
  
  if (allAvoid.length === 0) return '';
  
  return `\nVARIETY NOTES: AVOID these overused dishes/words from recent generations: ${allAvoid.join(', ')}. Create fresh alternatives with different cuisines, proteins, and techniques.`;
}

/**
 * Extract descriptive words from titles
 */
function extractDescriptiveWords(title: string): string[] {
  const commonWords = new Set(['with', 'and', 'the', 'a', 'an', 'in', 'on', 'for', 'to', 'of', 'by', 'or']);
  const titleLower = title.toLowerCase();
  
  return titleLower.split(/[\s-]+/)
    .filter(word => word.length > 2 && !commonWords.has(word))
    .filter(word => /^[a-z]+$/.test(word)); // Only alphabetic words
}

/**
 * Extract common culinary phrases that get overused
 */
function extractCulinaryPhrases(title: string): string[] {
  const titleLower = title.toLowerCase();
  const phrases: string[] = [];
  
  // Overused adjectives
  if (titleLower.includes('herb-infused') || titleLower.includes('herb infused')) phrases.push('herb-infused');
  if (titleLower.includes('bliss')) phrases.push('bliss');
  if (titleLower.includes('golden')) phrases.push('golden');
  if (titleLower.includes('crispy')) phrases.push('crispy');
  if (titleLower.includes('rustic')) phrases.push('rustic');
  if (titleLower.includes('silky')) phrases.push('silky');
  if (titleLower.includes('heavenly')) phrases.push('heavenly');
  if (titleLower.includes('divine')) phrases.push('divine');
  if (titleLower.includes('perfect')) phrases.push('perfect');
  if (titleLower.includes('ultimate')) phrases.push('ultimate');
  if (titleLower.includes('artisan')) phrases.push('artisan');
  if (titleLower.includes('gourmet')) phrases.push('gourmet');
  if (titleLower.includes('sublime')) phrases.push('sublime');
  
  // Classic dishes that are over-suggested
  if (titleLower.includes('osso buco')) phrases.push('osso-buco');
  if (titleLower.includes('coq au vin')) phrases.push('coq-au-vin');
  if (titleLower.includes('wellington')) phrases.push('wellington');
  if (titleLower.includes('beef wellington')) phrases.push('beef-wellington');
  if (titleLower.includes('rogan josh')) phrases.push('rogan-josh');
  if (titleLower.includes('bourguignon')) phrases.push('bourguignon');
  if (titleLower.includes('cassoulet')) phrases.push('cassoulet');
  if (titleLower.includes('bouillabaisse')) phrases.push('bouillabaisse');
  if (titleLower.includes('tagine')) phrases.push('tagine');
  if (titleLower.includes('carbonara')) phrases.push('carbonara');
  if (titleLower.includes('risotto')) phrases.push('risotto');
  if (titleLower.includes('paella')) phrases.push('paella');
  if (titleLower.includes('ratatouille')) phrases.push('ratatouille');
  if (titleLower.includes('tikka masala')) phrases.push('tikka-masala');
  
  return phrases;
}

/**
 * Get variety analytics for debugging
 */
export function getVarietyAnalytics(clientId: string) {
  const globalWords = globalTitleWordTracker.get(clientId) || [];
  const modeBreakdown: Record<string, string[]> = {};
  
  Array.from(modeSpecificTracker.entries()).forEach(([mode, tracker]) => {
    modeBreakdown[mode] = tracker.get(clientId) || [];
  });
  
  return {
    totalTrackedWords: globalWords.length,
    recentWords: globalWords.slice(-10),
    modeBreakdown,
    avoidWords: getAvoidWords(clientId)
  };
}