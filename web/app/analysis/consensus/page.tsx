'use client';

import { useAnalysis } from '@/app/analysis/AnalysisContext';
import { CouncilConsensus } from '@/components/CouncilConsensus';
import { LoadingState } from '../summary/page';

export default function ConsensusPage() {
    const { consensusData, loading } = useAnalysis();

    if (loading) return <LoadingState />;

    return (
        <div className="space-y-6">
            <div className="bg-slate-50 border-l-4 border-indigo-500 p-4 rounded-r-lg shadow-sm text-sm text-slate-700 leading-relaxed">
                <strong>Council Consensus.</strong> Agreement level among 3 judges on refusal reasons.
            </div>
            <CouncilConsensus data={consensusData} />
        </div>
    );
}
