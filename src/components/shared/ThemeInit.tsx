"use client";

import { useEffect } from "react";

export default function ThemeInit() {
  useEffect(() => {
    const stored = localStorage.getItem("petrolsaver-theme-manual");
    const hour = new Date().getHours();
    const theme = stored || (hour >= 6 && hour < 19 ? "light" : "dark");
    document.documentElement.classList.remove("dark", "light");
    document.documentElement.classList.add(theme);
  }, []);

  return null;
}
