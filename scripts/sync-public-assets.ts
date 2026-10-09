#!/usr/bin/env node
/**
 * Merges repo-root public/assets/ into a Vite build output assets directory.
 *
 * TanStack Start emits hashed client chunks under .output/public/assets/, but
 * Vite publicDir files are not copied there automatically. CDK deploys that
 * folder to S3 behind CloudFront /assets/*, so static brand assets must be
 * merged after each build.
 *
 * Usage:
 *   node scripts/sync-public-assets.ts
 *   node scripts/sync-public-assets.ts apps/webapp-admin/.output/public/assets
 */

import fs from 'node:fs';
import path from 'node:path';

const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const sourceDir = path.join(repoRoot, 'public/assets');
const destinationDir = path.resolve(repoRoot, process.argv[2] ?? '.output/public/assets');

if (!fs.existsSync(sourceDir)) {
  throw new Error(`Public assets source directory not found: ${sourceDir}`);
}

if (!fs.existsSync(destinationDir)) {
  throw new Error(
    `Build output assets directory not found: ${destinationDir}. Run the app build first.`,
  );
}

fs.cpSync(sourceDir, destinationDir, { recursive: true });

// oxlint-disable-next-line no-console
console.log(`Synced public assets from ${sourceDir} to ${destinationDir}`);
