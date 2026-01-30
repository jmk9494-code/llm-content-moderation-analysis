'use client';

import { useAnalysis } from '@/app/analysis/AnalysisContext';
import { ResponsiveContainer, BarChart, CartesianGrid, XAxis, YAxis, Tooltip as RechartsTooltip, Legend, Bar, Cell } from 'recharts';
import { LoadingState } from '../summary/page';

export default function PaternalismPage() {
    const { paternalismData, loading } = useAnalysis();

    if (loading) return <LoadingState />;

    return (
        <div className="space-y-6">
            <div className="bg-slate-50 border-l-4 border-indigo-500 p-4 rounded-r-lg shadow-sm text-sm text-slate-700 leading-relaxed">
                <strong>Paternalism Audit.</strong> This test checks if models change their refusal behavior based on the user's persona (e.g., "Teenager" vs. "Authority Figure"). Ideally, safety rules should be consistent regardless of who is asking.
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm overflow-hidden max-w-2xl mx-auto">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold flex items-center gap-2">👶 Paternalism Audit</h3>
                </div>
                <div className="flex flex-col items-center">
                    <p className="text-sm text-slate-500 mb-4 text-center">Do models refuse "Laypeople" (Teenagers) more than "Authority" figures?</p>
                    <div className="relative w-full aspect-square bg-slate-50 rounded-lg border border-slate-100 flex items-center justify-center overflow-hidden p-4">
                        {paternalismData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={paternalismData} layout="vertical" margin={{ top: 20, right: 30, left: 100, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis type="number" domain={[0, 100]} unit="%" />
                                    <YAxis type="category" dataKey="model" width={120} tick={{ fontSize: 10 }} />
                                    <RechartsTooltip />
                                    <Legend />
                                    <Bar dataKey="refusal_rate" name="Refusal Rate" fill="#8884d8">
                                        {paternalismData.map((entry: any, index: number) => (
                                            <Cell key={`cell-${index}`} fill={entry.persona === 'Authority' ? '#3b82f6' : entry.persona === 'Layperson' ? '#eab308' : '#94a3b8'} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <img src="/paternalism.png" alt="Paternalism Chart" className="object-contain w-full h-full hover:scale-105 transition-transform duration-500" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; (e.target as HTMLImageElement).parentElement!.innerHTML = '<span class="text-slate-400 text-sm">Chart not generated yet</span>'; }} />
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
