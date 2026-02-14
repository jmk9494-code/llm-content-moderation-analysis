'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useAnalysis } from '@/app/analysis/AnalysisContext';
import { Calendar, Users, X, ChevronDown, Filter, Search, Download, RefreshCw } from 'lucide-react';
import { getLogoUrl, getProviderName } from '@/lib/provider-logos';

export default function FilterBar() {
    const {
        dateRange, setDateRange,
        selectedModels, setSelectedModels,
        allModels, timelineDates,
        filteredAuditData
    } = useAnalysis();

    const [modelDropdownOpen, setModelDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setModelDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const minDate = timelineDates[0] || '';
    const maxDate = timelineDates[timelineDates.length - 1] || '';

    const toggleModel = (model: string) => {
        setSelectedModels(prev =>
            prev.includes(model)
                ? prev.filter(m => m !== model)
                : [...prev, model]
        );
    };

    const clearAll = () => {
        setDateRange({ start: '', end: '' });
        setSelectedModels([]);
    };

    const hasFilters = dateRange.start || dateRange.end || selectedModels.length > 0;

    const activeModelCount = selectedModels.length;
    const totalRecords = filteredAuditData.length;

    return (
        <div className="bg-background border border-border rounded-xl px-4 py-3 shadow-sm mb-6">
            <div className="flex flex-col md:flex-row gap-4">

                {/* Top Row on Mobile: Filters */}
                <div className="flex flex-col sm:flex-row gap-3 flex-1 items-start sm:items-center">

                    {/* Filter Label (Hidden on small mobile to save space, or keep) */}
                    <div className="hidden sm:flex items-center gap-1.5 text-muted-foreground">
                        <Filter className="h-4 w-4" />
                        <span className="text-xs font-bold uppercase tracking-wider">Filters</span>
                    </div>

                    <div className="hidden sm:block h-5 w-px bg-border" />

                    {/* Date Range - Stacked or Row */}
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <div className="relative flex-1">
                            <Calendar className="absolute left-2 top-1/2 transform -translate-y-1/2 text-muted-foreground h-3.5 w-3.5" />
                            <input
                                type="date"
                                value={dateRange.start}
                                min={minDate}
                                max={dateRange.end || maxDate}
                                onChange={e => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                                className="w-full text-xs border border-border rounded-lg pl-8 pr-2 py-1.5 bg-card text-foreground hover:border-primary focus:border-primary focus:ring-1 focus:ring-primary/50 outline-none transition-colors appearance-none"
                            />
                        </div>
                        <span className="text-xs text-muted-foreground">→</span>
                        <div className="relative flex-1">
                            <Calendar className="absolute left-2 top-1/2 transform -translate-y-1/2 text-muted-foreground h-3.5 w-3.5" />
                            <input
                                type="date"
                                value={dateRange.end}
                                min={dateRange.start || minDate}
                                max={maxDate}
                                onChange={e => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                                className="w-full text-xs border border-border rounded-lg pl-8 pr-2 py-1.5 bg-card text-foreground hover:border-primary focus:border-primary focus:ring-1 focus:ring-primary/50 outline-none transition-colors appearance-none"
                            />
                        </div>
                    </div>

                    <div className="hidden sm:block h-5 w-px bg-border" />

                    {/* Model Multi-Select Dropdown */}
                    <div className="relative w-full sm:w-auto" ref={dropdownRef}>
                        <button
                            onClick={() => setModelDropdownOpen(!modelDropdownOpen)}
                            className={`w-full sm:w-auto flex items-center justify-between gap-2 text-xs border rounded-lg px-3 py-1.5 hover:border-primary transition-colors ${activeModelCount > 0
                                ? 'border-primary/50 bg-primary/20 text-primary'
                                : 'border-border bg-card text-muted-foreground'
                                }`}
                        >
                            <div className="flex items-center gap-2">
                                <Users className="h-3.5 w-3.5" />
                                <span>
                                    {activeModelCount > 0
                                        ? `${activeModelCount} model${activeModelCount > 1 ? 's' : ''}`
                                        : 'All models'
                                    }
                                </span>
                            </div>
                            <ChevronDown className={`h-3 w-3 transition-transform ${modelDropdownOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {modelDropdownOpen && (
                            <div className="absolute top-full left-0 mt-1 w-full sm:w-80 bg-white dark:bg-zinc-900 border border-border rounded-xl shadow-xl z-50 max-h-80 overflow-y-auto">
                                <div className="sticky top-0 bg-popover border-b border-border px-3 py-2 flex items-center justify-between">
                                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                                        Select Models ({activeModelCount}/{allModels.length})
                                    </span>
                                    {activeModelCount > 0 && (
                                        <button
                                            onClick={() => setSelectedModels([])}
                                            className="text-xs text-primary hover:text-primary/80 font-medium"
                                        >
                                            Clear all
                                        </button>
                                    )}
                                </div>
                                <div className="p-1">
                                    {allModels.map(model => {
                                        const isSelected = selectedModels.includes(model);
                                        const displayName = model.split('/').pop() || model;
                                        return (
                                            <button
                                                key={model}
                                                onClick={() => toggleModel(model)}
                                                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-colors ${isSelected
                                                    ? 'bg-primary/20 text-primary'
                                                    : 'hover:bg-accent text-foreground'
                                                    }`}
                                            >
                                                <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${isSelected
                                                    ? 'bg-primary border-primary'
                                                    : 'border-muted-foreground/30'
                                                    }`}>
                                                    {isSelected && (
                                                        <svg className="w-2.5 h-2.5 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                        </svg>
                                                    )}
                                                </div>
                                                <img
                                                    src={getLogoUrl(model)}
                                                    alt=""
                                                    className="w-4 h-4 object-contain flex-shrink-0 opacity-80"
                                                    loading="lazy"
                                                />
                                                <span className="text-xs font-medium truncate">{displayName}</span>
                                                <span className="text-[10px] text-muted-foreground ml-auto flex-shrink-0">{getProviderName(model)}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Bottom Row on Mobile: Actions & Count */}
                <div className="flex items-center justify-between md:justify-end gap-3 border-t md:border-t-0 border-border pt-3 md:pt-0">
                    <div className="text-sm text-muted-foreground whitespace-nowrap">
                        <span className="font-semibold text-foreground">{totalRecords.toLocaleString()}</span> records
                    </div>

                    <div className="flex gap-2">
                        {hasFilters && (
                            <button
                                onClick={clearAll}
                                className="flex items-center gap-1 text-xs text-red-500 hover:text-red-400 font-medium transition-colors"
                            >
                                <X className="h-3 w-3" />
                                <span className="hidden sm:inline">Clear</span>
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Active chips row */}
            {selectedModels.length > 0 && selectedModels.length <= 3 && (
                <div className="mt-3 pt-3 border-t border-border flex items-center gap-1 flex-wrap">
                    {selectedModels.map(m => (
                        <span key={m} className="inline-flex items-center gap-1 text-[10px] bg-primary/20 text-primary rounded-full px-2 py-0.5 font-medium border border-primary/20">
                            {m.split('/').pop()}
                            <button onClick={() => toggleModel(m)} className="hover:text-primary/70">
                                <X className="h-2.5 w-2.5" />
                            </button>
                        </span>
                    ))}
                </div>
            )}
        </div>
    );
}
