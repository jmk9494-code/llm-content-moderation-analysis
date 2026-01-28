'use client';

import { useEffect, useState, useMemo } from 'react';

import { StatCard, StatCardGrid } from '@/components/ui/StatCard';
import { SkeletonCard, SkeletonChart, SkeletonTable } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { Activity, Calendar, Clock, RefreshCw, Search, X, AlertTriangle, FileText, Database, ShieldCheck } from 'lucide-react';
import Papa from 'papaparse';
import HeatmapTable from '@/components/HeatmapTable';
import { CensorshipHeatmap } from '@/components/CensorshipHeatmap';
import ModelComparison from '@/components/ModelComparison';
import { DataTable, SortableHeader } from '@/components/ui/DataTable';
import { ColumnDef } from '@tanstack/react-table';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ScatterChart, Scatter, ReferenceLine } from 'recharts';

import { fetchAuditData, type AuditRow } from '@/lib/data-loading';

// Type AuditRow is now imported from @/lib/data-loading


// Columns for Audit Log table
const auditColumns: ColumnDef<AuditRow>[] = [
  {
    accessorKey: 'timestamp',
    header: ({ column }) => <SortableHeader column={column} title="Date" />,
    cell: ({ row }) => new Date(row.getValue('timestamp')).toLocaleDateString()
  },
  {
    accessorKey: 'model',
    header: ({ column }) => <SortableHeader column={column} title="Model" />,
    cell: ({ row }) => {
      const model = row.getValue('model') as string;
      const modelName = model && typeof model === 'string' ? (model.split('/')[1] || model) : 'Unknown';
      return <span className="font-medium">{modelName}</span>;
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
      const isRefusal = ['REMOVED', 'REFUSAL', 'unsafe'].includes(verdict);
      return (
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${isRefusal ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
          {verdict}
        </span>
      );
    },
  },
  {
    accessorKey: 'prompt',
    header: 'Prompt',
    cell: ({ row }) => <div className="max-w-xs truncate text-xs text-slate-500" title={row.getValue('prompt')}>{row.getValue('prompt')}</div>,
  },
  {
    accessorKey: 'response',
    header: 'Response',
    cell: ({ row }) => <div className="max-w-xs truncate text-xs text-slate-500 font-mono" title={row.getValue('response')}>{row.getValue('response')}</div>,
  },
];

export default function DashboardPage() {
  const [data, setData] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const { addToast } = useToast();

  // Filter states
  const [selectedModel, setSelectedModel] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedRegion, setSelectedRegion] = useState<string>('all');
  const [selectedDate, setSelectedDate] = useState<string>('all');
  const [keyword, setKeyword] = useState<string>('');

  // Phase 9: Validation State
  const [pValues, setPValues] = useState<any[]>([]);
  const [biasData, setBiasData] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'summary' | 'validation'>('summary');

  useEffect(() => {
    // 1. Fetch Audit Data
    // 1. Fetch Audit Data (Client-side)
    fetchAuditData()
      .then((cleanData) => {
        setData(cleanData);
        addToast({ type: 'success', title: 'Data loaded', message: `${cleanData.length} audit records` });
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load audit data', err);
        addToast({ type: 'error', title: 'Failed to load data', message: err.message });
        setLoading(false);
      });

    // 2. Fetch P-Values (Validation)
    fetch('/assets/p_values.csv')
      .then(r => r.ok ? r.text() : Promise.reject('No P-Values'))
      .then(csv => {
        Papa.parse(csv, {
          header: true,
          skipEmptyLines: true,
          complete: (results: any) => setPValues(results.data)
        });
      })
      .catch(() => console.warn("P-Values CSV not found (run significance.py)"));

    // 3. Fetch Bias Data (if available)
    fetch('/bias_log.csv')
      .then(r => r.ok ? r.text() : Promise.reject('No Bias Log'))
      .then(csv => {
        Papa.parse(csv, {
          header: true,
          skipEmptyLines: true,
          complete: (results: any) => setBiasData(results.data)
        });
      })
      .catch(() => { });
  }, []);

  // Extract unique values for filters
  const filterOptions = useMemo(() => {
    // Exclude models with < 100 VALID data points
    const validModelCounts: Record<string, number> = {};
    data.forEach(d => {
      if (d.verdict && d.verdict !== 'ERROR' && d.verdict !== 'BLOCKED') {
        validModelCounts[d.model] = (validModelCounts[d.model] || 0) + 1;
      }
    });

    const models = Array.from(new Set(data.map(d => d.model))).filter(m => (validModelCounts[m] || 0) >= 100).sort();
    const categories = Array.from(new Set(data.map(d => d.category))).sort();
    // Safely handle timestamp splitting
    const dates = Array.from(new Set(data.map(d => {
      if (!d.timestamp || typeof d.timestamp !== 'string') return null;
      return d.timestamp.split('T')[0];
    }))).filter(Boolean) as string[];
    dates.sort().reverse();

    // Map provider to region based on company HQ
    const providerRegionMap: Record<string, string> = {
      'openai': 'US',
      'anthropic': 'US',
      'google': 'US',
      'meta-llama': 'US',
      'x-ai': 'US',
      'cohere': 'Canada',
      'deepseek': 'China',
      '01-ai': 'China',
      'qwen': 'China',
      'mistralai': 'EU',
      'microsoft': 'US',
    };

    const getRegion = (model: string) => {
      if (!model || typeof model !== 'string') return 'Other';
      const provider = model.split('/')[0];
      return providerRegionMap[provider] || 'Other';
    };

    const regions = Array.from(new Set(data.map(d => getRegion(d.model)))).sort();

    return { models, categories, dates, regions, getRegion };
  }, [data]);

  // Filtered data based on all filters
  const filteredData = useMemo(() => {
    let filtered = data.filter(d => filterOptions.models.includes(d.model));

    // Model filter
    if (selectedModel !== 'all') {
      filtered = filtered.filter(d => d.model === selectedModel);
    }

    // Region filter (derived from model name)
    if (selectedRegion !== 'all') {
      filtered = filtered.filter(d => filterOptions.getRegion(d.model) === selectedRegion);
    }

    // Category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(d => d.category === selectedCategory);
    }

    // Date filter (specific date)
    if (selectedDate !== 'all') {
      filtered = filtered.filter(d => {
        if (!d.timestamp || typeof d.timestamp !== 'string') return false;
        return d.timestamp.split('T')[0] === selectedDate;
      });
    }

    // Keyword filter (searches prompt and response)
    if (keyword.trim()) {
      const kw = keyword.toLowerCase();
      filtered = filtered.filter(d =>
        d.prompt?.toLowerCase().includes(kw) ||
        d.response?.toLowerCase().includes(kw) ||
        d.category?.toLowerCase().includes(kw)
      );
    }

    return filtered;
  }, [data, selectedModel, selectedCategory, selectedRegion, selectedDate, keyword, filterOptions]);

  // Calculate stats
  const stats = useMemo(() => {
    const totalAudits = data.length;
    const uniqueModels = new Set(data.map(d => d.model)).size;
    const uniqueDates = new Set(data
      .map(d => d.timestamp && typeof d.timestamp === 'string' ? d.timestamp.split('T')[0] : null)
      .filter(Boolean)
    ).size;
    const sortedDates = data.map(d => new Date(d.timestamp)).sort((a, b) => a.getTime() - b.getTime());
    const firstDate = sortedDates[0] || new Date();
    const lastDate = sortedDates[sortedDates.length - 1] || new Date();
    const daysSinceStart = Math.floor((new Date().getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24));
    const hoursSinceUpdate = Math.floor((new Date().getTime() - lastDate.getTime()) / (1000 * 60 * 60));

    // Refusal stats
    const refusals = data.filter(d => d.verdict === 'REFUSAL' || d.verdict === 'REMOVED' || d.verdict === 'unsafe').length;
    const refusalRate = totalAudits > 0 ? (refusals / totalAudits) * 100 : 0;

    // Top categories by refusals
    // Top categories by refusal rate
    const catCounts: Record<string, number> = {};
    const catTotalCounts: Record<string, number> = {};

    data.forEach(d => {
      catTotalCounts[d.category] = (catTotalCounts[d.category] || 0) + 1;
      if (d.verdict === 'REFUSAL' || d.verdict === 'REMOVED' || d.verdict === 'unsafe') {
        catCounts[d.category] = (catCounts[d.category] || 0) + 1;
      }
    });

    // Convert to refusal rate per category
    const topCategories = Object.keys(catTotalCounts)
      .map(name => {
        const refusals = catCounts[name] || 0;
        const total = catTotalCounts[name] || 0;
        return {
          name,
          value: total > 0 ? parseFloat(((refusals / total) * 100).toFixed(1)) : 0,
          count: refusals,
          total,
          label: 'Refusals / Total in Category'
        };
      })
      .filter(c => c.total > 0)
      .sort((a, b) => b.value - a.value);

    // Tier freshness - based on model names/providers
    const lowTierModels = ['gpt-4o-mini', 'haiku', 'flash-lite', '7b', 'ministral'];
    const highTierModels = ['gpt-4o', 'claude-3.5-sonnet', 'mistral-large', 'deepseek', '72b'];

    const getTierData = (keywords: string[]) => {
      const tierRows = data.filter(d => keywords.some(k => d.model.toLowerCase().includes(k)));
      if (tierRows.length === 0) return { lastUpdate: null, daysSince: 999 };
      const dates = tierRows.map(d => new Date(d.timestamp)).sort((a, b) => b.getTime() - a.getTime());
      const lastUpdate = dates[0];
      const daysSince = Math.floor((new Date().getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24));
      return { lastUpdate, daysSince };
    };

    const efficiencyTier = getTierData(lowTierModels);
    const mediumTier = getTierData(['flash', 'haiku', 'small', 'medium', 'plus']);
    const expensiveTier = getTierData(highTierModels);

    return {
      totalAudits, uniqueModels, uniqueDates, firstDate, lastDate, daysSinceStart, hoursSinceUpdate,
      refusals, refusalRate, topCategories,
      efficiencyTier, mediumTier, expensiveTier
    };
  }, [data]);

  const clearFilters = () => {
    setSelectedModel('all');
    setSelectedCategory('all');
    setSelectedRegion('all');
    setSelectedDate('all');
    setKeyword('');
  };

  const hasActiveFilters = selectedModel !== 'all' || selectedCategory !== 'all' || selectedRegion !== 'all' || selectedDate !== 'all' || keyword.trim() !== '';

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans text-slate-900">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <header className="mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-3">
                📊 Overview
              </h1>
              <p className="text-slate-500 text-sm md:text-base">
                Discover how AI models handle content moderation across {stats.uniqueModels || 'multiple'} providers.
              </p>
            </div>

          </div>
        </header>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 mb-6">
          <button
            onClick={() => setActiveTab('summary')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'summary'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('validation')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'validation'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
          >
            Deep Dive
          </button>
        </div>

        {loading ? (
          <div className="space-y-6">
            <SkeletonCard />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <SkeletonChart />
              <SkeletonChart />
            </div>
            <SkeletonTable rows={5} />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Common Stat Cards (Visible on both tabs?) -> Usually Overview specific. Let's keep them on Overview as per typical dashboard design, or maybe top level stats are always good. Let's put them in Overview for cleaner Separation. */}

            {activeTab === 'summary' && (
              <>
                <StatCardGrid>
                  <StatCard
                    title="Total Audits"
                    value={stats.totalAudits.toLocaleString()}
                    icon={<Activity className="h-5 w-5 text-indigo-600" />}
                    description={
                      <span title="Safe = Model provided helpful response. Unsafe/Removed = Model refused or flagged content.">
                        {stats.uniqueModels} models tested ⓘ
                      </span>
                    }
                    delay={0}
                  />
                  <StatCard
                    title="Efficiency Tier"
                    value={stats.efficiencyTier.daysSince > 7 ? 'Stale' : 'Fresh'}
                    icon={<Clock className={`h-5 w-5 ${stats.efficiencyTier.daysSince > 7 ? 'text-yellow-600' : 'text-green-600'}`} />}
                    description={
                      <span className={stats.efficiencyTier.daysSince > 7 ? 'text-yellow-600 font-medium' : 'text-green-600 font-medium'}>
                        Updated {stats.efficiencyTier.daysSince}d ago (Weekly)
                      </span>
                    }
                    delay={0.1}
                  />
                  <StatCard
                    title="Medium Tier"
                    value={stats.mediumTier.daysSince > 32 ? 'Stale' : 'Fresh'}
                    icon={<Clock className={`h-5 w-5 ${stats.mediumTier.daysSince > 32 ? 'text-yellow-600' : 'text-green-600'}`} />}
                    description={
                      <span className={stats.mediumTier.daysSince > 32 ? 'text-yellow-600 font-medium' : 'text-green-600 font-medium'}>
                        Updated {stats.mediumTier.daysSince}d ago (Monthly)
                      </span>
                    }
                    delay={0.2}
                  />
                  <StatCard
                    title="Expensive Tier"
                    value={stats.expensiveTier.daysSince > 62 ? 'Stale' : 'Fresh'}
                    icon={<Clock className={`h-5 w-5 ${stats.expensiveTier.daysSince > 62 ? 'text-yellow-600' : 'text-green-600'}`} />}
                    description={
                      <span className={stats.expensiveTier.daysSince > 62 ? 'text-yellow-600 font-medium' : 'text-green-600 font-medium'}>
                        Updated {stats.expensiveTier.daysSince}d ago (Bi-Monthly)
                      </span>
                    }
                    delay={0.3}
                  />
                </StatCardGrid>

                {/* Full Width Refusal Rate Card */}
                <StatCard
                  title="Overall Refusal Rate"
                  value={`${stats.refusalRate.toFixed(1)}%`}
                  icon={<AlertTriangle className={`h-5 w-5 ${stats.refusalRate > 30 ? 'text-red-600' : stats.refusalRate > 15 ? 'text-amber-600' : 'text-emerald-600'}`} />}
                  description={`${stats.refusals} of ${stats.totalAudits} censored`}
                  delay={0.4}
                  className="flex flex-col items-center text-center justify-center w-full bg-slate-50/50 border-slate-200/60 shadow-sm"
                />

                {/* Filter Controls */}
                <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                  <div className="flex flex-wrap items-center gap-3">
                    {/* Keyword Search */}
                    <div className="relative flex-grow max-w-xs">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search prompts..."
                        value={keyword}
                        onChange={(e) => setKeyword(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    {/* Region Filter */}
                    <select
                      value={selectedRegion}
                      onChange={(e) => setSelectedRegion(e.target.value)}
                      className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="all">All Regions</option>
                      {filterOptions.regions.map(r => (
                        <option key={r} value={r}>{r === 'US' ? '🇺🇸 US' : r === 'EU' ? '🇪🇺 EU' : r === 'China' ? '🇨🇳 China' : r === 'Canada' ? '🇨🇦 Canada' : r}</option>
                      ))}
                    </select>

                    {/* Model Filter */}
                    <select
                      value={selectedModel}
                      onChange={(e) => setSelectedModel(e.target.value)}
                      className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="all">All Models</option>
                      {filterOptions.models.map(m => {
                        const displayName = m && typeof m === 'string' ? (m.split('/')[1] || m) : 'Unknown';
                        return <option key={m} value={m}>{displayName}</option>;
                      })}
                    </select>

                    {/* Category Filter */}
                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="all">All Categories</option>
                      {filterOptions.categories.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>

                    {/* Date Filter (specific dates) */}
                    <select
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="all">All Run Dates</option>
                      {filterOptions.dates.map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>

                    {/* Clear Filters */}
                    {hasActiveFilters && (
                      <button
                        onClick={clearFilters}
                        className="inline-flex items-center gap-1 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <X className="h-4 w-4" />
                        Clear
                      </button>
                    )}
                  </div>

                  {/* Results count */}
                  {hasActiveFilters && (
                    <div className="mt-3 text-sm text-slate-500">
                      Showing {filteredData.length} of {data.length} records
                    </div>
                  )}
                </div>

                {/* Main Content Grid - Overview */}
                <div className="space-y-6">

                  {/* Model Comparison */}
                  {filteredData.length > 0 && (
                    <ModelComparison
                      data={filteredData}
                      onModelSelect={(model) => setSelectedModel(model)}
                    />
                  )}

                  {/* Heatmap Visualization (Pillar 5) */}
                  {filteredData.length > 0 && (
                    <div className="space-y-4">
                      <CensorshipHeatmap
                        data={filteredData}
                        title="Category Sensitivity Heatmap"
                        description="This table visualizes refusal rates by category. Red cells indicate strict blocking/refusal, while green cells indicate permissiveness."
                      />
                    </div>
                  )}

                  {/* Top Censorship Categories Chart */}
                  {filteredData.length > 0 && stats.topCategories.length > 0 && (
                    <div className="bg-white p-6 rounded-xl border border-slate-200">
                      <h3 className="text-lg font-bold mb-4">🚫 Top Refusal Categories (Refusal Rate)</h3>
                      <div style={{ height: `${Math.max(300, stats.topCategories.length * 40)}px` }} className="min-h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={stats.topCategories} layout="vertical" margin={{ left: 40, right: 40 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                            <XAxis type="number" hide domain={[0, 100]} />
                            <YAxis dataKey="name" type="category" width={150} tick={{ fontSize: 12, fontWeight: 600 }} />
                            <Tooltip
                              cursor={{ fill: 'transparent' }}
                              formatter={(value: any) => [`${value}%`, 'Refusals']}
                            />
                            <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={30}>
                              {stats.topCategories.map((_: any, index: number) => (
                                <Cell key={`cell-${index}`} fill={['#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16'][index] || '#64748b'} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}

                  {/* Audit Log Table */}
                  {filteredData.length > 0 && (
                    <div className="bg-white p-6 rounded-xl border border-slate-200">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-bold">📋 Audit Log</h3>
                      </div>
                      <DataTable
                        columns={auditColumns}
                        data={filteredData}
                        exportFilename="audit_log"
                        renderExpanded={(row) => (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm p-2">
                            <div className="space-y-2">
                              <h4 className="font-semibold text-slate-900 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-slate-400"></span> Prompt
                              </h4>
                              <div className="bg-slate-100 p-4 rounded-lg border border-slate-200 font-mono text-xs text-slate-700 whitespace-pre-wrap max-h-60 overflow-y-auto">
                                {row.prompt}
                              </div>
                            </div>
                            <div className="space-y-2">
                              <h4 className="font-semibold text-slate-900 flex items-center gap-2">
                                <span className={`w-2 h-2 rounded-full ${['REMOVED', 'REFUSAL', 'unsafe'].includes(row.verdict) ? 'bg-red-500' : 'bg-green-500'}`}></span>
                                Response
                              </h4>
                              <div className="bg-slate-100 p-4 rounded-lg border border-slate-200 font-mono text-xs text-slate-700 whitespace-pre-wrap max-h-60 overflow-y-auto">
                                {row.response}
                              </div>
                            </div>
                            <div className="col-span-1 md:col-span-2 grid grid-cols-2 md:grid-cols-4 gap-4 pt-2 border-t border-slate-100">
                              <div>
                                <span className="block text-xs text-slate-500 mb-1">Latency</span>
                                <span className="font-medium text-slate-700">{row.latency_ms} ms</span>
                              </div>
                              <div>
                                <span className="block text-xs text-slate-500 mb-1">Tokens Used</span>
                                <span className="font-medium text-slate-700">{row.tokens_used}</span>
                              </div>
                              <div>
                                <span className="block text-xs text-slate-500 mb-1">Est. Cost</span>
                                <span className="font-medium text-slate-700">${row.cost?.toFixed(6) || '0.000000'}</span>
                              </div>
                              <div>
                                <span className="block text-xs text-slate-500 mb-1">Case ID</span>
                                <span className="font-mono text-xs text-slate-500">{row.case_id}</span>
                              </div>
                            </div>
                          </div>
                        )}
                      />
                    </div>
                  )}

                  {filteredData.length === 0 && (
                    <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
                      <p className="text-slate-500">No results match your filters.</p>
                      <button onClick={clearFilters} className="mt-2 text-indigo-600 hover:underline">Clear filters</button>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Deep Dive Content - Moved Components Here */}
            {activeTab === 'validation' && (
              <div className="space-y-6 animate-in fade-in duration-300">
                {/* Phase 8 Insights Grid - Moved to Deep Dive */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* Political Compass Card */}
                  <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm overflow-hidden">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-bold flex items-center gap-2">
                        🧭 Political Compass
                      </h3>
                      <span className="px-2 py-1 bg-indigo-50 text-indigo-700 text-xs font-medium rounded-full">New</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <p className="text-sm text-slate-500 mb-4 text-center">
                        AI models mapped on Economic (X) vs Social (Y) axes based on 30 propositions.
                      </p>
                      <div className="relative w-full aspect-square max-w-sm bg-slate-50 rounded-lg border border-slate-100 flex items-center justify-center overflow-hidden">
                        <img
                          src="/political_compass.png"
                          alt="AI Political Compass"
                          className="object-contain w-full h-full hover:scale-105 transition-transform duration-500"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                            (e.target as HTMLImageElement).parentElement!.innerHTML = '<span class="text-slate-400 text-sm">Chart not generated yet</span>';
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Paternalism Card */}
                  <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm overflow-hidden">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-bold flex items-center gap-2">
                        👶 Paternalism Audit
                      </h3>
                      <span className="px-2 py-1 bg-amber-50 text-amber-700 text-xs font-medium rounded-full">New</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <p className="text-sm text-slate-500 mb-4 text-center">
                        Do models refuse "Laypeople" (Teenagers) more than "Authority" figures?
                      </p>
                      <div className="relative w-full aspect-square max-w-sm bg-slate-50 rounded-lg border border-slate-100 flex items-center justify-center overflow-hidden">
                        <img
                          src="/paternalism.png"
                          alt="Paternalism Chart"
                          className="object-contain w-full h-full hover:scale-105 transition-transform duration-500"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                            (e.target as HTMLImageElement).parentElement!.innerHTML = '<span class="text-slate-400 text-sm">Chart not generated yet</span>';
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Evidence Locker Card */}
                  <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-bold flex items-center gap-2">
                        📂 Evidence Locker
                      </h3>
                      <span className="px-2 py-1 bg-purple-50 text-purple-700 text-xs font-medium rounded-full">Transparency</span>
                    </div>
                    <p className="text-sm text-slate-500 mb-6 flex-grow">
                      Explore raw audit traces with full transparency. Identify cases where models exhibit "Paternalism" (answering Authority figures but refusing Laypeople) or inconsistent safety boundaries.
                    </p>
                    <div className="bg-slate-50 rounded-lg p-4 border border-slate-100 mb-6">
                      <div className="flex items-center gap-3 text-sm text-slate-700 mb-2">
                        <span className="w-2 h-2 rounded-full bg-red-500"></span>
                        <span>Refusals & Censorship</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-slate-700">
                        <span className="w-2 h-2 rounded-full bg-purple-400"></span>
                        <span>Paternalistic Patterns</span>
                      </div>
                    </div>
                    <a
                      href="/explorer.html"
                      target="_blank"
                      className="mt-auto w-full inline-flex justify-center items-center px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors font-medium text-sm gap-2"
                    >
                      <Search className="w-4 h-4" />
                      Open Evidence Locker
                    </a>
                  </div>
                </div>

                {/* Validation Review (Statistical Sigs, Human Audit, Datasheet) - Moved Here */}
                {filteredData.length > 0 && (
                  <ValidationReview pValues={pValues} />
                )}
              </div>
            )}

          </div>
        )}
      </div>
    </main>

  );
}

function ValidationReview({ pValues }: { pValues: any[] }) {
  return (
    <div className="space-y-8">
      {/* Ethics Datasheet */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-lg font-bold flex items-center gap-2">
              📋 Ethics Datasheet
            </h3>
            <p className="text-slate-500 text-sm mt-1">
              Standardized documentation for dataset composition, collection, and prohibited uses.
            </p>
          </div>
          <a href="/DATASHEET.md" target="_blank" className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 text-sm font-medium transition-colors">
            <FileText className="w-4 h-4" /> View Datasheet
          </a>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Statistical Significance */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            📊 Statistical Significance (McNemar's Test)
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 font-semibold">
                  <th className="text-left py-2">Model A</th>
                  <th className="text-left py-2">Model B</th>
                  <th className="text-right py-2">P-Value</th>
                  <th className="text-right py-2">Is Significant?</th>
                </tr>
              </thead>
              <tbody>
                {pValues.length === 0 ? (
                  <tr><td colSpan={4} className="py-4 text-center text-slate-400">No significance data available.</td></tr>
                ) : (
                  pValues.slice(0, 10).map((row, i) => (
                    <tr key={i} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                      <td className="py-2 text-slate-700">{row['Model A']}</td>
                      <td className="py-2 text-slate-700">{row['Model B']}</td>
                      <td className="py-2 text-right font-mono text-slate-600">{parseFloat(row['P-Value']).toExponential(2)}</td>
                      <td className="py-2 text-right">
                        {row['Significant'] === 'YES' ? (
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-bold">Yes</span>
                        ) : (
                          <span className="text-xs bg-slate-100 text-slate-500 px-2 py-1 rounded-full">No</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Human Audit */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            🕵️ Human Audit Kit
          </h3>
          <p className="text-sm text-slate-500 mb-6">
            Calculate Inter-Rater Reliability (Cohen's Kappa) by validating AI verdicts against human judgment.
          </p>

          <div className="space-y-4">
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-100 flex justify-between items-center">
              <div>
                <div className="font-medium text-slate-900">Step 1: Download Sample</div>
                <div className="text-xs text-slate-500">50 random traces for review</div>
              </div>
              <span className="text-xs text-slate-400 italic">Run script to generate</span>
            </div>

            <div className="p-4 bg-slate-50 rounded-lg border border-slate-100 flex justify-between items-center">
              <div>
                <div className="font-medium text-slate-900">Step 2: Calculate Kappa</div>
                <div className="text-xs text-slate-500">Compare Human vs AI labels</div>
              </div>
              <div className="font-mono text-2xl font-black text-slate-300">
                0.00
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

type BiasRow = { model: string; leaning: string; confidence: number };
const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#0088fe', '#00C49F'];

function BiasCompassView({ biasData }: { biasData: BiasRow[], allModels: string[] }) {
  const leaningCoords: Record<string, { x: number, y: number }> = {
    'Left-Libertarian': { x: -0.7, y: -0.5 }, 'Left-Authoritarian': { x: -0.7, y: 0.5 },
    'Right-Libertarian': { x: 0.7, y: -0.5 }, 'Right-Authoritarian': { x: 0.7, y: 0.5 }, 'Neutral-Safety': { x: 0, y: 0 }
  };
  const scatterData = biasData.map(row => {
    const base = leaningCoords[row.leaning] || { x: 0, y: 0 };
    return { ...row, x: base.x + (Math.random() - 0.5) * 0.4, y: base.y + (Math.random() - 0.5) * 0.4, z: 1 };
  });

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 h-[600px]">
      <h3 className="text-lg font-bold mb-2">Bias Compass</h3>
      <ResponsiveContainer>
        <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis type="number" dataKey="x" domain={[-1, 1]} hide />
          <YAxis type="number" dataKey="y" domain={[-1, 1]} hide />
          <ReferenceLine x={0} stroke="#cbd5e1" label="Authoritarian / Libertarian" />
          <ReferenceLine y={0} stroke="#cbd5e1" label="Left / Right" />
          <Scatter data={scatterData} fill="#8884d8">{scatterData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Scatter>
          <Tooltip cursor={{ strokeDasharray: '3 3' }} />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}
