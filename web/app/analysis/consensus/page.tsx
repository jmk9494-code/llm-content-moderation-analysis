'use client';

import { useAnalysis } from '@/app/analysis/AnalysisContext';
import { CouncilConsensus } from '@/components/CouncilConsensus';
import SkeletonLoader from '@/components/SkeletonLoader';
import AnalysisOverview from '@/components/AnalysisOverview';

export default function ConsensusPage() {
    const { consensusData, loading } = useAnalysis();

    if (loading) return <SkeletonLoader />;

    return (
        <div className="space-y-6">
            <AnalysisOverview
                title="Council Consensus: Multi-Judge Validation"
                description="To validate our findings and reduce single-model bias, we employ a 'council' approach: submitting each prompt to multiple AI models (typically 3 judges) and measuring their agreement on refusal decisions. High consensus (all judges agree) indicates that a prompt is universally considered problematic or safe. Low consensus (judges disagree) reveals edge cases where moderation policies diverge, highlighting areas of uncertainty in content moderation standards."
                importance="Council consensus is essential for internet openness because it distinguishes between universally agreed-upon boundaries and arbitrary, model-specific censorship. When all models refuse a prompt (high consensus), it likely contains genuinely harmful content that broad societal norms prohibit. But when models disagree (low consensus), it indicates that one model is being uniquely restrictive—revealing bias in that specific model's training or policy. This multi-judge approach provides the evidence needed to challenge unfair censorship: we can demonstrate that a refusal isn't based on consensus safety standards, but on the idiosyncratic biases of one AI provider."
                metrics={[
                    "Agreement Rate: Percentage of prompts where all judges reach the same verdict (refuse or allow)",
                    "Consensus Categories: 'Full Agreement,' 'Majority,' or 'Split Decision' based on judge alignment",
                    "Inter-Judge Reliability: Statistical measure (e.g., Fleiss' Kappa) of consistency across the council"
                ]}
            />
            <CouncilConsensus data={consensusData} />
        </div>
    );
}
