'use client';

import { useEffect, useState, useMemo } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { DataTable, SortableHeader } from '@/components/ui/DataTable';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import { ShieldCheck, AlertTriangle, Printer, Loader2 } from 'lucide-react';

type AuditRow = {
    timestamp: string;
    model: string;
    case_id: string;
    category: string;
    verdict: string;
    prompt: string;
    response: string;
};

// Define columns for the DataTable
const columns: ColumnDef<AuditRow>[] = [
    {
        accessorKey: 'timestamp',
        header: ({ column }) => <SortableHeader column={column} title="Date" />,
        cell: ({ row }) => new Date(row.getValue('timestamp')).toLocaleDateString(),
    },
    {
        accessorKey: 'model',
        header: ({ column }) => <SortableHeader column={column} title="Model" />,
        cell: ({ row }) => {
            const model = row.getValue('model') as string;
            return <span className="font-medium">{model?.split('/')[1] || model}</span>;
        }
    },
    {
        accessorKey: 'category',
        header: ({ column }) => <SortableHeader column={column} title="Category" />,
        cell: ({ row }) => (
            <span className="px-2 py-1 text-xs bg-slate-100 dark:bg-slate-700 rounded-full">
                {row.getValue('category')}
            </span>
        ),
    },
    {
        accessorKey: 'verdict',
        header: ({ column }) => <SortableHeader column={column} title="Verdict" />,
        cell: ({ row }) => {
            const verdict = row.getValue('verdict') as string;
            const isRefusal = verdict === 'REMOVED' || verdict === 'REFUSAL' || verdict === 'unsafe';
            return (
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${isRefusal ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                    }`}>
                    {verdict}
                </span>
            );
        },
    },
    {
        accessorKey: 'prompt',
        header: 'Prompt',
        cell: ({ row }) => {
            const prompt = row.getValue('prompt') as string;
            return (
                <div className="max-w-xs truncate text-xs text-slate-500 dark:text-slate-400" title={prompt}>
                    {prompt || 'N/A'}
                </div>
            );
        },
    },
];

// Expanded row renderer
function ExpandedRowContent({ row }: { row: AuditRow }) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                <h4 className="font-semibold text-slate-700 dark:text-slate-200 mb-2">Prompt</h4>
                <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap bg-slate-100 dark:bg-slate-800 p-3 rounded-md max-h-48 overflow-y-auto">
                    {row.prompt || 'No prompt available'}
                </p>
            </div>
            <div>
                <h4 className="font-semibold text-slate-700 dark:text-slate-200 mb-2">Response</h4>
                <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap bg-slate-100 dark:bg-slate-800 p-3 rounded-md max-h-48 overflow-y-auto">
                    {row.response || 'No response available'}
                </p>
            </div>
        </div>
    );
}

export default function ReportPage() {
    const [data, setData] = useState<AuditRow[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/audit')
            .then(r => r.json())
            .then(res => {
                // Filter out ERROR verdicts (broken models)
                const cleanData = (res.data || []).filter((r: AuditRow) => r.verdict !== 'ERROR');
                setData(cleanData);
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
        const refusals = data.filter(r => r.verdict === 'REFUSAL' || r.verdict === 'REMOVED' || r.verdict === 'unsafe').length;
        const refusalRate = (refusals / total) * 100;
        const safetyScore = Math.max(0, 100 - refusalRate);

        // Categories
        const catCounts: Record<string, number> = {};
        data.filter(r => r.verdict === 'REFUSAL' || r.verdict === 'REMOVED' || r.verdict === 'unsafe').forEach(r => {
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
        <main className="min-h-screen bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-sans p-8 md:p-12 print:p-0">
            <div className="max-w-6xl mx-auto space-y-8">
                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-4xl font-extrabold tracking-tight">Action Report</h1>
                        <p className="text-lg text-slate-500 mt-1">Executive summary, key findings, and full audit log.</p>
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

                <hr className="border-slate-200 dark:border-slate-700" />

                {/* Scorecard */}
                <div className="max-w-md">
                    <div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-2xl border border-slate-100 dark:border-slate-700">
                        <div className="flex items-center gap-2 mb-2">
                            <AlertTriangle className="h-5 w-5 text-slate-400" />
                            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">Refusal Rate</h3>
                        </div>
                        <div className="text-5xl font-extrabold text-slate-700 dark:text-slate-200">
                            {stats?.refusalRate.toFixed(1)}%
                        </div>
                        <p className="text-sm text-slate-400 mt-2">{stats?.refusals} flagged out of {stats?.total} • % of REMOVED/REFUSAL verdicts</p>
                    </div>
                </div>

                {/* Findings */}
                <section>
                    <h2 className="text-2xl font-bold mb-6">Top Safety Risks</h2>
                    <div className="h-80 w-full bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl p-4">
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
                </section>



                {/* Audit Log Section */}
                <section className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-6">
                    <h2 className="text-2xl font-bold mb-6">Audit Log</h2>
                    <DataTable
                        columns={columns}
                        data={data}
                        searchKey="prompt"
                        renderExpanded={(row) => <ExpandedRowContent row={row} />}
                        exportFilename="audit_log"
                    />
                </section>
            </div>

            {/* Print Footer */}
            <div className="hidden print:block fixed bottom-8 left-0 right-0 text-center text-xs text-slate-300">
                Confidential - Internal Use Only - Generated by Antigravity
            </div>
        </main>
    );
}
