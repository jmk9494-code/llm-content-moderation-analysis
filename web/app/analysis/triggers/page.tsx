'use client';

import { useAnalysis } from '@/app/analysis/AnalysisContext';
import { ResponsiveContainer, BarChart, CartesianGrid, XAxis, YAxis, Tooltip as RechartsTooltip, Bar } from 'recharts';
import SkeletonLoader from '@/components/SkeletonLoader';
import AnalysisOverview from '@/components/AnalysisOverview';

export default function TriggersPage() {
    const { triggerData, loading } = useAnalysis();

    if (loading) return <SkeletonLoader />;

    return (
        <div className="space-y-6">
            <AnalysisOverview
                title="Trigger List: The Keywords of Censorship"
                description="Certain words appear disproportionately in refused prompts, acting as 'triggers' that signal to models they should refuse. By analyzing the frequency of words in refused vs. accepted prompts, we can identify which specific terms are most strongly associated with censorship. These trigger words reveal the linguistic patterns models use to detect 'problematic' content—from obvious profanity to surprisingly benign terms that have been flagged due to context associations."
                importance="Understanding trigger words is crucial for internet openness because it exposes the crude mechanisms of automated censorship. When we find that neutral words like 'protest,' 'immigration,' or 'gender' are high-frequency triggers, it shows that models are using simplistic keyword matching rather than nuanced context understanding. This leads to over-censorship: legitimate discussions containing these words get flagged alongside genuinely harmful content. By publishing trigger lists, we help users understand why their content was censored and pressure AI companies to move beyond blunt keyword-based moderation."
                metrics={[
                    "Trigger Frequency: How often each word appears in refused prompts vs. accepted prompts",
                    "Discriminative Power: Statistical measure of how predictive a word is of refusal",
                    "Context Independence: Whether words trigger refusal regardless of surrounding context"
                ]}
            />
            <div className="bg-card p-6 rounded-2xl shadow-sm border border-border">
                <h3 className="text-lg font-bold text-foreground">Top Trigger Words</h3>
                <div className="h-[500px]">
                    {triggerData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={triggerData.slice(0, 20)} layout="vertical" margin={{ top: 5, right: 30, left: 120, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                                <XAxis type="number" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                                <YAxis dataKey="word" type="category" width={110} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                                <RechartsTooltip cursor={{ fill: 'hsl(var(--muted))', opacity: 0.1 }} contentStyle={{ backgroundColor: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))', color: 'hsl(var(--popover-foreground))' }} />
                                <Bar dataKey="count" fill="#800000" name="Occurrences" radius={[0, 4, 4, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-[500px] flex items-center justify-center bg-muted/10 rounded-lg border border-border overflow-hidden">
                            <img
                                src="/assets/wordcloud.png"
                                alt="Top Trigger Words Word Cloud"
                                className="object-contain w-full h-full hover:scale-105 transition-transform duration-500"
                                onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = 'none';
                                    (e.target as HTMLImageElement).parentElement!.innerHTML = '<div class="text-center p-8"><p class="text-muted-foreground mb-2">Word cloud not available</p><p class="text-xs text-muted-foreground">Run analysis/trigger_extraction.py to generate.</p></div>';
                                }}
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
