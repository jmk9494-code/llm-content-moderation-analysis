'use client';

import { useMemo, useState } from 'react';
import {
    ScatterChart,
    Scatter,
    XAxis,
    YAxis,
    ZAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    ReferenceLine,
    LabelList,
    Cell
} from 'recharts';
import { HelpCircle, X } from 'lucide-react';
import ModelLogo from '@/components/ModelLogo';

type BiasRow = {
    model: string;
    prompt_id: string;
    leaning: string;
    judge_reasoning: string;
};

// Map leanings to "Political Compass" coordinates
// X: Economic (Left <-> Right)
// Y: Social (Libertarian <-> Authoritarian)
const COORDINATES: Record<string, [number, number]> = {
    "Left-Libertarian": [-5, -5],
    "Right-Libertarian": [5, -5],
    "Left-Authoritarian": [-5, 5],
    "Right-Authoritarian": [5, 5],
    "Neutral-Safety": [0, 0]
};

const COLORS: Record<string, string> = {
    "Left-Libertarian": "#a855f7", // Purple
    "Right-Authoritarian": "#3b82f6", // Blue
    "Left-Authoritarian": "#ef4444", // Red
    "Right-Libertarian": "#eab308", // Yellow
    "Neutral-Safety": "#94a3b8"   // Grey
};

export default function BiasChart({ data }: { data: BiasRow[] }) {
    const [showModal, setShowModal] = useState(false);

    const chartData = useMemo(() => {
        if (!data || data.length === 0) return [];

        // Group by model
        const modelGroups: Record<string, { xSum: number, ySum: number, count: number, breakdown: Record<string, number> }> = {};

        data.forEach(r => {
            const coords = COORDINATES[r.leaning] || [0, 0];
            if (!modelGroups[r.model]) {
                modelGroups[r.model] = { xSum: 0, ySum: 0, count: 0, breakdown: {} };
            }
            modelGroups[r.model].xSum += coords[0];
            modelGroups[r.model].ySum += coords[1];
            modelGroups[r.model].count += 1;
            modelGroups[r.model].breakdown[r.leaning] = (modelGroups[r.model].breakdown[r.leaning] || 0) + 1;
        });

        // Calculate Centroids
        return Object.keys(modelGroups).map(model => {
            const g = modelGroups[model];
            // Get dominant leaning for color
            const dominant = Object.entries(g.breakdown).sort((a, b) => b[1] - a[1])[0][0];

            return {
                model,
                x: g.xSum / g.count,
                y: g.ySum / g.count,
                z: g.count, // Bubble size based on refusal volume
                dominantLeaning: dominant,
                breakdown: g.breakdown
            };
        });
    }, [data]);

    if (chartData.length === 0) return null;

    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            const d = payload[0].payload;
            return (
                <div className="bg-white p-3 border border-slate-200 shadow-lg rounded-lg text-xs z-50">
                    <p className="font-bold text-slate-800 mb-1 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[d.dominantLeaning] }}></span>
                        {d.model}
                    </p>
                    <p className="text-slate-500 mb-2">Refusals: {d.z}</p>
                    <div className="space-y-1">
                        {Object.entries(d.breakdown).sort((a: any, b: any) => b[1] - a[1]).map(([k, v]: any) => (
                            <div key={k} className="flex justify-between gap-4">
                                <span>{k}:</span>
                                <span className="font-mono">{v}</span>
                            </div>
                        ))}
                    </div>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 relative h-full flex flex-col">
            <div className="mb-4 flex justify-between items-start shrink-0">
                <div>
                    {/* Title removed as per user request */}
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="p-1.5 text-slate-400 hover:text-indigo-600 transition-colors rounded-full hover:bg-indigo-50"
                >
                    <HelpCircle className="h-5 w-5" />
                </button>
            </div>

            {showModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setShowModal(false)}>
                    <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full mx-4 overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h3 className="text-lg font-bold text-slate-900">Methodology: Bias Centroids</h3>
                            <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="p-6 text-sm text-slate-600 space-y-4 leading-relaxed">
                            <p>We analyze every refusal using an LLM Judge to classify the underlying value system.</p>
                            <p>We map these to a standard political compass:</p>
                            <ul className="list-disc list-inside ml-2 space-y-1">
                                <li><strong>X-Axis:</strong> Economic (Left vs Right)</li>
                                <li><strong>Y-Axis:</strong> Social (Libertarian vs Authoritarian)</li>
                            </ul>
                            <p>Each dot represents the <strong>average position (centroid)</strong> of a model based on all its refusals.</p>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex-1 min-h-[300px] w-full relative">
                {/* Background Labels */}
                <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-8 opacity-20 text-xs font-bold uppercase text-slate-400">
                    <div className="flex justify-between">
                        <span>Left-Auth</span>
                        <span>Right-Auth</span>
                    </div>
                </div>
                <div className="absolute inset-0 pointer-events-none flex flex-col justify-end p-8 opacity-20 text-xs font-bold uppercase text-slate-400">
                    <div className="flex justify-between">
                        <span>Left-Lib</span>
                        <span>Right-Lib</span>
                    </div>
                </div>

                <ResponsiveContainer width="100%" height="100%" minHeight={300}>
                    <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" dataKey="x" name="Economic" domain={[-6, 6]} hide />
                        <YAxis type="number" dataKey="y" name="Social" domain={[-6, 6]} hide />
                        <ZAxis type="number" dataKey="z" range={[50, 400]} name="Refusals" />
                        <Tooltip content={<CustomTooltip />} />

                        <ReferenceLine y={0} stroke="#94a3b8" />
                        <ReferenceLine x={0} stroke="#94a3b8" />

                        <Scatter name="Models" data={chartData} fill="#8884d8">
                            {chartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[entry.dominantLeaning] || "#94a3b8"} />
                            ))}
                            <LabelList dataKey="model" position="top" style={{ fontSize: '10px', fill: '#64748b' }} />
                        </Scatter>
                    </ScatterChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
