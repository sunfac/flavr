import { useState } from 'react';
import { useLocation } from 'wouter';
import GlobalHeader from "@/components/GlobalHeader";
import GlobalFooter from "@/components/GlobalFooter";
import ChatBot from "@/components/ChatBot";

export default function ChatMode() {
  const [, navigate] = useLocation();

  const handleMenuClick = () => {
    // Navigate back to mode selection or home
    navigate('/app');
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <GlobalHeader onMenuClick={handleMenuClick} />
      
      <main className="pt-20 pb-24 h-screen">
        <div className="h-full">
          <ChatBot 
            currentMode="chef"
            isOpen={true}
          />
        </div>
      </main>

      <GlobalFooter currentMode="chat" />
    </div>
  );
}