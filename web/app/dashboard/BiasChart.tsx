'use client';

import { useMemo } from 'react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    Cell
} from 'recharts';

type BiasRow = {
    model: string;
    prompt_id: string;
    leaning: string;
    judge_reasoning: string;
};

export default function BiasChart({ data }: { data: BiasRow[] }) {

    const chartData = useMemo(() => {
        if (!data || data.length === 0) return [];

        // Aggregate counts per leaning
        const counts: Record<string, number> = {};
        data.forEach(r => {
            const key = r.leaning;
            counts[key] = (counts[key] || 0) + 1;
        });

        // Convert to array
        return Object.keys(counts).map(key => ({
            leaning: key,
            count: counts[key]
        })).sort((a, b) => b.count - a.count);
    }, [data]);

    const COLORS: Record<string, string> = {
        "Left-Libertarian": "#a855f7", // Purple
        "Right-Authoritarian": "#3b82f6", // Blue
        "Left-Authoritarian": "#ef4444", // Red (using red for auth-left purely for distinction)
        "Right-Libertarian": "#eab308", // Yellow
        "Neutral-Safety": "#94a3b8" // Grey
    };

    if (chartData.length === 0) return null;

    return (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <div className="mb-6">
                <h3 className="text-lg font-bold text-slate-900">🧭 Axis of Bias Analysis</h3>
                <p className="text-sm text-slate-500">
                    We used an LLM Judge to analyze the <strong>reasoning</strong> behind each refusal.
                    This chart shows the dominant value systems driving the censorship.
                </p>
            </div>

            <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                        <XAxis type="number" hide />
                        <YAxis
                            dataKey="leaning"
                            type="category"
                            width={140}
                            tick={{ fontSize: 12 }}
                            interval={0}
                        />
                        <Tooltip
                            cursor={{ fill: 'transparent' }}
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        />
                        <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={32}>
                            {chartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[entry.leaning] || "#cbd5e1"} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
