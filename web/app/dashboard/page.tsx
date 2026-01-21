'use client';

import { useEffect, useState, useMemo } from 'react';
import { StatCard, StatCardGrid } from '@/components/ui/StatCard';
import { SkeletonCard, SkeletonChart, SkeletonTable } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { Activity, Calendar, Clock, RefreshCw, Search, X } from 'lucide-react';
import HeatmapTable from '@/components/HeatmapTable';
import ModelComparison from '@/components/ModelComparison';

export type AuditRow = {
  timestamp: string;
  model: string;
  case_id: string;
  category: string;
  verdict: string;
  prompt: string;
  response: string;
  cost: number;
  tokens_used: number;
  latency_ms: number;
};

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

  useEffect(() => {
    fetch('/api/audit')
      .then((r) => r.json())
      .then((json) => {
        if (json.data) {
          const cleanData = json.data.filter((d: AuditRow) => d.verdict !== 'ERROR');
          setData(cleanData);
          addToast({ type: 'success', title: 'Data loaded', message: `${cleanData.length} audit records` });
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load audit data', err);
        addToast({ type: 'error', title: 'Failed to load data', message: err.message });
        setLoading(false);
      });
  }, []);

  // Extract unique values for filters
  const filterOptions = useMemo(() => {
    const models = Array.from(new Set(data.map(d => d.model))).sort();
    const categories = Array.from(new Set(data.map(d => d.category))).sort();
    const dates = Array.from(new Set(data.map(d => d.timestamp.split('T')[0]))).sort().reverse();

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
      const provider = model.split('/')[0];
      return providerRegionMap[provider] || 'Other';
    };

    const regions = Array.from(new Set(data.map(d => getRegion(d.model)))).sort();

    return { models, categories, dates, regions, getRegion };
  }, [data]);

  // Filtered data based on all filters
  const filteredData = useMemo(() => {
    let filtered = data;

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
      filtered = filtered.filter(d => d.timestamp.split('T')[0] === selectedDate);
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
    const uniqueDates = new Set(data.map(d => d.timestamp.split('T')[0])).size;
    const sortedDates = data.map(d => new Date(d.timestamp)).sort((a, b) => a.getTime() - b.getTime());
    const firstDate = sortedDates[0] || new Date();
    const lastDate = sortedDates[sortedDates.length - 1] || new Date();
    const daysSinceStart = Math.floor((new Date().getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24));
    const hoursSinceUpdate = Math.floor((new Date().getTime() - lastDate.getTime()) / (1000 * 60 * 60));
    return { totalAudits, uniqueModels, uniqueDates, firstDate, lastDate, daysSinceStart, hoursSinceUpdate };
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
    <main className="min-h-screen bg-slate-50 dark:bg-slate-900 p-4 md:p-8 font-sans text-slate-900 dark:text-slate-100">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <header className="mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Overview</h1>
              <p className="text-slate-500 dark:text-slate-400 text-sm md:text-base">
                Discover how AI models handle content moderation across {stats.uniqueModels || 'multiple'} providers.
              </p>
            </div>
          </div>
        </header>

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
            {/* Stat Cards */}
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
                title="Data Collection"
                value={stats.firstDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                icon={<Calendar className="h-5 w-5 text-emerald-600" />}
                description={`${stats.daysSinceStart} days of monitoring`}
                delay={0.1}
              />
              <StatCard
                title="Audit Runs"
                value={stats.uniqueDates.toString()}
                icon={<RefreshCw className="h-5 w-5 text-blue-600" />}
                description="Total audit sessions"
                delay={0.2}
              />
              <StatCard
                title="Data Freshness"
                value={stats.hoursSinceUpdate < 168 ? 'Fresh' : stats.hoursSinceUpdate < 336 ? 'Stale' : 'Outdated'}
                icon={<Clock className={`h-5 w-5 ${stats.hoursSinceUpdate < 168 ? 'text-green-600' : stats.hoursSinceUpdate < 336 ? 'text-yellow-600' : 'text-red-600'}`} />}
                description={
                  <span className={`font-medium ${stats.hoursSinceUpdate < 168 ? 'text-green-600' : stats.hoursSinceUpdate < 336 ? 'text-yellow-600' : 'text-red-600'}`}>
                    {stats.hoursSinceUpdate < 24 ? `${stats.hoursSinceUpdate}h ago` : `${Math.floor(stats.hoursSinceUpdate / 24)}d ago`} • Stale after 7 days
                  </span>
                }
                delay={0.3}
              />
            </StatCardGrid>

            {/* Filter Controls */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
              <div className="flex flex-wrap items-center gap-3">
                {/* Keyword Search */}
                <div className="relative flex-grow max-w-xs">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search prompts..."
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {/* Region Filter */}
                <select
                  value={selectedRegion}
                  onChange={(e) => setSelectedRegion(e.target.value)}
                  className="px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                  className="px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="all">All Models</option>
                  {filterOptions.models.map(m => (
                    <option key={m} value={m}>{m.split('/')[1] || m}</option>
                  ))}
                </select>

                {/* Category Filter */}
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                  className="px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                    className="inline-flex items-center gap-1 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                  >
                    <X className="h-4 w-4" />
                    Clear
                  </button>
                )}
              </div>

              {/* Results count */}
              {hasActiveFilters && (
                <div className="mt-3 text-sm text-slate-500 dark:text-slate-400">
                  Showing {filteredData.length} of {data.length} records
                </div>
              )}
            </div>

            {/* Main Content Grid - Full Width */}
            <div className="space-y-6">
              {/* Model Comparison */}
              {filteredData.length > 0 && (
                <ModelComparison data={filteredData} />
              )}

              {/* Heatmap Visualization */}
              {filteredData.length > 0 && (
                <HeatmapTable
                  data={filteredData}
                  title="Category Sensitivity Heatmap"
                  description="This table visualizes refusal rates by category. Red cells indicate strict blocking/refusal, while green cells indicate permissiveness."
                />
              )}

              {filteredData.length === 0 && (
                <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                  <p className="text-slate-500 dark:text-slate-400">No results match your filters.</p>
                  <button onClick={clearFilters} className="mt-2 text-indigo-600 hover:underline">Clear filters</button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
