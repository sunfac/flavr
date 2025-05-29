import { Badge } from "@/components/ui/badge";
import { Crown, Zap } from "@/lib/icons";
import { UsageStatus } from "@/lib/gating";

interface UsageCounterProps {
  status: UsageStatus;
  className?: string;
}

export default function UsageCounter({ status, className = "" }: UsageCounterProps) {
  if (status.hasFlavrPlus) {
    return (
      <Badge className={`bg-gradient-to-r from-orange-500 to-orange-600 text-white ${className}`}>
        <Crown className="w-3 h-3 mr-1" />
        Flavr+ Unlimited
      </Badge>
    );
  }

  const remaining = status.recipesLimit - status.recipesUsed;

  if (remaining === 0) {
    return (
      <Badge variant="destructive" className={`${className}`}>
        <Zap className="w-3 h-3 mr-1" />
        Limit Reached
      </Badge>
    );
  }

  if (status.isLastRecipe) {
    return (
      <Badge variant="outline" className={`border-orange-400 text-orange-600 ${className}`}>
        <Zap className="w-3 h-3 mr-1" />
        Last Free Recipe
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className={`border-slate-300 text-slate-600 ${className}`}>
      {remaining}/{status.recipesLimit} Free Recipes Left
    </Badge>
  );
}