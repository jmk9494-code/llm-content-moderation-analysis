'use client';

import { useAnalysis } from '@/app/analysis/AnalysisContext';
import { ResponsiveContainer, BarChart, CartesianGrid, XAxis, YAxis, Tooltip as RechartsTooltip, Legend, Bar, Cell } from 'recharts';
import SkeletonLoader from '@/components/SkeletonLoader';
import AnalysisOverview from '@/components/AnalysisOverview';

export default function PaternalismPage() {
    const { filteredPaternalismData: paternalismData, loading } = useAnalysis();

    if (loading) return <SkeletonLoader />;

    return (
        <div className="space-y-6">
            <AnalysisOverview
                title="Paternalism Audit: User-Based Discrimination"
                description="Do AI models treat users differently based on who they claim to be? We test this by submitting identical prompts from different personas (e.g., 'I am a teenager' vs. 'I am an authority figure'). Paternalistic behavior occurs when models refuse content to 'vulnerable' users (like teenagers) while allowing the same content for 'authority' figures—essentially treating users as if they can't make their own judgments about what information they should access."
                importance="Paternalism in AI moderation is a direct threat to internet openness because it creates a tiered system of information access based on user identity. When models assume certain users 'can't handle' certain information and restrict it accordingly, they undermine individual autonomy and create an internet where access to knowledge depends on who you are, not what you're seeking. This is fundamentally incompatible with the ideal of an open internet where information should be equally accessible to all users, regardless of age or perceived authority."
                metrics={[
                    "Persona-Based Refusal Differential: Percentage point difference in refusal rates between laypeople and authority figures",
                    "Paternalism Score: Magnitude of discriminatory behavior based on user identity",
                    "Consistency Across Personas: Whether models apply the same standards regardless of user claims"
                ]}
            />
            <div className="bg-card rounded-xl border border-border p-6 overflow-hidden max-w-2xl mx-auto">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-foreground flex items-center gap-2">Paternalism Audit</h3>
                </div>
                <div className="flex flex-col items-center">
                    <p className="text-sm text-muted-foreground mb-4 text-center">Do models refuse "Laypeople" (Teenagers) more than "Authority" figures?</p>
                    <div className="relative w-full aspect-square bg-muted/10 rounded-lg border border-border flex items-center justify-center overflow-hidden p-4">
                        {paternalismData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={paternalismData} layout="vertical" margin={{ top: 20, right: 30, left: 100, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis type="number" domain={[0, 100]} unit="%" />
                                    <YAxis type="category" dataKey="model" width={120} tick={{ fontSize: 10 }} />
                                    <RechartsTooltip />
                                    <Legend />
                                    <Bar dataKey="refusal_rate" name="Refusal Rate" fill="#8884d8">
                                        {paternalismData.map((entry: any, index: number) => (
                                            <Cell key={`cell-${index}`} fill={entry.persona === 'Authority' ? 'hsl(var(--foreground))' : 'hsl(var(--muted-foreground))'} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <img src="/paternalism.png" alt="Paternalism Chart" className="object-contain w-full h-full hover:scale-105 transition-transform duration-500" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; (e.target as HTMLImageElement).parentElement!.innerHTML = '<span class="text-muted-foreground text-sm">Chart not generated yet</span>'; }} />
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
