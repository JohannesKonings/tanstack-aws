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

  it('publishes form and overlay primitive registry items input, dialog, and dropdown', () => {
    const registry = JSON.parse(readFileSync(join(packageRoot, 'registry.json'), 'utf8')) as {
      items: Array<{ name: string; type: string; dependencies?: string[] }>;
    };
    const itemNames = registry.items.map((item) => item.name);
    expect(itemNames).toContain('input');
    expect(itemNames).toContain('dialog');
    expect(itemNames).toContain('dropdown');

    const dialogItem = registry.items.find((item) => item.name === 'dialog');
    expect(dialogItem?.dependencies).toContain('@radix-ui/react-dialog');

    const dropdownItem = registry.items.find((item) => item.name === 'dropdown');
    expect(dropdownItem?.dependencies).toContain('@radix-ui/react-dropdown-menu');

    execSync('pnpm exec shadcn build', { cwd: packageRoot, stdio: 'pipe' });

    for (const name of ['input', 'dialog', 'dropdown'] as const) {
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

    const inputSource = readFileSync(join(packageRoot, 'registry/input/input.tsx'), 'utf8');
    expect(inputSource).toContain('focus:border-border-strong');
    expect(inputSource).not.toContain('focus:ring-2');

    const dialogSource = readFileSync(join(packageRoot, 'registry/dialog/dialog.tsx'), 'utf8');
    expect(dialogSource).toContain('DialogPrimitive');
    expect(dialogSource).toContain('data-ds-dialog-panel');

    const dropdownSource = readFileSync(
      join(packageRoot, 'registry/dropdown/dropdown.tsx'),
      'utf8',
    );
    expect(dropdownSource).toContain('SelectDropdown');
    expect(dropdownSource).toContain('DropdownMenu');
  });

  it('publishes extended catalog registry items spinner through favicons', () => {
    const registry = JSON.parse(readFileSync(join(packageRoot, 'registry.json'), 'utf8')) as {
      items: Array<{ name: string; type: string }>;
    };
    const itemNames = registry.items.map((item) => item.name);
    for (const name of [
      'spinner',
      'stats-section',
      'breadcrumbs',
      'page-header',
      'partner-rail',
      'brand-logos',
      'favicons',
    ] as const) {
      expect(itemNames).toContain(name);
    }

    execSync('pnpm exec shadcn build', { cwd: packageRoot, stdio: 'pipe' });

    for (const name of [
      'spinner',
      'stats-section',
      'breadcrumbs',
      'page-header',
      'partner-rail',
      'brand-logos',
      'favicons',
    ] as const) {
      const itemPath = join(packageRoot, `public/r/${name}.json`);
      expect(existsSync(itemPath)).toBe(true);
    }

    const spinnerSource = readFileSync(join(packageRoot, 'registry/spinner/spinner.tsx'), 'utf8');
    expect(spinnerSource).toContain('CircleNotchIcon');
    expect(spinnerSource).toContain('PalmSpinner');

    const statsSource = readFileSync(
      join(packageRoot, 'registry/stats-section/stats-section.tsx'),
      'utf8',
    );
    expect(statsSource).toContain('export function StatsSection');

    const breadcrumbsSource = readFileSync(
      join(packageRoot, 'registry/breadcrumbs/breadcrumbs.tsx'),
      'utf8',
    );
    expect(breadcrumbsSource).toContain('BreadcrumbHeading');
    expect(breadcrumbsSource).toContain('On this page');

    const pageHeaderSource = readFileSync(
      join(packageRoot, 'registry/page-header/page-header.tsx'),
      'utf8',
    );
    expect(pageHeaderSource).toContain('ds-brand-mark');

    const partnerRailSource = readFileSync(
      join(packageRoot, 'registry/partner-rail/partner-rail.tsx'),
      'utf8',
    );
    expect(partnerRailSource).toContain('PartnerRail');
    expect(partnerRailSource).toContain('PartnerTier');

    const emblemPath = join(packageRoot, 'registry/brand/assets/tanstack-emblem-black.svg');
    expect(existsSync(emblemPath)).toBe(true);

    const faviconPath = join(packageRoot, 'registry/brand/favicons/favicon-light.svg');
    expect(existsSync(faviconPath)).toBe(true);
  });
});
