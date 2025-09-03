import { useState } from 'react';
import GlobalHeader from "@/components/GlobalHeader";
import GlobalFooter from "@/components/GlobalFooter";
import ChatBot from "@/components/ChatBot";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageCircle, ChefHat, Sparkles } from "lucide-react";

export default function ChatMode() {
  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <GlobalHeader />
      
      <main className="container mx-auto px-4 pt-20 pb-24">
        <div className="max-w-4xl mx-auto">
          {/* Header Section */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <div className="bg-orange-500/20 p-4 rounded-full">
                <MessageCircle className="w-8 h-8 text-orange-400" />
              </div>
            </div>
            <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent">
              Chat Mode
            </h1>
            <p className="text-slate-300 text-lg max-w-2xl mx-auto">
              Have a conversation with Zest, your AI culinary companion. Ask questions, get cooking advice, or request recipe modifications in real-time.
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader className="text-center">
                <div className="bg-blue-500/20 p-3 rounded-full w-fit mx-auto mb-3">
                  <ChefHat className="w-6 h-6 text-blue-400" />
                </div>
                <CardTitle className="text-lg text-white">Cooking Guidance</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-300 text-sm text-center">
                  Get step-by-step cooking advice, technique tips, and ingredient substitutions
                </p>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader className="text-center">
                <div className="bg-purple-500/20 p-3 rounded-full w-fit mx-auto mb-3">
                  <Sparkles className="w-6 h-6 text-purple-400" />
                </div>
                <CardTitle className="text-lg text-white">Recipe Magic</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-300 text-sm text-center">
                  Create new recipes from scratch or modify existing ones with natural conversation
                </p>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader className="text-center">
                <div className="bg-green-500/20 p-3 rounded-full w-fit mx-auto mb-3">
                  <MessageCircle className="w-6 h-6 text-green-400" />
                </div>
                <CardTitle className="text-lg text-white">Smart Responses</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-300 text-sm text-center">
                  Ask anything food-related and get intelligent, contextual responses instantly
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Chat Interface */}
          <div className="bg-slate-800/30 rounded-xl border border-slate-700 overflow-hidden">
            <ChatBot 
              currentMode="chef"
              isOpen={true}
            />
          </div>
        </div>
      </main>

      <GlobalFooter currentMode="chat" />
    </div>
  );
}