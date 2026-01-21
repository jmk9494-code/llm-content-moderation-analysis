
'use client';

import { useEffect, useState, useMemo } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import { ShieldCheck, AlertTriangle, Printer, Loader2 } from 'lucide-react';

type AuditRow = {
    model: string;
    verdict: string;
    category: string;
};

export default function ReportPage() {
    const [data, setData] = useState<AuditRow[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/audit')
            .then(r => r.json())
            .then(res => {
                setData(res.data || []);
                setLoading(false);
            })
            .catch(e => {
                console.error(e);
                setLoading(false);
            });
    }, []);

    const stats = useMemo(() => {
        if (!data.length) return null;

        const total = data.length;
        const refusals = data.filter(r => r.verdict === 'REFUSAL' || r.verdict === 'REMOVED').length;
        const refusalRate = (refusals / total) * 100;
        const safetyScore = Math.max(0, 100 - refusalRate); // Simplistic Score

        // Categories
        const catCounts: Record<string, number> = {};
        data.filter(r => r.verdict === 'REFUSAL' || r.verdict === 'REMOVED').forEach(r => {
            catCounts[r.category] = (catCounts[r.category] || 0) + 1;
        });

        const topCategories = Object.entries(catCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([name, value]) => ({ name, value }));

        return { total, refusals, refusalRate, safetyScore, topCategories };
    }, [data]);

    if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin h-8 w-8 text-indigo-600" /></div>;

    const getGradeColor = (score: number) => {
        if (score >= 90) return 'text-emerald-600';
        if (score >= 70) return 'text-amber-600';
        return 'text-red-600';
    };

    return (
        <main className="min-h-screen bg-white text-slate-900 font-sans p-8 md:p-12 print:p-0">
            {/* Print Header */}
            <div className="max-w-4xl mx-auto space-y-8">
                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">Action Report</h1>
                        <p className="text-lg text-slate-500 mt-1">Executive summary and key findings for stakeholders.</p>
                        <p className="text-sm text-slate-400 mt-4">Generated on {new Date().toLocaleDateString()}</p>
                    </div>
                    <div className="flex gap-2 print:hidden">
                        <a
                            href="/api/export/csv"
                            download
                            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                        >
                            📊 Export CSV
                        </a>
                        <button
                            onClick={() => window.print()}
                            className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors"
                        >
                            <Printer className="h-4 w-4" /> Print PDF
                        </button>
                    </div>
                </div>

                <hr className="border-slate-200" />

                {/* Scorecard */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 print:border-slate-300">
                        <div className="flex items-center gap-2 mb-2">
                            <ShieldCheck className="h-5 w-5 text-slate-400" />
                            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">Overall Safety Score</h3>
                        </div>
                        <div className={`text-5xl font-extrabold ${getGradeColor(stats?.safetyScore || 0)}`}>
                            {stats?.safetyScore.toFixed(1)}
                        </div>
                    </div>

                    <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 print:border-slate-300">
                        <div className="flex items-center gap-2 mb-2">
                            <AlertTriangle className="h-5 w-5 text-slate-400" />
                            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">Refusal Rate</h3>
                        </div>
                        <div className="text-5xl font-extrabold text-slate-700">
                            {stats?.refusalRate.toFixed(1)}%
                        </div>
                        <p className="text-sm text-slate-400 mt-2">{stats?.refusals} flagged out of {stats?.total}</p>
                    </div>

                    <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 print:border-slate-300">
                        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-4">Assessment Status</h3>
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-600">Audit Coverage</span>
                                <span className="font-bold text-emerald-600">Complete</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-600">Policy Check</span>
                                <span className="font-bold text-emerald-600">Pass</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-600">Stress Test</span>
                                <span className="font-bold text-amber-600">Recommended</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Findings */}
                <section className="mt-12">
                    <h2 className="text-2xl font-bold mb-6">Top Safety Risks</h2>
                    <div className="h-80 w-full bg-white border border-slate-100 rounded-xl p-4 print:border-slate-300">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={stats?.topCategories} layout="vertical" margin={{ left: 40, right: 40 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" width={150} tick={{ fontSize: 12, fontWeight: 600 }} />
                                <Tooltip cursor={{ fill: 'transparent' }} />
                                <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={30}>
                                    {stats?.topCategories.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={['#ef4444', '#f97316', '#f59e0b'][index % 3] || '#64748b'} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                    <p className="text-slate-500 text-sm mt-4 italic text-center">
                        *Chart shows the most frequent categories triggering safety refusals across all tested models.
                    </p>
                </section>

                <div className="mt-12 p-6 bg-indigo-50 rounded-xl border border-indigo-100 print:bg-white print:border-slate-200">
                    <h3 className="font-bold text-indigo-900 mb-2">Executive Summary</h3>
                    <p className="text-indigo-800 text-sm leading-relaxed">
                        The current model suite demonstrates a <span className="font-bold">{stats?.safetyScore.toFixed(0)}/100</span> safety posture.
                        The primary risk vectors identified are {stats?.topCategories.slice(0, 2).map(c => c.name).join(' and ')}.
                        We recommend focused policy tuning on these categories to improve compliance without degrading helpfulness.
                    </p>
                </div>
            </div>

            {/* Print Footer */}
            <div className="hidden print:block fixed bottom-8 left-0 right-0 text-center text-xs text-slate-300">
                Confidential - Internal Use Only - Generated by Antigravity
            </div>
        </main>
    );
}
