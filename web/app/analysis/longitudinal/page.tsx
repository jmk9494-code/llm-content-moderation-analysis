'use client';

import { useAnalysis } from '@/app/analysis/AnalysisContext';
import { useState, useMemo } from 'react';
import { ResponsiveContainer, LineChart, CartesianGrid, XAxis, YAxis, Tooltip as RechartsTooltip, Legend, Line } from 'recharts';
import SkeletonLoader from '@/components/SkeletonLoader';

import AnalysisOverview from '@/components/AnalysisOverview';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#8b5cf6', '#06b6d4', '#84cc16'];

export default function LongitudinalPage() {
    const { filteredAuditData, dateRange, loading } = useAnalysis();
    // Local filter state for this view
    const [longitudinalModels, setLongitudinalModels] = useState<string[]>([]);

    const longitudinalData = useMemo(() => {
        if (filteredAuditData.length === 0) return { chartData: [], activeModels: [] };

        const filtered = filteredAuditData.filter((d) => longitudinalModels.length === 0 || longitudinalModels.includes(d.model));
        const uniqueDates = Array.from(new Set(filtered.map(d => d.timestamp?.split('T')[0] || 'Unknown'))).filter(d => d !== 'Unknown').sort();
        const activeModels = longitudinalModels.length > 0 ? longitudinalModels : Array.from(new Set(filtered.map(d => d.model)));

        const chartData = uniqueDates.map(date => {
            const dayRows = filtered.filter(d => (d.timestamp?.split('T')[0]) === date);
            const row: any = { date };
            activeModels.forEach(model => {
                const modelRows = dayRows.filter(d => d.model === model);
                if (modelRows.length > 0) {
                    const refusals = modelRows.filter(d => ['REFUSAL', 'REMOVED', 'unsafe', 'Hard Refusal'].includes(d.verdict)).length;
                    row[model] = (refusals / modelRows.length) * 100;
                    row[`${model}_count`] = modelRows.length;
                } else row[model] = null;
            });
            return row;
        });
        return { chartData, activeModels };
    }, [filteredAuditData, longitudinalModels]);

    if (loading) return <SkeletonLoader />;

    return (
        <div className="space-y-6">
            <AnalysisOverview
                title="Longitudinal Analysis: Tracking Model Drift Over Time"
                description="AI models are constantly updated by their creators—sometimes multiple times per week. Each update can shift a model's content moderation policies, making it more or less restrictive. Longitudinal analysis tracks how refusal rates change over time, allowing us to detect when models become more censorious (or more permissive) and identify patterns in how companies adjust their content policies."
                importance="Understanding model drift is critical for internet openness because it reveals whether the AI gatekeepers of online discourse are becoming more restrictive over time. When major AI providers simultaneously tighten their moderation policies, it can create a 'chilling effect' across the entire internet, limiting what information and ideas are accessible to users. By tracking these changes longitudinally, we can hold AI companies accountable for shifts in their censorship practices and identify concerning trends before they become entrenched."
                metrics={[
                    "Refusal Rate Trajectory: Whether models are becoming more or less restrictive over time",
                    "Update Frequency: How often model behaviors change, indicating active policy adjustments",
                    "Synchronization Patterns: Whether multiple providers shift policies in tandem, suggesting industry-wide trends"
                ]}
            />

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 h-[500px]">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                    <h3 className="text-lg font-bold text-slate-900">Refusal Rate Over Time</h3>
                    <div className="flex items-center gap-2 text-sm">
                        <span className="text-slate-500 font-medium uppercase text-xs">Filter by Date:</span>
                        {(dateRange.start || dateRange.end) && (
                            <span className="text-xs text-slate-400 italic">Global filtered applied via Dashboard Header</span>
                        )}
                    </div>
                </div>
                <ResponsiveContainer width="100%" height="90%">
                    <LineChart data={longitudinalData.chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis unit="%" />
                        <RechartsTooltip />
                        <Legend />
                        {longitudinalData.activeModels.map((m, i) => (
                            <Line key={m} type="monotone" dataKey={m} stroke={COLORS[i % COLORS.length]} strokeWidth={2} connectNulls />
                        ))}
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
