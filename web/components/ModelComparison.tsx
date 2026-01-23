'use client';

import { useMemo } from 'react';

type AuditRow = {
    model: string;
    verdict: string;
    category: string;
    response?: string;
    response_text?: string;
    timestamp?: string;
};

type ModelStats = {
    model: string;
    refusalRate: number;
    avgLength: number;
    count: number;
    confidenceInterval: { lower: number; upper: number };
    pValue: number | null;
};

// Calculate Wilson score confidence interval for proportions
function wilsonConfidenceInterval(successes: number, total: number, confidence: number = 0.95): { lower: number; upper: number } {
    if (total === 0) return { lower: 0, upper: 0 };

    // Z-score for 95% confidence
    const z = confidence === 0.95 ? 1.96 : 1.645; // 95% or 90%
    const p = successes / total;
    const n = total;

    const denominator = 1 + (z * z) / n;
    const center = p + (z * z) / (2 * n);
    const margin = z * Math.sqrt((p * (1 - p) + (z * z) / (4 * n)) / n);

    return {
        lower: Math.max(0, (center - margin) / denominator) * 100,
        upper: Math.min(1, (center + margin) / denominator) * 100
    };
}

// Two-proportion Z-test for significance
function twoProportionZTest(p1: number, n1: number, p2: number, n2: number): number {
    if (n1 === 0 || n2 === 0) return 1;

    const pooledP = (p1 * n1 + p2 * n2) / (n1 + n2);
    const se = Math.sqrt(pooledP * (1 - pooledP) * (1 / n1 + 1 / n2));

    if (se === 0) return 1;

    const z = Math.abs(p1 - p2) / se;
    // Approximate p-value from Z-score (two-tailed)
    const pValue = 2 * (1 - normalCDF(z));
    return pValue;
}

// Standard normal CDF approximation
function normalCDF(x: number): number {
    const a1 = 0.254829592;
    const a2 = -0.284496736;
    const a3 = 1.421413741;
    const a4 = -1.453152027;
    const a5 = 1.061405429;
    const p = 0.3275911;

    const sign = x < 0 ? -1 : 1;
    x = Math.abs(x) / Math.sqrt(2);

    const t = 1.0 / (1.0 + p * x);
    const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

    return 0.5 * (1.0 + sign * y);
}

export default function ModelComparison({ data }: { data: AuditRow[] }) {
    const stats = useMemo(() => {
        const map: Record<string, { total: number; refusals: number; totalLen: number }> = {};

        data.forEach(d => {
            const modelName = d.model;
            if (!map[modelName]) map[modelName] = { total: 0, refusals: 0, totalLen: 0 };

            map[modelName].total++;
            if (d.verdict === 'REFUSAL' || d.verdict === 'REMOVED' || d.verdict === 'unsafe') {
                map[modelName].refusals++;
            }

            const responseText = d.response || d.response_text || '';
            map[modelName].totalLen += responseText.length;
        });

        // Calculate overall stats for comparison
        const totalAll = Object.values(map).reduce((sum, s) => sum + s.total, 0);
        const refusalsAll = Object.values(map).reduce((sum, s) => sum + s.refusals, 0);
        const overallRate = refusalsAll / totalAll;

        return Object.entries(map).map(([model, s]) => {
            const refusalRate = (s.refusals / s.total) * 100;
            const ci = wilsonConfidenceInterval(s.refusals, s.total);

            // Compare to overall rate
            const pValue = twoProportionZTest(
                s.refusals / s.total, s.total,
                overallRate, totalAll
            );

            return {
                model,
                refusalRate,
                avgLength: Math.round(s.totalLen / s.total),
                count: s.total,
                confidenceInterval: ci,
                pValue
            };
        }).sort((a, b) => b.refusalRate - a.refusalRate);
    }, [data]);

    const formatCI = (ci: { lower: number; upper: number }) => {
        return `${ci.lower.toFixed(1)}–${ci.upper.toFixed(1)}%`;
    };

    const getSignificanceLabel = (pValue: number | null) => {
        if (pValue === null) return '';
        if (pValue < 0.001) return '***';
        if (pValue < 0.01) return '**';
        if (pValue < 0.05) return '*';
        return '';
    };

    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100">
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <span>🏆</span> Model Comparison
                </h3>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead>
                        <tr className="bg-slate-50 border-b border-slate-100">
                            <th className="p-4 font-semibold text-slate-500 uppercase text-xs tracking-wider">Model</th>
                            <th className="p-4 font-semibold text-slate-500 uppercase text-xs tracking-wider">
                                <div className="flex items-center gap-1">
                                    Refusal Rate
                                    <span title="Percentage of prompts refused or flagged as unsafe">ⓘ</span>
                                </div>
                            </th>
                            <th className="p-4 font-semibold text-slate-500 uppercase text-xs tracking-wider">
                                <div className="flex items-center gap-1">
                                    95% CI
                                    <span title="Wilson score confidence interval for the refusal rate">ⓘ</span>
                                </div>
                            </th>
                            <th className="p-4 font-semibold text-slate-500 uppercase text-xs tracking-wider">Avg Response</th>
                            <th className="p-4 font-semibold text-slate-500 uppercase text-xs tracking-wider text-right">Prompts</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {stats.map((row: ModelStats) => (
                            <tr key={row.model} className="hover:bg-slate-50/50 transition-colors">
                                <td className="p-4 font-medium text-slate-900">
                                    {row.model.split('/')[1] || row.model}
                                </td>
                                <td className="p-4">
                                    <div className="flex items-center gap-3">
                                        <div className="flex-1 h-2 bg-slate-100 rounded-full max-w-[100px] overflow-hidden">
                                            <div
                                                className={`h-full rounded-full ${row.refusalRate > 50 ? 'bg-red-500' :
                                                    row.refusalRate > 30 ? 'bg-amber-500' : 'bg-emerald-500'
                                                    }`}
                                                style={{ width: `${Math.max(row.refusalRate, 5)}%` }}
                                            ></div>
                                        </div>
                                        <span className={`font-bold ${row.refusalRate > 50 ? 'text-red-600' :
                                            row.refusalRate > 30 ? 'text-amber-600' : 'text-emerald-600'
                                            }`}>
                                            {row.refusalRate.toFixed(1)}%
                                        </span>
                                    </div>
                                </td>
                                <td className="p-4 text-slate-500 text-xs font-mono">
                                    {formatCI(row.confidenceInterval)}
                                </td>
                                <td className="p-4 font-mono text-slate-600">
                                    {row.avgLength} chars
                                </td>
                                <td className="p-4 text-right text-slate-600">
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
