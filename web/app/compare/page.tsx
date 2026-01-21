'use client';

import { useEffect, useState, useMemo } from 'react';
import Papa from 'papaparse';
import Link from 'next/link';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts';
import { Shield, ArrowRight, ArrowLeftRight, Check, X as XIcon, Minimize2 } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import ModelLogo from '@/components/ModelLogo';
import ExportButton from '@/components/ExportButton';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

// --- Types ---
type AuditRow = {
    test_date: string;
    model: string;
    category: string;
    verdict: string;
    run_cost: number;
    prompt_text: string;
    response_text: string;
};

type ModelMetadata = {
    id: string;
    name: string;
    provider: string;
    region: string;
    tier: string;
};

export default function ComparePage() {
    const [data, setData] = useState<AuditRow[]>([]);
    const [models, setModels] = useState<ModelMetadata[]>([]);

    // Selection State
    const [modelA, setModelA] = useState<string>('');
    const [modelB, setModelB] = useState<string>('');
    const [selectedDivergence, setSelectedDivergence] = useState<any | null>(null);

    useEffect(() => {
        // Load Models Metadata
        fetch('/models.json')
            .then(r => r.json())
            .then((m: ModelMetadata[]) => {
                setModels(m);
                // Defaults
                if (m.length >= 2) {
                    // Try to pick two distinct ones, ideally one US one China if available
                    const us = m.find(x => x.region === 'US');
                    const china = m.find(x => x.region === 'China');
                    if (us && china) {
                        setModelA(us.id);
                        setModelB(china.id);
                    } else {
                        setModelA(m[0].id);
                        setModelB(m[1].id);
                    }
                }
            })
            .catch(e => console.error("No models metadata", e));

        // Load Audit Data
        fetch('/audit_log.csv')
            .then(r => r.text())
            .then(csv => {
                const parsed = Papa.parse<AuditRow>(csv, { header: true, dynamicTyping: true });
                setData(parsed.data.filter(r => r.model));
            });
    }, []);

    // --- Comparison Logic ---

    const statsA = useMemo(() => calculateStats(data, modelA), [data, modelA]);
    const statsB = useMemo(() => calculateStats(data, modelB), [data, modelB]);

    function calculateStats(allData: AuditRow[], modelId: string) {
        if (!modelId) return null;
        const subset = allData.filter(r => r.model === modelId);
        const total = subset.length;
        if (total === 0) return null;

        const refusals = subset.filter(r => r.verdict === 'REMOVED').length;
        const avgLen = subset.reduce((acc, curr) => acc + (curr.response_text ? curr.response_text.length : 0), 0) / total;

        // Category Breakdown
        const categories = Array.from(new Set(subset.map(r => r.category)));
        const catStats = categories.map(c => {
            const cSub = subset.filter(r => r.category === c);
            return {
                subject: c,
                rate: (cSub.filter(r => r.verdict === 'REMOVED').length / cSub.length) * 100
            };
        });

        return { total, refusals, refusalRate: (refusals / total) * 100, avgLen, catStats, subset };
    }

    // Radar Data Combine
    const radarData = useMemo(() => {
        if (!statsA || !statsB) return [];

        const allCats = Array.from(new Set([...statsA.catStats.map(c => c.subject), ...statsB.catStats.map(c => c.subject)]));
        return allCats.map(cat => ({
            subject: cat,
            A: statsA.catStats.find(c => c.subject === cat)?.rate || 0,
            B: statsB.catStats.find(c => c.subject === cat)?.rate || 0,
        }));
    }, [statsA, statsB]);

    // Find Divergences (where verdicts differ)
    const divergences = useMemo(() => {
        if (!statsA || !statsB) return [];
        // Join on prompt text (assuming unique enough generally, or prompt_id if we had it easily accessible in this view, strictly we do from CSV but text is fine visual)
        // Actually audit_log has prompt_id usually? Let's check type. 
        // The Type definition earlier didn't have prompt_id. It's usually in CSV.
        // Let's rely on index or text matching. Text matching is safer if IDs match.

        const diffs = [];
        // We need to match rows. Since runs happen sequentially, we might have multiple runs. 
        // We should compare the LATEST run for each prompt.
        // Simplify: Find prompts present in both.

        // Create map of Prompt Text -> {Verdict, Response} for A
        const mapA = new Map<string, { verdict: string, response: string }>();
        statsA.subset.forEach(r => mapA.set(r.prompt_text, { verdict: r.verdict, response: r.response_text }));

        for (const rowB of statsB.subset) {
            const verA = mapA.get(rowB.prompt_text);
            if (verA && verA.verdict !== rowB.verdict) {
                diffs.push({
                    prompt: rowB.prompt_text,
                    verdictA: verA.verdict,
                    verdictB: rowB.verdict,
                    responseA: verA.response,
                    responseB: rowB.response_text,
                    category: rowB.category
                });
            }
        }
        return diffs;
    }, [statsA, statsB]);

    const metaA = models.find(m => m.id === modelA);
    const metaB = models.find(m => m.id === modelB);

    return (
        <main className="min-h-screen bg-slate-50 text-slate-900 p-8 font-sans">
            <div className="max-w-7xl mx-auto space-y-8" id="compare-content">

                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 flex items-center gap-3">
                            Model Comparison
                        </h1>
                        <p className="text-lg text-slate-500 font-medium mt-1">Head-to-head performance analysis & disagreement detection</p>
                    </div>
                    <ExportButton targetId="compare-content" filename="model-comparison" />
                </div>
            </div>

            {/* Selectors */}
            <div className="flex items-center gap-4 bg-white p-2 rounded-xl shadow-sm border border-slate-200">
                <select
                    value={modelA}
                    onChange={e => setModelA(e.target.value)}
                    className="p-2 bg-indigo-50/50 rounded-lg text-indigo-900 font-semibold border-indigo-100 focus:ring-0 cursor-pointer"
                >
                    {models.map(m => <option key={m.id} value={m.id}>{m.name} ({m.region})</option>)}
                </select>
                <span className="text-slate-400 font-bold">VS</span>
                <select
                    value={modelB}
                    onChange={e => setModelB(e.target.value)}
                    className="p-2 bg-emerald-50/50 rounded-lg text-emerald-900 font-semibold border-emerald-100 focus:ring-0 cursor-pointer"
                >
                    {models.map(m => <option key={m.id} value={m.id}>{m.name} ({m.region})</option>)}
                </select>
            </div>


            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Model A Card */}
                <div className="bg-white p-6 rounded-2xl border-t-4 border-t-indigo-500 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        {metaA && <ModelLogo provider={metaA.provider} name={metaA.name} className="h-32 w-32" />}
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900 mb-1">{metaA?.name || modelA}</h2>
                    <div className="flex gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500 mb-6">
                        <span className="bg-slate-100 px-2 py-1 rounded">{metaA?.provider}</span>
                        <span className="bg-slate-100 px-2 py-1 rounded">{metaA?.region}</span>
                        <span className="bg-slate-100 px-2 py-1 rounded">{metaA?.tier} Tier</span>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-slate-50 rounded-xl">
                            <div className="text-sm text-slate-500 mb-1">Refusal Rate</div>
                            <div className="text-3xl font-bold text-indigo-600">{statsA?.refusalRate.toFixed(1)}%</div>
                        </div>
                        <div className="p-4 bg-slate-50 rounded-xl">
                            <div className="text-sm text-slate-500 mb-1">Avg Verbosity</div>
                            <div className="text-xl font-bold text-slate-700">{Math.round(statsA?.avgLen || 0)} chars</div>
                        </div>
                    </div>
                </div>

                {/* Model B Card */}
                <div className="bg-white p-6 rounded-2xl border-t-4 border-t-emerald-500 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        {metaB && <ModelLogo provider={metaB.provider} name={metaB.name} className="h-32 w-32" />}
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900 mb-1">{metaB?.name || modelB}</h2>
                    <div className="flex gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500 mb-6">
                        <span className="bg-slate-100 px-2 py-1 rounded">{metaB?.provider}</span>
                        <span className="bg-slate-100 px-2 py-1 rounded">{metaB?.region}</span>
                        <span className="bg-slate-100 px-2 py-1 rounded">{metaB?.tier} Tier</span>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-slate-50 rounded-xl">
                            <div className="text-sm text-slate-500 mb-1">Refusal Rate</div>
                            <div className="text-3xl font-bold text-emerald-600">{statsB?.refusalRate.toFixed(1)}%</div>
                        </div>
                        <div className="p-4 bg-slate-50 rounded-xl">
                            <div className="text-sm text-slate-500 mb-1">Avg Verbosity</div>
                            <div className="text-xl font-bold text-slate-700">{Math.round(statsB?.avgLen || 0)} chars</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Comparison Radar */}
            <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <h3 className="text-lg font-semibold mb-6">Side-by-Side Censorship Profile</h3>
                <div className="h-96 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                            <PolarGrid />
                            <PolarAngleAxis dataKey="subject" />
                            <PolarRadiusAxis angle={30} domain={[0, 100]} />
                            <Radar name={metaA?.name} dataKey="A" stroke="#6366f1" fill="#6366f1" fillOpacity={0.3} />
                            <Radar name={metaB?.name} dataKey="B" stroke="#10b981" fill="#10b981" fillOpacity={0.3} />
                            <Legend />
                            <Tooltip />
                        </RadarChart>
                    </ResponsiveContainer>
                </div>
            </section>

            {/* Divergences / Diff Viewer */}
            <section>
                <h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <Minimize2 className="h-6 w-6 text-slate-400" />
                    Disagreement Analysis ({divergences.length})
                </h3>
                <p className="text-slate-500 mb-6">
                    Showing instances where one model refused while the other allowed (and vice versa).
                </p>

                <div className="space-y-4">
                    {divergences.slice(0, 50).map((d, idx) => (
                        <div
                            key={idx}
                            className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm"
                        >
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">{d.category}</span>
                                <span className="text-xs text-indigo-600 opacity-0 group-hover:opacity-100 font-semibold transition-opacity">View Details →</span>
                            </div>
                            <div className="mb-4 bg-slate-50 p-3 rounded-lg text-sm font-mono text-slate-700 whitespace-pre-wrap line-clamp-3">
                                {d.prompt}
                            </div>

                            <div className="flex items-center gap-4">
                                <div className={cn("flex-1 p-2 rounded text-center text-xs font-bold border", d.verdictA === 'REMOVED' ? "bg-red-50 border-red-100 text-red-700" : "bg-emerald-50 border-emerald-100 text-emerald-700")}>
                                    {metaA?.name}: {d.verdictA}
                                </div>
                                <div className="text-slate-300">vs</div>
                                <div className={cn("flex-1 p-2 rounded text-center text-xs font-bold border", d.verdictB === 'REMOVED' ? "bg-red-50 border-red-100 text-red-700" : "bg-emerald-50 border-emerald-100 text-emerald-700")}>
                                    {metaB?.name}: {d.verdictB}
                                </div>
                            </div>
                        </div>
                    ))}
                    {divergences.length === 0 && (
                        <div className="p-8 text-center text-slate-400 bg-white rounded-xl border border-slate-200 border-dashed">
                            No disagreements found! These models behaved identically on the loaded dataset.
                        </div>
                    )}
                </div>
            </section>

            {/* Modal */}
            {selectedDivergence && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm" onClick={() => setSelectedDivergence(null)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                            <div>
                                <h3 className="text-lg font-bold text-slate-900">Disagreement Detail</h3>
                                <p className="text-sm text-slate-500">{selectedDivergence.category}</p>
                            </div>
                            <button onClick={() => setSelectedDivergence(null)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                                <XIcon className="h-5 w-5 text-slate-500" />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto">
                            <div className="mb-8">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">User Prompt</h4>
                                <div className="bg-slate-100 p-4 rounded-xl text-slate-800 font-mono text-sm whitespace-pre-wrap border border-slate-200">
                                    {selectedDivergence.prompt}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="font-bold text-slate-900">{metaA?.name}</span>
                                        <span className={cn("text-xs font-bold px-2 py-1 rounded", selectedDivergence.verdictA === 'REMOVED' ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700")}>
                                            {selectedDivergence.verdictA}
                                        </span>
                                    </div>
                                    <div className="p-4 rounded-xl border border-slate-200 bg-white text-sm text-slate-600 leading-relaxed h-[300px] overflow-y-auto">
                                        {selectedDivergence.responseA || <span className="italic text-slate-400">No response text available.</span>}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="font-bold text-slate-900">{metaB?.name}</span>
                                        <span className={cn("text-xs font-bold px-2 py-1 rounded", selectedDivergence.verdictB === 'REMOVED' ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700")}>
                                            {selectedDivergence.verdictB}
                                        </span>
                                    </div>
                                    <div className="p-4 rounded-xl border border-slate-200 bg-white text-sm text-slate-600 leading-relaxed h-[300px] overflow-y-auto">
                                        {selectedDivergence.responseB || <span className="italic text-slate-400">No response text available.</span>}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
        </main >
    );
}
