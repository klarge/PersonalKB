#!/usr/bin/env node

// Polyfill for import.meta.dirname in Node.js production builds
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import Module from 'module';

// Set up dirname polyfill for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Monkey patch the Module constructor to handle import.meta properly
const originalCreateRequire = Module.createRequire;
const originalImport = Module.prototype.import;

// Create a module-level polyfill for import.meta.dirname
function createImportMeta(url) {
  const meta = {
    url,
    dirname: dirname(fileURLToPath(url)),
    resolve: (specifier) => {
      return new URL(specifier, url).href;
    }
  };
  return meta;
}

// Patch the global import.meta for the main module
if (typeof import.meta.dirname === 'undefined') {
  Object.defineProperty(import.meta, 'dirname', {
    value: __dirname,
    writable: false,
    configurable: true
  });
}

// Global polyfill for modules that can't access import.meta.dirname
globalThis.__importMetaDirname = __dirname;
globalThis.__createImportMeta = createImportMeta;

// Override path.resolve to handle undefined arguments gracefully
import path from 'path';
const originalResolve = path.resolve;
path.resolve = function(...args) {
  // Replace undefined arguments with the current directory
  const filteredArgs = args.map(arg => arg === undefined ? __dirname : arg);
  return originalResolve.apply(this, filteredArgs);
};

// Export the patched path for use by other modules
globalThis.__patchedPath = path;

// Now import and run the actual application
import('./dist/index.js');