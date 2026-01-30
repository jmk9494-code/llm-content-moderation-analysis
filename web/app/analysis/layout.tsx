'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AnalysisProvider, useAnalysis } from './AnalysisContext';
import {
    Brain, Tag, BarChart2, ShieldCheck, FileText, TrendingUp,
    Info, Database, AlertTriangle, Zap, Search, Scale, Compass
} from 'lucide-react';

export default function AnalysisLayout({ children }: { children: React.ReactNode }) {
    return (
        <AnalysisProvider>
            <AnalysisLayoutContent>{children}</AnalysisLayoutContent>
        </AnalysisProvider>
    );
}

function AnalysisLayoutContent({ children }: { children: React.ReactNode }) {
    const { timelineDates, dateRange, setDateRange } = useAnalysis();
    const pathname = usePathname();

    const isActive = (path: string) => pathname.includes(path);

    return (
        <main className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans text-slate-900">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <header className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-3">
                            🔬 Analysis Deep Dive
                        </h1>
                        <p className="text-slate-500 text-sm md:text-base mt-1">
                            Advanced metrics, academic visuals, and automated research insights.
                        </p>
                    </div>

                    {/* Timeline Slider */}
                    {timelineDates.length > 0 && (
                        <div className="flex-1 max-w-xl mx-4 flex items-end justify-end gap-3">
                            <div className="flex flex-col gap-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Start Date</label>
                                <select
                                    className="bg-white border border-slate-200 text-slate-700 text-xs rounded-md px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    value={dateRange.start}
                                    onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                                >
                                    <option value="">Earliest</option>
                                    {timelineDates.map(d => <option key={d} value={d}>{d}</option>)}
                                </select>
                            </div>
                            <div className="flex flex-col gap-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">End Date</label>
                                <select
                                    className="bg-white border border-slate-200 text-slate-700 text-xs rounded-md px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    value={dateRange.end}
                                    onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                                >
                                    <option value="">Latest</option>
                                    {timelineDates.map(d => <option key={d} value={d}>{d}</option>)}
                                </select>
                            </div>
                            <div className="flex flex-col justify-end">
                                <button
                                    onClick={() => setDateRange({ start: '', end: '' })}
                                    className="mb-[1px] text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-600 px-3 py-2 rounded-md transition-colors font-medium border border-slate-200 h-[30px] flex items-center"
                                >
                                    All Time
                                </button>
                            </div>
                        </div>
                    )}
                </header>

                {/* Navigation Tabs */}
                <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-1 overflow-x-auto">
                    <NavTab href="/analysis/summary" active={isActive('/summary')} icon={<Database className="w-4 h-4" />}>AI Summary</NavTab>
                    <NavTab href="/analysis/triggers" active={isActive('/triggers')} icon={<AlertTriangle className="w-4 h-4" />}>Trigger List</NavTab>
                    <NavTab href="/analysis/alignment" active={isActive('/alignment')} icon={<Zap className="w-4 h-4" />}>Alignment Tax</NavTab>
                    <NavTab href="/analysis/clusters" active={isActive('/clusters')} icon={<Tag className="w-4 h-4" />}>Semantic Clusters</NavTab>
                    <NavTab href="/analysis/political" active={isActive('/political')} icon={<Compass className="w-4 h-4" />}>Political Compass</NavTab>
                    <NavTab href="/analysis/paternalism" active={isActive('/paternalism')} icon={<Info className="w-4 h-4" />}>Paternalism</NavTab>
                    <NavTab href="/analysis/significance" active={isActive('/significance')} icon={<BarChart2 className="w-4 h-4" />}>Significance</NavTab>
                    <NavTab href="/analysis/consensus" active={isActive('/consensus')} icon={<Scale className="w-4 h-4" />}>Council Consensus</NavTab>
                    <NavTab href="/analysis/drift" active={isActive('/drift')} icon={<TrendingUp className="w-4 h-4" />}>Model Stability</NavTab>
                    <NavTab href="/analysis/reliability" active={isActive('/reliability')} icon={<ShieldCheck className="w-4 h-4" />}>Reliability</NavTab>
                    <NavTab href="/analysis/longitudinal" active={isActive('/longitudinal')} icon={<TrendingUp className="w-4 h-4" />}>Longitudinal</NavTab>
                    <NavTab href="/analysis/evidence" active={isActive('/evidence')} icon={<Search className="w-4 h-4" />}>Evidence</NavTab>
                </div>

                {/* Page Content */}
                <div className="min-h-[60vh]">
                    {children}
                </div>
            </div>
        </main>
    );
}

function NavTab({ href, active, children, icon }: any) {
    return (
        <Link
            href={href}
            className={`
                flex items-center gap-2 px-4 py-3 text-sm font-medium rounded-t-lg border-b-2 transition-all whitespace-nowrap
                ${active
                    ? 'border-indigo-500 text-indigo-600 bg-indigo-50/50'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'}
            `}
        >
            {icon}
            {children}
        </Link>
    );
}
