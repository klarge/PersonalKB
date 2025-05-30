#!/usr/bin/env node

// Polyfill for import.meta.dirname in Node.js production builds
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Set up dirname polyfill for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Create a global polyfill that the compiled code can access
globalThis.__importMetaDirname = __dirname;

// Override the module resolution to handle missing dirname
const originalResolve = import.meta.resolve;
if (originalResolve) {
  import.meta.resolve = function(...args) {
    try {
      return originalResolve.apply(this, args);
    } catch (err) {
      // Fallback for when dirname is undefined
      if (err.code === 'ERR_INVALID_ARG_TYPE' && args[0] === undefined) {
        return new URL('./', import.meta.url).href;
      }
      throw err;
    }
  };
}

// Set dirname if it's undefined
if (typeof import.meta.dirname === 'undefined') {
  try {
    Object.defineProperty(import.meta, 'dirname', {
      value: __dirname,
      writable: false,
      configurable: true
    });
  } catch (e) {
    // If we can't set it directly, the global fallback will work
  }
}

// Now import and run the actual application
import('./dist/index.js');