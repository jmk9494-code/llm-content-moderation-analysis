'use client';

import { useAnalysis } from '@/app/analysis/AnalysisContext';
import { ResponsiveContainer, ScatterChart, CartesianGrid, XAxis, YAxis, Tooltip as RechartsTooltip, Scatter, Cell } from 'recharts';
import SkeletonLoader from '@/components/SkeletonLoader';
import AnalysisOverview from '@/components/AnalysisOverview';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#8b5cf6', '#06b6d4', '#84cc16'];

export default function AlignmentPage() {
    const { efficiencyData, loading } = useAnalysis();

    if (loading) return <SkeletonLoader />;

    return (
        <div className="space-y-6">
            <AnalysisOverview
                title="Alignment Tax: The Cost of Safety"
                description="The 'Alignment Tax' visualizes the fundamental trade-off between model helpfulness and model safety. More restrictive models (high refusal rates) may be 'safer' but less helpful, while permissive models are more helpful but potentially less safe. The Pareto Frontier shows models that achieve the best balance—maximum helpfulness for a given level of safety. Models far from the frontier are paying an unnecessarily high 'tax' in either helpfulness or safety."
                importance="Understanding the alignment tax is crucial for internet openness because it quantifies the real cost of content moderation. When models are over-aligned (too restrictive), they sacrifice helpfulness and limit access to legitimate information in the name of safety. The Pareto frontier helps us identify which models are achieving effective safety without unnecessarily restricting the open flow of information. Models that deviate significantly from the frontier are either over-censoring (limiting openness) or under-moderating (compromising safety), and users deserve transparency about which trade-off their chosen model makes."
                metrics={[
                    "Refusal Rate: Percentage of prompts refused (safety axis)",
                    "Cost Per 1K Tokens: Economic efficiency measure (helpfulness proxy)",
                    "Pareto Efficiency: Distance from the optimal frontier of safety/helpfulness trade-offs"
                ]}
            />
            {/* Option A: The interactive Pareto chart if iframe preferred */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden h-[700px]">
                <iframe src="/chart.html" className="w-full h-full border-0" title="Alignment Tax Pareto Frontier" />
            </div>

            {/* Option B: Simplified React Scatter if HTML fails or for quick view */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 mt-6 h-[400px]">
                <h4 className="text-sm font-bold text-slate-500 mb-4 uppercase tracking-wider">Simplified Scatter View</h4>
                {efficiencyData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="90%">
                        <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                            <CartesianGrid />
                            <XAxis type="number" dataKey="costPer1k" name="Cost" unit="$" label={{ value: 'Cost ($/1k)', position: 'bottom' }} />
                            <YAxis type="number" dataKey="refusalRate" name="Refusals" unit="%" label={{ value: 'Refusal Rate %', angle: -90, position: 'insideLeft' }} />
                            <RechartsTooltip cursor={{ strokeDasharray: '3 3' }} />
                            <Scatter name="Models" data={efficiencyData} fill="#8884d8">
                                {efficiencyData.map((e, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                            </Scatter>
                        </ScatterChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="h-full flex items-center justify-center text-slate-400">
                        No efficiency data available
                    </div>
                )}
            </div>
        </div>
    );
}
