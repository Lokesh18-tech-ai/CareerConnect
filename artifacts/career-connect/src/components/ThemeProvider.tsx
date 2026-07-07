import { useEffect, useState, type ReactNode } from "react";
import { ThemeProvider as NextThemesProvider, useTheme as useNextTheme } from "next-themes";

const STORAGE_KEY = "cc-theme";

/**
 * Wraps next-themes with CareerConnect's conventions:
 * - class-based dark mode (adds/removes `.dark` on <html>) so every existing
 *   `dark:` utility class across the app keeps working unchanged
 * - persists the explicit choice in localStorage under `cc-theme`
 * - detects the OS/browser preference the first time a visitor arrives
 * - briefly enables a scoped CSS transition so the swap between themes is smooth
 *   instead of an abrupt flash
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      storageKey={STORAGE_KEY}
      disableTransitionOnChange
    >
      <ThemeTransitionBridge />
      {children}
    </NextThemesProvider>
  );
}

/** Adds a short-lived class to <html> whenever the resolved theme changes,
 *  so color-relevant CSS properties animate instead of snapping instantly. */
function ThemeTransitionBridge() {
  const { resolvedTheme } = useNextTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!mounted) return;
    const root = document.documentElement;
    root.classList.add("theme-transition");
    const id = window.setTimeout(() => root.classList.remove("theme-transition"), 220);
    return () => window.clearTimeout(id);
  }, [resolvedTheme, mounted]);

  return null;
}

export type Theme = "light" | "dark" | "system";

/** Re-exported so the rest of the app only ever imports theme utilities from
 *  this one module rather than reaching into next-themes directly. */
export function useTheme() {
  const { theme, resolvedTheme, setTheme, systemTheme } = useNextTheme();
  return {
    /** the user's explicit choice — may be "system" */
    theme: theme as Theme | undefined,
    /** the theme actually applied right now ("light" | "dark") */
    resolvedTheme: resolvedTheme as "light" | "dark" | undefined,
    systemTheme: systemTheme as "light" | "dark" | undefined,
    setTheme: setTheme as (theme: Theme) => void,
  };
}
