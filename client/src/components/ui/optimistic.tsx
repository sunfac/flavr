import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, Bookmark, Share2, Check, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Optimistic UI hook for generic actions
export function useOptimisticAction<T>({
  action,
  optimisticUpdate,
  onSuccess,
  onError,
  rollbackDelay = 3000
}: {
  action: (data: T) => Promise<any>;
  optimisticUpdate: () => void;
  onSuccess?: (data: any) => void;
  onError?: (error: any) => void;
  rollbackDelay?: number;
}) {
  const [isOptimistic, setIsOptimistic] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  
  const mutation = useMutation({
    mutationFn: action,
    onMutate: () => {
      setIsOptimistic(true);
      optimisticUpdate();
    },
    onSuccess: (data) => {
      setIsOptimistic(false);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
      onSuccess?.(data);
    },
    onError: (error) => {
      setIsOptimistic(false);
      // Rollback optimistic update
      setTimeout(() => {
        // This should trigger a refetch to get the real state
        onError?.(error);
      }, rollbackDelay);
    }
  });

  return {
    mutate: mutation.mutate,
    isLoading: mutation.isPending,
    isOptimistic,
    showSuccess,
    error: mutation.error
  };
}

// Optimistic Save Button
interface OptimisticSaveButtonProps {
  recipeId: string;
  initialSaved?: boolean;
  onSave?: (saved: boolean) => void;
  className?: string;
  size?: "sm" | "default" | "lg";
}

export function OptimisticSaveButton({
  recipeId,
  initialSaved = false,
  onSave,
  className,
  size = "default"
}: OptimisticSaveButtonProps) {
  const [isSaved, setIsSaved] = useState(initialSaved);
  const { toast } = useToast();

  const { mutate, isOptimistic, showSuccess, error } = useOptimisticAction({
    action: async (saved: boolean) => {
      const response = await apiRequest(
        saved ? "POST" : "DELETE",
        `/api/recipes/${recipeId}/save`
      );
      return response.json();
    },
    optimisticUpdate: () => {
      setIsSaved(!isSaved);
      toast({
        title: !isSaved ? "Recipe saved!" : "Recipe unsaved",
        description: !isSaved ? "Added to your collection" : "Removed from collection",
        duration: 2000
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/recipes"] });
      onSave?.(!isSaved);
    },
    onError: () => {
      // Rollback
      setIsSaved(isSaved);
      toast({
        title: "Action failed",
        description: "Please try again",
        variant: "destructive"
      });
    }
  });

  const handleClick = () => {
    mutate(isSaved);
  };

  return (
    <Button
      onClick={handleClick}
      variant={isSaved ? "default" : "outline"}
      size={size}
      className={cn(
        "relative overflow-hidden transition-all duration-200",
        isSaved && "bg-primary text-primary-foreground",
        isOptimistic && "animate-pulse",
        className
      )}
      disabled={isOptimistic}
    >
      <AnimatePresence mode="wait">
        {showSuccess ? (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="flex items-center gap-2"
          >
            <Check className="w-4 h-4" />
            {size !== "sm" && "Saved!"}
          </motion.div>
        ) : (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="flex items-center gap-2"
          >
            <Bookmark className={cn("w-4 h-4", isSaved && "fill-current")} />
            {size !== "sm" && (isSaved ? "Saved" : "Save")}
          </motion.div>
        )}
      </AnimatePresence>
      
      {isOptimistic && (
        <motion.div
          initial={{ x: "-100%" }}
          animate={{ x: "100%" }}
          transition={{ repeat: Infinity, duration: 1 }}
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
        />
      )}
    </Button>
  );
}

// Optimistic Like Button
interface OptimisticLikeButtonProps {
  recipeId: string;
  initialLiked?: boolean;
  initialCount?: number;
  onLike?: (liked: boolean, count: number) => void;
  className?: string;
  showCount?: boolean;
}

export function OptimisticLikeButton({
  recipeId,
  initialLiked = false,
  initialCount = 0,
  onLike,
  className,
  showCount = true
}: OptimisticLikeButtonProps) {
  const [isLiked, setIsLiked] = useState(initialLiked);
  const [likeCount, setLikeCount] = useState(initialCount);
  const { toast } = useToast();

  const { mutate, isOptimistic, showSuccess } = useOptimisticAction({
    action: async (liked: boolean) => {
      const response = await apiRequest(
        liked ? "POST" : "DELETE",
        `/api/recipes/${recipeId}/like`
      );
      return response.json();
    },
    optimisticUpdate: () => {
      const newLiked = !isLiked;
      const newCount = newLiked ? likeCount + 1 : Math.max(0, likeCount - 1);
      setIsLiked(newLiked);
      setLikeCount(newCount);
    },
    onSuccess: (data) => {
      setLikeCount(data.likeCount || likeCount);
      onLike?.(isLiked, data.likeCount || likeCount);
    },
    onError: () => {
      // Rollback
      setIsLiked(!isLiked);
      setLikeCount(isLiked ? likeCount - 1 : likeCount + 1);
      toast({
        title: "Like failed",
        description: "Please try again",
        variant: "destructive"
      });
    }
  });

  return (
    <Button
      onClick={() => mutate(isLiked)}
      variant="ghost"
      size="sm"
      className={cn(
        "relative flex items-center gap-2 transition-all duration-200",
        isLiked && "text-red-500",
        className
      )}
      disabled={isOptimistic}
    >
      <motion.div
        animate={showSuccess ? { scale: [1, 1.3, 1] } : {}}
        transition={{ duration: 0.3 }}
      >
        <Heart
          className={cn(
            "w-4 h-4 transition-all duration-200",
            isLiked && "fill-current text-red-500",
            isOptimistic && "animate-pulse"
          )}
        />
      </motion.div>
      
      {showCount && (
        <motion.span
          animate={{ scale: showSuccess ? [1, 1.1, 1] : 1 }}
          className="text-sm font-medium"
        >
          {likeCount}
        </motion.span>
      )}
      
      {isOptimistic && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          exit={{ scale: 0 }}
          className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full"
        />
      )}
    </Button>
  );
}

// Optimistic Share Button with feedback
interface OptimisticShareButtonProps {
  recipeId: string;
  recipeTitle: string;
  className?: string;
  onShare?: () => void;
}

export function OptimisticShareButton({
  recipeId,
  recipeTitle,
  className,
  onShare
}: OptimisticShareButtonProps) {
  const [isSharing, setIsSharing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const { toast } = useToast();

  const handleShare = async () => {
    setIsSharing(true);
    
    try {
      const shareUrl = `${window.location.origin}/recipe/${recipeId}`;
      
      if (navigator.share) {
        await navigator.share({
          title: recipeTitle,
          url: shareUrl
        });
      } else {
        await navigator.clipboard.writeText(shareUrl);
        toast({
          title: "Link copied!",
          description: "Recipe link copied to clipboard"
        });
      }
      
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
      onShare?.();
      
    } catch (error) {
      toast({
        title: "Share failed",
        description: "Please try again",
        variant: "destructive"
      });
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <Button
      onClick={handleShare}
      variant="outline"
      size="sm"
      className={cn("relative flex items-center gap-2", className)}
      disabled={isSharing}
    >
      <AnimatePresence mode="wait">
        {showSuccess ? (
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0, rotate: 180 }}
            className="flex items-center gap-2 text-green-600"
          >
            <Check className="w-4 h-4" />
            Shared!
          </motion.div>
        ) : (
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0, rotate: 180 }}
            className="flex items-center gap-2"
          >
            {isSharing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Share2 className="w-4 h-4" />
            )}
            Share
          </motion.div>
        )}
      </AnimatePresence>
    </Button>
  );
}

// Generic Optimistic Button wrapper
interface OptimisticButtonProps {
  action: () => Promise<any>;
  children: React.ReactNode;
  loadingChildren?: React.ReactNode;
  successChildren?: React.ReactNode;
  className?: string;
  disabled?: boolean;
  onSuccess?: () => void;
  onError?: (error: any) => void;
}

export function OptimisticButton({
  action,
  children,
  loadingChildren,
  successChildren,
  className,
  disabled,
  onSuccess,
  onError
}: OptimisticButtonProps) {
  const [state, setState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const { toast } = useToast();

  const handleClick = async () => {
    if (disabled || state === 'loading') return;
    
    setState('loading');
    
    try {
      await action();
      setState('success');
      setTimeout(() => setState('idle'), 2000);
      onSuccess?.();
    } catch (error: any) {
      setState('error');
      setTimeout(() => setState('idle'), 2000);
      toast({
        title: "Action failed",
        description: error.message || "Please try again",
        variant: "destructive"
      });
      onError?.(error);
    }
  };

  return (
    <Button
      onClick={handleClick}
      className={cn(
        "relative overflow-hidden transition-all duration-200",
        state === 'loading' && "animate-pulse",
        state === 'success' && "bg-green-500 hover:bg-green-600",
        state === 'error' && "bg-red-500 hover:bg-red-600",
        className
      )}
      disabled={disabled || state === 'loading'}
    >
      <AnimatePresence mode="wait">
        {state === 'loading' && loadingChildren ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
          >
            {loadingChildren}
          </motion.div>
        ) : state === 'success' && successChildren ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
          >
            {successChildren}
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
      
      {state === 'loading' && (
        <motion.div
          initial={{ x: "-100%" }}
          animate={{ x: "100%" }}
          transition={{ repeat: Infinity, duration: 1 }}
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
        />
      )}
    </Button>
  );
}