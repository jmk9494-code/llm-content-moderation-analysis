'use client';

import { useEffect, useState, useMemo } from 'react';
import { ChevronDown, BarChart2, AlertCircle, CheckCircle, Zap, Shield, ArrowRightLeft, Search, Filter, Calendar, X } from 'lucide-react';
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

// Provider Logo Helper using LogoKit API
const LOGOKIT_API_KEY = 'pk_fra468443f1ecbf16b1c64';
const getProviderLogo = (model: string): string => {
    const provider = model.split('/')[0]?.toLowerCase() || '';
    const logoMap: Record<string, string> = {
        'openai': 'openai.com',
        'anthropic': 'anthropic.com',
        'google': 'google.com',
        'mistralai': 'mistral.ai',
        'deepseek': 'deepseek.com',
        'qwen': 'alibaba.com',
        '01-ai': '01.ai',
    };
    const domain = logoMap[provider] || `${provider}.com`;
    return `https://img.logokit.com/${domain}?token=${LOGOKIT_API_KEY}`;
};

export default function ComparePage() {
    const [data, setData] = useState<AuditRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [modelA, setModelA] = useState<string>('');
    const [modelB, setModelB] = useState<string>('');
    const [isClient, setIsClient] = useState(false);

    // Filters
    const [searchKeyword, setSearchKeyword] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [selectedDate, setSelectedDate] = useState('all');

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

    // Filter Options
    const filterOptions = useMemo(() => {
        const categories = Array.from(new Set(data.map(d => d.category))).filter(Boolean).sort();
        const dates = Array.from(new Set(data.map(d => d.timestamp?.split('T')[0]))).filter(Boolean).sort().reverse();
        return { categories, dates };
    }, [data]);

    const availableModels = useMemo(() => {
        // Filter out models with 0 data
        const modelCounts = new Map<string, number>();
        data.forEach(d => modelCounts.set(d.model, (modelCounts.get(d.model) || 0) + 1));
        return Array.from(new Set(data.map(d => d.model))).filter(m => (modelCounts.get(m) || 0) > 0).sort();
    }, [data]);

    // Filtered data based on search/category/date
    const filteredData = useMemo(() => {
        return data.filter(d => {
            if (selectedCategory !== 'all' && d.category !== selectedCategory) return false;
            if (selectedDate !== 'all' && !d.timestamp?.startsWith(selectedDate)) return false;
            if (searchKeyword && !d.prompt?.toLowerCase().includes(searchKeyword.toLowerCase())) return false;
            return true;
        });
    }, [data, selectedCategory, selectedDate, searchKeyword]);

    // Comparison Stats
    const getStats = (modelId: string) => {
        const modelData = filteredData.filter(d => d.model === modelId);
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

    const statsA = useMemo(() => getStats(modelA), [filteredData, modelA]);
    const statsB = useMemo(() => getStats(modelB), [filteredData, modelB]);

    // Radar Chart Data (Category Sensitivity)
    const radarData = useMemo(() => {
        if (!modelA || !modelB) return [];

        const categories = Array.from(new Set(filteredData.map(d => d.category))).sort();

        return categories.map(cat => {
            const dataA = filteredData.filter(d => d.model === modelA && d.category === cat);
            const dataB = filteredData.filter(d => d.model === modelB && d.category === cat);

            const rateA = dataA.length ? (dataA.filter(d => d.verdict === 'REFUSAL' || d.verdict === 'REMOVED' || d.verdict === 'unsafe').length / dataA.length) * 100 : 0;
            const rateB = dataB.length ? (dataB.filter(d => d.verdict === 'REFUSAL' || d.verdict === 'REMOVED' || d.verdict === 'unsafe').length / dataB.length) * 100 : 0;

            return {
                subject: cat,
                A: rateA,
                B: rateB,
                fullMark: 100
            };
        });
    }, [filteredData, modelA, modelB]);

    // Disagreement Analysis
    const disagreements = useMemo(() => {
        if (!modelA || !modelB) return [];

        // Helper function to determine if verdict is "safe"
        const isSafe = (verdict: string) => {
            const v = verdict?.toUpperCase();
            return v !== 'REMOVED' && v !== 'REFUSAL' && v !== 'UNSAFE';
        };

        const mapA = new Map<string, AuditRow>();
        filteredData.filter(d => d.model === modelA).forEach(d => mapA.set(d.prompt, d));

        const diffs: { prompt: string; category: string; rowA: AuditRow; rowB: AuditRow }[] = [];

        filteredData.filter(d => d.model === modelB).forEach(rowB => {
            const rowA = mapA.get(rowB.prompt);
            if (rowA) {
                const isSafeA = isSafe(rowA.verdict);
                const isSafeB = isSafe(rowB.verdict);

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
    }, [filteredData, modelA, modelB]);

    const clearFilters = () => {
        setSearchKeyword('');
        setSelectedCategory('all');
        setSelectedDate('all');
    };

    if (!isClient) return null; // Hydration fix

    return (
        <main className="min-h-screen bg-slate-50 dark:bg-slate-900 p-4 md:p-8 font-sans text-slate-900 dark:text-slate-100">
            <div className="max-w-7xl mx-auto space-y-8">
                {/* Header */}
                <header>
                    <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
                        <div className="flex items-center gap-2">
                            <Shield className="h-8 w-8 text-indigo-600" />
                            <ArrowRightLeft className="h-6 w-6 text-slate-400" />
                        </div>
                        Model Comparison
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-2">
                        Side-by-side analysis of model behavior, refusal rates, and disagreements.
                    </p>
                </header>

                {/* Filters Bar */}
                <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                    <div className="flex flex-wrap gap-4 items-end">
                        {/* Search */}
                        <div className="flex-1 min-w-[200px]">
                            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Search Prompts</label>
                            <div className="relative">
                                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                                <input
                                    type="text"
                                    value={searchKeyword}
                                    onChange={e => setSearchKeyword(e.target.value)}
                                    placeholder="Search..."
                                    className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>
                        </div>

                        {/* Category */}
                        <div className="w-48">
                            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Category</label>
                            <div className="relative">
                                <Filter className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                                <select
                                    value={selectedCategory}
                                    onChange={e => setSelectedCategory(e.target.value)}
                                    className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm appearance-none focus:ring-2 focus:ring-indigo-500"
                                >
                                    <option value="all">All Categories</option>
                                    {filterOptions.categories.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                        </div>

                        {/* Date */}
                        <div className="w-48">
                            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Date</label>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                                <select
                                    value={selectedDate}
                                    onChange={e => setSelectedDate(e.target.value)}
                                    className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm appearance-none focus:ring-2 focus:ring-indigo-500"
                                >
                                    <option value="all">All Dates</option>
                                    {filterOptions.dates.map(d => <option key={d} value={d}>{d}</option>)}
                                </select>
                            </div>
                        </div>

                        {/* Clear */}
                        {(searchKeyword || selectedCategory !== 'all' || selectedDate !== 'all') && (
                            <button onClick={clearFilters} className="flex items-center gap-1 px-3 py-2 text-sm text-slate-500 hover:text-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg">
                                <X className="h-4 w-4" /> Clear
                            </button>
                        )}
                    </div>
                </div>

                {/* Model Selectors */}
                <div className="flex flex-col md:flex-row items-center gap-4 bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                    <div className="w-full md:w-1/2">
                        <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Model A</label>
                        <div className="relative flex items-center gap-3">
                            <img
                                src={getProviderLogo(modelA)}
                                alt=""
                                className="h-8 w-8 rounded-lg object-contain bg-white border border-slate-100"
                                onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                            />
                            <select
                                value={modelA}
                                onChange={(e) => setModelA(e.target.value)}
                                className="flex-1 appearance-none bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg p-3 pr-8 focus:ring-2 focus:ring-indigo-500 font-medium"
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
                        <div className="relative flex items-center gap-3">
                            <img
                                src={getProviderLogo(modelB)}
                                alt=""
                                className="h-8 w-8 rounded-lg object-contain bg-white border border-slate-100"
                                onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                            />
                            <select
                                value={modelB}
                                onChange={(e) => setModelB(e.target.value)}
                                className="flex-1 appearance-none bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg p-3 pr-8 focus:ring-2 focus:ring-indigo-500 font-medium"
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
                                <div className="absolute top-0 right-0 p-4 opacity-10">
                                    <img
                                        src={getProviderLogo(modelA)}
                                        alt=""
                                        className="h-32 w-32 object-contain"
                                    />
                                </div>
                                <div className="flex items-center gap-3 mb-4">
                                    <img
                                        src={getProviderLogo(modelA)}
                                        alt=""
                                        className="h-10 w-10 rounded-lg object-contain bg-white border border-slate-100"
                                        onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                    />
                                    <h2 className="text-xl font-bold truncate pr-8">{modelA}</h2>
                                </div>
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
                                <div className="absolute top-0 right-0 p-4 opacity-10">
                                    <img
                                        src={getProviderLogo(modelB)}
                                        alt=""
                                        className="h-32 w-32 object-contain"
                                    />
                                </div>
                                <div className="flex items-center gap-3 mb-4">
                                    <img
                                        src={getProviderLogo(modelB)}
                                        alt=""
                                        className="h-10 w-10 rounded-lg object-contain bg-white border border-slate-100"
                                        onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                    />
                                    <h2 className="text-xl font-bold truncate pr-8">{modelB}</h2>
                                </div>
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
                                        </div>
                                        <div className="p-4 space-y-4">
                                            {/* Prompt */}
                                            <div>
                                                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Prompt</p>
                                                <div className="text-sm text-slate-700 dark:text-slate-300 font-mono bg-slate-50 dark:bg-slate-900 p-3 rounded border border-slate-100 dark:border-slate-800 max-h-32 overflow-y-auto">
                                                    {diff.prompt}
                                                </div>
                                            </div>

                                            {/* Side-by-Side Responses */}
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {/* Model A Response */}
                                                <div className={`rounded-lg border ${diff.rowA.verdict === 'safe' || diff.rowA.verdict === 'ALLOWED' ? 'border-green-200 bg-green-50/50' : 'border-red-200 bg-red-50/50'}`}>
                                                    <div className={`px-3 py-2 flex justify-between items-center border-b ${diff.rowA.verdict === 'safe' || diff.rowA.verdict === 'ALLOWED' ? 'border-green-200 bg-green-100' : 'border-red-200 bg-red-100'}`}>
                                                        <div className="flex items-center gap-2">
                                                            <img
                                                                src={getProviderLogo(modelA)}
                                                                alt=""
                                                                className="h-5 w-5 rounded object-contain"
                                                                onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                                            />
                                                            <span className="font-bold text-sm">{modelA?.split('/')[1] || modelA}</span>
                                                        </div>
                                                        <span className={`text-xs font-bold px-2 py-1 rounded ${diff.rowA.verdict === 'safe' || diff.rowA.verdict === 'ALLOWED' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
                                                            {diff.rowA.verdict === 'safe' || diff.rowA.verdict === 'ALLOWED' ? 'ALLOWED' : 'REMOVED'}
                                                        </span>
                                                    </div>
                                                    <p className="p-3 text-sm text-slate-700 dark:text-slate-300 max-h-36 overflow-y-auto">
                                                        {diff.rowA.response || 'No response recorded'}
                                                    </p>
                                                </div>

                                                {/* Model B Response */}
                                                <div className={`rounded-lg border ${diff.rowB.verdict === 'safe' || diff.rowB.verdict === 'ALLOWED' ? 'border-green-200 bg-green-50/50' : 'border-red-200 bg-red-50/50'}`}>
                                                    <div className={`px-3 py-2 flex justify-between items-center border-b ${diff.rowB.verdict === 'safe' || diff.rowB.verdict === 'ALLOWED' ? 'border-green-200 bg-green-100' : 'border-red-200 bg-red-100'}`}>
                                                        <div className="flex items-center gap-2">
                                                            <img
                                                                src={getProviderLogo(modelB)}
                                                                alt=""
                                                                className="h-5 w-5 rounded object-contain"
                                                                onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                                            />
                                                            <span className="font-bold text-sm">{modelB?.split('/')[1] || modelB}</span>
                                                        </div>
                                                        <span className={`text-xs font-bold px-2 py-1 rounded ${diff.rowB.verdict === 'safe' || diff.rowB.verdict === 'ALLOWED' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
                                                            {diff.rowB.verdict === 'safe' || diff.rowB.verdict === 'ALLOWED' ? 'ALLOWED' : 'REMOVED'}
                                                        </span>
                                                    </div>
                                                    <p className="p-3 text-sm text-slate-700 dark:text-slate-300 max-h-36 overflow-y-auto">
                                                        {diff.rowB.response || 'No response recorded'}
                                                    </p>
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
                                {disagreements.length === 0 && (
                                    <div className="text-center text-slate-400 py-8 bg-white dark:bg-slate-800 rounded-lg border border-dashed border-slate-200 dark:border-slate-700">
                                        <CheckCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                        No disagreements found between selected models.
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
