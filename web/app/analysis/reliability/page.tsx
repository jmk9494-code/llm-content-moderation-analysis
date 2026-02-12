'use client';

import { useAnalysis } from '@/app/analysis/AnalysisContext';
import SkeletonLoader from '@/components/SkeletonLoader';
import AnalysisOverview from '@/components/AnalysisOverview';

export default function ReliabilityPage() {
    const { stats, loading } = useAnalysis();

    if (loading) return <SkeletonLoader />;

    if (!stats) return <div className="p-8 text-center text-slate-500">No data available for reliability analysis.</div>;

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

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <h3 className="text-lg font-bold text-slate-900 mb-2">Fleiss' Kappa Score</h3>
                <div className="text-5xl font-black text-indigo-600">{stats.reliability.score.toFixed(3)}</div>
                <div className="text-sm text-slate-500">{stats.reliability.interpretation}</div>
            </div>
        </div>
    );
}
