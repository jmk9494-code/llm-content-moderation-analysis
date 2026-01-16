'use client';

import { useEffect, useState } from 'react';
import Papa from 'papaparse';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getSortedRowModel,
  SortingState
} from '@tanstack/react-table';
import { ArrowUpDown, Shield, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
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
  const [sorting, setSorting] = useState<SortingState>([{ id: 'refusal_rate', desc: true }]);

  useEffect(() => {
    // Fetch CSV from public directory
    fetch('/audit_log.csv')
      .then(r => r.text())
      .then(csv => {
        const parsed = Papa.parse<AuditRow>(csv, { header: true, dynamicTyping: true });
        const rows = parsed.data.filter(r => r.model); // Filter empty rows
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

  const columnHelper = createColumnHelper<ModelSummary>();
  const columns = [
    columnHelper.accessor('model', {
      header: 'Model',
      cell: info => <span className="font-medium text-slate-900">{info.getValue()}</span>,
    }),
    columnHelper.accessor('refusal_rate', {
      header: ({ column }) => (
        <button className="flex items-center gap-1" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
          Refusal Rate
          <ArrowUpDown className="h-4 w-4" />
        </button>
      ),
      cell: info => {
        const val = info.getValue();
        return (
          <div className="flex items-center gap-2">
            <div className="h-2 w-16 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={cn("h-full rounded-full", val > 50 ? "bg-red-500" : "bg-emerald-500")}
                style={{ width: `${val}%` }}
              />
            </div>
            <span className={cn("font-bold", val > 50 ? "text-red-600" : "text-emerald-600")}>
              {val.toFixed(1)}%
            </span>
          </div>
        );
      },
    }),
    columnHelper.accessor('avg_cost', {
      header: 'Avg Cost ($)',
      cell: info => <span className="text-slate-500 font-mono">${info.getValue().toFixed(6)}</span>,
    }),
    columnHelper.accessor('total', {
      header: 'Prompts',
      cell: info => <span className="text-slate-500">{info.getValue()}</span>,
    }),
  ];

  const table = useReactTable({
    data: summary,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 p-8 font-sans">
      <div className="max-w-5xl mx-auto space-y-8">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
              <Shield className="h-8 w-8 text-indigo-600" />
              Algorithmic Arbiters
            </h1>
            <p className="text-slate-500 mt-2 text-lg">
              Longitudinal analysis of AI content moderation biases.
            </p>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
            <div className="text-sm text-slate-500 uppercase tracking-wider font-semibold">Live Status</div>
            <div className="flex items-center gap-2 text-emerald-600 font-medium">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
              Auditing ({data.length} prompts)
            </div>
          </div>
        </div>

        {/* Leaderboard Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              🏆 Safety Leaderboard
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-slate-500 text-sm uppercase tracking-wider">
                {table.getHeaderGroups().map(headerGroup => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map(header => (
                      <th key={header.id} className="px-6 py-4 font-medium cursor-pointer hover:bg-slate-100 transition-colors">
                        {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr><td colSpan={4} className="p-8 text-center text-slate-400">Loading data...</td></tr>
                ) : (
                  table.getRowModel().rows.map(row => (
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

        {/* Recent Audits Grid */}
        <h3 className="text-xl font-semibold pt-8">Recent Flags</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {data.slice(0, 6).map((row, i) => (
            <div key={i} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-3">
                <span className={cn("px-2 py-1 rounded text-xs font-bold uppercase",
                  row.verdict === 'REMOVED' ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700")}>
                  {row.verdict}
                </span>
                <span className="text-xs text-slate-400">{row.model.split('/')[1]}</span>
              </div>
              <div className="text-sm font-medium text-slate-700 mb-2">{row.category}</div>
              <div className="text-slate-500 text-sm line-clamp-2 italic">"{row.response_text}"</div>
            </div>
          ))}
        </div>

      </div>
    </main>
  );
}
