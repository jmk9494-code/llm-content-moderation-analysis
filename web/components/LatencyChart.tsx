import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';

type LatencyData = {
    model: string;
    latency: number;
};

export default function LatencyChart({ data }: { data: LatencyData[] }) {
    // Sort by latency ascending (lower is better)
    const sortedData = [...data].sort((a, b) => a.latency - b.latency);

    return (
        <div className="w-full h-[300px] bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                <span>⚡</span> Avg API Latency (ms)
            </h3>
            <ResponsiveContainer width="100%" height="100%">
                <BarChart
                    data={sortedData}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                >
                    <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                    <XAxis type="number" unit="ms" />
                    <YAxis
                        type="category"
                        dataKey="model"
                        width={100}
                        tick={{ fontSize: 11 }}
                        tickFormatter={(value) => value.split('/')[1] || value}
                    />
                    <Tooltip
                        formatter={(value: any) => [`${value} ms`, 'Latency']}
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Bar dataKey="latency" name="Latency" radius={[0, 4, 4, 0]}>
                        {sortedData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={index < 3 ? '#10b981' : '#f59e0b'} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}
