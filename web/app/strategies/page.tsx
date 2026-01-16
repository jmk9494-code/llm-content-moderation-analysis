'use client';

import { useEffect, useState, useMemo } from 'react';
import Papa from 'papaparse';
import Link from 'next/link';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts';
import { Shield, ArrowRight, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

// --- Types ---
type StrategyRow = {
    test_date: string;
    model: string;
    category: string;
    type: string; // 'Direct', 'Adversarial', 'Benign'
    verdict: string;
    prompt_text: string;
    response_text: string;
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

    useEffect(() => {
        fetch('/strategy_log.csv')
            .then(r => r.text())
            .then(csv => {
                const parsed = Papa.parse<StrategyRow>(csv, { header: true, dynamicTyping: true });
                setData(parsed.data.filter(r => r.model && r.type));
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
                        <div className="flex items-center gap-2 mb-2">
                            <Link href="/dashboard" className="text-sm font-medium text-slate-500 hover:text-indigo-600 transition-colors">← Back to Main Dashboard</Link>
                        </div>
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
                        <InfoTooltip text="Comparison of refusal rates for Direct questions vs Adversarial attacks. A large gap indicates the model is vulnerable to jailbreaks." />
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
                                <Bar dataKey="Direct" fill="#6366f1" name="Direct Violations" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="Adversarial" fill="#f43f5e" name="Adversarial (Jailbreaks)" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </section>

                {/* False Positive / Over-Refusal */}
                <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                        <CheckCircle className="h-5 w-5 text-emerald-600" />
                        False Positive Rates (Benign Checks)
                        <InfoTooltip text="Percentage of safe, benign prompts that were incorrectly refused. Lower is better." />
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {benignData.map(m => (
                            <div key={m.model} className="p-4 border border-slate-100 rounded-xl bg-slate-50 flex items-center justify-between">
                                <div>
                                    <div className="font-medium text-slate-700">{m.model.split('/')[1] || m.model}</div>
                                    <div className="text-xs text-slate-500">{m.count} control prompts</div>
                                </div>
                                <div className={cn("text-2xl font-bold", m.falsePositiveRate > 10 ? "text-red-600" : "text-emerald-600")}>
                                    {m.falsePositiveRate.toFixed(1)}%
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

            </div>
        </main>
    );
}
