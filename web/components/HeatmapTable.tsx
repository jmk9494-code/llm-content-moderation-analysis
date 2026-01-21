'use client';

import { useMemo } from 'react';

type HeatmapProps = {
    data: any[];
    title?: string;
    description?: string;
};

export default function HeatmapTable({ data, title = "Refusal Heatmap", description }: HeatmapProps) {
    // 1. Process data to get Refusal Rate per Model per Category
    const matrix = useMemo(() => {
        const models = Array.from(new Set(data.map(d => d.model))).sort();
        const categories = Array.from(new Set(data.map(d => d.category))).sort();

        const stats: Record<string, Record<string, { total: number; refusals: number }>> = {};

        // Init stats
        models.forEach(m => {
            stats[m] = {};
            categories.forEach(c => {
                stats[m][c] = { total: 0, refusals: 0 };
            });
        });

        // Fill stats
        data.forEach(d => {
            if (!stats[d.model] || !stats[d.model][d.category]) return;
            stats[d.model][d.category].total++;
            if (d.verdict === 'REFUSAL' || d.verdict === 'REMOVED') {
                stats[d.model][d.category].refusals++;
            }
        });

        return { models, categories, stats };
    }, [data]);

    // Helper for color scale
    const getColor = (rate: number) => {
        // Red = High Refusal (Strict), Green = Low Refusal (Permissive)
        // Adjust opacity based on rate
        if (rate === 0) return 'bg-emerald-50 text-emerald-900';
        if (rate < 0.2) return 'bg-emerald-100 text-emerald-900';
        if (rate < 0.4) return 'bg-yellow-100 text-yellow-900';
        if (rate < 0.6) return 'bg-orange-100 text-orange-900';
        if (rate < 0.8) return 'bg-red-100 text-red-900';
        return 'bg-red-200 text-red-900 font-bold';
    };

    if (matrix.models.length === 0) return null;

    return (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm overflow-hidden">
            <div className="mb-6">
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <span>🔥</span> {title}
                </h3>
                {description && (
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-3xl">
                        {description}
                    </p>
                )}
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead>
                        <tr>
                            <th className="p-3 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700 min-w-[150px]">
                                Category \ Model
                            </th>
                            {matrix.models.map(m => (
                                <th key={m} className="p-3 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700 font-semibold text-slate-700 dark:text-slate-300 min-w-[120px]">
                                    {m.split('/').pop()}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {matrix.categories.map(c => (
                            <tr key={c} className="border-b border-slate-100 dark:border-slate-700/50 last:border-0 hover:bg-slate-50/50 transition-colors">
                                <td className="p-3 font-medium text-slate-700 dark:text-slate-200">
                                    {c}
                                </td>
                                {matrix.models.map(m => {
                                    const cell = matrix.stats[m][c];
                                    if (!cell || cell.total === 0) {
                                        return (
                                            <td key={m} className="p-3 text-center text-slate-300 dark:text-slate-600 bg-slate-50/20">
                                                -
                                            </td>
                                        );
                                    }
                                    const rate = cell.refusals / cell.total;
                                    return (
                                        <td key={m} className={`p-3 text-center ${getColor(rate)}`}>
                                            {(rate * 100).toFixed(0)}%
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="mt-4 flex items-center gap-4 text-xs text-slate-500 justify-end">
                <div className="flex items-center gap-1"><div className="w-3 h-3 bg-emerald-100 rounded"></div> 0-20% Refusal</div>
                <div className="flex items-center gap-1"><div className="w-3 h-3 bg-yellow-100 rounded"></div> 20-40%</div>
                <div className="flex items-center gap-1"><div className="w-3 h-3 bg-orange-100 rounded"></div> 40-60%</div>
                <div className="flex items-center gap-1"><div className="w-3 h-3 bg-red-200 rounded"></div> 80%+</div>
            </div>
        </div>
    );
}
