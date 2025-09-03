import { useState } from 'react';
import { useLocation } from 'wouter';
import GlobalHeader from "@/components/GlobalHeader";
import GlobalFooter from "@/components/GlobalFooter";
import GlobalNavigation from "@/components/GlobalNavigation";
import ChatBot from "@/components/ChatBot";

export default function ChatMode() {
  const [, navigate] = useLocation();
  const [isNavOpen, setIsNavOpen] = useState(false);

  const handleMenuClick = () => {
    setIsNavOpen(true);
  };

  const handleNavClose = () => {
    setIsNavOpen(false);
  };

  const handleChatClose = () => {
    // Navigate back to mode selection when chat is closed
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
            onClose={handleChatClose}
          />
        </div>
      </main>

      <GlobalNavigation 
        isOpen={isNavOpen}
        onClose={handleNavClose}
      />

      <GlobalFooter currentMode="chat" />
    </div>
  );
}