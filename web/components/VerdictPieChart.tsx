'use client';

import { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

type VerdictData = {
    verdict: string;
    count: number;
};

const COLORS = {
    safe: '#10b981',      // green
    unsafe: '#ef4444',    // red
    unclear: '#f59e0b',   // amber
    error: '#6b7280',     // gray
};

const RADIAN = Math.PI / 180;

interface CustomLabelProps {
    cx?: number;
    cy?: number;
    midAngle?: number;
    innerRadius?: number;
    outerRadius?: number;
    percent?: number;
    name?: string;
}

const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }: CustomLabelProps) => {
    // Guard against undefined values
    if (cx === undefined || cy === undefined || midAngle === undefined ||
        innerRadius === undefined || outerRadius === undefined || percent === undefined) {
        return null;
    }

    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    if (percent < 0.05) return null; // Don't render labels for tiny slices

    return (
        <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" className="text-xs font-bold">
            {`${(percent * 100).toFixed(0)}%`}
        </text>
    );
};

interface VerdictPieChartProps {
    data: { verdict: string }[];
    title?: string;
}

export default function VerdictPieChart({ data, title = 'Verdict Distribution' }: VerdictPieChartProps) {
    const chartData = useMemo(() => {
        const counts: Record<string, number> = {};
        data.forEach(d => {
            const v = d.verdict?.toLowerCase() || 'unknown';
            counts[v] = (counts[v] || 0) + 1;
        });
        return Object.entries(counts).map(([name, value]) => ({ name, value }));
    }, [data]);

    const total = chartData.reduce((sum, d) => sum + d.value, 0);

    return (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-2 flex items-center gap-2">
                <span>🎯</span> {title}
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                {total.toLocaleString()} total verdicts
            </p>
            <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={chartData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={renderCustomizedLabel}
                            outerRadius={100}
                            innerRadius={50}
                            fill="#8884d8"
                            dataKey="value"
                            animationBegin={0}
                            animationDuration={800}
                        >
                            {chartData.map((entry, index) => (
                                <Cell
                                    key={`cell-${index}`}
                                    fill={COLORS[entry.name as keyof typeof COLORS] || '#6366f1'}
                                />
                            ))}
                        </Pie>
                        <Tooltip
                            formatter={(value: number, name: string) => [
                                `${value.toLocaleString()} (${((value / total) * 100).toFixed(1)}%)`,
                                name.charAt(0).toUpperCase() + name.slice(1)
                            ]}
                            contentStyle={{
                                borderRadius: '8px',
                                border: 'none',
                                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                                backgroundColor: 'var(--background, #fff)',
                                color: 'var(--foreground, #000)'
                            }}
                        />
                        <Legend
                            formatter={(value) => <span className="text-sm text-slate-600 dark:text-slate-300 capitalize">{value}</span>}
                        />
                    </PieChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
