import { useQuery } from "@tanstack/react-query";

interface User {
  id: number;
  username: string;
  email: string;
  isPlus: boolean;
  recipesThisMonth: number;
  imagesThisMonth: number;
}

export function useFlavrGate() {
  const { data: userData } = useQuery({
    queryKey: ["/api/me"],
    retry: false,
  });

  const user = userData?.user;

  // Check if user can generate a recipe
  const canGenerateRecipe = (currentUser?: User): boolean => {
    if (!currentUser) return false;
    if (currentUser.isPlus) return true;
    return (currentUser.recipesThisMonth || 0) < 5;
  };

  // Check if user can generate an image
  const canGenerateImage = (currentUser?: User): boolean => {
    if (!currentUser) return false;
    if (currentUser.isPlus) return true;
    return (currentUser.imagesThisMonth || 0) < 5;
  };

  // Get remaining recipes for free users
  const getRemainingRecipes = (currentUser?: User): number => {
    if (!currentUser || currentUser.isPlus) return Infinity;
    return Math.max(5 - (currentUser.recipesThisMonth || 0), 0);
  };

  // Get remaining images for free users
  const getRemainingImages = (currentUser?: User): number => {
    if (!currentUser || currentUser.isPlus) return Infinity;
    return Math.max(5 - (currentUser.imagesThisMonth || 0), 0);
  };

  // Check if user needs to upgrade
  const needsUpgrade = (currentUser?: User): boolean => {
    if (!currentUser || currentUser.isPlus) return false;
    return (currentUser.recipesThisMonth || 0) >= 5;
  };

  // Get usage percentage for free users
  const getUsagePercentage = (currentUser?: User, type: "recipes" | "images" = "recipes"): number => {
    if (!currentUser || currentUser.isPlus) return 0;
    
    const used = type === "recipes" ? (currentUser.recipesThisMonth || 0) : (currentUser.imagesThisMonth || 0);
    return Math.min((used / 5) * 100, 100);
  };

  // Get usage status message
  const getUsageStatus = (currentUser?: User): string => {
    if (!currentUser) return "Please log in to use Flavr";
    if (currentUser.isPlus) return "Unlimited recipes with Flavr+";
    
    const remaining = getRemainingRecipes(currentUser);
    if (remaining === 0) return "Recipe limit reached - upgrade to continue";
    if (remaining === 1) return "1 recipe remaining this month";
    return `${remaining} recipes remaining this month`;
  };

  // Check if it's a new month (for resetting usage)
  const isNewMonth = (lastResetDate?: Date): boolean => {
    if (!lastResetDate) return true;
    
    const now = new Date();
    const lastReset = new Date(lastResetDate);
    
    return now.getMonth() !== lastReset.getMonth() || 
           now.getFullYear() !== lastReset.getFullYear();
  };

  // Get upgrade benefits
  const getUpgradeBenefits = (): string[] => {
    return [
      "Unlimited AI recipe generation",
      "HD recipe images",
      "Priority customer support",
      "Advanced recipe customization",
      "Recipe history and favorites",
      "Offline access",
    ];
  };

  // Get current plan info
  const getPlanInfo = (currentUser?: User) => {
    if (!currentUser) {
      return {
        planName: "Not logged in",
        isPlus: false,
        features: [],
        limitations: ["Please log in to use Flavr"],
      };
    }

    if (currentUser.isPlus) {
      return {
        planName: "Flavr+ Premium",
        isPlus: true,
        features: getUpgradeBenefits(),
        limitations: [],
      };
    }

    return {
      planName: "Free Plan",
      isPlus: false,
      features: [
        "5 free recipes per month",
        "Basic recipe generation",
        "All cooking modes",
        "Chef assistant chat",
      ],
      limitations: [
        `${getRemainingRecipes(currentUser)} recipes remaining`,
        "Limited image generation",
        "Basic support",
      ],
    };
  };

  return {
    user,
    canGenerateRecipe,
    canGenerateImage,
    getRemainingRecipes,
    getRemainingImages,
    needsUpgrade,
    getUsagePercentage,
    getUsageStatus,
    isNewMonth,
    getUpgradeBenefits,
    getPlanInfo,
  };
}
