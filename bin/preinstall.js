#!/usr/bin/env node

/**
 * Preinstall script to prevent incorrect installation method
 * This package should ONLY be run with npx, not installed as a dependency
 */

// Check if being installed as a dependency vs run via npx
// When using npx, npm sets npm_execpath to npx or the install is in a temp directory
const isNpxInstall = process.env.npm_execpath && process.env.npm_execpath.includes('npx');
const isTempInstall = process.cwd().includes('_npx');
const isNpmExec = process.env.npm_command === 'exec';

// Also allow if explicitly installing (user knows what they're doing)
const isExplicitInstall = process.argv.includes('--ignore-scripts') === false;

// npx in newer Node versions uses 'exec' command
if (isNpxInstall || isTempInstall || isNpmExec) {
  // Allow installation to proceed for npx
  process.exit(0);
}

// Check if this is a direct install (npm install / npm i)
const npmCommand = process.env.npm_command;
if (npmCommand === 'install' || npmCommand === 'i') {
  console.error('\n❌ ERROR: Incorrect installation method!\n');
  console.error('This package is meant to be run directly with npx only.\n');
  console.error('✅ Correct usage:');
  console.error('   npx claude-glm-alt-installer\n');
  console.error('❌ Do NOT install this package:');
  console.error('   npm install claude-glm-alt-installer');
  console.error('   npm i claude-glm-alt-installer');
  console.error('   npm install -g claude-glm-alt-installer\n');
  console.error('Always use npx to run the latest version!\n');
  process.exit(1);
}

// Allow for other cases (like npx which may not set expected env vars)
process.exit(0);
