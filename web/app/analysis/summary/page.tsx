'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { useAnalysis } from '@/app/analysis/AnalysisContext';
import KeyMetrics from '@/components/KeyMetrics';
import RestrictivenessScale from '@/components/RestrictivenessScale';
import { CensorshipHeatmap } from '@/components/CensorshipHeatmap';
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
    const totalEvaluations = filteredAuditData.length || 0;

    // Calculate relative time for last update
    const lastUpdated = useMemo(() => {
        if (timelineDates.length === 0) return 'N/A';
        const lastDateStr = timelineDates[timelineDates.length - 1];
        const lastDate = new Date(lastDateStr);
        const today = new Date();

        // Reset time part for accurate day calculation
        lastDate.setHours(0, 0, 0, 0);
        today.setHours(0, 0, 0, 0);

        const diffTime = Math.abs(today.getTime() - lastDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Yesterday';
        return `${diffDays} days ago`;
    }, [timelineDates]);

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




    return (
        <div>
            {/* Share button */}
            {/* Overview Section */}
            {/* Overview Section */}
            <div className="mb-8">
                <KeyMetrics
                    totalCases={totalCases}
                    modelsCount={modelsCount}
                    consistencyScore={consistencyScore}
                    dateRange={dateRange}
                    totalEvaluations={totalEvaluations}
                    lastUpdated={lastUpdated}
                />
            </div>



            {/* Restrictiveness Spectrum */}
            {modelData.length > 0 && (
                <RestrictivenessScale models={modelData} />
            )}



            {/* Refusal Heatmap */}
            <div className="mb-8">
                <CensorshipHeatmap
                    data={filteredAuditData}
                    title="Refusal Heatmap Details"
                    description="Detailed breakdown of refusal rates per model and category. Darker red indicates higher refusal rates."
                />
            </div>
        </div>
    );
}
