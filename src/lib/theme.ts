"use client";

import { useEffect, useState, useCallback } from "react";

export type Theme = "dark" | "light";

function getTimeBasedTheme(): Theme {
  const hour = new Date().getHours();
  // Light mode: 6am - 7pm, Dark mode: 7pm - 6am
  return hour >= 6 && hour < 19 ? "light" : "dark";
}

function getInitialTheme(): Theme {
  if (typeof window === "undefined") return "dark";
  const stored = localStorage.getItem("petrolsaver-theme-manual");
  // If user manually toggled, respect that for this session
  if (stored) return stored as Theme;
  return getTimeBasedTheme();
}

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.classList.remove("dark", "light");
  root.classList.add(theme);
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>("dark");
  const [currentTime, setCurrentTime] = useState("");

  useEffect(() => {
    const initial = getInitialTheme();
    setThemeState(initial);
    applyTheme(initial);

    // Update clock every minute
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit", hour12: true })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 60_000);

    return () => clearInterval(interval);
  }, []);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    applyTheme(t);
    // Mark as manually set so it persists until page reload
    localStorage.setItem("petrolsaver-theme-manual", t);
  }, []);

  const toggle = useCallback(() => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
  }, [theme, setTheme]);

  return { theme, setTheme, toggle, currentTime };
}
