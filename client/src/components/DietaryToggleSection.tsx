import { useState } from "react";
import { motion } from "framer-motion";
import { iconMap } from "@/lib/iconMap";

// Dietary requirements options
const dietaryOptions = [
  { value: "noRestrictions", label: "No restrictions", icon: "Check", desc: "Eat everything" },
  { value: "vegan", label: "Vegan", icon: "Leaf", desc: "Plant-based only" },
  { value: "vegetarian", label: "Vegetarian", icon: "Carrot", desc: "No meat or fish" },
  { value: "pescatarian", label: "Pescatarian", icon: "Fish", desc: "Fish but no meat" },
  { value: "glutenFree", label: "Gluten-free", icon: "WheatOff", desc: "No wheat/gluten" },
  { value: "dairyFree", label: "Dairy-free", icon: "MilkOff", desc: "No dairy products" },
  { value: "nutFree", label: "Nut-free", icon: "NutOff", desc: "No nuts or seeds" },
  { value: "halal", label: "Halal", icon: "Moon", desc: "Islamic dietary laws" },
  { value: "kosher", label: "Kosher", icon: "Star", desc: "Jewish dietary laws" }
];

// Nutritional goals options
const nutritionalOptions = [
  { value: "balanced", label: "Balanced nutrition", icon: "Scale", desc: "Well-rounded meals" },
  { value: "highProtein", label: "High protein", icon: "Zap", desc: "Build & maintain muscle" },
  { value: "lowCarb", label: "Low carb", icon: "Minus", desc: "Reduce carbohydrates" },
  { value: "lowCalorie", label: "Low calorie", icon: "Target", desc: "Weight management" },
  { value: "keto", label: "Ketogenic", icon: "Flame", desc: "Very low carb, high fat" },
  { value: "paleo", label: "Paleo", icon: "Mountain", desc: "Whole foods, no processed" },
  { value: "lowSodium", label: "Low sodium", icon: "Heart", desc: "Heart-healthy" },
  { value: "highFiber", label: "High fiber", icon: "Wheat", desc: "Digestive health" },
  { value: "antioxidantRich", label: "Antioxidant-rich", icon: "Sparkles", desc: "Colorful, nutrient-dense" }
];

interface DietaryToggleSectionProps {
  selectedDietary: string[];
  selectedNutritional: string[];
  onDietaryChange: (selected: string[]) => void;
  onNutritionalChange: (selected: string[]) => void;
  className?: string;
}

export default function DietaryToggleSection({
  selectedDietary,
  selectedNutritional,
  onDietaryChange,
  onNutritionalChange,
  className = ""
}: DietaryToggleSectionProps) {
  const [showDietary, setShowDietary] = useState(false);
  const [showNutritional, setShowNutritional] = useState(false);

  const toggleDietaryOption = (value: string) => {
    if (value === "noRestrictions") {
      // If "No restrictions" is selected, clear all others
      onDietaryChange(selectedDietary.includes("noRestrictions") ? [] : ["noRestrictions"]);
    } else {
      // Remove "No restrictions" if selecting specific restrictions
      let newSelected = selectedDietary.filter(item => item !== "noRestrictions");
      
      if (selectedDietary.includes(value)) {
        newSelected = newSelected.filter(item => item !== value);
      } else {
        newSelected = [...newSelected, value];
      }
      onDietaryChange(newSelected);
    }
  };

  const toggleNutritionalOption = (value: string) => {
    if (selectedNutritional.includes(value)) {
      onNutritionalChange(selectedNutritional.filter(item => item !== value));
    } else {
      onNutritionalChange([...selectedNutritional, value]);
    }
  };

  const renderToggleGrid = (
    options: Array<{ value: string; label: string; icon: string; desc: string }>,
    selected: string[],
    onToggle: (value: string) => void
  ) => (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      {options.map((option) => {
        const IconComponent = iconMap[option.icon as keyof typeof iconMap];
        const isSelected = selected.includes(option.value);
        
        return (
          <button
            key={option.value}
            onClick={() => onToggle(option.value)}
            className={`
              relative p-3 rounded-xl border-2 transition-all duration-200 text-left
              ${isSelected 
                ? 'border-orange-400 bg-orange-400/10 text-orange-400' 
                : 'border-slate-600 bg-slate-800/30 text-slate-300 hover:border-slate-500 hover:bg-slate-800/50'
              }
            `}
          >
            <div className="flex items-start space-x-3">
              {IconComponent && (
                <IconComponent className={`w-5 h-5 mt-0.5 flex-shrink-0 ${isSelected ? 'text-orange-400' : 'text-slate-400'}`} />
              )}
              <div className="min-w-0 flex-1">
                <div className={`font-medium text-sm ${isSelected ? 'text-orange-400' : 'text-slate-200'}`}>
                  {option.label}
                </div>
                <div className="text-xs text-slate-500 mt-0.5 leading-tight">
                  {option.desc}
                </div>
              </div>
            </div>
            {isSelected && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-1 -right-1 w-3 h-3 bg-orange-400 rounded-full"
              />
            )}
          </button>
        );
      })}
    </div>
  );

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Dietary Requirements Section */}
      <div className="space-y-3">
        <button
          onClick={() => setShowDietary(!showDietary)}
          className="flex items-center justify-between w-full p-3 bg-slate-800/30 border border-slate-600 rounded-xl hover:bg-slate-800/50 transition-colors"
        >
          <div className="flex items-center space-x-3">
            <iconMap.heart className="w-5 h-5 text-orange-400" />
            <div className="text-left">
              <div className="font-medium text-slate-200">Dietary Requirements</div>
              <div className="text-sm text-slate-400">
                {selectedDietary.length > 0 
                  ? `${selectedDietary.length} selected`
                  : "Any restrictions or preferences?"
                }
              </div>
            </div>
          </div>
          <motion.div
            animate={{ rotate: showDietary ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <iconMap.chevronDown className="w-5 h-5 text-slate-400" />
          </motion.div>
        </button>

        <motion.div
          initial={false}
          animate={{ height: showDietary ? "auto" : 0, opacity: showDietary ? 1 : 0 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
          className="overflow-hidden"
        >
          <div className="pb-3">
            {renderToggleGrid(dietaryOptions, selectedDietary, toggleDietaryOption)}
          </div>
        </motion.div>
      </div>

      {/* Nutritional Goals Section */}
      <div className="space-y-3">
        <button
          onClick={() => setShowNutritional(!showNutritional)}
          className="flex items-center justify-between w-full p-3 bg-slate-800/30 border border-slate-600 rounded-xl hover:bg-slate-800/50 transition-colors"
        >
          <div className="flex items-center space-x-3">
            <iconMap.target className="w-5 h-5 text-orange-400" />
            <div className="text-left">
              <div className="font-medium text-slate-200">Nutritional Goals</div>
              <div className="text-sm text-slate-400">
                {selectedNutritional.length > 0 
                  ? `${selectedNutritional.length} selected`
                  : "Health and fitness priorities?"
                }
              </div>
            </div>
          </div>
          <motion.div
            animate={{ rotate: showNutritional ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <iconMap.chevronDown className="w-5 h-5 text-slate-400" />
          </motion.div>
        </button>

        <motion.div
          initial={false}
          animate={{ height: showNutritional ? "auto" : 0, opacity: showNutritional ? 1 : 0 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
          className="overflow-hidden"
        >
          <div className="pb-3">
            {renderToggleGrid(nutritionalOptions, selectedNutritional, toggleNutritionalOption)}
          </div>
        </motion.div>
      </div>
    </div>
  );
}