'use client';

import { useAnalysis } from '@/app/analysis/AnalysisContext';
import { ModelDrift } from '@/components/ModelDrift';
import { LoadingState } from '../summary/page';

export default function DriftPage() {
    const { driftData, loading } = useAnalysis();

    if (loading) return <LoadingState />;

    return (
        <div className="space-y-6">
            <div className="bg-slate-50 border-l-4 border-indigo-500 p-4 rounded-r-lg shadow-sm text-sm text-slate-700 leading-relaxed">
                <strong>Model Stability (Drift).</strong> Change in Refusal Rate (Start vs End Date).
            </div>
            <ModelDrift data={driftData} />
        </div>
    );
}
