import React from "react";
import { Moon, Sun } from "lucide-react";
import { useApp } from "../context/AppContext";

interface ThemeSwitcherProps {
  className?: string;
  variant?: "icon" | "button" | "pill";
  showLabel?: boolean;
}

export const ThemeSwitcher: React.FC<ThemeSwitcherProps> = ({
  className = "",
  variant = "icon",
  showLabel = false
}) => {
  const { theme, toggleTheme } = useApp();
  const isDark = theme === "dark";

  if (variant === "pill") {
    return (
      <button
        type="button"
        onClick={toggleTheme}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border shadow-2xs ${
          isDark
            ? "bg-slate-800 hover:bg-slate-700 text-amber-300 border-slate-700"
            : "bg-white hover:bg-slate-50 text-slate-700 border-slate-200"
        } ${className}`}
        title={isDark ? "라이트 모드로 전환" : "다크 모드로 전환"}
        aria-label="테마 전환"
      >
        {isDark ? (
          <Sun className="w-3.5 h-3.5 text-amber-400 fill-amber-400/20" />
        ) : (
          <Moon className="w-3.5 h-3.5 text-indigo-600 fill-indigo-600/20" />
        )}
        <span>{isDark ? "라이트 모드" : "다크 모드"}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`p-2 rounded-xl text-xs font-bold transition-all cursor-pointer border flex items-center justify-center ${
        isDark
          ? "bg-slate-800/90 hover:bg-slate-700 text-amber-300 border-slate-700/80 shadow-inner"
          : "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200 shadow-2xs"
      } ${className}`}
      title={isDark ? "라이트 모드로 전환 (Light Mode)" : "다크 모드로 전환 (Dark Mode)"}
      aria-label="테마 전환"
    >
      {isDark ? (
        <Sun className="w-4 h-4 text-amber-400 animate-in spin-in-90 duration-200 fill-amber-400/30" />
      ) : (
        <Moon className="w-4 h-4 text-indigo-600 animate-in spin-in-90 duration-200 fill-indigo-600/30" />
      )}
      {showLabel && (
        <span className="ml-1.5">{isDark ? "Light" : "Dark"}</span>
      )}
    </button>
  );
};
