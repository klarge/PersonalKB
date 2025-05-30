#!/usr/bin/env node

// Polyfill for import.meta.dirname in Node.js production builds
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Set up import.meta.dirname polyfill
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Monkey patch to ensure import.meta.dirname is available
const originalResolve = import.meta.resolve;
import.meta.dirname = __dirname;

// Now import and run the actual application
import('./dist/index.js');