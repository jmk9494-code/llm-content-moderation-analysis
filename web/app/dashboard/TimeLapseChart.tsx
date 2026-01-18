'use client';

import { useState, useEffect, useMemo } from 'react';
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
import { Play, Pause, FastForward, RotateCcw } from 'lucide-react';

type TrendRow = {
    test_date: string;
    model: string;
    pct_removed: number;
};

export default function TimeLapseChart({ data }: { data: TrendRow[] }) {
    const [isPlaying, setIsPlaying] = useState(false);
    const [dateIndex, setDateIndex] = useState(0);

    // Get unique dates sorted
    const uniqueDates = useMemo(() => {
        return Array.from(new Set(data.map(r => r.test_date))).sort();
    }, [data]);

    // Max index
    const maxIndex = uniqueDates.length - 1;

    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isPlaying) {
            interval = setInterval(() => {
                setDateIndex(prev => {
                    if (prev >= maxIndex) {
                        setIsPlaying(false);
                        return maxIndex;
                    }
                    return prev + 1;
                });
            }, 1000); // 1 second per step
        }
        return () => clearInterval(interval);
    }, [isPlaying, maxIndex]);

    // Filter data up to current dateIndex
    const currentData = useMemo(() => {
        if (uniqueDates.length === 0) return [];

        // For a line chart, we need to restructure:
        // [{ date: '2026-01-01', modelA: 50, modelB: 20 }, ...]

        // We want to show history up to current dateIndex
        const visibleDates = uniqueDates.slice(0, dateIndex + 1);

        return visibleDates.map(date => {
            const entry: any = { date };
            data.filter(r => r.test_date === date).forEach(r => {
                // Clean model name
                const name = r.model.split('/')[1] || r.model;
                entry[name] = r.pct_removed;
            });
            return entry;
        });
    }, [data, uniqueDates, dateIndex]);

    const [modelSearch, setModelSearch] = useState('');

    const models = useMemo(() => {
        const allModels = Array.from(new Set(data.map(r => r.model.split('/')[1] || r.model)));
        if (!modelSearch) return allModels;
        return allModels.filter(m => m.toLowerCase().includes(modelSearch.toLowerCase()));
    }, [data, modelSearch]);

    const colors = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#f43f5e', '#a855f7'];

    if (uniqueDates.length === 0) return null;

    return (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
                <div>
                    <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                        ⏳ Time-Travel Trends
                    </h3>
                    <p className="text-sm text-slate-500">Watch how model censorship levels evolve over time.</p>
                </div>

                <div className="flex items-center gap-4">
                    {/* Model Search */}
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Filter models..."
                            value={modelSearch}
                            onChange={(e) => setModelSearch(e.target.value)}
                            className="pl-2 pr-2 py-1 border border-slate-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 w-32"
                        />
                    </div>

                    {/* Controls */}
                    <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-lg">
                        <button
                            onClick={() => setDateIndex(0)}
                            className="p-2 hover:bg-white rounded shadow-sm text-slate-600 transition-all"
                            title="Reset"
                        >
                            <RotateCcw className="h-4 w-4" />
                        </button>
                        <button
                            onClick={() => setIsPlaying(!isPlaying)}
                            className="p-2 hover:bg-white rounded shadow-sm text-indigo-600 transition-all font-bold flex items-center gap-1"
                            title={isPlaying ? "Pause" : "Play"}
                        >
                            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                            {isPlaying ? "Pause" : "Play"}
                        </button>
                        <button
                            onClick={() => setDateIndex(maxIndex)}
                            className="p-2 hover:bg-white rounded shadow-sm text-slate-600 transition-all"
                            title="Jump to End"
                        >
                            <FastForward className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            </div>

            <div className="h-80 w-full mb-4">
                <ResponsiveContainer width="100%" height="100%" minHeight={300}>
                    <LineChart data={currentData}>
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
                                isAnimationActive={false} // We handle animation via state
                            />
                        ))}
                        <Brush dataKey="date" height={30} stroke="#8884d8" />
                    </LineChart>
                </ResponsiveContainer>
            </div>

            {/* Slider */}
            <div className="px-2">
                <input
                    type="range"
                    min={0}
                    max={maxIndex}
                    value={dateIndex}
                    onChange={(e) => {
                        setDateIndex(parseInt(e.target.value));
                        setIsPlaying(false);
                    }}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
                <div className="flex justify-between text-xs text-slate-400 mt-2 font-mono">
                    <span>{uniqueDates[0]}</span>
                    <span className="font-bold text-indigo-600">{uniqueDates[dateIndex]}</span>
                    <span>{uniqueDates[maxIndex]}</span>
                </div>
            </div>
        </div>
    );
}
