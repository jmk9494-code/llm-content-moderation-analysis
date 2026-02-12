'use client';

import { useMemo } from 'react';
import { useAnalysis } from '@/app/analysis/AnalysisContext';
import KeyMetrics from '@/components/KeyMetrics';
import RestrictivenessScale from '@/components/RestrictivenessScale';
import SkeletonLoader from '@/components/SkeletonLoader';
import ShareButton from '@/components/ShareButton';
import { getLogoUrl, getProviderName } from '@/lib/provider-logos';

export default function SummaryPage() {
    const { loading, stats, efficiencyData, filteredAuditData, timelineDates } = useAnalysis();

    if (loading) return <SkeletonLoader />;

    // Calculate metrics
    const totalCases = stats?.prompts.length || 0;
    const modelsCount = stats?.models.length || 0;
    const consistencyScore = stats?.reliability?.score ?? 0;
    const dateRange = timelineDates.length > 0
        ? `${timelineDates[0]} to ${timelineDates[timelineDates.length - 1]}`
        : 'All Time';

    // Prepare model data for RestrictivenessScale
    const modelData = efficiencyData
        .filter(m => m.refusalRate !== undefined && m.refusalRate !== null)
        .map(m => ({
            name: m.fullName,
            displayName: m.name,
            refusalRate: m.refusalRate / 100, // Convert from 0-100 to 0-1 range
            cost: m.costPer1k
        }));

    // Per-model agreement scores
    // For each model, calculate how often it agrees with the majority verdict on each prompt
    const perModelAgreement = useMemo(() => {
        if (!filteredAuditData || filteredAuditData.length === 0 || !stats) return [];

        const isUnsafe = (v: string) => ['REFUSAL', 'REMOVED', 'BLOCKED', 'unsafe', 'Hard Refusal'].includes(v);

        // Group by prompt
        const promptMap = new Map<string, { model: string; unsafe: boolean }[]>();
        filteredAuditData.forEach(row => {
            const pId = row.case_id || row.prompt_id || row.prompt;
            if (!pId) return;
            if (!promptMap.has(pId)) promptMap.set(pId, []);
            promptMap.get(pId)!.push({ model: row.model, unsafe: isUnsafe(row.verdict) });
        });

        // For each prompt, determine majority verdict
        const promptMajority = new Map<string, boolean>();
        promptMap.forEach((entries, pId) => {
            const unsafeCount = entries.filter(e => e.unsafe).length;
            promptMajority.set(pId, unsafeCount > entries.length / 2);
        });

        // For each model, count agreements with majority
        const modelAgreements = new Map<string, { agree: number; total: number }>();
        promptMap.forEach((entries, pId) => {
            const majority = promptMajority.get(pId)!;
            entries.forEach(({ model, unsafe }) => {
                if (!modelAgreements.has(model)) modelAgreements.set(model, { agree: 0, total: 0 });
                const m = modelAgreements.get(model)!;
                m.total++;
                if (unsafe === majority) m.agree++;
            });
        });

        return Array.from(modelAgreements.entries())
            .map(([model, { agree, total }]) => ({
                model,
                displayName: model.split('/').pop() || model,
                agreementRate: total > 0 ? agree / total : 0,
                total,
            }))
            .filter(m => m.total >= 50) // Only models with enough data
            .sort((a, b) => b.agreementRate - a.agreementRate);
    }, [filteredAuditData, stats]);

    const getAgreementColor = (rate: number) => {
        if (rate >= 0.85) return 'text-emerald-600';
        if (rate >= 0.7) return 'text-amber-600';
        return 'text-red-600';
    };

    return (
        <div>
            {/* Share button in top right */}
            <div className="flex justify-end mb-4">
                <ShareButton
                    title="AI Moderation Analysis Summary"
                    text="Check out this comprehensive AI moderation bias analysis showing the restrictiveness spectrum across models"
                />
            </div>

            {/* Key Metrics */}
            <KeyMetrics
                totalCases={totalCases}
                modelsCount={modelsCount}
                consistencyScore={consistencyScore}
                dateRange={dateRange}
            />

            {/* Restrictiveness Spectrum */}
            {modelData.length > 0 && (
                <RestrictivenessScale models={modelData} />
            )}

            {/* Per-Model Agreement Scores */}
            {perModelAgreement.length > 0 && (
                <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 mb-8">
                    <div className="mb-6">
                        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                            🤝 Model Agreement Scores
                        </h2>
                        <p className="text-sm text-slate-500 mt-1">
                            How often each model agrees with the majority consensus across all prompts.
                            Global Fleiss&apos; Kappa: <span className="font-bold text-slate-700">{(consistencyScore * 100).toFixed(1)}%</span>
                        </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {perModelAgreement.map(m => (
                            <div key={m.model} className="flex items-center gap-3 p-3 rounded-lg border border-slate-100 hover:border-slate-200 transition-colors">
                                <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center overflow-hidden">
                                    <img
                                        src={getLogoUrl(m.model)}
                                        alt={getProviderName(m.model)}
                                        className="w-6 h-6 object-contain"
                                        loading="lazy"
                                    />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-slate-800 truncate">{m.displayName}</p>
                                    <p className="text-xs text-slate-400">{m.total} prompts</p>
                                </div>
                                <span className={`text-lg font-black ${getAgreementColor(m.agreementRate)}`}>
                                    {(m.agreementRate * 100).toFixed(0)}%
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

