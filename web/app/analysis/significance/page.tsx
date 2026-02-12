'use client';

import { useAnalysis } from '@/app/analysis/AnalysisContext';
import SkeletonLoader from '@/components/SkeletonLoader';
import AnalysisOverview from '@/components/AnalysisOverview';

export default function SignificancePage() {
    const { filteredPValues: pValues, loading } = useAnalysis();

    if (loading) return <SkeletonLoader />;

    return (
        <div className="space-y-6">
            <AnalysisOverview
                title="Statistical Significance: Separating Signal from Noise"
                description="Not all differences in refusal rates are meaningful—some may be due to random chance. We use McNemar's Test, a statistical method designed for paired categorical data, to determine if observed differences between two models are statistically significant (P-value < 0.05) or likely due to sampling variability. This helps us identify which model comparisons represent genuine policy differences versus statistical noise."
                importance="Statistical rigor is essential for internet openness advocacy because unsubstantiated claims about AI bias undermine credibility. By applying McNemar's Test, we ensure that when we report a model as 'more restrictive' than another, that difference is real and reproducible—not an artifact of random variation. This scientific approach strengthens accountability: AI companies can't dismiss our findings as statistical flukes, and users can trust that documented differences in censorship behavior are genuine and significant."
                metrics={[
                    "P-Value: Probability that observed difference is due to chance (< 0.05 = statistically significant)",
                    "McNemar's Test Statistic: Measures discordance between paired model verdicts on the same prompts",
                    "Significance Threshold: P < 0.05 indicates 95% confidence the difference is real, not random"
                ]}
            />
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">📊 Pairwise Significance Results</h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-slate-200 text-slate-500 font-semibold">
                                <th className="text-left py-2">Model A</th>
                                <th className="text-left py-2">Model B</th>
                                <th className="text-right py-2">P-Value</th>
                                <th className="text-right py-2">Is Significant?</th>
                            </tr>
                        </thead>
                        <tbody>
                            {pValues.length === 0 ? (
                                <tr><td colSpan={4} className="py-4 text-center text-slate-400">No significance data available.</td></tr>
                            ) : (
                                pValues.slice(0, 10).map((row: any, i: number) => (
                                    <tr key={i} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                                        <td className="py-2 text-slate-700">{row['Model A']}</td>
                                        <td className="py-2 text-slate-700">{row['Model B']}</td>
                                        <td className="py-2 text-right font-mono text-slate-600">{parseFloat(row['P-Value']).toExponential(2)}</td>
                                        <td className="py-2 text-right">
                                            {row['Significant'] === 'YES' ? <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-bold">Yes</span> : <span className="text-xs bg-slate-100 text-slate-500 px-2 py-1 rounded-full">No</span>}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
