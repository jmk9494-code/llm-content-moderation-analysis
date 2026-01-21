'use client';

import { useEffect, useState, useMemo } from 'react';
import { Shield, DollarSign, ThumbsUp, ThumbsDown, MessageSquare, TrendingUp, AlertCircle, Settings } from 'lucide-react';
import { DataTable, SortableHeader } from '@/components/ui/DataTable';
import { ColumnDef } from '@tanstack/react-table';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts';

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

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

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
        cell: ({ row }) => {
            const model = row.getValue('model') as string;
            return <span className="font-medium">{model?.split('/')[1] || model}</span>;
        }
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
            const isRefusal = verdict === 'REMOVED' || verdict === 'REFUSAL' || verdict === 'unsafe';
            return (
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${isRefusal ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                    {verdict}
                </span>
            );
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
    const [activeTab, setActiveTab] = useState<'overview' | 'feedback' | 'cost'>('overview');

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

    // Cost analytics
    const costStats = useMemo(() => {
        const modelCosts: Record<string, { cost: number; count: number }> = {};
        let totalCost = 0;

        data.forEach(r => {
            if (!modelCosts[r.model]) modelCosts[r.model] = { cost: 0, count: 0 };
            modelCosts[r.model].cost += (r.cost || 0);
            modelCosts[r.model].count++;
            totalCost += (r.cost || 0);
        });

        const modelData = Object.entries(modelCosts)
            .map(([model, stats]) => ({
                name: model.split('/')[1] || model,
                fullName: model,
                cost: stats.cost,
                count: stats.count,
                avgCost: stats.count > 0 ? stats.cost / stats.count : 0
            }))
            .sort((a, b) => b.cost - a.cost);

        return { totalCost, modelData };
    }, [data]);

    // Verdict distribution
    const verdictStats = useMemo(() => {
        const counts: Record<string, number> = {};
        data.forEach(r => {
            const v = r.verdict === 'REMOVED' || r.verdict === 'REFUSAL' || r.verdict === 'unsafe' ? 'Refused' : 'Allowed';
            counts[v] = (counts[v] || 0) + 1;
        });
        return Object.entries(counts).map(([name, value]) => ({ name, value }));
    }, [data]);

    return (
        <main className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 p-8 font-sans">
            <div className="max-w-7xl mx-auto space-y-8">

                {/* Header */}
                <header className="border-b border-slate-200 dark:border-slate-700 pb-6">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-slate-800 dark:bg-indigo-600 rounded-lg">
                            <Settings className="h-6 w-6 text-white" />
                        </div>
                        <h1 className="text-3xl font-extrabold tracking-tight">
                            ⚙️ Admin Dashboard
                        </h1>
                    </div>
                    <p className="text-lg text-slate-500 dark:text-slate-400 font-medium">
                        Manage prompt feedback, review costs, and monitor operational metrics.
                    </p>
                </header>

                {/* Tab Navigation */}
                <div className="flex gap-2 border-b border-slate-200 dark:border-slate-700">
                    <TabButton active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} icon={<TrendingUp className="w-4 h-4" />}>
                        Overview
                    </TabButton>
                    <TabButton active={activeTab === 'feedback'} onClick={() => setActiveTab('feedback')} icon={<MessageSquare className="w-4 h-4" />}>
                        Prompt Feedback
                    </TabButton>
                    <TabButton active={activeTab === 'cost'} onClick={() => setActiveTab('cost')} icon={<DollarSign className="w-4 h-4" />}>
                        Cost Management
                    </TabButton>
                </div>

                {loading ? (
                    <div className="flex justify-center items-center h-64">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                    </div>
                ) : (
                    <>
                        {activeTab === 'overview' && (
                            <div className="space-y-6">
                                {/* Stats Cards */}
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                    <StatCard title="Total Audits" value={data.length.toLocaleString()} icon={<Shield className="h-5 w-5 text-indigo-600" />} />
                                    <StatCard title="Total Cost" value={`$${costStats.totalCost.toFixed(4)}`} icon={<DollarSign className="h-5 w-5 text-emerald-600" />} />
                                    <StatCard title="Models Tested" value={costStats.modelData.length.toString()} icon={<TrendingUp className="h-5 w-5 text-blue-600" />} />
                                    <StatCard title="Avg Cost/Audit" value={`$${(costStats.totalCost / data.length).toFixed(6)}`} icon={<AlertCircle className="h-5 w-5 text-amber-600" />} />
                                </div>

                                {/* Charts */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700">
                                        <h3 className="font-bold mb-4">Verdict Distribution</h3>
                                        <div className="h-64">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <PieChart>
                                                    <Pie data={verdictStats} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                                                        {verdictStats.map((_, index) => (
                                                            <Cell key={`cell-${index}`} fill={index === 0 ? '#10b981' : '#ef4444'} />
                                                        ))}
                                                    </Pie>
                                                    <Tooltip />
                                                    <Legend />
                                                </PieChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>
                                    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700">
                                        <h3 className="font-bold mb-4">Cost by Model</h3>
                                        <div className="h-64">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart data={costStats.modelData.slice(0, 8)} layout="vertical">
                                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                                    <XAxis type="number" tickFormatter={v => `$${v.toFixed(2)}`} />
                                                    <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 11 }} />
                                                    <Tooltip formatter={(v: any) => `$${v.toFixed(4)}`} />
                                                    <Bar dataKey="cost" radius={[0, 4, 4, 0]}>
                                                        {costStats.modelData.slice(0, 8).map((_, index) => (
                                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                        ))}
                                                    </Bar>
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>
                                </div>

                                {/* Audit Log */}
                                <section className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm p-6">
                                    <h2 className="text-xl font-semibold mb-4">Detailed Audit Log</h2>
                                    <DataTable columns={columns} data={data} searchKey="prompt" />
                                </section>
                            </div>
                        )}

                        {activeTab === 'feedback' && (
                            <div className="space-y-6">
                                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-100 dark:border-blue-800">
                                    <h3 className="font-bold text-blue-800 dark:text-blue-300 flex items-center gap-2 mb-2">
                                        <MessageSquare className="w-4 h-4" /> Prompt Feedback System
                                    </h3>
                                    <p className="text-sm text-blue-700 dark:text-blue-400">
                                        Review model responses and provide feedback to improve moderation quality.
                                        Vote on whether the model's verdict was appropriate for each prompt.
                                    </p>
                                </div>

                                {/* Feedback Queue */}
                                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
                                    <h3 className="font-bold mb-4 flex items-center gap-2">
                                        <MessageSquare className="h-5 w-5 text-indigo-500" />
                                        Feedback Queue
                                    </h3>
                                    <div className="space-y-4">
                                        {data.slice(0, 5).map((row, idx) => (
                                            <div key={idx} className="p-4 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
                                                <div className="flex justify-between items-start mb-3">
                                                    <div>
                                                        <span className="text-xs font-bold uppercase text-slate-500">{row.category}</span>
                                                        <span className="mx-2 text-slate-300">•</span>
                                                        <span className="text-xs text-slate-400">{row.model.split('/')[1]}</span>
                                                    </div>
                                                    <span className={`px-2 py-1 text-xs font-bold rounded ${row.verdict === 'ALLOWED' || row.verdict === 'safe' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                        {row.verdict}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-slate-600 dark:text-slate-300 mb-4 line-clamp-2">{row.prompt}</p>
                                                <div className="flex gap-2">
                                                    <button className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors">
                                                        <ThumbsUp className="h-3 w-3" /> Agree
                                                    </button>
                                                    <button className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors">
                                                        <ThumbsDown className="h-3 w-3" /> Disagree
                                                    </button>
                                                    <button className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors">
                                                        Skip
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'cost' && (
                            <div className="space-y-6">
                                <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-lg border border-amber-100 dark:border-amber-800">
                                    <h3 className="font-bold text-amber-800 dark:text-amber-300 flex items-center gap-2 mb-2">
                                        <DollarSign className="w-4 h-4" /> Cost Management
                                    </h3>
                                    <p className="text-sm text-amber-700 dark:text-amber-400">
                                        Track API costs across models and optimize your moderation budget.
                                        Set alerts and monitor spending trends.
                                    </p>
                                </div>

                                {/* Cost Summary */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700">
                                        <div className="text-sm text-slate-500 mb-1">Total Spend</div>
                                        <div className="text-3xl font-bold text-emerald-600">${costStats.totalCost.toFixed(4)}</div>
                                    </div>
                                    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700">
                                        <div className="text-sm text-slate-500 mb-1">Avg per Audit</div>
                                        <div className="text-3xl font-bold text-indigo-600">${(costStats.totalCost / data.length || 0).toFixed(6)}</div>
                                    </div>
                                    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700">
                                        <div className="text-sm text-slate-500 mb-1">Most Expensive Model</div>
                                        <div className="text-2xl font-bold text-amber-600">{costStats.modelData[0]?.name || 'N/A'}</div>
                                    </div>
                                </div>

                                {/* Cost Table */}
                                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
                                    <h3 className="font-bold mb-4">Cost Breakdown by Model</h3>
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b border-slate-200 dark:border-slate-700">
                                                <th className="text-left py-2 font-semibold text-slate-600 dark:text-slate-300">Model</th>
                                                <th className="text-right py-2 font-semibold text-slate-600 dark:text-slate-300">Audits</th>
                                                <th className="text-right py-2 font-semibold text-slate-600 dark:text-slate-300">Total Cost</th>
                                                <th className="text-right py-2 font-semibold text-slate-600 dark:text-slate-300">Avg/Audit</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {costStats.modelData.map((m, idx) => (
                                                <tr key={idx} className="border-b border-slate-100 dark:border-slate-700/50">
                                                    <td className="py-2 font-medium">{m.name}</td>
                                                    <td className="py-2 text-right text-slate-500">{m.count}</td>
                                                    <td className="py-2 text-right font-mono">${m.cost.toFixed(4)}</td>
                                                    <td className="py-2 text-right font-mono text-slate-500">${m.avgCost.toFixed(6)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </main>
    );
}

// Sub-components
function TabButton({ active, onClick, children, icon }: any) {
    return (
        <button
            onClick={onClick}
            className={`
                flex items-center gap-2 px-4 py-3 text-sm font-medium rounded-t-lg border-b-2 transition-all
                ${active
                    ? 'border-indigo-500 text-indigo-600 bg-indigo-50/50 dark:bg-indigo-900/20 dark:text-indigo-400'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800'}
            `}
        >
            {icon}
            {children}
        </button>
    );
}

function StatCard({ title, value, icon }: { title: string; value: string; icon: React.ReactNode }) {
    return (
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
                {icon}
                {title}
            </div>
            <div className="text-2xl font-bold">{value}</div>
        </div>
    );
}
