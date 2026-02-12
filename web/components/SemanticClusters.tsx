'use client';

import React from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip as RechartsTooltip, Legend } from 'recharts';
import type { Cluster } from '@/app/analysis/AnalysisContext';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#8b5cf6', '#06b6d4', '#84cc16'];

export function SemanticClustersView({ clusters }: { clusters: Cluster[] }) {
    if (clusters.length === 0) return <div className="p-8 text-center text-slate-500">No cluster data available.</div>;
    const pieData = clusters.map((c, i) => ({ name: `Cluster ${i + 1}`, value: c.size, keywords: c.keywords.join(', ') }));

    return (
        <div className="space-y-6">
            <div className="bg-slate-50 border-l-4 border-indigo-500 p-4 rounded-r-lg shadow-sm text-sm text-slate-700 leading-relaxed">
                <strong>Semantic Clusters.</strong> Groups common refusal themes.
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                    <h2 className="text-lg font-bold mb-4">Themes</h2>
                    <div className="h-64">
                        <ResponsiveContainer>
                            <PieChart>
                                <Pie data={pieData} innerRadius={60} outerRadius={80} dataKey="value">
                                    {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                </Pie>
                                <RechartsTooltip />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
                <div className="col-span-2 space-y-4">
                    {clusters.map((c, idx) => {
                        // Handle RetryError gracefully
                        const isError = c.exemplar && c.exemplar.includes('RetryError');
                        const displayExemplar = isError
                            ? `Example: ${c.keywords[0]} related content`
                            : c.exemplar;

                        return (
                            <div key={idx} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex gap-4">
                                <div className="w-2 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></div>
                                <div>
                                    <h3 className="font-bold">Cluster {idx + 1} ({c.size} cases)</h3>
                                    <p className="text-xs text-slate-500 mb-2">{c.keywords.slice(0, 5).join(', ')}</p>
                                    <p className="text-sm italic text-slate-600 bg-slate-50 p-2 rounded">
                                        "{displayExemplar}"
                                    </p>
                                </div>
                            </div>
                        );
                    })}

                </div>
            </div>
        </div>
    );
}
