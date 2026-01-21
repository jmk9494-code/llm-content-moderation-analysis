'use client';

import { useEffect, useState, useMemo } from 'react';
import { StatCard, StatCardGrid } from '@/components/ui/StatCard';
import { SkeletonCard, SkeletonChart, SkeletonTable } from '@/components/ui/Skeleton';
import { ActivityFeed } from '@/components/ui/ActivityFeed';
import { InsightsSummary } from '@/components/ui/InsightsSummary';
import { useToast } from '@/components/ui/Toast';
import { Activity, Filter, CheckCircle, Zap } from 'lucide-react';
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

type FilterType = 'all' | 'safe' | 'unsafe' | 'recent';

export default function DashboardPage() {
  const [data, setData] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const { addToast } = useToast();

  useEffect(() => {
    fetch('/api/audit')
      .then((r) => r.json())
      .then((json) => {
        if (json.data) {
          setData(json.data);
          addToast({ type: 'success', title: 'Data loaded', message: `${json.data.length} audit records` });
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load audit data', err);
        addToast({ type: 'error', title: 'Failed to load data', message: err.message });
        setLoading(false);
      });
  }, []);

  // Filtered data based on active filter
  const filteredData = useMemo(() => {
    if (activeFilter === 'all') return data;
    if (activeFilter === 'safe') return data.filter(d => d.verdict === 'safe');
    if (activeFilter === 'unsafe') return data.filter(d => d.verdict === 'unsafe');
    if (activeFilter === 'recent') {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      return data.filter(d => new Date(d.timestamp) >= sevenDaysAgo);
    }
    return data;
  }, [data, activeFilter]);

  // Calculate stats
  const stats = useMemo(() => {
    const totalAudits = data.length;
    const uniqueModels = new Set(data.map(d => d.model)).size;
    return { totalAudits, uniqueModels };
  }, [data]);

  const filterButtons: { label: string; value: FilterType; icon: React.ReactNode }[] = [
    { label: 'All', value: 'all', icon: <Filter className="h-4 w-4" /> },
    { label: 'Safe', value: 'safe', icon: <CheckCircle className="h-4 w-4 text-green-500" /> },
    { label: 'Unsafe', value: 'unsafe', icon: <Zap className="h-4 w-4 text-red-500" /> },
    { label: 'Recent', value: 'recent', icon: <Activity className="h-4 w-4 text-blue-500" /> },
  ];

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
            {/* Single Stat Card with Tooltip */}
            <StatCardGrid>
              <StatCard
                title="Total Audits"
                value={stats.totalAudits.toLocaleString()}
                icon={<Activity className="h-5 w-5 text-indigo-600" />}
                description={
                  <span title="Safe = Model provided helpful response. Unsafe/Removed = Model refused or flagged content. Higher refusal rates may indicate over-censorship.">
                    {stats.uniqueModels} models tested ⓘ
                  </span>
                }
                delay={0}
              />
            </StatCardGrid>

            {/* AI Insights */}
            <InsightsSummary data={data} />

            {/* Quick Filters */}
            <div className="flex flex-wrap items-center gap-2">
              {filterButtons.map(btn => (
                <button
                  key={btn.value}
                  onClick={() => setActiveFilter(btn.value)}
                  className={`inline-flex items-center gap-2 px-3 md:px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeFilter === btn.value
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700'
                    }`}
                >
                  {btn.icon}
                  <span className="hidden sm:inline">{btn.label}</span>
                  {activeFilter === btn.value && filteredData.length !== data.length && (
                    <span className="ml-1 text-xs opacity-75">({filteredData.length})</span>
                  )}
                </button>
              ))}
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Charts and Table - Main area */}
              <div className="lg:col-span-3 space-y-6">
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
              </div>

              {/* Activity Feed - Sidebar */}
              <div className="lg:col-span-1">
                <div className="sticky top-20">
                  <ActivityFeed data={data} maxItems={15} />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
