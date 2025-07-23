import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ChefHat, Clock, Utensils } from "lucide-react";

const culinaryFacts = [
  "The word 'recipe' comes from the Latin 'recipere', meaning 'to take'",
  "Vanilla is the second most expensive spice after saffron",
  "Honey never spoils - archaeologists have found edible honey in ancient Egyptian tombs",
  "The fear of cooking is called 'mageirocophobia'",
  "Carrots were originally purple, not orange",
  "The microwave was invented by accident while working on radar technology",
  "Chocolate was once used as currency by the Aztecs",
  "A chef's hat traditionally has 100 pleats representing 100 ways to cook an egg",
  "Tomatoes were once thought to be poisonous by Europeans",
  "The sandwich was named after the Earl of Sandwich in 1762",
  "Salt was once so valuable it was used as currency",
  "The average person eats about 35 tons of food in their lifetime",
  "Lobster was once considered poor people's food",
  "The fortune cookie was actually invented in San Francisco",
  "Ketchup was sold as medicine in the 1830s"
];

interface LoadingPageProps {
  title?: string;
  subtitle?: string;
}

export default function LoadingPage({ 
  title = "Crafting Your Perfect Recipe", 
  subtitle = "Our AI chef is working its magic..." 
}: LoadingPageProps) {
  const [currentFact, setCurrentFact] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentFact(prev => (prev + 1) % culinaryFacts.length);
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col items-center justify-center p-6">
      {/* Main Loading Animation */}
      <div className="text-center mb-12">
        <motion.div
          className="relative mb-8"
          animate={{ 
            rotate: 360,
            scale: [1, 1.1, 1]
          }}
          transition={{ 
            rotate: { duration: 3, repeat: Infinity, ease: "linear" },
            scale: { duration: 2, repeat: Infinity, ease: "easeInOut" }
          }}
        >
          <div className="w-24 h-24 mx-auto bg-gradient-to-r from-orange-500 to-red-500 rounded-full flex items-center justify-center shadow-2xl">
            <ChefHat className="w-12 h-12 text-white" />
          </div>
          
          {/* Floating cooking icons */}
          <motion.div
            className="absolute -top-4 -right-4"
            animate={{ 
              y: [-10, 10, -10],
              rotate: [0, 180, 360]
            }}
            transition={{ 
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          >
            <Utensils className="w-6 h-6 text-orange-400" />
          </motion.div>
          
          <motion.div
            className="absolute -bottom-4 -left-4"
            animate={{ 
              y: [10, -10, 10],
              rotate: [360, 180, 0]
            }}
            transition={{ 
              duration: 2.5,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          >
            <Clock className="w-6 h-6 text-red-400" />
          </motion.div>
        </motion.div>

        <motion.h1 
          className="text-4xl font-bold text-white mb-4"
          animate={{ opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          {title}
        </motion.h1>
        
        <motion.p 
          className="text-xl text-slate-300"
          animate={{ opacity: [0.5, 0.8, 0.5] }}
          transition={{ duration: 2.5, repeat: Infinity }}
        >
          {subtitle}
        </motion.p>
      </div>

      {/* Progress Indicator */}
      <div className="w-full max-w-md mb-12">
        <div className="bg-slate-700 rounded-full h-2 overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-orange-500 to-red-500"
            animate={{ 
              width: ["0%", "100%"],
              opacity: [0.8, 1, 0.8]
            }}
            transition={{ 
              width: { duration: 4, repeat: Infinity, ease: "easeInOut" },
              opacity: { duration: 1.5, repeat: Infinity }
            }}
          />
        </div>
      </div>

      {/* Did You Know Section */}
      <motion.div
        className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-8 max-w-2xl mx-auto border border-slate-700"
        animate={{ scale: [0.98, 1.02, 0.98] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      >
        <motion.h3 
          className="text-orange-400 font-semibold text-lg mb-4 text-center"
          animate={{ opacity: [0.8, 1, 0.8] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          Did You Know?
        </motion.h3>
        
        <motion.p
          key={currentFact}
          className="text-slate-200 text-center text-lg leading-relaxed"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.8 }}
        >
          {culinaryFacts[currentFact]}
        </motion.p>
      </motion.div>

      {/* Loading Dots */}
      <div className="flex space-x-2 mt-8">
        {[0, 1, 2].map((index) => (
          <motion.div
            key={index}
            className="w-3 h-3 bg-orange-500 rounded-full"
            animate={{ 
              scale: [1, 1.3, 1],
              opacity: [0.5, 1, 0.5]
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              delay: index * 0.2
            }}
          />
        ))}
      </div>
    </div>
  );
}