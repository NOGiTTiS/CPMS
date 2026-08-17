"use client";

import { Sun, Moon } from "lucide-react";
import { useTheme } from "./theme-provider";

export function ThemeToggle({ showLabel = true }: { showLabel?: boolean }) {
  const { setTheme, isDark } = useTheme();

  const toggle = () => {
    setTheme(isDark ? "light" : "dark");
  };

  return (
    <button
      id="themeToggle"
      onClick={toggle}
      type="button"
      className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all border border-slate-200 dark:border-slate-700 shadow-xs cursor-pointer"
      title="Toggle theme"
    >
      {isDark ? (
        <Sun className="w-4 h-4 text-amber-400" />
      ) : (
        <Moon className="w-4 h-4 text-slate-600 dark:text-slate-300" />
      )}
      {showLabel && (
        <span className="hidden sm:inline">
          {isDark ? "Light Mode" : "Dark Mode"}
        </span>
      )}
    </button>
  );
}
