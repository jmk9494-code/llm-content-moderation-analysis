'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Box, LayoutDashboard, FileBarChart, BarChart3, ArrowRightLeft, Settings, Brain, Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
    { name: 'Overview', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Compare', href: '/compare', icon: ArrowRightLeft },
    { name: 'Deep Dive', href: '/analysis', icon: Brain },
];

export function NavBar() {
    const pathname = usePathname();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    // Hide navbar on analysis pages - they have their own sidebar navigation
    if (pathname?.startsWith('/analysis')) {
        return null;
    }

    return (
        <nav className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/80 backdrop-blur-md transition-colors duration-300">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex h-16 items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Link href="/" className="flex items-center gap-2 font-bold text-xl tracking-tight text-slate-900">
                            <div className="p-1 bg-slate-900 rounded-md">
                                <Box className="h-5 w-5 text-white" />
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
                                                ? 'bg-indigo-50 text-indigo-700'
                                                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                                        )}
                                    >
                                        <item.icon className={cn("h-4 w-4", isActive ? "text-indigo-600" : "text-slate-400")} />
                                        {item.name}
                                    </Link>
                                );
                            })}
                        </div>

                        {/* Mobile menu button */}
                        <div className="flex md:hidden">
                            <button
                                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                                className="inline-flex items-center justify-center p-2 rounded-md text-slate-400 hover:text-slate-500 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500"
                                aria-expanded="false"
                            >
                                <span className="sr-only">Open main menu</span>
                                {isMobileMenuOpen ? (
                                    <X className="block h-6 w-6" aria-hidden="true" />
                                ) : (
                                    <Menu className="block h-6 w-6" aria-hidden="true" />
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Mobile menu, show/hide based on menu state. */}
            {isMobileMenuOpen && (
                <div className="md:hidden border-t border-slate-200">
                    <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
                        {navItems.map((item) => {
                            const isActive = pathname === item.href;
                            return (
                                <Link
                                    key={item.name}
                                    href={item.href}
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className={cn(
                                        'block px-3 py-2 rounded-md text-base font-medium flex items-center gap-3',
                                        isActive
                                            ? 'bg-indigo-50 text-indigo-700'
                                            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                                    )}
                                >
                                    <div className={cn("p-1 rounded-md", isActive ? "bg-white" : "bg-slate-100")}>
                                        <item.icon className={cn("h-5 w-5", isActive ? "text-indigo-600" : "text-slate-500")} />
                                    </div>
                                    <div>
                                        <span className="block text-sm font-semibold">{item.name}</span>
                                        <span className="block text-xs opacity-70 font-normal">Navigate to {item.name.toLowerCase()}</span>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                </div>
            )}

        </nav >
    );
}
