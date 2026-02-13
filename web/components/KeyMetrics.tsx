'use client';

import { BarChart3, Users, Calendar, TrendingUp } from 'lucide-react';

interface MetricCardProps {
    label: string;
    value: string;
    icon: React.ReactNode;
    description?: string;
    trend?: 'up' | 'down' | 'neutral';
}

function MetricCard({ label, value, icon, description, trend }: MetricCardProps) {
    const trendColors = {
        up: 'text-foreground',
        down: 'text-foreground',
        neutral: 'text-muted-foreground'
    };

    return (
        <div className="bg-card rounded-xl p-6 border border-border hover:bg-accent/50 transition-colors">
            <div className="flex items-start justify-between">
                <div className="flex-1">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                        {label}
                    </p>
                    <p className={`text-3xl font-bold ${trend ? trendColors[trend] : 'text-foreground'}`}>
                        {value}
                    </p>
                    {description && (
                        <p className="text-xs text-muted-foreground mt-2">{description}</p>
                    )}
                </div>
                <div className="ml-4 p-3 bg-primary/10 rounded-lg">
                    {icon}
                </div>
            </div>
        </div>
    );
}

interface KeyMetricsProps {
    totalCases: number;
    modelsCount: number;
    consistencyScore: number;
    dateRange: string;
    totalEvaluations: number;
    lastUpdated: string;
}

export default function KeyMetrics({
    totalCases,
    modelsCount,
    consistencyScore,
    dateRange,
    totalEvaluations,
    lastUpdated
}: KeyMetricsProps) {
    // Format numbers for display
    const formatNumber = (num: number) => {
        if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
        if (num >= 1000) return `${(num / 1000).toFixed(0)}K`;
        return num.toString();
    };

    return (
        <div className="mb-8">
            <div className="mb-4">
                <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                    Key Metrics
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                    High-level overview of the analysis dataset
                </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                <MetricCard
                    label="Test Cases"
                    value={formatNumber(totalCases)}
                    icon={<BarChart3 className="w-6 h-6 text-foreground" />}
                    description="Unique moderation scenarios"
                    trend="neutral"
                />

                <MetricCard
                    label="Models Tested"
                    value={modelsCount.toString()}
                    icon={<Users className="w-6 h-6 text-foreground" />}
                    description="AI moderation models"
                    trend="neutral"
                />

                <MetricCard
                    label="Total Assessments"
                    value={formatNumber(totalEvaluations)}
                    icon={<BarChart3 className="w-6 h-6 text-foreground" />}
                    description="Total model evaluations"
                    trend="neutral"
                />

                <MetricCard
                    label="Last Updated"
                    value={lastUpdated}
                    icon={<Calendar className="w-6 h-6 text-foreground" />}
                    description="Most recent data point"
                    trend="neutral"
                />

                <MetricCard
                    label="Analysis Period"
                    value={dateRange}
                    icon={<Calendar className="w-6 h-6 text-foreground" />}
                    description="Data collection timeframe"
                    trend="neutral"
                />
            </div>
        </div>
    );
}
