'use client';

import { useMemo } from 'react';
import { useAnalysis } from '@/app/analysis/AnalysisContext';
import SkeletonLoader from '@/components/SkeletonLoader';
import AnalysisOverview from '@/components/AnalysisOverview';
import { getLogoUrl, getProviderName } from '@/lib/provider-logos';
import {
    ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    PieChart, Pie, Cell, Legend
} from 'recharts';

const PIE_COLORS = ['#10b981', '#f59e0b', '#ef4444'];

export default function ConsensusPage() {
    const { filteredAuditData, loading } = useAnalysis();

    // Compute consensus data dynamically from audit data
    const consensusStats = useMemo(() => {
        if (!filteredAuditData || filteredAuditData.length === 0) return null;

        const isUnsafe = (v: string) => ['REFUSAL', 'REMOVED', 'BLOCKED', 'unsafe', 'Hard Refusal'].includes(v);

        // Group by prompt → collect each model's verdict
        const promptMap = new Map<string, Map<string, boolean>>();
        filteredAuditData.forEach(row => {
            const pId = row.case_id || row.prompt_id || row.prompt;
            if (!pId) return;
            if (!promptMap.has(pId)) promptMap.set(pId, new Map());
            promptMap.get(pId)!.set(row.model, isUnsafe(row.verdict));
        });

        // Only look at prompts evaluated by 2+ models
        const multiModelPrompts = Array.from(promptMap.entries()).filter(([, models]) => models.size >= 2);
        if (multiModelPrompts.length === 0) return null;

        // Agreement categories
        let fullAgree = 0, majorityAgree = 0, split = 0;
        // Per-model: how often does each model agree with the majority?
        const modelAgreement = new Map<string, { agree: number; total: number }>();

        multiModelPrompts.forEach(([, modelVerdicts]) => {
            const verdicts = Array.from(modelVerdicts.entries());
            const unsafeCount = verdicts.filter(([, v]) => v).length;
            const majority = unsafeCount > verdicts.length / 2; // majority says unsafe
            const agreementRatio = majority
                ? unsafeCount / verdicts.length
                : (verdicts.length - unsafeCount) / verdicts.length;

            if (agreementRatio >= 0.9) fullAgree++;
            else if (agreementRatio >= 0.6) majorityAgree++;
            else split++;

            // Track each model's agreement with majority
            verdicts.forEach(([model, isUns]) => {
                if (!modelAgreement.has(model)) modelAgreement.set(model, { agree: 0, total: 0 });
                const m = modelAgreement.get(model)!;
                m.total++;
                if (isUns === majority) m.agree++;
            });
        });

        // Per-model agreement rate
        const perModel = Array.from(modelAgreement.entries())
            .map(([model, { agree, total }]) => ({
                model,
                shortName: model.split('/').pop() || model,
                provider: getProviderName(model),
                logo: getLogoUrl(model),
                agreementRate: (agree / total) * 100,
                total,
            }))
            .sort((a, b) => b.agreementRate - a.agreementRate);

        const distribution = [
            { name: 'Full Agreement (≥90%)', value: fullAgree },
            { name: 'Majority (60-89%)', value: majorityAgree },
            { name: 'Split Decision (<60%)', value: split },
        ].filter(d => d.value > 0);

        return {
            totalPrompts: multiModelPrompts.length,
            distribution,
            perModel,
        };
    }, [filteredAuditData]);

    if (loading) return <SkeletonLoader />;

    if (!consensusStats) {
        return (
            <div className="space-y-6">
                <AnalysisOverview
                    title="Council Consensus: Multi-Judge Validation"
                    description="To validate our findings and reduce single-model bias, we employ a 'council' approach: submitting each prompt to multiple AI models and measuring their agreement on refusal decisions."
                    importance="Council consensus distinguishes between universally agreed-upon boundaries and arbitrary, model-specific censorship."
                    metrics={[
                        "Agreement Rate: Percentage of prompts where all judges reach the same verdict",
                        "Consensus Categories: 'Full Agreement,' 'Majority,' or 'Split Decision'",
                        "Inter-Judge Reliability: Consistency across the council"
                    ]}
                />
                <div className="bg-card p-6 rounded-2xl border border-border text-center text-muted-foreground">
                    Not enough multi-model data to compute consensus.
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <AnalysisOverview
                title="Council Consensus: Multi-Judge Validation"
                description="To validate our findings and reduce single-model bias, we employ a 'council' approach: submitting each prompt to multiple AI models and measuring their agreement on refusal decisions. High consensus (all judges agree) indicates that a prompt is universally considered problematic or safe. Low consensus (judges disagree) reveals edge cases where moderation policies diverge."
                importance="Council consensus is essential for internet openness because it distinguishes between universally agreed-upon boundaries and arbitrary, model-specific censorship. When all models refuse a prompt (high consensus), it likely contains genuinely harmful content. But when models disagree (low consensus), it indicates that one model is being uniquely restrictive—revealing bias in that specific model's training or policy."
                metrics={[
                    "Agreement Rate: Percentage of prompts where all judges reach the same verdict (refuse or allow)",
                    "Consensus Categories: 'Full Agreement,' 'Majority,' or 'Split Decision' based on judge alignment",
                    "Inter-Judge Reliability: Statistical measure (e.g., Fleiss' Kappa) of consistency across the council"
                ]}
            />

            {/* Per-model agreement rates */}
            <div className="bg-card p-6 rounded-2xl border border-border">
                <h3 className="text-lg font-bold text-foreground mb-1 flex items-center gap-2">
                    Model Agreement with Majority
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                    How often each model agrees with the majority verdict across {consensusStats.totalPrompts.toLocaleString()} prompts evaluated by multiple models
                </p>
                <div className="space-y-2">
                    {consensusStats.perModel.map((m, i) => (
                        <div key={m.model} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
                            <span className="text-xs text-muted-foreground w-5 font-mono">{i + 1}</span>
                            <img
                                src={m.logo}
                                alt={m.provider}
                                className="w-5 h-5 rounded"
                                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                            />
                            <span className="text-sm font-medium text-foreground w-48 truncate" title={m.model}>
                                {m.shortName}
                            </span>
                            <div className="flex-1 h-6 bg-muted rounded-full overflow-hidden relative">
                                <div
                                    className="h-full rounded-full transition-all duration-500"
                                    style={{
                                        width: `${m.agreementRate}%`,
                                        backgroundColor: 'hsl(var(--foreground))'
                                    }}
                                />
                                <span className="absolute inset-0 flex items-center justify-end pr-3 text-xs font-semibold text-foreground">
                                    {m.agreementRate.toFixed(1)}%
                                </span>
                            </div>
                            <span className="text-xs text-muted-foreground w-20 text-right">
                                {m.total.toLocaleString()} prompts
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Agreement Distribution Pie */}
            <div className="bg-card p-6 rounded-2xl border border-border">
                <h3 className="text-lg font-bold text-foreground mb-1">Agreement Distribution</h3>
                <p className="text-sm text-muted-foreground mb-4">
                    How often all models fully agreed, had a majority, or were split
                </p>
                <div className="h-[350px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={consensusStats.distribution}
                                cx="50%"
                                cy="50%"
                                innerRadius={80}
                                outerRadius={130}
                                paddingAngle={3}
                                dataKey="value"
                                label={({ name, percent }) => `${name}: ${((percent ?? 0) * 100).toFixed(0)}%`}
                            >
                                {consensusStats.distribution.map((_, index) => (
                                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index]} />
                                ))}
                            </Pie>
                            <Tooltip />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}
