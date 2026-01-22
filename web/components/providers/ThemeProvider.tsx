'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
    theme: Theme;
    resolvedTheme: 'light' | 'dark';
    setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
    const [theme, setThemeState] = useState<Theme>('light');
    const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light');
    const [mounted, setMounted] = useState(false);

    // Load saved theme from localStorage on mount
    useEffect(() => {
        setMounted(true);
        const saved = localStorage.getItem('theme') as Theme | null;
        if (saved && ['light', 'dark', 'system'].includes(saved)) {
            setThemeState(saved);
        }
    }, []);

    // Apply theme changes
    useEffect(() => {
        if (!mounted) return;

        const root = window.document.documentElement;

        const applyTheme = (isDark: boolean) => {
            if (isDark) {
                root.classList.add('dark');
                root.style.colorScheme = 'dark';
                setResolvedTheme('dark');
            } else {
                root.classList.remove('dark');
                root.style.colorScheme = 'light';
                setResolvedTheme('light');
            }
        };

        if (theme === 'system') {
            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            applyTheme(mediaQuery.matches);

            const handler = (e: MediaQueryListEvent) => applyTheme(e.matches);
            mediaQuery.addEventListener('change', handler);
            return () => mediaQuery.removeEventListener('change', handler);
        } else {
            applyTheme(theme === 'dark');
        }
    }, [theme, mounted]);

    const setTheme = (newTheme: Theme) => {
        setThemeState(newTheme);
        localStorage.setItem('theme', newTheme);
    };

    // Prevent hydration mismatch by not rendering until mounted
    if (!mounted) {
        return <>{children}</>;
    }

    return (
        <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
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
