"use client";

import { useEffect } from "react";

export default function ThemeInit() {
  useEffect(() => {
    const stored = localStorage.getItem("petrolsaver-theme-manual");
    const hour = new Date().getHours();
    const theme = stored || "light";
    document.documentElement.classList.remove("dark", "light");
    document.documentElement.classList.add(theme);
  }, []);

  return null;
}
