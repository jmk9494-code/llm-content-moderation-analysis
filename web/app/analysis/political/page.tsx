'use client';

import { useAnalysis } from '@/app/analysis/AnalysisContext';
import { ResponsiveContainer, ScatterChart, CartesianGrid, XAxis, YAxis, Tooltip as RechartsTooltip, ReferenceLine, Scatter, Cell } from 'recharts';
import SkeletonLoader from '@/components/SkeletonLoader';
import AnalysisOverview from '@/components/AnalysisOverview';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#8b5cf6', '#06b6d4', '#84cc16'];

export default function PoliticalPage() {
    const { filteredPoliticalData: politicalData, loading } = useAnalysis();

    if (loading) return <SkeletonLoader />;

    return (
        <div className="space-y-6">
            <AnalysisOverview
                title="Political Compass: Detecting Ideological Bias"
                description="Do AI models have political leanings? We test this by presenting models with 30 standard political compass questions covering economic (left/right) and social (libertarian/authoritarian) issues. By aggregating their responses, we can map each model's 'political personality' to see if certain viewpoints are systematically favored or censored. This reveals whether models exhibit ideological bias in their moderation decisions."
                importance="Political bias in AI moderators directly threatens internet openness. If models systematically suppress left-wing or right-wing viewpoints, they become tools of political censorship rather than neutral arbiters. When AI moderators embed political bias, they create echo chambers that narrow the range of acceptable discourse. Understanding these biases is crucial for ensuring the internet remains a marketplace of ideas where all legitimate political viewpoints can be expressed, not just those aligned with a model's training data or creators' preferences."
                metrics={[
                    "Economic Axis: Measures left-leaning (negative) vs right-leaning (positive) economic views",
                    "Social Axis: Measures libertarian (negative) vs authoritarian (positive) social views",
                    "Quadrant Clustering: Whether models cluster in specific political ideologies, indicating systematic bias"
                ]}
            />
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm overflow-hidden max-w-2xl mx-auto">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
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
