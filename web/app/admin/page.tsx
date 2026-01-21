'use client';

import { useEffect, useState, useMemo } from 'react';
import { Shield } from 'lucide-react';
import PriceChart from '@/components/PriceChart';
import LatencyChart from '@/components/LatencyChart';
import { DataTable, SortableHeader } from '@/components/ui/DataTable';
import { ColumnDef } from '@tanstack/react-table';

// Reusing a similar shape to Dashboard but keeping it self-contained for now or we could export a shared type
type AdminAuditRow = {
    id: string;
    timestamp: string;
    model: string;
    category: string;
    verdict: string;
    prompt: string;
    response: string;
    cost: number;
    latency_ms: number;
    tokens_used: number;
};

const columns: ColumnDef<AdminAuditRow>[] = [
    {
        accessorKey: 'timestamp',
        header: ({ column }) => <SortableHeader column={column} title="Date" />,
        cell: ({ row }) => {
            const val = row.getValue('timestamp') as string;
            return val ? new Date(val).toLocaleDateString() : 'Unknown';
        }
    },
    {
        accessorKey: 'model',
        header: ({ column }) => <SortableHeader column={column} title="Model" />,
    },
    {
        accessorKey: 'category',
        header: ({ column }) => <SortableHeader column={column} title="Category" />,
    },
    {
        accessorKey: 'verdict',
        header: ({ column }) => <SortableHeader column={column} title="Verdict" />,
        cell: ({ row }) => {
            const verdict = row.getValue('verdict') as string;
            // Admin view: highlight usage vs safety differently? Sticking to same coloring for consistency.
            const color = verdict === 'safe' ? 'text-green-600' : verdict === 'unsafe' ? 'text-red-600' : 'text-yellow-600';
            return <span className={`font-medium ${color}`}>{verdict}</span>;
        },
    },
    {
        accessorKey: 'cost',
        header: ({ column }) => <SortableHeader column={column} title="Cost" />,
        cell: ({ row }) => {
            const val = row.getValue('cost') as number;
            return val ? `$${val.toFixed(6)}` : '-';
        },
    },
    {
        accessorKey: 'tokens_used',
        header: ({ column }) => <SortableHeader column={column} title="Tokens" />,
    },
    {
        accessorKey: 'prompt',
        header: 'Prompt',
        cell: ({ row }) => <div className="max-w-xs truncate text-xs text-slate-500" title={row.getValue('prompt')}>{row.getValue('prompt')}</div>,
    },
];

export default function AdminPage() {
    const [data, setData] = useState<AdminAuditRow[]>([]);
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

                const validRows: AdminAuditRow[] = [];
                if (json.data) {
                    json.data.forEach((row: any) => {
                        const mapped: AdminAuditRow = {
                            id: row.case_id || 'unknown',
                            timestamp: row.timestamp,
                            model: row.model,
                            category: row.category,
                            verdict: row.verdict,
                            prompt: row.prompt,
                            response: row.response,
                            cost: row.cost || 0,
                            latency_ms: row.latency_ms,
                            tokens_used: row.tokens_used
                        };
                        validRows.push(mapped);
                    });
                }

                setData(validRows);
                setLoading(false);
            })
            .catch(e => {
                console.error("Init error", e);
                setLoading(false);
            });
    }, []);

    const chartData = useMemo(() => {
        const agg: Record<string, { total: number, cost: number, latency: number }> = {};

        data.forEach(r => {
            if (!agg[r.model]) agg[r.model] = { total: 0, cost: 0, latency: 0 };
            agg[r.model].total++;
            agg[r.model].cost += (r.cost || 0);
            agg[r.model].latency += (r.latency_ms || 0);
        });

        return Object.entries(agg).map(([model, stats]) => ({
            model,
            cost: stats.cost,
            latency: stats.total > 0 ? Math.round(stats.latency / stats.total) : 0
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
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <PriceChart data={chartData} />
                            <LatencyChart data={chartData} />
                        </div>

                        <section className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
                            <h2 className="text-xl font-semibold mb-4">Detailed Audit Log</h2>
                            <DataTable columns={columns} data={data} searchKey="prompt" />
                        </section>
                    </>
                )}
            </div>
        </main>
    );
}
