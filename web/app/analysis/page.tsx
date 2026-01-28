'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import {
    Brain, Tag, BarChart2, ShieldCheck, DollarSign, FileText, TrendingUp,
    Info, Database, Clock, Filter, X, Compass, AlertTriangle, Zap, BookOpen, Search
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
    const [activeTab, setActiveTab] = useState<'summary' | 'alignment' | 'clusters' | 'triggers' | 'reliability' | 'longitudinal' | 'bias' | 'insights' | 'political' | 'paternalism' | 'evidence' | 'significance'>('summary');

    // Data Loading
    const [auditData, setAuditData] = useState<AuditRow[]>([]);
    const [clusters, setClusters] = useState<Cluster[]>([]);
    const [biasData, setBiasData] = useState<BiasRow[]>([]);
    const [driftData, setDriftData] = useState<any[]>([]);
    const [consensusData, setConsensusData] = useState<any[]>([]);
    const [pValues, setPValues] = useState<any[]>([]);
    const [reportContent, setReportContent] = useState<string>('');
    const [loading, setLoading] = useState(true);

    // Longitudinal Filters
    const [longitudinalModels, setLongitudinalModels] = useState<string[]>([]);
    const [dateRange, setDateRange] = useState<{ start: string; end: string }>({ start: '', end: '' });
    const [humanKappa, setHumanKappa] = useState<number | null>(null);

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

                try {
                    const r7 = await fetch('/assets/p_values.csv');
                    if (r7.ok) {
                        const csvText = await r7.text();
                        Papa.parse(csvText, {
                            header: true,
                            skipEmptyLines: true,
                            complete: (results: any) => setPValues(results.data)
                        });
                    }
                } catch (e) { console.warn("P-Values CSV not found"); }

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
        let filtered = auditData.filter((d: AuditRow) => longitudinalModels.length === 0 || longitudinalModels.includes(d.model));
        if (dateRange.start) filtered = filtered.filter((d: AuditRow) => (d.timestamp?.split('T')[0] || '') >= dateRange.start);
        if (dateRange.end) filtered = filtered.filter((d: AuditRow) => (d.timestamp?.split('T')[0] || '') <= dateRange.end);

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
    }, [auditData, longitudinalModels, dateRange]);

    // --- Actions ---
    const downloadAuditSample = () => {
        if (auditData.length === 0) return;
        const sample = [...auditData].sort(() => 0.5 - Math.random()).slice(0, 50);
        const csv = Papa.unparse(sample.map((r: AuditRow) => ({
            case_id: r.case_id,
            prompt: r.prompt,
            model: r.model,
            ai_verdict: r.verdict,
            human_verdict: ''
        })));
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `human_audit_sample_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
    };

    const handleAuditUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        Papa.parse(file, {
            header: true,
            complete: (results: any) => {
                const rows = results.data;
                const valid = rows.filter((r: any) => r.ai_verdict && r.human_verdict);
                if (valid.length === 0) return;
                let agreed = 0;
                const n = valid.length;
                let aiSafeCount = 0;
                let humanSafeCount = 0;

                valid.forEach((r: any) => {
                    const ai = (r.ai_verdict || '').toLowerCase().includes('safe') || (r.ai_verdict || '').includes('ALLOW') ? 'safe' : 'unsafe';
                    const human = (r.human_verdict || '').toLowerCase().includes('safe') || (r.human_verdict || '').includes('ALLOW') ? 'safe' : 'unsafe';
                    if (ai === human) agreed++;
                    if (ai === 'safe') aiSafeCount++;
                    if (human === 'safe') humanSafeCount++;
                });

                const po = agreed / n;
                const pe = ((aiSafeCount / n) * (humanSafeCount / n)) + (((n - aiSafeCount) / n) * ((n - humanSafeCount) / n));
                const kappa = (po - pe) / (1 - pe);
                setHumanKappa(kappa > 0 ? kappa : 0);
            }
        });
    };

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

                    <TabButton active={activeTab === 'political'} onClick={() => setActiveTab('political')} icon={<Compass className="w-4 h-4" />}>Political Compass</TabButton>
                    <TabButton active={activeTab === 'paternalism'} onClick={() => setActiveTab('paternalism')} icon={<Info className="w-4 h-4" />}>Paternalism</TabButton>
                    <TabButton active={activeTab === 'significance'} onClick={() => setActiveTab('significance')} icon={<BarChart className="w-4 h-4" />}>Significance</TabButton>
                    <TabButton active={activeTab === 'evidence'} onClick={() => setActiveTab('evidence')} icon={<Search className="w-4 h-4" />}>Evidence</TabButton>

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
                                <strong>Figure: The Alignment Tax.</strong> This visualization (Pareto Frontier) demonstrates the trade-off between Model Helpfulness (Efficiency) and Safety (Refusal Rate). Models on the frontier represent the best balance.
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
                    {activeTab === 'insights' && (
                        <div className="space-y-6">
                            <div className="p-4 bg-sky-50 rounded-lg border border-sky-100 text-sm text-sky-800">
                                <strong>Figure: Deep Insights.</strong> Longitudinal drift and consensus analysis.
                            </div>
                            <DeepInsights driftData={driftData} consensusData={consensusData} />
                        </div>
                    )}

                    {/* New Components */}
                    {activeTab === 'political' && (
                        <div className="space-y-6">
                            <div className="p-4 bg-blue-50 rounded-lg border border-blue-100 text-sm text-blue-800">
                                <strong>Figure: Political Compass.</strong> Do models have political opinions? We test this by asking 30 standard political questions. The results map the model's "personality" on Economic (Left/Right) and Social (Libertarian/Authoritarian) axes.
                            </div>
                            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm overflow-hidden max-w-2xl mx-auto">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-lg font-bold flex items-center gap-2">
                                        🧭 Political Compass
                                    </h3>
                                </div>
                                <div className="flex flex-col items-center">
                                    <p className="text-sm text-slate-500 mb-4 text-center">
                                        Do models have political opinions? We test this by asking 30 standard political questions.
                                    </p>
                                    <div className="relative w-full aspect-square bg-slate-50 rounded-lg border border-slate-100 flex items-center justify-center overflow-hidden">
                                        <img
                                            src="/political_compass.png"
                                            alt="AI Political Compass"
                                            className="object-contain w-full h-full hover:scale-105 transition-transform duration-500"
                                            onError={(e) => {
                                                (e.target as HTMLImageElement).style.display = 'none';
                                                (e.target as HTMLImageElement).parentElement!.innerHTML = '<span class="text-slate-400 text-sm">Chart not generated yet</span>';
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'paternalism' && (
                        <div className="space-y-6">
                            <div className="p-4 bg-amber-50 rounded-lg border border-amber-100 text-sm text-amber-800">
                                <strong>Figure: Paternalism Audit.</strong> This test checks if models change their refusal behavior based on the user's persona (e.g., "Teenager" vs. "Authority Figure"). Ideally, safety rules should be consistent regardless of who is asking.
                            </div>
                            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm overflow-hidden max-w-2xl mx-auto">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-lg font-bold flex items-center gap-2">👶 Paternalism Audit</h3>
                                </div>
                                <div className="flex flex-col items-center">
                                    <p className="text-sm text-slate-500 mb-4 text-center">Do models refuse "Laypeople" (Teenagers) more than "Authority" figures?</p>
                                    <div className="relative w-full aspect-square bg-slate-50 rounded-lg border border-slate-100 flex items-center justify-center overflow-hidden">
                                        <img src="/paternalism.png" alt="Paternalism Chart" className="object-contain w-full h-full hover:scale-105 transition-transform duration-500" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; (e.target as HTMLImageElement).parentElement!.innerHTML = '<span class="text-slate-400 text-sm">Chart not generated yet</span>'; }} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'evidence' && (
                        <div className="bg-white rounded-xl border border-slate-200 p-8 shadow-sm flex flex-col items-center text-center max-w-2xl mx-auto">
                            <h3 className="text-xl font-bold flex items-center gap-2 mb-4">📂 Evidence Locker</h3>
                            <p className="text-slate-500 mb-8 max-w-md">
                                Explore raw audit traces with full transparency. Identify cases where models exhibit "Paternalism" or inconsistent safety boundaries.
                            </p>
                            <a href="/explorer.html" target="_blank" className="inline-flex justify-center items-center px-6 py-3 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors font-medium text-base gap-2">
                                <Search className="w-5 h-5" /> Open Evidence Locker
                            </a>
                        </div>
                    )}

                    {activeTab === 'significance' && (
                        <div className="space-y-6">
                            <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-100 text-sm text-emerald-800">
                                <strong>Figure: Statistical Significance (McNemar's Test).</strong> We use McNemar's Test to determine if the difference in refusal rates between two models is statistically significant (P-Value &lt; 0.05) or likely due to random chance.
                            </div>
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">📊 Pairwise Significance Results</h3>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b border-slate-200 text-slate-500 font-semibold">
                                                <th className="text-left py-2">Model A</th>
                                                <th className="text-left py-2">Model B</th>
                                                <th className="text-right py-2">P-Value</th>
                                                <th className="text-right py-2">Is Significant?</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {pValues.length === 0 ? (
                                                <tr><td colSpan={4} className="py-4 text-center text-slate-400">No significance data available.</td></tr>
                                            ) : (
                                                pValues.slice(0, 10).map((row: any, i: number) => (
                                                    <tr key={i} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                                                        <td className="py-2 text-slate-700">{row['Model A']}</td>
                                                        <td className="py-2 text-slate-700">{row['Model B']}</td>
                                                        <td className="py-2 text-right font-mono text-slate-600">{parseFloat(row['P-Value']).toExponential(2)}</td>
                                                        <td className="py-2 text-right">
                                                            {row['Significant'] === 'YES' ? <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-bold">Yes</span> : <span className="text-xs bg-slate-100 text-slate-500 px-2 py-1 rounded-full">No</span>}
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'reliability' && stats && (
                        <div className="space-y-6">
                            <div className="p-4 bg-violet-50 rounded-lg border border-violet-100 text-sm text-violet-800">
                                <strong>Figure: Reliability Score.</strong> Measures consistency across repeated prompts.
                            </div>
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                                <h3 className="text-lg font-bold mb-2">Fleiss' Kappa Score</h3>
                                <div className="text-5xl font-black text-indigo-600">{stats.reliability.score.toFixed(3)}</div>
                                <div className="text-slate-500">{stats.reliability.interpretation}</div>
                            </div>

                            {/* Human Audit Kit UI */}
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                                    🕵️ Human Audit Kit
                                </h3>
                                <p className="text-sm text-slate-500 mb-6">
                                    Calculate Inter-Rater Reliability (Cohen's Kappa) by validating AI verdicts against human judgment.
                                </p>

                                <div className="space-y-4">
                                    <div className="p-4 bg-slate-50 rounded-lg border border-slate-100 flex justify-between items-center group hover:border-indigo-200 transition-colors cursor-pointer" onClick={downloadAuditSample}>
                                        <div>
                                            <div className="font-medium text-slate-900 group-hover:text-indigo-700 flex items-center gap-2">
                                                Step 1: Download Sample
                                                <span className="bg-indigo-100 text-indigo-700 text-[10px] px-2 py-0.5 rounded-full uppercase font-bold">Action</span>
                                            </div>
                                            <div className="text-xs text-slate-500">50 random traces for review</div>
                                        </div>
                                        <button className="text-sm font-medium text-indigo-600 bg-white px-3 py-1.5 rounded border border-indigo-200 shadow-sm">
                                            Download CSV
                                        </button>
                                    </div>

                                    <div className="p-4 bg-slate-50 rounded-lg border border-slate-100 flex justify-between items-center">
                                        <div>
                                            <div className="font-medium text-slate-900">Step 2: Calculate Kappa</div>
                                            <div className="text-xs text-slate-500">Upload filled CSV</div>
                                        </div>
                                        {humanKappa !== null ? (
                                            <div className="font-mono text-2xl font-black text-indigo-600">
                                                {humanKappa.toFixed(3)}
                                            </div>
                                        ) : (
                                            <div className="relative">
                                                <input
                                                    type="file"
                                                    accept=".csv"
                                                    onChange={handleAuditUpload}
                                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                                />
                                                <button className="text-sm font-medium text-slate-600 bg-white px-3 py-1.5 rounded border border-slate-300 shadow-sm pointer-events-none">
                                                    Upload CSV
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'longitudinal' && (
                        <div className="space-y-6">
                            <div className="p-4 bg-fuchsia-50 rounded-lg border border-fuchsia-100 text-sm text-fuchsia-800">
                                <strong>Figure: Longitudinal Analysis.</strong> Tracks refusal rates over time to detect drift.
                            </div>
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 h-[500px]">
                                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                                    <h3 className="text-lg font-bold">Refusal Rate Over Time</h3>
                                    <div className="flex items-center gap-2 text-sm">
                                        <span className="text-slate-500 font-medium uppercase text-xs">Filter by Date:</span>
                                        <input
                                            type="date"
                                            className="border border-slate-200 rounded px-2 py-1 text-slate-600 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                            value={dateRange.start}
                                            onChange={e => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                                        />
                                        <span className="text-slate-300">&mdash;</span>
                                        <input
                                            type="date"
                                            className="border border-slate-200 rounded px-2 py-1 text-slate-600 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                            value={dateRange.end}
                                            onChange={e => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                                        />
                                        {(dateRange.start || dateRange.end) && (
                                            <button
                                                onClick={() => setDateRange({ start: '', end: '' })}
                                                className="ml-2 text-indigo-600 hover:text-indigo-800 text-xs font-bold"
                                            >
                                                CLEAR
                                            </button>
                                        )}
                                    </div>
                                </div>
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
                        </div>
                    )}
                </div>
            </div>
        </main >
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
                <strong>Figure: Semantic Clusters.</strong> Groups common refusal themes.
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
        <div className="space-y-6">
            <div className="p-4 bg-orange-50 text-orange-800 text-sm rounded-lg border border-orange-100 leading-relaxed">
                <div className="font-bold mb-1 flex items-center gap-2"><Compass className="w-4 h-4" /> Understanding the Bias Compass</div>
                <p>This chart maps model refusal reasoning onto two primary axes:</p>
                <ul className="mt-2 space-y-1 list-disc ml-5">
                    <li><strong>Horizontal (Left vs. Right):</strong> Economic bias. Left favors collective safety and regulation; Right favors individual liberty and free markets.</li>
                    <li><strong>Vertical (Authoritarian vs. Libertarian):</strong> Social bias. Authoritarian (Top) favors strict guardrails and authority; Libertarian (Bottom) favors freedom of speech and minimal intervention.</li>
                </ul>
            </div>
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 h-[650px] relative">
                <h3 className="text-lg font-bold mb-6">Bias Compass</h3>

                {/* Quadrant Labels Overlay */}
                <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-12 opacity-40 font-bold text-[10px] uppercase tracking-widest text-slate-400">
                    <div className="flex justify-between">
                        <span>Left-Authoritarian</span>
                        <span>Right-Authoritarian</span>
                    </div>
                    <div className="flex justify-between">
                        <span>Left-Libertarian</span>
                        <span>Right-Libertarian</span>
                    </div>
                </div>

                <ResponsiveContainer width="100%" height="90%">
                    <ScatterChart margin={{ top: 40, right: 40, bottom: 40, left: 40 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" dataKey="x" domain={[-1, 1]} hide />
                        <YAxis type="number" dataKey="y" domain={[-1, 1]} hide />

                        {/* Custom Reference Lines with Edge Labels */}
                        <ReferenceLine x={0} stroke="#cbd5e1" strokeWidth={2} label={{ position: 'top', value: 'Authoritarian ⬆️', fill: '#94a3b8', fontSize: 10, fontWeight: 'bold' }} />
                        <ReferenceLine x={0} stroke="#cbd5e1" strokeWidth={2} label={{ position: 'bottom', value: 'Libertarian ⬇️', fill: '#94a3b8', fontSize: 10, fontWeight: 'bold' }} />
                        <ReferenceLine y={0} stroke="#cbd5e1" strokeWidth={2} label={{ position: 'insideLeft', value: '⬅️ Economic Left', fill: '#94a3b8', fontSize: 10, fontWeight: 'bold', offset: 10 }} />
                        <ReferenceLine y={0} stroke="#cbd5e1" strokeWidth={2} label={{ position: 'insideRight', value: 'Economic Right ➡️', fill: '#94a3b8', fontSize: 10, fontWeight: 'bold', offset: 10 }} />

                        <Scatter data={scatterData} fill="#8884d8">
                            {scatterData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Scatter>
                        <RechartsTooltip cursor={{ strokeDasharray: '3 3' }} />
                    </ScatterChart>
                </ResponsiveContainer>

                <div className="mt-4 text-center text-xs text-slate-400 italic">
                    Note: Points are jittered slightly for visibility. Data represents AI-judged "leaning" of specific model responses.
                </div>
            </div>
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
