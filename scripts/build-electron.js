const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('Building Tax Office Management System for Desktop...');

// Build the web application
console.log('1. Building web application...');
execSync('npm run build', { stdio: 'inherit' });

// Install electron dependencies
console.log('2. Installing Electron dependencies...');
process.chdir('electron');
execSync('npm install', { stdio: 'inherit' });

// Build the desktop application
console.log('3. Building desktop application...');
execSync('npm run build', { stdio: 'inherit' });

console.log('\nDesktop application built successfully!');
console.log('Check the electron/dist folder for the executable files.');