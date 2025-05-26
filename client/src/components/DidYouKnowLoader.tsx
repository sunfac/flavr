import React, { useEffect, useState } from 'react';

const facts = [
  "Did you know? Tamarind has been used in Indian cooking for over 1,000 years.",
  "Did you know? The Maillard reaction gives grilled meat its rich, umami flavor.",
  "Did you know? Cumin was found in the tombs of the Egyptian pharaohs.",
  "Did you know? Cooking with acid, like lemon or vinegar, brightens dull flavors.",
  "Did you know? Searing meat doesn't lock in juices — but it creates amazing crust.",
  "Did you know? Gochujang is a fermented Korean chili paste that builds complex heat.",
  "Did you know? 'Umami' is Japanese for 'pleasant savory taste'.",
  "Did you know? Caramelizing onions takes 30 minutes — and transforms the flavor.",
  "Did you know? Salt in desserts enhances sweetness and complexity.",
  "Did you know? Browned butter adds rich, nutty notes to sauces and cookies.",
  "Did you know? MSG is naturally found in parmesan, mushrooms, and tomatoes.",
  "Did you know? Saffron is more expensive than gold by weight.",
  "Did you know? Chilling cookie dough boosts texture and flavor.",
  "Did you know? Add fresh herbs at the end — heat destroys delicate oils.",
  "Did you know? Basting steak with butter is a chef's secret weapon.",
  "Did you know? Citrus zest is more aromatic than juice — and never goes bitter.",
  "Did you know? Capsaicin in chili triggers a natural endorphin rush.",
  "Did you know? Vinegar can balance overly salty or fatty dishes.",
  "Did you know? Browning food creates hundreds of new flavor compounds.",
  "Did you know? Ice water shock helps greens stay crisp and bright.",
  "Did you know? Roast nuts and spices before grinding to unlock deeper flavors.",
  "Did you know? Brining chicken adds moisture and flavor all the way through.",
  "Did you know? A pinch of sugar can tame bitter tomato sauce.",
  "Did you know? Sourdough rises from natural wild yeasts — no commercial yeast needed.",
  "Did you know? Toasting dry rice before boiling enhances aroma and nuttiness.",
  "Did you know? Charred vegetables release natural sugars and increase umami.",
  "Did you know? Stale bread is perfect for panzanella or meatballs.",
  "Did you know? Savory dishes can benefit from a hint of dark chocolate or coffee.",
  "Did you know? Even water tastes sweeter when you add a pinch of salt.",
  "Did you know? Lemon juice neutralizes fishy flavors and brightens seafood.",
];

interface DidYouKnowLoaderProps {
  className?: string;
}

const DidYouKnowLoader: React.FC<DidYouKnowLoaderProps> = ({ className = "" }) => {
  const [index, setIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const rotate = setInterval(() => {
      setIsVisible(false);
      setTimeout(() => {
        setIndex((prev) => (prev + 1) % facts.length);
        setIsVisible(true);
      }, 300);
    }, 4000);
    return () => clearInterval(rotate);
  }, []);

  return (
    <div className={`w-full min-h-[7rem] flex items-center justify-center bg-gradient-to-r from-orange-50 via-amber-50 to-orange-50 dark:from-orange-950/20 dark:via-amber-950/20 dark:to-orange-950/20 rounded-xl mt-6 px-6 py-4 border border-orange-200/50 dark:border-orange-800/30 ${className}`}>
      <div className="text-center max-w-md">
        <p className={`text-sm font-medium text-orange-700 dark:text-orange-300 leading-relaxed transition-opacity duration-300 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
          {facts[index]}
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