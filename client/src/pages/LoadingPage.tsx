import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ChefHat } from "lucide-react";

const culinaryFacts = [
  "The word 'recipe' comes from the Latin 'recipere', meaning 'to take'",
  "Vanilla is the second most expensive spice after saffron",
  "Honey never spoils - archaeologists have found edible honey in ancient Egyptian tombs",
  "The fear of cooking is called 'mageirocophobia'",
  "Carrots were originally purple, not orange",
  "The microwave was invented by accident whilst working on radar technology",
  "Chocolate was once used as currency by the Aztecs",
  "A chef's hat traditionally has 100 pleats representing 100 ways to cook an egg",
  "Tomatoes were once thought to be poisonous by Europeans",
  "The sandwich was named after the Earl of Sandwich in 1762",
  "Salt was once so valuable it was used as currency",
  "The average person eats about 35 tonnes of food in their lifetime",
  "Lobster was once considered poor people's food",
  "The fortune biscuit was actually invented in San Francisco",
  "Tomato ketchup was sold as medicine in the 1830s",
  "Bananas are berries, but strawberries aren't",
  "White chocolate isn't technically chocolate as it contains no cocoa solids",
  "The Caesar salad was invented in Mexico, not Italy",
  "Pineapples take two years to grow",
  "The hottest part of a chilli pepper is not the seeds, but the white pith",
  "Nutmeg can be toxic in large quantities",
  "Apples float because they are 25% air",
  "The most stolen food in the world is cheese",
  "Rhubarb leaves are poisonous but the stalks are edible",
  "Almonds are not nuts - they're seeds from stone fruits",
  "One gram of saffron requires about 150 flowers to produce",
  "Wasabi and horseradish are from the same plant family",
  "The spiciness of peppers is measured in Scoville Heat Units",
  "Avocados are fruits, not vegetables, and they're technically berries",
  "Coffee beans are actually seeds, not beans",
  "Raw cashews are toxic and must be processed before eating",
  "The first soup was likely made around 20,000 years ago",
  "Pasta wasn't invented in Italy - it came from China via Marco Polo",
  "The ice cream cone was invented at the 1904 World's Fair",
  "Chips originated in Belgium, not France",
  "Tea was discovered in China over 4,000 years ago by accident",
  "The oldest known recipe is for beer, dating back to 5,000 BCE",
  "Worcestershire sauce contains anchovies - that's why it's so savoury",
  "Baking powder and baking soda are not the same thing",
  "The Michelin star system was created by a tyre company",
  "Gelato has less air than ice cream, making it denser and more flavourful",
  "The phrase 'brain food' comes from fish being rich in omega-3 fatty acids",
  "Cornflakes were invented as a health food to reduce certain urges",
  "The world's most expensive coffee comes from elephant dung",
  "Bubble wrap was originally invented as wallpaper",
  "McDonald's once made bubblegum-flavoured broccoli",
  "The pretzel shape represents arms crossed in prayer",
  "Spam stands for 'Specially Processed American Meat'",
  "The sandwich was invented so the Earl could eat whilst playing cards",
  "Twinkies originally had banana filling, not vanilla",
  "The first restaurant was opened in Paris in 1765",
  "MSG was discovered by a Japanese scientist in 1908",
  "Coca-Cola was originally green and sold as a medicine",
  "The oldest cookbook was written in ancient Rome by Apicius",
  "Quinoa is pronounced 'KEEN-wah', not 'kwin-OH-ah'",
  "The world's largest pizza was over 13,000 square feet",
  "Butter was once used as currency in Norway",
  "The fortune biscuit's fortune is inserted after baking whilst still warm",
  "Kobe beef cattle are massaged with sake for tenderness",
  "The colour of an egg yolk depends on the hen's diet",
  "Honey is the only food that contains everything needed to sustain life",
  "The sandwich generation was named after people caught between caring duties",
  "Basil repels flies and mosquitoes naturally",
  "The term 'superfood' has no official nutritional definition",
  "Fish and chips was brought to Britain by Jewish immigrants",
  "The full English breakfast dates back to the Victorian era",
  "Afternoon tea was invented by the Duchess of Bedford in 1840",
  "Marmite was invented as a way to use brewery waste",
  "The Yorkshire pudding was originally served as a starter",
  "Haggis was actually invented in England, not Scotland",
  "The Cornish pasty has Protected Geographical Indication status",
  "Stilton cheese can only be made in three counties",
  "The roast dinner tradition dates back to medieval times"
];

interface LoadingPageProps {
  title?: string;
  subtitle?: string;
}

export default function LoadingPage({ 
  title = "Crafting Your Perfect Recipe", 
  subtitle = "Our AI chef is working its magic..." 
}: LoadingPageProps) {
  const [shuffledFacts, setShuffledFacts] = useState<string[]>([]);
  const [currentFact, setCurrentFact] = useState(0);

  // Shuffle facts on component mount
  useEffect(() => {
    const shuffled = [...culinaryFacts].sort(() => Math.random() - 0.5);
    setShuffledFacts(shuffled);
  }, []);

  useEffect(() => {
    if (shuffledFacts.length === 0) return;
    
    const interval = setInterval(() => {
      setCurrentFact(prev => (prev + 1) % shuffledFacts.length);
    }, 4000);

    return () => clearInterval(interval);
  }, [shuffledFacts]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col items-center justify-center p-4 sm:p-6">
      {/* Main Loading Animation */}
      <div className="text-center mb-8 sm:mb-12">
        <div className="mb-6 sm:mb-8">
          <div className="w-20 h-20 sm:w-24 sm:h-24 mx-auto bg-gradient-to-r from-orange-500 to-red-500 rounded-full flex items-center justify-center shadow-2xl">
            <ChefHat className="w-10 h-10 sm:w-12 sm:h-12 text-white" />
          </div>
        </div>

        <motion.h1 
          className="text-2xl sm:text-4xl font-bold text-white mb-3 sm:mb-4 px-4"
          animate={{ opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          {title}
        </motion.h1>
        
        <motion.p 
          className="text-lg sm:text-xl text-slate-300 px-4"
          animate={{ opacity: [0.5, 0.8, 0.5] }}
          transition={{ duration: 2.5, repeat: Infinity }}
        >
          {subtitle}
        </motion.p>
      </div>

      {/* Progress Indicator */}
      <div className="w-full max-w-sm sm:max-w-md mb-8 sm:mb-12 px-4">
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
        className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-4 sm:p-8 max-w-xs sm:max-w-2xl mx-auto border border-slate-700"
        animate={{ scale: [0.98, 1.02, 0.98] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      >
        <motion.h3 
          className="text-orange-400 font-semibold text-base sm:text-lg mb-3 sm:mb-4 text-center"
          animate={{ opacity: [0.8, 1, 0.8] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          Did You Know?
        </motion.h3>
        
        <motion.p
          key={currentFact}
          className="text-slate-200 text-center text-sm sm:text-base lg:text-lg leading-relaxed min-h-[3rem] sm:min-h-[2rem] flex items-center justify-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.8 }}
        >
          {shuffledFacts[currentFact] || "Loading culinary wisdom..."}
        </motion.p>
      </motion.div>

      {/* Loading Dots */}
      <div className="flex space-x-2 mt-6 sm:mt-8">
        {[0, 1, 2].map((index) => (
          <motion.div
            key={index}
            className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-orange-500 rounded-full"
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