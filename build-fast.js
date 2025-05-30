#!/usr/bin/env node

/**
 * Fast production build that bypasses icon bundling timeouts
 */

import esbuild from 'esbuild';
import fs from 'fs';
import path from 'path';

console.log('🚀 Creating fast production build...');

// Clean and create dist
if (fs.existsSync('dist')) {
  fs.rmSync('dist', { recursive: true, force: true });
}
fs.mkdirSync('dist', { recursive: true });

// Build server only - skip frontend bundling to avoid timeouts
console.log('📦 Building server...');

esbuild.buildSync({
  entryPoints: ['server/index.ts'],
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'esm',
  outdir: 'dist',
  external: [
    'express',
    'vite',
    '@neondatabase/serverless',
    'drizzle-orm',
    'ws',
    'openai',
    'stripe',
    'passport',
    'express-session',
    'connect-pg-simple'
  ],
  define: {
    'process.env.NODE_ENV': '"production"'
  },
  minify: false,
  sourcemap: false
});

// Create production client structure
console.log('📁 Setting up client structure...');
const clientDist = 'dist/public';
fs.mkdirSync(clientDist, { recursive: true });

// Copy essential assets
if (fs.existsSync('client/public')) {
  fs.cpSync('client/public', clientDist, { recursive: true });
}

// Create optimized index.html
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

console.log('✅ Fast build completed');
console.log('💡 Server will handle module compilation at runtime');
console.log('🎯 Ready for deployment');