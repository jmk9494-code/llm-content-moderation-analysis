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
  LineChart, Line, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts';
import { ArrowUpDown, Shield, Download, ChevronLeft, ChevronRight, Activity, MessageSquare, AlertOctagon, Grid3X3, FileText, ChevronUp, ChevronDown, Search, X, Info, ArrowRight, ArrowLeftRight, Menu, Filter, Trophy } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import Link from 'next/link';
import TimeLapseChart from './TimeLapseChart';
import BiasChart from './BiasChart';
import PriceChart from './PriceChart';

import DownloadReportButton from './DownloadReportButton';
import ReactMarkdown from 'react-markdown';
import { ChartErrorBoundary } from '@/components/ui/ChartErrorBoundary';
import { generateReport } from '@/lib/analyst';
import { RefreshCw } from 'lucide-react';
import { AuditRowSchema, AuditRow } from '@/lib/schemas';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Types ---

type TrendRow = {
  date: string;
  model: string;
  refusal_rate: number;
};

type ModelSummary = {
  model: string;
  total: number;
  refusals: number;     // Verdict = REMOVED (Strictness)
  soft_refusals: number; // Verdict = REFUSAL (Model Refusal)
  blocks: number;       // Verdict = BLOCKED (API Block)
  refusal_rate: number; // Removed %
  soft_refusal_rate: number; // Refusal %
  block_rate: number;   // Blocked %
  avg_len: number;
};

type HeatmapCell = {
  model: string;
  category: string;
  rate: number;
  count: number;
};

// --- Sub-components ---

function InfoTooltip({ text }: { text: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative inline-block ml-2">
      <Info
        className="h-4 w-4 text-slate-400 hover:text-indigo-600 cursor-help transition-colors"
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
      />
      {show && (
        <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-slate-800 text-white text-xs rounded shadow-lg pointer-events-none">
          {text}
          <div className="absolute top-100 left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-slate-800" />
        </div>
      )}
    </div>
  );
}

type ModelMetadata = {
  id: string;
  name: string;
  provider: string;
  region: string;
  tier: string;
};

export default function Home() {
  const [data, setData] = useState<AuditRow[]>([]);
  const [summary, setSummary] = useState<ModelSummary[]>([]);
  const [trends, setTrends] = useState<any[]>([]);
  const [biasData, setBiasData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<string>('');
  const [showReport, setShowReport] = useState(true);

  // Table States
  const [summarySorting, setSummarySorting] = useState<SortingState>([{ id: 'refusal_rate', desc: true }]);
  const [auditSorting, setAuditSorting] = useState<SortingState>([{ id: 'test_date', desc: true }]);
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  const [selectedDrillDown, setSelectedDrillDown] = useState<HeatmapCell | null>(null);
  const [modelsMeta, setModelsMeta] = useState<ModelMetadata[]>([]);

  const toggleRow = (id: string) => {
    setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }));
  };

  useEffect(() => {
    // 1. Fetch Audit Log
    const p1 = fetch('/audit_log.csv')
      .then(r => r.text())
      .then(csv => {
        const parsed = Papa.parse(csv, { header: true, dynamicTyping: true });
        // Validate with Zod
        const validRows: AuditRow[] = [];
        parsed.data.forEach((row: any) => {
          const result = AuditRowSchema.safeParse(row);
          if (result.success) {
            validRows.push(result.data);
          } else {
            console.warn("Skipping invalid audit row:", result.error);
          }
        });
        const rows = validRows.filter(r => r.model);
        setData(rows);

        // Aggregate for Leaderboard
        const agg: Record<string, ModelSummary> = {};
        rows.forEach(r => {
          if (!agg[r.model]) agg[r.model] = {
            model: r.model, total: 0,
            refusals: 0, soft_refusals: 0, blocks: 0,
            refusal_rate: 0, soft_refusal_rate: 0, block_rate: 0,
            avg_len: 0
          };
          agg[r.model].total++;
          if (r.verdict === 'REMOVED') agg[r.model].refusals++;
          if (r.verdict === 'REFUSAL') agg[r.model].soft_refusals++;
          if (r.verdict === 'BLOCKED') agg[r.model].blocks++;
          agg[r.model].avg_len += r.response_text ? r.response_text.length : 0;
        });

        const summaryList = Object.values(agg).map(s => ({
          ...s,
          refusal_rate: s.total > 0 ? (s.refusals / s.total) * 100 : 0,
          soft_refusal_rate: s.total > 0 ? (s.soft_refusals / s.total) * 100 : 0,
          block_rate: s.total > 0 ? (s.blocks / s.total) * 100 : 0,
          avg_len: Math.round(s.avg_len / s.total)
        }));
        setSummary(summaryList);
      });

    // 2. Fetch Trends
    const p2 = new Promise<void>((resolve, reject) => {
      Papa.parse<any>('/trends.csv', {
        download: true,
        header: true,
        complete: (results) => {
          setTrends(results.data.filter(r => r.model));
          resolve();
        },
        error: (err) => {
          console.log("Trends not found", err);
          reject(err);
        }
      });
    });

    // 3. Fetch Bias Log
    const p3 = new Promise<void>((resolve, reject) => {
      Papa.parse<any>('/bias_log.csv', {
        download: true,
        header: true,
        complete: (results) => {
          setBiasData(results.data.filter(r => r.model));
          resolve();
        },
        error: (err) => {
          console.log("Bias log not found", err);
          reject(err);
        }
      });
    });

    // 4. Fetch Model Metadata
    fetch('/models.json')
      .then(r => r.json())
      .then(m => setModelsMeta(m))
      .catch(e => console.log("No metadata found", e));

    Promise.all([p1, p2, p3]).then(() => setLoading(false));
  }, []);

  // --- Filtering Config ---
  const [selectedDate, setSelectedDate] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [regionFilter, setRegionFilter] = useState('All');
  const [tierFilter, setTierFilter] = useState('All');

  const uniqueDates = useMemo(() => {
    return Array.from(new Set(data.map(r => r.test_date))).sort().reverse();
  }, [data]);

  const filteredData = useMemo(() => {
    let res = data;
    // Date Filter
    if (selectedDate !== 'all') {
      res = res.filter(r => r.test_date === selectedDate);
    }
    // Metadata Filters
    if (regionFilter !== 'All') {
      const allowed = modelsMeta.filter(m => m.region === regionFilter).map(m => m.id);
      res = res.filter(r => allowed.includes(r.model));
    }
    if (tierFilter !== 'All') {
      const allowed = modelsMeta.filter(m => m.tier === tierFilter).map(m => m.id);
      res = res.filter(r => allowed.includes(r.model));
    }
    // Search Filter
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
  }, [data, selectedDate, searchQuery, regionFilter, tierFilter, modelsMeta]);

  // Recalculate summary based on filtered data
  const filteredSummary = useMemo(() => {
    const agg: Record<string, ModelSummary> = {};
    filteredData.forEach(r => {
      if (!agg[r.model]) agg[r.model] = {
        model: r.model, total: 0,
        refusals: 0, soft_refusals: 0, blocks: 0,
        refusal_rate: 0, soft_refusal_rate: 0, block_rate: 0,
        avg_len: 0
      };
      agg[r.model].total++;
      if (r.verdict === 'REMOVED') agg[r.model].refusals++;
      if (r.verdict === 'REFUSAL') agg[r.model].soft_refusals++;
      if (r.verdict === 'BLOCKED') agg[r.model].blocks++;
      agg[r.model].avg_len += r.response_text ? r.response_text.length : 0;
    });
    return Object.values(agg).map(s => ({
      ...s,
      refusal_rate: s.total > 0 ? (s.refusals / s.total) * 100 : 0,
      soft_refusal_rate: s.total > 0 ? (s.soft_refusals / s.total) * 100 : 0,
      block_rate: s.total > 0 ? (s.blocks / s.total) * 100 : 0,
      avg_len: Math.round(s.avg_len / s.total)
    }));
  }, [filteredData]);

  // Use filtered data for heatmaps and charts
  const heatmapData = useMemo(() => {
    if (filteredData.length === 0) return { categories: [], models: [], grid: [] as HeatmapCell[] };
    const categories = Array.from(new Set(filteredData.map(r => r.category))).sort();
    const models = Array.from(new Set(filteredData.map(r => r.model)));
    const grid: HeatmapCell[] = [];
    models.forEach(m => {
      categories.forEach(c => {
        const subset = filteredData.filter(r => r.model === m && r.category === c);
        const total = subset.length;
        const refusals = subset.filter(r => r.verdict === 'REMOVED').length;
        const rate = total > 0 ? (refusals / total) * 100 : 0;
        grid.push({ model: m, category: c, rate, count: total });
      });
    });
    return { categories, models, grid };
  }, [filteredData]);

  // --- Radar Chart Calculation ---
  const radarData = useMemo(() => {
    if (filteredData.length === 0) return [];

    const categories = Array.from(new Set(filteredData.map(r => r.category))).sort();
    const models = Array.from(new Set(filteredData.map(r => r.model)));

    return categories.map(cat => {
      const entry: any = { subject: cat };
      models.forEach(mod => {
        const subset = filteredData.filter(r => r.model === mod && r.category === cat);
        const total = subset.length;
        const refusals = subset.filter(r => r.verdict === 'REMOVED').length;
        entry[mod] = total > 0 ? Math.round((refusals / total) * 100) : 0;
      });
      return entry;
    });
  }, [filteredData]);

  // --- Helper for Heatmap Color ---
  const getRateColor = (rate: number) => {
    if (rate === 0) return 'bg-emerald-50 text-emerald-600';
    if (rate < 20) return 'bg-emerald-100 text-emerald-800';
    if (rate < 50) return 'bg-yellow-100 text-yellow-800';
    if (rate < 80) return 'bg-orange-100 text-orange-800';
    return 'bg-red-100 text-red-800';
  };

  // --- Charts Prep ---
  const chartData = [...filteredSummary].sort((a, b) => b.refusal_rate - a.refusal_rate);

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
    data: filteredSummary,
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
    initialState: { pagination: { pageSize: 10 } },
  });

  // Get list of models for dynamically iterating Radar components
  const activeModels = useMemo(() => {
    if (filteredData.length === 0) return [];
    return Array.from(new Set(filteredData.map(r => r.model)));
  }, [filteredData]);

  const colors = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#0088FE', '#00C49F'];

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-8" id="dashboard-content">

        {/* Top Row: Branding & Navigation */}
        <header className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 border-b border-slate-200 pb-6">
            <div>
              <Link href="/" className="text-xs font-bold uppercase tracking-wider text-indigo-600 mb-1 block">← Project Overview</Link>
              <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
                Algorithmic Arbiters
              </h1>
              <p className="text-lg text-slate-500 font-medium">Monitoring Digital Censorship & Bias</p>
            </div>

            <div className="flex gap-2">
              <Link
                href="/strategies"
                className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 font-medium transition-colors shadow-sm text-sm"
              >
                <Activity className="h-4 w-4 text-indigo-500" />
                Strategy Analysis
              </Link>
              <Link
                href="/compare"
                className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 font-medium transition-colors shadow-sm text-sm"
              >
                <ArrowLeftRight className="h-4 w-4 text-emerald-500" />
                Compare Models
              </Link>
              <Link
                href="/leaderboard"
                className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 font-medium transition-colors shadow-sm text-sm"
              >
                <Trophy className="h-4 w-4 text-yellow-500" />
                Leaderboard
              </Link>
              <DownloadReportButton />
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative w-full md:w-64">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-slate-400" />
              </div>
              <input
                type="text"
                placeholder="Search prompts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full bg-slate-50"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-lg border border-slate-200">
                <Filter className="h-4 w-4 text-slate-400" />
                <span className="text-xs font-bold uppercase text-slate-500">Filter By:</span>
              </div>

              <select
                value={regionFilter}
                onChange={(e) => setRegionFilter(e.target.value)}
                className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer hover:border-indigo-300 transition-colors"
              >
                <option value="All">🌍 All Regions</option>
                <option value="US">🇺🇸 US Only</option>
                <option value="China">🇨🇳 China Only</option>
                <option value="Europe">🇪🇺 Europe Only</option>
              </select>

              <select
                value={tierFilter}
                onChange={(e) => setTierFilter(e.target.value)}
                className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer hover:border-indigo-300 transition-colors"
              >
                <option value="All">💎 All Tiers</option>
                <option value="High">High Tier</option>
                <option value="Mid">Mid Tier</option>
                <option value="Low">Low Tier</option>
              </select>

              <select
                id="date-filter"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer hover:border-indigo-300 transition-colors"
              >
                <option value="all">📅 All Time (Aggregate)</option>
                {uniqueDates.map(d => (
                  <option key={d} value={d}>
                    Run: {d}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </header>

        {/* AI Weekly Report Section */}
        <section className="bg-white rounded-2xl shadow-sm border border-indigo-100 overflow-hidden mb-8">
          <div className="p-4 bg-indigo-50/50 border-b border-indigo-100 flex justify-between items-center">
            <div
              className="flex items-center gap-2 text-indigo-900 font-semibold cursor-pointer"
              onClick={() => setShowReport(!showReport)}
            >
              <FileText className="h-5 w-5 text-indigo-600" />
              Live Analyst Report
              <ChevronUp className={cn("h-5 w-5 text-indigo-400 transition-transform ml-2", showReport ? "" : "rotate-180")} />
            </div>

            <button
              onClick={() => setReport(generateReport(filteredData, { region: regionFilter, tier: tierFilter }))}
              className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 text-white text-xs font-bold uppercase tracking-wider rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
            >
              <RefreshCw className="h-3 w-3" />
              Generate Analysis
            </button>
          </div>

          {showReport && (
            <div className="p-6 prose prose-indigo max-w-none text-slate-600 text-sm">
              {report ? <ReactMarkdown>{report}</ReactMarkdown> : (
                <div className="text-center text-slate-400 italic py-4">
                  Click "Generate Analysis" to analyze the currently filtered dataset.
                </div>
              )}
            </div>
          )}
        </section>

        <a
          href="/audit_log.csv"
          download="audit_log.csv"
          className="flex w-fit items-center gap-2 px-4 py-2 bg-white text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50 font-medium transition-colors shadow-sm mb-8"
        >
          <Download className="h-4 w-4" />
          Download CSV
        </a>

        {/* Time-Travel Chart */}
        <ChartErrorBoundary fallbackMessage="Could not load trends timeline.">
          <div className="mb-8">
            <TimeLapseChart data={trends} />
          </div>
        </ChartErrorBoundary>

        {/* Bias Analysis Chart */}
        <ChartErrorBoundary fallbackMessage="Bias analysis unavailable.">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Grid3X3 className="h-5 w-5 text-indigo-600" />
              Axis of Bias Analysis
              <InfoTooltip text="Political compass analysis of refusal reasoning (LLM Judge)" />
            </h3>
            <BiasChart data={biasData} />
          </div>
        </ChartErrorBoundary>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600"><Activity className="h-6 w-6" /></div>
            <div>
              <div className="text-sm text-slate-500 font-medium uppercase flex items-center">
                Total Audits
                <InfoTooltip text="Total number of test cases run across all selected models." />
              </div>
              <div className="text-2xl font-bold text-slate-900">{filteredData.length}</div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-red-50 rounded-xl text-red-600"><Shield className="h-6 w-6" /></div>
            <div>
              <div className="text-sm text-slate-500 font-medium uppercase flex items-center">
                Strictness
                <InfoTooltip text="% of content the MODEL decided to Remove (acting as moderator)." />
              </div>
              <div className="text-2xl font-bold text-slate-900">
                {filteredSummary.length ? (filteredSummary.reduce((a, b) => a + b.refusal_rate, 0) / filteredSummary.length).toFixed(1) : 0}%
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-amber-50 rounded-xl text-amber-600"><AlertOctagon className="h-6 w-6" /></div>
            <div>
              <div className="text-sm text-slate-500 font-medium uppercase flex items-center">
                Refusals & Blocks
                <InfoTooltip text="% of prompts where the model refused to answer entirely or was blocked by API." />
              </div>
              <div className="text-2xl font-bold text-slate-900">
                {filteredSummary.length ? ((filteredSummary.reduce((a, b) => a + b.soft_refusal_rate + b.block_rate, 0)) / filteredSummary.length).toFixed(1) : 0}%
              </div>
              <div className="text-xs text-slate-500 mt-1">
                {filteredSummary.length ? (filteredSummary.reduce((a, b) => a + b.soft_refusal_rate, 0) / filteredSummary.length).toFixed(1) : 0}% Refused /
                {filteredSummary.length ? (filteredSummary.reduce((a, b) => a + b.block_rate, 0) / filteredSummary.length).toFixed(1) : 0}% Blocked
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600"><MessageSquare className="h-6 w-6" /></div>
            <div>
              <div className="text-sm text-slate-500 font-medium uppercase flex items-center">
                Avg Verbosity
                <InfoTooltip text="Average length of model responses in characters." />
              </div>
              <div className="text-2xl font-bold text-slate-900">
                {filteredSummary.length ? Math.round(filteredSummary.reduce((a, b) => a + b.avg_len, 0) / filteredSummary.length) : 0} chars
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
              Model Stringency Comparison
              <InfoTooltip text="Comparison of refusal rates across different models. Higher means more restricted/censored." />
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

          {/* Price Analysis Chart */}
          <ChartErrorBoundary fallbackMessage="Price analysis unavailable.">
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                <Trophy className="h-5 w-5 text-amber-500" />
                Price of Censorship
                <InfoTooltip text="Does paying more guarantee less censorship?" />
              </h3>
              <PriceChart data={filteredData} />
            </div>
          </ChartErrorBoundary>

          {/* Line Chart: Trends */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
              <Activity className="h-5 w-5 text-emerald-600" />
              Refusal Rate Trends (History)
              <InfoTooltip text="Historical view of refusal rates over time for each model." />
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

        {/* Radar Chart Section */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
            <Activity className="h-5 w-5 text-indigo-600" />
            Censorship Profile (Refusal by Category)
            <InfoTooltip text="Radar chart showing which categories trigger the most refusals per model." />
          </h3>
          <div className="h-80 w-full text-xs">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="subject" />
                <PolarRadiusAxis angle={30} domain={[0, 100]} />
                {activeModels.map((model, index) => (
                  <Radar
                    key={model}
                    name={model.split('/')[1] || model}
                    dataKey={model}
                    stroke={colors[index % colors.length]}
                    fill={colors[index % colors.length]}
                    fillOpacity={0.1}
                  />
                ))}
                <Legend />
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Heatmap Section */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm overflow-x-auto">
          <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
            <Grid3X3 className="h-5 w-5 text-slate-600" />
            Category Sensitivity Heatmap
            <InfoTooltip text="Heatmap showing refusal rates for specific model-category pairs. Darker colors indicate higher refusal rates. Click any cell to view the specific prompts and model responses for that category." />
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
                        <div
                          key={`${m}-${c}`}
                          className={cn("h-10 rounded flex items-center justify-center text-xs font-bold transition-transform hover:scale-105 cursor-pointer hover:ring-2 hover:ring-indigo-400 hover:z-10 relative", getRateColor(rate))}
                          title={`Click to view details for ${m} - ${c}\n${rate.toFixed(1)}% Refusal (${cell?.count || 0} audits)`}
                          onClick={() => cell && setSelectedDrillDown(cell)}
                        >
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
            <h2 className="text-xl font-semibold">🏆 Model Comparison</h2>
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

        {/* Drill Down Modal */}
        {selectedDrillDown && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setSelectedDrillDown(null)}>
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[80vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Drill Down Analysis</h3>
                  <p className="text-sm text-slate-500">
                    Viewing <span className="font-semibold text-slate-700">{selectedDrillDown.model}</span> on <span className="font-semibold text-slate-700">{selectedDrillDown.category}</span>
                  </p>
                </div>
                <button onClick={() => setSelectedDrillDown(null)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                  <X className="h-5 w-5 text-slate-500" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-6">
                <div className="space-y-4">
                  {filteredData
                    .filter(r => r.model === selectedDrillDown.model && r.category === selectedDrillDown.category)
                    .map((row, idx) => (
                      <div key={idx} className="border border-slate-200 rounded-xl p-4 hover:border-indigo-200 transition-colors">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-mono text-slate-400">{row.test_date}</span>
                          <span className={cn("px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                            row.verdict === 'REMOVED' ? "bg-red-100 text-red-700" :
                              (row.verdict === 'REFUSAL' ? "bg-orange-100 text-orange-700" :
                                (row.verdict === 'BLOCKED' ? "bg-slate-800 text-white" : "bg-emerald-100 text-emerald-700"))
                          )}>
                            {row.verdict}
                          </span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="bg-slate-50 p-3 rounded-lg text-sm text-slate-600 font-mono whitespace-pre-wrap">
                            {row.prompt_text}
                          </div>
                          <div className={cn("p-3 rounded-lg text-sm whitespace-pre-wrap border",
                            row.verdict === 'REMOVED' ? "bg-red-50 border-red-100 text-red-900" :
                              (row.verdict === 'REFUSAL' ? "bg-orange-50 border-orange-100 text-orange-900" :
                                (row.verdict === 'BLOCKED' ? "bg-slate-800 text-white" : "bg-emerald-50 border-emerald-100 text-emerald-900"))
                          )}>
                            {row.response_text}
                          </div>
                        </div>
                      </div>
                    ))}
                  {filteredData.filter(r => r.model === selectedDrillDown.model && r.category === selectedDrillDown.category).length === 0 && (
                    <div className="text-center text-slate-400 py-12">No records found for this selection.</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </main>
  );
}
