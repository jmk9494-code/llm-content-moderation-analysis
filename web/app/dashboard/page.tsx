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
import { ArrowUpDown, Shield, Download, ChevronLeft, ChevronRight, Activity, MessageSquare, AlertOctagon, AlertCircle, Grid3X3, FileText, ChevronUp, ChevronDown, Search, X, Info, ArrowRight, ArrowLeftRight, Menu, Filter, Trophy, RotateCcw, Scale } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import Link from 'next/link';
import TimeLapseChart from './TimeLapseChart';
import BiasChart from './BiasChart';
import PriceChart from './PriceChart';
import CategoryChart from './CategoryChart';
import ModelLogo from '@/components/ModelLogo';

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
  provider: string; // Added for logo
  total: number;
  refusals: number;
  soft_refusals: number;
  blocks: number;
  refusal_rate: number;
  soft_refusal_rate: number;
  block_rate: number;
  avg_len: number;
  least_sensitive_topic: string; // New field
  total_cost: number; // For PriceChart
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
    // 1. Fetch Model Metadata First for Provider lookup
    fetch('/models.json')
      .then(r => r.json())
      .then(meta => {
        setModelsMeta(meta);

        // 2. Fetch Audit Log from API (SQLite)
        return fetch('/api/audit')
          .then(r => r.json())
          .then((json: { data: any[], error?: string }) => {
            if (json.error) {
              console.error("API Error:", json.error);
              return;
            }

            const validRows: AuditRow[] = [];
            json.data.forEach((row: any) => {
              // Map API response to AuditRow schema
              const mapped: AuditRow = {
                id: row.case_id || 'unknown',
                test_date: row.timestamp ? row.timestamp.split('T')[0] : 'Unknown',
                model: row.model,
                category: row.category,
                verdict: row.verdict,
                prompt_text: row.prompt,
                response_text: row.response,
                cost: row.cost || 0, // Ensure cost is captured
                latency_ms: row.latency_ms,
                tokens_used: row.tokens_used
              };

              // We skip strict validation for now to match API shape directly
              // or use safeParse if schema matches perfectly
              validRows.push(mapped);
            });

            const rows = validRows.filter(r => r.model);
            setData(rows);

            // Calculate Initial Summary
            const agg: Record<string, ModelSummary> = {};
            rows.forEach(r => {
              if (!agg[r.model]) agg[r.model] = {
                model: r.model,
                provider: meta.find((m: ModelMetadata) => m.id === r.model)?.provider || 'Unknown',
                total: 0,
                refusals: 0, soft_refusals: 0, blocks: 0,
                refusal_rate: 0, soft_refusal_rate: 0, block_rate: 0,
                avg_len: 0,
                least_sensitive_topic: 'N/A',
                total_cost: 0
              };
              agg[r.model].total++;
              agg[r.model].total_cost += (r.cost || 0);
              if (r.verdict === 'REMOVED') agg[r.model].refusals++;
              if (r.verdict === 'REFUSAL') agg[r.model].soft_refusals++;
              if (r.verdict === 'BLOCKED') agg[r.model].blocks++;
              agg[r.model].avg_len += r.response_text ? r.response_text.length : 0;
            });

            setSummary(Object.values(agg).map(s => ({
              ...s,
              refusal_rate: s.total > 0 ? (s.refusals / s.total) * 100 : 0,
              soft_refusal_rate: s.total > 0 ? (s.soft_refusals / s.total) * 100 : 0,
              block_rate: s.total > 0 ? (s.blocks / s.total) * 100 : 0,
              avg_len: Math.round(s.avg_len / s.total)
            })));

            setLoading(false);
          });
      })
      .catch(e => {
        console.error("Init error", e);
        setLoading(false);
      });

    // 3. Fetch Trends (Keep CSV for now if API doesn't support trends yet)
    // Note: To fully migrate, we'd need a trends API too.
    const p2 = new Promise<void>((resolve) => {
      Papa.parse<any>('/trends.csv', {
        download: true,
        header: true,
        complete: (results) => {
          setTrends(results.data.filter(r => r.model));
          resolve();
        },
        error: () => resolve()
      });
    });

    // 4. Fetch Bias Log
    const p3 = new Promise<void>((resolve) => {
      Papa.parse<any>('/bias_log.csv', {
        download: true,
        header: true,
        complete: (results) => {
          setBiasData(results.data.filter(r => r.model));
          resolve();
        },
        error: () => resolve()
      });
    });
  }, []);

  // --- Filtering Config ---
  const [selectedDate, setSelectedDate] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [regionFilter, setRegionFilter] = useState('All');
  const [tierFilter, setTierFilter] = useState('All');
  // New: Interactive Chart Filters
  const [modelFilter, setModelFilter] = useState<string>('All');

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
    // Interactive Model Filter
    if (modelFilter !== 'All') {
      res = res.filter(r => r.model === modelFilter);
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
  }, [data, selectedDate, searchQuery, regionFilter, tierFilter, modelsMeta, modelFilter]);

  // Recalculate summary based on filtered data
  const filteredSummary = useMemo(() => {
    const agg: Record<string, ModelSummary> = {};
    const catAgg: Record<string, Record<string, { total: number; refusals: number }>> = {};

    filteredData.forEach(r => {
      // Main Agg
      if (!agg[r.model]) agg[r.model] = {
        model: r.model,
        provider: modelsMeta.find(m => m.id === r.model)?.provider || 'Unknown',
        total: 0,
        refusals: 0, soft_refusals: 0, blocks: 0,
        refusal_rate: 0, soft_refusal_rate: 0, block_rate: 0,
        avg_len: 0,
        least_sensitive_topic: 'N/A',
        total_cost: 0
      };

      // Category Agg
      if (!catAgg[r.model]) catAgg[r.model] = {};
      if (!catAgg[r.model][r.category]) catAgg[r.model][r.category] = { total: 0, refusals: 0 };

      agg[r.model].total++;
      agg[r.model].total_cost += (r.cost || 0);
      catAgg[r.model][r.category].total++;

      if (r.verdict === 'REMOVED') {
        agg[r.model].refusals++;
        catAgg[r.model][r.category].refusals++;
      }
      if (r.verdict === 'REFUSAL') agg[r.model].soft_refusals++;
      if (r.verdict === 'BLOCKED') agg[r.model].blocks++;
      agg[r.model].avg_len += r.response_text ? r.response_text.length : 0;
    });

    return Object.values(agg).map(s => {
      // Calculate Least Sensitive Topic
      const cats = catAgg[s.model];
      let minRate = 101;
      let bestCats: string[] = [];

      if (cats) {
        Object.entries(cats).forEach(([cat, stats]) => {
          if (stats.total < 5) return; // Minimum sample size threshold
          const rate = (stats.refusals / stats.total) * 100;
          if (rate < minRate) {
            minRate = rate;
            bestCats = [cat];
          } else if (Math.abs(rate - minRate) < 0.01) {
            bestCats.push(cat);
          }
        });
      }

      const leastSensitive = bestCats.length > 0 ? bestCats.join(', ') : 'None';

      return {
        ...s,
        refusal_rate: s.total > 0 ? (s.refusals / s.total) * 100 : 0,
        soft_refusal_rate: s.total > 0 ? (s.soft_refusals / s.total) * 100 : 0,
        block_rate: s.total > 0 ? (s.blocks / s.total) * 100 : 0,
        avg_len: Math.round(s.avg_len / s.total),
        least_sensitive_topic: leastSensitive
      };
    });
  }, [filteredData, modelsMeta]);

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
  // Ensure we sort by refusal rate
  const chartData = [...filteredSummary].sort((a, b) => b.refusal_rate - a.refusal_rate);

  // --- Summary Table Config ---
  const summaryHelper = createColumnHelper<ModelSummary>();
  const summaryColumns = [
    summaryHelper.accessor('model', {
      header: 'Model',
      cell: info => (
        <div className="flex items-center gap-3">
          <ModelLogo provider={info.row.original.provider} name={info.getValue()} />
          <Link
            href={`/model/${encodeURIComponent(info.getValue())}`}
            className="font-medium text-indigo-600 hover:text-indigo-800 hover:underline"
          >
            {info.getValue()}
          </Link>
        </div>
      ),
    }),
    summaryHelper.accessor('refusal_rate', {
      header: ({ column }) => (
        <div className="flex items-center gap-1">
          <button className="flex items-center gap-1 font-bold" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
            Censorship Score <ArrowUpDown className="h-4 w-4" />
          </button>
          <InfoTooltip text="Percentage of prompts refused (REMOVED verdict). Higher means stricter modulation." />
        </div>
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
      header: () => (
        <div className="flex items-center gap-1">
          <span>Avg Response Length</span>
          <InfoTooltip text="Average character count of model responses. Longer responses might indicate more comprehensive reasoning." />
        </div>
      ),
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
                Moderation Bias
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

          {/* Stats Grid - Moved to Top (Removed Duplicate) */}


          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col md:flex-row gap-4 items-center justify-between mb-8">
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
            {/* ... Filters ... */}
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-lg border border-slate-200">
                <Filter className="h-4 w-4 text-slate-400" />
                <span className="text-xs font-bold uppercase text-slate-500">Filter By:</span>
              </div>

              {modelFilter !== 'All' && (
                <button
                  onClick={() => setModelFilter('All')}
                  className="flex items-center gap-1 px-3 py-2 bg-indigo-50 text-indigo-700 rounded-lg text-sm font-bold border border-indigo-200 hover:bg-indigo-100 transition-colors"
                >
                  <X className="h-3 w-3" />
                  Model: {modelFilter.split('/')[1] || modelFilter}
                </button>
              )}

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

              {(modelFilter !== 'All' || regionFilter !== 'All' || tierFilter !== 'All' || selectedDate !== 'all') && (
                <button
                  onClick={() => {
                    setModelFilter('All');
                    setRegionFilter('All');
                    setTierFilter('All');
                    setSelectedDate('all');
                  }}
                  className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                  title="Reset All Filters"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </header>

        {/* Removed Static Analyst Report */}

        {/* Improved Leaderboard (Moved Up) */}
        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-8">
          <div className="p-6 border-b border-slate-100 bg-slate-50">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              Model Comparison
            </h2>
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

        {/* Heatmap Section (Moved Up) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm overflow-x-auto mb-8">
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
                    <div key={m} className="p-2 text-sm font-medium text-slate-700 flex items-center gap-2">
                      <ModelLogo provider={modelsMeta.find(meta => meta.id === m)?.provider || 'Unknown'} name={m} className="h-5 w-5" />
                      {m.split('/')[1] || m}
                    </div>
                    {heatmapData.categories.map(c => {
                      const cell = heatmapData.grid.find(x => x.model === m && x.category === c);
                      const rate = cell ? cell.rate : 0;
                      return (
                        <div
                          key={`${m}-${c}`}
                          className={cn(
                            "h-10 rounded flex items-center justify-center text-xs font-bold transition-transform relative border",
                            cell && cell.count > 0 ? getRateColor(rate) : "bg-slate-50 text-slate-300 border-slate-100",
                            cell && cell.count > 0 ? "hover:scale-105 cursor-pointer hover:ring-2 hover:ring-indigo-400 hover:z-10 border-transparent" : "cursor-not-allowed"
                          )}
                          title={cell && cell.count > 0 ? `Click to view details for ${m} - ${c}\n${rate.toFixed(1)}% Refusal (${cell?.count} audits)` : "Not Audited: This model has not been tested on this category yet."}
                          onClick={() => cell && cell.count > 0 && setSelectedDrillDown(cell)}
                        >
                          {cell && cell.count > 0 ? `${rate.toFixed(0)}%` : "N/A"}
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

        {/* Bias Chart Moved to Charts Row */}

        {/* Stats Grid Removed (Duplicate / Redundant) */}

        {/* Charts Row: Price, Bias, & Category */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Price Analysis Chart */}
          <ChartErrorBoundary fallbackMessage="Price analysis unavailable.">
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm h-full">
              <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                <Trophy className="h-5 w-5 text-amber-500" />
                Price of Censorship
                <InfoTooltip text="Does paying more guarantee less censorship?" />
              </h3>
              <PriceChart data={filteredSummary.map(s => ({ model: s.model, cost: s.total_cost }))} />
            </div>
          </ChartErrorBoundary>

          {/* Category Sensitivity Chart */}
          <ChartErrorBoundary fallbackMessage="Category analysis unavailable.">
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm h-full">
              <CategoryChart data={heatmapData.categories.map(c => {
                // Calculate aggregate refusal rate for this category across ALL filtered models
                const relevantRows = filteredData.filter(r => r.category === c);
                const total = relevantRows.length;
                const refusals = relevantRows.filter(r => r.verdict === 'REMOVED').length;
                return {
                  category: c,
                  rate: total > 0 ? (refusals / total) * 100 : 0
                };
              })} />
            </div>
          </ChartErrorBoundary>

          {/* Bias Analysis Chart */}
          <ChartErrorBoundary fallbackMessage="Bias analysis unavailable.">
            <BiasChart data={biasData} />
          </ChartErrorBoundary>
        </div>

        {/* Full Width Time-Travel Chart */}
        {/* Full Width Time-Travel Chart - Slider Integrated */}
        <div className="mb-8">
          <TimeLapseChart data={trends} />
        </div>

        {/* Radar Chart Removed (Censorship Profile) as requested */}


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
                    <div className="flex flex-col items-center justify-center py-16 text-center select-none opacity-60">
                      <div className="bg-slate-100 p-4 rounded-full mb-4">
                        <AlertCircle className="h-8 w-8 text-slate-300" />
                      </div>
                      <h4 className="text-lg font-semibold text-slate-400 mb-1">No Data Available</h4>
                      <p className="text-sm text-slate-400 max-w-sm mx-auto">
                        We couldn't find any audit records for <strong className="text-slate-500">{selectedDrillDown.model}</strong> in the <strong className="text-slate-500">{selectedDrillDown.category}</strong> category.
                        <br /><br />
                        <span className="italic">This usually means the model refused to answer even benign prompts due to safety filters, or the API request timed out during data collection.</span>
                      </p>
                    </div>
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
