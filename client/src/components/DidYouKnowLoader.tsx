import React, { useEffect, useState } from 'react';

const facts = [
  "Did you know? Tamarind has been used in Indian cooking for over 1,000 years.",
  "Did you know? The Maillard reaction gives grilled meat its rich, umami flavour.",
  "Did you know? Cumin was found in the tombs of the Egyptian pharaohs.",
  "Did you know? Cooking with acid, like lemon or vinegar, brightens dull flavours.",
  "Did you know? Searing meat doesn't lock in juices — but it creates amazing crust.",
  "Did you know? Gochujang is a fermented Korean chilli paste that builds complex heat.",
  "Did you know? 'Umami' is Japanese for 'pleasant savoury taste'.",
  "Did you know? Caramelising onions takes 30 minutes — and transforms the flavour.",
  "Did you know? Salt in desserts enhances sweetness and complexity.",
  "Did you know? Browned butter adds rich, nutty notes to sauces and biscuits.",
  "Did you know? MSG is naturally found in parmesan, mushrooms, and tomatoes.",
  "Did you know? Saffron is more expensive than gold by weight.",
  "Did you know? Chilling biscuit dough boosts texture and flavour.",
  "Did you know? Add fresh herbs at the end — heat destroys delicate oils.",
  "Did you know? Basting steak with butter is a chef's secret weapon.",
  "Did you know? Citrus zest is more aromatic than juice — and never goes bitter.",
  "Did you know? Capsaicin in chilli triggers a natural endorphin rush.",
  "Did you know? Vinegar can balance overly salty or fatty dishes.",
  "Did you know? Browning food creates hundreds of new flavour compounds.",
  "Did you know? Ice water shock helps greens stay crisp and bright.",
  "Did you know? Roast nuts and spices before grinding to unlock deeper flavours.",
  "Did you know? Brining chicken adds moisture and flavour all the way through.",
  "Did you know? A pinch of sugar can tame bitter tomato sauce.",
  "Did you know? Sourdough rises from natural wild yeasts — no commercial yeast needed.",
  "Did you know? Toasting dry rice before boiling enhances aroma and nuttiness.",
  "Did you know? Charred vegetables release natural sugars and increase umami.",
  "Did you know? Stale bread is perfect for panzanella or meatballs.",
  "Did you know? Savoury dishes can benefit from a hint of dark chocolate or coffee.",
  "Did you know? Even water tastes sweeter when you add a pinch of salt.",
  "Did you know? Lemon juice neutralises fishy flavours and brightens seafood.",
  "Did you know? Resting meat after cooking redistributes juices throughout.",
  "Did you know? Double cream whips better when both bowl and cream are cold.",
  "Did you know? Blanching vegetables in salted water preserves their colour.",
  "Did you know? Garlic releases different flavours when crushed, chopped, or sliced.",
  "Did you know? Deglazing a pan with wine captures all the caramelised bits.",
  "Did you know? Adding pasta water to sauce helps it cling to the noodles.",
  "Did you know? Tempering eggs slowly prevents them from scrambling in hot liquids.",
  "Did you know? Mise en place — preparing ingredients first — speeds up cooking.",
  "Did you know? Scoring duck skin renders fat and creates crispy crackling.",
  "Did you know? Folding cake batter gently preserves air bubbles for lightness.",
  "Did you know? Fresh ginger has more heat than dried ground ginger.",
  "Did you know? Salting aubergine draws out bitter compounds and excess water.",
  "Did you know? Blooming spices in oil releases their full aromatic potential.",
  "Did you know? Wooden spoons don't conduct heat — perfect for hot pans.",
  "Did you know? Acidic marinades tenderise meat but can make it mushy if too long.",
  "Did you know? Steam cooking preserves more nutrients than boiling.",
  "Did you know? Clarified butter has a higher smoke point than regular butter.",
  "Did you know? Soaking beans overnight reduces cooking time by half.",
  "Did you know? Fresh breadcrumbs bind meatballs better than dried ones.",
  "Did you know? Whisking cream in cold weather takes longer to achieve peaks.",
  "Did you know? Bay leaves should be removed before serving — they're inedible whole.",
  "Did you know? Coconut milk separates naturally — stir before using.",
  "Did you know? Proper knife skills reduce prep time and improve consistency.",
  "Did you know? Cast iron retains heat better than any other cookware material.",
  "Did you know? Room temperature ingredients mix more easily than cold ones.",
  "Did you know? Sharp knives are safer than dull ones — they require less pressure.",
  "Did you know? Aluminium foil has a shiny and dull side — use shiny side up.",
  "Did you know? Fresh pasta cooks in 2-3 minutes, dried pasta takes 8-12 minutes.",
  "Did you know? Olive oil becomes bitter when heated to high temperatures.",
  "Did you know? Baking soda neutralises acid — perfect for tenderising tomatoes.",
  "Did you know? Freezing bread slices individually prevents them sticking together.",
  "Did you know? Hot oil splatters less when food is patted dry first.",
];

interface DidYouKnowLoaderProps {
  className?: string;
}

const DidYouKnowLoader: React.FC<DidYouKnowLoaderProps> = ({ className = "" }) => {
  const [shuffledFacts, setShuffledFacts] = useState<string[]>([]);
  const [index, setIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  // Shuffle facts array on component mount
  useEffect(() => {
    const shuffled = [...facts].sort(() => Math.random() - 0.5);
    setShuffledFacts(shuffled);
  }, []);

  useEffect(() => {
    if (shuffledFacts.length === 0) return;
    
    const rotate = setInterval(() => {
      setIsVisible(false);
      setTimeout(() => {
        setIndex((prev) => (prev + 1) % shuffledFacts.length);
        setIsVisible(true);
      }, 300);
    }, 4000);
    return () => clearInterval(rotate);
  }, [shuffledFacts]);

  return (
    <div className={`w-full min-h-[7rem] flex items-center justify-center bg-gradient-to-r from-orange-50 via-amber-50 to-orange-50 dark:from-orange-950/20 dark:via-amber-950/20 dark:to-orange-950/20 rounded-xl mt-6 px-6 py-4 border border-orange-200/50 dark:border-orange-800/30 ${className}`}>
      <div className="text-center max-w-md">
        <p className={`text-sm font-medium text-orange-700 dark:text-orange-300 leading-relaxed transition-opacity duration-300 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
          {shuffledFacts[index]}
        </p>
        <div className="mt-3 flex justify-center space-x-1">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="w-2 h-2 bg-orange-400/60 rounded-full animate-pulse"
              style={{ animationDelay: `${i * 0.2}s` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default DidYouKnowLoader;