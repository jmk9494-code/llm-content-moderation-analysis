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

const mainNavItems = [
    { name: 'Overview', href: '/dashboard', icon: LayoutDashboard, emoji: '📊' },
    { name: 'Model Comparison', href: '/compare', icon: ArrowRightLeft, emoji: '⚖️' },
];

const analysisCategories = [
    {
        title: 'Summary',
        emoji: '📄',
        items: [
            { name: 'Summary', href: '/analysis/summary', icon: FileText },
            { name: 'Longitudinal', href: '/analysis/longitudinal', icon: TrendingUp },
        ]
    },
    {
        title: 'Reliability',
        emoji: '🛡️',
        items: [
            { name: 'Reliability', href: '/analysis/reliability', icon: Shield },
            { name: 'Model Stability', href: '/analysis/drift', icon: TrendingUp },
            { name: 'Significance', href: '/analysis/significance', icon: Scale },
        ]
    },
    {
        title: 'Bias Analysis',
        emoji: '🧭',
        items: [
            { name: 'Political Compass', href: '/analysis/political', icon: Compass },
            { name: 'Paternalism', href: '/analysis/paternalism', icon: Shield },
            { name: 'Alignment Tax', href: '/analysis/alignment', icon: DollarSign },
        ]
    },
    {
        title: 'Technical',
        emoji: '🧠',
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

    // Auto-expand category if on analysis page
    const isAnalysisPage = pathname?.startsWith('/analysis');

    return (
        <>
            {/* Mobile menu button - fixed top-left */}
            <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-white border border-slate-200 shadow-lg hover:bg-slate-50 transition-colors"
                aria-label="Toggle menu"
            >
                {isMobileMenuOpen ? (
                    <X className="h-5 w-5 text-slate-700" />
                ) : (
                    <Menu className="h-5 w-5 text-slate-700" />
                )}
            </button>

            {/* Sidebar */}
            <aside
                className={cn(
                    'fixed top-0 left-0 z-40 h-screen w-72 bg-white border-r border-slate-200 transition-transform duration-300 overflow-y-auto',
                    isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
                )}
            >
                {/* Header */}
                <div className="sticky top-0 bg-white border-b border-slate-200 p-6 z-10">
                    <Link href="/" className="flex items-center gap-2 font-bold text-xl text-slate-900">
                        <div className="p-1.5 bg-slate-900 rounded-md">
                            <Box className="h-5 w-5 text-white" />
                        </div>
                        Moderation Bias
                    </Link>
                </div>

                {/* Main Navigation */}
                <div className="p-4 space-y-1">
                    {mainNavItems.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                onClick={() => setIsMobileMenuOpen(false)}
                                className={cn(
                                    'flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all',
                                    isActive
                                        ? 'bg-indigo-50 text-indigo-700'
                                        : 'text-slate-700 hover:bg-slate-50'
                                )}
                            >
                                <item.icon className={cn('h-4 w-4 flex-shrink-0', isActive ? 'text-indigo-600' : 'text-slate-400')} />
                                <span>{item.name}</span>
                            </Link>
                        );
                    })}
                </div>

                {/* Deep Dive Section */}
                <div className="px-4 pb-4">
                    <div className="pt-4 border-t border-slate-200">
                        <div className="px-2 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                            <Brain className="h-3.5 w-3.5" />
                            Deep Dive
                        </div>

                        <div className="mt-2 space-y-1">
                            {analysisCategories.map((category) => {
                                const hasActiveItem = category.items.some(item => pathname === item.href);
                                const isExpanded = expandedCategory === category.title || (isAnalysisPage && hasActiveItem);

                                return (
                                    <div key={category.title}>
                                        <button
                                            onClick={() => setExpandedCategory(isExpanded ? null : category.title)}
                                            className={cn(
                                                'w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-all',
                                                hasActiveItem ? 'bg-slate-50 text-slate-900' : 'text-slate-600 hover:bg-slate-50'
                                            )}
                                        >
                                            <span className="flex items-center gap-2">
                                                <span className="text-base">{category.emoji}</span>
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
                                                                    ? 'bg-indigo-50 text-indigo-700 font-medium'
                                                                    : 'text-slate-600 hover:bg-slate-50'
                                                            )}
                                                        >
                                                            <item.icon className={cn('h-3.5 w-3.5', isActive ? 'text-indigo-600' : 'text-slate-400')} />
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
            </aside>

            {/* Mobile overlay */}
            {isMobileMenuOpen && (
                <div
                    className="lg:hidden fixed inset-0 bg-black/20 backdrop-blur-sm z-30"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}
        </>
    );
}
