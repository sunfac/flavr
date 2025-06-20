import { motion } from 'framer-motion';
import { animations } from '@/styles/tokens';

interface ProgressBarProps {
  currentStep: number;
  totalSteps: number;
  completedSteps: number[];
  className?: string;
}

export default function ProgressBar({ 
  currentStep, 
  totalSteps, 
  completedSteps,
  className = '' 
}: ProgressBarProps) {
  const progress = completedSteps.length / totalSteps;

  return (
    <>
      {/* Desktop: Linear Progress Bar */}
      <div className={`hidden md:block ${className}`}>
        <div className="fixed top-0 left-0 right-0 z-40 h-1 bg-slate-800/50 backdrop-blur-sm">
          <motion.div
            className="h-full bg-gradient-to-r from-orange-400 to-orange-600"
            initial={{ width: 0 }}
            animate={{ width: `${progress * 100}%` }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            style={{ '--progress': `${progress * 100}%` } as any}
          />
        </div>
      </div>

      {/* Mobile: Dot Progress Indicator */}
      <div className={`md:hidden ${className}`}>
        <div className="flex justify-center gap-2 py-4 px-6">
          {Array.from({ length: totalSteps }, (_, index) => (
            <ProgressDot
              key={index}
              isCompleted={completedSteps.includes(index)}
              isCurrent={index === currentStep}
              stepIndex={index}
            />
          ))}
        </div>
      </div>
    </>
  );
}

function ProgressDot({ 
  isCompleted, 
  isCurrent, 
  stepIndex 
}: { 
  isCompleted: boolean; 
  isCurrent: boolean; 
  stepIndex: number; 
}) {
  return (
    <motion.div
      className={`
        w-3 h-3 rounded-full transition-all duration-300
        ${isCompleted 
          ? 'bg-orange-500' 
          : isCurrent 
            ? 'bg-orange-400' 
            : 'bg-slate-600'
        }
      `}
      animate={isCurrent ? {
        scale: [1, 1.2, 1],
      } : {
        scale: 1
      }}
      transition={{
        duration: 1.2,
        repeat: isCurrent ? Infinity : 0,
        ease: "easeInOut"
      }}
      whileHover={{ scale: 1.3 }}
    />
  );
}