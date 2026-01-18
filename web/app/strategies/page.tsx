'use client';

import { useEffect, useState, useMemo } from 'react';
import Papa from 'papaparse';
import Link from 'next/link';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { Shield, ArrowRight, AlertTriangle, CheckCircle, Info, X } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import ModelLogo from '@/components/ModelLogo'; // Import Logo

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

// --- Types ---
import { StrategyRowSchema, StrategyRow } from '@/lib/schemas';

type ModelMetadata = {
    id: string;
    name: string;
    provider: string;
    region: string;
    tier: string;
};

function InfoTooltip({ text }: { text: string }) {
    const [show, setShow] = useState(false);
    return (
        <div className="relative inline-block ml-2">
            <Info
                className="h-4 w-4 text-slate-400 hover:text-indigo-600 cursor-help transition-colors"
                onMouseEnter={() => setShow(true)}
                onMouseLeave={() => setShow(false)}
            />
            {show && (
                <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-slate-800 text-white text-xs rounded shadow-lg pointer-events-none">
                    {text}
                    <div className="absolute top-100 left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-slate-800" />
                </div>
            )}
        </div>
    );
}

export default function StrategyPage() {
    const [data, setData] = useState<StrategyRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedBenignModel, setSelectedBenignModel] = useState<{ model: string, refusals: StrategyRow[] } | null>(null);
    const [selectedAttackModel, setSelectedAttackModel] = useState<string | null>(null); // For Attack Vector Drilldown
    const [modelsMeta, setModelsMeta] = useState<ModelMetadata[]>([]);

    useEffect(() => {
        // Fetch metadata matching dashboard approach
        fetch('/models.json').then(r => r.json()).then(setModelsMeta).catch(() => { });

        fetch('/strategy_log.csv')
            .then(r => r.text())
            .then(csv => {
                const parsed = Papa.parse(csv, { header: true, dynamicTyping: true });
                // Validate with Zod
                const validRows: StrategyRow[] = [];
                parsed.data.forEach((row: any) => {
                    const result = StrategyRowSchema.safeParse(row);
                    if (result.success) {
                        validRows.push(result.data);
                    } else {
                        console.warn("Skipping invalid strategy row:", result.error);
                    }
                });

                setData(validRows.filter(r => r.model && r.type));
                setLoading(false);
            })
            .catch(err => {
                console.error("Failed to load strategy log", err);
                setLoading(false);
            });
    }, []);

    // --- Aggregations ---

    // 1. Attack Vector Analysis (Direct vs Adversarial) (Refusal Rate)
    const attackData = useMemo(() => {
        const models = Array.from(new Set(data.map(r => r.model)));
        return models.map(m => {
            const subset = data.filter(r => r.model === m);

            const direct = subset.filter(r => r.type === 'Direct');
            const adv = subset.filter(r => r.type === 'Adversarial');

            const directRefusals = direct.filter(r => r.verdict === 'REMOVED').length;
            const advRefusals = adv.filter(r => r.verdict === 'REMOVED').length;

            return {
                model: m,
                Direct: direct.length ? (directRefusals / direct.length) * 100 : 0,
                Adversarial: adv.length ? (advRefusals / adv.length) * 100 : 0,
            };
        });
    }, [data]);

    // 2. Over-Refusal Gauge (Benign Prompts)
    const benignData = useMemo(() => {
        const models = Array.from(new Set(data.map(r => r.model)));
        return models.map(m => {
            const subset = data.filter(r => r.model === m && r.type === 'Benign');
            const refusals = subset.filter(r => r.verdict === 'REMOVED').length;
            return {
                model: m,
                falsePositiveRate: subset.length ? (refusals / subset.length) * 100 : 0,
                count: subset.length
            };
        });
    }, [data]);

    return (
        <main className="min-h-screen bg-slate-50 text-slate-900 p-8 font-sans">
            <div className="max-w-7xl mx-auto space-y-8">

                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <Link href="/dashboard" className="text-xs font-bold uppercase tracking-wider text-indigo-600 mb-1 block">← Back to Dashboard</Link>
                        <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
                            <Shield className="h-8 w-8 text-indigo-600" />
                            Strategy Analysis
                        </h1>
                        <p className="text-slate-500 mt-2 max-w-2xl">
                            Deep dive into how models handle different attack vectors. We compare <strong>Direct</strong> policy violations against <strong>Adversarial</strong> attempts (jailbreaks) and measure false positives on <strong>Benign</strong> queries.
                        </p>
                    </div>
                </div>

                {/* Attack Vector Chart */}
                <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-orange-500" />
                        Attack Vector Robustness
                        <InfoTooltip text="Comparison of refusal rates for Direct questions vs Adversarial attacks. Click bar to see details." />
                    </h3>
                    <div className="h-80 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={attackData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="model" tickFormatter={(val) => val.split('/')[1] || val} />
                                <YAxis unit="%" />
                                <Tooltip
                                    cursor={{ fill: '#f8fafc' }}
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                                <Legend />
                                <Bar
                                    dataKey="Direct"
                                    fill="#6366f1"
                                    name="Direct Violations"
                                    radius={[4, 4, 0, 0]}
                                    cursor="pointer"
                                    onClick={(data: any) => setSelectedAttackModel(data.model)}
                                />
                                <Bar
                                    dataKey="Adversarial"
                                    fill="#f43f5e"
                                    name="Adversarial (Jailbreaks)"
                                    radius={[4, 4, 0, 0]}
                                    cursor="pointer"
                                    onClick={(data: any) => setSelectedAttackModel(data.model)}
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </section>

                {/* False Positive / Over-Refusal */}
                <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                        <CheckCircle className="h-5 w-5 text-emerald-600" />
                        Over-Censorship (Benign Checks)
                        <InfoTooltip text="Percentage of safe, benign prompts that were incorrectly refused. Lower is better." />
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {benignData.map(m => (
                            <div
                                key={m.model}
                                className="p-4 border border-slate-100 rounded-xl bg-slate-50 flex items-center justify-between cursor-pointer hover:ring-2 hover:ring-indigo-400 transition-all"
                                onClick={() => {
                                    // Get control subset for this model
                                    const refusals = data.filter(r => r.model === m.model && r.type === 'Benign' && r.verdict === 'REMOVED');
                                    setSelectedBenignModel({ model: m.model, refusals });
                                }}
                            >
                                <div className="flex items-center gap-3">
                                    <ModelLogo provider={modelsMeta.find(meta => meta.id === m.model)?.provider || 'Unknown'} name={m.model} />
                                    <div>
                                        <div className="font-medium text-slate-700">{m.model.split('/')[1] || m.model}</div>
                                        <div className="text-xs text-slate-500">{m.count} control prompts</div>
                                    </div>
                                </div>
                                <div className={cn("text-2xl font-bold", m.falsePositiveRate > 10 ? "text-red-600" : "text-emerald-600")}>
                                    {m.falsePositiveRate.toFixed(1)}%
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Drill Down Modal (Benign) */}
                    {selectedBenignModel && (
                        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setSelectedBenignModel(null)}>
                            <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[80vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                                <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                                    <div>
                                        <h3 className="font-bold text-lg text-slate-800">Over-Censorship Analysis</h3>
                                        <p className="text-sm text-slate-500">
                                            Benign prompts refused by <span className="font-semibold text-indigo-600">{selectedBenignModel.model.split('/')[1]}</span>
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => setSelectedBenignModel(null)}
                                        className="p-2 hover:bg-slate-200 rounded-full transition-colors"
                                    >
                                        <X className="h-5 w-5 text-slate-500" />
                                    </button>
                                </div>

                                <div className="p-6 overflow-y-auto space-y-6">
                                    {selectedBenignModel.refusals.length === 0 ? (
                                        <div className="text-center py-8 text-slate-400">
                                            <CheckCircle className="h-12 w-12 mx-auto mb-2 text-emerald-200" />
                                            <p>No false positives! This model correctly handled all benign prompts.</p>
                                        </div>
                                    ) : (
                                        // Group by Category
                                        Object.entries(
                                            selectedBenignModel.refusals.reduce((acc, row) => {
                                                const cat = row.category || 'Uncategorized';
                                                if (!acc[cat]) acc[cat] = [];
                                                acc[cat].push(row);
                                                return acc;
                                            }, {} as Record<string, StrategyRow[]>)
                                        ).map(([category, rows]) => (
                                            <div key={category}>
                                                <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3 border-b border-slate-100 pb-1">
                                                    {category} ({rows.length})
                                                </h4>
                                                <div className="space-y-3">
                                                    {rows.map((row, i) => (
                                                        <div key={i} className="border border-slate-200 rounded-xl p-4 hover:border-indigo-200 transition-colors">
                                                            <div className="bg-slate-50 p-3 rounded-lg text-sm text-slate-700 font-mono mb-2">
                                                                {row.prompt_text || "Prompt text unavailable"}
                                                            </div>
                                                            <div className="pl-3 border-l-2 border-red-200 text-sm text-slate-600">
                                                                {row.response_text || <span className="italic text-slate-400">No response text provided</span>}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Drill Down Modal (Attack Vectors) */}
                    {selectedAttackModel && (
                        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setSelectedAttackModel(null)}>
                            <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[80vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                                <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                                    <div>
                                        <h3 className="font-bold text-lg text-slate-800">Attack Vector Details</h3>
                                        <p className="text-sm text-slate-500">
                                            Direct vs Adversarial results for <span className="font-semibold text-indigo-600">{selectedAttackModel.split('/')[1]}</span>
                                        </p>
                                    </div>
                                    <button onClick={() => setSelectedAttackModel(null)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                                        <X className="h-5 w-5 text-slate-500" />
                                    </button>
                                </div>

                                <div className="p-6 overflow-y-auto space-y-6">
                                    {/* Compare Direct vs Adversarial */}
                                    {['Direct', 'Adversarial'].map(type => {
                                        const rows = data.filter(r => r.model === selectedAttackModel && r.type === type);
                                        return (
                                            <div key={type} className="mb-6">
                                                <h4 className={cn("text-sm font-bold uppercase tracking-wider mb-3 pb-1 border-b",
                                                    type === 'Direct' ? "text-indigo-600 border-indigo-100" : "text-rose-600 border-rose-100")}>
                                                    {type} Prompts ({rows.length})
                                                </h4>
                                                <div className="space-y-3">
                                                    {rows.map((row, i) => (
                                                        <div key={i} className="border border-slate-200 rounded-xl p-4 flex gap-4">
                                                            <div className="flex-1">
                                                                <div className="text-xs text-slate-400 font-mono mb-1">{row.category}</div>
                                                                <div className="bg-slate-50 p-2 rounded text-sm text-slate-800 font-mono">
                                                                    {row.prompt_text || "Prompt text unavailable"}
                                                                </div>
                                                            </div>
                                                            <div className="w-32 shrink-0 flex flex-col items-end">
                                                                <span className={cn("px-2 py-1 rounded text-xs font-bold uppercase mb-2",
                                                                    row.verdict === 'REMOVED' ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700")}>
                                                                    {row.verdict}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    ))}
                                                    {rows.length === 0 && <div className="text-slate-400 italic text-sm">No records found.</div>}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}
                </section>

            </div >
        </main >
    );
}
