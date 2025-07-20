// Advanced user fingerprinting and tracking utilities
import { storage } from "./storage";

interface UserFingerprint {
  // Device information
  screenResolution: string;
  colorDepth: number;
  deviceMemory?: number;
  hardwareConcurrency: number;
  
  // Browser information
  userAgent: string;
  language: string;
  languages: string[];
  platform: string;
  cookieEnabled: boolean;
  doNotTrack: string | null;
  
  // Timezone and location hints
  timezone: string;
  timezoneOffset: number;
  
  // Canvas fingerprint
  canvasFingerprint?: string;
  
  // WebGL fingerprint
  webglVendor?: string;
  webglRenderer?: string;
  
  // Audio fingerprint
  audioFingerprint?: string;
  
  // Font detection
  installedFonts?: string[];
  
  // Plugin detection
  plugins?: string[];
  
  // Storage availability
  localStorageAvailable: boolean;
  sessionStorageAvailable: boolean;
  indexedDBAvailable: boolean;
  
  // Connection information
  connectionType?: string;
  
  // Behavioral patterns
  touchSupport: boolean;
  
  // Unique hash
  fingerprintHash: string;
}

interface PurchaseIntent {
  supermarketPreference?: string;
  budgetRange?: string;
  shoppingFrequency?: string;
  preferredShoppingDay?: string;
  dietaryRestrictions?: string[];
  householdSize?: number;
  cookingFrequency?: string;
  mealPlanningBehavior?: string;
  ingredientPreferences?: {
    organic?: boolean;
    local?: boolean;
    brandPreference?: string;
    priceConsciousness?: string;
  };
  purchaseHistory?: {
    categories: string[];
    averageBasketSize?: number;
    luxuryItemsPercentage?: number;
  };
}

interface UserPreferences {
  cuisinePreferences: string[];
  cookingSkillLevel: string;
  timeConstraints: {
    weekday: number;
    weekend: number;
  };
  equipmentAvailable: string[];
  allergens: string[];
  dislikedIngredients: string[];
  favoriteIngredients: string[];
  mealTypes: {
    breakfast: boolean;
    lunch: boolean;
    dinner: boolean;
    snacks: boolean;
    desserts: boolean;
  };
  healthGoals?: string[];
  sustainabilityPreference?: string;
  spiceLevel?: string;
  portionSizes?: string;
}

// Generate canvas fingerprint
async function generateCanvasFingerprint(): Promise<string> {
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return 'unavailable';
    
    // Draw text with specific font and colors
    ctx.textBaseline = 'top';
    ctx.font = '14px \'Arial\'';
    ctx.fillStyle = '#f60';
    ctx.fillRect(125, 1, 62, 20);
    ctx.fillStyle = '#069';
    ctx.fillText('Flavr Canvas Fingerprint 🍽️', 2, 15);
    ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
    ctx.fillText('Flavr Canvas Fingerprint 🍽️', 4, 17);
    
    // Get canvas data
    const dataURL = canvas.toDataURL();
    
    // Hash the data for privacy
    const encoder = new TextEncoder();
    const data = encoder.encode(dataURL);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  } catch (e) {
    return 'error';
  }
}

// Generate WebGL fingerprint
function generateWebGLFingerprint(): { vendor?: string; renderer?: string } {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) return {};
    
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    if (!debugInfo) return {};
    
    return {
      vendor: gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL),
      renderer: gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)
    };
  } catch (e) {
    return {};
  }
}

// Detect installed fonts
function detectInstalledFonts(): string[] {
  const baseFonts = ['monospace', 'sans-serif', 'serif'];
  const testFonts = [
    'Arial', 'Arial Black', 'Arial Narrow', 'Book Antiqua', 'Bookman Old Style',
    'Calibri', 'Cambria', 'Candara', 'Century Gothic', 'Comic Sans MS',
    'Consolas', 'Courier', 'Courier New', 'Georgia', 'Helvetica',
    'Impact', 'Lucida Console', 'Lucida Sans Unicode', 'Microsoft Sans Serif',
    'Monaco', 'Palatino Linotype', 'Tahoma', 'Times', 'Times New Roman',
    'Trebuchet MS', 'Verdana'
  ];
  
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return [];
  
  const detectedFonts: string[] = [];
  
  for (const font of testFonts) {
    let detected = false;
    
    for (const baseFont of baseFonts) {
      ctx.font = `72px ${baseFont}`;
      const baseFontWidth = ctx.measureText('mmmmmmmmmmlli').width;
      
      ctx.font = `72px ${font}, ${baseFont}`;
      const testFontWidth = ctx.measureText('mmmmmmmmmmlli').width;
      
      if (baseFontWidth !== testFontWidth) {
        detected = true;
        break;
      }
    }
    
    if (detected) {
      detectedFonts.push(font);
    }
  }
  
  return detectedFonts;
}

// Generate comprehensive fingerprint
export async function generateUserFingerprint(): Promise<UserFingerprint> {
  const canvasFingerprint = await generateCanvasFingerprint();
  const webgl = generateWebGLFingerprint();
  const fonts = detectInstalledFonts();
  
  // Collect plugin information
  const plugins: string[] = [];
  if (navigator.plugins) {
    for (let i = 0; i < navigator.plugins.length; i++) {
      plugins.push(navigator.plugins[i].name);
    }
  }
  
  // Test storage availability
  const testStorage = (type: 'localStorage' | 'sessionStorage'): boolean => {
    try {
      const storage = window[type];
      const x = '__storage_test__';
      storage.setItem(x, x);
      storage.removeItem(x);
      return true;
    } catch (e) {
      return false;
    }
  };
  
  const fingerprintData = {
    screenResolution: `${screen.width}x${screen.height}`,
    colorDepth: screen.colorDepth,
    deviceMemory: (navigator as any).deviceMemory,
    hardwareConcurrency: navigator.hardwareConcurrency || 0,
    userAgent: navigator.userAgent,
    language: navigator.language,
    languages: navigator.languages ? [...navigator.languages] : [navigator.language],
    platform: navigator.platform,
    cookieEnabled: navigator.cookieEnabled,
    doNotTrack: navigator.doNotTrack,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    timezoneOffset: new Date().getTimezoneOffset(),
    canvasFingerprint,
    webglVendor: webgl.vendor,
    webglRenderer: webgl.renderer,
    installedFonts: fonts,
    plugins,
    localStorageAvailable: testStorage('localStorage'),
    sessionStorageAvailable: testStorage('sessionStorage'),
    indexedDBAvailable: 'indexedDB' in window,
    connectionType: (navigator as any).connection?.effectiveType,
    touchSupport: 'ontouchstart' in window,
    fingerprintHash: '' // Will be calculated below
  };
  
  // Generate unique hash from all fingerprint data
  const fingerprintString = JSON.stringify(fingerprintData);
  const encoder = new TextEncoder();
  const data = encoder.encode(fingerprintString);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  fingerprintData.fingerprintHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  return fingerprintData;
}

// Track user interaction with enhanced data
export async function trackUserInteraction(
  interactionType: string,
  data: any,
  purchaseIntent?: Partial<PurchaseIntent>,
  preferences?: Partial<UserPreferences>
) {
  try {
    const fingerprint = await generateUserFingerprint();
    const sessionId = sessionStorage.getItem('flavr_session_id') || generateSessionId();
    const userId = localStorage.getItem('flavrUserId') || 'anonymous';
    
    const interactionData = {
      userId,
      sessionId,
      interactionType,
      timestamp: new Date().toISOString(),
      fingerprint,
      data: {
        ...data,
        purchaseIntent,
        preferences,
        // Additional valuable data
        deviceCategory: getDeviceCategory(),
        browserName: getBrowserName(),
        osName: getOSName(),
        referrer: document.referrer,
        currentUrl: window.location.href,
        viewportSize: `${window.innerWidth}x${window.innerHeight}`,
        sessionDuration: getSessionDuration(),
        pageLoadTime: getPageLoadTime(),
      }
    };
    
    // Store locally for batch sending
    const storedInteractions = JSON.parse(localStorage.getItem('flavr_interactions') || '[]');
    storedInteractions.push(interactionData);
    localStorage.setItem('flavr_interactions', JSON.stringify(storedInteractions));
    
    // Send to server if batch size reached
    if (storedInteractions.length >= 5) {
      await sendInteractionsToServer(storedInteractions);
      localStorage.removeItem('flavr_interactions');
    }
  } catch (error) {
    console.error('Error tracking user interaction:', error);
  }
}

// Helper functions
function generateSessionId(): string {
  const id = crypto.randomUUID();
  sessionStorage.setItem('flavr_session_id', id);
  sessionStorage.setItem('flavr_session_start', Date.now().toString());
  return id;
}

function getDeviceCategory(): string {
  const width = window.innerWidth;
  if (width < 768) return 'mobile';
  if (width < 1024) return 'tablet';
  return 'desktop';
}

function getBrowserName(): string {
  const ua = navigator.userAgent;
  if (ua.includes('Chrome')) return 'Chrome';
  if (ua.includes('Firefox')) return 'Firefox';
  if (ua.includes('Safari')) return 'Safari';
  if (ua.includes('Edge')) return 'Edge';
  return 'Other';
}

function getOSName(): string {
  const ua = navigator.userAgent;
  if (ua.includes('Windows')) return 'Windows';
  if (ua.includes('Mac')) return 'macOS';
  if (ua.includes('Linux')) return 'Linux';
  if (ua.includes('Android')) return 'Android';
  if (ua.includes('iOS')) return 'iOS';
  return 'Other';
}

function getSessionDuration(): number {
  const start = sessionStorage.getItem('flavr_session_start');
  if (!start) return 0;
  return Date.now() - parseInt(start);
}

function getPageLoadTime(): number {
  if ('performance' in window) {
    const perf = window.performance.timing;
    return perf.loadEventEnd - perf.navigationStart;
  }
  return 0;
}

async function sendInteractionsToServer(interactions: any[]) {
  try {
    await fetch('/api/batch-interactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ interactions })
    });
  } catch (error) {
    console.error('Failed to send interactions to server:', error);
  }
}

// Extract purchase intent from quiz data
export function extractPurchaseIntent(quizData: any): PurchaseIntent {
  return {
    supermarketPreference: quizData.supermarket,
    budgetRange: quizData.budget,
    dietaryRestrictions: quizData.dietary || [],
    cookingFrequency: quizData.ambition,
    ingredientPreferences: {
      organic: quizData.budget === 'premium',
      priceConsciousness: quizData.budget === 'budget' ? 'high' : 'medium',
    },
    householdSize: parseInt(quizData.servings) || 2,
  };
}

// Extract user preferences from interaction history
export function extractUserPreferences(history: any[]): UserPreferences {
  const cuisines = new Set<string>();
  const equipment = new Set<string>();
  const allergens = new Set<string>();
  
  history.forEach(item => {
    if (item.cuisine) cuisines.add(item.cuisine);
    if (item.equipment) item.equipment.forEach((e: string) => equipment.add(e));
    if (item.dietary) item.dietary.forEach((d: string) => allergens.add(d));
  });
  
  return {
    cuisinePreferences: Array.from(cuisines),
    cookingSkillLevel: history[0]?.ambition || 'intermediate',
    timeConstraints: {
      weekday: 30,
      weekend: 60
    },
    equipmentAvailable: Array.from(equipment),
    allergens: Array.from(allergens),
    dislikedIngredients: [],
    favoriteIngredients: [],
    mealTypes: {
      breakfast: true,
      lunch: true,
      dinner: true,
      snacks: false,
      desserts: false
    }
  };
}