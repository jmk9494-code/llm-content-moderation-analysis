'use client';

import { useEffect, useState, useMemo, ChangeEvent } from 'react';
import {
    Brain, Tag, BarChart2, ShieldCheck, DollarSign, FileText, TrendingUp,
    Info, Database, Clock, Filter, X, Compass, Grip, BookOpen, Search
} from 'lucide-react';
import {
    ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
    Legend, PieChart, Pie, Cell, BarChart, Bar, LineChart, Line, ReferenceLine
} from 'recharts';
import { calculateFleissKappa } from '@/lib/statistics';
import Papa from 'papaparse';

// --- Types ---
type AuditRow = {
    model: string;
    verdict: string;
    prompt: string;
    response: string;
    cost: number;
    category: string;
    case_id: string;
    prompt_id?: string;
    timestamp?: string;
};

type Cluster = {
    cluster_id: number;
    size: number;
    keywords: string[];
    exemplar: string;
    models: Record<string, number>;
};

type BiasRow = {
    model: string;
    prompt_id: string;
    leaning: string;
    judge_reasoning: string;
};

const COLORS = ['#8b5cf6', '#10b981', '#94a3b8'];

export default function DeepDivePage() {
    const [activeTab, setActiveTab] = useState<'datalog' | 'reliability' | 'efficiency' | 'longitudinal' | 'clusters' | 'bias' | 'prompts'>('datalog');

    // Data Loading
    const [auditData, setAuditData] = useState<AuditRow[]>([]);
    const [clusters, setClusters] = useState<Cluster[]>([]);
    const [biasData, setBiasData] = useState<BiasRow[]>([]);
    const [reportContent, setReportContent] = useState<string>('');
    const [loading, setLoading] = useState(true);

    // Longitudinal Filters
    const [longitudinalModel, setLongitudinalModel] = useState<string>('all');
    const [longitudinalCategory, setLongitudinalCategory] = useState<string>('all');
    const [longitudinalKeyword, setLongitudinalKeyword] = useState<string>('');
    const [longitudinalModelSize, setLongitudinalModelSize] = useState<string>('all');

    useEffect(() => {
        const loadAll = async () => {
            try {
                // 1. Audit Data
                const r1 = await fetch('/api/audit');
                const j1 = await r1.json();
                if (j1.data) setAuditData(j1.data.filter((d: any) => d.verdict !== 'ERROR'));

                // 2. Clusters
                try {
                    const r2 = await fetch('/clusters.json');
                    if (r2.ok) setClusters(await r2.json());
                } catch (e) { console.warn("Clusters not found"); }

                // 3. Report
                try {
                    const r3 = await fetch('/api/report');
                    const j3 = await r3.json();
                    if (j3.content) setReportContent(j3.content);
                } catch (e) { console.warn("Report not found"); }

                // 4. Bias Log (CSV)
                try {
                    const r4 = await fetch('/bias_log.csv');
                    if (r4.ok) {
                        const csvText = await r4.text();
                        Papa.parse(csvText, {
                            header: true,
                            skipEmptyLines: true,
                            complete: (results: any) => {
                                setBiasData(results.data as BiasRow[]);
                            }
                        });
                    }
                } catch (e) { console.warn("Bias log not found"); }

            } catch (err) {
                console.error("Failed to load data", err);
            } finally {
                setLoading(false);
            }
        };
        loadAll();
    }, []);

    // --- Stats Calculations ---
    const stats = useMemo(() => {
        if (auditData.length === 0) return null;

        const models = Array.from(new Set(auditData.map((d: AuditRow) => d.model)));
        const prompts = Array.from(new Set(auditData.map((d: AuditRow) => d.case_id || d.prompt_id || d.prompt)));

        const reliability = calculateFleissKappa(auditData, models, prompts);

        // Calculate Agreement Distribution
        const distributionMap = new Map<string, number>();
        prompts.forEach(p => {
            const relevant = auditData.filter((d: AuditRow) => (d.case_id === p || d.prompt_id === p || d.prompt === p) && d.verdict !== 'ERROR');
            if (relevant.length < 2) return;

            const safeCount = relevant.filter((d: AuditRow) => d.verdict === 'ALLOWED' || d.verdict === 'safe' || d.verdict === 'safe_response').length;
            const percentage = (safeCount / relevant.length);

            let bucket = "";
            if (percentage === 0) bucket = "0% (All Unsafe)";
            else if (percentage === 1) bucket = "100% (All Safe)";
            else if (percentage < 0.5) bucket = "< 50% Safe";
            else if (percentage >= 0.5) bucket = "> 50% Safe";

            distributionMap.set(bucket, (distributionMap.get(bucket) || 0) + 1);
        });

        const distribution = Array.from(distributionMap.entries())
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => {
                const order = ["0% (All Unsafe)", "< 50% Safe", "> 50% Safe", "100% (All Safe)"];
                return order.indexOf(a.name) - order.indexOf(b.name);
            });

        return { reliability, models, prompts, distribution };
    }, [auditData]);

    const efficiencyData = useMemo(() => {
        if (auditData.length === 0) return [];
        const models = Array.from(new Set(auditData.map((d: AuditRow) => d.model)));

        return models.map(m => {
            const rows = auditData.filter((d: AuditRow) => d.model === m);
            const total = rows.length;
            const refused = rows.filter((d: AuditRow) => ['REFUSAL', 'REMOVED', 'unsafe'].includes(d.verdict)).length;
            const cost = rows.reduce((acc: number, curr: AuditRow) => acc + (curr.cost || 0), 0);

            return {
                name: m.split('/').pop(),
                fullName: m,
                refusalRate: (refused / total) * 100,
                costPer1k: (cost / total) * 1000,
                total
            };
        }).filter(m => m.total > 0);
    }, [auditData]);

    // Filter options for longitudinal study
    const longitudinalFilterOptions = useMemo(() => {
        // Extract model sizes from model names (e.g., 'gpt-4' -> '4', 'claude-3-opus' -> '3')
        const extractSize = (model: string): string => {
            const match = model.match(/-(\d+\.?\d*)(b|B)?/);
            if (match) return match[1] + (match[2] || '');
            if (model.includes('mini')) return 'mini';
            if (model.includes('small')) return 'small';
            if (model.includes('large')) return 'large';
            return 'unknown';
        };

        const modelSizes = Array.from(new Set(auditData.map((d: AuditRow) => extractSize(d.model)))).filter(s => s !== 'unknown').sort();

        return {
            models: Array.from(new Set(auditData.map((d: AuditRow) => d.model))).sort(),
            categories: Array.from(new Set(auditData.map((d: AuditRow) => d.category))).filter(Boolean).sort(),
            modelSizes
        };
    }, [auditData]);

    // Helper to extract model size
    const getModelSize = (model: string): string => {
        const match = model.match(/-(\d+\.?\d*)(b|B)?/);
        if (match) return match[1] + (match[2] || '');
        if (model.includes('mini')) return 'mini';
        if (model.includes('small')) return 'small';
        if (model.includes('large')) return 'large';
        return 'unknown';
    };

    // Longitudinal Data (by date) - with filters
    const longitudinalData = useMemo(() => {
        if (auditData.length === 0) return [];

        // Apply filters
        const filtered = auditData.filter((d: AuditRow) => {
            if (longitudinalModel !== 'all' && d.model !== longitudinalModel) return false;
            if (longitudinalCategory !== 'all' && d.category !== longitudinalCategory) return false;
            if (longitudinalModelSize !== 'all' && getModelSize(d.model) !== longitudinalModelSize) return false;
            if (longitudinalKeyword && !d.prompt?.toLowerCase().includes(longitudinalKeyword.toLowerCase())) return false;
            return true;
        });

        const dateMap = new Map<string, { date: string; total: number; refusals: number; prompts: AuditRow[] }>();

        filtered.forEach((d: AuditRow) => {
            const date = d.timestamp?.split('T')[0] || 'Unknown';
            if (!dateMap.has(date)) {
                dateMap.set(date, { date, total: 0, refusals: 0, prompts: [] });
            }
            const entry = dateMap.get(date)!;
            entry.total++;
            entry.prompts.push(d);
            if (['REFUSAL', 'REMOVED', 'unsafe'].includes(d.verdict)) {
                entry.refusals++;
            }
        });

        return Array.from(dateMap.values())
            .map((d: any) => ({ ...d, refusalRate: (d.refusals / d.total) * 100 }))
            .sort((a, b) => a.date.localeCompare(b.date));
    }, [auditData, longitudinalModel, longitudinalCategory]);

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center text-slate-500 bg-slate-50">
            <div className="flex flex-col items-center gap-2">
                <Brain className="h-8 w-8 animate-pulse text-indigo-500" />
                <span>Loading analysis data...</span>
            </div>
        </div>
    );

    return (
        <main className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans text-slate-900">
            <div className="max-w-7xl mx-auto space-y-6">

                {/* Header */}
                <header className="mb-6">
                    <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-3">
                        🔬 Deep Dive Analysis
                    </h1>
                    <p className="text-slate-500 text-sm md:text-base mt-1">
                        Advanced metrics, efficiency benchmarking, and automated research insights.
                    </p>
                </header>

                {/* Tabs */}
                <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-1">
                    <TabButton active={activeTab === 'datalog'} onClick={() => setActiveTab('datalog')} icon={<Database className="w-4 h-4" />}>
                        Data Log
                    </TabButton>
                    <TabButton active={activeTab === 'bias'} onClick={() => setActiveTab('bias')} icon={<Compass className="w-4 h-4" />}>
                        Bias Compass
                    </TabButton>
                    <TabButton active={activeTab === 'reliability'} onClick={() => setActiveTab('reliability')} icon={<ShieldCheck className="w-4 h-4" />}>
                        Reliability & Consensus
                    </TabButton>
                    <TabButton active={activeTab === 'efficiency'} onClick={() => setActiveTab('efficiency')} icon={<DollarSign className="w-4 h-4" />}>
                        Efficiency & Cost
                    </TabButton>
                    <TabButton active={activeTab === 'longitudinal'} onClick={() => setActiveTab('longitudinal')} icon={<TrendingUp className="w-4 h-4" />}>
                        Longitudinal Study
                    </TabButton>
                    <TabButton active={activeTab === 'clusters'} onClick={() => setActiveTab('clusters')} icon={<Tag className="w-4 h-4" />}>
                        Semantic Clusters
                    </TabButton>
                    <TabButton active={activeTab === 'prompts'} onClick={() => setActiveTab('prompts')} icon={<BookOpen className="w-4 h-4" />}>
                        Prompt Library
                    </TabButton>
                </div>

                {/* Content */}
                <div className="min-h-[60vh]">
                    {activeTab === 'datalog' && (
                        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
                            <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
                                <h3 className="font-bold text-blue-800 flex items-center gap-2 mb-2">
                                    <Info className="w-4 h-4" /> What is the Data Log?
                                </h3>
                                <p className="text-sm text-blue-700">
                                    The Data Log displays the raw AI-generated analysis report. It summarizes key findings from the moderation audit,
                                    including model rankings, statistical insights, and recommendations. This report is auto-generated by running
                                    the Python analysis script on the audit data.
                                </p>
                            </div>
                            {reportContent ? (
                                <article className="prose prose-slate max-w-none">
                                    {reportContent.split('\n').map((line, i) => {
                                        if (line.startsWith('# ')) return <h1 key={i} className="text-3xl font-bold mt-6 mb-4">{line.replace('# ', '')}</h1>;
                                        if (line.startsWith('## ')) return <h2 key={i} className="text-2xl font-bold mt-6 mb-3 flex items-center gap-2">{line.includes('Leaderboard') ? '🏆' : line.includes('Statistical') ? '📊' : ''} {line.replace('## ', '')}</h2>;
                                        if (line.startsWith('### ')) return <h3 key={i} className="text-xl font-bold mt-4 mb-2">{line.replace('### ', '')}</h3>;
                                        if (line.startsWith('- ')) return <li key={i} className="ml-4 list-disc my-1">{line.replace('- ', '')}</li>;
                                        return <p key={i} className="my-2 whitespace-pre-wrap">{line}</p>;
                                    })}
                                </article>
                            ) : (
                                <div className="text-center py-12 text-slate-400">
                                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                    No generated report found. Run the Python analysis script first.
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'bias' && <BiasCompassView biasData={biasData} />}

                    {activeTab === 'reliability' && stats && (
                        <div className="space-y-6">
                            <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                                <h3 className="font-bold text-blue-800 flex items-center gap-2 mb-2">
                                    <Info className="w-4 h-4" /> What is Reliability & Consensus?
                                </h3>
                                <p className="text-sm text-blue-700">
                                    This tab measures how consistently different AI models agree on safety verdicts.
                                    <strong> Fleiss' Kappa</strong> is a statistical measure of inter-rater reliability—higher scores mean models agree more often.
                                    The <strong>Agreement Distribution</strong> shows what percentage of prompts had unanimous vs. split decisions across models.
                                </p>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                                    <h3 className="text-lg font-bold mb-2">Fleiss' Kappa Score</h3>
                                    <div className="flex items-end gap-4">
                                        <span className="text-5xl font-black text-indigo-600">
                                            {stats.reliability.score.toFixed(3)}
                                        </span>
                                        <span className="text-lg text-slate-500 mb-2 font-medium bg-slate-100 px-3 py-1 rounded-full">
                                            {stats.reliability.interpretation}
                                        </span>
                                    </div>
                                    <p className="text-sm text-slate-500 mt-4">
                                        Measures how consistently models agree on safety verdicts over {stats.prompts.length} prompts.
                                        Scores above 0.4 indicate fair agreement; above 0.6 is moderate.
                                    </p>
                                </div>
                                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                                    <h3 className="text-lg font-bold mb-4">Agreement Distribution</h3>
                                    {stats.distribution && stats.distribution.length > 0 ? (
                                        <div className="h-48 text-xs">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart data={stats.distribution}>
                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                                                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                                                    <YAxis hide />
                                                    <RechartsTooltip cursor={{ fill: 'transparent' }} contentStyle={{ backgroundColor: '#fff', borderRadius: '8px' }} />
                                                    <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} name="Prompts" />
                                                </BarChart>
                                            </ResponsiveContainer>
                                            <div className="text-center mt-2 text-slate-400">
                                                Based on {stats.prompts.length} prompts
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-center h-32 bg-slate-50 rounded-lg text-slate-400 text-sm">
                                            Not enough data for distribution
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'efficiency' && (
                        <div className="space-y-6">
                            <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-100">
                                <h3 className="font-bold text-indigo-800 flex items-center gap-2 mb-2">
                                    <Info className="w-4 h-4" /> What is Efficiency & Cost?
                                </h3>
                                <p className="text-sm text-indigo-700">
                                    This tab visualizes the trade-off between <strong>cost</strong> and <strong>safety</strong> across models.
                                    The X-axis shows the cost per 1,000 prompts (in USD), while the Y-axis shows the refusal rate (%).
                                    It also includes a <strong>Model Registry</strong> listing current pricing and capabilities.
                                </p>
                            </div>

                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 h-[500px]">
                                <h3 className="text-lg font-bold mb-4 flex items-center justify-between">
                                    <span>Cost vs. Safety Trade-off</span>
                                    <span className="text-xs font-normal text-slate-500 bg-slate-100 px-2 py-1 rounded">X: Cost ($/1k) • Y: Refusal Rate (%)</span>
                                </h3>
                                <ResponsiveContainer width="100%" height="90%">
                                    <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                                        <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                                        <XAxis
                                            type="number"
                                            dataKey="costPer1k"
                                            name="Cost"
                                            unit="$"
                                            label={{ value: 'Cost per 1k Prompts', position: 'bottom', offset: 0 }}
                                        />
                                        <YAxis
                                            type="number"
                                            dataKey="refusalRate"
                                            name="Refusal Rate"
                                            unit="%"
                                            label={{ value: 'Refusal Rate', angle: -90, position: 'insideLeft' }}
                                        />
                                        <RechartsTooltip cursor={{ strokeDasharray: '3 3' }} content={<CustomTooltip />} />
                                        <Scatter name="Models" data={efficiencyData} fill="#8884d8">
                                            {efficiencyData.map((entry: any, index: number) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Scatter>
                                    </ScatterChart>
                                </ResponsiveContainer>
                            </div>

                            {/* Model Registry Implementation */}
                            <ModelRegistryTable />
                        </div>
                    )}

                    {activeTab === 'longitudinal' && (
                        <div className="space-y-6">
                            <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                                <h3 className="font-bold text-blue-800 flex items-center gap-2 mb-2">
                                    <Info className="w-4 h-4" /> What is the Longitudinal Study?
                                </h3>
                                <p className="text-sm text-blue-700">
                                    This tab tracks <strong>model behavior over time</strong>. It shows how the overall refusal rate
                                    changes across different audit dates. This helps identify trends—are models becoming more or less
                                    restrictive? Are there spikes in refusals on certain days? Use this to monitor drift in AI safety policies.
                                </p>
                            </div>

                            {/* Filters */}
                            <div className="flex flex-wrap gap-4 p-4 bg-white rounded-xl border border-slate-200">
                                <div className="flex items-center gap-2">
                                    <Filter className="h-4 w-4 text-slate-400" />
                                    <span className="text-sm font-medium text-slate-500">Filters:</span>
                                </div>
                                <div className="flex-1 flex flex-wrap gap-4">
                                    <div className="min-w-[200px]">
                                        <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Model</label>
                                        <select
                                            value={longitudinalModel}
                                            onChange={(e: ChangeEvent<HTMLSelectElement>) => setLongitudinalModel(e.target.value)}
                                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                                        >
                                            <option value="all">All Models</option>
                                            {longitudinalFilterOptions.models.map(m => <option key={m} value={m}>{m.split('/')[1] || m}</option>)}
                                        </select>
                                    </div>
                                    <div className="min-w-[200px]">
                                        <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Category</label>
                                        <select
                                            value={longitudinalCategory}
                                            onChange={(e: ChangeEvent<HTMLSelectElement>) => setLongitudinalCategory(e.target.value)}
                                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                                        >
                                            <option value="all">All Categories</option>
                                            {longitudinalFilterOptions.categories.map(c => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                    </div>
                                    {(longitudinalModel !== 'all' || longitudinalCategory !== 'all') && (
                                        <button
                                            onClick={() => { setLongitudinalModel('all'); setLongitudinalCategory('all'); }}
                                            className="flex items-center gap-1 px-3 py-2 mt-5 text-sm text-slate-500 hover:text-slate-700 border border-slate-200 rounded-lg"
                                        >
                                            <X className="h-4 w-4" /> Clear
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 h-[500px]">
                                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                                    <Clock className="w-5 h-5 text-indigo-500" /> Refusal Rate Over Time
                                    {longitudinalModel !== 'all' && <span className="text-sm font-normal text-slate-400">({longitudinalModel.split('/')[1]})</span>}
                                    {longitudinalCategory !== 'all' && <span className="text-sm font-normal text-slate-400">({longitudinalCategory})</span>}
                                </h3>
                                {longitudinalData.length > 1 ? (
                                    <ResponsiveContainer width="100%" height="90%">
                                        <LineChart data={longitudinalData} margin={{ top: 20, right: 30, bottom: 20, left: 20 }}>
                                            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                                            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                                            <YAxis unit="%" domain={[0, 100]} />
                                            <RechartsTooltip
                                                contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                                                formatter={(value: any) => [`${value.toFixed(1)}%`, 'Refusal Rate']}
                                            />
                                            <Legend />
                                            <Line
                                                type="monotone"
                                                dataKey="refusalRate"
                                                stroke="#6366f1"
                                                strokeWidth={3}
                                                dot={{ fill: '#6366f1', strokeWidth: 2, r: 4 }}
                                                activeDot={{ r: 6, fill: '#4f46e5' }}
                                                name="Refusal Rate"
                                            />
                                        </LineChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-80 text-slate-400">
                                        <TrendingUp className="h-12 w-12 mb-4 opacity-50" />
                                        <p>Need data from multiple dates to show longitudinal trends.</p>
                                        <p className="text-sm">Run audits on different days to see changes over time.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}


                    {activeTab === 'clusters' && <SemanticClustersView clusters={clusters} />}

                    {activeTab === 'prompts' && <PromptLibraryView />}

                </div>
            </div>
        </main>
    );
}

// --- Sub-components ---

// Model Registry Component
function ModelRegistryTable() {
    const [models, setModels] = useState<any[]>([]);

    useEffect(() => {
        fetch('/models.json').then(r => r.json()).then(setModels).catch(() => { });
    }, []);

    return (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <h3 className="text-lg font-bold mb-4">🤖 Model Registry</h3>
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-slate-200 text-slate-500">
                            <th className="text-left py-3 px-4 font-semibold">Model</th>
                            <th className="text-left py-3 px-4 font-semibold">Provider</th>
                            <th className="text-right py-3 px-4 font-semibold">Cost ($/M in)</th>
                            <th className="text-right py-3 px-4 font-semibold">Cost ($/M out)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {models.map((model: any) => (
                            <tr key={model.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                                <td className="py-3 px-4 font-medium text-slate-900">{model.name}</td>
                                <td className="py-3 px-4 text-slate-600">{model.provider}</td>
                                <td className="py-3 px-4 text-right font-mono text-slate-600">${model.cost_per_m_in.toFixed(2)}</td>
                                <td className="py-3 px-4 text-right font-mono text-slate-600">${model.cost_per_m_out.toFixed(2)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function TabButton({ active, onClick, children, icon }: any) {
    return (
        <button
            onClick={onClick}
            className={`
                flex items-center gap-2 px-4 py-3 text-sm font-medium rounded-t-lg border-b-2 transition-all
                ${active
                    ? 'border-indigo-500 text-indigo-600 bg-indigo-50/50'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'}
            `}
        >
            {icon}
            {children}
        </button>
    )
}

function CustomTooltip({ active, payload }: any) {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        return (
            <div className="bg-white p-3 border border-slate-200 shadow-lg rounded-lg text-sm">
                <p className="font-bold mb-1">{data.name}</p>
                <div className="space-y-1 text-xs text-slate-500">
                    <p>Refusal Rate: <span className="font-mono text-slate-700">{data.refusalRate.toFixed(1)}%</span></p>
                    <p>Cost/1k: <span className="font-mono text-slate-700">${data.costPer1k.toFixed(4)}</span></p>
                </div>
            </div>
        );
    }
    return null;
}

function SemanticClustersView({ clusters }: { clusters: Cluster[] }) {
    if (clusters.length === 0) return (
        <div className="space-y-6">
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                <h3 className="font-bold text-blue-800 flex items-center gap-2 mb-2">
                    <Info className="w-4 h-4" /> What are Semantic Clusters?
                </h3>
                <p className="text-sm text-blue-700">
                    Semantic clustering groups similar refusal responses together based on their meaning.
                    This helps identify <strong>common themes</strong> in how models refuse requests—for example,
                    "violence-related refusals" or "medical misinformation refusals". Each cluster shows keywords
                    and an example response to help you understand the pattern.
                </p>
            </div>
            <div className="p-8 text-center text-slate-500">No semantic clustering data available.</div>
        </div>
    );

    const COLORS = ['#8b5cf6', '#10b981', '#94a3b8'];

    const pieData = clusters.map((c, i) => ({
        name: `Cluster ${i + 1}`,
        value: c.size,
        keywords: c.keywords.join(', ')
    }));

    return (
        <div className="space-y-6">
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                <h3 className="font-bold text-blue-800 flex items-center gap-2 mb-2">
                    <Info className="w-4 h-4" /> What are Semantic Clusters?
                </h3>
                <p className="text-sm text-blue-700">
                    Semantic clustering groups similar refusal responses together based on their meaning.
                    This helps identify <strong>common themes</strong> in how models refuse requests—for example,
                    "violence-related refusals" or "medical misinformation refusals". Each cluster shows keywords
                    and an example response to help you understand the pattern.
                </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 col-span-1">
                    <h2 className="text-lg font-bold mb-4">Refusal Themes</h2>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={pieData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                                    {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                </Pie>
                                <RechartsTooltip />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
                <div className="col-span-2 space-y-4">
                    {clusters.map((c, idx) => (
                        <div key={idx} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex gap-4">
                            <div className="h-full w-2 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></div>
                            <div className="flex-1">
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="font-bold text-lg">Cluster {idx + 1} ({c.size} cases)</h3>
                                    <div className="flex flex-wrap gap-1">
                                        {c.keywords.map(k => (
                                            <span key={k} className="px-2 py-1 bg-slate-100 text-slate-600 text-xs rounded-full font-mono flex items-center gap-1">
                                                <Tag className="h-3 w-3" /> {k}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                                <div className="bg-slate-50 p-3 rounded-lg text-sm text-slate-600 font-mono mb-3">"{c.exemplar}"</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

function BiasCompassView({ biasData }: { biasData: BiasRow[] }) {
    if (biasData.length === 0) return (
        <div className="p-12 text-center text-slate-500">
            <Compass className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No bias analysis data found.</p>
            <p className="text-sm">Run 'src/analyze_bias.py' to generate this data.</p>
        </div>
    );

    // Prepare scatter data
    // Map leanings to coordinates
    const leaningCoords: Record<string, { x: number, y: number }> = {
        'Left-Libertarian': { x: -0.7, y: -0.5 },
        'Left-Authoritarian': { x: -0.7, y: 0.5 },
        'Right-Libertarian': { x: 0.7, y: -0.5 },
        'Right-Authoritarian': { x: 0.7, y: 0.5 },
        'Neutral-Safety': { x: 0, y: 0 }
    };

    const scatterData = biasData.map((row, i) => {
        const base = leaningCoords[row.leaning] || { x: 0, y: 0 };
        // Add jitter
        const jitterX = (Math.random() - 0.5) * 0.4;
        const jitterY = (Math.random() - 0.5) * 0.4;
        return {
            ...row,
            x: base.x + jitterX,
            y: base.y + jitterY,
            z: 1 // for scatter size
        };
    });

    const modelCounts = biasData.reduce((acc: Record<string, number>, curr: BiasRow) => {
        acc[curr.model] = (acc[curr.model] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    return (
        <div className="space-y-8">
            <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-100">
                <h3 className="font-bold text-indigo-800 flex items-center gap-2 mb-2">
                    <Compass className="w-4 h-4" /> What is the Bias Compass?
                </h3>
                <p className="text-sm text-indigo-700">
                    This visualization maps the <strong>reasoning behind refusals</strong> to a political/philosophical compass.
                    Instead of just saying "Refused", we analyze <em>why</em>. Is the model protecting marginalized groups (Left-Libertarian)?
                    Upholding traditional values (Right-Authoritarian)? Or just following generic safety rules (Neutral)?
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Compass Chart */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 h-[500px] relative">
                    <h3 className="text-lg font-bold mb-2">🧭 Safety Alignment Chart</h3>
                    <ResponsiveContainer width="100%" height="90%">
                        <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                            <CartesianGrid stroke="#94a3b8" />
                            <XAxis type="number" dataKey="x" domain={[-1, 1]} hide />
                            <YAxis type="number" dataKey="y" domain={[-1, 1]} hide />
                            <RechartsTooltip
                                content={({ active, payload }: any) => {
                                    if (active && payload && payload.length) {
                                        const d = payload[0].payload;
                                        return (
                                            <div className="bg-white p-3 border border-slate-200 shadow-lg rounded-lg text-sm max-w-xs z-50">
                                                <p className="font-bold text-indigo-600 mb-1">{d.model.split('/').pop()}</p>
                                                <p className="font-semibold text-slate-700 mb-1">{d.leaning}</p>
                                                <p className="text-xs text-slate-500 italic">"{d.judge_reasoning}"</p>
                                            </div>
                                        );
                                    }
                                    return null;
                                }}
                            />
                            <ReferenceLine x={0} stroke="#64748b" strokeWidth={2} label={{ value: "Authoritarian (Top) / Libertarian (Bottom)", position: 'insideTop', fill: '#64748b', fontSize: 12 }} />
                            <ReferenceLine y={0} stroke="#64748b" strokeWidth={2} label={{ value: "Left (Left) / Right (Right)", position: 'insideRight', fill: '#64748b', fontSize: 12, angle: -90 }} />

                            {/* Quadrant Labels */}
                            <ReferenceLine y={0.8} stroke="none" label={{ value: "AUTH-LEFT", position: 'insideLeft', fill: '#94a3b8', fontSize: 20, fontWeight: 'bold', opacity: 0.3 }} />
                            <ReferenceLine y={0.8} stroke="none" label={{ value: "AUTH-RIGHT", position: 'insideRight', fill: '#94a3b8', fontSize: 20, fontWeight: 'bold', opacity: 0.3 }} />
                            <ReferenceLine y={-0.8} stroke="none" label={{ value: "LIB-LEFT", position: 'insideLeft', fill: '#94a3b8', fontSize: 20, fontWeight: 'bold', opacity: 0.3 }} />
                            <ReferenceLine y={-0.8} stroke="none" label={{ value: "LIB-RIGHT", position: 'insideRight', fill: '#94a3b8', fontSize: 20, fontWeight: 'bold', opacity: 0.3 }} />

                            <Scatter name="Biases" data={scatterData} fill="#8884d8">
                                {scatterData.map((entry: any, index: number) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[Math.abs(entry.model.length) % COLORS.length]} />
                                ))}
                            </Scatter>
                        </ScatterChart>
                    </ResponsiveContainer>
                </div>

                {/* Legend & Stats */}
                <div className="space-y-6">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                        <h3 className="text-lg font-bold mb-4">Refusal Breakdown by Leaning</h3>
                        <div className="space-y-4">
                            {Object.entries(leaningCoords).map(([key, _]) => {
                                const count = biasData.filter(d => d.leaning === key).length;
                                if (count === 0) return null;
                                const pct = (count / biasData.length) * 100;
                                return (
                                    <div key={key}>
                                        <div className="flex justify-between text-sm mb-1">
                                            <span className="font-medium text-slate-700">{key}</span>
                                            <span className="text-slate-500">{count} ({pct.toFixed(1)}%)</span>
                                        </div>
                                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                            <div className="h-full bg-indigo-500" style={{ width: `${pct}%` }}></div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                        <h3 className="text-lg font-bold mb-4">Analyzed Models</h3>
                        <div className="flex flex-wrap gap-2">
                            {Object.keys(modelCounts).map(m => (
                                <span key={m} className="px-3 py-1 bg-slate-100 rounded-full text-sm text-slate-600">
                                    {m.split('/').pop()} <span className="text-slate-400 text-xs">({modelCounts[m]})</span>
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
            </div >
        </div >
    );
}



type Prompt = {
    id: string;
    text: string;
    category: string;
    source?: string;
};

function PromptLibraryView() {
    const [prompts, setPrompts] = useState<Prompt[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterCategory, setFilterCategory] = useState('all');
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const ITEMS_PER_PAGE = 50;

    useEffect(() => {
        fetch('/api/prompts')
            .then(r => r.json())
            .then((data: { data: Prompt[] }) => {
                if (data.data) setPrompts(data.data);
                setLoading(false);
            })
            .catch(err => {
                console.error("Failed to load prompts", err);
                setLoading(false);
            });
    }, []);

    const categories = useMemo(() => Array.from(new Set(prompts.map((p: Prompt) => p.category))).sort(), [prompts]);

    const filtered = useMemo(() => {
        return prompts.filter((p: Prompt) => {
            if (filterCategory !== 'all' && p.category !== filterCategory) return false;
            if (search && !p.text.toLowerCase().includes(search.toLowerCase()) && !p.id.toLowerCase().includes(search.toLowerCase())) return false;
            return true;
        });
    }, [prompts, filterCategory, search]);

    const paginated = filtered.slice(0, page * ITEMS_PER_PAGE);

    if (loading) return <div className="p-12 text-center text-slate-500">Loading prompt library...</div>;

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                    <div className="text-slate-500 text-sm font-medium uppercase mb-1">Total Prompts</div>
                    <div className="text-3xl font-black text-slate-900">{prompts.length.toLocaleString()}</div>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                    <div className="text-slate-500 text-sm font-medium uppercase mb-1">Categories</div>
                    <div className="text-3xl font-black text-slate-900">{categories.length}</div>
                </div>

            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <div className="flex flex-col md:flex-row gap-4 mb-6">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search prompts by text or ID..."
                            value={search}
                            onChange={(e: ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>
                    <select
                        value={filterCategory}
                        onChange={(e: ChangeEvent<HTMLSelectElement>) => setFilterCategory(e.target.value)}
                        className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                        <option value="all">All Categories</option>
                        {categories.map((c: string) => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>

                <div className="space-y-2">
                    <div className="grid grid-cols-12 gap-4 px-4 py-2 text-xs font-bold text-slate-500 uppercase border-b border-slate-100">
                        <div className="col-span-2">ID</div>
                        <div className="col-span-2">Category</div>
                        <div className="col-span-8">Prompt Text</div>
                    </div>
                    {paginated.map((p: Prompt) => (
                        <div key={p.id} className="grid grid-cols-12 gap-4 px-4 py-3 text-sm border-b border-slate-50 hover:bg-slate-50 items-start">
                            <div className="col-span-2 font-mono text-xs text-slate-500 truncate" title={p.id}>{p.id}</div>
                            <div className="col-span-2">
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-50 text-indigo-700">
                                    {p.category}
                                </span>
                            </div>
                            <div className="col-span-8 text-slate-700">{p.text}</div>
                        </div>
                    ))}
                </div>

                {paginated.length < filtered.length && (
                    <div className="mt-6 text-center">
                        <button
                            onClick={() => setPage(p => p + 1)}
                            className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
                        >
                            Load More ({filtered.length - paginated.length} remaining)
                        </button>
                    </div>
                )}

                {filtered.length === 0 && (
                    <div className="text-center py-12 text-slate-400">
                        No prompts found matching your criteria.
                    </div>
                )}
            </div>
        </div>
    );
}
