#!/usr/bin/env node

/**
 * Environment Variable Diagnostic Script
 *
 * Run this to check if your .env file is being loaded correctly
 */

import 'dotenv/config';

console.log('\n╔═══════════════════════════════════════════════════════════╗');
console.log('║          Environment Configuration Check                  ║');
console.log('╚═══════════════════════════════════════════════════════════╝\n');

const checks = [];

// Check MINIMAX_JWT_TOKEN
const token = process.env.MINIMAX_JWT_TOKEN;
const tokenExists = !!token;
const tokenLength = token?.length || 0;
const tokenParts = token?.split('.').length || 0;
const isValidJWT = tokenParts === 3;

checks.push({
  name: 'MINIMAX_JWT_TOKEN exists',
  status: tokenExists,
  value: tokenExists ? '✅ YES' : '❌ NO - Token not found'
});

checks.push({
  name: 'Token length',
  status: tokenLength > 0,
  value: tokenLength > 0 ? `✅ ${tokenLength} characters` : '❌ 0 characters'
});

checks.push({
  name: 'Valid JWT format',
  status: isValidJWT,
  value: isValidJWT ? '✅ Three parts (header.payload.signature)' : `❌ ${tokenParts} parts (should be 3)`
});

// Check other variables
const logLevel = process.env.LOG_LEVEL;
checks.push({
  name: 'LOG_LEVEL',
  status: !!logLevel,
  value: logLevel || '⚠️  Not set (will default to "info")'
});

const nodeEnv = process.env.NODE_ENV;
checks.push({
  name: 'NODE_ENV',
  status: !!nodeEnv,
  value: nodeEnv || '⚠️  Not set (will default to "development")'
});

// Print results
console.log('Environment Variables:\n');
checks.forEach(check => {
  console.log(`  ${check.name}:`);
  console.log(`    ${check.value}\n`);
});

// Overall status
const allGood = token && isValidJWT;

console.log('═══════════════════════════════════════════════════════════\n');
if (allGood) {
  console.log('✅ Configuration is valid! You can run the CLI.\n');
  console.log('   Run: npm run cli\n');
} else {
  console.log('❌ Configuration issues detected!\n');
  console.log('   Follow these steps:\n');
  console.log('   1. Open the .env file in your project root');
  console.log('   2. Add your MiniMax JWT token:');
  console.log('      MINIMAX_JWT_TOKEN=your_actual_token_here');
  console.log('   3. Save the file and run this check again\n');
  console.log('   See setup-env.md for detailed instructions\n');
}

// Show .env file location
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = join(__dirname, '.env');
console.log(`📁 .env file location: ${envPath}\n`);
