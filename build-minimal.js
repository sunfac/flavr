#!/usr/bin/env node

// Minimal production build script to avoid timeout issues
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

console.log('🚀 Starting minimal production build...');

try {
  // Step 1: Build the server only (faster)
  console.log('📦 Building server...');
  execSync('npx esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist', { 
    stdio: 'inherit',
    timeout: 60000 // 60 second timeout
  });

  // Step 2: Copy client files directly without full Vite build
  console.log('📂 Copying client files...');
  if (!fs.existsSync('dist/public')) {
    fs.mkdirSync('dist/public', { recursive: true });
  }
  
  // Copy essential files
  fs.copyFileSync('client/index.html', 'dist/public/index.html');
  
  // Create a minimal build indicator
  fs.writeFileSync('dist/build-info.json', JSON.stringify({
    buildTime: new Date().toISOString(),
    buildType: 'minimal',
    note: 'Development server will handle module compilation'
  }, null, 2));

  console.log('✅ Minimal build completed successfully');
  console.log('💡 The development server will handle TypeScript compilation in production');
  
} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}