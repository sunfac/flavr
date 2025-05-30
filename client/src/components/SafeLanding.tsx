import React from 'react';
import { Button } from "@/components/ui/button";

export default function SafeLanding() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
      <div className="text-center text-white max-w-2xl mx-auto">
        <h1 className="text-5xl font-bold mb-6 bg-gradient-to-r from-orange-400 to-purple-400 bg-clip-text text-transparent">
          Flavr
        </h1>
        <p className="text-xl mb-8 text-purple-200">
          AI-Powered Recipe Generation Platform
        </p>
        <div className="space-y-4">
          <Button 
            onClick={() => window.location.href = '/login'}
            className="bg-orange-500 hover:bg-orange-600 text-white px-8 py-3 rounded-xl text-lg"
          >
            Get Started
          </Button>
          <p className="text-sm text-purple-300">
            Three cooking modes: Shopping, Fridge to Fork, Chef Assist
          </p>
        </div>
      </div>
    </div>
  );
}