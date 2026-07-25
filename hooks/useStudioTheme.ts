import { useCallback, useState } from "react";

export type StudioTheme = "light" | "dark";

const STORAGE_KEY = "mimi_studio_theme";

export function readStudioTheme(): StudioTheme {
  if (typeof window === "undefined") return "light";
  return localStorage.getItem(STORAGE_KEY) === "dark" ? "dark" : "light";
}

export function useStudioTheme() {
  const [theme, setThemeState] = useState<StudioTheme>(() => readStudioTheme());

  const setTheme = useCallback((next: StudioTheme) => {
    setThemeState(next);
    localStorage.setItem(STORAGE_KEY, next);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === "light" ? "dark" : "light");
  }, [theme, setTheme]);

  return {
    theme,
    setTheme,
    toggleTheme,
    isDark: theme === "dark",
  };
}
