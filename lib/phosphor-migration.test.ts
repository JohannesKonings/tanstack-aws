import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vite-plus/test';

const repoRoot = join(import.meta.dirname, '..');

function collectSourceFiles(dir: string): string[] {
  const entries = readdirSync(dir);
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      files.push(...collectSourceFiles(fullPath));
      continue;
    }

    if (/\.(tsx?|jsx?)$/.test(entry) && !entry.endsWith('.test.ts')) {
      files.push(fullPath);
    }
  }

  return files;
}

describe('phosphor icon migration', () => {
  it('uses phosphor as the shadcn icon library', () => {
    const componentsJson = JSON.parse(
      readFileSync(join(repoRoot, 'apps/webapp/components.json'), 'utf8'),
    ) as {
      iconLibrary: string;
    };

    expect(componentsJson.iconLibrary).toBe('phosphor');
  });

  it('depends on @phosphor-icons/react instead of lucide-react', () => {
    const packageJson = JSON.parse(
      readFileSync(join(repoRoot, 'apps/webapp/package.json'), 'utf8'),
    ) as {
      dependencies: Record<string, string>;
    };

    expect(packageJson.dependencies['@phosphor-icons/react']).toBeDefined();
    expect(packageJson.dependencies['lucide-react']).toBeUndefined();
  });

  it('has no lucide-react imports under apps/webapp/src', () => {
    const webappDir = join(repoRoot, 'apps/webapp/src');
    const filesWithLucide = collectSourceFiles(webappDir).filter((file) =>
      readFileSync(file, 'utf8').includes("from 'lucide-react'"),
    );

    expect(filesWithLucide).toEqual([]);
  });
});
