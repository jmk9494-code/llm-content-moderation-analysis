'use client';

import { useEffect, useState, useMemo } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { DataTable, SortableHeader } from '@/components/ui/DataTable';
import { StatCard, StatCardGrid } from '@/components/ui/StatCard';
import { SkeletonCard, SkeletonChart, SkeletonTable } from '@/components/ui/Skeleton';
import { ActivityFeed } from '@/components/ui/ActivityFeed';
import { InsightsSummary } from '@/components/ui/InsightsSummary';
import { useToast } from '@/components/ui/Toast';
import { Activity, Filter, LayoutGrid, List, CheckCircle, Zap } from 'lucide-react';
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
type ViewMode = 'table' | 'cards';

// Define columns for the DataTable (removed cost and token columns)
const columns: ColumnDef<AuditRow>[] = [
  {
    accessorKey: 'timestamp',
    header: ({ column }) => <SortableHeader column={column} title="Date" />,
    cell: ({ row }) => new Date(row.getValue('timestamp')).toLocaleDateString(),
  },
  {
    accessorKey: 'model',
    header: ({ column }) => <SortableHeader column={column} title="Model" />,
    cell: ({ row }) => {
      const model = row.getValue('model') as string;
      return <span className="font-medium">{model?.split('/')[1] || model}</span>;
    }
  },
  {
    accessorKey: 'category',
    header: ({ column }) => <SortableHeader column={column} title="Category" />,
    cell: ({ row }) => (
      <span className="px-2 py-1 text-xs bg-slate-100 dark:bg-slate-700 rounded-full">
        {row.getValue('category')}
      </span>
    ),
  },
  {
    accessorKey: 'verdict',
    header: ({ column }) => <SortableHeader column={column} title="Verdict" />,
    cell: ({ row }) => {
      const verdict = row.getValue('verdict') as string;
      const styles = {
        safe: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
        unsafe: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
        default: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
      };
      const style = styles[verdict as keyof typeof styles] || styles.default;
      return <span className={`px-2 py-1 text-xs font-medium rounded-full ${style}`}>{verdict}</span>;
    },
  },
  {
    accessorKey: 'prompt',
    header: 'Prompt',
    cell: ({ row }) => {
      const prompt = row.getValue('prompt') as string;
      return (
        <div className="max-w-xs truncate text-xs text-slate-500 dark:text-slate-400" title={prompt}>
          {prompt || 'N/A'}
        </div>
      );
    },
  },
];

// Expanded row renderer
function ExpandedRowContent({ row }: { row: AuditRow }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <h4 className="font-semibold text-slate-700 dark:text-slate-200 mb-2 flex items-center gap-2">
          <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
          Prompt
        </h4>
        <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap bg-slate-100 dark:bg-slate-800 p-3 rounded-md max-h-48 overflow-y-auto">
          {row.prompt || 'No prompt available'}
        </p>
      </div>
      <div>
        <h4 className="font-semibold text-slate-700 dark:text-slate-200 mb-2 flex items-center gap-2">
          <span className="w-2 h-2 bg-green-500 rounded-full"></span>
          Response
        </h4>
        <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap bg-slate-100 dark:bg-slate-800 p-3 rounded-md max-h-48 overflow-y-auto">
          {row.response || 'No response available'}
        </p>
      </div>
    </div>
  );
}

// Card view for mobile
function AuditCard({ row }: { row: AuditRow }) {
  const verdictStyle = {
    safe: 'border-l-green-500 bg-green-50/50 dark:bg-green-900/10',
    unsafe: 'border-l-red-500 bg-red-50/50 dark:bg-red-900/10',
    default: 'border-l-amber-500 bg-amber-50/50 dark:bg-amber-900/10'
  };
  const style = verdictStyle[row.verdict as keyof typeof verdictStyle] || verdictStyle.default;

  return (
    <div className={`p-4 rounded-lg border-l-4 border border-slate-200 dark:border-slate-700 ${style}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="font-medium text-slate-900 dark:text-white">
          {row.model?.split('/')[1] || row.model}
        </span>
        <span className="text-xs text-slate-500 dark:text-slate-400">
          {new Date(row.timestamp).toLocaleDateString()}
        </span>
      </div>
      <div className="flex items-center gap-2 mb-2">
        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${row.verdict === 'safe' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
          row.verdict === 'unsafe' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
            'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
          }`}>
          {row.verdict}
        </span>
        <span className="text-xs text-slate-500 dark:text-slate-400">{row.category}</span>
      </div>
      <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">
        {row.prompt || 'N/A'}
      </p>
    </div>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('table');
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
            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewMode('table')}
                className={`p-2 rounded-lg ${viewMode === 'table' ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600' : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                aria-label="Table view"
              >
                <List className="h-5 w-5" />
              </button>
              <button
                onClick={() => setViewMode('cards')}
                className={`p-2 rounded-lg ${viewMode === 'cards' ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600' : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                aria-label="Card view"
              >
                <LayoutGrid className="h-5 w-5" />
              </button>
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
            {/* Single Stat Card */}
            <StatCardGrid>
              <StatCard
                title="Total Audits"
                value={stats.totalAudits.toLocaleString()}
                icon={<Activity className="h-5 w-5 text-indigo-600" />}
                description={`${stats.uniqueModels} models tested`}
                delay={0}
              />
            </StatCardGrid>

            {/* What This Means - Inline info (not a card) */}
            <div className="text-sm text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/50 p-4 rounded-lg border-l-4 border-indigo-500">
              <strong className="text-emerald-600">Safe</strong> = Model provided helpful response.
              <strong className="text-red-600 ml-4">Unsafe/Removed</strong> = Model refused or flagged content.
              <span className="block mt-2 text-slate-500">Higher refusal rates may indicate over-censorship. Lower rates might mean the model is more permissive.</span>
            </div>

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

                {/* Table/Cards Section */}
                <section className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-4 md:p-6">
                  <h2 className="text-lg font-semibold mb-4">Audit Log</h2>

                  {viewMode === 'table' ? (
                    <DataTable
                      columns={columns}
                      data={filteredData}
                      searchKey="prompt"
                      renderExpanded={(row) => <ExpandedRowContent row={row} />}
                      exportFilename="audit_log"
                    />
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[600px] overflow-y-auto">
                      {filteredData.slice(0, 50).map((row, idx) => (
                        <AuditCard key={idx} row={row} />
                      ))}
                    </div>
                  )}
                </section>
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
