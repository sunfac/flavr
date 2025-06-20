import { useMemo } from 'react';

interface Ingredient {
  id?: string;
  text: string;
  amount?: number;
  unit?: string;
}

export function useScaledIngredients(
  originalIngredients: string[] | Ingredient[],
  originalServings: number,
  currentServings: number
) {
  return useMemo(() => {
    if (!originalIngredients || originalServings === 0) return [];
    
    const scaleFactor = currentServings / originalServings;
    
    return originalIngredients.map((ingredient, index) => {
      let scaledText: string;
      
      if (typeof ingredient === 'string') {
        scaledText = scaleIngredientText(ingredient, scaleFactor);
      } else {
        scaledText = scaleIngredientText(ingredient.text, scaleFactor);
      }
      
      return {
        id: typeof ingredient === 'object' ? ingredient.id || `ingredient-${index}` : `ingredient-${index}`,
        text: scaledText,
        checked: false
      };
    });
  }, [originalIngredients, originalServings, currentServings]);
}

function scaleIngredientText(text: string, scaleFactor: number): string {
  // Match common fraction and decimal patterns at the start of ingredient text
  const fractionRegex = /^(\d+(?:\/\d+)?|\d*\.?\d+)\s*(.+)/;
  const match = text.match(fractionRegex);
  
  if (!match) return text;
  
  const [, amountStr, remainder] = match;
  
  // Convert fraction to decimal
  let amount: number;
  if (amountStr.includes('/')) {
    const [numerator, denominator] = amountStr.split('/').map(Number);
    amount = numerator / denominator;
  } else {
    amount = parseFloat(amountStr);
  }
  
  const scaledAmount = amount * scaleFactor;
  
  // Format the scaled amount nicely
  let formattedAmount: string;
  if (scaledAmount < 1) {
    // Convert to fraction for small amounts
    const fraction = decimalToFraction(scaledAmount);
    formattedAmount = fraction;
  } else if (scaledAmount % 1 === 0) {
    // Whole number
    formattedAmount = scaledAmount.toString();
  } else {
    // Round to reasonable decimal places
    formattedAmount = scaledAmount.toFixed(1).replace(/\.0$/, '');
  }
  
  return `${formattedAmount} ${remainder}`;
}

function decimalToFraction(decimal: number): string {
  const commonFractions: { [key: number]: string } = {
    0.125: '1/8',
    0.25: '1/4',
    0.333: '1/3',
    0.375: '3/8',
    0.5: '1/2',
    0.625: '5/8',
    0.667: '2/3',
    0.75: '3/4',
    0.875: '7/8'
  };
  
  // Find closest common fraction
  let closest = 0;
  let closestDiff = Infinity;
  
  for (const [value, fraction] of Object.entries(commonFractions)) {
    const diff = Math.abs(decimal - parseFloat(value));
    if (diff < closestDiff) {
      closestDiff = diff;
      closest = parseFloat(value);
    }
  }
  
  // If very close to a common fraction, use it
  if (closestDiff < 0.05) {
    return commonFractions[closest];
  }
  
  // Otherwise, return rounded decimal
  return decimal.toFixed(2).replace(/\.?0+$/, '');
}