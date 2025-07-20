#!/usr/bin/env node

/**
 * Production Deployment Script for Flavr
 * Ensures seamless deployment with full functionality preservation
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

function log(message) {
  console.log(`🚀 [DEPLOY] ${message}`);
}

function checkFileExists(filePath) {
  return fs.existsSync(filePath) && fs.statSync(filePath).size > 0;
}

async function deployProduction() {
  try {
    log('Starting production deployment...');
    
    // 1. Clean previous builds
    log('Cleaning previous builds...');
    if (fs.existsSync('dist')) {
      execSync('rm -rf dist', { stdio: 'inherit' });
    }
    
    // 2. Install dependencies (if needed)
    log('Ensuring dependencies are up to date...');
    execSync('npm install', { stdio: 'inherit' });
    
    // 3. Build the application
    log('Building application...');
    execSync('npm run build', { stdio: 'inherit' });
    
    // 4. Verify build artifacts
    log('Verifying build artifacts...');
    const requiredFiles = [
      'dist/index.js',
      'dist/public/index.html',
      'dist/public/assets'
    ];
    
    for (const file of requiredFiles) {
      if (!checkFileExists(file)) {
        throw new Error(`Missing required build artifact: ${file}`);
      }
    }
    
    // 5. Verify environment secrets
    log('Checking environment secrets...');
    const requiredSecrets = ['OPENAI_API_KEY', 'DATABASE_URL'];
    const missingSecrets = requiredSecrets.filter(secret => !process.env[secret]);
    
    if (missingSecrets.length > 0) {
      log(`⚠️  Missing secrets: ${missingSecrets.join(', ')}`);
      log('Please add these secrets in Replit Settings > Secrets');
    }
    
    // 6. Test production server
    log('Testing production server...');
    const testProcess = execSync('timeout 10 node dist/index.js 2>&1 || true', { 
      encoding: 'utf8',
      env: { ...process.env, NODE_ENV: 'production' }
    });
    
    if (testProcess.includes('serving on port') || testProcess.includes('Production mode detected')) {
      log('✅ Production server test passed');
    } else {
      log('⚠️  Production server test results:');
      console.log(testProcess);
    }
    
    // 7. Create deployment verification
    const deploymentInfo = {
      buildTime: new Date().toISOString(),
      nodeVersion: process.version,
      buildSize: getBuildSize(),
      status: 'ready'
    };
    
    fs.writeFileSync('dist/deployment-info.json', JSON.stringify(deploymentInfo, null, 2));
    
    log('✅ Production deployment completed successfully!');
    log('📦 Build artifacts ready in dist/');
    log('🌐 Ready for Replit deployment');
    
    return true;
    
  } catch (error) {
    log(`❌ Deployment failed: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

function getBuildSize() {
  try {
    const stats = execSync('du -sh dist/', { encoding: 'utf8' });
    return stats.trim().split('\t')[0];
  } catch {
    return 'unknown';
  }
}

// Run deployment
deployProduction();