import { useState, useEffect } from 'react';
import { Mic, MicOff, Volume2, VolumeX, Play, Pause, SkipForward, SkipBack } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useVoiceCommands } from '@/hooks/useVoiceCommands';
import { useRecipeStore } from '@/stores/recipeStore';
import { useTimerStore } from '@/stores/timerStore';
import { cn } from '@/lib/utils';

interface VoiceAssistantProps {
  onChatMessage?: (message: string) => void;
  className?: string;
}

export default function VoiceAssistant({ onChatMessage, className }: VoiceAssistantProps) {
  const [isMinimized, setIsMinimized] = useState(false);
  const [showCommands, setShowCommands] = useState(false);
  
  const recipeStore = useRecipeStore();
  const timerStore = useTimerStore();
  
  const {
    isListening,
    isSupported,
    lastCommand,
    toggleListening,
    speak,
    startListening,
    stopListening
  } = useVoiceCommands({ onChatMessage });

  // Auto-start listening when component mounts
  useEffect(() => {
    if (isSupported) {
      startListening();
    }
  }, [isSupported]);

  if (!isSupported) {
    return (
      <Card className={cn("bg-destructive/10 border-destructive/20", className)}>
        <CardContent className="p-4">
          <p className="text-sm text-destructive">Voice commands not supported in this browser</p>
        </CardContent>
      </Card>
    );
  }

  const currentStep = recipeStore.steps[recipeStore.currentStep];
  const currentTimer = currentStep ? timerStore.timers[currentStep.id] : null;

  const quickActions = [
    {
      icon: SkipBack,
      label: 'Previous',
      action: () => {
        if (recipeStore.currentStep > 0) {
          recipeStore.setCurrentStep(recipeStore.currentStep - 1);
          speak('Moving to previous step');
        }
      },
      disabled: recipeStore.currentStep === 0
    },
    {
      icon: SkipForward, 
      label: 'Next',
      action: () => {
        if (recipeStore.currentStep < recipeStore.steps.length - 1) {
          recipeStore.setCurrentStep(recipeStore.currentStep + 1);
          speak('Moving to next step');
        }
      },
      disabled: recipeStore.currentStep === recipeStore.steps.length - 1
    },
    {
      icon: currentTimer?.isActive ? Pause : Play,
      label: currentTimer?.isActive ? 'Pause Timer' : 'Start Timer',
      action: () => {
        if (currentStep) {
          if (currentTimer?.isActive) {
            timerStore.pauseTimer(currentStep.id);
            speak('Timer paused');
          } else if (currentStep.duration) {
            timerStore.startTimer(currentStep.id, currentStep.duration * 60);
            speak(`Timer started for ${currentStep.duration} minutes`);
          }
        }
      },
      disabled: !currentStep || !currentStep.duration
    }
  ];

  const voiceCommands = [
    { phrase: '"Next step"', action: 'Move to next cooking step' },
    { phrase: '"Previous step"', action: 'Go back to previous step' },
    { phrase: '"Read step"', action: 'Read current step aloud' },
    { phrase: '"Start timer"', action: 'Start timer for current step' },
    { phrase: '"Pause timer"', action: 'Pause active timer' },
    { phrase: '"Complete step"', action: 'Mark current step as done' },
    { phrase: '"Ask Zest [question]"', action: 'Send message to chatbot' },
    { phrase: '"How many steps"', action: 'Get total step count' },
    { phrase: '"Recipe title"', action: 'Hear recipe name' },
    { phrase: '"Mark ingredient [number]"', action: 'Check off ingredient' }
  ];

  if (isMinimized) {
    return (
      <div className={cn("fixed bottom-4 right-4 z-50", className)}>
        <Button
          onClick={() => setIsMinimized(false)}
          variant={isListening ? "default" : "secondary"}
          size="lg"
          className="h-14 w-14 rounded-full shadow-lg"
        >
          {isListening ? (
            <div className="flex items-center">
              <Mic className="w-6 h-6" />
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse ml-1" />
            </div>
          ) : (
            <MicOff className="w-6 h-6" />
          )}
        </Button>
      </div>
    );
  }

  return (
    <Card className={cn("bg-slate-800/95 border-slate-600 text-white", className)}>
      <CardContent className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Volume2 className="w-5 h-5 text-primary" />
            <h3 className="font-semibold">Voice Assistant</h3>
            {isListening && (
              <Badge variant="destructive" className="animate-pulse">
                Listening
              </Badge>
            )}
          </div>
          
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMinimized(true)}
              className="h-8 w-8 p-0"
            >
              ▼
            </Button>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex gap-2">
          {quickActions.map((action, index) => (
            <Button
              key={index}
              variant="outline"
              size="sm"
              onClick={action.action}
              disabled={action.disabled}
              className="flex items-center gap-1"
            >
              <action.icon className="w-4 h-4" />
              <span className="text-xs">{action.label}</span>
            </Button>
          ))}
        </div>

        {/* Voice Controls */}
        <div className="flex items-center justify-between">
          <Button
            onClick={toggleListening}
            variant={isListening ? "destructive" : "default"}
            size="sm"
            className="flex items-center gap-2"
          >
            {isListening ? (
              <>
                <MicOff className="w-4 h-4" />
                Stop Listening
              </>
            ) : (
              <>
                <Mic className="w-4 h-4" />
                Start Listening
              </>
            )}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowCommands(!showCommands)}
            className="text-xs"
          >
            {showCommands ? 'Hide' : 'Show'} Commands
          </Button>
        </div>

        {/* Last Command */}
        {lastCommand && (
          <div className="text-xs bg-slate-700/50 rounded p-2">
            <span className="text-slate-400">Last command:</span>
            <span className="ml-2 text-slate-200 font-mono">"{lastCommand}"</span>
          </div>
        )}

        {/* Current Recipe Context */}
        <div className="text-xs space-y-1">
          <div className="flex justify-between">
            <span className="text-slate-400">Recipe:</span>
            <span className="text-slate-200">{recipeStore.meta.title || 'No recipe loaded'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Step:</span>
            <span className="text-slate-200">
              {recipeStore.currentStep + 1} of {recipeStore.steps.length}
            </span>
          </div>
          {currentTimer && (
            <div className="flex justify-between">
              <span className="text-slate-400">Timer:</span>
              <span className="text-slate-200">
                {Math.floor(currentTimer.remaining / 60)}:{(currentTimer.remaining % 60).toString().padStart(2, '0')}
                {currentTimer.isActive && <span className="ml-1 text-green-400">●</span>}
              </span>
            </div>
          )}
        </div>

        {/* Command Reference */}
        {showCommands && (
          <div className="space-y-2 text-xs">
            <h4 className="font-medium text-sm text-slate-200">Voice Commands:</h4>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {voiceCommands.map((cmd, index) => (
                <div key={index} className="flex justify-between items-start gap-2 p-2 bg-slate-700/30 rounded">
                  <code className="text-primary font-mono text-xs">{cmd.phrase}</code>
                  <span className="text-slate-400 text-right text-xs">{cmd.action}</span>
                </div>
              ))}
            </div>
            
            <div className="mt-3 p-2 bg-blue-900/20 rounded border border-blue-700/30">
              <p className="text-xs text-blue-300">
                <strong>Tip:</strong> Speak naturally to Zest. Unrecognized commands are sent to the chatbot.
              </p>
            </div>
          </div>
        )}

        {/* Test Voice */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => speak('Voice assistant is ready. Try saying next step, start timer, or ask Zest a question.')}
          className="w-full text-xs"
        >
          Test Voice Output
        </Button>
      </CardContent>
    </Card>
  );
}