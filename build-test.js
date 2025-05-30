// Minimal build test to identify the bottleneck
const { exec } = require('child_process');

console.log('Testing build components individually...');

// Test client build only
console.log('1. Testing client build...');
exec('cd client && npx vite build --mode development', { timeout: 30000 }, (error, stdout, stderr) => {
  if (error) {
    console.log('Client build failed or timed out');
    console.log('Error:', error.message);
  } else {
    console.log('Client build completed successfully');
  }
  
  // Test server build
  console.log('2. Testing server build...');
  exec('npx esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist-test', { timeout: 15000 }, (error2, stdout2, stderr2) => {
    if (error2) {
      console.log('Server build failed or timed out');
    } else {
      console.log('Server build completed successfully');
    }
    
    console.log('Build analysis complete');
  });
});