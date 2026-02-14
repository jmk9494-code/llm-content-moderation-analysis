'use client';

import { useMemo, useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, Loader2, X } from 'lucide-react';
import { useAnalysis } from '@/app/analysis/AnalysisContext';

type HeatmapProps = {
    data: any[];
    title?: string;
    description?: string;
    onCellClick?: (model: string, category: string, entries: any[]) => void;
};

// Shorten long category names for display
const sanitizeCategory = (cat: string): string => {
    const mapping: Record<string, string> = {
        'Violence': 'Violence',
        'Incitement to Violence': 'Incitement',
        'Health Misinformation': 'Health Misinfo',
        'Medical Misinformation': 'Medical Misinfo',
        'False Positive Control': 'False Positive',
        'Explicit/Sexual': 'Explicit/Sexual',
        'Cybersecurity': 'Cybersecurity',
        'Dangerous': 'Dangerous',
        'Deception': 'Deception',
        'Harassment': 'Harassment',
        'Hate Speech': 'Hate Speech',
        'Misinformation': 'Misinfo',
        'Crime': 'Crime',
        'Self-Harm': 'Self-Harm',
        'Theft': 'Theft',
    };
    // Return mapped name or truncate long names
    if (mapping[cat]) return mapping[cat];
    if (cat.length > 10) return cat.substring(0, 8) + '...';
    return cat;
};

// Normalize categories to merge similar ones
const normalizeCategory = (cat: string): string => {
    // Merge Explicit Content and Sexual into one category
    if (cat === 'Explicit Content' || cat === 'Sexual') return 'Explicit/Sexual';
    return cat;
};

export function CensorshipHeatmap({ data, title = "Refusal Heatmap", description, onCellClick }: HeatmapProps) {
    const { isLite, isLoadingFull, loadFullDetails } = useAnalysis();
    const [selectedCell, setSelectedCell] = useState<{ model: string; category: string } | null>(null);
    const [expandedModel, setExpandedModel] = useState<string | null>(null); // For mobile accordion
    const [showModal, setShowModal] = useState(false);

    // 1. Process data to get Refusal Rate per Model per Category
    const matrix = useMemo(() => {
        const allModels = Array.from(new Set(data.map(d => d.model))).sort();
        // Normalize categories before creating unique set
        const categories = Array.from(new Set(data.map(d => normalizeCategory(d.category)))).filter(c => c).sort();

        const stats: Record<string, Record<string, { total: number; refusals: number; entries: any[] }>> = {};

        // Init stats
        allModels.forEach(m => {
            stats[m] = {};
            categories.forEach(c => {
                stats[m][c] = { total: 0, refusals: 0, entries: [] };
            });
        });

        // Fill stats - use normalized category
        data.forEach(d => {
            if (!d.model || !d.category) return;
            const normalizedCategory = normalizeCategory(d.category);
            if (!stats[d.model] || !stats[d.model][normalizedCategory]) return;
            stats[d.model][normalizedCategory].total++;
            stats[d.model][normalizedCategory].entries.push(d);
            if (['REFUSAL', 'REMOVED', 'unsafe', 'Hard Refusal', 'Soft Censorship'].includes(d.verdict)) {
                stats[d.model][normalizedCategory].refusals++;
            }
        });

        // Filter out models with zero total entries (no data at all)
        const models = allModels.filter(m => {
            const totalForModel = categories.reduce((sum, c) => sum + (stats[m][c]?.total || 0), 0);
            return totalForModel > 0;
        });

        return { models, categories, stats };
    }, [data]);

    // Reactive modal entries (so they update when full data loads)
    const modalEntries = useMemo(() => {
        if (!selectedCell) return [];
        return matrix.stats[selectedCell.model]?.[selectedCell.category]?.entries || [];
    }, [selectedCell, matrix]);

    // Helper for color scale - Using UChicago Brand Colors
    const getColor = (rate: number) => {
        // UChicago Green: #00843D
        if (rate === 0) return 'bg-[#00843D]/10 text-[#00843D] dark:text-[#00843D] hover:bg-[#00843D]/20';
        // UChicago Green (More opaque)
        if (rate < 0.2) return 'bg-[#00843D]/30 text-[#006429] dark:text-[#4CBF80] hover:bg-[#00843D]/40';
        // UChicago Gold: #FFC72C
        if (rate < 0.4) return 'bg-[#FFC72C]/30 text-[#8F6B00] dark:text-[#FFD966] hover:bg-[#FFC72C]/40';
        // UChicago Orange: #FF671F
        if (rate < 0.6) return 'bg-[#FF671F]/40 text-[#A33600] dark:text-[#FF9E66] hover:bg-[#FF671F]/50';
        // UChicago Brick: #A4343A
        if (rate < 0.8) return 'bg-[#A4343A]/80 text-white hover:bg-[#A4343A]';
        // UChicago Maroon: #800000
        return 'bg-[#800000] text-white font-bold hover:bg-[#600000]';
    };

    const handleCellClick = (model: string, category: string) => {
        // Trigger download of full text if needed
        if (isLite) {
            loadFullDetails();
        }

        const cell = matrix.stats[model]?.[category];
        const entries = cell?.entries || [];
        if (entries.length === 0) return;

        setSelectedCell({ model, category });
        setShowModal(true);
        if (onCellClick) onCellClick(model, category, entries);
    };

    const toggleModel = (model: string) => {
        setExpandedModel(expandedModel === model ? null : model);
    };

    if (matrix.models.length === 0 || matrix.categories.length === 0) return null;

    return (
        <div className="bg-card rounded-xl border border-border p-6 overflow-hidden">
            <div className="mb-6">
                <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                    {title}
                </h3>
                {description && (
                    <p className="text-sm text-muted-foreground mt-1 max-w-3xl">
                        {description}
                    </p>
                )}
                <p className="text-xs text-muted-foreground mt-2 hidden md:block">Click any cell to see details</p>
                <p className="text-xs text-muted-foreground mt-2 md:hidden">Tap a model to view details</p>
            </div>

            {/* Desktop View: Table */}
            <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead>
                        <tr>
                            <th className="p-1.5 bg-muted/50 border-b border-border min-w-[100px] sticky left-0 z-10 text-xs text-muted-foreground">
                                Model
                            </th>
                            {matrix.categories.map(c => (
                                <th key={c} className="p-1.5 bg-muted/50 border-b border-border font-semibold text-muted-foreground min-w-[60px] text-center text-[10px] leading-tight">
                                    {sanitizeCategory(c)}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {matrix.models.map(m => (
                            <tr key={m} className="border-b border-border last:border-0">
                                <td className="p-1.5 font-medium text-foreground sticky left-0 bg-card z-10 w-[100px] truncate text-xs" title={m}>
                                    {m && typeof m === 'string' ? (m.split('/').pop() || m) : 'Unknown'}
                                </td>
                                {matrix.categories.map(c => {
                                    const cell = matrix.stats[m][c];
                                    if (!cell || cell.total === 0) {
                                        return (
                                            <td key={c} className="p-1.5 text-center text-muted-foreground/30 bg-muted/10 text-xs">
                                                -
                                            </td>
                                        );
                                    }
                                    const rate = cell.refusals / cell.total;
                                    return (
                                        <td
                                            key={c}
                                            className={`p-1.5 text-center cursor-pointer transition-colors text-xs ${getColor(rate)}`}
                                            onClick={() => handleCellClick(m, c)}
                                            title={`${cell.refusals}/${cell.total} refusals - Click for details`}
                                        >
                                            {(rate * 100).toFixed(0)}%
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Mobile View: Collapsible List */}
            <div className="md:hidden space-y-3">
                {matrix.models.map(m => {
                    // Calculate avg refusal for summary
                    const totalStats = matrix.categories.reduce((acc, c) => {
                        const cell = matrix.stats[m][c];
                        if (cell && cell.total > 0) {
                            acc.refusals += cell.refusals;
                            acc.total += cell.total;
                        }
                        return acc;
                    }, { refusals: 0, total: 0 });

                    const avgRate = totalStats.total > 0 ? totalStats.refusals / totalStats.total : 0;
                    const isExpanded = expandedModel === m;

                    return (
                        <div key={m} className="border border-border rounded-lg overflow-hidden">
                            <div
                                className={`p-4 flex items-center justify-between cursor-pointer transition-colors ${isExpanded ? 'bg-muted/50' : 'bg-card'}`}
                                onClick={() => toggleModel(m)}
                            >
                                <div>
                                    <p className="font-semibold text-foreground">
                                        {m && typeof m === 'string' ? (m.split('/').pop() || m) : 'Unknown'}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        Avg Refusal: <span className={avgRate > 0.5 ? 'text-[#800000] font-bold' : 'text-foreground'}>{(avgRate * 100).toFixed(1)}%</span>
                                    </p>
                                </div>
                                {isExpanded ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
                            </div>

                            {isExpanded && (
                                <div className="border-t border-border bg-muted/20 p-2 grid grid-cols-2 gap-2 text-xs">
                                    {matrix.categories.map(c => {
                                        const cell = matrix.stats[m][c];
                                        if (!cell || cell.total === 0) return null;
                                        const rate = cell.refusals / cell.total;

                                        return (
                                            <div key={c}
                                                className={`p-2 rounded flex justify-between items-center cursor-pointer ${getColor(rate)}`}
                                                onClick={() => handleCellClick(m, c)}
                                            >
                                                <span className="truncate mr-2 font-medium">{sanitizeCategory(c)}</span>
                                                <span>{(rate * 100).toFixed(0)}%</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground justify-end flex-wrap">
                <div className="flex items-center gap-1"><div className="w-3 h-3 bg-[#00843D]/30 rounded border border-[#00843D]"></div> Safe</div>
                <div className="flex items-center gap-1"><div className="w-3 h-3 bg-[#FFC72C]/30 rounded border border-[#FFC72C]"></div> Low</div>
                <div className="flex items-center gap-1"><div className="w-3 h-3 bg-[#FF671F]/40 rounded border border-[#FF671F]"></div> Medium</div>
                <div className="flex items-center gap-1"><div className="w-3 h-3 bg-[#A4343A]/80 rounded border border-[#A4343A]"></div> High</div>
                <div className="flex items-center gap-1"><div className="w-3 h-3 bg-[#800000] rounded"></div> Critical</div>
            </div>

            {/* Modal for cell details */}
            {showModal && selectedCell && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 transition-opacity" onClick={() => setShowModal(false)}>
                    <div className="bg-background rounded-xl p-4 md:p-6 w-full max-w-2xl max-h-[85vh] overflow-hidden shadow-2xl flex flex-col border border-border animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-4 flex-shrink-0 border-b border-border pb-3">
                            <h4 className="text-base md:text-lg font-bold truncate pr-4 text-foreground flex flex-col md:flex-row md:items-center gap-1">
                                <span className="text-primary">{selectedCell.model && typeof selectedCell.model === 'string'
                                    ? (selectedCell.model.split('/').pop() || selectedCell.model)
                                    : 'Unknown'}</span>
                                <span className="hidden md:inline text-muted-foreground">×</span>
                                <span className="text-muted-foreground md:text-foreground">{selectedCell.category}</span>
                            </h4>
                            <button onClick={() => setShowModal(false)} className="text-muted-foreground hover:text-foreground p-1 rounded-full hover:bg-muted">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="flex items-center justify-between mb-3 flex-shrink-0 px-1">
                            <p className="text-sm text-muted-foreground font-medium">{modalEntries.length} entries found</p>
                            {isLoadingFull && (
                                <div className="flex items-center gap-2 text-xs text-primary bg-primary/10 px-2.5 py-1 rounded-full animate-pulse">
                                    <Loader2 className="w-3 h-3 animate-spin" /> Loading full text...
                                </div>
                            )}
                        </div>

                        <div className="space-y-3 overflow-y-auto flex-grow pr-1 custom-scrollbar">
                            {modalEntries.slice(0, 50).map((entry, idx) => (
                                <div key={idx} className={`p-3 rounded-lg border text-sm ${['safe', 'ALLOWED', 'Authorized'].includes(entry.verdict)
                                    ? 'border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/20'
                                    : 'border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/20'
                                    }`}>
                                    <div className="flex justify-between items-center mb-2">
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${['safe', 'ALLOWED', 'Authorized'].includes(entry.verdict)
                                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300'
                                            : 'bg-[#800000] text-white'
                                            }`}>
                                            {entry.verdict}
                                        </span>
                                        <span className="text-[10px] text-muted-foreground font-mono">{entry.case_id}</span>
                                    </div>
                                    <div className="space-y-2.5">
                                        <div>
                                            <p className="text-[10px] uppercase tracking-wide font-semibold text-muted-foreground mb-1">Prompt</p>
                                            <p className="text-foreground leading-relaxed font-medium">{entry.prompt || <span className="italic text-muted-foreground">No prompt text available</span>}</p>
                                        </div>
                                        {entry.response && (
                                            <div className="pt-2 border-t border-border/50">
                                                <p className="text-[10px] uppercase tracking-wide font-semibold text-muted-foreground mb-1">Response</p>
                                                <p className="text-foreground/80 leading-relaxed text-xs">{entry.response}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                            {modalEntries.length > 50 && (
                                <div className="py-4 text-center">
                                    <p className="text-muted-foreground text-sm">...and {modalEntries.length - 50} more entries</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
