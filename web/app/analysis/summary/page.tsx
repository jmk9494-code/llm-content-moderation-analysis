'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useAnalysis } from '@/app/analysis/AnalysisContext';
import KeyMetrics from '@/components/KeyMetrics';
import RestrictivenessScale from '@/components/RestrictivenessScale';
import SkeletonLoader from '@/components/SkeletonLoader';
import ShareButton from '@/components/ShareButton';
import { getLogoUrl, getProviderName } from '@/lib/provider-logos';
import { ChevronRight } from 'lucide-react';

export default function SummaryPage() {
    const {
        loading, stats, efficiencyData, filteredAuditData, timelineDates,
        filteredDriftData, filteredPoliticalData, filteredPaternalismData, filteredClusters
    } = useAnalysis();

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
            refusalRate: m.refusalRate / 100,
            cost: m.costPer1k
        }));

    // Per-model agreement scores
    const perModelAgreement = useMemo(() => {
        if (!filteredAuditData || filteredAuditData.length === 0 || !stats) return [];

        const isUnsafe = (v: string) => ['REFUSAL', 'REMOVED', 'BLOCKED', 'unsafe', 'Hard Refusal'].includes(v);

        const promptMap = new Map<string, { model: string; unsafe: boolean }[]>();
        filteredAuditData.forEach(row => {
            const pId = row.case_id || row.prompt_id || row.prompt;
            if (!pId) return;
            if (!promptMap.has(pId)) promptMap.set(pId, []);
            promptMap.get(pId)!.push({ model: row.model, unsafe: isUnsafe(row.verdict) });
        });

        const promptMajority = new Map<string, boolean>();
        promptMap.forEach((entries, pId) => {
            const unsafeCount = entries.filter(e => e.unsafe).length;
            promptMajority.set(pId, unsafeCount > entries.length / 2);
        });

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
            .filter(m => m.total >= 50)
            .sort((a, b) => b.agreementRate - a.agreementRate);
    }, [filteredAuditData, stats]);

    const getAgreementColor = (rate: number) => {
        if (rate >= 0.85) return 'text-emerald-600';
        if (rate >= 0.7) return 'text-amber-600';
        return 'text-red-600';
    };

    // === Deep Dive Summary Computations ===

    // Drift summary
    const driftSummary = useMemo(() => {
        if (!filteredDriftData || filteredDriftData.length === 0) return null;
        const drifted = filteredDriftData.filter((d: any) => d.drift_detected === true || d.drift_detected === 'true');
        const stable = filteredDriftData.length - drifted.length;
        return { total: filteredDriftData.length, drifted: drifted.length, stable };
    }, [filteredDriftData]);

    // Political compass summary
    const politicalSummary = useMemo(() => {
        if (!filteredPoliticalData || filteredPoliticalData.length === 0) return null;
        let leftCount = 0, rightCount = 0, authCount = 0, libCount = 0;
        filteredPoliticalData.forEach((d: any) => {
            if (d.economic < 0) leftCount++; else rightCount++;
            if (d.social > 0) authCount++; else libCount++;
        });
        const avgEcon = filteredPoliticalData.reduce((s: number, d: any) => s + (d.economic || 0), 0) / filteredPoliticalData.length;
        const avgSocial = filteredPoliticalData.reduce((s: number, d: any) => s + (d.social || 0), 0) / filteredPoliticalData.length;
        return { total: filteredPoliticalData.length, avgEcon, avgSocial, leftCount, rightCount, authCount, libCount };
    }, [filteredPoliticalData]);

    // Paternalism summary
    const paternalismSummary = useMemo(() => {
        if (!filteredPaternalismData || filteredPaternalismData.length === 0) return null;
        const rates = filteredPaternalismData.map((d: any) => parseFloat(d.is_refusal ?? d.refusal_rate ?? 0));
        const avg = rates.reduce((s: number, r: number) => s + r, 0) / rates.length;
        const max = Math.max(...rates);
        const maxModel = filteredPaternalismData[rates.indexOf(max)];
        return { total: filteredPaternalismData.length, avgRate: avg, maxRate: max, maxModel: maxModel?.model?.split('/').pop() || '?' };
    }, [filteredPaternalismData]);

    // Clusters summary
    const clustersSummary = useMemo(() => {
        if (!filteredClusters || filteredClusters.length === 0) return null;
        const totalSize = filteredClusters.reduce((s: number, c: any) => s + (c.size || 0), 0);
        const largest = filteredClusters.reduce((max: any, c: any) => (c.size > (max?.size || 0) ? c : max), filteredClusters[0]);
        return { count: filteredClusters.length, totalSize, largestKeywords: largest?.keywords?.slice(0, 3)?.join(', ') || '—' };
    }, [filteredClusters]);

    // Significance summary (computed inline from audit data)
    const significanceSummary = useMemo(() => {
        if (!filteredAuditData || filteredAuditData.length === 0) return null;
        const models = Array.from(new Set(filteredAuditData.map(r => r.model))).filter(Boolean);
        const pairs = (models.length * (models.length - 1)) / 2;
        return { modelCount: models.length, pairs: Math.floor(pairs) };
    }, [filteredAuditData]);

    return (
        <div>
            {/* Share button */}
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

            {/* Deep Dive Highlights */}
            <div className="mb-8">
                <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                    🔬 Deep Dive Highlights
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">

                    {/* Fleiss' Kappa Card */}
                    <Link href="/analysis/reliability" className="group">
                        <div className="bg-gradient-to-br from-indigo-50 to-white p-5 rounded-xl border border-indigo-100 hover:border-indigo-300 hover:shadow-md transition-all h-full">
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-2xl">📐</span>
                                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-500 transition-colors" />
                            </div>
                            <h3 className="text-sm font-bold text-slate-800 mb-1">Fleiss&apos; Kappa</h3>
                            <p className="text-3xl font-black text-indigo-600 mb-1">
                                {(consistencyScore).toFixed(3)}
                            </p>
                            <p className="text-xs text-slate-500">
                                {stats?.reliability?.interpretation || 'Inter-rater agreement'}
                            </p>
                            <p className="text-xs text-slate-400 mt-2">
                                {stats?.models.length || 0} models × {stats?.prompts.length || 0} prompts
                            </p>
                        </div>
                    </Link>

                    {/* Drift Card */}
                    {driftSummary && (
                        <Link href="/analysis/drift" className="group">
                            <div className="bg-gradient-to-br from-amber-50 to-white p-5 rounded-xl border border-amber-100 hover:border-amber-300 hover:shadow-md transition-all h-full">
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-2xl">📉</span>
                                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-amber-500 transition-colors" />
                                </div>
                                <h3 className="text-sm font-bold text-slate-800 mb-1">Model Stability</h3>
                                <div className="flex items-baseline gap-2 mb-1">
                                    <span className="text-3xl font-black text-amber-600">{driftSummary.drifted}</span>
                                    <span className="text-sm text-slate-500">drifted</span>
                                    <span className="text-xl font-bold text-slate-300">/</span>
                                    <span className="text-lg font-bold text-emerald-600">{driftSummary.stable}</span>
                                    <span className="text-sm text-slate-500">stable</span>
                                </div>
                                <p className="text-xs text-slate-500">
                                    {driftSummary.drifted > 0 ? 'Policy changes detected' : 'All models consistent'}
                                </p>
                            </div>
                        </Link>
                    )}

                    {/* Political Compass Card */}
                    {politicalSummary && (
                        <Link href="/analysis/political" className="group">
                            <div className="bg-gradient-to-br from-purple-50 to-white p-5 rounded-xl border border-purple-100 hover:border-purple-300 hover:shadow-md transition-all h-full">
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-2xl">🧭</span>
                                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-purple-500 transition-colors" />
                                </div>
                                <h3 className="text-sm font-bold text-slate-800 mb-1">Political Compass</h3>
                                <div className="text-xs space-y-1 mb-2">
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">Economic avg:</span>
                                        <span className={`font-bold ${politicalSummary.avgEcon < 0 ? 'text-blue-600' : 'text-red-600'}`}>
                                            {politicalSummary.avgEcon.toFixed(2)} ({politicalSummary.avgEcon < 0 ? 'Left' : 'Right'})
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">Social avg:</span>
                                        <span className={`font-bold ${politicalSummary.avgSocial > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                            {politicalSummary.avgSocial.toFixed(2)} ({politicalSummary.avgSocial > 0 ? 'Auth' : 'Lib'})
                                        </span>
                                    </div>
                                </div>
                                <p className="text-xs text-slate-400">{politicalSummary.total} models plotted</p>
                            </div>
                        </Link>
                    )}

                    {/* Paternalism Card */}
                    {paternalismSummary && (
                        <Link href="/analysis/paternalism" className="group">
                            <div className="bg-gradient-to-br from-rose-50 to-white p-5 rounded-xl border border-rose-100 hover:border-rose-300 hover:shadow-md transition-all h-full">
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-2xl">🛡️</span>
                                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-rose-500 transition-colors" />
                                </div>
                                <h3 className="text-sm font-bold text-slate-800 mb-1">Paternalism</h3>
                                <p className="text-3xl font-black text-rose-600 mb-1">
                                    {(paternalismSummary.avgRate * 100).toFixed(0)}%
                                </p>
                                <p className="text-xs text-slate-500">
                                    avg refusal rate across personas
                                </p>
                                <p className="text-xs text-slate-400 mt-1">
                                    Most restrictive: <span className="font-semibold">{paternalismSummary.maxModel}</span> ({(paternalismSummary.maxRate * 100).toFixed(0)}%)
                                </p>
                            </div>
                        </Link>
                    )}

                    {/* Clusters Card */}
                    {clustersSummary && (
                        <Link href="/analysis/clusters" className="group">
                            <div className="bg-gradient-to-br from-teal-50 to-white p-5 rounded-xl border border-teal-100 hover:border-teal-300 hover:shadow-md transition-all h-full">
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-2xl">🧠</span>
                                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-teal-500 transition-colors" />
                                </div>
                                <h3 className="text-sm font-bold text-slate-800 mb-1">Semantic Clusters</h3>
                                <p className="text-3xl font-black text-teal-600 mb-1">
                                    {clustersSummary.count}
                                </p>
                                <p className="text-xs text-slate-500">
                                    topic clusters • {clustersSummary.totalSize.toLocaleString()} items
                                </p>
                                <p className="text-xs text-slate-400 mt-1 truncate" title={clustersSummary.largestKeywords}>
                                    Top: {clustersSummary.largestKeywords}
                                </p>
                            </div>
                        </Link>
                    )}

                    {/* Significance Card */}
                    {significanceSummary && (
                        <Link href="/analysis/significance" className="group">
                            <div className="bg-gradient-to-br from-emerald-50 to-white p-5 rounded-xl border border-emerald-100 hover:border-emerald-300 hover:shadow-md transition-all h-full">
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-2xl">📊</span>
                                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-emerald-500 transition-colors" />
                                </div>
                                <h3 className="text-sm font-bold text-slate-800 mb-1">Significance Testing</h3>
                                <p className="text-3xl font-black text-emerald-600 mb-1">
                                    {significanceSummary.pairs}
                                </p>
                                <p className="text-xs text-slate-500">
                                    pairwise comparisons (McNemar&apos;s)
                                </p>
                                <p className="text-xs text-slate-400 mt-1">
                                    {significanceSummary.modelCount} models compared
                                </p>
                            </div>
                        </Link>
                    )}
                </div>
            </div>
        </div>
    );
}
