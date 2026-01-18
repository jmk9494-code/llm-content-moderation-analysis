'use client';

import { useEffect, useState, useMemo } from 'react';
import Papa from 'papaparse';
import {
    createColumnHelper,
    flexRender,
    getCoreRowModel,
    useReactTable,
    getPaginationRowModel,
    SortingState
} from '@tanstack/react-table';
import { ChevronDown, ChevronRight, Search, Filter, X, RotateCcw, ChevronLeft, Download } from 'lucide-react';
import Link from 'next/link';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import ModelLogo from '@/components/ModelLogo';
import { AuditRowSchema, AuditRow } from '@/lib/schemas';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

type ModelMetadata = {
    id: string;
    provider: string;
    region: string;
    tier: string;
};

export default function AuditPage() {
    const [data, setData] = useState<AuditRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [modelsMeta, setModelsMeta] = useState<ModelMetadata[]>([]);

    // Table States
    const [auditSorting, setAuditSorting] = useState<SortingState>([{ id: 'test_date', desc: true }]);
    const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

    const toggleRow = (id: string) => {
        setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }));
    };

    useEffect(() => {
        fetch('/models.json')
            .then(r => r.json())
            .then(meta => {
                setModelsMeta(meta);
                return fetch('/audit_log.csv')
                    .then(r => r.text())
                    .then(csv => {
                        const parsed = Papa.parse(csv, { header: true, dynamicTyping: true });
                        const validRows: AuditRow[] = [];
                        parsed.data.forEach((row: any) => {
                            const result = AuditRowSchema.safeParse(row);
                            if (result.success) validRows.push(result.data);
                        });
                        setData(validRows.filter(r => r.model));
                        setLoading(false);
                    });
            })
            .catch(e => console.log("Init error", e));
    }, []);

    // --- Filtering Config ---
    const [selectedDate, setSelectedDate] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [modelFilter, setModelFilter] = useState<string>('All');

    const uniqueDates = useMemo(() => Array.from(new Set(data.map(r => r.test_date))).sort().reverse(), [data]);
    const uniqueModels = useMemo(() => Array.from(new Set(data.map(r => r.model))).sort(), [data]);

    const filteredData = useMemo(() => {
        let res = data;
        if (selectedDate !== 'all') res = res.filter(r => r.test_date === selectedDate);
        if (modelFilter !== 'All') res = res.filter(r => r.model === modelFilter);
        if (searchQuery) {
            const lower = searchQuery.toLowerCase();
            res = res.filter(r =>
                (r.prompt_text && r.prompt_text.toLowerCase().includes(lower)) ||
                (r.response_text && r.response_text.toLowerCase().includes(lower)) ||
                (r.category && r.category.toLowerCase().includes(lower)) ||
                (r.model && r.model.toLowerCase().includes(lower))
            );
        }
        return res;
    }, [data, selectedDate, searchQuery, modelFilter]);

    // --- Audit Config ---
    const auditHelper = createColumnHelper<AuditRow>();
    const auditColumns = [
        auditHelper.display({
            id: 'expander',
            header: () => null,
            cell: ({ row }) => (
                <button onClick={() => toggleRow(row.id)} className="p-1 hover:bg-slate-100 rounded">
                    {expandedRows[row.id] ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
                </button>
            ),
        }),
        auditHelper.accessor('test_date', {
            header: 'Date',
            cell: info => <span className="text-slate-500 whitespace-nowrap">{info.getValue()}</span>,
        }),
        auditHelper.accessor('model', {
            header: 'Model',
            cell: info => {
                const provider = modelsMeta.find(m => m.id === info.getValue())?.provider || 'Unknown';
                return (
                    <div className="flex items-center gap-2">
                        <ModelLogo provider={provider} name={info.getValue()} className="h-5 w-5" />
                        <span className="font-medium text-slate-700">{info.getValue().split('/')[1] || info.getValue()}</span>
                    </div>
                );
            },
        }),
        auditHelper.accessor('category', {
            header: 'Category',
            cell: info => <span className="text-slate-600">{info.getValue()}</span>,
        }),
        auditHelper.accessor('verdict', {
            header: 'Verdict',
            cell: info => {
                const val = info.getValue();
                let colorClass = "bg-emerald-100 text-emerald-700";
                if (val === 'REMOVED') colorClass = "bg-red-100 text-red-700";
                else if (val === 'REFUSAL') colorClass = "bg-orange-100 text-orange-700";
                else if (val === 'BLOCKED') colorClass = "bg-slate-800 text-white";

                return (
                    <span className={cn("px-2 py-1 rounded text-xs font-bold uppercase", colorClass)}>
                        {val}
                    </span>
                );
            },
        }),
    ];

    const auditTable = useReactTable({
        data: filteredData,
        columns: auditColumns,
        state: { sorting: auditSorting },
        onSortingChange: setAuditSorting,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        initialState: { pagination: { pageSize: 20 } },
    });

    return (
        <main className="min-h-screen bg-slate-50 text-slate-900 p-8 font-sans">
            <div className="max-w-7xl mx-auto space-y-8">

                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
                    <div>
                        <Link href="/dashboard" className="text-xs font-bold uppercase tracking-wider text-indigo-600 mb-1 block">← Back to Dashboard</Link>
                        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Global Audit Log</h1>
                        <p className="text-slate-500 mt-2">Raw record of every prompt, response, and verdict.</p>
                    </div>
                    <a
                        href="/audit_log.csv"
                        download="audit_log.csv"
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium transition-colors shadow-sm"
                    >
                        <Download className="h-4 w-4" />
                        Download CSV
                    </a>
                </div>

                {/* Filters */}
                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col md:flex-row gap-4 items-center justify-between">
                    <div className="relative w-full md:w-96">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search className="h-4 w-4 text-slate-400" />
                        </div>
                        <input
                            type="text"
                            placeholder="Search prompts, responses, or models..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full bg-slate-50"
                        />
                    </div>

                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <select
                            value={modelFilter}
                            onChange={(e) => setModelFilter(e.target.value)}
                            className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                            <option value="All">All Models</option>
                            {uniqueModels.map(m => (
                                <option key={m} value={m}>{m.split('/')[1] || m}</option>
                            ))}
                        </select>

                        <select
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                            <option value="all">All Dates</option>
                            {uniqueDates.map(d => (
                                <option key={d} value={d}>{d}</option>
                            ))}
                        </select>

                        {(modelFilter !== 'All' || selectedDate !== 'all' || searchQuery) && (
                            <button
                                onClick={() => {
                                    setModelFilter('All');
                                    setSelectedDate('all');
                                    setSearchQuery('');
                                }}
                                className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                            >
                                <RotateCcw className="h-4 w-4" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Table */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider font-semibold border-b border-slate-200">
                                {auditTable.getHeaderGroups().map(headerGroup => (
                                    <tr key={headerGroup.id}>
                                        {headerGroup.headers.map(header => (
                                            <th key={header.id} className="px-6 py-3 cursor-pointer hover:bg-slate-100" onClick={header.column.getToggleSortingHandler()}>
                                                <div className="flex items-center gap-1">
                                                    {flexRender(header.column.columnDef.header, header.getContext())}
                                                    {{
                                                        asc: ' 🔼',
                                                        desc: ' 🔽',
                                                    }[header.column.getIsSorted() as string] ?? null}
                                                </div>
                                            </th>
                                        ))}
                                    </tr>
                                ))}
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-sm">
                                {loading ? (
                                    <tr><td colSpan={5} className="p-12 text-center text-slate-400">Loading audit data...</td></tr>
                                ) : auditTable.getRowModel().rows.map(row => (
                                    <>
                                        <tr key={row.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => toggleRow(row.id)}>
                                            {row.getVisibleCells().map(cell => (
                                                <td key={cell.id} className="px-6 py-3">
                                                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                                </td>
                                            ))}
                                        </tr>
                                        {expandedRows[row.id] && (
                                            <tr className="bg-slate-50/50">
                                                <td colSpan={auditColumns.length} className="px-6 py-4">
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white p-4 rounded-xl border border-slate-200 shadow-sm animate-in fade-in duration-200">
                                                        <div>
                                                            <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Prompt (User)</div>
                                                            <div className="p-3 bg-slate-50 rounded-lg text-slate-700 text-sm font-mono whitespace-pre-wrap max-h-60 overflow-y-auto">
                                                                {row.original.prompt_text}
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Response (AI)</div>
                                                            <div className={cn("p-3 rounded-lg text-sm whitespace-pre-wrap border max-h-60 overflow-y-auto",
                                                                row.original.verdict === 'REMOVED' ? "bg-red-50 border-red-100 text-red-800" :
                                                                    (row.original.verdict === 'REFUSAL' ? "bg-orange-50 border-orange-100 text-orange-800" :
                                                                        (row.original.verdict === 'BLOCKED' ? "bg-slate-800 text-white" : "bg-emerald-50 border-emerald-100 text-emerald-800"))
                                                            )}>
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
                            Showing {auditTable.getState().pagination.pageSize} rows per page
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => auditTable.previousPage()} disabled={!auditTable.getCanPreviousPage()} className="p-2 border bg-white rounded hover:bg-slate-50 disabled:opacity-50"><ChevronLeft className="h-4 w-4" /></button>
                            <span className="flex items-center px-4 text-sm font-medium">Page {auditTable.getState().pagination.pageIndex + 1} of {auditTable.getPageCount()}</span>
                            <button onClick={() => auditTable.nextPage()} disabled={!auditTable.getCanNextPage()} className="p-2 border bg-white rounded hover:bg-slate-50 disabled:opacity-50"><ChevronRight className="h-4 w-4" /></button>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}
