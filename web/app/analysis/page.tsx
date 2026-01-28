'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import {
    Brain, Tag, BarChart2, ShieldCheck, DollarSign, FileText, TrendingUp,
    Info, Database, Clock, Filter, X, Compass, AlertTriangle, Zap, BookOpen
} from 'lucide-react';
import {
    ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
    Legend, PieChart, Pie, Cell, BarChart, Bar, LineChart, Line, ReferenceLine
} from 'recharts';
import { calculateFleissKappa } from '@/lib/statistics';
import Papa from 'papaparse';
import { fetchAuditData, type AuditRow } from '@/lib/data-loading';
import { DeepInsights } from "@/components/DeepInsights";


// --- Types ---
// --- Types ---
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

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#8b5cf6', '#06b6d4', '#84cc16'];

export default function AnalysisPage() {
    const [activeTab, setActiveTab] = useState<'summary' | 'alignment' | 'clusters' | 'triggers' | 'reliability' | 'longitudinal' | 'bias' | 'insights'>('summary');

    // Data Loading
    const [auditData, setAuditData] = useState<AuditRow[]>([]);
    const [clusters, setClusters] = useState<Cluster[]>([]);
    const [biasData, setBiasData] = useState<BiasRow[]>([]);
    const [driftData, setDriftData] = useState<any[]>([]);
    const [consensusData, setConsensusData] = useState<any[]>([]);
    const [reportContent, setReportContent] = useState<string>('');
    const [loading, setLoading] = useState(true);

    // Longitudinal Filters
    const [longitudinalModels, setLongitudinalModels] = useState<string[]>([]);

    useEffect(() => {
        const loadAll = async () => {
            try {
                // Fetch audit data client-side to avoid API limits
                const data = await fetchAuditData();
                setAuditData(data);

                try {
                    const r2 = await fetch('/clusters.json');
                    if (r2.ok) setClusters(await r2.json());
                } catch (e) { console.warn("Clusters not found"); }

                try {
                    const r3 = await fetch('/api/report');
                    const j3 = await r3.json();
                    if (j3.content) setReportContent(j3.content);
                } catch (e) { console.warn("Report not found"); }

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

                try {
                    const r5 = await fetch('/drift_report.json');
                    if (r5.ok) setDriftData(await r5.json());
                } catch (e) { console.warn("Drift report not found"); }

                try {
                    const r6 = await fetch('/consensus_bias.csv');
                    if (r6.ok) {
                        const csvText = await r6.text();
                        Papa.parse(csvText, {
                            header: true,
                            skipEmptyLines: true,
                            complete: (results: any) => {
                                setConsensusData(results.data);
                            }
                        });
                    }
                } catch (e) { console.warn("Consensus data not found"); }

            } catch (err) {
                console.error("Failed to load data", err);
            } finally {
                setLoading(false);
            }
        };
        loadAll();
    }, []);

    const stats = useMemo(() => {
        if (auditData.length === 0) return null;
        const models = Array.from(new Set(auditData.map((d: AuditRow) => d.model)));
        const prompts = Array.from(new Set(auditData.map((d: AuditRow) => d.case_id || d.prompt_id || d.prompt)));
        const reliability = calculateFleissKappa(auditData, models, prompts);

        const distributionMap = new Map<string, number>();
        prompts.forEach(p => {
            const relevant = auditData.filter((d: AuditRow) => (d.case_id === p || d.prompt_id === p || d.prompt === p) && d.verdict !== 'ERROR');
            if (relevant.length === 0) return;
            const safeCount = relevant.filter((d: AuditRow) => d.verdict === 'ALLOWED' || d.verdict === 'safe' || d.verdict === 'safe_response').length;
            const percentage = (safeCount / relevant.length);
            let bucket = "";
            if (relevant.length === 1) bucket = "Single Model (N/A)";
            else if (percentage === 0) bucket = "0% (All Unsafe)";
            else if (percentage === 1) bucket = "100% (All Safe)";
            else if (percentage < 0.5) bucket = "< 50% Safe";
            else if (percentage >= 0.5) bucket = "> 50% Safe";
            distributionMap.set(bucket, (distributionMap.get(bucket) || 0) + 1);
        });
        const distribution = Array.from(distributionMap.entries()).map(([name, value]) => ({ name, value }));

        return { reliability, models, prompts, distribution };
    }, [auditData]);

    const efficiencyData = useMemo(() => {
        if (auditData.length === 0) return [];
        const models = Array.from(new Set(auditData.map((d: AuditRow) => d.model)));
        return models.map(m => {
            const rows = auditData.filter((d: AuditRow) => d.model === m);
            const total = rows.length;
            const refused = rows.filter((d: AuditRow) => ['REFUSAL', 'REMOVED', 'unsafe', 'Hard Refusal'].includes(d.verdict)).length;
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

    // Calculate Trigger Words (Top words in refused prompts)
    const triggerWords = useMemo(() => {
        if (auditData.length === 0) return [];

        const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'this', 'that', 'it', 'i', 'you', 'he', 'she', 'they', 'we', 'me', 'him', 'her', 'them', 'us', 'my', 'your', 'his', 'her', 'their', 'our', 'what', 'which', 'who', 'whom', 'whose', 'why', 'how', 'where', 'when', 'can', 'could', 'should', 'would', 'will', 'may', 'might', 'must', 'do', 'does', 'did', 'done', 'doing', 'have', 'has', 'had', 'having', 'not', 'no', 'yes', 'if', 'then', 'else', 'from', 'as', 'so', 'than', 'just', 'very', 'really', 'too', 'much', 'many', 'more', 'most', 'some', 'any', 'all', 'none', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'make', 'write', 'create', 'generate', 'tell', 'me', 'about', 'like', 'know']);

        const wordCounts: Record<string, number> = {};
        const refusedPrompts = auditData.filter(d => ['REFUSAL', 'REMOVED', 'unsafe', 'Hard Refusal'].includes(d.verdict));

        refusedPrompts.forEach(row => {
            if (!row.prompt) return;
            const words = row.prompt.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/);
            words.forEach(w => {
                if (w.length > 3 && !stopWords.has(w)) {
                    wordCounts[w] = (wordCounts[w] || 0) + 1;
                }
            });
        });

        return Object.entries(wordCounts)
            .map(([word, count]) => ({ word, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 30); // Top 30 triggers
    }, [auditData]);

    const longitudinalData = useMemo(() => {
        if (auditData.length === 0) return { chartData: [], activeModels: [] };
        const filtered = auditData.filter((d: AuditRow) => longitudinalModels.length === 0 || longitudinalModels.includes(d.model));
        const uniqueDates = Array.from(new Set(filtered.map(d => d.timestamp?.split('T')[0] || 'Unknown'))).filter(d => d !== 'Unknown').sort();
        const activeModels = longitudinalModels.length > 0 ? longitudinalModels : Array.from(new Set(filtered.map(d => d.model)));

        const chartData = uniqueDates.map(date => {
            const dayRows = filtered.filter(d => (d.timestamp?.split('T')[0]) === date);
            const row: any = { date };
            activeModels.forEach(model => {
                const modelRows = dayRows.filter(d => d.model === model);
                if (modelRows.length > 0) {
                    const refusals = modelRows.filter(d => ['REFUSAL', 'REMOVED', 'unsafe', 'Hard Refusal'].includes(d.verdict)).length;
                    row[model] = (refusals / modelRows.length) * 100;
                    row[`${model}_count`] = modelRows.length; // Store count for tooltip
                } else row[model] = null;
            });
            return row;
        });
        return { chartData, activeModels };
    }, [auditData, longitudinalModels]);

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
                <header className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-3">
                            🔬 Analysis Deep Dive
                        </h1>
                        <p className="text-slate-500 text-sm md:text-base mt-1">
                            Advanced metrics, academic visuals, and automated research insights.
                        </p>
                    </div>
                    <Link href="/dashboard" className="text-sm font-medium text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
                        &larr; Back to Dashboard
                    </Link>
                </header>

                {/* Tabs */}
                <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-1 overflow-x-auto">
                    <TabButton active={activeTab === 'summary'} onClick={() => setActiveTab('summary')} icon={<Database className="w-4 h-4" />}>AI Summary</TabButton>

                    <TabButton active={activeTab === 'triggers'} onClick={() => setActiveTab('triggers')} icon={<AlertTriangle className="w-4 h-4" />}>Trigger List</TabButton>
                    <TabButton active={activeTab === 'alignment'} onClick={() => setActiveTab('alignment')} icon={<Zap className="w-4 h-4" />}>Alignment Tax</TabButton>
                    <TabButton active={activeTab === 'clusters'} onClick={() => setActiveTab('clusters')} icon={<Tag className="w-4 h-4" />}>Semantic Clusters</TabButton>
                    <TabButton active={activeTab === 'clusters'} onClick={() => setActiveTab('clusters')} icon={<Tag className="w-4 h-4" />}>Semantic Clusters</TabButton>
                    <TabButton active={activeTab === 'bias'} onClick={() => setActiveTab('bias')} icon={<Compass className="w-4 h-4" />}>Bias Compass</TabButton>
                    <TabButton active={activeTab === 'insights'} onClick={() => setActiveTab('insights')} icon={<TrendingUp className="w-4 h-4" />}>Deep Insights</TabButton>
                    <TabButton active={activeTab === 'reliability'} onClick={() => setActiveTab('reliability')} icon={<ShieldCheck className="w-4 h-4" />}>Reliability</TabButton>
                    <TabButton active={activeTab === 'longitudinal'} onClick={() => setActiveTab('longitudinal')} icon={<TrendingUp className="w-4 h-4" />}>Longitudinal</TabButton>
                </div>

                {/* Content */}
                <div className="min-h-[60vh]">
                    {activeTab === 'summary' && (
                        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
                            <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><FileText className="w-5 h-5" /> Executive Summary</h3>
                            {reportContent ? (
                                <article className="prose prose-slate max-w-none text-sm">
                                    {reportContent.split('\n').map((line, i) => {
                                        if (line.startsWith('# ')) return <h1 key={i} className="text-2xl font-bold mt-6 mb-4">{line.replace('# ', '')}</h1>;
                                        if (line.startsWith('## ')) return <h2 key={i} className="text-xl font-bold mt-6 mb-3 border-b pb-1">{line.replace('## ', '')}</h2>;
                                        if (line.startsWith('### ')) return <h3 key={i} className="text-lg font-bold mt-4 mb-2">{line.replace('### ', '')}</h3>;
                                        if (line.startsWith('- ')) return <li key={i} className="ml-4 list-disc my-1">{line.replace('- ', '')}</li>;
                                        return <p key={i} className="my-2 whitespace-pre-wrap">{line}</p>;
                                    })}
                                </article>
                            ) : <div className="text-slate-400">No report generated.</div>}
                        </div>
                    )}



                    {activeTab === 'triggers' && (
                        <div className="space-y-6">
                            <div className="p-4 bg-red-50 rounded-lg border border-red-100 text-sm text-red-800">
                                <strong>Figure 4: The Trigger List.</strong> This chart reveals the most common words found in prompts that were refused by models. These "trigger words" are often strong indicators of what topics models are sensitive to.
                            </div>
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                                <h3 className="text-lg font-bold mb-6">Top Trigger Words</h3>
                                <div className="h-[500px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={triggerWords} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                                            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                            <XAxis type="number" />
                                            <YAxis dataKey="word" type="category" width={100} tick={{ fontSize: 12 }} />
                                            <RechartsTooltip cursor={{ fill: 'transparent' }} />
                                            <Bar dataKey="count" fill="#ef4444" name="Refusals" radius={[0, 4, 4, 0]} barSize={20} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'alignment' && (
                        <div className="space-y-6">
                            <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-100 text-sm text-indigo-800">
                                <strong>Figure 1: The Alignment Tax.</strong> This visualization (Pareto Frontier) demonstrates the trade-off between Model Helpfulness (Efficiency) and Safety (Refusal Rate). Models on the frontier represent the best balance.
                            </div>
                            {/* Option A: The interactive Pareto chart if iframe preferred */}
                            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden h-[700px]">
                                <iframe src="/chart.html" className="w-full h-full border-0" title="Alignment Tax Pareto Frontier" />
                            </div>

                            {/* Option B: Simplified React Scatter if HTML fails or for quick view */}
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 mt-6 h-[400px]">
                                <h4 className="text-sm font-bold text-slate-500 mb-4 uppercase tracking-wider">Simplified Scatter View</h4>
                                <ResponsiveContainer width="100%" height="90%">
                                    <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                                        <CartesianGrid />
                                        <XAxis type="number" dataKey="costPer1k" name="Cost" unit="$" label={{ value: 'Cost ($/1k)', position: 'bottom' }} />
                                        <YAxis type="number" dataKey="refusalRate" name="Refusals" unit="%" label={{ value: 'Refusal Rate %', angle: -90, position: 'insideLeft' }} />
                                        <RechartsTooltip cursor={{ strokeDasharray: '3 3' }} />
                                        <Scatter name="Models" data={efficiencyData} fill="#8884d8">
                                            {efficiencyData.map((e, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                        </Scatter>
                                    </ScatterChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    )}

                    {activeTab === 'clusters' && <SemanticClustersView clusters={clusters} />}
                    {activeTab === 'bias' && <BiasCompassView biasData={biasData} allModels={stats?.models || []} />}
                    {activeTab === 'insights' && <DeepInsights driftData={driftData} consensusData={consensusData} />}

                    {activeTab === 'reliability' && stats && (
                        <div className="space-y-6">
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                                <h3 className="text-lg font-bold mb-2">Fleiss' Kappa Score</h3>
                                <div className="text-5xl font-black text-indigo-600">{stats.reliability.score.toFixed(3)}</div>
                                <div className="text-slate-500">{stats.reliability.interpretation}</div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'longitudinal' && (
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 h-[500px]">
                            <h3 className="text-lg font-bold mb-4">Refusal Rate Over Time</h3>
                            <ResponsiveContainer width="100%" height="90%">
                                <LineChart data={longitudinalData.chartData}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="date" />
                                    <YAxis unit="%" />
                                    <RechartsTooltip />
                                    <Legend />
                                    {longitudinalData.activeModels.map((m, i) => (
                                        <Line key={m} type="monotone" dataKey={m} stroke={COLORS[i % COLORS.length]} strokeWidth={2} connectNulls />
                                    ))}
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    )}
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
                flex items-center gap-2 px-4 py-3 text-sm font-medium rounded-t-lg border-b-2 transition-all whitespace-nowrap
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

function SemanticClustersView({ clusters }: { clusters: Cluster[] }) {
    if (clusters.length === 0) return <div className="p-8 text-center text-slate-500">No cluster data available.</div>;
    const pieData = clusters.map((c, i) => ({ name: `Cluster ${i + 1}`, value: c.size, keywords: c.keywords.join(', ') }));
    return (
        <div className="space-y-6">
            <div className="p-4 bg-blue-50 text-blue-800 text-sm rounded-lg border border-blue-100">
                <strong>Figure 3: Semantic Clusters.</strong> Groups common refusal themes.
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                    <h2 className="text-lg font-bold mb-4">Themes</h2>
                    <div className="h-64">
                        <ResponsiveContainer><PieChart><Pie data={pieData} innerRadius={60} outerRadius={80} dataKey="value">{pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie><RechartsTooltip /><Legend /></PieChart></ResponsiveContainer>
                    </div>
                </div>
                <div className="col-span-2 space-y-4">
                    {clusters.map((c, idx) => (
                        <div key={idx} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex gap-4">
                            <div className="w-2 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></div>
                            <div>
                                <h3 className="font-bold">Cluster {idx + 1} ({c.size} cases)</h3>
                                <p className="text-xs text-slate-500 mb-2">{c.keywords.join(', ')}</p>
                                <p className="text-sm italic text-slate-600 bg-slate-50 p-2 rounded">"{c.exemplar}"</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

function BiasCompassView({ biasData }: { biasData: BiasRow[], allModels: string[] }) {
    const leaningCoords: Record<string, { x: number, y: number }> = {
        'Left-Libertarian': { x: -0.7, y: -0.5 }, 'Left-Authoritarian': { x: -0.7, y: 0.5 },
        'Right-Libertarian': { x: 0.7, y: -0.5 }, 'Right-Authoritarian': { x: 0.7, y: 0.5 }, 'Neutral-Safety': { x: 0, y: 0 }
    };
    const scatterData = biasData.map(row => {
        const base = leaningCoords[row.leaning] || { x: 0, y: 0 };
        return { ...row, x: base.x + (Math.random() - 0.5) * 0.4, y: base.y + (Math.random() - 0.5) * 0.4, z: 1 };
    });

    return (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 h-[600px]">
            <h3 className="text-lg font-bold mb-2">Bias Compass</h3>
            <ResponsiveContainer>
                <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" dataKey="x" domain={[-1, 1]} hide />
                    <YAxis type="number" dataKey="y" domain={[-1, 1]} hide />
                    <ReferenceLine x={0} stroke="#cbd5e1" label="Authoritarian / Libertarian" />
                    <ReferenceLine y={0} stroke="#cbd5e1" label="Left / Right" />
                    <Scatter data={scatterData} fill="#8884d8">{scatterData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Scatter>
                    <RechartsTooltip />
                </ScatterChart>
            </ResponsiveContainer>
        </div>
    );
}

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

function PromptLibraryView() {
    return (
        <div className="p-12 text-center text-slate-500 bg-white rounded-2xl border border-slate-200">
            <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-bold mb-2">Prompt Library</h3>
            <p>Access the full database of test prompts, categories, and difficulty scores.</p>
        </div>
    );
}
