import { MoonIcon, SunIcon } from '@phosphor-icons/react';
import { useEffect, useState } from 'react';
import { Button } from '#apps/webapp/components/ui/button';
import { applyTheme, readStoredTheme, type Theme, themeIsDark } from '#apps/webapp/lib/theme';

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(() =>
    typeof window !== 'undefined' ? readStoredTheme() : 'dark',
  );

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const isDark = themeIsDark(theme);

  return (
    <Button
      type="button"
      variant="icon"
      color="gray"
      size="icon-md"
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      onClick={() => {
        setTheme(isDark ? 'light' : 'dark');
      }}
    >
      {isDark ? <SunIcon size={20} /> : <MoonIcon size={20} />}
    </Button>
  );
}
