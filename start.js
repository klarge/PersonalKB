#!/usr/bin/env node

// Polyfill for import.meta.dirname in Node.js production builds
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import Module from 'module';

// Set up dirname polyfill for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Create a more robust polyfill for import.meta
const originalImport = Module.prototype.import;

// Patch the module loader to add dirname support
if (typeof import.meta.dirname === 'undefined') {
  Object.defineProperty(import.meta, 'dirname', {
    value: __dirname,
    writable: false,
    enumerable: true,
    configurable: false
  });
}

// Now import and run the actual application
import('./dist/index.js');