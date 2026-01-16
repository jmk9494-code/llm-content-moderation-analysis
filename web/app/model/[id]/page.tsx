'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import Papa from 'papaparse';
import {
    createColumnHelper,
    flexRender,
    getCoreRowModel,
    useReactTable,
    getSortedRowModel,
    getPaginationRowModel,
    SortingState
} from '@tanstack/react-table';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    PieChart, Pie, Cell
} from 'recharts';
import { ArrowLeft, Shield, AlertTriangle, CheckCircle, XCircle, ChevronDown, ChevronRight, ChevronLeft } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import Link from 'next/link';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

// --- Types ---
type AuditRow = {
    test_date: string;
    model: string;
    category: string;
    verdict: string;
    run_cost: number;
    prompt_text: string;
    response_text: string;
};

// --- Colors ---
const COLORS = ['#10b981', '#ef4444']; // Green, Red

export default function ModelPage({ params }: { params: Promise<{ id: string }> }) {
    const [unwrappedParams, setUnwrappedParams] = useState<{ id: string } | null>(null);
    // Unwrap params (Next.js 15+ async params)
    useEffect(() => {
        params.then(setUnwrappedParams);
    }, [params]);

    const [data, setData] = useState<AuditRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [sorting, setSorting] = useState<SortingState>([{ id: 'test_date', desc: true }]);
    const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

    const modelId = unwrappedParams ? decodeURIComponent(unwrappedParams.id) : '';

    useEffect(() => {
        if (!modelId) return;

        fetch('/audit_log.csv')
            .then(r => r.text())
            .then(csv => {
                const parsed = Papa.parse<AuditRow>(csv, { header: true, dynamicTyping: true });
                // Filter for THIS model
                const rows = parsed.data.filter(r => r.model === modelId);
                setData(rows);
                setLoading(false);
            });
    }, [modelId]);

    const toggleRow = (id: string) => {
        setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }));
    };

    // --- Stats ---
    const total = data.length;
    const refusals = data.filter(r => r.verdict === 'REMOVED').length;
    const allowed = total - refusals;
    const refusalRate = total ? (refusals / total) * 100 : 0;

    // Breakdown by Category
    const catStats = data.reduce((acc, curr) => {
        if (!acc[curr.category]) acc[curr.category] = { total: 0, refusals: 0 };
        acc[curr.category].total++;
        if (curr.verdict === 'REMOVED') acc[curr.category].refusals++;
        return acc;
    }, {} as Record<string, { total: number, refusals: number }>);

    const chartData = Object.entries(catStats).map(([cat, stat]) => ({
        name: cat,
        rate: (stat.refusals / stat.total) * 100
    }));

    // --- Table ---
    const columnHelper = createColumnHelper<AuditRow>();
    const columns = [
        columnHelper.display({
            id: 'expander',
            header: () => null,
            cell: ({ row }) => (
                <button onClick={() => toggleRow(row.id)} className="p-1 hover:bg-slate-100 rounded">
                    {expandedRows[row.id] ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
                </button>
            ),
        }),
        columnHelper.accessor('test_date', {
            header: 'Date',
            cell: info => <span className="text-slate-500 whitespace-nowrap">{info.getValue()}</span>,
        }),
        columnHelper.accessor('category', {
            header: 'Category',
            cell: info => <span className="text-slate-600 font-medium">{info.getValue()}</span>,
        }),
        columnHelper.accessor('verdict', {
            header: 'Verdict',
            cell: info => (
                <span className={cn("px-2 py-1 rounded text-xs font-bold uppercase",
                    info.getValue() === 'REMOVED' ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700")}>
                    {info.getValue()}
                </span>
            ),
        }),
        columnHelper.accessor('prompt_text', {
            header: 'Prompt Snippet',
            cell: info => <span className="text-slate-400 italic truncate block max-w-xs">{info.getValue()}</span>
        })
    ];

    const table = useReactTable({
        data,
        columns,
        state: { sorting },
        onSortingChange: setSorting,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        initialState: { pagination: { pageSize: 10 } },
    });

    if (!unwrappedParams || loading) return <div className="p-8 text-center text-slate-400">Loading model analysis...</div>;

    return (
        <main className="min-h-screen bg-slate-50 text-slate-900 p-8 font-sans">
            <div className="max-w-5xl mx-auto space-y-8">



                <div className="flex items-center gap-4">
                    <div className="h-12 w-12 bg-white rounded-xl shadow-sm border border-slate-200 flex items-center justify-center font-bold text-xl text-indigo-600">
                        {modelId.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-slate-900">{modelId.split('/')[1] || modelId}</h1>
                        <p className="text-slate-500 font-mono text-sm">{modelId}</p>
                    </div>
                </div>

                {/* High Level Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                        <div>
                            <div className="text-sm font-medium text-slate-500 uppercase">Censorship Score</div>
                            <div className={cn("text-3xl font-bold", refusalRate > 50 ? "text-red-600" : "text-emerald-600")}>
                                {refusalRate.toFixed(1)}%
                            </div>
                        </div>
                        <div className="h-16 w-16">
                            <ResponsiveContainer>
                                <PieChart>
                                    <Pie data={[{ value: allowed }, { value: refusals }]} innerRadius={20} outerRadius={30} dataKey="value">
                                        {COLORS.map((c, i) => <Cell key={i} fill={c} />)}
                                    </Pie>
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                        <div className="text-sm font-medium text-slate-500 uppercase">Most Sensitive Topic</div>
                        <div className="text-xl font-bold text-slate-800 mt-1">
                            {Object.entries(catStats).sort((a, b) => (b[1].refusals / b[1].total) - (a[1].refusals / a[1].total))[0]?.[0] || 'None'}
                        </div>
                    </div>
                </div>

                {/* Detailed Chart */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <h3 className="text-lg font-semibold mb-6">Refusal Rate by Category</h3>
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData} layout="vertical" margin={{ left: 100, right: 30 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                                <XAxis type="number" unit="%" domain={[0, 100]} />
                                <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 12 }} />
                                <Tooltip cursor={{ fill: '#f1f5f9' }} />
                                <Bar dataKey="rate" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={20} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Deep Dive Log */}
                <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-6 border-b border-slate-100 flex justify-between">
                        <h2 className="text-xl font-semibold">🔍 Audit Inspector</h2>
                        <span className="text-sm text-slate-500">{data.length} records</span>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider font-semibold border-b border-slate-200">
                                {table.getHeaderGroups().map(headerGroup => (
                                    <tr key={headerGroup.id}>
                                        {headerGroup.headers.map(header => (
                                            <th key={header.id} className="px-6 py-3">
                                                {flexRender(header.column.columnDef.header, header.getContext())}
                                            </th>
                                        ))}
                                    </tr>
                                ))}
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-sm">
                                {table.getRowModel().rows.map(row => (
                                    <>
                                        <tr key={row.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => toggleRow(row.id)}>
                                            {row.getVisibleCells().map(cell => (
                                                <td key={cell.id} className="px-6 py-3">
                                                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                                </td>
                                            ))}
                                        </tr>
                                        {/* Expanded Q&A Row */}
                                        {expandedRows[row.id] && (
                                            <tr className="bg-slate-50/50">
                                                <td colSpan={columns.length} className="px-6 py-4">
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                                                        <div>
                                                            <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Prompt (User)</div>
                                                            <div className="p-3 bg-slate-50 rounded-lg text-slate-700 text-sm font-mono whitespace-pre-wrap">
                                                                {row.original.prompt_text}
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Response (AI)</div>
                                                            <div className={cn("p-3 rounded-lg text-sm whitespace-pre-wrap border",
                                                                row.original.verdict === 'REMOVED' ? "bg-red-50 border-red-100 text-red-800" : "bg-emerald-50 border-emerald-100 text-emerald-800")}>
                                                                {row.original.response_text}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {/* Pagination */}
                    <div className="border-t border-slate-200 bg-slate-50 p-4 flex items-center justify-between">
                        <div className="text-sm text-slate-500">
                            Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()} className="p-2 border rounded hover:bg-white disabled:opacity-50"><ChevronLeft className="h-4 w-4" /></button>
                            <button onClick={() => table.nextPage()} disabled={!table.getCanNextPage()} className="p-2 border rounded hover:bg-white disabled:opacity-50"><ChevronRight className="h-4 w-4" /></button>
                        </div>
                    </div>
                </section>

            </div>
        </main>
    );
}
