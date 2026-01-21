'use client';

import { useRouter } from 'next/navigation';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';

type LatencyData = {
    model: string;
    latency: number;
};

export default function LatencyChart({ data }: { data: LatencyData[] }) {
    const router = useRouter();
    // Sort by latency ascending (lower is better)
    const sortedData = [...data].sort((a, b) => a.latency - b.latency);

    const handleClick = (data: LatencyData) => {
        const modelSlug = encodeURIComponent(data.model);
        router.push(`/model/${modelSlug}`);
    };

    return (
        <div className="w-full h-[300px] bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
                <span>⚡</span> Avg API Latency (ms)
            </h3>
            <ResponsiveContainer width="100%" height="100%">
                <BarChart
                    data={sortedData}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                >
                    <CartesianGrid strokeDasharray="3 3" opacity={0.1} stroke="#64748b" />
                    <XAxis
                        type="number"
                        unit="ms"
                        tick={{ fill: '#64748b' }}
                    />
                    <YAxis
                        type="category"
                        dataKey="model"
                        width={100}
                        tick={{ fontSize: 11, fill: '#64748b' }}
                        tickFormatter={(value) => value.split('/')[1] || value}
                    />
                    <Tooltip
                        formatter={(value: any) => [`${value} ms`, 'Latency']}
                        contentStyle={{
                            borderRadius: '8px',
                            border: 'none',
                            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                            backgroundColor: 'var(--background, #fff)',
                            color: 'var(--foreground, #000)'
                        }}
                        labelStyle={{ fontWeight: 'bold' }}
                    />
                    <Bar
                        dataKey="latency"
                        name="Latency"
                        radius={[0, 4, 4, 0]}
                        cursor="pointer"
                        onClick={(data) => handleClick(data)}
                    >
                        {sortedData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={index < 3 ? '#10b981' : '#f59e0b'} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}
