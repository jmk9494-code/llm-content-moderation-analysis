'use client';

import { useAnalysis } from '@/app/analysis/AnalysisContext';
import KeyMetrics from '@/components/KeyMetrics';
import RestrictivenessScale from '@/components/RestrictivenessScale';
import SkeletonLoader from '@/components/SkeletonLoader';
import ShareButton from '@/components/ShareButton';

export default function SummaryPage() {
    const { loading, stats, efficiencyData, timelineDates } = useAnalysis();

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
        </div>
    );
}
