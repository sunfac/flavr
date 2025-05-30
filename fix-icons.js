// Script to fix all icon imports across the application
import fs from 'fs';
import path from 'path';

// Map of direct icon names to iconMap keys
const iconMappings = {
  'Twitter': 'twitter',
  'Instagram': 'instagram', 
  'Facebook': 'facebook',
  'MessageCircle': 'messageCircle',
  'Printer': 'printer',
  'FileText': 'fileText',
  'ExternalLink': 'externalLink',
  'Copy': 'copy',
  'Home': 'home',
  'ChefHat': 'chefHat',
  'Bookmark': 'bookmark',
  'Star': 'star',
  'Settings': 'settings',
  'Database': 'database',
  'X': 'x',
  'Sun': 'sun',
  'Moon': 'moon',
  'Heart': 'heart',
  'Clock': 'clock',
  'Smartphone': 'smartphone',
  'Download': 'download',
  'Sparkles': 'sparkles',
  'Crown': 'crown',
  'Calendar': 'calendar',
  'Check': 'check',
  'AlertCircle': 'alertCircle',
  'ShoppingCart': 'shoppingCart',
  'Refrigerator': 'refrigerator',
  'ArrowLeft': 'arrowLeft',
  'Mail': 'mail',
  'Share2': 'share2',
  'Users': 'users',
  'Eye': 'eye',
  'Trash2': 'trash2',
  'AlertTriangle': 'alertTriangle',
  'DollarSign': 'dollarSign',
  'CheckCircle': 'checkCircle',
  'ChevronDown': 'chevronDown',
  'ChevronRight': 'chevronRight',
  'ChevronLeft': 'chevronLeft',
  'Search': 'search',
  'Coffee': 'coffee',
  'Smile': 'smile',
  'Zap': 'zap',
  'UserMenu': 'userMenu',
  'Utensils': 'utensils',
  'Plus': 'plus'
};

function processFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  
  // Add iconMap import if not present and file uses icons
  if (!content.includes('import { iconMap }') && 
      Object.keys(iconMappings).some(icon => content.includes(`<${icon}`))) {
    const importLine = 'import { iconMap } from "@/lib/iconMap";\n';
    if (content.includes('import React')) {
      content = content.replace('import React', `${importLine}import React`);
    } else {
      content = `${importLine}${content}`;
    }
    modified = true;
  }
  
  // Replace icon usage patterns
  for (const [directIcon, mappedIcon] of Object.entries(iconMappings)) {
    const patterns = [
      new RegExp(`<${directIcon}\\s+([^>]*)>`, 'g'),
      new RegExp(`<${directIcon}\\s*/>`, 'g'),
      new RegExp(`<${directIcon}>`, 'g')
    ];
    
    patterns.forEach(pattern => {
      if (pattern.test(content)) {
        content = content.replace(pattern, (match, attrs = '') => {
          return `{React.createElement(iconMap.${mappedIcon}, { ${attrs} })}`;
        });
        modified = true;
      }
    });
  }
  
  if (modified) {
    fs.writeFileSync(filePath, content);
    console.log(`Fixed icons in: ${filePath}`);
  }
}

// Process all component files
const filesToProcess = [
  'client/src/components/SocialShareTools.tsx',
  'client/src/components/GlobalNavigation.tsx', 
  'client/src/pages/FridgeMode.tsx',
  'client/src/components/PWAInstallPrompt.tsx',
  'client/src/components/UpgradeModal.tsx',
  'client/src/pages/not-found.tsx',
  'client/src/pages/ModeSelection.tsx',
  'client/src/pages/FlavrPlus.tsx',
  'client/src/pages/LoginPage.tsx',
  'client/src/pages/RecipeView.tsx',
  'client/src/pages/DeveloperMode.tsx',
  'client/src/pages/DeveloperLogs.tsx',
  'client/src/pages/FlavrRitualsPhase2.tsx',
  'client/src/pages/MyRecipes.tsx',
  'client/src/pages/FlavrRituals.tsx'
];

filesToProcess.forEach(processFile);
console.log('Icon fixing complete!');