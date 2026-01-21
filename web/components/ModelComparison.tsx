'use client';

import { useMemo } from 'react';
// import { HelpCircle, Trophy } from 'lucide-react'; 
// Use standard icons if lucide-react is not available, or assume it works as Dashboard uses it.
// Dashboard uses: import { Activity, DollarSign, CheckCircle, Zap, Filter, LayoutGrid, List } from 'lucide-react';
// So lucide-react IS available. I will keep it but remove Tooltip which I don't use.
import { MessageSquare, Shield, AlertTriangle } from 'lucide-react';

type AuditRow = {
    model: string;
    verdict: string;
    category: string;
    response: string;
    timestamp: string;
};

type ModelStats = {
    model: string;
    censorshipScore: number;
    avgLength: number;
    count: number;
};

export default function ModelComparison({ data }: { data: AuditRow[] }) {
    const stats = useMemo(() => {
        const map: Record<string, { total: number; refusals: number; totalLen: number }> = {};

        data.forEach(d => {
            // Normalize model name if needed, assuming formatted in data or needing format
            const modelName = d.model;
            if (!map[modelName]) map[modelName] = { total: 0, refusals: 0, totalLen: 0 };

            map[modelName].total++;
            if (d.verdict === 'REFUSAL' || d.verdict === 'REMOVED' || d.verdict === 'unsafe') { // Check verdict values from dashboard: 'safe', 'unsafe'? 
                // Dashboard page says: safe, unsafe, default.
                // Dashboard implementation: 
                // if (activeFilter === 'unsafe') return data.filter(d => d.verdict === 'unsafe');
                // HeatmapTable says: d.verdict === 'REFUSAL' || d.verdict === 'REMOVED'
                // Need to be careful about verdict normalization. 
                // The dashboard screenshot shows 'unsafe'. 
                // Let's look at `web/app/dashboard/page.tsx` again.
                // It renders `d.verdict`.
                // Let's assume 'unsafe' is the key for censorship.
                map[modelName].refusals++;
            }

            // Also check 'safe' vs others. 
            // If verdict is NOT safe, is it censored?
            // In dashboard page: 
            // safe: green
            // unsafe: red
            // default: amber

            map[modelName].totalLen += d.response?.length || 0;
        });

        return Object.entries(map).map(([model, s]) => ({
            model,
            censorshipScore: (s.refusals / s.total) * 100,
            avgLength: Math.round(s.totalLen / s.total),
            count: s.total
        })).sort((a, b) => b.censorshipScore - a.censorshipScore); // Sort by highest censorship (red at top?) or logic?
        // Screenshot shows qwen (75%) at top. So Descending.
    }, [data]);

    return (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 dark:border-slate-700/50">
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <span>🏆</span> Model Comparison
                </h3>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead>
                        <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-700">
                            <th className="p-4 font-semibold text-slate-500 uppercase text-xs tracking-wider">Model</th>
                            <th className="p-4 font-semibold text-slate-500 uppercase text-xs tracking-wider">
                                <div className="flex items-center gap-1">
                                    Censorship Score
                                    <span title="Percentage of prompts refused or flagged as unsafe">ⓘ</span>
                                </div>
                            </th>
                            <th className="p-4 font-semibold text-slate-500 uppercase text-xs tracking-wider">Avg Response Length</th>
                            <th className="p-4 font-semibold text-slate-500 uppercase text-xs tracking-wider text-right">Prompts</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                        {stats.map((row) => (
                            <tr key={row.model} className="hover:bg-slate-50/50 transition-colors">
                                <td className="p-4 font-medium text-slate-900 dark:text-slate-200">
                                    {row.model.split('/')[1] || row.model}
                                </td>
                                <td className="p-4">
                                    <div className="flex items-center gap-3">
                                        <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-700 rounded-full max-w-[100px] overflow-hidden">
                                            <div
                                                className={`h-full rounded-full ${row.censorshipScore > 50 ? 'bg-red-500' :
                                                    row.censorshipScore > 30 ? 'bg-amber-500' : 'bg-emerald-500'
                                                    }`}
                                                style={{ width: `${Math.max(row.censorshipScore, 5)}%` }}
                                            ></div>
                                        </div>
                                        <span className={`font-bold ${row.censorshipScore > 50 ? 'text-red-600' :
                                            row.censorshipScore > 30 ? 'text-amber-600' : 'text-emerald-600'
                                            }`}>
                                            {row.censorshipScore.toFixed(1)}%
                                        </span>
                                    </div>
                                </td>
                                <td className="p-4 font-mono text-slate-600 dark:text-slate-400">
                                    {row.avgLength} chars
                                </td>
                                <td className="p-4 text-right text-slate-600 dark:text-slate-400">
                                    {row.count}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
