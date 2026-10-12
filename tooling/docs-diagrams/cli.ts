#!/usr/bin/env node

import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { checkDocsDiagrams } from './docs-diagrams.ts';
import { indexFile, loadDocsDiagrams } from './repo.ts';

const root = process.cwd();
const command = process.argv[2];
const state = loadDocsDiagrams(root);

if (command === 'blocks') {
  for (const block of state.blocks) {
    const drawn = state.pages.filter(
      (page) => page.source === block.doc && page.mermaid === block.hash,
    );
    const status = block.skipReason
      ? `skip (${block.skipReason})`
      : drawn.map((page) => page.file).join(', ') || 'missing';
    process.stdout.write(`${block.doc}:${block.line}\t${block.hash}\t${status}\n`);
  }
} else if (command === 'index') {
  writeFileSync(path.join(root, indexFile), state.expectedIndex);
  process.stdout.write(`Wrote ${indexFile} (${state.pages.length} diagrams).\n`);
} else if (command === 'check') {
  const findings = checkDocsDiagrams(state);
  for (const finding of findings) {
    process.stdout.write(`${finding.kind}\t${finding.message}\n`);
  }
  if (findings.length > 0) {
    process.exitCode = 1;
  } else {
    process.stdout.write(`Docs diagrams in sync (${state.pages.length} diagrams).\n`);
  }
} else {
  process.stderr.write('Usage: docs-diagrams <blocks|check|index>\n');
  process.exitCode = 2;
}
