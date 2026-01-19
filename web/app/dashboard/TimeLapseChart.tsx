'use client';

import { useState, useMemo } from 'react';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    Brush
} from 'recharts';

type TrendRow = {
    test_date: string;
    model: string;
    pct_removed: number;
};

export default function TimeLapseChart({ data }: { data: TrendRow[] }) {
    const [modelSearch, setModelSearch] = useState('');

    const models = useMemo(() => {
        const allModels = Array.from(new Set(data.map(r => r.model.split('/')[1] || r.model)));
        if (!modelSearch) return allModels;
        return allModels.filter(m => m.toLowerCase().includes(modelSearch.toLowerCase()));
    }, [data, modelSearch]);

    // Format data for Recharts: [{ date: '...', modelA: 50, modelB: 20 }]
    const chartData = useMemo(() => {
        const dates = Array.from(new Set(data.map(r => r.test_date))).sort();
        return dates.map(date => {
            const entry: any = { date };
            data.filter(r => r.test_date === date).forEach(r => {
                const name = r.model.split('/')[1] || r.model;
                entry[name] = r.pct_removed;
            });
            return entry;
        });
    }, [data]);

    const colors = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#f43f5e', '#a855f7'];

    if (chartData.length === 0) return null;

    return (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
                <div>
                    <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                        ⏳ Long-Term Trends
                    </h3>
                    <p className="text-sm text-slate-500">Track refusal rates over time. Drag the slider below to zoom in.</p>
                </div>

                <div className="flex items-center gap-4">
                    <input
                        type="text"
                        placeholder="Filter models..."
                        value={modelSearch}
                        onChange={(e) => setModelSearch(e.target.value)}
                        className="pl-2 pr-2 py-1 border border-slate-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 w-32"
                    />
                </div>
            </div>

            <div className="h-80 w-full mb-4">
                <ResponsiveContainer width="100%" height="100%" minHeight={300}>
                    <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis unit="%" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} domain={[0, 100]} />
                        <Tooltip
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        />
                        <Legend />
                        {models.map((m, i) => (
                            <Line
                                key={m}
                                type="monotone"
                                dataKey={m}
                                stroke={colors[i % colors.length]}
                                strokeWidth={3}
                                dot={{ r: 4 }}
                                activeDot={{ r: 6 }}
                                isAnimationActive={true}
                                connectNulls
                            />
                        ))}
                        <Brush dataKey="date" height={30} stroke="#8884d8" tickFormatter={(value) => value.slice(5)} />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
