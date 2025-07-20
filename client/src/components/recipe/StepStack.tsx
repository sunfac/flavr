import { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';

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
          <Badge variant="outline" className="border-orange-400 text-orange-300">
            {step.duration}min
          </Badge>
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