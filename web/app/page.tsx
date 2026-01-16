'use client';

import { useEffect, useState } from 'react';
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
import { ArrowUpDown, Shield, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

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
  response_text: string;
};

type ModelSummary = {
  model: string;
  total: number;
  refusals: number;
  refusal_rate: number;
  avg_cost: number;
};

// --- Components ---

export default function Home() {
  const [data, setData] = useState<AuditRow[]>([]);
  const [summary, setSummary] = useState<ModelSummary[]>([]);
  const [loading, setLoading] = useState(true);

  // Table States
  const [summarySorting, setSummarySorting] = useState<SortingState>([{ id: 'refusal_rate', desc: true }]);
  const [auditSorting, setAuditSorting] = useState<SortingState>([{ id: 'test_date', desc: true }]);

  useEffect(() => {
    fetch('/audit_log.csv')
      .then(r => r.text())
      .then(csv => {
        const parsed = Papa.parse<AuditRow>(csv, { header: true, dynamicTyping: true });
        const rows = parsed.data.filter(r => r.model);
        setData(rows);

        // Aggregate for Leaderboard
        const agg: Record<string, ModelSummary> = {};
        rows.forEach(r => {
          if (!agg[r.model]) agg[r.model] = { model: r.model, total: 0, refusals: 0, refusal_rate: 0, avg_cost: 0 };
          agg[r.model].total++;
          if (r.verdict === 'REMOVED') agg[r.model].refusals++;
          agg[r.model].avg_cost += r.run_cost || 0;
        });

        const summaryList = Object.values(agg).map(s => ({
          ...s,
          refusal_rate: (s.refusals / s.total) * 100,
          avg_cost: s.avg_cost / s.total
        }));
        setSummary(summaryList);
        setLoading(false);
      });
  }, []);

  // --- Summary Table Config ---
  const summaryHelper = createColumnHelper<ModelSummary>();
  const summaryColumns = [
    summaryHelper.accessor('model', {
      header: 'Model',
      cell: info => <span className="font-medium text-slate-900">{info.getValue()}</span>,
    }),
    summaryHelper.accessor('refusal_rate', {
      header: ({ column }) => (
        <button className="flex items-center gap-1" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
          Refusal Rate <ArrowUpDown className="h-4 w-4" />
        </button>
      ),
      cell: info => {
        const val = info.getValue();
        return (
          <div className="flex items-center gap-2">
            <div className="h-2 w-16 bg-slate-100 rounded-full overflow-hidden">
              <div className={cn("h-full rounded-full", val > 50 ? "bg-red-500" : "bg-emerald-500")} style={{ width: `${val}%` }} />
            </div>
            <span className={cn("font-bold", val > 50 ? "text-red-600" : "text-emerald-600")}>{val.toFixed(1)}%</span>
          </div>
        );
      },
    }),
    summaryHelper.accessor('avg_cost', {
      header: 'Avg Cost',
      cell: info => <span className="text-slate-500 font-mono">${(info.getValue() || 0).toFixed(6)}</span>,
    }),
    summaryHelper.accessor('total', {
      header: 'Prompts',
      cell: info => <span className="text-slate-500">{info.getValue()}</span>,
    }),
  ];

  const summaryTable = useReactTable({
    data: summary,
    columns: summaryColumns,
    state: { sorting: summarySorting },
    onSortingChange: setSummarySorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  // --- Audit Log Table Config ---
  const auditHelper = createColumnHelper<AuditRow>();
  const auditColumns = [
    auditHelper.accessor('test_date', {
      header: 'Date',
      cell: info => <span className="text-slate-500 whitespace-nowrap">{info.getValue()}</span>,
    }),
    auditHelper.accessor('model', {
      header: 'Model',
      cell: info => <span className="font-medium text-slate-700">{info.getValue().split('/')[1] || info.getValue()}</span>,
    }),
    auditHelper.accessor('category', {
      header: 'Category',
      cell: info => <span className="text-slate-600">{info.getValue()}</span>,
    }),
    auditHelper.accessor('verdict', {
      header: 'Verdict',
      cell: info => (
        <span className={cn("px-2 py-1 rounded text-xs font-bold uppercase",
          info.getValue() === 'REMOVED' ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700")}>
          {info.getValue()}
        </span>
      ),
    }),
    auditHelper.accessor('response_text', {
      header: 'Response Snippet',
      cell: info => <span className="text-slate-400 text-sm italic truncate block max-w-xs" title={info.getValue()}>{info.getValue()}</span>,
    }),
  ];

  const auditTable = useReactTable({
    data,
    columns: auditColumns,
    state: { sorting: auditSorting },
    onSortingChange: setAuditSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 10 } },
  });

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 p-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-12">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
              <Shield className="h-8 w-8 text-indigo-600" />
              Algorithmic Arbiters
            </h1>
            <p className="text-slate-500 mt-2 text-lg">Longitudinal analysis of AI content moderation biases.</p>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="/audit_log.csv"
              download="audit_log.csv"
              className="flex items-center gap-2 px-4 py-2 bg-white text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50 font-medium transition-colors shadow-sm"
            >
              <Download className="h-4 w-4" />
              Download CSV
            </a>
            <div className="bg-white px-4 py-2 rounded-lg shadow-sm border border-slate-200 flex items-center gap-2 text-emerald-600 font-medium">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              Live
            </div>
          </div>
        </div>

        {/* Leaderboard Section */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-slate-800">🏆 Safety Leaderboard</h2>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider font-semibold">
                  {summaryTable.getHeaderGroups().map(headerGroup => (
                    <tr key={headerGroup.id}>
                      {headerGroup.headers.map(header => (
                        <th key={header.id} className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition-colors">
                          {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                        </th>
                      ))}
                    </tr>
                  ))}
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {loading ? (
                    <tr><td colSpan={4} className="p-8 text-center text-slate-400">Loading metrics...</td></tr>
                  ) : (
                    summaryTable.getRowModel().rows.map(row => (
                      <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                        {row.getVisibleCells().map(cell => (
                          <td key={cell.id} className="px-6 py-4 whitespace-nowrap">
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </td>
                        ))}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Full Audit Log Section */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-slate-800">📋 Full Audit Log</h2>
            <span className="text-sm text-slate-500">{data.length} records</span>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider font-semibold border-b border-slate-200">
                  {auditTable.getHeaderGroups().map(headerGroup => (
                    <tr key={headerGroup.id}>
                      {headerGroup.headers.map(header => (
                        <th key={header.id} className="px-6 py-3 cursor-pointer hover:bg-slate-100 transition-colors">
                          {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                        </th>
                      ))}
                    </tr>
                  ))}
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {loading ? (
                    <tr><td colSpan={5} className="p-12 text-center text-slate-400">Loading log data...</td></tr>
                  ) : auditTable.getRowModel().rows.length === 0 ? (
                    <tr><td colSpan={5} className="p-12 text-center text-slate-400">No records found</td></tr>
                  ) : (
                    auditTable.getRowModel().rows.map(row => (
                      <tr key={row.id} className="hover:bg-slate-50 group">
                        {row.getVisibleCells().map(cell => (
                          <td key={cell.id} className="px-6 py-3">
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </td>
                        ))}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="border-t border-slate-200 bg-slate-50 p-4 flex items-center justify-between">
              <div className="text-sm text-slate-500">
                Page {auditTable.getState().pagination.pageIndex + 1} of {auditTable.getPageCount()}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => auditTable.previousPage()}
                  disabled={!auditTable.getCanPreviousPage()}
                  className="p-2 border border-slate-300 rounded hover:bg-white disabled:opacity-50 disabled:hover:bg-transparent transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={() => auditTable.nextPage()}
                  disabled={!auditTable.getCanNextPage()}
                  className="p-2 border border-slate-300 rounded hover:bg-white disabled:opacity-50 disabled:hover:bg-transparent transition-colors"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </section>

      </div>
    </main>
  );
}
