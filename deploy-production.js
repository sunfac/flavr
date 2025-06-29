#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

console.log('Creating production deployment...');

// Ensure dist/public exists
const distPublic = path.join(process.cwd(), 'dist', 'public');
if (!fs.existsSync(distPublic)) {
  fs.mkdirSync(distPublic, { recursive: true });
}

// Copy essential client files for production serving
const clientDir = path.join(process.cwd(), 'client');
const filesToCopy = [
  'manifest.json',
  'vite.svg',
  'public'
];

filesToCopy.forEach(file => {
  const srcPath = path.join(clientDir, file);
  const destPath = path.join(distPublic, file);
  
  if (fs.existsSync(srcPath)) {
    if (fs.statSync(srcPath).isDirectory()) {
      fs.cpSync(srcPath, destPath, { recursive: true, force: true });
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
    console.log(`Copied ${file}`);
  }
});

// Create a minimal but functional production index.html
const productionHTML = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Flavr - AI Recipe Generator</title>
    <meta name="description" content="Your AI-powered culinary companion for personalized recipes." />
    
    <link rel="manifest" href="/manifest.json" />
    <meta name="theme-color" content="#f97316" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-title" content="Flavr" />
    
    <base href="/">
    <script>
      window.__FLAVR_ENV__ = 'production';
      
      // Simple loading timeout
      setTimeout(() => {
        const loader = document.getElementById('loader');
        if (loader && loader.style.display !== 'none') {
          loader.style.opacity = '0';
          setTimeout(() => {
            loader.style.display = 'none';
            // Show fallback message if app didn't load
            document.body.innerHTML = \`
              <div style="
                min-height: 100vh;
                background: linear-gradient(135deg, #1e293b, #0f172a);
                display: flex;
                align-items: center;
                justify-content: center;
                font-family: system-ui;
                color: white;
                text-align: center;
              ">
                <div>
                  <h1 style="color: #f97316; font-size: 2rem; margin-bottom: 1rem;">Flavr</h1>
                  <p style="color: #94a3b8;">Your culinary companion is starting up...</p>
                  <button onclick="window.location.reload()" style="
                    margin-top: 1rem;
                    padding: 0.5rem 1rem;
                    background: #f97316;
                    color: white;
                    border: none;
                    border-radius: 0.5rem;
                    cursor: pointer;
                  ">Refresh Page</button>
                </div>
              </div>
            \`;
          }, 500);
        }
      }, 8000);
    </script>
    
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body { height: 100%; font-family: system-ui; }
      #root { height: 100%; min-height: 100vh; }
      @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
    </style>
  </head>
  <body>
    <div id="root">
      <div id="loader" style="
        position: fixed; inset: 0;
        background: linear-gradient(135deg, #1e293b, #0f172a);
        display: flex; align-items: center; justify-content: center;
        z-index: 9999;
      ">
        <div style="text-align: center; color: white;">
          <div style="
            width: 60px; height: 60px; margin: 0 auto 20px;
            border: 4px solid rgba(249, 115, 22, 0.3);
            border-top: 4px solid #f97316;
            border-radius: 50%;
            animation: spin 1s linear infinite;
          "></div>
          <h1 style="font-size: 2rem; margin-bottom: 10px; color: #f97316;">Flavr</h1>
          <p style="color: #94a3b8; font-size: 0.9rem;">Loading your culinary companion...</p>
        </div>
      </div>
    </div>
    
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>`;

fs.writeFileSync(path.join(distPublic, 'index.html'), productionHTML);
console.log('Created production index.html');

console.log('Production deployment ready!');