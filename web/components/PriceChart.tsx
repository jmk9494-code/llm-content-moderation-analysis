'use client';

import { useRouter } from 'next/navigation';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';

type PriceData = {
    model: string;
    cost: number;
};

export default function PriceChart({ data }: { data: PriceData[] }) {
    const router = useRouter();
    // Sort by cost descending
    const sortedData = [...data].sort((a, b) => b.cost - a.cost);

    const handleClick = (data: PriceData) => {
        // Navigate to model details page
        const modelSlug = encodeURIComponent(data.model);
        router.push(`/model/${modelSlug}`);
    };

    return (
        <div className="w-full h-[300px] bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
                <span>💰</span> Total Estimated Cost
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
                        tickFormatter={(val) => `$${val.toFixed(4)}`}
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
                        formatter={(value: any) => [`$${Number(value).toFixed(6)}`, 'Cost']}
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
                        dataKey="cost"
                        name="Total Cost"
                        radius={[0, 4, 4, 0]}
                        cursor="pointer"
                        onClick={(data) => data?.payload && handleClick(data.payload as PriceData)}
                    >
                        {sortedData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={index === 0 ? '#ef4444' : '#6366f1'} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}
