'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
// import Papa from 'papaparse'; // Removed: Switched to server-side API
import {
    createColumnHelper,
    flexRender,
    getCoreRowModel,
    useReactTable,
    SortingState
} from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import { ChevronDown, ChevronRight, Search, RotateCcw, Download } from 'lucide-react';
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

    // Virtualizer Ref
    const tableContainerRef = useRef<HTMLDivElement>(null);

    const toggleRow = (id: string) => {
        setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }));
    };

    useEffect(() => {
        setLoading(true);
        // Fetch models metadata for logos/names
        fetch('/models.json')
            .then(r => r.json())
            .then(meta => {
                setModelsMeta(meta);

                // Fetch audit data from our new SQLite-backed API
                // This replaces the heavy client-side CSV parsing
                return fetch('/api/audit')
                    .then(r => r.json())
                    .then((json: { data: any[], error?: string }) => {
                        if (json.error) {
                            console.error("API Error:", json.error);
                            return;
                        }

                        const validRows: AuditRow[] = [];
                        json.data.forEach((row: any) => {
                            // Map database columns to frontend schema if needed
                            // The SQL query aliases match our schema mostly:
                            // timestamp -> test_date (needs rename or schema update)
                            // To fit existing schema, we map here:
                            const mappedRow = {
                                ...row,
                                test_date: row.timestamp ? row.timestamp.split('T')[0] : 'Unknown', // Simple date extraction
                                prompt_text: row.prompt,
                                response_text: row.response
                            };

                            // Optional: Zod validation
                            const result = AuditRowSchema.safeParse(mappedRow);
                            if (result.success) {
                                validRows.push(result.data);
                            } else {
                                // Fallback for loose schema matching if safeParse is too strict on exact types
                                // For now, we trust the DB query returns the right shape roughly
                                validRows.push(mappedRow as AuditRow);
                            }
                        });

                        setData(validRows.filter(r => r.model));
                        setLoading(false);
                    });
            })
            .catch(e => {
                console.error("Init error", e);
                setLoading(false);
            });
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
                <button onClick={() => toggleRow(row.id)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors">
                    {expandedRows[row.id] ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
                </button>
            ),
            size: 40,
        }),
        auditHelper.accessor('test_date', {
            header: 'Date',
            cell: info => <span className="text-slate-500 dark:text-slate-400 whitespace-nowrap">{info.getValue()}</span>,
            size: 100,
        }),
        auditHelper.accessor('model', {
            header: 'Model',
            cell: info => {
                const provider = modelsMeta.find(m => m.id === info.getValue())?.provider || 'Unknown';
                return (
                    <div className="flex items-center gap-2">
                        <ModelLogo provider={provider} name={info.getValue()} className="h-5 w-5" />
                        <span className="font-medium text-slate-700 dark:text-slate-200">{info.getValue().split('/')[1] || info.getValue()}</span>
                    </div>
                );
            },
            size: 180,
        }),
        auditHelper.accessor('category', {
            header: 'Category',
            cell: info => <span className="text-slate-600 dark:text-slate-400">{info.getValue()}</span>,
            size: 150,
        }),
        auditHelper.accessor('verdict', {
            header: 'Verdict',
            cell: info => {
                const val = info.getValue();
                let colorClass = "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400";
                if (val === 'REMOVED') colorClass = "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
                else if (val === 'REFUSAL') colorClass = "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400";
                else if (val === 'BLOCKED') colorClass = "bg-slate-800 text-white dark:bg-slate-700 dark:text-slate-200";

                return (
                    <span className={cn("px-2 py-1 rounded text-xs font-bold uppercase", colorClass)}>
                        {val}
                    </span>
                );
            },
            size: 100,
        }),
    ];

    const auditTable = useReactTable({
        data: filteredData,
        columns: auditColumns,
        state: { sorting: auditSorting },
        onSortingChange: setAuditSorting,
        getCoreRowModel: getCoreRowModel(),
    });

    const { rows } = auditTable.getRowModel();

    // --- Virtualization ---
    const rowVirtualizer = useVirtualizer({
        count: rows.length,
        getScrollElement: () => tableContainerRef.current,
        estimateSize: (index) => expandedRows[rows[index].id] ? 300 : 54, // Est size: collapsed vs expanded
        overscan: 20,
    });

    return (
        <main className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50 p-4 md:p-8 font-sans transition-colors duration-300">
            <div className="max-w-7xl mx-auto space-y-6">

                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
                    <div>
                        <Link href="/dashboard" className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 mb-1 block">← Back to Dashboard</Link>
                        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Global Audit Log</h1>
                        <p className="text-slate-500 dark:text-slate-400 mt-2">Raw record of every prompt, response, and verdict.</p>
                    </div>
                    <a
                        href="/audit_log.csv"
                        download="audit_log.csv"
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors shadow-sm"
                    >
                        <Download className="h-4 w-4" />
                        Download CSV
                    </a>
                </div>

                {/* Filters */}
                <div className="bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row gap-4 items-center justify-between">
                    <div className="relative w-full md:w-96">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search className="h-4 w-4 text-slate-400" />
                        </div>
                        <input
                            type="text"
                            placeholder="Search prompts, responses, or models..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 pr-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full bg-slate-50 dark:bg-slate-800 dark:text-white transition-colors"
                        />
                    </div>

                    <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
                        <select
                            value={modelFilter}
                            onChange={(e) => setModelFilter(e.target.value)}
                            className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                            <option value="All">All Models</option>
                            {uniqueModels.map(m => (
                                <option key={m} value={m}>{m.split('/')[1] || m}</option>
                            ))}
                        </select>

                        <select
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                                title="Reset Filters"
                            >
                                <RotateCcw className="h-4 w-4" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Virtualized Table */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col h-[600px]">
                    {/* Header Fixed */}
                    <div className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700 grid pr-4" style={{ gridTemplateColumns: '40px 100px 180px 150px 100px' }}>
                        {auditTable.getHeaderGroups().map(headerGroup => (
                            headerGroup.headers.map(header => (
                                <div key={header.id} className="px-6 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors" onClick={header.column.getToggleSortingHandler()}>
                                    <div className="flex items-center gap-1">
                                        {flexRender(header.column.columnDef.header, header.getContext())}
                                        {{
                                            asc: ' 🔼',
                                            desc: ' 🔽',
                                        }[header.column.getIsSorted() as string] ?? null}
                                    </div>
                                </div>
                            ))
                        ))}
                    </div>

                    {/* Scrollable Body */}
                    <div ref={tableContainerRef} className="overflow-y-auto flex-1 w-full relative">
                        {loading ? (
                            <div className="p-12 text-center text-slate-400">Loading audit data...</div>
                        ) : (
                            <div
                                style={{
                                    height: `${rowVirtualizer.getTotalSize()}px`,
                                    width: '100%',
                                    position: 'relative',
                                }}
                            >
                                {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                                    const row = rows[virtualRow.index];
                                    const isExpanded = expandedRows[row.id];

                                    return (
                                        <div
                                            key={row.id}
                                            style={{
                                                position: 'absolute',
                                                top: 0,
                                                left: 0,
                                                width: '100%',
                                                height: `${virtualRow.size}px`,
                                                transform: `translateY(${virtualRow.start}px)`,
                                            }}
                                            className="border-b border-slate-100 dark:border-slate-800"
                                        >
                                            <div className="grid h-[54px] items-center hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                                                style={{ gridTemplateColumns: '40px 100px 180px 150px 100px' }}
                                                onClick={() => toggleRow(row.id)}
                                            >
                                                {row.getVisibleCells().map(cell => (
                                                    <div key={cell.id} className="px-6 truncate">
                                                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                                    </div>
                                                ))}
                                            </div>

                                            {/* Expanded Content */}
                                            {isExpanded && (
                                                <div className="px-6 py-4 bg-slate-50/50 dark:bg-slate-900/50">
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm animate-in fade-in zoom-in-95 duration-200">
                                                        <div>
                                                            <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Prompt (User)</div>
                                                            <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg text-slate-700 dark:text-slate-300 text-sm font-mono whitespace-pre-wrap max-h-60 overflow-y-auto border border-transparent dark:border-slate-700">
                                                                {row.original.prompt_text}
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Response (AI)</div>
                                                            <div className={cn("p-3 rounded-lg text-sm whitespace-pre-wrap border max-h-60 overflow-y-auto",
                                                                row.original.verdict === 'REMOVED' ? "bg-red-50 border-red-100 text-red-800 dark:bg-red-900/20 dark:border-red-900/50 dark:text-red-200" :
                                                                    (row.original.verdict === 'REFUSAL' ? "bg-orange-50 border-orange-100 text-orange-800 dark:bg-orange-900/20 dark:border-orange-900/50 dark:text-orange-200" :
                                                                        (row.original.verdict === 'BLOCKED' ? "bg-slate-800 text-white dark:bg-slate-700" : "bg-emerald-50 border-emerald-100 text-emerald-800 dark:bg-emerald-900/20 dark:border-emerald-900/50 dark:text-emerald-200"))
                                                            )}>
                                                                {row.original.response_text}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    <div className="border-t border-slate-200 dark:border-slate-800 p-2 text-xs text-center text-slate-400">
                        {rows.length} rows loaded | Virtualized Rendering Active
                    </div>
                </div>
            </div>
        </main>
    );
}

