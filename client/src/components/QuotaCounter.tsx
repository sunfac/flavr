import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Crown, Cookie } from 'lucide-react';
import { getRemainingRecipes } from '@/lib/quotaManager';

interface QuotaCounterProps {
  className?: string;
  showUpgradeHint?: boolean;
}

export default function QuotaCounter({ className = '', showUpgradeHint = false }: QuotaCounterProps) {
  const [remainingRecipes, setRemainingRecipes] = useState<number>(3);

  // Check user authentication and subscription status
  const { data: userData } = useQuery({
    queryKey: ['/api/me'],
    retry: false,
  });

  const user = (userData as any)?.user;

  // Update remaining recipes count
  useEffect(() => {
    const updateCount = () => {
      setRemainingRecipes(getRemainingRecipes());
    };

    // Update immediately
    updateCount();

    // Update every second to catch changes
    const interval = setInterval(updateCount, 1000);

    return () => clearInterval(interval);
  }, []);

  // Don't show counter for authenticated Flavr+ users
  if (user?.hasFlavrPlus) {
    return null;
  }

  // Show counter for non-authenticated users
  const isAtLimit = remainingRecipes === 0;
  
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Badge 
        variant={isAtLimit ? "destructive" : "secondary"} 
        className={`${
          isAtLimit 
            ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-300 dark:border-red-700" 
            : "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-300 dark:border-blue-700"
        }`}
      >
        <Cookie className="w-3 h-3 mr-1" />
        {isAtLimit ? 'No free recipes left' : `${remainingRecipes} free recipe${remainingRecipes === 1 ? '' : 's'} left`}
      </Badge>
      
      {(showUpgradeHint && isAtLimit) && (
        <Badge variant="outline" className="border-orange-400 text-orange-600 dark:text-orange-400 text-xs">
          Sign up for more
        </Badge>
      )}
    </div>
  );
}