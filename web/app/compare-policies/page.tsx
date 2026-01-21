
'use client';

import { useEffect, useState, useMemo } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend
} from 'recharts';
import { Beaker, ArrowLeftRight, TrendingUp, TrendingDown } from 'lucide-react';

type AuditRow = {
    model: string;
    verdict: string;
    category: string;
    prompt: string;
    policy_version?: string;
};

export default function ComparePoliciesPage() {
    const [data, setData] = useState<AuditRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [policyA, setPolicyA] = useState<string>('');
    const [policyB, setPolicyB] = useState<string>('');

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

    // Get unique policy versions
    const policies = useMemo(() => {
        const versions = new Set<string>();
        data.forEach(r => {
            if (r.policy_version) versions.add(r.policy_version);
        });
        return Array.from(versions).sort();
    }, [data]);

    // Auto-select first two policies
    useEffect(() => {
        if (policies.length >= 2 && !policyA && !policyB) {
            setPolicyA(policies[0]);
            setPolicyB(policies[1]);
        }
    }, [policies, policyA, policyB]);

    // Calculate stats for each policy
    const comparison = useMemo(() => {
        if (!policyA || !policyB) return null;

        const subsetA = data.filter(r => r.policy_version === policyA);
        const subsetB = data.filter(r => r.policy_version === policyB);

        const refusalsA = subsetA.filter(r => r.verdict === 'REFUSAL' || r.verdict === 'REMOVED').length;
        const refusalsB = subsetB.filter(r => r.verdict === 'REFUSAL' || r.verdict === 'REMOVED').length;

        const rateA = subsetA.length ? (refusalsA / subsetA.length) * 100 : 0;
        const rateB = subsetB.length ? (refusalsB / subsetB.length) * 100 : 0;

        // Find prompts where policies differ
        const promptMapA = new Map<string, string>();
        subsetA.forEach(r => promptMapA.set(r.prompt, r.verdict));

        const divergences: { prompt: string; verdictA: string; verdictB: string }[] = [];
        subsetB.forEach(r => {
            const verdictA = promptMapA.get(r.prompt);
            if (verdictA && verdictA !== r.verdict) {
                divergences.push({
                    prompt: r.prompt,
                    verdictA,
                    verdictB: r.verdict
                });
            }
        });

        // Category breakdown
        const catDataA: Record<string, number> = {};
        const catDataB: Record<string, number> = {};

        subsetA.filter(r => r.verdict === 'REFUSAL').forEach(r => {
            catDataA[r.category] = (catDataA[r.category] || 0) + 1;
        });
        subsetB.filter(r => r.verdict === 'REFUSAL').forEach(r => {
            catDataB[r.category] = (catDataB[r.category] || 0) + 1;
        });

        const allCats = new Set([...Object.keys(catDataA), ...Object.keys(catDataB)]);
        const categoryComparison = Array.from(allCats).map(cat => ({
            category: cat,
            [policyA]: catDataA[cat] || 0,
            [policyB]: catDataB[cat] || 0,
        }));

        return {
            policyA: { name: policyA, total: subsetA.length, refusals: refusalsA, rate: rateA },
            policyB: { name: policyB, total: subsetB.length, refusals: refusalsB, rate: rateB },
            divergences,
            categoryComparison,
            improvement: rateA - rateB,
        };
    }, [data, policyA, policyB]);

    if (loading) return <div className="min-h-screen flex items-center justify-center text-slate-500">Loading...</div>;

    if (policies.length < 2) {
        return (
            <main className="min-h-screen bg-slate-50 p-8">
                <div className="max-w-4xl mx-auto text-center py-20">
                    <Beaker className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                    <h1 className="text-2xl font-bold text-slate-700">A/B Policy Testing</h1>
                    <p className="text-slate-500 mt-2">
                        Run audits with different <code>--policy</code> tags to compare policy effectiveness.
                    </p>
                    <pre className="bg-slate-800 text-emerald-400 p-4 rounded-lg mt-6 text-sm text-left inline-block">
                        python src/audit_runner.py --policy v1.0{'\n'}
                        python src/audit_runner.py --policy v2.0
                    </pre>
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-slate-50 text-slate-900 p-8 font-sans">
            <div className="max-w-6xl mx-auto space-y-8">
                <header className="text-center space-y-4">
                    <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 flex items-center justify-center gap-3">
                        <Beaker className="h-10 w-10 text-purple-600" />
                        A/B Policy Comparison
                    </h1>
                    <p className="text-lg text-slate-500">
                        Compare refusal rates between different policy versions.
                    </p>
                </header>

                {/* Policy Selectors */}
                <div className="flex justify-center gap-8">
                    <div className="text-center">
                        <label className="text-sm font-bold text-slate-500 uppercase tracking-wider">Policy A</label>
                        <select
                            value={policyA}
                            onChange={(e) => setPolicyA(e.target.value)}
                            className="block mt-2 px-4 py-2 border border-slate-200 rounded-lg bg-white"
                        >
                            {policies.map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                    </div>
                    <ArrowLeftRight className="h-8 w-8 text-slate-300 self-end mb-2" />
                    <div className="text-center">
                        <label className="text-sm font-bold text-slate-500 uppercase tracking-wider">Policy B</label>
                        <select
                            value={policyB}
                            onChange={(e) => setPolicyB(e.target.value)}
                            className="block mt-2 px-4 py-2 border border-slate-200 rounded-lg bg-white"
                        >
                            {policies.map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                    </div>
                </div>

                {comparison && (
                    <>
                        {/* Summary Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">{comparison.policyA.name}</h3>
                                <div className="text-4xl font-extrabold text-slate-800 mt-2">{comparison.policyA.rate.toFixed(1)}%</div>
                                <p className="text-sm text-slate-400">{comparison.policyA.refusals} / {comparison.policyA.total} refusals</p>
                            </div>
                            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">{comparison.policyB.name}</h3>
                                <div className="text-4xl font-extrabold text-slate-800 mt-2">{comparison.policyB.rate.toFixed(1)}%</div>
                                <p className="text-sm text-slate-400">{comparison.policyB.refusals} / {comparison.policyB.total} refusals</p>
                            </div>
                            <div className={`p-6 rounded-2xl border shadow-sm ${comparison.improvement > 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
                                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Improvement</h3>
                                <div className={`text-4xl font-extrabold mt-2 flex items-center gap-2 ${comparison.improvement > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                    {comparison.improvement > 0 ? <TrendingDown className="h-8 w-8" /> : <TrendingUp className="h-8 w-8" />}
                                    {Math.abs(comparison.improvement).toFixed(1)}%
                                </div>
                                <p className="text-sm text-slate-400">
                                    {comparison.improvement > 0 ? 'Lower refusal rate' : 'Higher refusal rate'}
                                </p>
                            </div>
                        </div>

                        {/* Category Comparison Chart */}
                        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                            <h3 className="text-lg font-bold text-slate-800 mb-4">Category Breakdown</h3>
                            <div className="h-80">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={comparison.categoryComparison} layout="vertical" margin={{ left: 100 }}>
                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                        <XAxis type="number" />
                                        <YAxis dataKey="category" type="category" width={100} />
                                        <Tooltip />
                                        <Legend />
                                        <Bar dataKey={policyA} fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                                        <Bar dataKey={policyB} fill="#06b6d4" radius={[0, 4, 4, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Divergences */}
                        {comparison.divergences.length > 0 && (
                            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                                <h3 className="text-lg font-bold text-slate-800 mb-4">
                                    Policy Disagreements ({comparison.divergences.length})
                                </h3>
                                <div className="space-y-4 max-h-96 overflow-y-auto">
                                    {comparison.divergences.slice(0, 10).map((d, i) => (
                                        <div key={i} className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                                            <p className="text-sm text-slate-700 font-mono truncate">{d.prompt}</p>
                                            <div className="flex gap-4 mt-2 text-xs">
                                                <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded">{policyA}: {d.verdictA}</span>
                                                <span className="px-2 py-1 bg-cyan-100 text-cyan-700 rounded">{policyB}: {d.verdictB}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </main>
    );
}
