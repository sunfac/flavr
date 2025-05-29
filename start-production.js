#!/usr/bin/env node
import { spawn } from 'child_process';
import path from 'path';

// Set production environment
process.env.NODE_ENV = 'production';

// Run the server using tsx to avoid path issues with compiled JavaScript
const serverProcess = spawn('npx', ['tsx', 'server/index.ts'], {
  stdio: 'inherit',
  env: process.env,
  cwd: process.cwd()
});

serverProcess.on('exit', (code) => {
  process.exit(code);
});

serverProcess.on('error', (error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});