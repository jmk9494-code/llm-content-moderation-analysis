'use client';

import { useAnalysis } from '@/app/analysis/AnalysisContext';
import { LoadingState } from '../summary/page';

export default function SignificancePage() {
    const { pValues, loading } = useAnalysis();

    if (loading) return <LoadingState />;

    return (
        <div className="space-y-6">
            <div className="bg-slate-50 border-l-4 border-indigo-500 p-4 rounded-r-lg shadow-sm text-sm text-slate-700 leading-relaxed">
                <strong>Statistical Significance (McNemar's Test).</strong> We use McNemar's Test to determine if the difference in refusal rates between two models is statistically significant (P-Value &lt; 0.05) or likely due to random chance.
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">📊 Pairwise Significance Results</h3>
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
