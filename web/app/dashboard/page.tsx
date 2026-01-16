'use client';

import { useEffect, useState, useMemo } from 'react';
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
  LineChart, Line
} from 'recharts';
import { ArrowUpDown, Shield, Download, ChevronLeft, ChevronRight, Activity, MessageSquare, AlertOctagon, Grid3X3, FileText, ChevronUp, ChevronDown } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';

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

type TrendRow = {
  date: string;
  model: string;
  refusal_rate: number;
};

type ModelSummary = {
  model: string;
  total: number;
  refusals: number;
  refusal_rate: number;
  avg_len: number;
};

type HeatmapCell = {
  model: string;
  category: string;
  rate: number;
  count: number;
};

// --- Components ---

export default function Home() {
  const [data, setData] = useState<AuditRow[]>([]);
  const [summary, setSummary] = useState<ModelSummary[]>([]);
  const [trends, setTrends] = useState<TrendRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<string>('');
  const [showReport, setShowReport] = useState(true);

  // Table States
  const [summarySorting, setSummarySorting] = useState<SortingState>([{ id: 'refusal_rate', desc: true }]);
  const [auditSorting, setAuditSorting] = useState<SortingState>([{ id: 'test_date', desc: true }]);
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

  const toggleRow = (id: string) => {
    setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }));
  };

  useEffect(() => {
    // 1. Fetch Audit Log
    const p1 = fetch('/audit_log.csv')
      .then(r => r.text())
      .then(csv => {
        const parsed = Papa.parse<AuditRow>(csv, { header: true, dynamicTyping: true });
        const rows = parsed.data.filter(r => r.model);
        setData(rows);

        // Aggregate for Leaderboard
        const agg: Record<string, ModelSummary> = {};
        rows.forEach(r => {
          if (!agg[r.model]) agg[r.model] = { model: r.model, total: 0, refusals: 0, refusal_rate: 0, avg_len: 0 };
          agg[r.model].total++;
          if (r.verdict === 'REMOVED') agg[r.model].refusals++;
          agg[r.model].avg_len += r.response_text ? r.response_text.length : 0;
        });

        const summaryList = Object.values(agg).map(s => ({
          ...s,
          refusal_rate: (s.refusals / s.total) * 100,
          avg_len: Math.round(s.avg_len / s.total)
        }));
        setSummary(summaryList);
      });

    // 2. Fetch Trends
    const p2 = fetch('/trends.csv')
      .then(r => r.text())
      .then(csv => {
        const parsed = Papa.parse<TrendRow>(csv, { header: true, dynamicTyping: true });
        setTrends(parsed.data.filter(r => r.date && r.model));
      }).catch(err => console.log("Trends not found", err));

    // 3. Fetch AI Report
    const p3 = fetch('/latest_report.md')
      .then(r => r.text())
      .then(text => setReport(text))
      .catch(e => console.log("No report found", e));


    Promise.all([p1, p2, p3]).then(() => setLoading(false));
  }, []);

  // --- Heatmap Calculation ---
  const heatmapData = useMemo(() => {
    if (data.length === 0) return { categories: [], models: [], grid: [] as HeatmapCell[] };

    // Get unique categories and models
    const categories = Array.from(new Set(data.map(r => r.category))).sort();
    const models = Array.from(new Set(data.map(r => r.model)));

    const grid: HeatmapCell[] = [];

    models.forEach(m => {
      categories.forEach(c => {
        const subset = data.filter(r => r.model === m && r.category === c);
        const total = subset.length;
        const refusals = subset.filter(r => r.verdict === 'REMOVED').length;
        const rate = total > 0 ? (refusals / total) * 100 : 0;
        grid.push({ model: m, category: c, rate, count: total });
      });
    });

    return { categories, models, grid };
  }, [data]);


  // --- Helper for Heatmap Color ---
  const getRateColor = (rate: number) => {
    if (rate === 0) return 'bg-emerald-50 text-emerald-600';
    if (rate < 20) return 'bg-emerald-100 text-emerald-800';
    if (rate < 50) return 'bg-yellow-100 text-yellow-800';
    if (rate < 80) return 'bg-orange-100 text-orange-800';
    return 'bg-red-100 text-red-800';
  };


  // --- Charts Prep ---
  const chartData = [...summary].sort((a, b) => b.refusal_rate - a.refusal_rate);

  // --- Summary Table Config ---
  const summaryHelper = createColumnHelper<ModelSummary>();
  const summaryColumns = [
    summaryHelper.accessor('model', {
      header: 'Model',
      cell: info => (
        <Link
          href={`/model/${encodeURIComponent(info.getValue())}`}
          className="font-medium text-indigo-600 hover:text-indigo-800 hover:underline"
        >
          {info.getValue()}
        </Link>
      ),
    }),
    summaryHelper.accessor('refusal_rate', {
      header: ({ column }) => (
        <button className="flex items-center gap-1" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
          Strictness <ArrowUpDown className="h-4 w-4" />
        </button>
      ),
      cell: info => {
        const val = info.getValue();
        return (
          <div className="flex items-center gap-2">
            <div className="h-2 w-24 bg-slate-100 rounded-full overflow-hidden">
              <div className={cn("h-full rounded-full", val > 50 ? "bg-red-500" : "bg-emerald-500")} style={{ width: `${val}%` }} />
            </div>
            <span className={cn("font-bold", val > 50 ? "text-red-600" : "text-emerald-600")}>{val.toFixed(1)}%</span>
          </div>
        );
      },
    }),
    summaryHelper.accessor('avg_len', {
      header: 'Avg Response Length',
      cell: info => <span className="text-slate-500 font-mono">{info.getValue()} chars</span>,
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
      <div className="max-w-7xl mx-auto space-y-8">

        {/* Header with Navigation to Home */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Link href="/" className="text-sm font-medium text-slate-500 hover:text-indigo-600 transition-colors">← Project Overview</Link>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
              <Shield className="h-8 w-8 text-indigo-600" />
              Live Dashboard
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="/audit_log.csv"
              download="audit_log.csv"
              className="flex items-center gap-2 px-4 py-2 bg-white text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50 font-medium transition-colors shadow-sm"
            >
              <Download className="h-4 w-4" />
              Download Data
            </a>
          </div>
        </div>

        {/* AI Weekly Report Section */}
        {report && (
          <section className="bg-white rounded-2xl shadow-sm border border-indigo-100 overflow-hidden">
            <div
              className="p-4 bg-indigo-50/50 border-b border-indigo-100 flex justify-between items-center cursor-pointer hover:bg-indigo-50 transition-colors"
              onClick={() => setShowReport(!showReport)}
            >
              <div className="flex items-center gap-2 text-indigo-900 font-semibold">
                <FileText className="h-5 w-5 text-indigo-600" />
                Latest AI Analyst Report
              </div>
              <ChevronUp className={cn("h-5 w-5 text-indigo-400 transition-transform", showReport ? "" : "rotate-180")} />
            </div>

            {showReport && (
              <div className="p-6 prose prose-indigo max-w-none text-slate-600 text-sm">
                <ReactMarkdown>{report}</ReactMarkdown>
              </div>
            )}
          </section>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600"><Activity className="h-6 w-6" /></div>
            <div>
              <div className="text-sm text-slate-500 font-medium uppercase">Total Audits</div>
              <div className="text-2xl font-bold text-slate-900">{data.length}</div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-red-50 rounded-xl text-red-600"><AlertOctagon className="h-6 w-6" /></div>
            <div>
              <div className="text-sm text-slate-500 font-medium uppercase">Avg Refusal Rate</div>
              <div className="text-2xl font-bold text-slate-900">
                {summary.length ? (summary.reduce((a, b) => a + b.refusal_rate, 0) / summary.length).toFixed(1) : 0}%
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600"><MessageSquare className="h-6 w-6" /></div>
            <div>
              <div className="text-sm text-slate-500 font-medium uppercase">Avg Verbosity</div>
              <div className="text-2xl font-bold text-slate-900">
                {summary.length ? Math.round(summary.reduce((a, b) => a + b.avg_len, 0) / summary.length) : 0} chars
              </div>
            </div>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Bar Chart: Strictness */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
              <Shield className="h-5 w-5 text-indigo-600" />
              Model Strictness Comparison
            </h3>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical" margin={{ left: 40, right: 30 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                  <XAxis type="number" unit="%" domain={[0, 100]} hide />
                  <YAxis type="category" dataKey="model" width={100} tick={{ fontSize: 12 }} interval={0}
                    tickFormatter={(val) => val.split('/')[1] || val}
                  />
                  <Tooltip
                    cursor={{ fill: '#f1f5f9' }}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="refusal_rate" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Line Chart: Trends */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
              <Activity className="h-5 w-5 text-emerald-600" />
              Refusal Rate Trends (History)
            </h3>
            <div className="h-64 w-full">
              {trends.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trends}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                    <YAxis unit="%" />
                    <Tooltip />
                    <Legend />
                    {Array.from(new Set(trends.map(t => t.model))).map((model, i) => (
                      <Line
                        key={model}
                        type="monotone"
                        dataKey="refusal_rate"
                        data={trends.filter(t => t.model === model)}
                        name={model.split('/')[1] || model}
                        stroke={`hsl(${i * 90}, 70%, 50%)`}
                        strokeWidth={2}
                        dot={true}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-400 italic">
                  No historical data available yet.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Heatmap Section */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm overflow-x-auto">
          <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
            <Grid3X3 className="h-5 w-5 text-slate-600" />
            Category Sensitivity Heatmap
          </h3>
          {heatmapData.categories.length > 0 ? (
            <div className="min-w-max">
              <div className="grid gap-1" style={{ gridTemplateColumns: `auto repeat(${heatmapData.categories.length}, 1fr)` }}>
                {/* Header Row */}
                <div className="p-2 font-medium text-slate-500 text-sm"></div>
                {heatmapData.categories.map(c => (
                  <div key={c} className="p-2 font-medium text-slate-500 text-xs text-center break-words w-24">
                    {c}
                  </div>
                ))}

                {/* Rows */}
                {heatmapData.models.map(m => (
                  <>
                    <div key={m} className="p-2 text-sm font-medium text-slate-700 flex items-center">
                      {m.split('/')[1] || m}
                    </div>
                    {heatmapData.categories.map(c => {
                      const cell = heatmapData.grid.find(x => x.model === m && x.category === c);
                      const rate = cell ? cell.rate : 0;
                      return (
                        <div key={`${m}-${c}`} className={cn("h-10 rounded flex items-center justify-center text-xs font-bold transition-transform hover:scale-105", getRateColor(rate))} title={`${rate.toFixed(1)}% Refusal`}>
                          {rate.toFixed(0)}%
                        </div>
                      );
                    })}
                  </>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center text-slate-400 p-8">Loading heatmap...</div>
          )}
        </div>

        {/* Improved Leaderboard */}
        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-100">
            <h2 className="text-xl font-semibold">🏆 Detailed Leaderboard</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider font-semibold">
                {summaryTable.getHeaderGroups().map(headerGroup => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map(header => (
                      <th key={header.id} className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition-colors">
                        {flexRender(header.column.columnDef.header, header.getContext())}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {summaryTable.getRowModel().rows.map(row => (
                  <tr key={row.id} className="hover:bg-slate-50">
                    {row.getVisibleCells().map(cell => (
                      <td key={cell.id} className="px-6 py-4 whitespace-nowrap">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Audit Log */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-slate-800">📋 Audit Log</h2>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider font-semibold border-b border-slate-200">
                  {auditTable.getHeaderGroups().map(headerGroup => (
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
                  {auditTable.getRowModel().rows.map(row => (
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
                          <td colSpan={auditColumns.length} className="px-6 py-4">
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
            <div className="border-t border-slate-200 bg-slate-50 p-4 flex items-center justify-between">
              <div className="text-sm text-slate-500">
                Page {auditTable.getState().pagination.pageIndex + 1} of {auditTable.getPageCount()}
              </div>
              <div className="flex gap-2">
                <button onClick={() => auditTable.previousPage()} disabled={!auditTable.getCanPreviousPage()} className="p-2 border rounded hover:bg-white disabled:opacity-50"><ChevronLeft className="h-4 w-4" /></button>
                <button onClick={() => auditTable.nextPage()} disabled={!auditTable.getCanNextPage()} className="p-2 border rounded hover:bg-white disabled:opacity-50"><ChevronRight className="h-4 w-4" /></button>
              </div>
            </div>
          </div>
        </section>

      </div>
    </main>
  );
}
