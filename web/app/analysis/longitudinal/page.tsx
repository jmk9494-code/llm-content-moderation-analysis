'use client';

import { useAnalysis } from '@/app/analysis/AnalysisContext';
import { useState, useMemo } from 'react';
import { ResponsiveContainer, LineChart, CartesianGrid, XAxis, YAxis, Tooltip as RechartsTooltip, Legend, Line } from 'recharts';
import { LoadingState } from '../summary/page';

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

    if (loading) return <LoadingState />;

    return (
        <div className="space-y-6">
            <div className="bg-slate-50 border-l-4 border-indigo-500 p-4 rounded-r-lg shadow-sm text-sm text-slate-700 leading-relaxed">
                <strong>Longitudinal Analysis.</strong> Tracks refusal rates over time to detect drift.
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 h-[500px]">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                    <h3 className="text-lg font-bold">Refusal Rate Over Time</h3>
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
