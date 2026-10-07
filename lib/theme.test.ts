import { describe, expect, it } from 'vite-plus/test';
import { resolveTheme, themeIsDark } from '#apps/webapp/lib/theme';

describe('theme', () => {
  it('defaults to dark when no preference is stored', () => {
    expect(resolveTheme(null)).toBe('dark');
  });

  it('restores stored light or dark preference', () => {
    expect(resolveTheme('light')).toBe('light');
    expect(resolveTheme('dark')).toBe('dark');
  });

  it('maps theme to html.dark class presence', () => {
    expect(themeIsDark('dark')).toBe(true);
    expect(themeIsDark('light')).toBe(false);
  });
});
