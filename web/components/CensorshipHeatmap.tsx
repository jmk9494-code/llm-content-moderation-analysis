'use client';

import { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

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
    if (cat.length > 15) return cat.substring(0, 12) + '...';
    return cat;
};

// Normalize categories to merge similar ones
const normalizeCategory = (cat: string): string => {
    // Merge Explicit Content and Sexual into one category
    if (cat === 'Explicit Content' || cat === 'Sexual') return 'Explicit/Sexual';
    return cat;
};

export function CensorshipHeatmap({ data, title = "Refusal Heatmap", description, onCellClick }: HeatmapProps) {
    const [selectedCell, setSelectedCell] = useState<{ model: string; category: string } | null>(null);
    const [expandedModel, setExpandedModel] = useState<string | null>(null); // For mobile accordion
    const [showModal, setShowModal] = useState(false);
    const [modalEntries, setModalEntries] = useState<any[]>([]);

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

    // Helper for color scale
    const getColor = (rate: number) => {
        if (rate === 0) return 'bg-emerald-50 text-emerald-900 hover:bg-emerald-100';
        if (rate < 0.2) return 'bg-emerald-100 text-emerald-900 hover:bg-emerald-200';
        if (rate < 0.4) return 'bg-yellow-100 text-yellow-900 hover:bg-yellow-200';
        if (rate < 0.6) return 'bg-orange-100 text-orange-900 hover:bg-orange-200';
        if (rate < 0.8) return 'bg-red-100 text-red-900 hover:bg-red-200';
        return 'bg-red-200 text-red-900 font-bold hover:bg-red-300';
    };

    const handleCellClick = (model: string, category: string) => {
        const cell = matrix.stats[model]?.[category];
        const entries = cell?.entries || [];
        if (entries.length === 0) return;

        setSelectedCell({ model, category });
        setModalEntries(entries);
        setShowModal(true);
        if (onCellClick) onCellClick(model, category, entries);
    };

    const toggleModel = (model: string) => {
        setExpandedModel(expandedModel === model ? null : model);
    };

    if (matrix.models.length === 0 || matrix.categories.length === 0) return null;

    return (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm overflow-hidden">
            <div className="mb-6">
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <span>🔥</span> {title}
                </h3>
                {description && (
                    <p className="text-sm text-slate-500 mt-1 max-w-3xl">
                        {description}
                    </p>
                )}
                <p className="text-xs text-slate-400 mt-2 hidden md:block">Click any cell to see details</p>
                <p className="text-xs text-slate-400 mt-2 md:hidden">Tap a model to view details</p>
            </div>

            {/* Desktop View: Table */}
            <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead>
                        <tr>
                            <th className="p-3 bg-slate-50 border-b border-slate-200 min-w-[120px] sticky left-0 z-10">
                                Model
                            </th>
                            {matrix.categories.map(c => (
                                <th key={c} className="p-3 bg-slate-50 border-b border-slate-200 font-semibold text-slate-700 min-w-[80px] text-center text-xs">
                                    {sanitizeCategory(c)}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {matrix.models.map(m => (
                            <tr key={m} className="border-b border-slate-100 last:border-0">
                                <td className="p-3 font-medium text-slate-700 sticky left-0 bg-white z-10 w-[150px] truncate" title={m}>
                                    {m && typeof m === 'string' ? (m.split('/').pop() || m) : 'Unknown'}
                                </td>
                                {matrix.categories.map(c => {
                                    const cell = matrix.stats[m][c];
                                    if (!cell || cell.total === 0) {
                                        return (
                                            <td key={c} className="p-3 text-center text-slate-300 bg-slate-50/20">
                                                -
                                            </td>
                                        );
                                    }
                                    const rate = cell.refusals / cell.total;
                                    return (
                                        <td
                                            key={c}
                                            className={`p-3 text-center cursor-pointer transition-colors ${getColor(rate)}`}
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
                        <div key={m} className="border border-slate-200 rounded-lg overflow-hidden">
                            <div
                                className={`p-4 flex items-center justify-between cursor-pointer transition-colors ${isExpanded ? 'bg-slate-50' : 'bg-white'}`}
                                onClick={() => toggleModel(m)}
                            >
                                <div>
                                    <p className="font-semibold text-slate-800">
                                        {m && typeof m === 'string' ? (m.split('/').pop() || m) : 'Unknown'}
                                    </p>
                                    <p className="text-xs text-slate-500">
                                        Avg Refusal: <span className={avgRate > 0.5 ? 'text-red-600 font-bold' : 'text-slate-700'}>{(avgRate * 100).toFixed(1)}%</span>
                                    </p>
                                </div>
                                {isExpanded ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                            </div>

                            {isExpanded && (
                                <div className="border-t border-slate-200 bg-slate-50/50 p-2 grid grid-cols-2 gap-2 text-xs">
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

            <div className="mt-4 flex items-center gap-4 text-xs text-slate-500 justify-end">
                <div className="flex items-center gap-1"><div className="w-3 h-3 bg-emerald-100 rounded"></div> 0-20%</div>
                <div className="flex items-center gap-1"><div className="w-3 h-3 bg-yellow-100 rounded"></div> 20-40%</div>
                <div className="flex items-center gap-1"><div className="w-3 h-3 bg-orange-100 rounded"></div> 40-60%</div>
                <div className="flex items-center gap-1"><div className="w-3 h-3 bg-red-200 rounded"></div> 80%+</div>
            </div>

            {/* Modal for cell details */}
            {showModal && selectedCell && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowModal(false)}>
                    <div className="bg-white rounded-xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto shadow-xl" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-4">
                            <h4 className="text-lg font-bold truncate pr-4">
                                {selectedCell.model && typeof selectedCell.model === 'string'
                                    ? (selectedCell.model.split('/').pop() || selectedCell.model)
                                    : 'Unknown'} × {selectedCell.category}
                            </h4>
                            <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 text-2xl">×</button>
                        </div>
                        <p className="text-sm text-slate-500 mb-4">{modalEntries.length} entries</p>
                        <div className="space-y-3 max-h-96 overflow-y-auto">
                            {modalEntries.slice(0, 20).map((entry, idx) => (
                                <div key={idx} className={`p-3 rounded-lg border ${['safe', 'ALLOWED', 'Authorized'].includes(entry.verdict) ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
                                    <div className="flex justify-between text-xs mb-2">
                                        <span className={`font-bold ${['safe', 'ALLOWED', 'Authorized'].includes(entry.verdict) ? 'text-green-700' : 'text-red-700'}`}>
                                            {entry.verdict}
                                        </span>
                                        <span className="text-slate-500">{entry.case_id}</span>
                                    </div>
                                    <div className="space-y-2">
                                        <div>
                                            <p className="text-xs font-semibold text-slate-600 mb-1">Prompt:</p>
                                            <p className="text-sm text-slate-700 line-clamp-3 font-mono">{entry.prompt || 'No prompt'}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs font-semibold text-slate-600 mb-1">Response:</p>
                                            <p className="text-sm text-slate-700 line-clamp-4">{entry.response || 'No response'}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {modalEntries.length > 20 && (
                                <p className="text-center text-slate-400 text-sm">...and {modalEntries.length - 20} more</p>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
