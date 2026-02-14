'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
    LayoutDashboard, FileText, TrendingUp, Shield, Compass, Scale, DollarSign,
    Network, ListChecks, Users, Menu, X, ChevronDown, ArrowRightLeft, Table
} from 'lucide-react';
import { useState } from 'react';
import { ThemeToggle } from '@/components/ThemeToggle';

const navItems = [
    { name: 'Comparison', href: '/compare', icon: ArrowRightLeft },
    {
        name: 'Analysis',
        icon: FileText,
        dropdown: [
            { title: 'Summary', href: '/analysis/summary', icon: FileText },
            { title: 'Reliability', href: '/analysis/reliability', icon: Shield },
            { title: 'Model Stability', href: '/analysis/drift', icon: TrendingUp },
            { title: 'Significance', href: '/analysis/significance', icon: Scale },
            { title: 'Political Compass', href: '/analysis/political', icon: Compass },
            { title: 'Paternalism', href: '/analysis/paternalism', icon: Shield },
            { title: 'Alignment Tax', href: '/analysis/alignment', icon: DollarSign },
        ]
    },
    {
        name: 'Technical',
        icon: Network,
        dropdown: [
            { title: 'Semantic Clusters', href: '/analysis/clusters', icon: Network },
            { title: 'Trigger List', href: '/analysis/triggers', icon: ListChecks },
            { title: 'Council Consensus', href: '/analysis/consensus', icon: Users },
        ]
    },
    { name: 'Database', href: '/audit', icon: Table }
];

export function NavBar() {
    const pathname = usePathname();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

    return (
        <nav className="sticky top-0 z-40 w-full bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
            <div className="max-w-7xl mx-auto px-4 md:px-8">
                <div className="flex h-14 items-center justify-between">
                    {/* Left: Mobile Menu & Logo Placeholder/Title if needed */}
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                            className="md:hidden p-2 rounded-md hover:bg-accent hover:text-accent-foreground"
                        >
                            {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                        </button>

                        {/* Desktop Nav */}
                        <div className="hidden md:flex items-center gap-1">
                            {navItems.map((item) => {
                                if (item.dropdown) {
                                    const isActive = item.dropdown.some(sub => pathname === sub.href);
                                    return (
                                        <div
                                            key={item.name}
                                            className="relative group"
                                            onMouseEnter={() => setActiveDropdown(item.name)}
                                            onMouseLeave={() => setActiveDropdown(null)}
                                        >
                                            <button
                                                className={cn(
                                                    "flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-md transition-colors",
                                                    isActive ? "text-primary bg-primary/5" : "text-muted-foreground hover:text-foreground hover:bg-accent"
                                                )}
                                            >
                                                <item.icon className="h-4 w-4" />
                                                {item.name}
                                                <ChevronDown className="h-3 w-3 opacity-50" />
                                            </button>

                                            {/* Dropdown */}
                                            <div className="absolute left-0 top-full pt-2 w-56 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 transform origin-top-left z-50">
                                                <div className="bg-white dark:bg-zinc-800 border border-border rounded-md shadow-md p-1">
                                                    {item.dropdown.map(sub => (
                                                        <Link
                                                            key={sub.href}
                                                            href={sub.href}
                                                            className={cn(
                                                                "flex items-center gap-2 px-3 py-2 text-sm rounded-sm transition-colors",
                                                                pathname === sub.href ? "bg-accent text-accent-foreground" : "hover:bg-accent hover:text-accent-foreground"
                                                            )}
                                                        >
                                                            <sub.icon className="h-4 w-4 text-muted-foreground" />
                                                            {sub.title}
                                                        </Link>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                }

                                const isActive = pathname === item.href;
                                return (
                                    <Link
                                        key={item.name}
                                        href={item.href}
                                        className={cn(
                                            "flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-md transition-colors",
                                            isActive ? "text-primary bg-primary/5" : "text-muted-foreground hover:text-foreground hover:bg-accent"
                                        )}
                                    >
                                        <item.icon className="h-4 w-4" />
                                        {item.name}
                                    </Link>
                                );
                            })}
                        </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-2">
                        <ThemeToggle />
                    </div>
                </div>
            </div>

            {/* Mobile Menu */}
            {isMobileMenuOpen && (
                <div className="md:hidden border-t border-border bg-background p-4 space-y-4">
                    {navItems.map((item) => (
                        <div key={item.name} className="space-y-2">
                            {item.dropdown ? (
                                <>
                                    <div className="font-semibold text-sm px-2 text-muted-foreground">{item.name}</div>
                                    <div className="pl-4 space-y-1">
                                        {item.dropdown.map(sub => (
                                            <Link
                                                key={sub.href}
                                                href={sub.href}
                                                onClick={() => setIsMobileMenuOpen(false)}
                                                className={cn(
                                                    "flex items-center gap-2 px-2 py-2 text-sm rounded-md",
                                                    pathname === sub.href ? "bg-accent text-accent-foreground" : "hover:bg-accent"
                                                )}
                                            >
                                                <sub.icon className="h-4 w-4" />
                                                {sub.title}
                                            </Link>
                                        ))}
                                    </div>
                                </>
                            ) : (
                                <Link
                                    href={item.href}
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className={cn(
                                        "flex items-center gap-2 px-2 py-2 text-sm font-medium rounded-md",
                                        pathname === item.href ? "bg-accent text-accent-foreground" : "hover:bg-accent"
                                    )}
                                >
                                    <item.icon className="h-4 w-4" />
                                    {item.name}
                                </Link>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </nav>
    );
}
