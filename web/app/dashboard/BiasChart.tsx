'use client';

import { useMemo } from 'react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    Cell
} from 'recharts';
import { HelpCircle, X } from 'lucide-react';
import { useState } from 'react';

type BiasRow = {
    model: string;
    prompt_id: string;
    leaning: string;
    judge_reasoning: string;
};

export default function BiasChart({ data }: { data: BiasRow[] }) {
    const [showModal, setShowModal] = useState(false);

    const chartData = useMemo(() => {
        if (!data || data.length === 0) return [];

        // Aggregate counts per leaning
        const counts: Record<string, number> = {};
        data.forEach(r => {
            const key = r.leaning;
            counts[key] = (counts[key] || 0) + 1;
        });

        // Convert to array
        return Object.keys(counts).map(key => ({
            leaning: key,
            count: counts[key]
        })).sort((a, b) => b.count - a.count);
    }, [data]);

    const COLORS: Record<string, string> = {
        "Left-Libertarian": "#a855f7", // Purple
        "Right-Authoritarian": "#3b82f6", // Blue
        "Left-Authoritarian": "#ef4444", // Red (using red for auth-left purely for distinction)
        "Right-Libertarian": "#eab308", // Yellow
        "Neutral-Safety": "#94a3b8" // Grey
    };

    if (chartData.length === 0) return null;

    return (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 relative">
            <div className="mb-6 flex justify-between items-start">
                <div>
                    <h3 className="text-lg font-bold text-slate-900">🧭 Axis of Bias Analysis</h3>
                    <p className="text-sm text-slate-500">
                        We used an LLM Judge to analyze the <strong>reasoning</strong> behind each refusal.
                        This chart shows the dominant value systems driving the censorship.
                    </p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="p-1.5 text-slate-400 hover:text-indigo-600 transition-colors rounded-full hover:bg-indigo-50"
                    title="How this works"
                >
                    <HelpCircle className="h-5 w-5" />
                </button>
            </div>

            {showModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setShowModal(false)}>
                    <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full mx-4 overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h3 className="text-lg font-bold text-slate-900">Methodology: The LLM Judge</h3>
                            <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="p-6 text-sm text-slate-600 space-y-4 leading-relaxed">
                            <p>
                                To understand <strong>why</strong> models censor content, we don't just count refusals—we analyze them.
                            </p>
                            <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                                <h4 className="font-bold text-indigo-900 mb-2">How it works</h4>
                                <ol className="list-decimal list-inside space-y-1 ml-1 text-indigo-800">
                                    <li>We collect the specific refusal message (e.g., "I cannot answer this because...").</li>
                                    <li>We feed this response into a neutral <strong>LLM Judge</strong> (GPT-4o).</li>
                                    <li>The Judge analyzes the underlying value system based on political science frameworks.</li>
                                </ol>
                            </div>

                            <h4 className="font-bold text-slate-900 mt-4">The Quadrants</h4>
                            <ul className="space-y-3">
                                <li className="flex gap-3">
                                    <span className="shrink-0 w-3 h-3 mt-1 rounded-full bg-[#a855f7]"></span>
                                    <div>
                                        <strong className="text-slate-900 block">Left-Libertarian</strong>
                                        Focus on social justice, inclusivity, and protecting marginalized groups from hate speech.
                                    </div>
                                </li>
                                <li className="flex gap-3">
                                    <span className="shrink-0 w-3 h-3 mt-1 rounded-full bg-[#ef4444]"></span>
                                    <div>
                                        <strong className="text-slate-900 block">Left-Authoritarian</strong>
                                        Focus on public safety, state authority, and preventing "misinformation" or public harm.
                                    </div>
                                </li>
                                <li className="flex gap-3">
                                    <span className="shrink-0 w-3 h-3 mt-1 rounded-full bg-[#3b82f6]"></span>
                                    <div>
                                        <strong className="text-slate-900 block">Right-Authoritarian</strong>
                                        Focus on tradition, moral order, national security, or religious sanctity.
                                    </div>
                                </li>
                                <li className="flex gap-3">
                                    <span className="shrink-0 w-3 h-3 mt-1 rounded-full bg-[#94a3b8]"></span>
                                    <div>
                                        <strong className="text-slate-900 block">Neutral / Corporate Safety</strong>
                                        Generic "I cannot assist with illegal acts" boilerplate without specific ideological reasoning.
                                    </div>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            )}

            <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                        <XAxis type="number" hide />
                        <YAxis
                            dataKey="leaning"
                            type="category"
                            width={140}
                            tick={{ fontSize: 12 }}
                            interval={0}
                        />
                        <Tooltip
                            cursor={{ fill: 'transparent' }}
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        />
                        <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={32}>
                            {chartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[entry.leaning] || "#cbd5e1"} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
