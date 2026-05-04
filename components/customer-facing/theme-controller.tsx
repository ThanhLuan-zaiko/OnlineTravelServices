"use client";

import { useEffect } from "react";
import { FiMoon, FiSun } from "react-icons/fi";

import { useAppStore, type ThemeMode } from "@/stores/app-store";

const THEME_STORAGE_KEY = "online-travel-theme";

function writeThemePreference(theme: ThemeMode) {
  window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  document.cookie = `${THEME_STORAGE_KEY}=${theme}; path=/; max-age=31536000; samesite=lax`;
}

function resolveTheme(theme: ThemeMode) {
  if (theme !== "system") {
    return theme;
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function applyTheme(theme: ThemeMode) {
  const resolvedTheme = resolveTheme(theme);

  document.documentElement.classList.toggle("dark", resolvedTheme === "dark");
  document.documentElement.style.colorScheme = resolvedTheme;
}

export function useThemeController() {
  const theme = useAppStore((state) => state.theme);
  const setTheme = useAppStore((state) => state.setTheme);

  useEffect(() => {
    const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);

    if (
      storedTheme === "system" ||
      storedTheme === "light" ||
      storedTheme === "dark"
    ) {
      setTheme(storedTheme);
    }
  }, [setTheme]);

  useEffect(() => {
    applyTheme(theme);
    writeThemePreference(theme);

    if (theme !== "system") {
      return;
    }

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleSystemThemeChange = () => applyTheme("system");

    mediaQuery.addEventListener("change", handleSystemThemeChange);

    return () => {
      mediaQuery.removeEventListener("change", handleSystemThemeChange);
    };
  }, [theme]);
}

export function ThemeToggle() {
  const theme = useAppStore((state) => state.theme);
  const setTheme = useAppStore((state) => state.setTheme);
  const isLightSelected = theme === "light";
  const isDarkSelected = theme === "dark";

  return (
    <div className="inline-flex items-center overflow-hidden rounded-2xl bg-transparent p-0">
      <button
        aria-label="Dùng giao diện sáng"
        className={`flex h-10 w-10 items-center justify-center rounded-xl transition ${
          isLightSelected
            ? "bg-amber-100 text-amber-700 dark:bg-amber-300 dark:text-amber-950"
            : "text-slate-500 hover:text-slate-950 dark:text-neutral-400 dark:hover:text-neutral-50"
        }`}
        onClick={() => setTheme("light")}
        type="button"
      >
        <FiSun size={18} />
      </button>
      <button
        aria-label="Dùng giao diện tối"
        className={`flex h-10 w-10 items-center justify-center rounded-xl transition ${
          isDarkSelected
            ? "bg-sky-100 text-sky-700 dark:bg-sky-400 dark:text-sky-950"
            : "text-slate-500 hover:text-slate-950 dark:text-neutral-400 dark:hover:text-neutral-50"
        }`}
        onClick={() => setTheme("dark")}
        type="button"
      >
        <FiMoon size={18} />
      </button>
    </div>
  );
}
