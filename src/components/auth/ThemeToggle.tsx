"use client";
import { useEffect, useState, type ReactElement } from "react";

export function ThemeToggle({
  onChange,
}: { onChange?: (light: boolean) => void } = {}): ReactElement {
  const [light, setLight] = useState(false);
  useEffect(() => {
    try {
      const saved = localStorage.getItem("theme") === "light";
      setLight(saved);
      document.documentElement.classList.toggle("light", saved);
      onChange?.(saved);
    } catch {
      /* Storage is optional. */
    }
  }, [onChange]);
  function toggle(): void {
    const next = !light;
    setLight(next);
    document.documentElement.classList.toggle("light", next);
    onChange?.(next);
    try {
      localStorage.setItem("theme", next ? "light" : "dark");
    } catch {
      /* Storage is optional. */
    }
  }
  return (
    <button
      className="theme-toggle"
      type="button"
      onClick={toggle}
      aria-label="Toggle color theme"
    >
      {light ? "◐ Dark mode" : "◑ Light mode"}
    </button>
  );
}
