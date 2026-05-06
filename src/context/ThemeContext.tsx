import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface ThemeContextType {
  isDark: boolean;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Initialize from current theme attribute
  const [isDark, setIsDark] = useState(() => {
    return document.documentElement.getAttribute('data-theme') !== 'light';
  });

  // Listen for theme changes from menu (main process)
  useEffect(() => {
    const cleanup = window.everclawAPI?.onThemeChanged(() => {
      setIsDark((prev) => {
        const next = !prev;
        document.documentElement.setAttribute('data-theme', next ? 'dark' : 'light');
        return next;
      });
    });
    return cleanup;
  }, []);

  const toggleTheme = () => {
    setIsDark((prev) => {
      const next = !prev;
      document.documentElement.setAttribute('data-theme', next ? 'dark' : 'light');
      return next;
    });
  };

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}