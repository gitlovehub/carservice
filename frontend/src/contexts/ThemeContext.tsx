import { useEffect, useMemo, useState } from "react";
import type { PropsWithChildren } from "react";
import { ThemeContext, type Theme } from "./theme";

/** Cùng khoá với script chống nháy trong index.html. Hook đọc theme: useTheme() trong contexts/theme.ts. */
const THEME_KEY = "carservice-theme";
const SYSTEM_DARK = "(prefers-color-scheme: dark)";

function savedTheme(): Theme | null {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    return saved === "light" || saved === "dark" ? saved : null;
  } catch {
    return null; // Chế độ riêng tư có thể vô hiệu hóa storage.
  }
}

function systemTheme(): Theme {
  return window.matchMedia?.(SYSTEM_DARK).matches ? "dark" : "light";
}

function initialTheme(): Theme {
  // Script trong index.html đã gắn theme trước khi vẽ; đọc lại để state khớp, tránh nháy.
  const preset = document.documentElement.dataset.theme;
  if (preset === "light" || preset === "dark") return preset;
  return savedTheme() ?? systemTheme();
}

/**
 * Theme sáng/tối: mặc định theo hệ điều hành; chỉ ghi nhớ khi người dùng tự chọn.
 * Giá trị được gắn vào html[data-theme] — mọi token trong styles/tokens.css đổi theo.
 */
export function ThemeProvider({ children }: PropsWithChildren) {
  const [theme, setTheme] = useState<Theme>(initialTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
  }, [theme]);

  // Chưa chọn thủ công thì đi theo thay đổi của hệ điều hành.
  useEffect(() => {
    const media = window.matchMedia?.(SYSTEM_DARK);
    if (!media) return;
    const follow = () => { if (!savedTheme()) setTheme(media.matches ? "dark" : "light"); };
    media.addEventListener("change", follow);
    return () => media.removeEventListener("change", follow);
  }, []);

  const value = useMemo(() => ({
    theme,
    toggleTheme: () => setTheme(previous => {
      const next: Theme = previous === "light" ? "dark" : "light";
      try { localStorage.setItem(THEME_KEY, next); } catch { /* Giữ trạng thái trong phiên. */ }
      return next;
    }),
  }), [theme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
