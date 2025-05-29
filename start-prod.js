#!/usr/bin/env node

// Production start script that runs TypeScript directly
// This avoids path resolution issues with compiled JavaScript

import { spawn } from 'child_process';

// Set production environment
process.env.NODE_ENV = 'production';

// Run server using tsx to maintain proper file paths
const server = spawn('npx', ['tsx', 'server/index.ts'], {
  stdio: 'inherit',
  env: process.env
});

server.on('error', (error) => {
  console.error('Server failed:', error);
  process.exit(1);
});

server.on('exit', (code) => {
  process.exit(code || 0);
});