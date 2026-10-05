import { describe, expect, it } from 'vite-plus/test';
import { extractDsThemeTokens } from './extract-ds-theme-tokens.ts';

const FIXTURE = `
@import 'tailwindcss';

@theme {
  --font-sans: 'Inter', sans-serif;
  --color-gray-50: #faf8f2;
}

:root,
:host {
  --color-gray-50: #faf8f2;
  --color-gray-950: #111111;
}

@theme static {
  --color-ds-blue-500: #003e53;
  --color-background-default: #ffffff;
  --color-text-primary: #111111;
  --color-action-primary: var(--color-ds-blue-500);
  --font-ds-display: 'Bricolage Grotesque', sans-serif;
  --font-ds-mono: 'IBM Plex Mono', monospace;
}

html.light body {
  font-weight: 500;
}

html.dark {
  --color-background-default: #111111;
  --color-text-primary: #ffffff;
  --color-action-primary: #3aa3c4;
}

@layer base {
  html.dark {
    color-scheme: dark;
  }
}
`;

describe('extractDsThemeTokens', () => {
  it('extracts @theme static, gray :root bridge, and semantic html.dark', () => {
    const out = extractDsThemeTokens(FIXTURE);

    expect(out).toContain('AUTO-GENERATED');
    expect(out).toContain('@theme static');
    expect(out).toContain('--color-background-default: #ffffff');
    expect(out).toContain('--font-ds-display');
    expect(out).toMatch(/:root\s*,\s*:host/);
    expect(out).toContain('--color-gray-950: #111111');
    expect(out).toContain('html.dark');
    expect(out).toContain('--color-background-default: #111111');
    expect(out).not.toContain("@import 'tailwindcss'");
    expect(out).not.toContain('color-scheme: dark');
    expect(out).not.toContain('html.light body');
  });

  it('throws when required blocks are missing', () => {
    expect(() => extractDsThemeTokens('@theme static { --x: 1; }')).toThrow(/html\.dark/);
    expect(() =>
      extractDsThemeTokens(`
        @theme static { --color-background-default: #fff; }
        html.dark { --color-background-default: #111; }
      `),
    ).toThrow(/:root, :host/);
    expect(() => extractDsThemeTokens('html.dark { --x: 1; }')).toThrow(/@theme static/);
  });
});
