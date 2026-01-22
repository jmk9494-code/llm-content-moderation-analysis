'use client';

import { useEffect, useState } from 'react';
import { Settings, Shield, DollarSign, Clock } from 'lucide-react';

type ModelInfo = {
    id: string;
    name: string;
    provider: string;
    tier: string;
    cost_per_m_in: number;
    cost_per_m_out: number;
};

export default function AdminPage() {
    const [models, setModels] = useState<ModelInfo[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/models.json')
            .then(r => r.json())
            .then(data => {
                setModels(data);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, []);

    const tierCounts = models.reduce((acc, m) => {
        acc[m.tier] = (acc[m.tier] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    return (
        <main className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans text-slate-900">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <header className="mb-8">
                    <div className="flex items-center gap-3">
                        <Settings className="h-8 w-8 text-indigo-600" />
                        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
                            ⚙️ Admin Dashboard
                        </h1>
                    </div>
                    <p className="text-slate-500 mt-2">
                        Manage models, prompts, and audit configurations.
                    </p>
                </header>

                {loading ? (
                    <div className="animate-pulse space-y-4">
                        <div className="h-32 bg-slate-200 rounded-xl"></div>
                        <div className="h-64 bg-slate-200 rounded-xl"></div>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {/* Stats Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                                <div className="flex items-center gap-3">
                                    <Shield className="h-5 w-5 text-indigo-600" />
                                    <span className="text-sm font-medium text-slate-500">Total Models</span>
                                </div>
                                <p className="text-3xl font-bold mt-2">{models.length}</p>
                            </div>
                            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                                <div className="flex items-center gap-3">
                                    <DollarSign className="h-5 w-5 text-emerald-600" />
                                    <span className="text-sm font-medium text-slate-500">Low Tier (Weekly)</span>
                                </div>
                                <p className="text-3xl font-bold mt-2">{tierCounts['Low'] || 0}</p>
                            </div>
                            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                                <div className="flex items-center gap-3">
                                    <Clock className="h-5 w-5 text-amber-600" />
                                    <span className="text-sm font-medium text-slate-500">High Tier (Bi-Monthly)</span>
                                </div>
                                <p className="text-3xl font-bold mt-2">{tierCounts['High'] || 0}</p>
                            </div>
                        </div>

                        {/* Audit Schedule */}
                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                            <h3 className="text-lg font-bold mb-4">📅 Audit Schedule</h3>
                            <div className="space-y-3">
                                <div className="flex justify-between items-center py-2 border-b border-slate-100">
                                    <span className="font-medium">Efficiency Tier (Low)</span>
                                    <span className="text-sm bg-green-100 text-green-700 px-3 py-1 rounded-full">Weekly (Sundays)</span>
                                </div>
                                <div className="flex justify-between items-center py-2 border-b border-slate-100">
                                    <span className="font-medium">Medium Tier (Mid)</span>
                                    <span className="text-sm bg-amber-100 text-amber-700 px-3 py-1 rounded-full">Monthly (1st)</span>
                                </div>
                                <div className="flex justify-between items-center py-2">
                                    <span className="font-medium">Expensive Tier (High)</span>
                                    <span className="text-sm bg-red-100 text-red-700 px-3 py-1 rounded-full">Bi-Monthly</span>
                                </div>
                            </div>
                        </div>

                        {/* Model Registry */}
                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                            <h3 className="text-lg font-bold mb-4">🤖 Model Registry</h3>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-slate-200">
                                            <th className="text-left py-3 px-4 font-semibold">Model</th>
                                            <th className="text-left py-3 px-4 font-semibold">Provider</th>
                                            <th className="text-left py-3 px-4 font-semibold">Tier</th>
                                            <th className="text-right py-3 px-4 font-semibold">Cost ($/M in)</th>
                                            <th className="text-right py-3 px-4 font-semibold">Cost ($/M out)</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {models.map((model) => (
                                            <tr key={model.id} className="border-b border-slate-100 hover:bg-slate-50">
                                                <td className="py-3 px-4 font-medium">{model.name}</td>
                                                <td className="py-3 px-4">{model.provider}</td>
                                                <td className="py-3 px-4">
                                                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${model.tier === 'High' ? 'bg-red-100 text-red-700' :
                                                            model.tier === 'Mid' ? 'bg-amber-100 text-amber-700' :
                                                                'bg-green-100 text-green-700'
                                                        }`}>
                                                        {model.tier}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-4 text-right font-mono">${model.cost_per_m_in.toFixed(2)}</td>
                                                <td className="py-3 px-4 text-right font-mono">${model.cost_per_m_out.toFixed(2)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </main>
    );
}
