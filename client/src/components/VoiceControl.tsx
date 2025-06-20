import { useState } from 'react';
import { Mic, MicOff, Volume2, VolumeX } from 'lucide-react';
import { useVoiceCommands } from '@/hooks/useVoiceCommands';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface VoiceControlProps {
  onChatMessage?: (message: string) => void;
  className?: string;
}

export default function VoiceControl({ onChatMessage, className }: VoiceControlProps) {
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(true);
  const [showCommands, setShowCommands] = useState(false);
  
  const {
    isListening,
    isSupported,
    lastCommand,
    toggleListening,
    speak
  } = useVoiceCommands({
    onChatMessage,
    isEnabled: isVoiceEnabled
  });

  if (!isSupported) {
    return (
      <div className={cn("text-xs text-muted-foreground p-2", className)}>
        Voice commands not supported in this browser
      </div>
    );
  }

  const voiceCommands = [
    { command: '"Next step"', description: 'Move to next cooking step' },
    { command: '"Previous step"', description: 'Go back to previous step' },
    { command: '"Read step"', description: 'Read current step aloud' },
    { command: '"Start timer"', description: 'Start timer for current step' },
    { command: '"Pause timer"', description: 'Pause active timer' },
    { command: '"Complete step"', description: 'Mark current step as done' },
    { command: '"Ask Zest [question]"', description: 'Send message to chatbot' },
    { command: '"How many steps"', description: 'Get total step count' },
    { command: '"Recipe title"', description: 'Hear recipe name' }
  ];

  return (
    <div className={cn("space-y-3", className)}>
      {/* Voice Control Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Volume2 className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium">Voice Control</span>
          {isListening && (
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              <span className="text-xs text-red-600">Listening</span>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsVoiceEnabled(!isVoiceEnabled)}
            className="h-8 w-8 p-0"
          >
            {isVoiceEnabled ? (
              <Volume2 className="w-4 h-4" />
            ) : (
              <VolumeX className="w-4 h-4 text-muted-foreground" />
            )}
          </Button>
          
          <Button
            variant={isListening ? "destructive" : "default"}
            size="sm"
            onClick={toggleListening}
            disabled={!isVoiceEnabled}
            className="h-8 w-8 p-0"
          >
            {isListening ? (
              <MicOff className="w-4 h-4" />
            ) : (
              <Mic className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Last Command Display */}
      {lastCommand && (
        <div className="text-xs bg-muted/50 rounded p-2">
          <span className="text-muted-foreground">Last command:</span>
          <span className="ml-2 font-mono">"{lastCommand}"</span>
        </div>
      )}

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-1">
        <Button
          variant="outline"
          size="sm"
          onClick={() => speak('Voice commands are ready. Say next step, start timer, or ask Zest a question.')}
          className="text-xs h-7"
        >
          Test Voice
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowCommands(!showCommands)}
          className="text-xs h-7"
        >
          {showCommands ? 'Hide' : 'Show'} Commands
        </Button>
      </div>

      {/* Command Reference */}
      {showCommands && (
        <div className="space-y-2 text-xs">
          <h4 className="font-medium text-sm">Available Voice Commands:</h4>
          <div className="space-y-1">
            {voiceCommands.map((cmd, index) => (
              <div key={index} className="flex justify-between items-start gap-2 p-2 bg-muted/30 rounded">
                <code className="text-primary font-mono">{cmd.command}</code>
                <span className="text-muted-foreground text-right">{cmd.description}</span>
              </div>
            ))}
          </div>
          
          <div className="mt-3 p-2 bg-blue-50 dark:bg-blue-950/20 rounded border border-blue-200 dark:border-blue-800">
            <p className="text-xs text-blue-700 dark:text-blue-300">
              <strong>Tip:</strong> You can also speak naturally to Zest. Any unrecognized command will be sent to the chatbot.
            </p>
          </div>
        </div>
      )}

      {/* Status Indicators */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Status: {isListening ? 'Listening' : 'Ready'}</span>
        <span>Voice: {isVoiceEnabled ? 'On' : 'Off'}</span>
      </div>
    </div>
  );
}