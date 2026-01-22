'use client';

import { useEffect, useState } from 'react';
import { Settings, Shield, DollarSign } from 'lucide-react';

type ModelInfo = {
    id: string;
    name: string;
    provider: string;
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
                        Manage models and monitor capabilities.
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
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                                    <span className="text-sm font-medium text-slate-500">Average Cost (In)</span>
                                </div>
                                <p className="text-3xl font-bold mt-2">
                                    ${(models.reduce((a, b) => a + b.cost_per_m_in, 0) / models.length).toFixed(2)}
                                </p>
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
                                            <th className="text-right py-3 px-4 font-semibold">Cost ($/M in)</th>
                                            <th className="text-right py-3 px-4 font-semibold">Cost ($/M out)</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {models.map((model) => (
                                            <tr key={model.id} className="border-b border-slate-100 hover:bg-slate-50">
                                                <td className="py-3 px-4 font-medium">{model.name}</td>
                                                <td className="py-3 px-4">{model.provider}</td>
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
