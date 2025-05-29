#!/usr/bin/env node

// Test the working directory fix more accurately
import fs from 'fs';
import path from 'path';

console.log('Testing working directory resolution from dist context...\n');

// Simulate the exact scenario: compiled code running from dist/
const originalCwd = process.cwd();
console.log(`Original working directory: ${originalCwd}`);

// Change to dist directory (simulating compiled server execution)
process.chdir('dist');
console.log(`Changed to dist directory: ${process.cwd()}`);

// Apply the same logic as in the compiled server
const currentDir = process.cwd(); // This would be /workspace/dist
const projectRoot = currentDir.includes('/dist') 
  ? path.resolve(currentDir, '..') 
  : currentDir;

console.log(`Calculated project root: ${projectRoot}`);

// Test if we can find the main.tsx file from this resolved path
const mainTsxPath = path.join(projectRoot, 'client/src/main.tsx');
console.log(`Looking for main.tsx at: ${mainTsxPath}`);

if (fs.existsSync(mainTsxPath)) {
  console.log('✅ SUCCESS: Can locate main.tsx with the working directory fix');
} else {
  console.log('❌ FAILURE: Still cannot locate main.tsx');
}

// Change back to original directory
process.chdir(originalCwd);

// Also test the server/index.ts path
const serverIndexPath = path.join(projectRoot, 'server/index.ts');
if (fs.existsSync(serverIndexPath)) {
  console.log('✅ Can also locate server/index.ts');
} else {
  console.log('❌ Cannot locate server/index.ts');
}

console.log('\nTest complete.');