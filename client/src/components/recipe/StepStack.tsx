import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Timer as TimerIcon, Play, Pause, RotateCcw, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { animations, layout } from '@/styles/tokens';
import { useTimerStore, type Timer as TimerType } from '@/stores/timerStore';

interface Step {
  id: string;
  title: string;
  description: string;
  duration?: number; // in minutes
  image?: string;
}

interface StepStackProps {
  steps: Step[];
  currentStep: number;
  onStepComplete: (stepId: string) => void;
  onStepChange: (stepIndex: number) => void;
  className?: string;
}



export default function StepStack({ 
  steps, 
  currentStep, 
  onStepComplete,
  onStepChange,
  className = '' 
}: StepStackProps) {
  const timerStore = useTimerStore();

  const stepRefs = useRef<(HTMLDivElement | null)[]>([]);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to next step when timer completes
  useEffect(() => {
    const checkTimerCompletion = () => {
      Object.values(timerStore.timers).forEach(timer => {
        if (timer.remaining === 0 && !timer.isActive) {
          const stepIndex = steps.findIndex(step => step.id === timer.id);
          if (stepIndex >= 0 && stepIndex < steps.length - 1) {
            setTimeout(() => scrollToNextStep(timer.id), 1000);
          }
        }
      });
    };

    const interval = setInterval(checkTimerCompletion, 1000);
    return () => clearInterval(interval);
  }, [timerStore.timers, steps]);

  const scrollToNextStep = (completedStepId: string) => {
    const currentIndex = steps.findIndex(step => step.id === completedStepId);
    if (currentIndex >= 0 && currentIndex < steps.length - 1) {
      scrollToStep(currentIndex + 1);
    }
  };

  const scrollToStep = (index: number) => {
    const element = stepRefs.current[index];
    if (element && scrollContainerRef.current) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      onStepChange(index);
    }
  };

  const startTimer = (stepId: string, durationMinutes: number) => {
    const durationSeconds = durationMinutes * 60;
    timerStore.startTimer(stepId, durationSeconds);
  };

  const toggleTimer = (stepId: string) => {
    const timer = timerStore.timers[stepId];
    if (timer?.isActive) {
      timerStore.pauseTimer(stepId);
    } else if (timer?.isPaused) {
      timerStore.resumeTimer(stepId);
    }
  };

  const resetTimer = (stepId: string) => {
    timerStore.resetTimer(stepId);
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div 
      ref={scrollContainerRef}
      className={`${className} h-full overflow-y-auto scroll-smooth`}
      style={{ scrollSnapType: 'y mandatory' }}
    >
      <div className="space-y-8 p-6">
        {steps.map((step, index) => (
          <motion.div
            key={step.id}
            ref={el => stepRefs.current[index] = el}
            className="w-full max-w-[600px] mx-auto scroll-snap-align-start"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
          >
            <StepCard
              step={step}
              stepNumber={index + 1}
              totalSteps={steps.length}
              timer={timerStore.timers[step.id]}
              isActive={index === currentStep}
              onStartTimer={startTimer}
              onToggleTimer={toggleTimer}
              onResetTimer={resetTimer}
              onComplete={() => onStepComplete(step.id)}
            />
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function StepCard({
  step,
  stepNumber,
  totalSteps,
  timer,
  isActive,
  onStartTimer,
  onToggleTimer,
  onResetTimer,
  onComplete
}: {
  step: Step;
  stepNumber: number;
  totalSteps: number;
  timer?: TimerType;
  isActive: boolean;
  onStartTimer: (stepId: string, duration: number) => void;
  onToggleTimer: (stepId: string) => void;
  onResetTimer: (stepId: string) => void;
  onComplete: () => void;
}) {
  return (
    <motion.div
      className={`
        bg-slate-800/50 rounded-xl p-6 border transition-all duration-300
        ${isActive ? 'border-orange-400/50 bg-slate-800/70' : 'border-slate-700/50'}
      `}
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.2 }}
    >
      {/* Step Header */}
      <div className="flex items-center justify-between mb-4">
        <Badge variant="outline" className="border-orange-400 text-orange-300">
          Step {stepNumber} of {totalSteps}
        </Badge>
        
        {step.duration && (
          <div className="flex items-center gap-2">
            {timer ? (
              <div className="flex items-center gap-2">
                <span className="text-lg font-mono text-orange-400">
                  {Math.floor(timer.remaining / 60)}:{(timer.remaining % 60).toString().padStart(2, '0')}
                </span>
                <Button
                  onClick={() => onToggleTimer(step.id)}
                  size="sm"
                  variant="outline"
                  className="border-orange-400 text-orange-300 hover:bg-orange-400/10"
                >
                  {timer.isActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </Button>
                <Button
                  onClick={() => onResetTimer(step.id)}
                  size="sm"
                  variant="outline"
                  className="border-slate-600 text-slate-300 hover:bg-slate-700"
                >
                  <RotateCcw className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <Button
                onClick={() => onStartTimer(step.id, step.duration!)}
                size="sm"
                variant="outline"
                className="border-orange-400 text-orange-300 hover:bg-orange-400/10"
              >
                <TimerIcon className="w-4 h-4 mr-1" />
                {step.duration}min
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Step Content */}
      <h3 className="font-semibold text-white mb-3" style={{ fontSize: 'var(--step-1)' }}>{step.title}</h3>
      
      {step.image && (
        <div className="mb-4 rounded-lg overflow-hidden bg-slate-700/30" style={{ aspectRatio: '16/9' }}>
          <img 
            src={step.image} 
            alt={step.title}
            className="w-full h-full object-cover"
          />
        </div>
      )}
      
      <p className="text-slate-300 leading-relaxed mb-6" style={{ fontSize: 'var(--step-0)' }}>{step.description}</p>

      {/* Step Actions */}
      <div className="flex justify-end">
        <Button
          onClick={onComplete}
          className="bg-orange-500 hover:bg-orange-600 text-white"
        >
          Mark Complete
        </Button>
      </div>
    </motion.div>
  );
}