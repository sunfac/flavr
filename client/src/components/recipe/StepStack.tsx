import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Timer as TimerIcon, Play, Pause, RotateCcw, X, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
  const [showCookMode, setShowCookMode] = useState(false);
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

  const currentStepData = steps[currentStep];
  const currentTimer = currentStepData ? timerStore.timers[currentStepData.id] : null;

  return (
    <>
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

      {/* Mobile Cook Mode Button - Fixed positioning */}
      <div className="md:hidden fixed bottom-28 right-4 z-30">
        <Button
          onClick={() => setShowCookMode(true)}
          size="sm"
          className="rounded-full bg-orange-500 hover:bg-orange-600 text-white shadow-lg px-3 py-2 text-xs"
        >
          <TimerIcon className="w-3 h-3 mr-1" />
          Cook
        </Button>
      </div>

      {/* Cook Mode Modal - Fixed sizing */}
      <Dialog open={showCookMode} onOpenChange={setShowCookMode}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-md w-[90vw] h-[85vh] max-h-[600px] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="text-xl text-orange-400">Cook Mode</DialogTitle>
          </DialogHeader>
          
          {currentStepData && (
            <div className="flex flex-col h-full py-4">
              {/* Header with Step Navigation */}
              <div className="flex items-center justify-between mb-6">
                <Button
                  onClick={() => onStepChange(Math.max(0, currentStep - 1))}
                  variant="outline"
                  size="sm"
                  disabled={currentStep === 0}
                  className="border-slate-600 text-slate-300 hover:bg-slate-700 disabled:opacity-50"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                
                <div className="text-center">
                  <Badge variant="outline" className="border-orange-400 text-orange-300 mb-2">
                    Step {currentStep + 1} of {steps.length}
                  </Badge>
                  <h3 className="text-xl font-bold">{currentStepData.title}</h3>
                </div>
                
                <Button
                  onClick={() => onStepChange(Math.min(steps.length - 1, currentStep + 1))}
                  variant="outline"
                  size="sm"
                  disabled={currentStep === steps.length - 1}
                  className="border-slate-600 text-slate-300 hover:bg-slate-700 disabled:opacity-50"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>

              {/* Timer Section */}
              <div className="flex-1 flex items-center justify-center mb-4">
                {currentStepData.duration ? (
                  <div className="text-center">
                    {currentTimer ? (
                      <>
                        <div className="text-5xl font-mono font-bold text-orange-400 mb-4">
                          {formatTime(currentTimer.remaining)}
                        </div>
                        <div className="flex gap-3 justify-center">
                          <Button
                            onClick={() => toggleTimer(currentStepData.id)}
                            variant="outline"
                            size="lg"
                            className="border-orange-400 text-orange-300 hover:bg-orange-400/10"
                          >
                            {currentTimer.isActive ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                          </Button>
                          <Button
                            onClick={() => resetTimer(currentStepData.id)}
                            variant="outline"
                            size="lg"
                            className="border-slate-600 text-slate-300 hover:bg-slate-700"
                          >
                            <RotateCcw className="w-5 h-5" />
                          </Button>
                        </div>
                      </>
                    ) : (
                      <Button
                        onClick={() => startTimer(currentStepData.id, currentStepData.duration!)}
                        size="lg"
                        className="bg-orange-500 hover:bg-orange-600 text-white"
                      >
                        <TimerIcon className="w-5 h-5 mr-2" />
                        Start {currentStepData.duration}min Timer
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="text-center">
                    <TimerIcon className="w-12 h-12 text-slate-500 mx-auto mb-4" />
                    <p className="text-slate-400">No timer for this step</p>
                  </div>
                )}
              </div>

              {/* Step Description */}
              <div className="text-center text-base leading-relaxed px-4 mb-6">
                {currentStepData.description}
              </div>

              {/* Step Actions */}
              <div className="flex gap-3 justify-center">
                <Button
                  onClick={() => onStepComplete(currentStepData.id)}
                  size="lg"
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  <Check className="w-5 h-5 mr-2" />
                  Complete Step
                </Button>
                
                {currentStep < steps.length - 1 && (
                  <Button
                    onClick={() => onStepChange(currentStep + 1)}
                    variant="outline"
                    size="lg"
                    className="border-orange-400 text-orange-300 hover:bg-orange-400/10"
                  >
                    Next Step
                    <ChevronRight className="w-5 h-5 ml-2" />
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
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