import React, { useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { iconMap } from "@/lib/iconMap";
import { motion, AnimatePresence } from "framer-motion";
import AdaptiveAssistant from "@/components/AdaptiveAssistant";

interface FloatingChatButtonProps {
  className?: string;
  variant?: "floating" | "fixed";
  currentRecipe?: any;
  currentMode?: string;
  onRecipeUpdate?: (updatedRecipe: any) => void;
}

export default function FloatingChatButton({ className = "", variant = "floating", currentRecipe, currentMode, onRecipeUpdate }: FloatingChatButtonProps) {
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

        {/* Chat Panel - Portal to Body */}
        {typeof window !== "undefined" && createPortal(
          <AnimatePresence>
            {isChatOpen && (
              <>
                {/* Desktop Backdrop */}
                <motion.div
                  className="fixed inset-0 bg-black/60 backdrop-blur-sm hidden md:block"
                  style={{ 
                    zIndex: 2147483647,
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0
                  }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={handleCloseChat}
                />
                
                {/* Slide-out Panel */}
                <motion.div
                  className="bg-slate-900 shadow-2xl flex flex-col"
                  style={{ 
                    zIndex: 2147483647,
                    position: 'fixed',
                    top: 0,
                    right: 0,
                    bottom: 0,
                    left: typeof window !== 'undefined' && window.innerWidth >= 768 ? 'auto' : 0,
                    width: typeof window !== 'undefined' && window.innerWidth >= 768 ? '384px' : '100%',
                    height: '100vh'
                  }}
                  initial={{ x: "100%" }}
                  animate={{ x: 0 }}
                  exit={{ x: "100%" }}
                  transition={{ 
                    type: "spring", 
                    stiffness: 300, 
                    damping: 30 
                  }}
                >
                  {/* Retract Arrow - Mobile Only */}
                  <div 
                    className="md:hidden absolute left-0 top-1/2 -translate-y-1/2 -translate-x-full"
                    style={{ zIndex: 2147483647 }}
                  >
                    <Button
                      onClick={handleCloseChat}
                      className="bg-slate-800 hover:bg-slate-700 text-white p-2 rounded-l-lg shadow-lg border-r-0"
                      size="sm"
                    >
                      <iconMap.chevronRight className="w-4 h-4" />
                    </Button>
                  </div>

                  <AdaptiveAssistant
                    isOpen={isChatOpen}
                    onClose={handleCloseChat}
                    currentRecipe={currentRecipe}
                    currentMode={currentMode as "discover" | "plan" | "capture" | "cookbook"}
                    onRecipeUpdate={onRecipeUpdate}
                    enableVoice={true}
                    enableLiveAudio={false}
                  />
                </motion.div>
              </>
            )}
          </AnimatePresence>,
          document.body
        )}
      </>
    );
  }

  return (
    <>
      {/* Floating Chat Button - Portal to ensure highest z-index */}
      {typeof window !== "undefined" && createPortal(
        <motion.div
          style={{ 
            position: 'fixed',
            bottom: '5rem',
            right: '1.5rem',
            zIndex: 1000
          }}
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
        </motion.div>,
        document.body
      )}

      {/* Chat Panel - Portal to Body */}
      {typeof window !== "undefined" && createPortal(
        <AnimatePresence>
          {isChatOpen && (
            <>
              {/* Desktop Backdrop */}
              <motion.div
                className="fixed inset-0 bg-black/60 backdrop-blur-sm hidden md:block"
                style={{ 
                  zIndex: 1050,
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0
                }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={handleCloseChat}
              />
              
              {/* Slide-out Panel */}
              <motion.div
                className="bg-slate-900 shadow-2xl flex flex-col floating-chat-panel"
                style={{ 
                  zIndex: 1060,
                  position: 'fixed',
                  top: 0,
                  right: 0,
                  bottom: 0,
                  left: 0,
                  height: '100vh'
                }}
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                transition={{ 
                  type: "spring", 
                  stiffness: 300, 
                  damping: 30 
                }}
              >
                {/* Retract Arrow - Mobile Only */}
                <div 
                  className="md:hidden absolute left-0 top-1/2 -translate-y-1/2 -translate-x-full"
                  style={{ zIndex: 1070 }}
                >
                  <Button
                    onClick={handleCloseChat}
                    className="bg-slate-800 hover:bg-slate-700 text-white p-2 rounded-l-lg shadow-lg border-r-0"
                    size="sm"
                  >
                    <iconMap.chevronRight className="w-4 h-4" />
                  </Button>
                </div>

                <AdaptiveAssistant
                  isOpen={isChatOpen}
                  onClose={handleCloseChat}
                  currentRecipe={currentRecipe}
                  currentMode={currentMode as "discover" | "plan" | "capture" | "cookbook"}
                  onRecipeUpdate={onRecipeUpdate}
                  enableVoice={true}
                  enableLiveAudio={false}
                />
              </motion.div>
            </>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}