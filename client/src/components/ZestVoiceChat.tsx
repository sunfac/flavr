import React from 'react';
import { GeminiLiveChat } from './GeminiLiveChat';

interface ZestVoiceChatProps {
  onChatMessage?: (message: string) => void;
  onAIResponse?: (response: string) => void;
  className?: string;
  recipeContext?: {
    title: string;
    currentStep: number;
    totalSteps: number;
    ingredients: string[];
    instructions: string[];
  };
}

export default function ZestVoiceChat({ 
  onChatMessage, 
  onAIResponse,
  className = "",
  recipeContext 
}: ZestVoiceChatProps) {
  
  // Convert recipe context to match GeminiLiveChat expected format
  const currentRecipe = recipeContext ? {
    title: recipeContext.title,
    ingredients: recipeContext.ingredients,
    instructions: recipeContext.instructions,
    currentStep: recipeContext.currentStep,
    totalSteps: recipeContext.totalSteps
  } : undefined;

  const handleRecipeUpdate = (updatedRecipe: any) => {
    console.log('Recipe updated via Gemini Live:', updatedRecipe);
    // Handle recipe updates if needed
  };

  return (
    <div className={`flex flex-col space-y-3 ${className}`}>
      {/* Gemini Live Chat - Direct API implementation */}
      <GeminiLiveChat 
        currentRecipe={currentRecipe}
        onRecipeUpdate={handleRecipeUpdate}
      />
    </div>
  );
}