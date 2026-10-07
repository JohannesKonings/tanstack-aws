import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vite-plus/test';

const packageRoot = dirname(fileURLToPath(import.meta.url));

describe('tanstack-ds registry', () => {
  it('registry.json validates against the shadcn registry schema', () => {
    const registry = JSON.parse(readFileSync(join(packageRoot, 'registry.json'), 'utf8')) as {
      $schema: string;
      name: string;
      items?: Array<{ name: string }>;
    };
    expect(registry.$schema).toBe('https://ui.shadcn.com/schema/registry.json');
    expect(registry.name).toBe('tanstack-ds');
    expect(registry.items?.length).toBeGreaterThan(0);
  });

  it('shadcn build emits static registry JSON with required fields', () => {
    execSync('pnpm exec shadcn build', { cwd: packageRoot, stdio: 'pipe' });

    const themeJsonPath = join(packageRoot, 'public/r/theme.json');
    expect(existsSync(themeJsonPath)).toBe(true);

    const themeItem = JSON.parse(readFileSync(themeJsonPath, 'utf8')) as {
      name: string;
      type: string;
      files: Array<{ path: string; type: string }>;
    };
    expect(themeItem.name).toBe('theme');
    expect(themeItem.type).toBe('registry:theme');
    expect(themeItem.files.length).toBeGreaterThan(0);
    for (const file of themeItem.files) {
      expect(file.path).toBeTruthy();
      expect(file.type).toBeTruthy();
    }
  });

  it('shadcn build emits button registry item with DS variant/color API', () => {
    execSync('pnpm exec shadcn build', { cwd: packageRoot, stdio: 'pipe' });

    const buttonJsonPath = join(packageRoot, 'public/r/button.json');
    expect(existsSync(buttonJsonPath)).toBe(true);

    const buttonItem = JSON.parse(readFileSync(buttonJsonPath, 'utf8')) as {
      name: string;
      type: string;
      files: Array<{ content?: string; path: string; type: string }>;
    };
    expect(buttonItem.name).toBe('button');
    expect(buttonItem.type).toBe('registry:ui');
    expect(buttonItem.files.length).toBe(1);

    const source =
      buttonItem.files[0]?.content ??
      readFileSync(join(packageRoot, 'registry/ui/button.tsx'), 'utf8');
    expect(source).toContain('variant?: ButtonVariant');
    expect(source).toContain('color?: ButtonColor');
    expect(source).not.toContain('class-variance-authority');
  });

  it('publishes layout primitive registry items badge, card, and tabs', () => {
    const registry = JSON.parse(readFileSync(join(packageRoot, 'registry.json'), 'utf8')) as {
      items: Array<{ name: string; type: string }>;
    };
    const itemNames = registry.items.map((item) => item.name);
    expect(itemNames).toContain('badge');
    expect(itemNames).toContain('card');
    expect(itemNames).toContain('tabs');

    execSync('pnpm exec shadcn build', { cwd: packageRoot, stdio: 'pipe' });

    for (const name of ['badge', 'card', 'tabs'] as const) {
      const itemPath = join(packageRoot, `public/r/${name}.json`);
      expect(existsSync(itemPath)).toBe(true);

      const item = JSON.parse(readFileSync(itemPath, 'utf8')) as {
        name: string;
        type: string;
        files: Array<{ path: string; type: string; content?: string }>;
      };
      expect(item.name).toBe(name);
      expect(item.type).toBe('registry:ui');
      expect(item.files.length).toBeGreaterThan(0);
      expect(item.files[0]?.content).toBeTruthy();
    }
  });
});
