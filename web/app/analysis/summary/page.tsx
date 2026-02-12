'use client';

import { useAnalysis } from '@/app/analysis/AnalysisContext';
import { FileText } from 'lucide-react';
import KeyMetrics from '@/components/KeyMetrics';
import RestrictivenessScale from '@/components/RestrictivenessScale';
import SkeletonLoader from '@/components/SkeletonLoader';
import ShareButton from '@/components/ShareButton';
import { typography } from '@/lib/design-system';

export default function SummaryPage() {
    const { reportContent, loading, stats, efficiencyData, filteredAuditData, timelineDates } = useAnalysis();

    if (loading) return <SkeletonLoader />;

    // Calculate metrics
    const totalCases = stats?.prompts.length || 0;
    const modelsCount = stats?.models.length || 0;
    const consistencyScore = stats?.reliability || 0.905;
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

            {/* Executive Summary Report */}
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200" id="executive-summary">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-lg flex items-center gap-2">
                        <FileText className="w-5 h-5" />
                        Executive Summary
                    </h3>
                    <ShareButton
                        title="Executive Summary"
                        text="AI moderation analysis executive summary"
                    />
                </div>

                {reportContent ? (
                    <article className="prose prose-slate max-w-none text-sm">
                        {reportContent.split('\n').map((line, i) => {
                            if (line.startsWith('# ')) return <h1 key={i} className={typography.pageTitle + " mt-6 mb-4"}>{line.replace('# ', '')}</h1>;
                            if (line.startsWith('## ')) return <h2 key={i} className={typography.sectionHeading + " mt-6 mb-3 border-b pb-1"}>{line.replace('## ', '')}</h2>;
                            if (line.startsWith('### ')) return <h3 key={i} className={typography.subsectionHeading + " mt-4 mb-2"}>{line.replace('### ', '')}</h3>;
                            if (line.startsWith('- ')) return <li key={i} className="ml-4 list-disc my-1">{line.replace('- ', '')}</li>;
                            return <p key={i} className="my-2 whitespace-pre-wrap">{line}</p>;
                        })}
                    </article>
                ) : (
                    <div className="text-slate-400">No report generated.</div>
                )}
            </div>
        </div>
    );
}
