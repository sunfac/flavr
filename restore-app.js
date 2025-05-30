// Script to restore app to working state by fixing malformed syntax
import fs from 'fs';

const filesToRestore = [
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

function restoreFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  
  // Remove iconMap import if present
  if (content.includes('import { iconMap }')) {
    content = content.replace(/import \{ iconMap \} from ['"@/lib/iconMap'"]+;\s*\n/, '');
    modified = true;
  }
  
  // Remove malformed React.createElement calls and replace with direct JSX
  const malformedPatterns = [
    /\{React\.createElement\(iconMap\.\w+,\s*\{[^}]*\}\s*\/?\s*\}\)/g,
    /React\.createElement\(iconMap\.\w+,\s*\{[^}]*\}\s*\/?\s*\)/g
  ];
  
  malformedPatterns.forEach(pattern => {
    if (pattern.test(content)) {
      // For now, just remove these malformed calls and use placeholder
      content = content.replace(pattern, '<span className="w-4 h-4 inline-block">•</span>');
      modified = true;
    }
  });
  
  // Add basic lucide-react imports for common icons
  const iconsNeeded = [];
  const iconNames = ['ChefHat', 'Clock', 'Crown', 'Heart', 'Sparkles', 'Calendar', 'Star', 'Check', 'Home', 'Settings', 'ArrowLeft', 'X', 'Plus'];
  
  iconNames.forEach(icon => {
    if (content.includes(`<${icon}`) && !iconsNeeded.includes(icon)) {
      iconsNeeded.push(icon);
    }
  });
  
  if (iconsNeeded.length > 0 && !content.includes('from "lucide-react"')) {
    const importLine = `import { ${iconsNeeded.join(', ')} } from "lucide-react";\n`;
    if (content.includes('import React')) {
      content = content.replace('import React', `${importLine}import React`);
    } else {
      content = `${importLine}${content}`;
    }
    modified = true;
  }
  
  if (modified) {
    fs.writeFileSync(filePath, content);
    console.log(`Restored: ${filePath}`);
  }
}

filesToRestore.forEach(restoreFile);
console.log('Application restoration complete!');