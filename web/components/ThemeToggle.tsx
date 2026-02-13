"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

export function ThemeToggle() {
    const { setTheme, theme } = useTheme()
    const [mounted, setMounted] = React.useState(false)

    React.useEffect(() => {
        setMounted(true)
    }, [])

    if (!mounted) {
        return (
            <button className="p-2 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors">
                <Sun className="h-5 w-5" />
                <span className="sr-only">Toggle theme</span>
            </button>
        )
    }

    return (
        <button
            className="p-2 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        >
            {theme === "dark" ? (
                <Moon className="h-5 w-5" />
            ) : (
                <Sun className="h-5 w-5" />
            )}
            <span className="sr-only">Toggle theme</span>
        </button>
    )
}
