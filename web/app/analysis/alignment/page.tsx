'use client';

import { useAnalysis } from '@/app/analysis/AnalysisContext';
import { ResponsiveContainer, ScatterChart, CartesianGrid, XAxis, YAxis, Tooltip as RechartsTooltip, Scatter, Cell, Label } from 'recharts';
import SkeletonLoader from '@/components/SkeletonLoader';
import AnalysisOverview from '@/components/AnalysisOverview';

// No colors needed for monochrome design

const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
        const d = payload[0].payload;
        return (
            <div className="bg-popover p-3 border border-border shadow-lg rounded-lg text-xs text-popover-foreground">
                <strong className="text-foreground">{d.fullName || d.name}</strong>
                <div className="mt-1 space-y-0.5 text-muted-foreground">
                    <div>Refusal Rate: <span className="font-semibold text-foreground">{d.refusalRate.toFixed(1)}%</span></div>
                    <div>Cost / 1K tokens: <span className="font-semibold text-foreground">${d.costPer1k.toFixed(4)}</span></div>
                    <div>Total prompts: <span className="font-semibold text-foreground">{d.total.toLocaleString()}</span></div>
                </div>
            </div>
        );
    }
    return null;
};

const CustomLabel = (props: any) => {
    const { x, y, value } = props;
    return (
        <text x={x} y={y - 10} textAnchor="middle" className="fill-muted-foreground" fontSize={10} fontWeight={500}>
            {value}
        </text>
    );
};

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
            <div className="bg-card p-6 rounded-2xl shadow-sm border border-border h-[600px]">
                <h3 className="text-lg font-bold text-foreground mb-2 flex items-center gap-2">
                    Alignment Tax (Pareto Frontier)
                </h3>
                <p className="text-sm text-muted-foreground mb-4">Each dot is a model. Lower-left = cheap &amp; permissive. Upper-right = expensive &amp; restrictive.</p>
                {efficiencyData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="85%">
                        <ScatterChart margin={{ top: 30, right: 30, bottom: 40, left: 30 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                            <XAxis
                                type="number"
                                dataKey="costPer1k"
                                name="Cost"
                                unit="$"
                                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                            >
                                <Label value="Cost per 1K Tokens ($)" position="bottom" offset={10} style={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                            </XAxis>
                            <YAxis
                                type="number"
                                dataKey="refusalRate"
                                name="Refusal Rate"
                                unit="%"
                                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                            >
                                <Label value="Refusal Rate (%)" angle={-90} position="insideLeft" offset={-10} style={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                            </YAxis>
                            <RechartsTooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />
                            <Scatter name="Models" data={efficiencyData} fill="hsl(var(--foreground))">
                                {efficiencyData.map((e: any, index: number) => (
                                    <Cell key={`cell-${index}`} fill="hsl(var(--foreground))" stroke="hsl(var(--background))" strokeWidth={1} r={7} />
                                ))
                                }
                            </Scatter>
                        </ScatterChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="h-full flex items-center justify-center text-muted-foreground">
                        No efficiency data available — select models with cost data
                    </div>
                )}
                {efficiencyData.length > 0 && (
                    <div className="flex flex-wrap gap-3 mt-2 justify-center">
                        {efficiencyData.map((e: any, i: number) => (
                            <div key={i} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                <span className="w-2.5 h-2.5 rounded-full bg-foreground" />
                                {e.name}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
