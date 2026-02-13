'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search,
    LayoutDashboard,
    BarChart3,
    Settings,
    ArrowRight,
    Beaker,
    Shield
} from 'lucide-react';

interface CommandItem {
    id: string;
    title: string;
    description?: string;
    icon: React.ReactNode;
    action: () => void;
    keywords?: string[];
}

export function CommandPalette() {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const router = useRouter();

    const commands: CommandItem[] = [
        // Overview
        {
            id: 'dashboard',
            title: 'Dashboard Overview',
            description: 'View moderation metrics and audit log',
            icon: <LayoutDashboard className="h-4 w-4" />,
            action: () => router.push('/dashboard'),
            keywords: ['home', 'main', 'overview', 'dashboard']
        },
        {
            id: 'compare',
            title: 'Compare Models',
            description: 'Side-by-side model comparison',
            icon: <Beaker className="h-4 w-4" />,
            action: () => router.push('/compare'),
            keywords: ['diff', 'versus', 'vs']
        },
        // Reliability
        {
            id: 'reliability',
            title: 'Reliability Analysis',
            description: "Fleiss' Kappa and internal consistency scores",
            icon: <Shield className="h-4 w-4" />,
            action: () => router.push('/analysis/reliability'),
            keywords: ['reliability', 'kappa', 'consistency', 'stability']
        },
        {
            id: 'drift',
            title: 'Model Stability',
            description: 'Longitudinal stability tracking over time',
            icon: <Settings className="h-4 w-4" />,
            action: () => router.push('/analysis/drift'),
            keywords: ['drift', 'change', 'history', 'time', 'longitudinal']
        },
        {
            id: 'significance',
            title: 'Statistical Significance',
            description: "McNemar's test and p-values",
            icon: <BarChart3 className="h-4 w-4" />,
            action: () => router.push('/analysis/significance'),
            keywords: ['stats', 'p-value', 'significance', 'math']
        },
        // Bias
        {
            id: 'political',
            title: 'Political Compass',
            description: 'Analyze political leanings of models',
            icon: <LayoutDashboard className="h-4 w-4" />,
            action: () => router.push('/analysis/political'),
            keywords: ['politics', 'bias', 'left', 'right', 'compass']
        },
        {
            id: 'paternalism',
            title: 'Paternalism Audit',
            description: 'Refusal differentials across user personas',
            icon: <Shield className="h-4 w-4" />,
            action: () => router.push('/analysis/paternalism'),
            keywords: ['paternalism', 'persona', 'discrimination', 'bias']
        },
        // Technical
        {
            id: 'clusters',
            title: 'Semantic Clusters',
            description: 'Topic modeling of refused prompts',
            icon: <BarChart3 className="h-4 w-4" />,
            action: () => router.push('/analysis/clusters'),
            keywords: ['topics', 'clusters', 'semantic', 'grouping']
        },
        {
            id: 'consensus',
            title: 'Council Consensus',
            description: 'Multi-model agreement analysis',
            icon: <LayoutDashboard className="h-4 w-4" />,
            action: () => router.push('/analysis/consensus'),
            keywords: ['council', 'agreement', 'consensus', 'jury']
        },
    ];

    const filteredCommands = commands.filter(cmd => {
        const searchLower = search.toLowerCase();
        return (
            cmd.title.toLowerCase().includes(searchLower) ||
            cmd.description?.toLowerCase().includes(searchLower) ||
            cmd.keywords?.some(k => k.includes(searchLower))
        );
    });

    // Keyboard shortcut to open
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                setIsOpen(true);
            }
            if (e.key === 'Escape') {
                setIsOpen(false);
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, []);

    // Focus input when opened
    useEffect(() => {
        if (isOpen) {
            inputRef.current?.focus();
            setSearch('');
            setSelectedIndex(0);
        }
    }, [isOpen]);

    // Keyboard navigation
    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex(i => Math.min(i + 1, filteredCommands.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex(i => Math.max(i - 1, 0));
        } else if (e.key === 'Enter' && filteredCommands[selectedIndex]) {
            e.preventDefault();
            filteredCommands[selectedIndex].action();
            setIsOpen(false);
        }
    }, [filteredCommands, selectedIndex]);

    // Reset selection when search changes
    useEffect(() => {
        setSelectedIndex(0);
    }, [search]);

    return (
        <>
            {/* Trigger hint - shown in sidebar */}
            <button
                onClick={() => setIsOpen(true)}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground bg-accent/50 rounded-lg border border-border hover:bg-accent hover:text-accent-foreground transition-colors"
            >
                <Search className="h-4 w-4" />
                <span className="flex-1 text-left">Search...</span>
                <kbd className="px-1.5 py-0.5 text-xs font-mono bg-background rounded border border-border text-muted-foreground">
                    ⌘K
                </kbd>
            </button>

            {/* Modal */}
            <AnimatePresence>
                {isOpen && (
                    <>
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsOpen(false)}
                            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50"
                        />

                        {/* Palette */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: -20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: -20 }}
                            transition={{ duration: 0.15 }}
                            className="fixed top-[20%] left-1/2 -translate-x-1/2 w-full max-w-lg z-50"
                        >
                            <div className="bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden">
                                {/* Search Input */}
                                <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-200">
                                    <Search className="h-5 w-5 text-slate-400" />
                                    <input
                                        ref={inputRef}
                                        type="text"
                                        placeholder="Search commands..."
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        onKeyDown={handleKeyDown}
                                        className="flex-1 bg-transparent text-slate-900 placeholder-slate-400 outline-none text-base"
                                    />
                                    <kbd className="px-2 py-1 text-xs font-mono text-slate-400 bg-slate-100 rounded">
                                        ESC
                                    </kbd>
                                </div>

                                {/* Commands List */}
                                <div className="max-h-[300px] overflow-y-auto py-2">
                                    {filteredCommands.length === 0 ? (
                                        <div className="px-4 py-8 text-center text-slate-500">
                                            No commands found
                                        </div>
                                    ) : (
                                        filteredCommands.map((cmd, index) => (
                                            <button
                                                key={cmd.id}
                                                onClick={() => {
                                                    cmd.action();
                                                    setIsOpen(false);
                                                }}
                                                onMouseEnter={() => setSelectedIndex(index)}
                                                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${index === selectedIndex
                                                    ? 'bg-indigo-50'
                                                    : 'hover:bg-slate-50'
                                                    }`}
                                            >
                                                <div className={`p-2 rounded-lg ${index === selectedIndex
                                                    ? 'bg-indigo-100 text-indigo-600'
                                                    : 'bg-slate-100 text-slate-500'
                                                    }`}>
                                                    {cmd.icon}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="font-medium text-slate-900">
                                                        {cmd.title}
                                                    </div>
                                                    {cmd.description && (
                                                        <div className="text-sm text-slate-500 truncate">
                                                            {cmd.description}
                                                        </div>
                                                    )}
                                                </div>
                                                <ArrowRight className={`h-4 w-4 ${index === selectedIndex ? 'text-indigo-500' : 'text-slate-300'
                                                    }`} />
                                            </button>
                                        ))
                                    )}
                                </div>

                                {/* Footer */}
                                <div className="px-4 py-2 border-t border-slate-200 flex items-center gap-4 text-xs text-slate-400">
                                    <span className="flex items-center gap-1">
                                        <kbd className="px-1.5 py-0.5 bg-slate-100 rounded">↑↓</kbd>
                                        navigate
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <kbd className="px-1.5 py-0.5 bg-slate-100 rounded">↵</kbd>
                                        select
                                    </span>
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </>
    );
}
