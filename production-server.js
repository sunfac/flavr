#!/usr/bin/env node
import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

// Ensure we're running from the project root directory
const __dirname = path.dirname(fileURLToPath(import.meta.url));
process.chdir(__dirname);

// Set production environment
process.env.NODE_ENV = 'production';

try {
  // Run the server using tsx from the project root to maintain correct paths
  execSync('npx tsx server/index.ts', { 
    stdio: 'inherit',
    env: process.env 
  });
} catch (error) {
  console.error('Server failed to start:', error.message);
  process.exit(1);
}