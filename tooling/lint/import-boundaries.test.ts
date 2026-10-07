import { describe, expect, it } from 'vite-plus/test';
import { applicationImportBoundaries, webappAdminImportBoundaries } from './import-boundaries.ts';

const forbiddenTanstackDsImports = [
  '@tanstack-aws/tanstack-ds/registry.json',
  '../../packages/tanstack-ds/registry/ui/button',
  '**/packages/tanstack-ds/**',
];

describe('applicationImportBoundaries', () => {
  it('blocks direct imports from packages/tanstack-ds in application source', () => {
    const rule = applicationImportBoundaries.rules['no-restricted-imports'];
    const patterns = rule[1].patterns;
    const tanstackDsPattern = patterns.find((p) => p.group.some((g) => g.includes('tanstack-ds')));
    expect(tanstackDsPattern).toBeDefined();
    expect(tanstackDsPattern?.message).toMatch(/shadcn add/i);
  });

  it('covers representative forbidden tanstack-ds import paths', () => {
    const rule = applicationImportBoundaries.rules['no-restricted-imports'];
    const pattern = rule[1].patterns.find((entry) =>
      entry.group.some((group) => group.includes('tanstack-ds')),
    );
    expect(pattern?.group).toContain('**/packages/tanstack-ds/**');
    expect(applicationImportBoundaries.files).toEqual(
      expect.arrayContaining(['src/**', 'lib/**', 'bin/**', 'scripts/**']),
    );
    for (const importPath of forbiddenTanstackDsImports) {
      expect(importPath).toMatch(/tanstack-ds/);
    }
  });
});

describe('webappAdminImportBoundaries', () => {
  it('covers apps/webapp-admin in workspace lint file globs', () => {
    expect(webappAdminImportBoundaries.files).toEqual(['apps/webapp-admin/**']);
  });

  it('blocks imports from primary Webapp source', () => {
    const rule = webappAdminImportBoundaries.rules['no-restricted-imports'];
    const patterns = rule[1].patterns;
    const webappPattern = patterns.find((p) => p.group.some((g) => g.includes('/src/')));
    expect(webappPattern).toBeDefined();
    expect(webappPattern?.message).toMatch(/primary Webapp/i);
  });

  it('blocks imports from other workspace apps', () => {
    const rule = webappAdminImportBoundaries.rules['no-restricted-imports'];
    const patterns = rule[1].patterns;
    const appsPattern = patterns.find((p) => p.group.some((g) => g.includes('/apps/')));
    expect(appsPattern).toBeDefined();
    expect(appsPattern?.message).toMatch(/workspace apps/i);
  });

  it('blocks direct imports from packages/tanstack-ds', () => {
    const rule = webappAdminImportBoundaries.rules['no-restricted-imports'];
    const patterns = rule[1].patterns;
    const tanstackDsPattern = patterns.find((p) => p.group.some((g) => g.includes('tanstack-ds')));
    expect(tanstackDsPattern).toBeDefined();
    expect(tanstackDsPattern?.message).toMatch(/shadcn add/i);
    expect(tanstackDsPattern?.group).toContain('**/packages/tanstack-ds/**');
  });
});
