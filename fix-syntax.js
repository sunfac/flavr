// Script to fix malformed React.createElement syntax
import fs from 'fs';

function fixSyntax(filePath) {
  if (!fs.existsSync(filePath)) return;
  
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  
  // Fix malformed React.createElement calls
  const patterns = [
    // Fix missing closing braces and malformed attributes
    /React\.createElement\(iconMap\.(\w+), \{ className="([^"]*)" \/ \}\)/g,
    /React\.createElement\(iconMap\.(\w+), \{ className="([^"]*)" \}\)/g,
    // Fix cases where React isn't imported
    /\{React\.createElement\(/g
  ];
  
  // Fix the malformed syntax
  content = content.replace(/React\.createElement\(iconMap\.(\w+), \{ className="([^"]*)" \/ \}\)/g, 
    'React.createElement(iconMap.$1, { className: "$2" })');
  
  // Ensure React import is present
  if (content.includes('React.createElement') && !content.includes('import React')) {
    content = 'import React from "react";\n' + content;
    modified = true;
  }
  
  if (content !== fs.readFileSync(filePath, 'utf8')) {
    fs.writeFileSync(filePath, content);
    console.log(`Fixed syntax in: ${filePath}`);
  }
}

// Process all files that were modified by the icon script
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

filesToProcess.forEach(fixSyntax);
console.log('Syntax fixing complete!');