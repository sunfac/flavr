import { motion } from "framer-motion";

interface LoadingProps {
  message?: string;
  isFullScreen?: boolean;
}

export default function Loading({ message = "Whisking up something delicious...", isFullScreen = true }: LoadingProps) {
  const getDetailMessage = (msg: string) => {
    if (msg.includes("profile")) return "Getting your account information...";
    if (msg.includes("ingredients")) return "Our AI chef is analyzing your ingredients and finding the best combinations.";
    if (msg.includes("bespoke")) return "Crafting a personalized culinary experience tailored to your exact specifications.";
    if (msg.includes("settings")) return "Loading your preferences and account details...";
    if (msg.includes("subscription")) return "Preparing your Flavr+ upgrade options...";
    return "Our AI chef is analyzing your preferences and crafting something delicious just for you.";
  };

  if (!isFullScreen) {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="flex items-center justify-center p-8"
      >
        <div className="text-center space-y-4">
          <div className="relative">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="w-12 h-12 mx-auto border-4 border-primary/20 border-t-primary rounded-full"
            />
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="absolute inset-0 flex items-center justify-center text-2xl"
            >
              👨‍🍳
            </motion.div>
          </div>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-muted-foreground font-medium"
          >
            {message}
          </motion.p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-background/90 backdrop-blur-lg flex items-center justify-center z-50"
    >
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="glass bg-card/95 p-8 rounded-3xl shadow-2xl text-center max-w-sm mx-4 border border-border/50"
      >
        <div className="space-y-6">
          <motion.div className="relative mx-auto w-16 h-16">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
              className="absolute inset-0 rounded-full border-4 border-primary/20"
            />
            <motion.div
              animate={{ rotate: -360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="absolute inset-2 rounded-full border-3 border-primary border-t-transparent"
            />
            <motion.div
              animate={{ 
                scale: [1, 1.1, 1],
                rotate: [0, 10, -10, 0]
              }}
              transition={{ duration: 2, repeat: Infinity }}
              className="absolute inset-0 flex items-center justify-center text-3xl"
            >
              🍳
            </motion.div>
          </motion.div>
          
          <div className="space-y-3">
            <motion.h3
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-foreground font-semibold text-lg font-playfair"
            >
              {message.includes("Creating") || message.includes("Finding") || message.includes("Loading") ? message : "Creating your perfect recipe..."}
            </motion.h3>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-muted-foreground text-sm"
            >
              {getDetailMessage(message)}
            </motion.p>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: "100%" }}
              transition={{ duration: 2, repeat: Infinity }}
              className="h-1 bg-gradient-primary rounded-full mx-auto"
            />
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
