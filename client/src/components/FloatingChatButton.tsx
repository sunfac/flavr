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
        {/* Fixed Chat Button for Mode Selection */}
        <div className={`relative ${className}`}>
          <div className="relative group">
            {/* Glow effects */}
            <div className="absolute -inset-2 bg-gradient-to-r from-orange-500/20 via-amber-500/15 to-orange-500/20 rounded-xl blur-xl opacity-60 animate-pulse"></div>
            <div className="absolute -inset-1 bg-gradient-to-r from-orange-400/30 to-amber-400/30 rounded-xl blur-lg opacity-80 group-hover:opacity-100 transition-opacity duration-300"></div>
            
            {/* Main Button */}
            <Button
              onClick={handleToggleChat}
              className="relative px-8 py-4 text-lg font-bold bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-400 hover:to-orange-500 shadow-2xl hover:shadow-orange-500/50 hover:scale-105 transition-all duration-300 text-white border-0 rounded-xl group flex items-center gap-3"
              size="lg"
            >
              <iconMap.chefHat className="w-6 h-6 group-hover:scale-110 transition-transform duration-300" />
              <span className="relative z-10">Talk to Your Private Chef Now</span>
            </Button>
          </div>
        </div>

        {/* Chat Modal */}
        <AnimatePresence>
          {isChatOpen && (
            <motion.div
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              {/* Backdrop */}
              <motion.div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={handleCloseChat}
              />

              {/* Chat Panel */}
              <motion.div
                className="relative w-full max-w-md h-[600px] bg-slate-900 rounded-2xl shadow-2xl border border-slate-700/50 overflow-hidden"
                initial={{ scale: 0.8, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.8, opacity: 0, y: 20 }}
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

      {/* Chat Modal */}
      <AnimatePresence>
        {isChatOpen && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {/* Backdrop */}
            <motion.div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleCloseChat}
            />

            {/* Chat Panel */}
            <motion.div
              className="relative w-full max-w-md h-[600px] bg-slate-900 rounded-2xl shadow-2xl border border-slate-700/50 overflow-hidden"
              initial={{ scale: 0.8, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0, y: 20 }}
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