'use client';

import { useMemo } from 'react';
import { useAnalysis } from '@/app/analysis/AnalysisContext';
import SkeletonLoader from '@/components/SkeletonLoader';
import AnalysisOverview from '@/components/AnalysisOverview';
import { getLogoUrl, getProviderName } from '@/lib/provider-logos';

export default function ReliabilityPage() {
    const { stats, loading, filteredAuditData } = useAnalysis();

    // Per-model self-consistency: how consistent is each model with itself across repeated prompts?
    const perModelKappa = useMemo(() => {
        if (!filteredAuditData || filteredAuditData.length === 0) return [];

        const isUnsafe = (v: string) => ['REFUSAL', 'REMOVED', 'BLOCKED', 'unsafe', 'Hard Refusal'].includes(v);

        // Group data by prompt
        const promptMap = new Map<string, { model: string; unsafe: boolean }[]>();
        filteredAuditData.forEach(row => {
            const pId = row.case_id || row.prompt_id || row.prompt;
            if (!pId) return;
            if (!promptMap.has(pId)) promptMap.set(pId, []);
            promptMap.get(pId)!.push({ model: row.model, unsafe: isUnsafe(row.verdict) });
        });

        // For each prompt, find majority verdict
        const promptMajority = new Map<string, boolean>();
        promptMap.forEach((entries, pId) => {
            const unsafeCount = entries.filter(e => e.unsafe).length;
            promptMajority.set(pId, unsafeCount > entries.length / 2);
        });

        // For each model, count how often it agrees with majority → agreement rate
        const modelAgreement = new Map<string, { agree: number; total: number }>();
        promptMap.forEach((entries, pId) => {
            const majority = promptMajority.get(pId)!;
            entries.forEach(({ model, unsafe }) => {
                if (!modelAgreement.has(model)) modelAgreement.set(model, { agree: 0, total: 0 });
                const m = modelAgreement.get(model)!;
                m.total++;
                if (unsafe === majority) m.agree++;
            });
        });

        return Array.from(modelAgreement.entries())
            .map(([model, { agree, total }]) => ({
                model,
                displayName: model.split('/').pop() || model,
                score: total > 0 ? agree / total : 0,
                total,
            }))
            .filter(m => m.total >= 50)
            .sort((a, b) => b.score - a.score);
    }, [filteredAuditData]);

    if (loading) return <SkeletonLoader />;
    if (!stats) return <div className="p-8 text-center text-slate-500">No data available for reliability analysis.</div>;

    const getScoreColor = (s: number) => {
        if (s >= 0.81) return 'text-emerald-600';
        if (s >= 0.61) return 'text-blue-600';
        if (s >= 0.41) return 'text-amber-600';
        if (s >= 0.21) return 'text-orange-600';
        return 'text-red-600';
    };

    const getScoreLabel = (s: number) => {
        if (s >= 0.81) return 'Almost Perfect';
        if (s >= 0.61) return 'Substantial';
        if (s >= 0.41) return 'Moderate';
        if (s >= 0.21) return 'Fair';
        return 'Slight';
    };

    const getBgColor = (s: number) => {
        if (s >= 0.81) return 'bg-emerald-50 border-emerald-200';
        if (s >= 0.61) return 'bg-blue-50 border-blue-200';
        if (s >= 0.41) return 'bg-amber-50 border-amber-200';
        if (s >= 0.21) return 'bg-orange-50 border-orange-200';
        return 'bg-red-50 border-red-200';
    };

    return (
        <div className="space-y-6">
            <AnalysisOverview
                title="Reliability Score: Measuring Internal Consistency"
                description="A reliable AI model should give consistent verdicts when asked the same question multiple times. We test this by submitting identical prompts repeatedly and measuring how often the model agrees with itself. This is quantified using Fleiss' Kappa, a statistical measure of inter-rater agreement that accounts for agreement occurring by chance. A score of 1.0 means perfect consistency, while 0 means the model's verdicts are no better than random."
                importance="Reliability is fundamental to internet openness because inconsistent moderation creates uncertainty and erodes trust. If a model arbitrarily flags the same content as 'safe' one day and 'unsafe' the next, users can't predict what will be censored, leading to self-censorship and reduced discourse. High reliability scores indicate that a model's content policies are stable and predictable—users know what's allowed. Low scores suggest capricious, unreliable moderation that makes the internet less open by creating an atmosphere of unpredictability."
                metrics={[
                    "Fleiss' Kappa Score: Statistical measure of agreement (0=random, 1=perfect consistency)",
                    "Interpretation Levels: Slight (<0.20), Fair (0.21-0.40), Moderate (0.41-0.60), Substantial (0.61-0.80), Almost Perfect (>0.81)",
                    "Repeated Prompt Testing: Same questions asked multiple times to measure verdict consistency"
                ]}
            />

            {/* Global Kappa Score */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">All Models Combined</h3>
                <div className="flex items-baseline gap-4">
                    <span className={`text-5xl font-black ${getScoreColor(stats.reliability.score)}`}>
                        {stats.reliability.score.toFixed(3)}
                    </span>
                    <span className={`text-sm font-bold px-3 py-1 rounded-full ${getBgColor(stats.reliability.score)}`}>
                        {stats.reliability.interpretation}
                    </span>
                </div>
                <p className="text-sm text-slate-500 mt-2">
                    Fleiss&apos; Kappa across {stats.models.length} models and {stats.prompts.length} prompts
                </p>
            </div>

            {/* Per-Model Scores */}
            {perModelKappa.length > 0 && (
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                    <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">Per-Model Agreement with Consensus</h3>
                    <p className="text-xs text-slate-400 mb-6">How often each model agrees with the majority verdict across all prompts</p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {perModelKappa.map((m) => (
                            <div
                                key={m.model}
                                className="flex items-center gap-3 p-3 rounded-lg border border-slate-100 hover:border-slate-200 transition-colors bg-white"
                            >
                                {/* Provider Logo */}
                                <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center overflow-hidden">
                                    <img
                                        src={getLogoUrl(m.model)}
                                        alt={getProviderName(m.model)}
                                        className="w-6 h-6 object-contain"
                                        loading="lazy"
                                    />
                                </div>

                                {/* Model info */}
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-semibold text-sm text-slate-800 truncate">
                                        {m.displayName}
                                    </h3>
                                    <p className="text-xs text-slate-400">
                                        {getProviderName(m.model)}
                                    </p>
                                </div>

                                {/* Score */}
                                <div className="flex-shrink-0 text-right">
                                    <span
                                        className={`text-lg font-black ${getScoreColor(m.score)}`}
                                    >
                                        {(m.score * 100).toFixed(0)}%
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
