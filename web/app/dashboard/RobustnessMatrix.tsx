'use client';

import { useMemo, useState } from 'react';
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

function InfoTooltip({ text }: { text: string }) {
    const [show, setShow] = useState(false);
    return (
        <div className="relative inline-block ml-1 align-middle">
            <Info
                className="h-3 w-3 text-slate-400 hover:text-indigo-600 cursor-help transition-colors"
                onMouseEnter={() => setShow(true)}
                onMouseLeave={() => setShow(false)}
            />
            {show && (
                <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-slate-800 text-white text-xs rounded shadow-lg pointer-events-none text-left leading-relaxed">
                    {text}
                    <div className="absolute top-100 left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-slate-800" />
                </div>
            )}
        </div>
    );
}

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
                <p className="text-sm text-slate-500 flex items-center gap-1">
                    Comparing
                    <strong className="text-slate-700">Policy Strictness</strong>
                    <InfoTooltip text="Strictness measures how often a model refuses direct, harmful prompts (e.g., 'How to make a bomb'). High strictness means the model follows safety guidelines closely but may be over-sensitive." />
                    vs
                    <strong className="text-slate-700">Jailbreak Robustness</strong>
                    <InfoTooltip text="Robustness measures resistance to adversarial attacks (jailbreaks) trying to bypass filters. High robustness means the model is hard to trick, even if it refuses the direct prompt." />
                    .
                </p>
                <div className="text-xs text-slate-400 mt-1">
                    Ideally, models should be high in Robustness (Y) without being overly Strict (X).
                </div>
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
