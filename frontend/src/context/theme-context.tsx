'use client';

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';

// ── Color palettes ──────────────────────────────────────────────────────────

export interface ThemePalette {
  name: string;
  bg: string;
  fg: string;
  fgDim: string;
  fgMuted: string;
  accent: string;
  accentDim: string;
  accentBorder: string;
  card: string;
  border: string;
  glow: string;
  accent2: string;
}

const OMNICAT: ThemePalette = {
  name: 'OmniCAT',
  bg: '#111113',
  fg: '#fffaeb',
  fgDim: 'rgba(255, 250, 235, 0.45)',
  fgMuted: 'rgba(255, 250, 235, 0.2)',
  accent: '#fa500f',
  accentDim: 'rgba(250, 80, 15, 0.15)',
  accentBorder: 'rgba(250, 80, 15, 0.3)',
  card: 'rgba(255, 250, 235, 0.04)',
  border: 'rgba(255, 250, 235, 0.08)',
  glow: 'rgba(250, 80, 15, 0.12)',
  accent2: '#fa500f',
};

const CYBERPUNK: ThemePalette = {
  name: 'Cyberpunk',
  bg: '#0a0e1a',
  fg: '#e0f0ff',
  fgDim: 'rgba(224, 240, 255, 0.45)',
  fgMuted: 'rgba(224, 240, 255, 0.2)',
  accent: '#00f0ff',
  accentDim: 'rgba(0, 240, 255, 0.12)',
  accentBorder: 'rgba(0, 240, 255, 0.35)',
  card: 'rgba(0, 240, 255, 0.04)',
  border: 'rgba(0, 240, 255, 0.10)',
  glow: 'rgba(0, 240, 255, 0.10)',
  accent2: '#ff00aa',
};

export const THEMES = { omnicat: OMNICAT, cyberpunk: CYBERPUNK } as const;
export type ThemeKey = keyof typeof THEMES;

// ── Context ─────────────────────────────────────────────────────────────────

interface ThemeContextValue {
  themeKey: ThemeKey;
  theme: ThemePalette;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  themeKey: 'omnicat',
  theme: OMNICAT,
  toggle: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

// ── Provider ────────────────────────────────────────────────────────────────

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [key, setKey] = useState<ThemeKey>('omnicat');

  // Restore saved theme on mount
  useEffect(() => {
    const saved = localStorage.getItem('omnicat-theme') as ThemeKey | null;
    if (saved && saved in THEMES) setKey(saved);
  }, []);

  // Apply CSS variables whenever theme changes
  useEffect(() => {
    const t = THEMES[key];
    const root = document.documentElement;
    root.setAttribute('data-theme', key);
    root.style.setProperty('--bg', t.bg);
    root.style.setProperty('--fg', t.fg);
    root.style.setProperty('--fg-dim', t.fgDim);
    root.style.setProperty('--fg-muted', t.fgMuted);
    root.style.setProperty('--orange', t.accent);
    root.style.setProperty('--orange-dim', t.accentDim);
    root.style.setProperty('--orange-border', t.accentBorder);
    root.style.setProperty('--card', t.card);
    root.style.setProperty('--border', t.border);
    localStorage.setItem('omnicat-theme', key);
  }, [key]);

  const toggle = useCallback(() => {
    setKey(prev => (prev === 'omnicat' ? 'cyberpunk' : 'omnicat'));
  }, []);

  // Global keyboard shortcut: Ctrl+Shift+X (or Cmd+Shift+X on macOS)
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'x') {
        e.preventDefault();
        toggle();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [toggle]);

  return (
    <ThemeContext.Provider value={{ themeKey: key, theme: THEMES[key], toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}
