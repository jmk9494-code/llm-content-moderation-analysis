import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';

type PriceData = {
    model: string;
    cost: number;
};

export default function PriceChart({ data }: { data: PriceData[] }) {
    // Sort by cost descending
    const sortedData = [...data].sort((a, b) => b.cost - a.cost);

    return (
        <div className="w-full h-[300px] bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                <span>💰</span> Total Estimated Cost
            </h3>
            <ResponsiveContainer width="100%" height="100%">
                <BarChart
                    data={sortedData}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                >
                    <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                    <XAxis type="number" tickFormatter={(val) => `$${val.toFixed(4)}`} />
                    <YAxis
                        type="category"
                        dataKey="model"
                        width={100}
                        tick={{ fontSize: 11 }}
                        tickFormatter={(value) => value.split('/')[1] || value}
                    />
                    <Tooltip
                        formatter={(value: any) => [`$${Number(value).toFixed(6)}`, 'Cost']}
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Bar dataKey="cost" name="Total Cost" radius={[0, 4, 4, 0]}>
                        {sortedData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={index === 0 ? '#ef4444' : '#6366f1'} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}
