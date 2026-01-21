'use client';

import { useEffect, useState, useMemo } from 'react';
import {
    Brain, Tag, BarChart2, ShieldCheck, DollarSign, FlaskConical, FileText,
    Calculator, Info
} from 'lucide-react';
import {
    ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
    ZAxis, Legend, PieChart, Pie, Cell
} from 'recharts';
import { calculateFleissKappa, calculatePowerAnalysis, calculateCohensH } from '@/lib/statistics';
import HeatmapTable from '@/components/HeatmapTable';

// --- Types ---
type AuditRow = {
    model: string;
    verdict: string;
    prompt: string;
    response: string;
    cost: number;
    category: string;
    case_id: string;
    prompt_id?: string; // fallback
};

type Cluster = {
    cluster_id: number;
    size: number;
    keywords: string[];
    exemplar: string;
    models: Record<string, number>;
};

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function DeepDivePage() {
    const [activeTab, setActiveTab] = useState<'report' | 'reliability' | 'efficiency' | 'experiment' | 'clusters'>('report');

    // Data Loading
    const [auditData, setAuditData] = useState<AuditRow[]>([]);
    const [clusters, setClusters] = useState<Cluster[]>([]);
    const [reportContent, setReportContent] = useState<string>('');
    const [loading, setLoading] = useState(true);

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

        const models = Array.from(new Set(auditData.map(d => d.model)));
        // Group by prompt (case_id)
        // We need a stable ID. case_id should be it.
        const prompts = Array.from(new Set(auditData.map(d => d.case_id || d.prompt_id || d.prompt)));

        const reliability = calculateFleissKappa(auditData, models, prompts);

        return { reliability, models, prompts };
    }, [auditData]);

    const efficiencyData = useMemo(() => {
        if (auditData.length === 0) return [];
        const models = Array.from(new Set(auditData.map(d => d.model)));

        return models.map(m => {
            const rows = auditData.filter(d => d.model === m);
            const total = rows.length;
            const refused = rows.filter(d => ['REFUSAL', 'REMOVED', 'unsafe'].includes(d.verdict)).length;
            const cost = rows.reduce((acc, curr) => acc + (curr.cost || 0), 0);

            return {
                name: m.split('/').pop(),
                fullName: m,
                refusalRate: (refused / total) * 100,
                costPer1k: (cost / total) * 1000,
                total
            };
        });
    }, [auditData]);

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center text-slate-500 bg-slate-50 dark:bg-slate-900">
            <div className="flex flex-col items-center gap-2">
                <Brain className="h-8 w-8 animate-pulse text-indigo-500" />
                <span>Loading analysis data...</span>
            </div>
        </div>
    );

    return (
        <main className="min-h-screen bg-slate-50 dark:bg-slate-900 p-4 md:p-8 font-sans  text-slate-900 dark:text-slate-100">
            <div className="max-w-7xl mx-auto space-y-6">

                {/* Header */}
                <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-extrabold flex items-center gap-3">
                            <Brain className="h-8 w-8 text-indigo-600" />
                            Deep Dive Analysis
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 mt-1">
                            Advanced metrics, efficiency benchmarking, and automated research insights.
                        </p>
                    </div>
                </header>

                {/* Tabs */}
                <div className="flex flex-wrap gap-2 border-b border-slate-200 dark:border-slate-700 pb-1">
                    <TabButton active={activeTab === 'report'} onClick={() => setActiveTab('report')} icon={<FileText className="w-4 h-4" />}>
                        AI Analyst Report
                    </TabButton>
                    <TabButton active={activeTab === 'reliability'} onClick={() => setActiveTab('reliability')} icon={<ShieldCheck className="w-4 h-4" />}>
                        Reliability & Consensus
                    </TabButton>
                    <TabButton active={activeTab === 'efficiency'} onClick={() => setActiveTab('efficiency')} icon={<DollarSign className="w-4 h-4" />}>
                        Efficiency & Cost
                    </TabButton>
                    <TabButton active={activeTab === 'experiment'} onClick={() => setActiveTab('experiment')} icon={<FlaskConical className="w-4 h-4" />}>
                        Experiment Planner
                    </TabButton>
                    <TabButton active={activeTab === 'clusters'} onClick={() => setActiveTab('clusters')} icon={<Tag className="w-4 h-4" />}>
                        Semantic Clusters
                    </TabButton>
                </div>

                {/* Content */}
                <div className="min-h-[60vh]">
                    {activeTab === 'report' && (
                        <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
                            {reportContent ? (
                                <article className="prose prose-slate dark:prose-invert max-w-none">
                                    {/* Simple Markdown Rendering */}
                                    {reportContent.split('\n').map((line, i) => {
                                        if (line.startsWith('# ')) return <h1 key={i} className="text-3xl font-bold mt-6 mb-4">{line.replace('# ', '')}</h1>;
                                        if (line.startsWith('## ')) return <h2 key={i} className="text-2xl font-bold mt-6 mb-3 flex items-center gap-2">{line.includes('Leaderboard') ? '🏆' : line.includes('Statistical') ? '📊' : ''} {line.replace('## ', '')}</h2>;
                                        if (line.startsWith('### ')) return <h3 key={i} className="text-xl font-bold mt-4 mb-2">{line.replace('### ', '')}</h3>;
                                        if (line.startsWith('- ')) return <li key={i} className="ml-4 list-disc my-1">{line.replace('- ', '').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').split('<strong>').map((part, idx) => idx % 2 === 1 ? <strong key={idx}>{part}</strong> : part)}</li>;
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

                    {activeTab === 'reliability' && stats && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
                                    <h3 className="text-lg font-bold mb-2">Fleiss' Kappa Score</h3>
                                    <div className="flex items-end gap-4">
                                        <span className="text-5xl font-black text-indigo-600 dark:text-indigo-400">
                                            {stats.reliability.score.toFixed(3)}
                                        </span>
                                        <span className="text-lg text-slate-500 mb-2 font-medium bg-slate-100 dark:bg-slate-700 px-3 py-1 rounded-full">
                                            {stats.reliability.interpretation}
                                        </span>
                                    </div>
                                    <p className="text-sm text-slate-500 mt-4">
                                        Measures how consistently models agree on safety verdicts over {stats.prompts.length} prompts.
                                        Scores above 0.4 indicate fair agreement; above 0.6 is moderate.
                                    </p>
                                </div>
                                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
                                    <h3 className="text-lg font-bold mb-4">Agreement Distribution</h3>
                                    {/* Placeholder for distribution visualization */}
                                    <div className="flex items-center justify-center h-32 bg-slate-50 dark:bg-slate-700/50 rounded-lg text-slate-400 text-sm">
                                        Consensus Matrix Visualization Coming Soon
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'efficiency' && (
                        <div className="space-y-6">
                            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 h-[500px]">
                                <h3 className="text-lg font-bold mb-4 flex items-center justify-between">
                                    <span>Cost vs. Safety Trade-off</span>
                                    <span className="text-xs font-normal text-slate-500 bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded">X: Cost ($/1k) • Y: Refusal Rate (%)</span>
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
                                            {efficiencyData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Scatter>
                                    </ScatterChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    )}

                    {activeTab === 'experiment' && <ExperimentCalculator />}

                    {activeTab === 'clusters' && <SemanticClustersView clusters={clusters} />}

                </div>
            </div>
        </main>
    );
}

// --- Sub-components ---

function TabButton({ active, onClick, children, icon }: any) {
    return (
        <button
            onClick={onClick}
            className={`
                flex items-center gap-2 px-4 py-3 text-sm font-medium rounded-t-lg border-b-2 transition-all
                ${active
                    ? 'border-indigo-500 text-indigo-600 bg-indigo-50/50 dark:bg-indigo-900/20 dark:text-indigo-400'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800'}
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
            <div className="bg-white dark:bg-slate-800 p-3 border border-slate-200 dark:border-slate-700 shadow-lg rounded-lg text-sm">
                <p className="font-bold mb-1">{data.name}</p>
                <div className="space-y-1 text-xs text-slate-500 dark:text-slate-400">
                    <p>Refusal Rate: <span className="font-mono text-slate-700 dark:text-slate-200">{data.refusalRate.toFixed(1)}%</span></p>
                    <p>Cost/1k: <span className="font-mono text-slate-700 dark:text-slate-200">${data.costPer1k.toFixed(4)}</span></p>
                </div>
            </div>
        );
    }
    return null;
}

function ExperimentCalculator() {
    const [h, setH] = useState(0.2);
    const [power, setPower] = useState(0.8);
    const [n, setN] = useState(0);

    useEffect(() => {
        setN(calculatePowerAnalysis(h, power));
    }, [h, power]);

    return (
        <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 max-w-2xl mx-auto">
            <h3 className="text-xl font-bold mb-2 flex items-center gap-2">
                <Calculator className="h-5 w-5 text-indigo-500" />
                Sample Size Calculator
            </h3>
            <p className="text-slate-500 text-sm mb-6">
                Determine how many prompts you need to run to detect a statistically significant difference between models.
            </p>

            <div className="space-y-6">
                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Expected Effect Size (Cohen's h)
                    </label>
                    <input
                        type="range" min="0.1" max="1.0" step="0.05"
                        value={h} onChange={e => setH(parseFloat(e.target.value))}
                        className="w-full mb-2"
                    />
                    <div className="flex justifying-between text-xs text-slate-400">
                        <span>Small (0.2)</span>
                        <span className="mx-auto font-mono text-indigo-600 font-bold">{h}</span>
                        <span>Large (0.8)</span>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Desired Statistical Power
                    </label>
                    <div className="flex gap-4">
                        {[0.8, 0.9, 0.95, 0.99].map(p => (
                            <button
                                key={p}
                                onClick={() => setPower(p)}
                                className={`px-3 py-1 rounded text-sm border ${power === p ? 'bg-indigo-50 border-indigo-500 text-indigo-700' : 'border-slate-200'}`}
                            >
                                {p * 100}%
                            </button>
                        ))}
                    </div>
                </div>

                <div className="bg-indigo-50 dark:bg-indigo-900/20 p-6 rounded-xl text-center">
                    <p className="text-sm text-indigo-800 dark:text-indigo-300 mb-1">Required Sample Size (per model)</p>
                    <p className="text-4xl font-black text-indigo-600 dark:text-indigo-400">{n.toLocaleString()}</p>
                    <p className="text-xs text-indigo-400 mt-2">Prompts needed</p>
                </div>
            </div>
        </div>
    );
}

function SemanticClustersView({ clusters }: { clusters: Cluster[] }) {
    if (clusters.length === 0) return <div className="p-8 text-center text-slate-500">No semantic clustering data available.</div>;

    const pieData = clusters.map((c, i) => ({
        name: `Cluster ${i + 1}`,
        value: c.size,
        keywords: c.keywords.join(', ')
    }));

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 col-span-1">
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
                    <div key={idx} className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex gap-4">
                        <div className="h-full w-2 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></div>
                        <div className="flex-1">
                            <div className="flex justify-between items-start mb-2">
                                <h3 className="font-bold text-lg">Cluster {idx + 1} ({c.size} cases)</h3>
                                <div className="flex flex-wrap gap-1">
                                    {c.keywords.map(k => (
                                        <span key={k} className="px-2 py-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs rounded-full font-mono flex items-center gap-1">
                                            <Tag className="h-3 w-3" /> {k}
                                        </span>
                                    ))}
                                </div>
                            </div>
                            <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-lg text-sm text-slate-600 dark:text-slate-400 font-mono mb-3">"{c.exemplar}"</div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
