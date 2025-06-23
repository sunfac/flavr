import { useEffect, useRef, useState } from 'react';
import { useRecipeStore } from '@/stores/recipeStore';
import { useTimerStore } from '@/stores/timerStore';

interface VoiceCommandsConfig {
  onChatMessage?: (message: string) => void;
  isEnabled?: boolean;
  voiceSettings?: {
    rate: number;
    pitch: number;
    volume: number;
  };
}

export function useVoiceCommands({ onChatMessage, isEnabled = true, voiceSettings = { rate: 0.85, pitch: 0.95, volume: 0.75 } }: VoiceCommandsConfig = {}) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [lastCommand, setLastCommand] = useState<string>('');
  const recognitionRef = useRef<any>(null);
  
  const recipeStore = useRecipeStore();
  const timerStore = useTimerStore();

  useEffect(() => {
    // Check for browser support
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn('Speech recognition not supported in this browser');
      setIsSupported(false);
      return;
    }

    setIsSupported(true);

    // Initialize speech recognition
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
      console.log('Voice recognition started');
    };

    recognition.onend = () => {
      setIsListening(false);
      console.log('Voice recognition ended');
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
    };

    recognition.onresult = (event: any) => {
      const lastResult = event.results[event.results.length - 1];
      if (lastResult.isFinal) {
        const command = lastResult[0].transcript.toLowerCase().trim();
        setLastCommand(command);
        processVoiceCommand(command);
      }
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const processVoiceCommand = (command: string) => {
    console.log('Processing voice command:', command);

    // Navigation commands
    if (command.includes('next step') || command.includes('go to next')) {
      const nextStep = recipeStore.currentStep + 1;
      if (nextStep < recipeStore.steps.length) {
        recipeStore.setCurrentStep(nextStep);
        speak(`Moving to step ${nextStep + 1}`);
      } else {
        speak('You are already at the last step');
      }
      return;
    }

    if (command.includes('previous step') || command.includes('go back')) {
      const prevStep = recipeStore.currentStep - 1;
      if (prevStep >= 0) {
        recipeStore.setCurrentStep(prevStep);
        speak(`Moving to step ${prevStep + 1}`);
      } else {
        speak('You are already at the first step');
      }
      return;
    }

    if (command.includes('read step') || command.includes('what is this step')) {
      const currentStepData = recipeStore.steps[recipeStore.currentStep];
      if (currentStepData) {
        speak(`Step ${recipeStore.currentStep + 1}: ${currentStepData.title}. ${currentStepData.description}`);
      }
      return;
    }

    // Timer commands
    if (command.includes('start timer') || command.includes('set timer')) {
      const currentStepData = recipeStore.steps[recipeStore.currentStep];
      if (currentStepData && currentStepData.duration) {
        timerStore.startTimer(currentStepData.id, currentStepData.duration * 60); // Convert minutes to seconds
        speak(`Timer started for ${currentStepData.duration} minutes`);
      } else {
        speak('No timer available for this step');
      }
      return;
    }

    if (command.includes('pause timer') || command.includes('stop timer')) {
      const currentStepData = recipeStore.steps[recipeStore.currentStep];
      if (currentStepData) {
        timerStore.pauseTimer(currentStepData.id);
        speak('Timer paused');
      }
      return;
    }

    if (command.includes('resume timer')) {
      const currentStepData = recipeStore.steps[recipeStore.currentStep];
      if (currentStepData) {
        timerStore.resumeTimer(currentStepData.id);
        speak('Timer resumed');
      }
      return;
    }

    // Ingredient commands
    if (command.includes('mark ingredient') || command.includes('check ingredient')) {
      const ingredientMatch = command.match(/(?:mark|check) ingredient (\d+)/);
      if (ingredientMatch) {
        const index = parseInt(ingredientMatch[1]) - 1;
        if (index >= 0 && index < recipeStore.ingredients.length) {
          const ingredient = recipeStore.ingredients[index];
          recipeStore.toggleIngredient(ingredient.id);
          speak(`Ingredient ${index + 1} ${ingredient.checked ? 'unchecked' : 'checked'}`);
        }
      } else {
        speak('Please specify which ingredient number to mark');
      }
      return;
    }

    // Step completion
    if (command.includes('complete step') || command.includes('mark step complete')) {
      recipeStore.markStepComplete(recipeStore.currentStep);
      speak(`Step ${recipeStore.currentStep + 1} marked as complete`);
      return;
    }

    // Recipe overview commands
    if (command.includes('how many steps') || command.includes('total steps')) {
      speak(`This recipe has ${recipeStore.steps.length} steps`);
      return;
    }

    if (command.includes('current step number') || command.includes('which step')) {
      speak(`You are on step ${recipeStore.currentStep + 1} of ${recipeStore.steps.length}`);
      return;
    }

    if (command.includes('recipe title') || command.includes('what recipe')) {
      speak(`You are making ${recipeStore.meta.title}`);
      return;
    }

    // Chat commands - forward to chatbot
    if (command.includes('ask zest') || command.includes('hey zest')) {
      const chatMessage = command.replace(/^(ask zest|hey zest),?\s*/i, '');
      if (chatMessage && onChatMessage) {
        onChatMessage(chatMessage);
        speak('Asking Zest for you');
      }
      return;
    }

    // Fallback - treat as general chat message if no specific command matched
    if (onChatMessage && command.length > 3) {
      onChatMessage(command);
      speak('Sending your message to Zest');
    } else {
      speak('I did not understand that command. Try saying next step, start timer, or ask Zest a question');
    }
  };

  const speak = (text: string) => {
    if ('speechSynthesis' in window) {
      // Cancel any ongoing speech
      speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(text);
      
      // Get available voices and prefer natural-sounding ones
      const voices = speechSynthesis.getVoices();
      
      // Prefer voices with better quality (usually neural/premium voices)
      const preferredVoices = voices.filter(voice => 
        voice.lang.startsWith('en') && (
          voice.name.toLowerCase().includes('neural') ||
          voice.name.toLowerCase().includes('premium') ||
          voice.name.toLowerCase().includes('enhanced') ||
          voice.name.toLowerCase().includes('natural') ||
          voice.name.toLowerCase().includes('aria') ||
          voice.name.toLowerCase().includes('jenny') ||
          voice.name.toLowerCase().includes('guy') ||
          voice.name.toLowerCase().includes('samantha') ||
          voice.name.toLowerCase().includes('alex') ||
          voice.name.toLowerCase().includes('karen') ||
          voice.name.toLowerCase().includes('daniel')
        )
      );
      
      // Fallback to any English voice if no preferred ones found
      const englishVoices = voices.filter(voice => voice.lang.startsWith('en'));
      
      if (preferredVoices.length > 0) {
        utterance.voice = preferredVoices[0];
      } else if (englishVoices.length > 0) {
        utterance.voice = englishVoices[0];
      }
      
      // Use dynamic voice settings
      utterance.rate = voiceSettings.rate;
      utterance.pitch = voiceSettings.pitch;
      utterance.volume = voiceSettings.volume;
      
      // Add slight pauses for natural flow
      const processedText = text
        .replace(/\./g, '. ') // Add pause after periods
        .replace(/,/g, ', ') // Add pause after commas
        .replace(/:/g, ': ') // Add pause after colons
        .replace(/\s+/g, ' ') // Clean up extra spaces
        .trim();
      
      utterance.text = processedText;
      
      // Error handling
      utterance.onerror = (event) => {
        console.error('Speech synthesis error:', event);
      };
      
      speechSynthesis.speak(utterance);
    }
  };

  const startListening = () => {
    if (recognitionRef.current && isSupported && isEnabled) {
      try {
        recognitionRef.current.start();
      } catch (error) {
        console.error('Error starting speech recognition:', error);
      }
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  };

  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  return {
    isListening,
    isSupported,
    lastCommand,
    startListening,
    stopListening,
    toggleListening,
    speak
  };
}

// Extend Window interface for TypeScript
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}