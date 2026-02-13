'use client';

import { useMemo, useState } from 'react';
import { useAnalysis } from '@/app/analysis/AnalysisContext';
import SkeletonLoader from '@/components/SkeletonLoader';
import AnalysisOverview from '@/components/AnalysisOverview';

// Simple McNemar's test approximation for paired binary data
function mcnemarsTest(b: number, c: number): { pValue: number; significant: boolean } {
    // b = A refused & B allowed, c = A allowed & B refused
    if (b + c === 0) return { pValue: 1, significant: false };
    // McNemar's chi-squared = (|b - c| - 1)^2 / (b + c) with continuity correction
    const chi2 = Math.pow(Math.abs(b - c) - 1, 2) / (b + c);
    // Approximate p-value from chi-squared with 1 df using survival function
    // Using the approximation: p ≈ erfc(sqrt(chi2/2)) for chi2 distribution with 1 df
    const p = 1 - erf(Math.sqrt(chi2 / 2));
    return { pValue: Math.max(0, Math.min(1, p)), significant: p < 0.05 };
}

// Error function approximation (Abramowitz and Stegun)
function erf(x: number): number {
    const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741;
    const a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
    const sign = x < 0 ? -1 : 1;
    const t = 1.0 / (1.0 + p * Math.abs(x));
    const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
    return sign * y;
}

export default function SignificancePage() {
    const { filteredAuditData, loading } = useAnalysis();
    const [showAll, setShowAll] = useState(false);
    const [sortBy, setSortBy] = useState<'pValue' | 'disagreements'>('pValue');

    const pairwiseResults = useMemo(() => {
        if (!filteredAuditData || filteredAuditData.length === 0) return [];

        const isUnsafe = (v: string) => ['REFUSAL', 'REMOVED', 'BLOCKED', 'unsafe', 'Hard Refusal'].includes(v);

        // Group by prompt → model → verdict
        const promptMap = new Map<string, Map<string, boolean>>();
        filteredAuditData.forEach(row => {
            const pId = row.case_id || row.prompt_id || row.prompt;
            if (!pId) return;
            if (!promptMap.has(pId)) promptMap.set(pId, new Map());
            promptMap.get(pId)!.set(row.model, isUnsafe(row.verdict));
        });

        // Get all models
        const models = Array.from(new Set(filteredAuditData.map(r => r.model))).filter(Boolean).sort();
        const results: { modelA: string; modelB: string; pValue: number; significant: boolean; samples: number; disagreements: number }[] = [];

        // Compute pairwise for all unique combinations
        for (let i = 0; i < models.length; i++) {
            for (let j = i + 1; j < models.length; j++) {
                const mA = models[i], mB = models[j];
                let b = 0, c = 0, samples = 0;

                promptMap.forEach((modelVerdicts) => {
                    if (modelVerdicts.has(mA) && modelVerdicts.has(mB)) {
                        samples++;
                        const aUnsafe = modelVerdicts.get(mA)!;
                        const bUnsafe = modelVerdicts.get(mB)!;
                        if (aUnsafe && !bUnsafe) b++; // A refused, B allowed
                        if (!aUnsafe && bUnsafe) c++; // A allowed, B refused
                    }
                });

                if (samples > 0) {
                    const test = mcnemarsTest(b, c);
                    results.push({
                        modelA: mA,
                        modelB: mB,
                        pValue: test.pValue,
                        significant: test.significant,
                        samples,
                        disagreements: b + c,
                    });
                }
            }
        }

        // Sort
        if (sortBy === 'pValue') {
            results.sort((a, b) => a.pValue - b.pValue);
        } else {
            results.sort((a, b) => b.disagreements - a.disagreements);
        }

        return results;
    }, [filteredAuditData, sortBy]);

    if (loading) return <SkeletonLoader />;

    const displayed = showAll ? pairwiseResults : pairwiseResults.slice(0, 50);
    const sigCount = pairwiseResults.filter(r => r.significant).length;

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

            {/* Summary stats */}
            <div className="flex gap-4 flex-wrap">
                <div className="bg-card rounded-xl border border-border p-4 flex-1 min-w-[200px]">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Pairs</p>
                    <p className="text-2xl font-bold text-foreground">{pairwiseResults.length}</p>
                </div>
                <div className="bg-card rounded-xl border border-border p-4 flex-1 min-w-[200px]">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Significant (p&lt;0.05)</p>
                    <p className="text-2xl font-bold text-foreground">{sigCount}</p>
                </div>
                <div className="bg-card rounded-xl border border-border p-4 flex-1 min-w-[200px]">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Not Significant</p>
                    <p className="text-2xl font-bold text-muted-foreground">{pairwiseResults.length - sigCount}</p>
                </div>
            </div>

            <div className="bg-card p-6 rounded-2xl border border-border">
                <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                    <h3 className="text-lg font-bold text-foreground flex items-center gap-2">Pairwise Significance Results</h3>
                    <div className="flex items-center gap-3">
                        <select
                            className="text-xs border border-border rounded-lg px-2 py-1 text-foreground bg-background"
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value as any)}
                        >
                            <option value="pValue">Sort by P-Value</option>
                            <option value="disagreements">Sort by Disagreements</option>
                        </select>
                    </div>
                </div>
                <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                    <table className="w-full text-sm">
                        <thead className="sticky top-0 bg-card">
                            <tr className="border-b border-border text-muted-foreground font-semibold">
                                <th className="text-left py-2">#</th>
                                <th className="text-left py-2">Model A</th>
                                <th className="text-left py-2">Model B</th>
                                <th className="text-right py-2">Shared Prompts</th>
                                <th className="text-right py-2">Disagreements</th>
                                <th className="text-right py-2">P-Value</th>
                                <th className="text-right py-2">Significant?</th>
                            </tr>
                        </thead>
                        <tbody>
                            {displayed.length === 0 ? (
                                <tr><td colSpan={7} className="py-4 text-center text-muted-foreground">No pairwise data — need 2+ models with shared prompts.</td></tr>
                            ) : (
                                displayed.map((row, i) => (
                                    <tr key={i} className="border-b border-border last:border-0 hover:bg-muted/50">
                                        <td className="py-1.5 text-xs text-muted-foreground">{i + 1}</td>
                                        <td className="py-1.5 text-foreground text-xs">{row.modelA}</td>
                                        <td className="py-1.5 text-foreground text-xs">{row.modelB}</td>
                                        <td className="py-1.5 text-right font-mono text-muted-foreground text-xs">{row.samples.toLocaleString()}</td>
                                        <td className="py-1.5 text-right font-mono text-muted-foreground text-xs">{row.disagreements.toLocaleString()}</td>
                                        <td className="py-1.5 text-right font-mono text-muted-foreground text-xs">{row.pValue.toExponential(2)}</td>
                                        <td className="py-1.5 text-right">
                                            {row.significant
                                                ? <span className="text-xs bg-foreground text-background px-2 py-0.5 rounded-full font-bold">Yes</span>
                                                : <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">No</span>
                                            }
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                {!showAll && pairwiseResults.length > 50 && (
                    <button
                        onClick={() => setShowAll(true)}
                        className="mt-4 text-sm text-indigo-600 hover:text-indigo-800 font-medium"
                    >
                        Show all {pairwiseResults.length} pairs →
                    </button>
                )}
                {showAll && pairwiseResults.length > 50 && (
                    <button
                        onClick={() => setShowAll(false)}
                        className="mt-4 text-sm text-indigo-600 hover:text-indigo-800 font-medium"
                    >
                        Show top 50 only
                    </button>
                )}
            </div>
        </div>
    );
}
