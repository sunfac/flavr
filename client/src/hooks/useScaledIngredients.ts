import { useMemo } from 'react';

interface ScaledIngredient {
  id: string;
  text: string;
  checked: boolean;
}

export function useScaledIngredients(
  originalIngredients: string[], 
  originalServings: number, 
  currentServings: number
): ScaledIngredient[] {
  return useMemo(() => {
    const scalingFactor = currentServings / originalServings;
    
    return originalIngredients.map((ingredient, index) => ({
      id: `ingredient-${index}`,
      text: scaleIngredientText(ingredient, scalingFactor),
      checked: false
    }));
  }, [originalIngredients, originalServings, currentServings]);
}

function scaleIngredientText(ingredient: string, scalingFactor: number): string {
  let scaledText = ingredient;
  const processedIndices = new Set<number>();

  // Scale mixed fractions (e.g., "1 1/2", "2 3/4")
  scaledText = scaledText.replace(/(\d+)\s+(\d+)\/(\d+)/g, (match, whole, num, den, offset) => {
    const wholeNum = parseInt(whole);
    const numerator = parseInt(num);
    const denominator = parseInt(den);
    const totalValue = wholeNum + (numerator / denominator);
    const scaledValue = totalValue * scalingFactor;
    
    // Mark these character positions as processed
    for (let i = offset; i < offset + match.length; i++) {
      processedIndices.add(i);
    }
    
    return formatScaledNumber(scaledValue);
  });

  // Scale simple fractions (e.g., "1/2", "3/4")
  scaledText = scaledText.replace(/(\d+)\/(\d+)/g, (match, num, den, offset) => {
    // Check if any part of this match was already processed
    let alreadyProcessed = false;
    for (let i = offset; i < offset + match.length; i++) {
      if (processedIndices.has(i)) {
        alreadyProcessed = true;
        break;
      }
    }
    
    if (alreadyProcessed) return match;
    
    const numerator = parseInt(num);
    const denominator = parseInt(den);
    const value = numerator / denominator;
    const scaledValue = value * scalingFactor;
    
    // Mark these positions as processed
    for (let i = offset; i < offset + match.length; i++) {
      processedIndices.add(i);
    }
    
    return formatScaledNumber(scaledValue);
  });

  // Scale decimal and whole numbers (more comprehensive pattern)
  scaledText = scaledText.replace(/\b(\d+(?:\.\d+)?)\b/g, (match, num, offset) => {
    // Check if this number was already processed as part of a fraction
    let alreadyProcessed = false;
    for (let i = offset; i < offset + match.length; i++) {
      if (processedIndices.has(i)) {
        alreadyProcessed = true;
        break;
      }
    }
    
    if (alreadyProcessed) return match;
    
    const value = parseFloat(num);
    if (isNaN(value)) return match;
    
    const scaledValue = value * scalingFactor;
    return formatScaledNumber(scaledValue);
  });

  return scaledText;
}

function formatScaledNumber(value: number): string {
  // Round to reasonable precision
  const rounded = Math.round(value * 100) / 100;
  
  // Try to convert to simple fractions for common values
  const commonFractions = [
    { decimal: 0.125, fraction: '1/8' },
    { decimal: 0.25, fraction: '1/4' },
    { decimal: 0.333, fraction: '1/3' },
    { decimal: 0.5, fraction: '1/2' },
    { decimal: 0.667, fraction: '2/3' },
    { decimal: 0.75, fraction: '3/4' },
    { decimal: 0.875, fraction: '7/8' },
  ];

  // Check if it's close to a common fraction
  for (const { decimal, fraction } of commonFractions) {
    if (Math.abs(rounded - decimal) < 0.05) {
      return fraction;
    }
    // Check for whole number + fraction
    const whole = Math.floor(rounded);
    const fractional = rounded - whole;
    if (whole > 0 && Math.abs(fractional - decimal) < 0.05) {
      return `${whole} ${fraction}`;
    }
  }

  // Return as decimal, removing unnecessary trailing zeros
  if (rounded % 1 === 0) {
    return rounded.toString();
  }
  
  return rounded.toFixed(2).replace(/\.?0+$/, '');
}