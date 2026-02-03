#!/usr/bin/env node
/**
 * Fix SSR bundle order: move createServerFn and its dependencies to the top
 * so they are defined before any top-level code that uses createServerFn.
 *
 * The Nitro/Rollup SSR bundle (ssr.mjs) can end up with top-level calls to
 * createServerFn (e.g. from bedrock-budget, persons) before the line that
 * defines createServerFn, causing "createServerFn is not a function" in Lambda.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const ssrPath = path.join(projectRoot, '.output/server/_ssr/ssr.mjs');

if (!fs.existsSync(ssrPath)) {
  console.warn('fix-ssr-bundle-order: .output/server/_ssr/ssr.mjs not found, skipping');
  process.exit(0);
}

const content = fs.readFileSync(ssrPath, 'utf8');
const lines = content.split('\n');

// Find last import line (1-based index in file; we use 0-based in array)
let lastImportIdx = -1;
for (let i = 0; i < lines.length; i++) {
  const trimmed = lines[i].trimStart();
  if (trimmed.startsWith('import ') || trimmed.startsWith('import{')) {
    lastImportIdx = i;
  }
}
if (lastImportIdx < 0) {
  console.warn('fix-ssr-bundle-order: no import lines found in ssr.mjs');
  process.exit(0);
}

// Block to move: from "var TSS_FORMDATA_CONTEXT =" up to (excluding) "function getDefaultSerovalPlugins"
const startMarker = 'var TSS_FORMDATA_CONTEXT =';
const endMarker = 'function getDefaultSerovalPlugins(';

let blockStartIdx = -1;
let blockEndIdx = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes(startMarker)) {
    blockStartIdx = i;
    break;
  }
}
if (blockStartIdx < 0) {
  console.warn('fix-ssr-bundle-order: start marker not found in ssr.mjs');
  process.exit(0);
}
for (let i = blockStartIdx + 1; i < lines.length; i++) {
  if (lines[i].includes(endMarker)) {
    blockEndIdx = i;
    break;
  }
}
if (blockEndIdx < 0) {
  console.warn('fix-ssr-bundle-order: end marker not found in ssr.mjs');
  process.exit(0);
}

const blockLines = lines.slice(blockStartIdx, blockEndIdx);

// New order: [imports + 1] + block + [code that was between imports and block] + [rest after block]
const newLines = [
  ...lines.slice(0, lastImportIdx + 1),
  '',
  '// createServerFn and dependencies (moved to top by fix-ssr-bundle-order)',
  ...blockLines,
  '',
  ...lines.slice(lastImportIdx + 1, blockStartIdx),
  ...lines.slice(blockEndIdx),
];

fs.writeFileSync(ssrPath, newLines.join('\n'), 'utf8');
console.log('fix-ssr-bundle-order: reordered ssr.mjs so createServerFn is defined before use');
process.exit(0);
