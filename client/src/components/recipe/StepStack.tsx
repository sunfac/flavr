import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Timer, Play, Pause, RotateCcw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { animations, layout } from '@/styles/tokens';

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

interface Timer {
  id: string;
  duration: number; // in seconds
  remaining: number;
  isActive: boolean;
}

export default function StepStack({ 
  steps, 
  currentStep, 
  onStepComplete,
  onStepChange,
  className = '' 
}: StepStackProps) {
  const [timers, setTimers] = useState<Record<string, Timer>>({});
  const [showCookMode, setShowCookMode] = useState(false);
  const stepRefs = useRef<(HTMLDivElement | null)[]>([]);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Timer management
  useEffect(() => {
    const interval = setInterval(() => {
      setTimers(prev => {
        const updated = { ...prev };
        let hasChanges = false;

        Object.keys(updated).forEach(id => {
          if (updated[id].isActive && updated[id].remaining > 0) {
            updated[id].remaining -= 1;
            hasChanges = true;
            
            // Auto-scroll to next step when timer completes
            if (updated[id].remaining === 0) {
              updated[id].isActive = false;
              setTimeout(() => scrollToNextStep(id), 1000);
            }
          }
        });

        return hasChanges ? updated : prev;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

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
    setTimers(prev => ({
      ...prev,
      [stepId]: {
        id: stepId,
        duration: durationSeconds,
        remaining: durationSeconds,
        isActive: true
      }
    }));
  };

  const toggleTimer = (stepId: string) => {
    setTimers(prev => ({
      ...prev,
      [stepId]: {
        ...prev[stepId],
        isActive: !prev[stepId]?.isActive
      }
    }));
  };

  const resetTimer = (stepId: string) => {
    setTimers(prev => {
      if (!prev[stepId]) return prev;
      return {
        ...prev,
        [stepId]: {
          ...prev[stepId],
          remaining: prev[stepId].duration,
          isActive: false
        }
      };
    });
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const currentStepData = steps[currentStep];
  const currentTimer = currentStepData ? timers[currentStepData.id] : null;

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
              className="w-full max-w-2xl mx-auto scroll-snap-align-start"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
            >
              <StepCard
                step={step}
                stepNumber={index + 1}
                totalSteps={steps.length}
                timer={timers[step.id]}
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

      {/* Mobile Cook Mode Button */}
      <div className="md:hidden fixed bottom-6 right-6 z-50">
        <Button
          onClick={() => setShowCookMode(true)}
          size="lg"
          className="rounded-full bg-orange-500 hover:bg-orange-600 text-white shadow-lg"
        >
          <Timer className="w-5 h-5 mr-2" />
          Cook Mode
        </Button>
      </div>

      {/* Cook Mode Modal */}
      <Dialog open={showCookMode} onOpenChange={setShowCookMode}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-sm h-[80vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="text-xl text-orange-400">Cook Mode</DialogTitle>
          </DialogHeader>
          
          {currentStepData && (
            <div className="flex flex-col h-full py-4">
              <div className="text-center mb-6">
                <Badge variant="outline" className="border-orange-400 text-orange-300 mb-4">
                  Step {currentStep + 1} of {steps.length}
                </Badge>
                <h3 className="text-2xl font-bold mb-4">{currentStepData.title}</h3>
              </div>

              <div className="flex-1 flex items-center justify-center">
                {currentTimer && (
                  <div className="text-center">
                    <div className="text-6xl font-mono font-bold text-orange-400 mb-6">
                      {formatTime(currentTimer.remaining)}
                    </div>
                    <div className="flex gap-4 justify-center">
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
                  </div>
                )}
              </div>

              <div className="text-center text-lg leading-relaxed px-4">
                {currentStepData.description}
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
  timer?: Timer;
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
                <Timer className="w-4 h-4 mr-1" />
                {step.duration}min
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Step Content */}
      <h3 className="text-xl font-semibold text-white mb-3">{step.title}</h3>
      
      {step.image && (
        <div className="mb-4 rounded-lg overflow-hidden bg-slate-700/30">
          <img 
            src={step.image} 
            alt={step.title}
            className="w-full h-48 object-cover"
          />
        </div>
      )}
      
      <p className="text-slate-300 leading-relaxed mb-6">{step.description}</p>

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