'use client';

import { useEffect, useState, useMemo } from 'react';
import {
    Brain, Tag, BarChart2, ShieldCheck, DollarSign, FileText, TrendingUp,
    Info, Database, Clock
} from 'lucide-react';
import {
    ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
    Legend, PieChart, Pie, Cell, BarChart, Bar, LineChart, Line
} from 'recharts';
import { calculateFleissKappa } from '@/lib/statistics';

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

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

export default function DeepDivePage() {
    const [activeTab, setActiveTab] = useState<'datalog' | 'reliability' | 'efficiency' | 'longitudinal' | 'clusters'>('datalog');

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
        const prompts = Array.from(new Set(auditData.map(d => d.case_id || d.prompt_id || d.prompt)));

        const reliability = calculateFleissKappa(auditData, models, prompts);

        // Calculate Agreement Distribution
        const distributionMap = new Map<string, number>();
        prompts.forEach(p => {
            const relevant = auditData.filter(d => (d.case_id === p || d.prompt_id === p || d.prompt === p) && d.verdict !== 'ERROR');
            if (relevant.length < 2) return;

            const safeCount = relevant.filter(d => d.verdict === 'ALLOWED' || d.verdict === 'safe' || d.verdict === 'safe_response').length;
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
        }).filter(m => m.total > 0);
    }, [auditData]);

    // Longitudinal Data (by date)
    const longitudinalData = useMemo(() => {
        if (auditData.length === 0) return [];

        const dateMap = new Map<string, { date: string; total: number; refusals: number }>();

        auditData.forEach(d => {
            const date = d.timestamp?.split('T')[0] || 'Unknown';
            if (!dateMap.has(date)) {
                dateMap.set(date, { date, total: 0, refusals: 0 });
            }
            const entry = dateMap.get(date)!;
            entry.total++;
            if (['REFUSAL', 'REMOVED', 'unsafe'].includes(d.verdict)) {
                entry.refusals++;
            }
        });

        return Array.from(dateMap.values())
            .map(d => ({ ...d, refusalRate: (d.refusals / d.total) * 100 }))
            .sort((a, b) => a.date.localeCompare(b.date));
    }, [auditData]);

    // AI Summary
    const aiSummary = useMemo(() => {
        if (!stats || efficiencyData.length === 0) return null;

        const avgRefusal = efficiencyData.reduce((sum, m) => sum + m.refusalRate, 0) / efficiencyData.length;
        const mostCautious = efficiencyData.reduce((a, b) => a.refusalRate > b.refusalRate ? a : b);
        const leastCautious = efficiencyData.reduce((a, b) => a.refusalRate < b.refusalRate ? a : b);
        const cheapest = efficiencyData.reduce((a, b) => a.costPer1k < b.costPer1k ? a : b);

        return {
            avgRefusal: avgRefusal.toFixed(1),
            kappaScore: stats.reliability.score.toFixed(3),
            kappaInterpretation: stats.reliability.interpretation,
            mostCautious: mostCautious.name,
            mostCautiousRate: mostCautious.refusalRate.toFixed(1),
            leastCautious: leastCautious.name,
            leastCautiousRate: leastCautious.refusalRate.toFixed(1),
            cheapest: cheapest.name,
            cheapestCost: cheapest.costPer1k.toFixed(4),
            totalPrompts: stats.prompts.length,
            totalModels: stats.models.length,
            clusterCount: clusters.length
        };
    }, [stats, efficiencyData, clusters]);

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center text-slate-500 bg-slate-50 dark:bg-slate-900">
            <div className="flex flex-col items-center gap-2">
                <Brain className="h-8 w-8 animate-pulse text-indigo-500" />
                <span>Loading analysis data...</span>
            </div>
        </div>
    );

    return (
        <main className="min-h-screen bg-slate-50 dark:bg-slate-900 p-4 md:p-8 font-sans text-slate-900 dark:text-slate-100">
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

                {/* AI Summary Panel */}
                {aiSummary && (
                    <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-6 rounded-2xl shadow-lg text-white">
                        <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
                            <Brain className="h-5 w-5" /> AI Analyst Summary
                        </h2>
                        <p className="text-indigo-100 text-sm leading-relaxed">
                            Across <strong>{aiSummary.totalModels} models</strong> and <strong>{aiSummary.totalPrompts} prompts</strong>,
                            the average refusal rate is <strong>{aiSummary.avgRefusal}%</strong>.
                            Inter-model agreement (Fleiss' Kappa) is <strong>{aiSummary.kappaScore}</strong> ({aiSummary.kappaInterpretation}).
                            The most cautious model is <strong>{aiSummary.mostCautious}</strong> ({aiSummary.mostCautiousRate}% refusal rate),
                            while <strong>{aiSummary.leastCautious}</strong> is the most permissive ({aiSummary.leastCautiousRate}%).
                            For cost efficiency, <strong>{aiSummary.cheapest}</strong> offers the lowest cost at ${aiSummary.cheapestCost}/1k prompts.
                            {aiSummary.clusterCount > 0 && ` Semantic analysis identified ${aiSummary.clusterCount} distinct refusal themes.`}
                        </p>
                    </div>
                )}

                {/* Tabs */}
                <div className="flex flex-wrap gap-2 border-b border-slate-200 dark:border-slate-700 pb-1">
                    <TabButton active={activeTab === 'datalog'} onClick={() => setActiveTab('datalog')} icon={<Database className="w-4 h-4" />}>
                        Data Log
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
                </div>

                {/* Content */}
                <div className="min-h-[60vh]">
                    {activeTab === 'datalog' && (
                        <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
                            <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800">
                                <h3 className="font-bold text-blue-800 dark:text-blue-300 flex items-center gap-2 mb-2">
                                    <Info className="w-4 h-4" /> What is the Data Log?
                                </h3>
                                <p className="text-sm text-blue-700 dark:text-blue-400">
                                    The Data Log displays the raw AI-generated analysis report. It summarizes key findings from the moderation audit,
                                    including model rankings, statistical insights, and recommendations. This report is auto-generated by running
                                    the Python analysis script on the audit data.
                                </p>
                            </div>
                            {reportContent ? (
                                <article className="prose prose-slate dark:prose-invert max-w-none">
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

                    {activeTab === 'reliability' && stats && (
                        <div className="space-y-6">
                            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800">
                                <h3 className="font-bold text-blue-800 dark:text-blue-300 flex items-center gap-2 mb-2">
                                    <Info className="w-4 h-4" /> What is Reliability & Consensus?
                                </h3>
                                <p className="text-sm text-blue-700 dark:text-blue-400">
                                    This tab measures how consistently different AI models agree on safety verdicts.
                                    <strong> Fleiss' Kappa</strong> is a statistical measure of inter-rater reliability—higher scores mean models agree more often.
                                    The <strong>Agreement Distribution</strong> shows what percentage of prompts had unanimous vs. split decisions across models.
                                </p>
                            </div>
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
                                        <div className="flex items-center justify-center h-32 bg-slate-50 dark:bg-slate-700/50 rounded-lg text-slate-400 text-sm">
                                            Not enough data for distribution
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'efficiency' && (
                        <div className="space-y-6">
                            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800">
                                <h3 className="font-bold text-blue-800 dark:text-blue-300 flex items-center gap-2 mb-2">
                                    <Info className="w-4 h-4" /> What is Efficiency & Cost?
                                </h3>
                                <p className="text-sm text-blue-700 dark:text-blue-400">
                                    This tab visualizes the trade-off between <strong>cost</strong> and <strong>safety</strong> across models.
                                    The X-axis shows the cost per 1,000 prompts (in USD), while the Y-axis shows the refusal rate (%).
                                    Ideally, you want a model in the <strong>bottom-left</strong> (low cost, low unnecessary refusals) or
                                    <strong>top-left</strong> (low cost, high safety) depending on your use case.
                                </p>
                            </div>
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

                    {activeTab === 'longitudinal' && (
                        <div className="space-y-6">
                            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800">
                                <h3 className="font-bold text-blue-800 dark:text-blue-300 flex items-center gap-2 mb-2">
                                    <Info className="w-4 h-4" /> What is the Longitudinal Study?
                                </h3>
                                <p className="text-sm text-blue-700 dark:text-blue-400">
                                    This tab tracks <strong>model behavior over time</strong>. It shows how the overall refusal rate
                                    changes across different audit dates. This helps identify trends—are models becoming more or less
                                    restrictive? Are there spikes in refusals on certain days? Use this to monitor drift in AI safety policies.
                                </p>
                            </div>
                            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 h-[500px]">
                                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                                    <Clock className="w-5 h-5 text-indigo-500" /> Refusal Rate Over Time
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

function SemanticClustersView({ clusters }: { clusters: Cluster[] }) {
    if (clusters.length === 0) return (
        <div className="space-y-6">
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800">
                <h3 className="font-bold text-blue-800 dark:text-blue-300 flex items-center gap-2 mb-2">
                    <Info className="w-4 h-4" /> What are Semantic Clusters?
                </h3>
                <p className="text-sm text-blue-700 dark:text-blue-400">
                    Semantic clustering groups similar refusal responses together based on their meaning.
                    This helps identify <strong>common themes</strong> in how models refuse requests—for example,
                    "violence-related refusals" or "medical misinformation refusals". Each cluster shows keywords
                    and an example response to help you understand the pattern.
                </p>
            </div>
            <div className="p-8 text-center text-slate-500">No semantic clustering data available.</div>
        </div>
    );

    const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

    const pieData = clusters.map((c, i) => ({
        name: `Cluster ${i + 1}`,
        value: c.size,
        keywords: c.keywords.join(', ')
    }));

    return (
        <div className="space-y-6">
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800">
                <h3 className="font-bold text-blue-800 dark:text-blue-300 flex items-center gap-2 mb-2">
                    <Info className="w-4 h-4" /> What are Semantic Clusters?
                </h3>
                <p className="text-sm text-blue-700 dark:text-blue-400">
                    Semantic clustering groups similar refusal responses together based on their meaning.
                    This helps identify <strong>common themes</strong> in how models refuse requests—for example,
                    "violence-related refusals" or "medical misinformation refusals". Each cluster shows keywords
                    and an example response to help you understand the pattern.
                </p>
            </div>
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
        </div>
    );
}
