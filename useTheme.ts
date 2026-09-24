import { useCallback, useLayoutEffect, useState } from 'react';

/* ---------- Dark mode toggle ---------- */
// We store the visitor's choice in localStorage so it's remembered on their
// next visit. The theme is applied by setting data-theme="dark" on <html>,
// which the CSS variables in site.css react to.
export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'gnass-theme';

function getInitialTheme(): Theme {
  // On load: use the saved preference, or fall back to the visitor's OS setting.
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'dark' || saved === 'light') return saved;
  } catch {
    /* storage blocked — ignore */
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(getInitialTheme);

  useLayoutEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    const next: Theme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    setTheme(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* storage blocked — ignore */
    }
  }, []);

  return { theme, toggleTheme };
}
