#!/usr/bin/env node

/**
 * Production Starter for Flavr
 * Ensures proper production serving with all functionality intact
 */

import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function log(message) {
  const timestamp = new Date().toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit', 
    second: '2-digit', 
    hour12: true 
  });
  console.log(`${timestamp} [PRODUCTION] ${message}`);
}

const app = express();

// Basic middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Security headers
app.use((req, res, next) => {
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin'
  });
  next();
});

// API routes (import the production server)
try {
  // Import the production server that was built by esbuild
  const serverModule = await import('./dist/index.js');
  log('✅ Production server module loaded successfully');
} catch (error) {
  log('❌ Failed to load production server module:', error.message);
  process.exit(1);
}

// Static file serving for production assets
const distPublicPath = path.resolve(__dirname, 'dist', 'public');

if (!fs.existsSync(distPublicPath)) {
  log('❌ Production build not found. Run: npm run build');
  process.exit(1);
}

log('✅ Serving production build from:', distPublicPath);

// Serve static assets with proper headers
app.use(express.static(distPublicPath, {
  maxAge: '1y',
  etag: true,
  lastModified: true,
  setHeaders: (res, filePath) => {
    const ext = path.extname(filePath);
    
    if (ext === '.js' || ext === '.mjs') {
      res.setHeader('Content-Type', 'application/javascript');
    } else if (ext === '.css') {
      res.setHeader('Content-Type', 'text/css');
    } else if (ext === '.json') {
      res.setHeader('Content-Type', 'application/json');
    } else if (ext === '.html') {
      res.setHeader('Content-Type', 'text/html');
      res.setHeader('Cache-Control', 'no-cache'); // Don't cache HTML
    }
  }
}));

// SPA fallback - serve index.html for all non-API routes
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }
  
  const indexPath = path.resolve(distPublicPath, 'index.html');
  res.sendFile(indexPath);
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, '0.0.0.0', () => {
  log(`🚀 Production server running on port ${PORT}`);
  log('🌐 Ready for deployment!');
});