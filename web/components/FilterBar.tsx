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
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl px-4 py-3 shadow-sm mb-6">
            <div className="flex flex-col md:flex-row gap-4">

                {/* Top Row on Mobile: Filters */}
                <div className="flex flex-col sm:flex-row gap-3 flex-1 items-start sm:items-center">

                    {/* Filter Label (Hidden on small mobile to save space, or keep) */}
                    <div className="hidden sm:flex items-center gap-1.5 text-slate-300">
                        <Filter className="h-4 w-4" />
                        <span className="text-xs font-bold uppercase tracking-wider">Filters</span>
                    </div>

                    <div className="hidden sm:block h-5 w-px bg-white/10" />

                    {/* Date Range - Stacked or Row */}
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <div className="relative flex-1">
                            <Calendar className="absolute left-2 top-1/2 transform -translate-y-1/2 text-slate-400 h-3.5 w-3.5" />
                            <input
                                type="date"
                                value={dateRange.start}
                                min={minDate}
                                max={dateRange.end || maxDate}
                                onChange={e => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                                className="w-full text-xs border border-white/10 rounded-lg pl-8 pr-2 py-1.5 bg-white/5 text-slate-200 hover:border-indigo-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 outline-none transition-colors appearance-none"
                            />
                        </div>
                        <span className="text-xs text-slate-400">→</span>
                        <div className="relative flex-1">
                            <Calendar className="absolute left-2 top-1/2 transform -translate-y-1/2 text-slate-400 h-3.5 w-3.5" />
                            <input
                                type="date"
                                value={dateRange.end}
                                min={dateRange.start || minDate}
                                max={maxDate}
                                onChange={e => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                                className="w-full text-xs border border-white/10 rounded-lg pl-8 pr-2 py-1.5 bg-white/5 text-slate-200 hover:border-indigo-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 outline-none transition-colors appearance-none"
                            />
                        </div>
                    </div>

                    <div className="hidden sm:block h-5 w-px bg-white/10" />

                    {/* Model Multi-Select Dropdown */}
                    <div className="relative w-full sm:w-auto" ref={dropdownRef}>
                        <button
                            onClick={() => setModelDropdownOpen(!modelDropdownOpen)}
                            className={`w-full sm:w-auto flex items-center justify-between gap-2 text-xs border rounded-lg px-3 py-1.5 hover:border-indigo-400 transition-colors ${activeModelCount > 0
                                ? 'border-indigo-500/50 bg-indigo-500/20 text-indigo-300'
                                : 'border-white/10 bg-white/5 text-slate-300'
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
                            <div className="absolute top-full left-0 mt-1 w-full sm:w-80 bg-[#1A1B26] border border-white/10 rounded-xl shadow-xl z-50 max-h-80 overflow-y-auto">
                                <div className="sticky top-0 bg-[#1A1B26] border-b border-white/10 px-3 py-2 flex items-center justify-between">
                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                                        Select Models ({activeModelCount}/{allModels.length})
                                    </span>
                                    {activeModelCount > 0 && (
                                        <button
                                            onClick={() => setSelectedModels([])}
                                            className="text-xs text-indigo-400 hover:text-indigo-300 font-medium"
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
                                                    ? 'bg-indigo-500/20 text-indigo-300'
                                                    : 'hover:bg-white/5 text-slate-300'
                                                    }`}
                                            >
                                                <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${isSelected
                                                    ? 'bg-indigo-500 border-indigo-500'
                                                    : 'border-slate-600'
                                                    }`}>
                                                    {isSelected && (
                                                        <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
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
                                                <span className="text-[10px] text-slate-500 ml-auto flex-shrink-0">{getProviderName(model)}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Bottom Row on Mobile: Actions & Count */}
                <div className="flex items-center justify-between md:justify-end gap-3 border-t md:border-t-0 border-white/10 pt-3 md:pt-0">
                    <div className="text-sm text-slate-500 whitespace-nowrap">
                        <span className="font-semibold text-slate-300">{totalRecords.toLocaleString()}</span> records
                    </div>

                    <div className="flex gap-2">
                        {hasFilters && (
                            <button
                                onClick={clearAll}
                                className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 font-medium transition-colors"
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
                <div className="mt-3 pt-3 border-t border-white/10 flex items-center gap-1 flex-wrap">
                    {selectedModels.map(m => (
                        <span key={m} className="inline-flex items-center gap-1 text-[10px] bg-indigo-500/20 text-indigo-300 rounded-full px-2 py-0.5 font-medium border border-indigo-500/20">
                            {m.split('/').pop()}
                            <button onClick={() => toggleModel(m)} className="hover:text-indigo-200">
                                <X className="h-2.5 w-2.5" />
                            </button>
                        </span>
                    ))}
                </div>
            )}
        </div>
    );
}
