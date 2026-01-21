'use client';

import { useEffect, useState, useMemo } from 'react';
import { Shield, FileText } from 'lucide-react';
import PriceChart from '@/components/PriceChart';
import LatencyChart from '@/components/LatencyChart';
import { AuditRow } from '@/lib/schemas';

type ModelMetadata = {
    id: string;
    name: string;
    provider: string;
    region: string;
    tier: string;
};

type ModelSummary = {
    model: string;
    total_cost: number;
    avg_latency: number;
};

export default function AdminPage() {
    const [data, setData] = useState<AuditRow[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/audit')
            .then(r => r.json())
            .then((json: { data: any[], error?: string }) => {
                if (json.error) {
                    console.error("API Error:", json.error);
                    setLoading(false);
                    return;
                }

                const validRows: AuditRow[] = [];
                json.data.forEach((row: any) => {
                    const mapped: AuditRow = {
                        id: row.case_id || 'unknown',
                        test_date: row.timestamp ? row.timestamp.split('T')[0] : 'Unknown',
                        model: row.model,
                        category: row.category,
                        verdict: row.verdict,
                        prompt_text: row.prompt,
                        response_text: row.response,
                        cost: row.cost || 0,
                        latency_ms: row.latency_ms,
                        tokens_used: row.tokens_used
                    };
                    validRows.push(mapped);
                });

                setData(validRows.filter(r => r.model));
                setLoading(false);
            })
            .catch(e => {
                console.error("Init error", e);
                setLoading(false);
            });
    }, []);

    const summary = useMemo(() => {
        const agg: Record<string, { total: number, cost: number, latency: number }> = {};

        data.forEach(r => {
            if (!agg[r.model]) agg[r.model] = { total: 0, cost: 0, latency: 0 };
            agg[r.model].total++;
            agg[r.model].cost += (r.cost || 0);
            agg[r.model].latency += (r.latency_ms || 0);
        });

        return Object.entries(agg).map(([model, stats]) => ({
            model,
            total_cost: stats.cost,
            avg_latency: stats.total > 0 ? Math.round(stats.latency / stats.total) : 0
        }));
    }, [data]);

    return (
        <main className="min-h-screen bg-slate-50 text-slate-900 p-8 font-sans">
            <div className="max-w-7xl mx-auto space-y-8">

                {/* Header */}
                <header className="border-b border-slate-200 pb-6">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-slate-800 rounded-lg">
                            <Shield className="h-6 w-6 text-white" />
                        </div>
                        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
                            Administrative Dashboard
                        </h1>
                    </div>
                    <p className="text-lg text-slate-500 font-medium">
                        Operational metrics including estimated costs and API latency performance.
                    </p>
                </header>

                {loading ? (
                    <div className="flex justify-center items-center h-64">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <PriceChart data={summary.map(s => ({ model: s.model, cost: s.total_cost }))} />
                        <LatencyChart data={summary.map(s => ({ model: s.model, latency: s.avg_latency }))} />
                    </div>
                )}
            </div>
        </main>
    );
}
