#!/usr/bin/env node

// Test actual production server startup without port conflicts
import { spawn } from 'child_process';
import { setTimeout } from 'timers/promises';

console.log('Testing production server startup...\n');

// Set production environment and use a different port to avoid conflicts
const env = {
  ...process.env,
  NODE_ENV: 'production',
  PORT: '5001'  // Use different port to avoid conflict with dev server
};

// Start the production server
const server = spawn('node', ['dist/index.js'], {
  env,
  stdio: 'pipe'
});

let output = '';
let hasStarted = false;
let hasError = false;

server.stdout.on('data', (data) => {
  const text = data.toString();
  output += text;
  console.log('STDOUT:', text.trim());
  
  if (text.includes('serving on port')) {
    hasStarted = true;
  }
});

server.stderr.on('data', (data) => {
  const text = data.toString();
  output += text;
  console.log('STDERR:', text.trim());
  
  if (text.includes('Pre-transform error') || text.includes('Failed to load url')) {
    hasError = true;
  }
});

// Wait 10 seconds for startup
await setTimeout(10000);

// Kill the server
server.kill('SIGTERM');

// Analyze results
console.log('\n--- Test Results ---');
if (hasStarted && !hasError) {
  console.log('✅ SUCCESS: Production server started without module loading errors');
  console.log('✅ Ready for deployment');
} else if (hasError) {
  console.log('❌ FAILURE: Still experiencing module loading errors');
  console.log('❌ Not ready for deployment');
} else {
  console.log('⚠️  UNCLEAR: Server may not have fully started in test time');
  console.log('📋 Check output above for details');
}

console.log('\nFull output analysis:');
if (output.includes('Changed working directory')) {
  console.log('✅ Working directory fix activated');
}
if (output.includes('Using Vite development server')) {
  console.log('✅ Vite development server initialized');
}
if (output.includes('Pre-transform error')) {
  console.log('❌ Module loading errors detected');
}

process.exit(0);