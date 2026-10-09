export type Theme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'tanstack-aws-theme';

export function resolveTheme(stored: string | null | undefined): Theme {
  if (stored === 'light' || stored === 'dark') {
    return stored;
  }
  return 'dark';
}

export function themeIsDark(theme: Theme): boolean {
  return theme === 'dark';
}

export function readStoredTheme(): Theme {
  if (typeof window === 'undefined') {
    return 'dark';
  }
  return resolveTheme(window.localStorage.getItem(THEME_STORAGE_KEY));
}

export function applyTheme(theme: Theme): void {
  if (typeof document === 'undefined') {
    return;
  }
  document.documentElement.classList.toggle('dark', themeIsDark(theme));
  window.localStorage.setItem(THEME_STORAGE_KEY, theme);
}
