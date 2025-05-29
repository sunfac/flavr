import { build } from 'vite';
import fs from 'fs';
import path from 'path';

console.log('Starting simplified build process...');

try {
  // Build with minimal configuration to avoid timeouts
  await build({
    configFile: 'vite.config.ts',
    build: {
      outDir: 'dist',
      minify: false,
      sourcemap: false,
      rollupOptions: {
        output: {
          manualChunks: undefined
        }
      }
    }
  });
  
  console.log('Build completed successfully');
  
  // Clear server/public directory
  const publicDir = path.resolve('server/public');
  if (fs.existsSync(publicDir)) {
    fs.rmSync(publicDir, { recursive: true, force: true });
  }
  fs.mkdirSync(publicDir, { recursive: true });
  
  // Copy dist contents to server/public
  const distDir = path.resolve('dist');
  if (fs.existsSync(distDir)) {
    const copyRecursive = (src, dest) => {
      const entries = fs.readdirSync(src, { withFileTypes: true });
      for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);
        if (entry.isDirectory()) {
          fs.mkdirSync(destPath, { recursive: true });
          copyRecursive(srcPath, destPath);
        } else {
          fs.copyFileSync(srcPath, destPath);
        }
      }
    };
    
    copyRecursive(distDir, publicDir);
    console.log('Assets copied to server/public');
  } else {
    console.error('No dist directory found after build');
  }
  
} catch (error) {
  console.error('Build failed:', error);
  process.exit(1);
}