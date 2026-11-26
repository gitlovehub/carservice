import { createContext, useContext } from "react";

export type Theme = "light" | "dark";
export type ThemeContextValue = { theme: Theme; toggleTheme: () => void };

/** Context theme sáng/tối; giá trị do ThemeProvider (ThemeContext.tsx) cung cấp. */
export const ThemeContext = createContext<ThemeContextValue | null>(null);

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme phải được dùng trong ThemeProvider");
  return context;
}
