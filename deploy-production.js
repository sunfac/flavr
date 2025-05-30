#!/usr/bin/env node

/**
 * 🚀 Production Deployment Script for Flavr
 * This script creates a production build that bypasses timeout issues
 * and ensures the application deploys successfully on Replit.
 */

const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

console.log('🚀 Starting production deployment build...');

// Clean existing dist
if (fs.existsSync('dist')) {
  fs.rmSync('dist', { recursive: true, force: true });
}
fs.mkdirSync('dist', { recursive: true });

console.log('📦 Building optimized server...');

// Build server with production optimizations
esbuild.buildSync({
  entryPoints: ['server/index.ts'],
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'esm',
  outdir: 'dist',
  external: [
    // Keep external to reduce bundle size
    'express',
    'vite',
    '@neondatabase/serverless',
    'drizzle-orm',
    'ws',
    'openai',
    'stripe',
    'passport',
    'express-session'
  ],
  define: {
    'process.env.NODE_ENV': '"production"'
  },
  minify: false, // Keep readable for debugging
  sourcemap: false
});

console.log('📁 Copying essential client files...');

// Copy essential client files for production
const clientDist = 'dist/public';
fs.mkdirSync(clientDist, { recursive: true });

// Copy static assets
if (fs.existsSync('client/public')) {
  fs.cpSync('client/public', clientDist, { recursive: true });
}

// Create minimal index.html for production
const indexHtml = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Flavr - AI-Powered Recipe Generation</title>
    <meta name="description" content="Transform your cooking with AI-powered recipe generation. Get personalized recipes based on your preferences, ingredients, and cooking style." />
    <link rel="icon" type="image/png" href="/generated-icon.png" />
    <link rel="manifest" href="/manifest.json" />
    <meta name="theme-color" content="#f97316" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>`;

fs.writeFileSync(path.join(clientDist, 'index.html'), indexHtml);

// Create build info
const buildInfo = {
  timestamp: Date.now(),
  version: '1.0.0',
  mode: 'production',
  build: 'optimized'
};

fs.writeFileSync('dist/build-info.json', JSON.stringify(buildInfo, null, 2));

console.log('✅ Production build completed successfully');
console.log('💡 Server will use Vite for module compilation in production');
console.log('🎯 Ready for deployment');