import { useEffect, useMemo, useState } from "react";

import type { Theme } from "./context";

import { ThemeContext } from "./context";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    const stored = localStorage.getItem("theme") as Theme;
    return stored || "system";
  });

  useEffect(() => {
    const root = window.document.documentElement;

    root.classList.remove("light", "dark");

    if (theme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)")
        .matches
        ? "dark"
        : "light";

      root.classList.add(systemTheme);
    }
    else {
      root.classList.add(theme);
    }
  }, [theme]);

  const handleSetTheme = (theme: Theme) => {
    localStorage.setItem("theme", theme);
    setTheme(theme);
  };

  const value = useMemo(() => ({
    theme,
    setTheme: handleSetTheme,
  }), [theme]);

  return (
    <ThemeContext value={value}>
      {children}
    </ThemeContext>
  );
}
