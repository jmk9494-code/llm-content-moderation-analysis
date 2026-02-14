'use client';

import React from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip as RechartsTooltip, Legend } from 'recharts';
import type { Cluster } from '@/app/analysis/AnalysisContext';

// Monochrome shades for clusters
// UChicago Palette: Maroon, Dark Greystone, Goldenrod, Brick, Lake, Forest
const UCHICAGO_PALETTE = [
    '#800000', // Maroon
    '#737373', // Dark Greystone
    '#EAAA00', // Goldenrod
    '#A4343A', // Brick
    '#007396', // Lake
    '#275D38', // Forest
];

export function SemanticClustersView({ clusters }: { clusters: Cluster[] }) {
    if (clusters.length === 0) return <div className="p-8 text-center text-slate-500">No cluster data available.</div>;
    const pieData = clusters.map((c, i) => ({ name: `Cluster ${i + 1}`, value: c.size, keywords: c.keywords.join(', ') }));

    return (
        <div className="space-y-6">
            <div className="bg-muted border-l-4 border-foreground p-4 rounded-r-lg shadow-sm text-sm text-foreground leading-relaxed">
                <strong>Semantic Clusters.</strong> Groups common refusal themes.
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="bg-card p-6 rounded-2xl border border-border">
                    <h2 className="text-lg font-bold mb-4 text-foreground">Themes</h2>
                    <div className="h-64">
                        <ResponsiveContainer>
                            <PieChart>
                                <Pie data={pieData} innerRadius={60} outerRadius={80} dataKey="value">
                                    {pieData.map((_, i) => <Cell key={i} fill={UCHICAGO_PALETTE[i % UCHICAGO_PALETTE.length]} />)}
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
                            <div key={idx} className="bg-card p-4 rounded-xl border border-border flex gap-4 hover:bg-accent/50 transition-colors">
                                <div className="w-2 rounded-full" style={{ backgroundColor: UCHICAGO_PALETTE[idx % UCHICAGO_PALETTE.length] }}></div>
                                <div>
                                    <h3 className="font-bold text-foreground">Cluster {idx + 1} ({c.size} cases)</h3>
                                    <p className="text-xs text-muted-foreground mb-2">{c.keywords.slice(0, 5).join(', ')}</p>
                                    <p className="text-sm italic text-muted-foreground bg-muted/30 p-2 rounded">
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
