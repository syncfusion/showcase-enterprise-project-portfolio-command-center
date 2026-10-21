import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';

export type Theme = 'light' | 'dark';

function apply(theme: Theme) {
  const root = document.documentElement;
  root.dataset.theme = theme;
  // The Syncfusion Tailwind 3 dark variant is driven by the e-dark-mode class on <html>.
  root.classList.toggle('e-dark-mode', theme === 'dark');
}

/** The Syncfusion theme bundle is one stylesheet linked from index.html; the shell has no layout until it has loaded. */
function themeLink(): HTMLLinkElement | null {
  return document.querySelector<HTMLLinkElement>('link[rel="stylesheet"][href*="tailwind3.css"]');
}
function useThemeReady(): boolean {
  const [ready, setReady] = useState(() => { const link = themeLink(); return !link || !!link.sheet; });
  useEffect(() => {
    if (ready) return;
    const link = themeLink();
    if (!link || link.sheet) { setReady(true); return; }
    const done = () => setReady(true);
    link.addEventListener('load', done);
    link.addEventListener('error', done);
    return () => { link.removeEventListener('load', done); link.removeEventListener('error', done); };
  }, [ready]);
  return ready;
}

const Ctx = createContext<{ theme: Theme; toggle(): void; ready: boolean }>({ theme: 'light', toggle: () => {}, ready: true });

/** Kept in localStorage so the choice survives refreshes and new sessions; the system setting is the default (design/DESIGN.md). */
const THEME_KEY = 'enterprise-project-portfolio-command-center-theme';
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => (document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'));
  useEffect(() => { apply(theme); }, [theme]);
  const toggle = useCallback(() => setTheme((t) => {
    const next = t === 'dark' ? 'light' : 'dark';
    try { localStorage.setItem(THEME_KEY, next); } catch { /* storage unavailable: the choice lasts until a refresh */ }
    return next;
  }), []);
  const ready = useThemeReady();
  return <Ctx.Provider value={{ theme, toggle, ready }}>{children}</Ctx.Provider>;
}
export const useTheme = () => useContext(Ctx);