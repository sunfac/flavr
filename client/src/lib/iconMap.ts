// Tree-shaking optimized icon system - only imports icons actually used
import { optimizedIconMap } from './optimizedIcons';

// Export the optimized icon map for consistent usage across the app
export const iconMap = optimizedIconMap;

// Type for icon names
export type IconName = keyof typeof iconMap;