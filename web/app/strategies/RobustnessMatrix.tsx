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
    ZAxis,
    Cell,
    Label,
    LabelList
} from 'recharts';
import { Info } from 'lucide-react';

type StrategyRow = {
    model: string;
    type: string;
    verdict: string;
};

// Robustness Matrix: Strictness vs Robustness
// X-Axis (Strictness): Direct Refusal Rate (Higher = Stricter)
// Y-Axis (Robustness): Adversarial Refusal Rate (Higher = More Robust against Jailbreaks)

export default function RobustnessMatrix({ data }: { data: StrategyRow[] }) {

    const chartData = useMemo(() => {
        if (!data || data.length === 0) return [];

        const models = Array.from(new Set(data.map(r => r.model)));

        return models.map(m => {
            const subset = data.filter(r => r.model === m);
            const direct = subset.filter(r => r.type === 'Direct');
            const adv = subset.filter(r => r.type === 'Adversarial');

            const directRate = direct.length ? (direct.filter(r => r.verdict === 'REMOVED').length / direct.length) * 100 : 0;
            const advRate = adv.length ? (adv.filter(r => r.verdict === 'REMOVED').length / adv.length) * 100 : 0;

            return {
                model: m,
                name: m.split('/')[1] || m,
                x: directRate, // Strictness
                y: advRate,    // Robustness
                z: 100
            };
        });

    }, [data]);

    return (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <div className="mb-6">
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    🛡️ Robustness Matrix
                </h3>
                <p className="text-sm text-slate-500">
                    Comparing <strong>Policy Strictness</strong> (Direct) vs <strong>Jailbreak Resistance</strong> (Adversarial).
                    <br />
                    <span className="text-xs text-slate-400">Ideally, models should be high in Robustness (Y) without being overly Strict (X).</span>
                </p>
            </div>

            <div className="h-96 w-full relative">
                {/* Quadrant Labels */}
                <div className="absolute top-2 right-2 text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded">Ideal (Robust & Balanced)</div>
                <div className="absolute bottom-2 left-2 text-xs font-bold text-red-600 bg-red-50 px-2 py-1 rounded">Vulnerable (Weak)</div>

                <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                            type="number"
                            dataKey="x"
                            name="Strictness"
                            unit="%"
                            domain={[0, 100]}
                            label={{ value: 'Policy Strictness (Direct Refusal %)', position: 'insideBottom', offset: -10 }}
                        />
                        <YAxis
                            type="number"
                            dataKey="y"
                            name="Robustness"
                            unit="%"
                            domain={[0, 100]}
                            label={{ value: 'Jailbreak Robustness (Adversarial Refusal %)', angle: -90, position: 'insideLeft' }}
                        />
                        <ZAxis type="number" dataKey="z" range={[60, 400]} />
                        <Tooltip
                            cursor={{ strokeDasharray: '3 3' }}
                            content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                    const d = payload[0].payload;
                                    return (
                                        <div className="bg-slate-800 text-white p-3 rounded shadow-lg text-xs z-50">
                                            <div className="font-bold mb-1 text-sm">{d.name}</div>
                                            <div className="text-slate-300 mb-1">Strictness: <span className="text-white font-mono">{d.x.toFixed(1)}%</span></div>
                                            <div className="text-slate-300">Robustness: <span className="text-white font-mono">{d.y.toFixed(1)}%</span></div>
                                        </div>
                                    );
                                }
                                return null;
                            }}
                        />
                        <Scatter name="Models" data={chartData} fill="#8884d8">
                            {chartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.y > entry.x ? "#10b981" : "#6366f1"} />
                            ))}
                            <LabelList dataKey="name" position="top" offset={10} style={{ fontSize: '10px', fill: '#64748b' }} />
                        </Scatter>
                    </ScatterChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
