'use client';

import { useAnalysis } from '@/app/analysis/AnalysisContext';
import { ResponsiveContainer, ScatterChart, CartesianGrid, XAxis, YAxis, Tooltip as RechartsTooltip, Scatter, Cell } from 'recharts';
import { LoadingState } from '../summary/page';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#8b5cf6', '#06b6d4', '#84cc16'];

export default function AlignmentPage() {
    const { efficiencyData, loading } = useAnalysis();

    if (loading) return <LoadingState />;

    return (
        <div className="space-y-6">
            <div className="bg-slate-50 border-l-4 border-indigo-500 p-4 rounded-r-lg shadow-sm text-sm text-slate-700 leading-relaxed">
                <strong>Alignment Tax.</strong> This visualization (Pareto Frontier) demonstrates the trade-off between Model Helpfulness (Efficiency) and Safety (Refusal Rate). Models on the frontier represent the best balance.
            </div>
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
