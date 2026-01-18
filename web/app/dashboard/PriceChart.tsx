'use client';

import { useMemo } from 'react';
import {
    ScatterChart,
    Scatter,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell,
    Label
} from 'recharts';

type ModelData = {
    model: string; // "openai/gpt-4o"
    refusal_rate: number; // 0-100
    cost_per_m: number; // Avg cost per 1M tokens (blended input/output)
    provider: string;
};

// Pricing Map (approximate blended cost per 1M tokens)
// Assuming 1:1 input/output ratio for simplicity in "Price of Censorship" metric
const PRICING: Record<string, number> = {
    "openai/gpt-4o": 10.0,
    "openai/gpt-4o-mini": 0.4,
    "anthropic/claude-3.5-sonnet": 9.0,
    "anthropic/claude-3-haiku": 0.75,
    "google/gemini-pro-1.5": 7.0,
    "google/gemini-flash-1.5": 0.7,
    "deepseek/deepseek-chat": 0.21,
    "qwen/qwen-2.5-72b-instruct": 0.37,
    "qwen/qwen-2.5-7b-instruct": 0.05,
    "01-ai/yi-34b-chat": 0.20,
    "mistralai/mistral-large": 4.0,
    "mistralai/mistral-medium": 1.2
};

export default function PriceChart({ data }: { data: any[] }) {

    const chartData = useMemo(() => {
        // We need {model, refusal_rate, cost}
        // Data passed in is likely the raw audit rows or summary.
        // Let's assume we calculate it fresh from raw rows to be safe, or if 'data' is rows.

        if (!data || data.length === 0) return [];

        // 1. Group by model
        const models = Array.from(new Set(data.map((r: any) => r.model)));

        return models.map((m: any) => {
            const subset = data.filter((r: any) => r.model === m);
            const refusals = subset.filter((r: any) => r.verdict === 'REMOVED').length;
            const rate = (refusals / subset.length) * 100;

            // Look up cost
            const cost = PRICING[m] || 1.0; // Default if missing

            return {
                model: m,
                name: m.split('/')[1] || m,
                x: cost,
                y: rate,
                z: 1 // bubble size
            };
        });

    }, [data]);

    return (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <div className="mb-6">
                <h3 className="text-lg font-bold text-slate-900">💰 The Price of Censorship</h3>
                <p className="text-sm text-slate-500">
                    Does paying more get you a "safer" model or just a stricter one?
                    <br />
                    <span className="text-xs text-slate-400">X-Axis: Approx Cost ($/1M Tok) | Y-Axis: Refusal Rate (%)</span>
                </p>
            </div>

            <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%" minHeight={300}>
                    <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                            type="number"
                            dataKey="x"
                            name="Cost"
                            unit="$"
                            label={{ value: 'Cost per 1M Tokens ($)', position: 'insideBottom', offset: -10 }}
                        />
                        <YAxis
                            type="number"
                            dataKey="y"
                            name="Refusal Rate"
                            unit="%"
                            domain={[0, 'auto']}
                        />
                        <Tooltip
                            cursor={{ strokeDasharray: '3 3' }}
                            content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                    const d = payload[0].payload;
                                    return (
                                        <div className="bg-slate-800 text-white p-2 rounded shadow text-xs">
                                            <div className="font-bold mb-1">{d.name}</div>
                                            <div>Cost: ${d.x}/1M</div>
                                            <div>Refusals: {d.y.toFixed(1)}%</div>
                                        </div>
                                    );
                                }
                                return null;
                            }}
                        />
                        <Scatter name="Models" data={chartData} fill="#8884d8">
                            {chartData.map((entry: any, index: number) => (
                                <Cell key={`cell-${index}`} fill={entry.x > 2 ? "#e11d48" : "#059669"} />
                            ))}
                        </Scatter>
                    </ScatterChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
