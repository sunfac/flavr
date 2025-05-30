import fs from 'fs';
import path from 'path';

// Files that need fixing based on the grep results
const filesToFix = [
  'client/src/components/ChatBot.tsx',
  'client/src/components/GlobalNavigation.tsx',
  'client/src/components/PWAInstallPrompt.tsx', 
  'client/src/components/UpgradeModal.tsx',
  'client/src/pages/FridgeMode.tsx',
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

// Icon name to lucide-react import mapping
const iconMap = {
  alertCircle: 'AlertCircle',
  arrowLeft: 'ArrowLeft',
  arrowRight: 'ArrowRight',
  bookmark: 'Bookmark',
  calendar: 'Calendar',
  check: 'Check',
  chefHat: 'ChefHat',
  chevronDown: 'ChevronDown',
  chevronLeft: 'ChevronLeft',
  chevronRight: 'ChevronRight',
  chevronUp: 'ChevronUp',
  clock: 'Clock',
  copy: 'Copy',
  crown: 'Crown',
  database: 'Database',
  download: 'Download',
  edit: 'Edit',
  externalLink: 'ExternalLink',
  eye: 'Eye',
  eyeOff: 'EyeOff',
  fileText: 'FileText',
  heart: 'Heart',
  home: 'Home',
  info: 'Info',
  lock: 'Lock',
  menu: 'Menu',
  plus: 'Plus',
  printer: 'Printer',
  refrigerator: 'Refrigerator',
  save: 'Save',
  search: 'Search',
  settings: 'Settings',
  share: 'Share',
  shoppingCart: 'ShoppingCart',
  star: 'Star',
  trash: 'Trash2',
  user: 'User',
  userMenu: 'MoreVertical',
  users: 'Users',
  x: 'X',
  zap: 'Zap'
};

function fixFile(filePath) {
  if (!fs.existsSync(filePath)) {
    console.log(`File not found: ${filePath}`);
    return;
  }

  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  
  // Add React import if missing
  if (!content.includes('import React') && !content.includes('import { ') && content.includes('React.createElement')) {
    content = 'import React from \'react\';\n' + content;
    modified = true;
  }
  
  // Extract existing lucide imports
  const lucideImportMatch = content.match(/import\s*{([^}]+)}\s*from\s*['"]lucide-react['"]/);
  let existingImports = [];
  if (lucideImportMatch) {
    existingImports = lucideImportMatch[1]
      .split(',')
      .map(s => s.trim())
      .filter(s => s.length > 0);
  }
  
  // Find all malformed React.createElement calls and collect needed imports
  const neededImports = new Set(existingImports);
  
  // Multiple patterns to catch different malformations
  const patterns = [
    /React\.createElement\(iconMap\.(\w+),\s*{[^}]*}\s*\/\s*}\)/g,
    /React\.createElement\(iconMap\.(\w+),\s*{[^}]*}\)/g,
    /{React\.createElement\(iconMap\.(\w+),\s*{[^}]*}\)}/g
  ];
  
  patterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      const iconKey = match[1];
      if (iconMap[iconKey]) {
        neededImports.add(iconMap[iconKey]);
      }
    }
  });
  
  // Replace all malformed React.createElement patterns
  patterns.forEach(pattern => {
    content = content.replace(pattern, (match, iconKey) => {
      if (iconMap[iconKey]) {
        const propsMatch = match.match(/{\s*([^}]*)\s*}/);
        if (propsMatch) {
          const props = propsMatch[1].replace(/\s*\/\s*$/, '').replace(/className=/g, 'className=');
          return `<${iconMap[iconKey]} ${props} />`;
        }
        return `<${iconMap[iconKey]} className="w-4 h-4" />`;
      }
      return `<span>🔧</span>`;
    });
  });
  
  // Remove malformed object expressions
  content = content.replace(/{\s*React:\s*typeof React[^}]*}\s*/g, '');
  content = content.replace(/{\s*""\s*\|\s*{[^}]*}\s*}/g, '');
  content = content.replace(/{\s*false\s*\|\s*{\s*React:[^}]*}\s*}/g, '');
  
  // Fix incomplete JSX tags
  content = content.replace(/<(\w+)\s+([^>]*)\s*\/\s*}\s*>/g, '<$1 $2 />');
  content = content.replace(/<(\w+)\s+([^>]*)\s*<\s*(\w+)/g, '<$1 $2 />\n      <$3');
  
  // Fix broken conditional expressions
  content = content.replace(/{\s*\?\s*{\s*React:[^}]*}\s*:\s*}/g, '');
  content = content.replace(/{\s*&&\s*{\s*React:[^}]*}\s*}/g, '');
  
  // Update lucide imports
  if (neededImports.size > 0) {
    const importList = Array.from(neededImports).sort().join(', ');
    if (lucideImportMatch) {
      content = content.replace(
        /import\s*{[^}]+}\s*from\s*['"]lucide-react['"]/,
        `import { ${importList} } from 'lucide-react'`
      );
    } else {
      const firstImportIndex = content.indexOf('import');
      if (firstImportIndex !== -1) {
        const lineEnd = content.indexOf('\n', firstImportIndex);
        content = content.slice(0, lineEnd + 1) + 
                 `import { ${importList} } from 'lucide-react';\n` + 
                 content.slice(lineEnd + 1);
      }
    }
    modified = true;
  }
  
  if (modified) {
    fs.writeFileSync(filePath, content);
    console.log(`Fixed: ${filePath}`);
  } else {
    console.log(`No changes needed: ${filePath}`);
  }
}

// Fix all files
console.log('Starting syntax restoration...');
filesToFix.forEach(fixFile);
console.log('Syntax restoration complete!');