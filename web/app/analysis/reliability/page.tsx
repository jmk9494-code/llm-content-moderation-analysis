'use client';

import { useAnalysis } from '@/app/analysis/AnalysisContext';
import { AuditWizard } from '@/components/ui/AuditWizard';
import { LoadingState } from '../summary/page';

export default function ReliabilityPage() {
    const { stats, auditData, loading } = useAnalysis();

    if (loading) return <LoadingState />;

    if (!stats) return <div className="p-8 text-center text-slate-500">No data available for reliability analysis.</div>;

    return (
        <div className="space-y-6">
            <div className="bg-slate-50 border-l-4 border-indigo-500 p-4 rounded-r-lg shadow-sm text-sm text-slate-700 leading-relaxed">
                <strong>Reliability Score.</strong> Measures consistency across repeated prompts.
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <h3 className="text-lg font-bold mb-2">Fleiss' Kappa Score</h3>
                <div className="text-5xl font-black text-indigo-600">{stats.reliability.score.toFixed(3)}</div>
                <div className="text-slate-500">{stats.reliability.interpretation}</div>
            </div>

            {/* Human Audit Kit UI */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                    🕵️ Human Audit Kit
                </h3>
                <p className="text-sm text-slate-500 mb-6">
                    Calculate Inter-Rater Reliability (Cohen's Kappa) by validating AI verdicts against human judgment.
                </p>

                <div className="mt-4">
                    <AuditWizard data={auditData} />
                </div>
            </div>
        </div>
    );
}
