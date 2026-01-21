'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Box, LayoutDashboard, Crosshair, ArrowLeftRight, Home, FileText, FileBarChart, Clock, Shield, CheckCircle, Trophy, BarChart3, Beaker, Moon, Sun } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/components/providers/ThemeProvider';

const navItems = [
    { name: 'Home', href: '/', icon: Home },
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Trends', href: '/trends', icon: Clock },
    { name: 'Leaderboard', href: '/leaderboard', icon: Trophy },
    { name: 'Analysis', href: '/analysis', icon: BarChart3 },
    { name: 'Compare', href: '/compare', icon: ArrowLeftRight },
    { name: 'A/B Test', href: '/compare-policies', icon: Beaker },
    { name: 'Grading', href: '/grading', icon: CheckCircle },
    { name: 'Report', href: '/report', icon: FileBarChart },
];

export function NavBar() {
    const pathname = usePathname();
    const { resolvedTheme, setTheme } = useTheme();

    const toggleTheme = () => {
        setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
    };

    return (
        <nav className="sticky top-0 z-40 w-full border-b border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md transition-colors duration-300">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex h-16 items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Link href="/" className="flex items-center gap-2 font-bold text-xl tracking-tight text-slate-900 dark:text-white">
                            <div className="p-1 bg-slate-900 dark:bg-white rounded-md">
                                <Box className="h-5 w-5 text-white dark:text-slate-900" />
                            </div>
                            Moderation Bias
                        </Link>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="hidden md:flex ml-10 items-baseline space-x-4">
                            {navItems.map((item) => {
                                const isActive = pathname === item.href;
                                return (
                                    <Link
                                        key={item.name}
                                        href={item.href}
                                        className={cn(
                                            'flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200',
                                            isActive
                                                ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                                                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                                        )}
                                    >
                                        <item.icon className={cn("h-4 w-4", isActive ? "text-indigo-600 dark:text-indigo-400" : "text-slate-400 dark:text-slate-500")} />
                                        {item.name}
                                    </Link>
                                );
                            })}
                        </div>

                        {/* Dark Mode Toggle */}
                        <button
                            onClick={toggleTheme}
                            className="p-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            aria-label={`Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} mode`}
                        >
                            {resolvedTheme === 'dark' ? (
                                <Sun className="h-5 w-5 text-yellow-500" />
                            ) : (
                                <Moon className="h-5 w-5 text-slate-600" />
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </nav>
    );
}
