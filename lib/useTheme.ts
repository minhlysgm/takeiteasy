"use client";
import { useCallback, useEffect, useState } from "react";

export type Theme = "dark" | "light";
const KEY = "tie:theme";

function readTheme(): Theme {
  if (typeof window === "undefined") return "dark"; // SSR prerender: không có localStorage
  try {
    return localStorage.getItem(KEY) === "light" ? "light" : "dark";
  } catch {
    return "dark";
  }
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(readTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem(KEY, theme);
    } catch {
      /* ignore */
    }
  }, [theme]);

  const toggle = useCallback(() => setTheme((t) => (t === "dark" ? "light" : "dark")), []);
  return { theme, toggle };
}
