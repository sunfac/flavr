import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { iconMap } from "@/lib/iconMap";
import { motion, AnimatePresence } from "framer-motion";
import ChatBot from "@/components/ChatBot";

interface FloatingChatButtonProps {
  className?: string;
  variant?: "floating" | "fixed";
}

export default function FloatingChatButton({ className = "", variant = "floating" }: FloatingChatButtonProps) {
  const [isChatOpen, setIsChatOpen] = useState(false);

  const handleToggleChat = () => {
    setIsChatOpen(!isChatOpen);
  };

  const handleCloseChat = () => {
    setIsChatOpen(false);
  };

  if (variant === "fixed") {
    return (
      <>
        {/* Fixed Chat Button for Mode Selection - Card Style */}
        <div className={`relative ${className}`}>
          <div className="relative overflow-hidden transition-all duration-300 group bg-background border border-border rounded-lg shadow-lg hover:shadow-xl hover:scale-105 cursor-pointer dark:bg-gray-800/50 dark:border-gray-700 max-w-sm">
            {/* Gradient overlay on hover */}
            <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 to-orange-600/10 dark:from-orange-500/20 dark:to-orange-600/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            
            {/* Card Content */}
            <div className="relative text-center py-4 md:py-6 px-6" onClick={handleToggleChat}>
              {/* Chef Hat Icon */}
              <div className="p-3 md:p-4 rounded-full bg-background/80 backdrop-blur-sm inline-flex mx-auto mb-3 md:mb-4 border-2 border-orange-500/20 text-orange-500 dark:text-orange-400">
                <iconMap.chefHat className="w-8 h-8 md:w-10 md:h-10" />
              </div>
              
              {/* Title */}
              <h3 className="text-xl md:text-2xl font-bold mb-2 text-foreground">Talk to Your Private Chef</h3>
              
              {/* Description */}
              <p className="text-sm md:text-base text-muted-foreground leading-relaxed mb-4">
                Get instant cooking advice, recipe suggestions, and personalized culinary guidance
              </p>
              
              {/* Action Button */}
              <Button
                className="w-full transition-all duration-200 font-semibold group-hover:translate-y-[-2px] shadow-lg hover:shadow-xl bg-orange-600 hover:bg-orange-700 text-white"
                size="lg"
              >
                Start Chatting
                <iconMap.arrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>
          </div>
        </div>

        {/* Chat Modal - Mobile Optimized */}
        <AnimatePresence>
          {isChatOpen && (
            <motion.div
              className="fixed inset-0 z-50 flex items-center justify-center md:p-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              {/* Backdrop - only visible on desktop */}
              <motion.div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm hidden md:block"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={handleCloseChat}
              />

              {/* Chat Panel - Full screen on mobile, modal on desktop */}
              <motion.div
                className="relative w-full h-screen md:h-[600px] md:max-w-md bg-slate-900 md:rounded-2xl shadow-2xl border-0 md:border border-slate-700/50 overflow-hidden"
                initial={{ 
                  scale: typeof window !== 'undefined' && window.innerWidth < 768 ? 1 : 0.8, 
                  opacity: 0, 
                  y: typeof window !== 'undefined' && window.innerWidth < 768 ? 0 : 20 
                }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ 
                  scale: typeof window !== 'undefined' && window.innerWidth < 768 ? 1 : 0.8, 
                  opacity: 0, 
                  y: typeof window !== 'undefined' && window.innerWidth < 768 ? 0 : 20 
                }}
                transition={{ 
                  type: "spring", 
                  stiffness: 300, 
                  damping: 30 
                }}
              >
                <ChatBot
                  isOpen={isChatOpen}
                  onClose={handleCloseChat}
                  currentRecipe={undefined}
                />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </>
    );
  }

  return (
    <>
      {/* Floating Chat Button */}
      <motion.div
        className={`fixed bottom-6 right-6 z-50 ${className}`}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ 
          type: "spring", 
          stiffness: 260, 
          damping: 20,
          delay: 1.5 // Delay appearance so it doesn't interfere with page load
        }}
      >
        <div className="relative group">
          {/* Glow effects */}
          <div className="absolute -inset-3 bg-gradient-to-r from-orange-500/30 via-amber-500/20 to-orange-500/30 rounded-full blur-xl opacity-60 animate-pulse"></div>
          <div className="absolute -inset-1 bg-gradient-to-r from-orange-400/40 to-amber-400/40 rounded-full blur-lg opacity-80 group-hover:opacity-100 transition-opacity duration-300"></div>
          
          {/* Main Button */}
          <Button
            onClick={handleToggleChat}
            className="relative w-16 h-16 rounded-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-400 hover:to-orange-500 shadow-2xl hover:shadow-orange-500/50 hover:scale-110 transition-all duration-300 text-white border-0 p-0 flex items-center justify-center group"
            size="lg"
          >
            <iconMap.chefHat className="w-7 h-7 group-hover:scale-110 transition-transform duration-300" />
          </Button>

          {/* Tooltip */}
          <motion.div
            className="absolute bottom-full right-0 mb-3 px-4 py-2 bg-slate-800/95 backdrop-blur-sm text-white text-sm rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap pointer-events-none"
            initial={{ opacity: 0, y: 10 }}
            whileHover={{ opacity: 1, y: 0 }}
          >
            Talk to Your Private Chef
            <div className="absolute top-full right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-slate-800/95"></div>
          </motion.div>

          {/* Notification Badge for new users */}
          <motion.div
            className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-r from-green-400 to-green-500 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-lg"
            initial={{ scale: 0 }}
            animate={{ 
              scale: [0, 1.2, 1],
              rotate: [0, 10, -10, 0]
            }}
            transition={{ 
              delay: 2,
              duration: 0.6,
              type: "spring",
              stiffness: 300
            }}
          >
            !
          </motion.div>
        </div>
      </motion.div>

      {/* Chat Modal - Mobile Optimized */}
      <AnimatePresence>
        {isChatOpen && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center md:p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {/* Backdrop - only visible on desktop */}
            <motion.div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm hidden md:block"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleCloseChat}
            />

            {/* Chat Panel - Full screen on mobile, modal on desktop */}
            <motion.div
              className="relative w-full h-screen md:h-[600px] md:max-w-md bg-slate-900 md:rounded-2xl shadow-2xl border-0 md:border border-slate-700/50 overflow-hidden"
              initial={{ 
                scale: typeof window !== 'undefined' && window.innerWidth < 768 ? 1 : 0.8, 
                opacity: 0, 
                y: typeof window !== 'undefined' && window.innerWidth < 768 ? 0 : 20 
              }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ 
                scale: typeof window !== 'undefined' && window.innerWidth < 768 ? 1 : 0.8, 
                opacity: 0, 
                y: typeof window !== 'undefined' && window.innerWidth < 768 ? 0 : 20 
              }}
              transition={{ 
                type: "spring", 
                stiffness: 300, 
                damping: 30 
              }}
            >
              <ChatBot
                isOpen={isChatOpen}
                onClose={handleCloseChat}
                currentRecipe={undefined}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}