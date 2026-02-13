'use client';

import { useAnalysis } from '@/app/analysis/AnalysisContext';
import { ModelDrift } from '@/components/ModelDrift';
import SkeletonLoader from '@/components/SkeletonLoader';
import AnalysisOverview from '@/components/AnalysisOverview';

export default function DriftPage() {
    const { filteredDriftData: driftData, loading } = useAnalysis();

    if (loading) return <SkeletonLoader />;

    return (
        <div className="space-y-6">
            <AnalysisOverview
                title="Model Stability (Drift): Detecting Policy Changes"
                description="Model drift measures how much a model's refusal rate changes between the start and end of our testing period. Significant drift indicates that the model's content moderation policies have been updated, either becoming more restrictive (positive drift) or more permissive (negative drift). This helps us identify which models are actively adjusting their censorship policies and in which direction."
                importance="Tracking model stability is essential for internet openness because sudden policy changes can radically alter what content is accessible. When a widely-used AI model suddenly becomes more restrictive, millions of users may lose access to previously available information overnight—often without transparency about what changed or why. By measuring drift, we can detect these shifts early, hold companies accountable for policy changes, and warn users when their favorite models are becoming more censorious."
                metrics={[
                    "Drift Magnitude: Percentage point change in refusal rate over the testing period",
                    "Direction: Positive drift = more restrictive, negative drift = more permissive",
                    "Stability Score: Lower drift values indicate more stable, predictable moderation policies"
                ]}
            />
            <ModelDrift data={driftData} />
        </div>
    );
}
