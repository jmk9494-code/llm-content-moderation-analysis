'use client';

import { useAnalysis } from '@/app/analysis/AnalysisContext';
import { ResponsiveContainer, ScatterChart, CartesianGrid, XAxis, YAxis, Tooltip as RechartsTooltip, ReferenceLine, Scatter, Cell } from 'recharts';
import { LoadingState } from '../summary/page';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#8b5cf6', '#06b6d4', '#84cc16'];

export default function PoliticalPage() {
    const { politicalData, loading } = useAnalysis();

    if (loading) return <LoadingState />;

    return (
        <div className="space-y-6">
            <div className="bg-slate-50 border-l-4 border-indigo-500 p-4 rounded-r-lg shadow-sm text-sm text-slate-700 leading-relaxed">
                <strong>Political Compass.</strong> Do models have political opinions? We test this by asking 30 standard political questions. The results map the model's "personality" on Economic (Left/Right) and Social (Libertarian/Authoritarian) axes.
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm overflow-hidden max-w-2xl mx-auto">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold flex items-center gap-2">
                        🧭 Political Compass
                    </h3>
                </div>
                <div className="flex flex-col items-center">
                    <p className="text-sm text-slate-500 mb-4 text-center">
                        Do models have political opinions? We test this by asking 30 standard political questions.
                    </p>
                    <div className="relative w-full aspect-square bg-slate-50 rounded-lg border border-slate-100 flex items-center justify-center overflow-hidden p-4">
                        {politicalData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis type="number" dataKey="economic" domain={[-10, 10]} name="Economic" label={{ value: 'Economic (Left <-> Right)', position: 'bottom', offset: 0 }} />
                                    <YAxis type="number" dataKey="social" domain={[-10, 10]} name="Social" label={{ value: 'Social (Lib <-> Auth)', angle: -90, position: 'insideLeft' }} />
                                    <RechartsTooltip cursor={{ strokeDasharray: '3 3' }} content={({ active, payload }) => {
                                        if (active && payload && payload.length) {
                                            const d = payload[0].payload;
                                            return (
                                                <div className="bg-white p-2 border border-slate-200 shadow-md rounded text-xs">
                                                    <strong>{d.model}</strong>
                                                    <br />Econ: {d.economic.toFixed(2)}
                                                    <br />Soc: {d.social.toFixed(2)}
                                                </div>
                                            );
                                        }
                                        return null;
                                    }} />

                                    {/* Quadrant Colors (Approximate via Reference Areas if needed, but simple Scatter is fine) */}
                                    <ReferenceLine x={0} stroke="#000" />
                                    <ReferenceLine y={0} stroke="#000" />

                                    <Scatter name="Models" data={politicalData} fill="#8884d8">
                                        {politicalData.map((entry: any, index: number) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Scatter>
                                </ScatterChart>
                            </ResponsiveContainer>
                        ) : (
                            <img
                                src="/political_compass.png"
                                alt="AI Political Compass"
                                className="object-contain w-full h-full hover:scale-105 transition-transform duration-500"
                                onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = 'none';
                                    (e.target as HTMLImageElement).parentElement!.innerHTML = '<span class="text-slate-400 text-sm">Chart not generated yet</span>';
                                }}
                            />
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
