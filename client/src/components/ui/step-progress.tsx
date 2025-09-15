import { motion } from "framer-motion";
import { Check, Circle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface Step {
  id: string;
  title: string;
  description: string;
  icon?: React.ReactNode;
}

interface StepProgressProps {
  steps: Step[];
  currentStep: number;
  completedSteps: number[];
  isLoading?: boolean;
  loadingStep?: number;
  className?: string;
}

export function StepProgress({
  steps,
  currentStep,
  completedSteps,
  isLoading = false,
  loadingStep,
  className
}: StepProgressProps) {
  return (
    <div className={cn("w-full", className)}>
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const stepNumber = index + 1;
          const isCompleted = completedSteps.includes(stepNumber);
          const isCurrent = stepNumber === currentStep;
          const isLoadingStep = stepNumber === loadingStep && isLoading;
          const isUpcoming = stepNumber > currentStep;

          return (
            <div key={step.id} className="flex-1 flex items-center">
              {/* Step Circle */}
              <div className="flex flex-col items-center">
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-300 relative",
                    isCompleted && "bg-green-500 text-white",
                    isCurrent && !isLoadingStep && "bg-primary text-primary-foreground",
                    isLoadingStep && "bg-orange-500 text-white",
                    isUpcoming && "bg-muted text-muted-foreground border-2 border-muted"
                  )}
                >
                  {isLoadingStep ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    >
                      <Clock className="w-5 h-5" />
                    </motion.div>
                  ) : isCompleted ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    <Circle className="w-5 h-5" />
                  )}
                  
                  {/* Loading ring for current step */}
                  {isLoadingStep && (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                      className="absolute inset-0 border-2 border-orange-300 border-t-orange-100 rounded-full"
                    />
                  )}
                </motion.div>
                
                {/* Step Label */}
                <div className="mt-2 text-center max-w-[100px]">
                  <p
                    className={cn(
                      "text-xs font-medium transition-colors",
                      isCompleted && "text-green-600",
                      isCurrent && "text-foreground",
                      isUpcoming && "text-muted-foreground"
                    )}
                  >
                    {step.title}
                  </p>
                  <p
                    className={cn(
                      "text-xs text-muted-foreground mt-1",
                      isLoadingStep && "animate-pulse"
                    )}
                  >
                    {step.description}
                  </p>
                </div>
              </div>

              {/* Connector Line */}
              {index < steps.length - 1 && (
                <div className="flex-1 px-4">
                  <div
                    className={cn(
                      "h-0.5 transition-colors duration-300",
                      isCompleted ? "bg-green-500" : "bg-muted"
                    )}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Compact version for mobile
interface CompactStepProgressProps {
  steps: Step[];
  currentStep: number;
  completedSteps: number[];
  className?: string;
}

export function CompactStepProgress({
  steps,
  currentStep,
  completedSteps,
  className
}: CompactStepProgressProps) {
  const currentStepInfo = steps[currentStep - 1];

  return (
    <div className={cn("w-full space-y-2", className)}>
      {/* Progress Bar */}
      <div className="flex items-center space-x-2">
        <span className="text-sm font-medium text-foreground">
          Step {currentStep} of {steps.length}
        </span>
        <div className="flex-1 bg-muted rounded-full h-2">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${(currentStep / steps.length) * 100}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="bg-primary h-full rounded-full"
          />
        </div>
      </div>

      {/* Current Step Info */}
      {currentStepInfo && (
        <div className="text-center">
          <h3 className="text-lg font-semibold text-foreground">
            {currentStepInfo.title}
          </h3>
          <p className="text-sm text-muted-foreground">
            {currentStepInfo.description}
          </p>
        </div>
      )}
    </div>
  );
}