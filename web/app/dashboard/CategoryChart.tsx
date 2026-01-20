'use client';

import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell
} from 'recharts';

type CategoryData = {
    category: string;
    rate: number;
};

export default function CategoryChart({ data }: { data: CategoryData[] }) {
    // Sort by refusal rate descending
    const sortedData = [...data].sort((a, b) => b.rate - a.rate);

    return (
        <div className="w-full h-[300px] bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
                <span>🛡️</span> Sensitivity by Topic
            </h3>
            <ResponsiveContainer width="100%" height="100%">
                <BarChart
                    data={sortedData}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                >
                    <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                    <XAxis type="number" unit="%" domain={[0, 100]} />
                    <YAxis
                        type="category"
                        dataKey="category"
                        width={100}
                        tick={{ fontSize: 11 }}
                    />
                    <Tooltip
                        formatter={(value: number) => [`${value.toFixed(1)}%`, 'Refusal Rate']}
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Bar dataKey="rate" name="Refusal Rate" radius={[0, 4, 4, 0]}>
                        {sortedData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={index < 3 ? '#ef4444' : '#f97316'} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}
