import { describe, expect, it } from 'vite-plus/test';
import { applicationImportBoundaries } from './import-boundaries.ts';

describe('applicationImportBoundaries', () => {
  it('blocks direct imports from packages/tanstack-ds in application source', () => {
    const rule = applicationImportBoundaries.rules['no-restricted-imports'];
    const patterns = rule[1].patterns;
    const tanstackDsPattern = patterns.find((p) => p.group.some((g) => g.includes('tanstack-ds')));
    expect(tanstackDsPattern).toBeDefined();
    expect(tanstackDsPattern?.message).toMatch(/shadcn add/i);
  });
});
