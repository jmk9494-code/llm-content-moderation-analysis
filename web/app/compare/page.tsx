'use client';

import { useEffect, useState, useMemo } from 'react';
import { ChevronDown, BarChart2, AlertCircle, CheckCircle, Zap, Shield, ArrowRightLeft } from 'lucide-react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip, Legend } from 'recharts';

type AuditRow = {
    timestamp: string;
    model: string;
    case_id: string;
    category: string;
    verdict: string;
    prompt: string;
    response: string;
    cost: number;
    tokens_used: number;
    latency_ms: number;
};

// Simplified Model Info for Selector
type ModelInfo = {
    id: string;
    name: string;
    provider?: string;
};

export default function ComparePage() {
    const [data, setData] = useState<AuditRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [modelA, setModelA] = useState<string>('');
    const [modelB, setModelB] = useState<string>('');
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
        fetch('/api/audit')
            .then(r => r.json())
            .then(res => {
                // Filter out ERROR verdicts (broken models)
                const rows = (res.data || []).filter((r: AuditRow) => r.verdict !== 'ERROR');
                setData(rows);

                // Set defaults: first two unique models
                const uniqueModels = Array.from(new Set(rows.map((r: AuditRow) => r.model))) as string[];
                if (uniqueModels.length > 0) setModelA(uniqueModels[0]);
                if (uniqueModels.length > 1) setModelB(uniqueModels[1]);
                else if (uniqueModels.length > 0) setModelB(uniqueModels[0]);

                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    }, []);

    const availableModels = useMemo(() => {
        return Array.from(new Set(data.map(d => d.model))).sort();
    }, [data]);

    // Comparison Stats
    const getStats = (modelId: string) => {
        const modelData = data.filter(d => d.model === modelId);
        const total = modelData.length;
        if (total === 0) return null;

        const refusals = modelData.filter(d => d.verdict === 'REFUSAL' || d.verdict === 'REMOVED' || d.verdict === 'unsafe').length;
        const totalLen = modelData.reduce((sum, d) => sum + (d.response?.length || 0), 0);

        return {
            refusalRate: (refusals / total) * 100,
            avgVerbosity: Math.round(totalLen / total),
            total
        };
    };

    const statsA = useMemo(() => getStats(modelA), [data, modelA]);
    const statsB = useMemo(() => getStats(modelB), [data, modelB]);

    // Radar Chart Data (Category Sensitivity)
    const radarData = useMemo(() => {
        if (!modelA || !modelB) return [];

        const categories = Array.from(new Set(data.map(d => d.category))).sort();

        return categories.map(cat => {
            const dataA = data.filter(d => d.model === modelA && d.category === cat);
            const dataB = data.filter(d => d.model === modelB && d.category === cat);

            const rateA = dataA.length ? (dataA.filter(d => d.verdict === 'REFUSAL' || d.verdict === 'REMOVED' || d.verdict === 'unsafe').length / dataA.length) * 100 : 0;
            const rateB = dataB.length ? (dataB.filter(d => d.verdict === 'REFUSAL' || d.verdict === 'REMOVED' || d.verdict === 'unsafe').length / dataB.length) * 100 : 0;

            return {
                subject: cat,
                A: rateA,
                B: rateB,
                fullMark: 100
            };
        });
    }, [data, modelA, modelB]);

    // Disagreement Analysis
    const disagreements = useMemo(() => {
        if (!modelA || !modelB) return [];

        // Find common prompts (naive matching by prompt string could be slow, assuming case_id or prompt match)
        // Let's use prompt text for matching as case_id might be 1:1 if run separately
        // Actually, if we have case_id it's better. Assuming case_id is consistent.
        // If not, use prompt.

        const mapA = new Map<string, AuditRow>();
        data.filter(d => d.model === modelA).forEach(d => mapA.set(d.prompt, d));

        const diffs: { prompt: string; category: string; rowA: AuditRow; rowB: AuditRow }[] = [];

        data.filter(d => d.model === modelB).forEach(rowB => {
            const rowA = mapA.get(rowB.prompt);
            if (rowA) {
                // Check verification status. 'safe' vs 'unsafe'/'REFUSAL'
                const isSafeA = rowA.verdict === 'safe';
                const isSafeB = rowB.verdict === 'safe';

                if (isSafeA !== isSafeB) {
                    diffs.push({
                        prompt: rowB.prompt,
                        category: rowB.category,
                        rowA,
                        rowB
                    });
                }
            }
        });

        return diffs;
    }, [data, modelA, modelB]);

    if (!isClient) return null; // Hydration fix

    return (
        <main className="min-h-screen bg-slate-50 dark:bg-slate-900 p-4 md:p-8 font-sans text-slate-900 dark:text-slate-100">
            <div className="max-w-7xl mx-auto space-y-8">
                {/* Header */}
                <header>
                    <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
                        <ArrowRightLeft className="h-8 w-8 text-indigo-600" />
                        Model Comparison
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-2">
                        Side-by-side analysis of model behavior, refusal rates, and disagreements.
                    </p>
                </header>

                {/* Selectors */}
                <div className="flex flex-col md:flex-row items-center gap-4 bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                    <div className="w-full md:w-1/2">
                        <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Model A</label>
                        <div className="relative">
                            <select
                                value={modelA}
                                onChange={(e) => setModelA(e.target.value)}
                                className="w-full appearance-none bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg p-3 pr-8 focus:ring-2 focus:ring-indigo-500 font-medium"
                            >
                                {availableModels.map(m => <option key={m} value={m}>{m}</option>)}
                            </select>
                            <ChevronDown className="absolute right-3 top-3.5 h-4 w-4 text-slate-400 pointer-events-none" />
                        </div>
                    </div>

                    <div className="hidden md:flex items-center justify-center p-2 rounded-full bg-slate-100 dark:bg-slate-700 mt-6">
                        <span className="text-xs font-bold text-slate-500">VS</span>
                    </div>

                    <div className="w-full md:w-1/2">
                        <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Model B</label>
                        <div className="relative">
                            <select
                                value={modelB}
                                onChange={(e) => setModelB(e.target.value)}
                                className="w-full appearance-none bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg p-3 pr-8 focus:ring-2 focus:ring-indigo-500 font-medium"
                            >
                                {availableModels.map(m => <option key={m} value={m}>{m}</option>)}
                            </select>
                            <ChevronDown className="absolute right-3 top-3.5 h-4 w-4 text-slate-400 pointer-events-none" />
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div className="p-12 text-center text-slate-500">Loading audit data...</div>
                ) : (
                    <>
                        {/* Comparison Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Card A */}
                            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm border-t-4 border-t-indigo-500 relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-4 opacity-5">
                                    <Zap className="h-32 w-32" />
                                </div>
                                <h2 className="text-xl font-bold mb-4 truncate pr-8">{modelA}</h2>
                                {statsA && (
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-lg">
                                            <div className="text-xs text-slate-500 uppercase font-semibold mb-1">Refusal Rate</div>
                                            <div className={`text-2xl font-bold ${statsA.refusalRate > 50 ? 'text-red-600' : 'text-emerald-600'}`}>
                                                {statsA.refusalRate.toFixed(1)}%
                                            </div>
                                        </div>
                                        <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-lg">
                                            <div className="text-xs text-slate-500 uppercase font-semibold mb-1">Avg Verbosity</div>
                                            <div className="text-2xl font-bold text-slate-700 dark:text-slate-300">
                                                {statsA.avgVerbosity} <span className="text-sm font-normal text-slate-400">chars</span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Card B */}
                            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm border-t-4 border-t-emerald-500 relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-4 opacity-5">
                                    <Shield className="h-32 w-32" />
                                </div>
                                <h2 className="text-xl font-bold mb-4 truncate pr-8">{modelB}</h2>
                                {statsB && (
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-lg">
                                            <div className="text-xs text-slate-500 uppercase font-semibold mb-1">Refusal Rate</div>
                                            <div className={`text-2xl font-bold ${statsB.refusalRate > 50 ? 'text-red-600' : 'text-emerald-600'}`}>
                                                {statsB.refusalRate.toFixed(1)}%
                                            </div>
                                        </div>
                                        <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-lg">
                                            <div className="text-xs text-slate-500 uppercase font-semibold mb-1">Avg Verbosity</div>
                                            <div className="text-2xl font-bold text-slate-700 dark:text-slate-300">
                                                {statsB.avgVerbosity} <span className="text-sm font-normal text-slate-400">chars</span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Radar Chart */}
                        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
                            <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                                <span>🕸️</span> Side-by-Side Censorship Profile
                            </h3>
                            <div className="h-[400px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                                        <PolarGrid stroke="#e2e8f0" />
                                        <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 12 }} />
                                        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#94a3b8' }} />
                                        <Radar
                                            name={modelA}
                                            dataKey="A"
                                            stroke="#6366f1"
                                            strokeWidth={2}
                                            fill="#6366f1"
                                            fillOpacity={0.3}
                                        />
                                        <Radar
                                            name={modelB}
                                            dataKey="B"
                                            stroke="#10b981"
                                            strokeWidth={2}
                                            fill="#10b981"
                                            fillOpacity={0.3}
                                        />
                                        <Legend />
                                        <Tooltip
                                            contentStyle={{
                                                borderRadius: '8px',
                                                border: 'none',
                                                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                                                backgroundColor: '#fff'
                                            }}
                                        />
                                    </RadarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Disagreement Analysis */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-bold flex items-center gap-2">
                                <span>⚔️</span> Disagreement Analysis ({disagreements.length})
                            </h3>
                            <p className="text-sm text-slate-500">
                                Showing instances where one model refused while the other allowed (and vice versa).
                            </p>

                            <div className="grid gap-4">
                                {disagreements.slice(0, 50).map((diff, idx) => (
                                    <div key={idx} className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                                        <div className="bg-slate-50 dark:bg-slate-900/50 p-3 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                                            <span className="text-xs font-bold uppercase text-slate-500 tracking-wider">
                                                {diff.category}
                                            </span>
                                            {/* <span className="text-xs text-slate-400 font-mono">ID: {idx}</span> */}
                                        </div>
                                        <div className="p-4 space-y-4">
                                            <div className="text-sm text-slate-700 dark:text-slate-300 font-mono bg-slate-50 dark:bg-slate-900 p-3 rounded border border-slate-100 dark:border-slate-800">
                                                {diff.prompt}
                                            </div>

                                            <div className="grid grid-cols-2 gap-4 text-sm">
                                                <div className={`p-2 rounded flex justify-between items-center ${diff.rowA.verdict === 'safe' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                                                    }`}>
                                                    <span className="font-bold truncate w-24">{modelA}</span>
                                                    <span className="font-bold">{diff.rowA.verdict === 'safe' ? 'ALLOWED' : 'REMOVED'}</span>
                                                </div>
                                                <div className={`p-2 rounded flex justify-between items-center ${diff.rowB.verdict === 'safe' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                                                    }`}>
                                                    <span className="font-bold truncate w-24">{modelB}</span>
                                                    <span className="font-bold">{diff.rowB.verdict === 'safe' ? 'ALLOWED' : 'REMOVED'}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {disagreements.length > 50 && (
                                    <div className="text-center text-slate-500 text-sm py-4">
                                        ...and {disagreements.length - 50} more
                                    </div>
                                )}
                            </div>
                        </div>
                    </>
                )}
            </div>
        </main>
    );
}
