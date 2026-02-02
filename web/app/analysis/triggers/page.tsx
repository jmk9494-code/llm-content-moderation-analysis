'use client';

import { useAnalysis } from '@/app/analysis/AnalysisContext';
import { ResponsiveContainer, BarChart, CartesianGrid, XAxis, YAxis, Tooltip as RechartsTooltip, Bar } from 'recharts';
import { LoadingState } from '../summary/page';

export default function TriggersPage() {
    const { triggerData, loading } = useAnalysis();

    if (loading) return <LoadingState />;

    return (
        <div className="space-y-6">
            <div className="bg-slate-50 border-l-4 border-indigo-500 p-4 rounded-r-lg shadow-sm text-sm text-slate-700 leading-relaxed">
                <strong>Trigger List.</strong> The most common words found in prompts that were refused by models. These "trigger words" are often strong indicators of what topics models are sensitive to.
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <h3 className="text-lg font-bold mb-6">Top Trigger Words</h3>
                <div className="h-[500px]">
                    {triggerData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={triggerData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                <XAxis type="number" />
                                <YAxis dataKey="word" type="category" width={100} tick={{ fontSize: 12 }} />
                                <RechartsTooltip cursor={{ fill: 'transparent' }} />
                                <Bar dataKey="count" fill="#ef4444" name="Refusals" radius={[0, 4, 4, 0]} barSize={20} />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-[500px] flex items-center justify-center bg-slate-50 rounded-lg border border-slate-100 overflow-hidden">
                            <img
                                src="/assets/wordcloud.png"
                                alt="Top Trigger Words Word Cloud"
                                className="object-contain w-full h-full hover:scale-105 transition-transform duration-500"
                                onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = 'none';
                                    (e.target as HTMLImageElement).parentElement!.innerHTML = '<div class="text-center p-8"><p class="text-slate-400 mb-2">Word cloud not available</p><p class="text-xs text-slate-300">Run analysis/trigger_extraction.py to generate.</p></div>';
                                }}
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
