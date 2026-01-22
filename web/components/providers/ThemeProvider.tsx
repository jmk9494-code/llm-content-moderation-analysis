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

    // Force light mode always
    useEffect(() => {
        setMounted(true);
        setThemeState('light');
    }, []);

    // Apply theme changes (Always light)
    useEffect(() => {
        if (!mounted) return;
        const root = window.document.documentElement;
        root.classList.remove('dark');
        root.style.colorScheme = 'light';
        setResolvedTheme('light');
        // Clear any saved theme
        localStorage.removeItem('theme');
    }, [mounted]);

    const setTheme = (newTheme: Theme) => {
        // No-op or just set light
        setThemeState('light');
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
        // Return safe fallback for static page generation
        return {
            theme: 'light' as const,
            resolvedTheme: 'light' as const,
            setTheme: () => { },
        };
    }
    return context;
}
