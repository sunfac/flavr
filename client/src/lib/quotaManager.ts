// Global quota management utility for Flavr app
// This function manages the 3-recipe free limit across ALL modes (Shopping, Fridge, Chef)
export async function checkQuotaBeforeGPT(): Promise<boolean> {
  // Step 1: Create or retrieve pseudo-user ID
  let userId = localStorage.getItem("flavrUserId");
  if (!userId) {
    userId = crypto.randomUUID();
    localStorage.setItem("flavrUserId", userId);
    console.log("[Flavr] New pseudo-user ID created:", userId);
  }

  // Step 2: Check recipe usage for this user across ALL modes
  const usageKey = `flavrUsage_${userId}`;
  const usage = parseInt(localStorage.getItem(usageKey) || "0", 10);

  if (usage >= 3) {
    // Step 3: User has hit the 3-recipe limit across all modes
    console.warn(`[Flavr] User ${userId} has hit the 3-recipe global limit. Total recipes generated: ${usage}`);
    return false; // Will trigger signup modal in component
  }

  // Step 4: Allow recipe generation and increment global usage counter
  localStorage.setItem(usageKey, (usage + 1).toString());
  console.log(`[Flavr] Global recipe #${usage + 1} generated for pseudo-user: ${userId}`);

  return true; // User is under quota, proceed to GPT
}

export function getRemainingRecipes(): number {
  const userId = localStorage.getItem("flavrUserId");
  if (!userId) return 3; // New user gets 3 free recipes
  
  const usageKey = `flavrUsage_${userId}`;
  const usage = parseInt(localStorage.getItem(usageKey) || "0", 10);
  return Math.max(0, 3 - usage);
}

export function resetQuotaForNewUser(): void {
  // Called after successful signup to give fresh start
  const userId = localStorage.getItem("flavrUserId");
  if (userId) {
    const usageKey = `flavrUsage_${userId}`;
    localStorage.removeItem(usageKey);
    console.log("[Flavr] Quota reset for authenticated user");
  }
}

export function getCurrentUsage(): number {
  const userId = localStorage.getItem("flavrUserId");
  if (!userId) return 0;
  
  const usageKey = `flavrUsage_${userId}`;
  return parseInt(localStorage.getItem(usageKey) || "0", 10);
}