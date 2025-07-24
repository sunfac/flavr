import { useRef, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Clock, Play, Pause, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

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
  onStepChange: (stepIndex: number) => void;
  className?: string;
}

// Extract duration from instruction text
function extractDuration(instruction: string): number | undefined {
  const text = instruction.toLowerCase();
  
  // Look for time patterns
  const patterns = [
    /(\d+)\s*(?:to\s*)?(\d+)?\s*minutes?/,
    /(\d+)\s*(?:to\s*)?(\d+)?\s*mins?/,
    /(\d+)\s*(?:to\s*)?(\d+)?\s*hours?/,
    /(\d+)\s*(?:to\s*)?(\d+)?\s*hrs?/,
    /(\d+)\s*(?:to\s*)?(\d+)?\s*seconds?/,
    /(\d+)\s*(?:to\s*)?(\d+)?\s*secs?/
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const firstNum = parseInt(match[1]);
      const secondNum = match[2] ? parseInt(match[2]) : firstNum;
      
      // Use the average if it's a range, otherwise use the single value
      const duration = match[2] ? Math.round((firstNum + secondNum) / 2) : firstNum;
      
      // Convert to minutes if needed
      if (text.includes('hour') || text.includes('hr')) {
        return duration * 60;
      } else if (text.includes('second') || text.includes('sec')) {
        return Math.round(duration / 60);
      } else {
        return duration; // Already in minutes
      }
    }
  }
  
  // Default durations based on common cooking terms
  if (text.includes('bring to a boil') || text.includes('boil')) return 5;
  if (text.includes('simmer')) return 15;
  if (text.includes('bake') || text.includes('roast')) return 30;
  if (text.includes('sauté') || text.includes('fry')) return 8;
  if (text.includes('marinate')) return 30;
  if (text.includes('rest') || text.includes('cool')) return 10;
  if (text.includes('preheat')) return 10;
  if (text.includes('brown') || text.includes('sear')) return 5;
  if (text.includes('chop') || text.includes('slice') || text.includes('dice')) return 3;
  if (text.includes('mix') || text.includes('stir') || text.includes('combine')) return 2;
  
  return undefined;
}



export default function StepStack({ 
  steps, 
  currentStep, 
  onStepChange,
  className = '' 
}: StepStackProps) {
  const stepRefs = useRef<(HTMLDivElement | null)[]>([]);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to current step when it changes (disabled to prevent conflict with recipe header scroll)
  // useEffect(() => {
  //   const currentStepElement = stepRefs.current[currentStep];
  //   if (currentStepElement && scrollContainerRef.current) {
  //     currentStepElement.scrollIntoView({ 
  //       behavior: 'smooth', 
  //       block: 'start',
  //       inline: 'nearest'
  //     });
  //   }
  // }, [currentStep]);



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
              isActive={index === currentStep}
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
  isActive
}: {
  step: Step;
  stepNumber: number;
  totalSteps: number;
  isActive: boolean;
}) {
  // Calculate step duration from instruction text
  const stepDuration = step.duration || extractDuration(step.description);
  
  // Timer state
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timerInterval, setTimerInterval] = useState<NodeJS.Timeout | null>(null);

  // Start countdown timer
  const startTimer = () => {
    if (!stepDuration) return;
    
    if (timeRemaining === null) {
      setTimeRemaining(stepDuration * 60); // Convert minutes to seconds
    }
    
    setIsTimerRunning(true);
    
    const interval = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev === null || prev <= 1) {
          setIsTimerRunning(false);
          if (prev !== null) {
            // Timer completed - could add notification here
            console.log(`Step ${stepNumber} timer completed!`);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    setTimerInterval(interval);
  };

  // Pause timer
  const pauseTimer = () => {
    setIsTimerRunning(false);
    if (timerInterval) {
      clearInterval(timerInterval);
      setTimerInterval(null);
    }
  };

  // Reset timer
  const resetTimer = () => {
    setIsTimerRunning(false);
    setTimeRemaining(null);
    if (timerInterval) {
      clearInterval(timerInterval);
      setTimerInterval(null);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerInterval) {
        clearInterval(timerInterval);
      }
    };
  }, [timerInterval]);

  // Format time display
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

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
        
        {/* Step Duration with Timer Controls */}
        {stepDuration && (
          <div className="flex items-center gap-2">
            {/* Timer Display */}
            <Badge 
              variant="secondary" 
              className={`flex items-center gap-1 transition-colors ${
                timeRemaining !== null && timeRemaining > 0
                  ? isTimerRunning 
                    ? 'bg-orange-500/20 text-orange-300 border-orange-400' 
                    : 'bg-yellow-500/20 text-yellow-300 border-yellow-400'
                  : timeRemaining === 0
                    ? 'bg-green-500/20 text-green-300 border-green-400'
                    : 'bg-slate-700/50 text-slate-300 border-slate-600'
              }`}
            >
              <Clock className="w-3 h-3" />
              {timeRemaining !== null 
                ? timeRemaining > 0 
                  ? formatTime(timeRemaining)
                  : "Done!"
                : stepDuration >= 60 
                  ? `${Math.floor(stepDuration / 60)}h ${stepDuration % 60}m`
                  : `${stepDuration} min`
              }
            </Badge>
            
            {/* Timer Controls */}
            <div className="flex items-center gap-1">
              {timeRemaining === null ? (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0 hover:bg-orange-500/20"
                  onClick={startTimer}
                  title="Start timer"
                >
                  <Play className="w-3 h-3" />
                </Button>
              ) : (
                <>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0 hover:bg-orange-500/20"
                    onClick={isTimerRunning ? pauseTimer : startTimer}
                    title={isTimerRunning ? "Pause timer" : "Resume timer"}
                  >
                    {isTimerRunning ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0 hover:bg-slate-500/20"
                    onClick={resetTimer}
                    title="Reset timer"
                  >
                    <RotateCcw className="w-3 h-3" />
                  </Button>
                </>
              )}
            </div>
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

    </motion.div>
  );
}