import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, Loader2, Clock, Sparkles, ChefHat, Brain, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface ProgressiveLoadingProps {
  isLoading: boolean;
  onCancel?: () => void;
  type?: "recipe" | "inspire" | "weekly-planner" | "generic";
  estimatedTime?: number; // in seconds
  className?: string;
}

interface LoadingStage {
  id: string;
  label: string;
  description: string;
  icon: any;
  duration: number; // seconds
  completedMessage?: string;
}

// Define loading stages for different types
const LOADING_STAGES = {
  recipe: [
    {
      id: "analyzing",
      label: "Analyzing your request",
      description: "Understanding your culinary vision and preferences...",
      icon: Search,
      duration: 3,
      completedMessage: "Request analyzed!"
    },
    {
      id: "planning",
      label: "Planning the perfect dish",
      description: "Selecting techniques and flavor combinations...",
      icon: Brain,
      duration: 4,
      completedMessage: "Recipe planned!"
    },
    {
      id: "crafting",
      label: "Crafting your recipe",
      description: "Writing detailed instructions and ingredient lists...",
      icon: ChefHat,
      duration: 5,
      completedMessage: "Recipe crafted!"
    },
    {
      id: "finalizing",
      label: "Finalizing details",
      description: "Adding tips, timings, and finishing touches...",
      icon: CheckCircle,
      duration: 2,
      completedMessage: "Recipe ready!"
    }
  ],
  inspire: [
    {
      id: "thinking",
      label: "Getting inspired",
      description: "Exploring culinary possibilities...",
      icon: Brain,
      duration: 1.5,
      completedMessage: "Inspiration found!"
    },
    {
      id: "crafting",
      label: "Crafting suggestion",
      description: "Creating the perfect dish idea for you...",
      icon: Sparkles,
      duration: 2.5,
      completedMessage: "Suggestion ready!"
    }
  ],
  "weekly-planner": [
    {
      id: "analyzing",
      label: "Analyzing preferences",
      description: "Understanding your dietary needs and tastes...",
      icon: Search,
      duration: 3,
    },
    {
      id: "planning",
      label: "Planning your week",
      description: "Balancing nutrition, variety, and flavor...",
      icon: Brain,
      duration: 5,
    },
    {
      id: "optimizing",
      label: "Optimizing meals",
      description: "Ensuring perfect portion sizes and timing...",
      icon: ChefHat,
      duration: 4,
    },
    {
      id: "finalizing",
      label: "Finalizing plan",
      description: "Adding shopping lists and preparation tips...",
      icon: CheckCircle,
      duration: 3,
    }
  ],
  generic: [
    {
      id: "processing",
      label: "Processing",
      description: "Working on your request...",
      icon: Loader2,
      duration: 5,
    }
  ]
};

export function ProgressiveLoading({ 
  isLoading, 
  onCancel, 
  type = "generic", 
  estimatedTime = 10,
  className 
}: ProgressiveLoadingProps) {
  const [currentStageIndex, setCurrentStageIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [completedStages, setCompletedStages] = useState<Set<string>>(new Set());

  const stages = LOADING_STAGES[type] || LOADING_STAGES.generic;
  const currentStage = stages[currentStageIndex];

  // Reset when loading starts/stops
  useEffect(() => {
    if (isLoading) {
      setCurrentStageIndex(0);
      setProgress(0);
      setTimeElapsed(0);
      setCompletedStages(new Set());
    }
  }, [isLoading]);

  // Progress simulation
  useEffect(() => {
    if (!isLoading) return;

    const interval = setInterval(() => {
      setTimeElapsed(prev => prev + 0.1);
      
      // Calculate total time elapsed through stages
      let totalTimeForCompletedStages = 0;
      for (let i = 0; i < currentStageIndex; i++) {
        totalTimeForCompletedStages += stages[i].duration;
      }
      
      const timeInCurrentStage = timeElapsed - totalTimeForCompletedStages;
      const progressInCurrentStage = Math.min(timeInCurrentStage / currentStage.duration, 1);
      
      // Calculate overall progress
      const overallProgress = ((currentStageIndex + progressInCurrentStage) / stages.length) * 100;
      setProgress(Math.min(overallProgress, 95)); // Cap at 95% until completion
      
      // Move to next stage when current is complete
      if (progressInCurrentStage >= 1 && currentStageIndex < stages.length - 1) {
        setCompletedStages(prev => new Set([...prev, currentStage.id]));
        setCurrentStageIndex(prev => prev + 1);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [isLoading, currentStageIndex, timeElapsed, currentStage, stages]);

  if (!isLoading) {
    return null;
  }

  const IconComponent = currentStage.icon;
  const remainingTime = Math.max(0, estimatedTime - timeElapsed);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={cn("w-full max-w-md mx-auto", className)}
    >
      <Card className="bg-card/95 backdrop-blur-lg border border-border/50 shadow-2xl">
        <CardContent className="p-8 space-y-6">
          {/* Current Stage */}
          <div className="text-center space-y-4">
            <motion.div
              key={currentStage.id}
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              className="flex justify-center"
            >
              <div className="relative">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                  <IconComponent className="w-8 h-8 text-primary animate-pulse" />
                </div>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-0 border-2 border-primary/30 border-t-primary rounded-full"
                />
              </div>
            </motion.div>

            <div className="space-y-2">
              <motion.h3
                key={currentStage.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="font-semibold text-lg text-foreground"
              >
                {currentStage.label}
              </motion.h3>
              <motion.p
                key={currentStage.description}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-muted-foreground text-sm"
              >
                {currentStage.description}
              </motion.p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <Progress 
              value={progress} 
              className="h-2 bg-muted"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{Math.round(progress)}% complete</span>
              <span>
                {remainingTime > 0 ? `~${Math.ceil(remainingTime)}s remaining` : 'Almost done!'}
              </span>
            </div>
          </div>

          {/* Stage List */}
          <div className="space-y-2">
            {stages.map((stage, index) => {
              const StageIcon = stage.icon;
              const isCompleted = completedStages.has(stage.id);
              const isCurrent = index === currentStageIndex;
              const isUpcoming = index > currentStageIndex;

              return (
                <motion.div
                  key={stage.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={cn(
                    "flex items-center gap-3 p-2 rounded-lg transition-all duration-300",
                    isCurrent && "bg-primary/5 border border-primary/20",
                    isCompleted && "bg-green-500/5 border border-green-500/20"
                  )}
                >
                  <div
                    className={cn(
                      "w-6 h-6 rounded-full flex items-center justify-center transition-all duration-300",
                      isCompleted && "bg-green-500 text-white",
                      isCurrent && "bg-primary text-primary-foreground animate-pulse",
                      isUpcoming && "bg-muted text-muted-foreground"
                    )}
                  >
                    {isCompleted ? (
                      <CheckCircle className="w-4 h-4" />
                    ) : (
                      <StageIcon className={cn("w-4 h-4", isCurrent && "animate-pulse")} />
                    )}
                  </div>
                  <div className="flex-1">
                    <p
                      className={cn(
                        "text-sm font-medium transition-colors",
                        isCompleted && "text-green-600",
                        isCurrent && "text-foreground",
                        isUpcoming && "text-muted-foreground"
                      )}
                    >
                      {isCompleted && stage.completedMessage ? stage.completedMessage : stage.label}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Cancel button */}
          {onCancel && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 2 }}
              className="flex justify-center"
            >
              <Button
                variant="ghost"
                size="sm"
                onClick={onCancel}
                className="text-muted-foreground hover:text-foreground"
              >
                Cancel
              </Button>
            </motion.div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

// Quick Loading Button Component for smaller interactions
interface QuickLoadingButtonProps {
  isLoading: boolean;
  loadingText?: string;
  children: React.ReactNode;
  onClick: () => void | Promise<void>;
  className?: string;
  disabled?: boolean;
  variant?: "default" | "outline" | "ghost" | "destructive" | "secondary";
}

export function QuickLoadingButton({
  isLoading,
  loadingText = "Loading...",
  children,
  onClick,
  className,
  disabled,
  variant = "default"
}: QuickLoadingButtonProps) {
  return (
    <Button
      onClick={onClick}
      disabled={disabled || isLoading}
      variant={variant}
      className={cn("relative overflow-hidden", className)}
    >
      <AnimatePresence mode="wait">
        {isLoading ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="flex items-center gap-2"
          >
            <Loader2 className="w-4 h-4 animate-spin" />
            {loadingText}
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
      
      {isLoading && (
        <motion.div
          initial={{ x: "-100%" }}
          animate={{ x: "100%" }}
          transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
        />
      )}
    </Button>
  );
}