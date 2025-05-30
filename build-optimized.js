#!/usr/bin/env node

// Build optimization script with increased timeout and debugging
const { spawn } = require('child_process');

console.log('🚀 Starting optimized build process...');

// Build configuration with extended timeout
const buildProcess = spawn('npm', ['run', 'build'], {
  stdio: 'pipe',
  env: {
    ...process.env,
    NODE_OPTIONS: '--max-old-space-size=4096',
    VITE_BUILD_TIMEOUT: '300000', // 5 minutes
  }
});

let buildOutput = '';
let startTime = Date.now();

buildProcess.stdout.on('data', (data) => {
  const output = data.toString();
  buildOutput += output;
  console.log(output);
  
  // Track progress
  if (output.includes('transforming')) {
    console.log(`⚡ Transform stage - ${Math.round((Date.now() - startTime) / 1000)}s elapsed`);
  }
  if (output.includes('rendering chunks')) {
    console.log(`📦 Chunk rendering stage - ${Math.round((Date.now() - startTime) / 1000)}s elapsed`);
  }
});

buildProcess.stderr.on('data', (data) => {
  console.error('Build error:', data.toString());
});

// Set build timeout to 5 minutes
const timeout = setTimeout(() => {
  console.log('⚠️ Build timeout reached, analyzing...');
  buildProcess.kill('SIGTERM');
  
  // Analyze what stage the build was in
  if (buildOutput.includes('transforming')) {
    console.log('🔍 Build stuck at transformation stage - likely icon processing issue');
  } else if (buildOutput.includes('rendering chunks')) {
    console.log('🔍 Build stuck at chunk rendering - possible dependency conflict');
  } else {
    console.log('🔍 Build stuck at early stage - configuration issue');
  }
  
  process.exit(1);
}, 300000);

buildProcess.on('close', (code) => {
  clearTimeout(timeout);
  const duration = Math.round((Date.now() - startTime) / 1000);
  
  if (code === 0) {
    console.log(`✅ Build completed successfully in ${duration}s`);
  } else {
    console.log(`❌ Build failed with code ${code} after ${duration}s`);
    process.exit(code);
  }
});

buildProcess.on('error', (error) => {
  clearTimeout(timeout);
  console.error('Build process error:', error);
  process.exit(1);
});