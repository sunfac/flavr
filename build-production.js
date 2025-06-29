#!/usr/bin/env node

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

console.log('Creating production build for deployment...');

// Create dist directories
const distDir = path.join(process.cwd(), 'dist');
const publicDir = path.join(distDir, 'public');

if (fs.existsSync(distDir)) {
  fs.rmSync(distDir, { recursive: true, force: true });
}

fs.mkdirSync(distDir, { recursive: true });
fs.mkdirSync(publicDir, { recursive: true });

// Build the frontend only (skip server build for now)
try {
  console.log('Building frontend with Vite...');
  execSync('npx vite build --outDir dist/public', { 
    stdio: 'inherit',
    timeout: 300000 // 5 minutes
  });
  console.log('Frontend build completed successfully!');
} catch (error) {
  console.error('Frontend build failed:', error.message);
  process.exit(1);
}

// Copy server files
console.log('Copying server files...');
const serverFiles = ['server', 'shared', 'package.json', 'package-lock.json'];

serverFiles.forEach(file => {
  const srcPath = path.join(process.cwd(), file);
  const destPath = path.join(distDir, file);
  
  if (fs.existsSync(srcPath)) {
    if (fs.statSync(srcPath).isDirectory()) {
      fs.cpSync(srcPath, destPath, { recursive: true });
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
    console.log(`Copied ${file}`);
  }
});

console.log('Production build completed! Deploy the dist/ directory.');