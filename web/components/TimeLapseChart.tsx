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
    ReferenceLine
} from 'recharts';
import { calculateLinearRegression } from '@/lib/stats-utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

type TrendRow = {
    test_date: string;
    model: string;
    pct_removed: number;
};

export default function TimeLapseChart({ data }: { data: TrendRow[] }) {
    const [modelSearch, setModelSearch] = useState('');
    const [sliderIndex, setSliderIndex] = useState<number | null>(null);
    const [showTrendLines, setShowTrendLines] = useState(true);

    const models = useMemo(() => {
        const allModels = Array.from(new Set(data.map(r => r.model.split('/')[1] || r.model)));
        if (!modelSearch) return allModels;
        return allModels.filter(m => m.toLowerCase().includes(modelSearch.toLowerCase()));
    }, [data, modelSearch]);

    // All unique dates sorted
    const uniqueDates = useMemo(() => Array.from(new Set(data.map(r => r.test_date))).sort(), [data]);

    // Initialize slider index to max on load
    useMemo(() => {
        if (sliderIndex === null && uniqueDates.length > 0) {
            setSliderIndex(uniqueDates.length - 1);
        }
    }, [uniqueDates.length]);

    // Calculate trend lines for each model
    const trendData = useMemo(() => {
        const trends: Record<string, { slope: number; intercept: number; rSquared: number; direction: 'up' | 'down' | 'flat' }> = {};

        models.forEach(model => {
            const modelData = data
                .filter(r => (r.model.split('/')[1] || r.model) === model)
                .map((r, idx) => ({
                    x: uniqueDates.indexOf(r.test_date),
                    y: r.pct_removed
                }))
                .filter(p => p.x >= 0);

            if (modelData.length >= 2) {
                const regression = calculateLinearRegression(modelData);
                const direction = Math.abs(regression.slope) < 0.5 ? 'flat' : regression.slope > 0 ? 'up' : 'down';
                trends[model] = {
                    slope: regression.slope,
                    intercept: regression.intercept,
                    rSquared: regression.rSquared,
                    direction
                };
            }
        });

        return trends;
    }, [data, models, uniqueDates]);

    // Format data for Recharts
    const chartData = useMemo(() => {
        const maxDateIdx = sliderIndex === null ? uniqueDates.length - 1 : sliderIndex;
        const cutoffDate = uniqueDates[maxDateIdx];

        return uniqueDates.map((date, idx) => {
            const entry: any = { date, dateIndex: idx };

            // Only populate values if date <= cutoffDate
            if (date <= cutoffDate) {
                data.filter(r => r.test_date === date).forEach(r => {
                    const name = r.model.split('/')[1] || r.model;
                    entry[name] = r.pct_removed;

                    // Add trend line value if enabled
                    if (showTrendLines && trendData[name]) {
                        const trendValue = trendData[name].slope * idx + trendData[name].intercept;
                        entry[`${name}_trend`] = Math.max(0, Math.min(100, trendValue));
                    }
                });
            }
            return entry;
        });
    }, [data, uniqueDates, sliderIndex, showTrendLines, trendData]);

    const colors = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#f43f5e', '#a855f7'];

    if (uniqueDates.length === 0) return null;
    const currentIdx = sliderIndex ?? uniqueDates.length - 1;

    const getTrendIcon = (direction: 'up' | 'down' | 'flat') => {
        if (direction === 'up') return <TrendingUp className="h-3 w-3 text-red-500" />;
        if (direction === 'down') return <TrendingDown className="h-3 w-3 text-green-500" />;
        return <Minus className="h-3 w-3 text-slate-400" />;
    };

    return (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
                <div>
                    <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                        ⏳ Time-Travel Trends
                    </h3>
                    <p className="text-sm text-slate-500">Drag the slider to travel through time and see how models evolve.</p>
                </div>

                <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={showTrendLines}
                            onChange={(e) => setShowTrendLines(e.target.checked)}
                            className="rounded border-slate-300"
                        />
                        Show Trends
                    </label>
                    <input
                        type="text"
                        placeholder="Filter models..."
                        value={modelSearch}
                        onChange={(e) => setModelSearch(e.target.value)}
                        className="pl-2 pr-2 py-1 border border-slate-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 w-32"
                    />
                </div>
            </div>

            {/* Trend Statistics */}
            {showTrendLines && models.length > 0 && (
                <div className="mb-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="text-xs font-semibold text-slate-700 mb-2">Trend Analysis</div>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                        {models.map((model, idx) => {
                            const trend = trendData[model];
                            if (!trend) return null;
                            return (
                                <div key={model} className="flex items-center gap-2 text-xs">
                                    <div
                                        className="w-3 h-3 rounded-full"
                                        style={{ backgroundColor: colors[idx % colors.length] }}
                                    />
                                    <span className="font-medium text-slate-700 truncate">{model}</span>
                                    {getTrendIcon(trend.direction)}
                                    <span className="text-slate-500">R²={trend.rSquared.toFixed(2)}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

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
                            <>
                                <Line
                                    key={m}
                                    type="monotone"
                                    dataKey={m}
                                    stroke={colors[i % colors.length]}
                                    strokeWidth={3}
                                    dot={{ r: 5, strokeWidth: 1 }}
                                    activeDot={{ r: 7 }}
                                    isAnimationActive={false}
                                    connectNulls
                                />
                                {showTrendLines && trendData[m] && (
                                    <Line
                                        key={`${m}_trend`}
                                        type="monotone"
                                        dataKey={`${m}_trend`}
                                        stroke={colors[i % colors.length]}
                                        strokeWidth={1.5}
                                        strokeDasharray="5 5"
                                        dot={false}
                                        isAnimationActive={false}
                                        connectNulls
                                        legendType="none"
                                    />
                                )}
                            </>
                        ))}
                    </LineChart>
                </ResponsiveContainer>
            </div>

            {/* Time Slider */}
            <div className="px-2 pt-2 pb-1">
                <input
                    type="range"
                    min={0}
                    max={uniqueDates.length - 1}
                    value={currentIdx}
                    onChange={(e) => setSliderIndex(parseInt(e.target.value))}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                    aria-label="Time travel slider"
                />
                <div className="flex justify-between text-xs text-slate-400 mt-2 font-mono">
                    <span>{uniqueDates[0]}</span>
                    <span className="font-bold text-indigo-600 border border-indigo-200 bg-indigo-50 px-2 py-0.5 rounded">
                        {uniqueDates[currentIdx]}
                    </span>
                    <span>{uniqueDates[uniqueDates.length - 1]}</span>
                </div>
            </div>
        </div>
    );
}
