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

// AI-powered duration extraction
async function extractDuration(instruction: string): Promise<number | undefined> {
  const text = instruction.toLowerCase();
  
  // First check for explicit time patterns in the text
  const patterns = [
    /(\d+(?:\.\d+)?)\s*(?:to\s+|-)(\d+(?:\.\d+)?)\s*minutes?/,     // Range in minutes: "10-12 minutes"
    /(\d+(?:\.\d+)?)\s*(?:to\s+|-)(\d+(?:\.\d+)?)\s*mins?/,       // Range in mins: "10-12 mins"
    /(\d+(?:\.\d+)?)\s*(?:to\s+)?(\d+(?:\.\d+)?)?\s*hours?/,      // Handle decimal hours first
    /(\d+(?:\.\d+)?)\s*(?:to\s+)?(\d+(?:\.\d+)?)?\s*hrs?/,        // Handle decimal hrs first
    /(\d+)\s*minutes?/,                                            // Single minutes: "30 minutes"
    /(\d+)\s*mins?/,                                              // Single mins: "30 mins"
    /(\d+)\s*(?:to\s+)?(\d+)?\s*seconds?/,
    /(\d+)\s*(?:to\s+)?(\d+)?\s*secs?/,
    /for\s+(\d+(?:\.\d+)?)\s*hours?/,
    /for\s+(\d+)\s*minutes?/,
    /about\s+(\d+(?:\.\d+)?)\s*hours?/,
    /about\s+(\d+)\s*minutes?/,
    /approximately\s+(\d+(?:\.\d+)?)\s*hours?/,
    /approximately\s+(\d+)\s*minutes?/,
    /around\s+(\d+(?:\.\d+)?)\s*hours?/,
    /around\s+(\d+)\s*minutes?/
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const firstNum = parseFloat(match[1]);
      const secondNum = match[2] ? parseFloat(match[2]) : firstNum;
      
      // Use the average if it's a range, otherwise use the single value
      const duration = match[2] ? (firstNum + secondNum) / 2 : firstNum;
      
      // Convert to minutes if needed
      let finalDuration;
      if (text.includes('hour') || text.includes('hr')) {
        finalDuration = Math.round(duration * 60); // Convert hours to minutes
      } else if (text.includes('second') || text.includes('sec')) {
        finalDuration = Math.max(1, Math.round(duration / 60)); // Convert seconds to minutes
      } else {
        finalDuration = Math.round(duration); // Already in minutes
      }
      
      console.log(`🔍 Pattern match: "${instruction}" → matched "${match[0]}" → raw: ${duration}, final: ${finalDuration} minutes`);
      return finalDuration;
    }
  }
  
  // If no explicit timing, check if this step needs a timer via AI
  if (await shouldStepHaveTimer(instruction)) {
    return await getAIStepTiming(instruction);
  }
  
  return undefined; // No timer needed
}

// Determine if a step should have a timer (cooking processes only)
async function shouldStepHaveTimer(instruction: string): Promise<boolean> {
  const text = instruction.toLowerCase();
  
  // Quick checks for obvious prep work or visual cues (no AI needed)
  const prepKeywords = ['chop', 'slice', 'dice', 'mince', 'mix', 'stir', 'combine', 'whisk', 'season', 'sprinkle', 'garnish', 'add', 'place', 'arrange', 'serve'];
  const visualCueKeywords = ['until golden', 'until crispy', 'until tender', 'until fragrant', 'until soft', 'until translucent'];
  
  if (prepKeywords.some(keyword => text.includes(keyword))) return false;
  if (visualCueKeywords.some(keyword => text.includes(keyword))) return false;
  
  // Quick checks for obvious cooking processes that need timers
  const cookingKeywords = ['bake', 'roast', 'boil', 'simmer', 'sear', 'fry', 'grill', 'steam', 'braise', 'marinate', 'chill', 'rest', 'rise', 'proof'];
  if (cookingKeywords.some(keyword => text.includes(keyword))) return true;
  
  return false; // Default to no timer for ambiguous cases
}

// Get AI-powered timing for cooking steps
async function getAIStepTiming(instruction: string): Promise<number> {
  try {
    const response = await fetch('/api/get-step-timing', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ instruction }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to get AI timing');
    }
    
    const data = await response.json();
    console.log(`🤖 AI timing response for "${instruction}": ${data.duration} minutes`);
    return data.duration || 5; // Fallback to 5 minutes
  } catch (error) {
    console.error('Error getting AI step timing:', error);
    return 5; // Fallback duration
  }
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
  // State for AI-powered duration
  const [stepDuration, setStepDuration] = useState<number | undefined>(step.duration);
  const [isLoadingDuration, setIsLoadingDuration] = useState(false);

  // Calculate step duration from instruction text (async)
  useEffect(() => {
    if (step.duration) {
      setStepDuration(step.duration);
      return;
    }

    const getDuration = async () => {
      setIsLoadingDuration(true);
      try {
        const duration = await extractDuration(step.description);
        console.log(`⏱️ Step ${stepNumber}: "${step.description}" → ${duration} minutes`);
        setStepDuration(duration);
      } catch (error) {
        console.error('Error getting step duration:', error);
        setStepDuration(undefined);
      } finally {
        setIsLoadingDuration(false);
      }
    };

    getDuration();
  }, [step.description, step.duration]);
  
  // Timer state
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timerInterval, setTimerInterval] = useState<NodeJS.Timeout | null>(null);

  // Play two chimes only
  const playCompletionSound = () => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Function to create a single chime
      const createChime = (startTime: number) => {
        const osc1 = audioContext.createOscillator();
        const osc2 = audioContext.createOscillator();
        const gain = audioContext.createGain();
        
        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(audioContext.destination);
        
        // Set frequencies
        osc1.frequency.setValueAtTime(800, startTime);
        osc2.frequency.setValueAtTime(1000, startTime);
        osc1.type = 'sine';
        osc2.type = 'sine';
        
        // Create envelope for single chime
        const chimeDuration = 0.4;
        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(0.08, startTime + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + chimeDuration);
        
        // Frequency sweep
        osc1.frequency.exponentialRampToValueAtTime(600, startTime + chimeDuration);
        osc2.frequency.exponentialRampToValueAtTime(750, startTime + chimeDuration);
        
        osc1.start(startTime);
        osc2.start(startTime);
        osc1.stop(startTime + chimeDuration);
        osc2.stop(startTime + chimeDuration);
      };
      
      // Play exactly two chimes
      const now = audioContext.currentTime;
      createChime(now);           // First chime
      createChime(now + 0.5);     // Second chime after 0.5 seconds
      
    } catch (error) {
      console.log('Audio not available:', error);
    }
  };

  // Start countdown timer
  const startTimer = () => {
    console.log(`🚀 Starting timer for step ${stepNumber}, duration: ${stepDuration} minutes`);
    if (!stepDuration) {
      console.log('❌ No stepDuration found, cannot start timer');
      return;
    }
    
    if (timeRemaining === null) {
      const seconds = stepDuration * 60;
      console.log(`⏰ Setting timer to ${seconds} seconds (${stepDuration} minutes)`);
      setTimeRemaining(seconds); // Convert minutes to seconds
    }
    
    setIsTimerRunning(true);
    
    const interval = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev === null || prev <= 0) {
          setIsTimerRunning(false);
          clearInterval(interval);
          if (prev === 1) {
            // Timer completed - play sound only once
            console.log(`Step ${stepNumber} timer completed!`);
            playCompletionSound();
          }
          return 0;
        }
        const newTime = prev - 1;
        if (newTime % 10 === 0) { // Log every 10 seconds for debugging
          console.log(`Step ${stepNumber} timer: ${newTime} seconds remaining`);
        }
        return newTime;
      });
    }, 1000);
    
    setTimerInterval(interval);
    console.log(`Timer interval set for step ${stepNumber}`);
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
            {/* Timer Display - Clickable */}
            <Badge 
              variant="secondary" 
              className={`flex items-center gap-1 transition-all duration-200 cursor-pointer hover:scale-105 ${
                timeRemaining !== null && timeRemaining > 0
                  ? isTimerRunning 
                    ? 'bg-orange-500/30 text-orange-200 border-orange-400 shadow-orange-400/20 shadow-md' 
                    : 'bg-yellow-500/30 text-yellow-200 border-yellow-400 shadow-yellow-400/20 shadow-md'
                  : timeRemaining === 0
                    ? 'bg-green-500/30 text-green-200 border-green-400 shadow-green-400/20 shadow-md animate-pulse'
                    : 'bg-slate-700/50 text-slate-300 border-slate-600 hover:bg-orange-500/20 hover:border-orange-400'
              }`}
              onClick={timeRemaining === null ? startTimer : undefined}
              title={timeRemaining === null ? "Click to start timer" : undefined}
            >
              <Clock className="w-3 h-3" />
              {timeRemaining !== null 
                ? timeRemaining > 0 
                  ? formatTime(timeRemaining)
                  : "Done!"
                : stepDuration >= 60 
                  ? `${Math.floor(stepDuration / 60)}h ${stepDuration % 60}m`
                  : `${stepDuration}min`
              }
              {timeRemaining === null && (
                <Play className="w-3 h-3 ml-1 opacity-60" />
              )}
            </Badge>
            
            {/* Timer Controls - More Prominent */}
            {timeRemaining !== null && (
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  className={`h-7 w-7 p-0 border transition-all duration-200 ${
                    isTimerRunning 
                      ? 'border-orange-400 bg-orange-500/20 hover:bg-orange-500/30 text-orange-300' 
                      : 'border-slate-600 bg-slate-700/50 hover:bg-slate-600/50 text-slate-300'
                  }`}
                  onClick={isTimerRunning ? pauseTimer : startTimer}
                  title={isTimerRunning ? "Pause timer" : "Resume timer"}
                >
                  {isTimerRunning ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 w-7 p-0 border-slate-600 bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 transition-all duration-200"
                  onClick={resetTimer}
                  title="Reset timer"
                >
                  <RotateCcw className="w-3 h-3" />
                </Button>
              </div>
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

    </motion.div>
  );
}