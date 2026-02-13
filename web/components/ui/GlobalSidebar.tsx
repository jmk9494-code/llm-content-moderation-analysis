'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    Box, LayoutDashboard, ArrowRightLeft, Brain,
    Menu, X, ChevronRight,
    FileText, TrendingUp, Shield, Compass, Scale, DollarSign,
    Network, ListChecks, Users
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ThemeToggle } from '@/components/ThemeToggle';
import { CommandPalette } from '@/components/ui/CommandPalette';
import { useSidebar } from '@/components/providers/SidebarProvider';
import { Search } from 'lucide-react';


const mainNavItems = [
    { name: 'Overview', href: '/dashboard', icon: LayoutDashboard },
];

const analysisCategories = [
    {
        title: 'Summary',
        items: [
            { name: 'Summary', href: '/analysis/summary', icon: FileText },
            { name: 'Longitudinal', href: '/analysis/longitudinal', icon: TrendingUp },
        ]
    },
    {
        title: 'Reliability',
        items: [
            { name: 'Reliability', href: '/analysis/reliability', icon: Shield },
            { name: 'Model Stability', href: '/analysis/drift', icon: TrendingUp },
            { name: 'Significance', href: '/analysis/significance', icon: Scale },
        ]
    },
    {
        title: 'Bias Analysis',
        items: [
            { name: 'Political Compass', href: '/analysis/political', icon: Compass },
            { name: 'Paternalism', href: '/analysis/paternalism', icon: Shield },
            { name: 'Alignment Tax', href: '/analysis/alignment', icon: DollarSign },
        ]
    },
    {
        title: 'Technical',
        items: [
            { name: 'Semantic Clusters', href: '/analysis/clusters', icon: Network },
            { name: 'Trigger List', href: '/analysis/triggers', icon: ListChecks },
            { name: 'Council Consensus', href: '/analysis/consensus', icon: Users },
        ]
    }
];

export function GlobalSidebar() {
    const pathname = usePathname();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
    const { isCollapsed, toggleSidebar } = useSidebar();

    // Auto-expand category if on analysis page
    const isAnalysisPage = pathname?.startsWith('/analysis');

    return (
        <>
            {/* Mobile menu button - fixed top-left */}
            <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-card border border-border shadow-lg hover:bg-accent hover:text-accent-foreground transition-colors"
                aria-label="Toggle menu"
            >
                {isMobileMenuOpen ? (
                    <X className="h-5 w-5 text-foreground" />
                ) : (
                    <Menu className="h-5 w-5 text-foreground" />
                )}
            </button>

            {/* Sidebar */}
            <aside
                className={cn(
                    'fixed top-0 left-0 z-40 h-screen bg-card border-r border-border transition-all duration-300 overflow-y-auto flex flex-col',
                    isMobileMenuOpen ? 'translate-x-0 w-72' : '-translate-x-full lg:translate-x-0',
                    isCollapsed ? 'lg:w-20' : 'lg:w-72'
                )}
            >
                {/* Header */}
                <div className={cn(
                    "sticky top-0 bg-card z-10 flex items-center gap-2 p-6 border-b border-border h-[88px]",
                    isCollapsed ? "justify-center px-2" : ""
                )}>
                    <Link href="/" className="flex items-center gap-3 font-bold text-xl text-foreground overflow-hidden">
                        <div className="p-1.5 bg-foreground rounded-md shrink-0">
                            <Box className="h-6 w-6 text-background" />
                        </div>
                        {!isCollapsed && <span className="whitespace-nowrap">Moderation Bias</span>}
                    </Link>
                </div>

                {/* Command Palette / Search */}
                <div className={cn("px-4 pt-4", isCollapsed && "px-2")}>
                    {isCollapsed ? (
                        <button
                            onClick={() => {
                                // Expand to show search or open palette directly?
                                // Let's open palette directly but maybe expand sidebar too?
                                // For now just open palette
                                document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }));
                            }}
                            className="w-full flex justify-center p-2 rounded-lg hover:bg-accent hover:text-accent-foreground transition-colors"
                            title="Search (Cmd+K)"
                        >
                            <Search className="h-5 w-5" />
                        </button>
                    ) : (
                        <CommandPalette />
                    )}
                </div>

                {/* Main Navigation */}
                <div className={cn("p-4 space-y-1 flex-1", isCollapsed && "px-2")}>
                    {mainNavItems.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                onClick={() => setIsMobileMenuOpen(false)}
                                className={cn(
                                    'flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all group relative',
                                    isActive
                                        ? 'bg-accent text-accent-foreground'
                                        : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                                    isCollapsed && 'justify-center px-2'
                                )}
                                title={isCollapsed ? item.name : undefined}
                            >
                                <item.icon className={cn('h-5 w-5 flex-shrink-0', isActive ? 'text-foreground font-bold' : 'text-muted-foreground')} />
                                {!isCollapsed && <span>{item.name}</span>}
                            </Link>
                        );
                    })}

                    {/* Separator */}
                    <div className="my-4 border-t border-border" />

                    {/* Deep Dive Section */}
                    <div className="space-y-4">
                        {!isCollapsed && (
                            <div className="px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                                <Brain className="h-3.5 w-3.5" />
                                Deep Dive
                            </div>
                        )}

                        <div className="space-y-1">
                            {analysisCategories.map((category) => {
                                const hasActiveItem = category.items.some(item => pathname === item.href);
                                const isExpanded = expandedCategory === category.title || (isAnalysisPage && hasActiveItem);

                                if (isCollapsed) {
                                    // Collapsed view: Show just icons of items, flattened?
                                    // Or maybe just the category icon if we had one?
                                    // Let's show all items as icons for now since they have icons
                                    return (
                                        <div key={category.title} className="space-y-1">
                                            {category.items.map(item => {
                                                const isActive = pathname === item.href;
                                                return (
                                                    <Link
                                                        key={item.name}
                                                        href={item.href}
                                                        className={cn(
                                                            'flex justify-center p-2 rounded-lg transition-all',
                                                            isActive ? 'bg-accent text-foreground' : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                                                        )}
                                                        title={item.name}
                                                    >
                                                        <item.icon className="h-5 w-5" />
                                                    </Link>
                                                )
                                            })}
                                        </div>
                                    )
                                }

                                return (
                                    <div key={category.title}>
                                        <button
                                            onClick={() => setExpandedCategory(isExpanded ? null : category.title)}
                                            className={cn(
                                                'w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-all',
                                                hasActiveItem ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                                            )}
                                        >
                                            <span className="flex items-center gap-2">
                                                <span>{category.title}</span>
                                            </span>
                                            <ChevronRight className={cn(
                                                'h-4 w-4 transition-transform',
                                                isExpanded && 'rotate-90'
                                            )} />
                                        </button>

                                        {isExpanded && (
                                            <div className="ml-4 mt-1 space-y-0.5">
                                                {category.items.map((item) => {
                                                    const isActive = pathname === item.href;
                                                    return (
                                                        <Link
                                                            key={item.name}
                                                            href={item.href}
                                                            onClick={() => setIsMobileMenuOpen(false)}
                                                            className={cn(
                                                                'flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-all',
                                                                isActive
                                                                    ? 'bg-accent text-accent-foreground font-medium'
                                                                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                                                            )}
                                                        >
                                                            <item.icon className={cn('h-3.5 w-3.5', isActive ? 'text-foreground' : 'text-muted-foreground')} />
                                                            <span>{item.name}</span>
                                                        </Link>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className={cn("p-4 border-t border-border mt-auto", isCollapsed && "px-2")}>
                    <button
                        onClick={toggleSidebar}
                        className={cn(
                            "w-full flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-all mb-2",
                            isCollapsed && "justify-center px-2"
                        )}
                        title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
                    >
                        {isCollapsed ? <ChevronRight className="h-5 w-5" /> : (
                            <>
                                <ArrowRightLeft className="h-4 w-4 rotate-180" />
                                <span>Collapse Sidebar</span>
                            </>
                        )}
                    </button>

                    {!isCollapsed && (
                        <div className="flex items-center justify-between mt-4">
                            <span className="text-sm font-medium text-muted-foreground">Theme</span>
                            <ThemeToggle />
                        </div>
                    )}
                </div>
            </aside>

            {/* Mobile overlay */}
            {isMobileMenuOpen && (
                <div
                    className="lg:hidden fixed inset-0 bg-background/80 backdrop-blur-sm z-30"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}
        </>
    );
}
