
'use client';

import { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Brain, Tag } from 'lucide-react';

type Cluster = {
    cluster_id: number;
    size: number;
    keywords: string[];
    exemplar: string;
    models: Record<string, number>;
};

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function AnalysisPage() {
    const [clusters, setClusters] = useState<Cluster[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/clusters.json')
            .then(r => r.json())
            .then(data => {
                setClusters(data);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, []);

    if (loading) return <div className="p-8 text-center text-slate-500">Loading analysis...</div>;
    if (clusters.length === 0) return <div className="p-8 text-center text-slate-500">No cluster data available. Run analysis script first.</div>;

    const pieData = clusters.map((c, i) => ({
        name: `Cluster ${i + 1}`,
        value: c.size,
        keywords: c.keywords.join(', ')
    }));

    return (
        <main className="min-h-screen bg-slate-50 p-8">
            <div className="max-w-7xl mx-auto space-y-8">
                <header>
                    <h1 className="text-3xl font-extrabold text-slate-900 flex items-center gap-3">
                        <Brain className="h-8 w-8 text-indigo-600" />
                        Semantic Refusal Analysis
                    </h1>
                    <p className="text-lg text-slate-500 mt-1">
                        AI-grouped analysis of *why* models are refusing content.
                    </p>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Visual */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 col-span-1">
                        <h2 className="text-lg font-bold mb-4">Refusal Distribution</h2>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={pieData}
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {pieData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Details */}
                    <div className="col-span-2 space-y-4">
                        {clusters.map((c, idx) => (
                            <div key={idx} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex gap-4">
                                <div className="h-full w-2 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></div>
                                <div className="flex-1">
                                    <div className="flex justify-between items-start mb-2">
                                        <h3 className="font-bold text-slate-800 text-lg">Cluster {idx + 1} ({c.size} cases)</h3>
                                        <div className="flex flex-wrap gap-1">
                                            {c.keywords.map(k => (
                                                <span key={k} className="px-2 py-1 bg-slate-100 text-slate-600 text-xs rounded-full font-mono flex items-center gap-1">
                                                    <Tag className="h-3 w-3" /> {k}
                                                </span>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="bg-slate-50 p-3 rounded-lg text-sm text-slate-600 font-mono mb-3">
                                        "{c.exemplar}"
                                    </div>

                                    <div>
                                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Top Models:</span>
                                        <div className="flex gap-2 mt-1">
                                            {Object.entries(c.models).slice(0, 3).map(([m, count]) => (
                                                <span key={m} className="text-xs border px-2 py-1 rounded">
                                                    {m}: {count}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* --- NEW: Semantic Similarity Gallery --- */}
                <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                        <Tag className="h-5 w-5 text-indigo-500" />
                        Refusal Inspector
                    </h2>
                    <p className="text-slate-500 mb-6">
                        Explore individual cases and find semantically similar refusals (Nearest Neighbors).
                    </p>

                    <SimilarityGallery />
                </section>
            </div>
        </main>
    );
}

// Sub-component for Similarity Gallery to keep main clean
function SimilarityGallery() {
    type SimItem = {
        id: string;
        prompt_id: string;
        model: string;
        similar: { model: string, response: string, score: number }[];
    }
    const [items, setItems] = useState<SimItem[]>([]);
    const [selected, setSelected] = useState<SimItem | null>(null);

    useEffect(() => {
        fetch('/similarity.json')
            .then(r => r.json())
            .then(data => setItems(data.slice(0, 50))) // Limit to 50 for perfc
            .catch(e => console.error("No similarity data", e));
    }, []);

    if (items.length === 0) return <div className="text-slate-400 italic">No similarity data found. Run analysis script.</div>;

    return (
        <div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {items.map(item => (
                    <button
                        key={item.id}
                        onClick={() => setSelected(item)}
                        className="text-left p-4 rounded-xl border border-slate-200 hover:border-indigo-400 hover:shadow-md transition-all group"
                    >
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-xs font-bold bg-slate-100 px-2 py-1 rounded text-slate-600 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                                {item.model}
                            </span>
                            <span className="text-xs text-slate-400">ID: {item.prompt_id.slice(0, 6)}</span>
                        </div>
                        <div className="text-sm text-slate-700 font-mono line-clamp-3">
                            Click to view nearest neighbors...
                        </div>
                    </button>
                ))}
            </div>

            {/* Modal */}
            {selected && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm" onClick={() => setSelected(null)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                            <h3 className="font-bold text-lg">Similar Refusals</h3>
                            <button onClick={() => setSelected(null)} className="text-slate-400 hover:text-slate-600">Close</button>
                        </div>
                        <div className="p-6 overflow-y-auto space-y-6">
                            <div>
                                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Source Case</h4>
                                <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-lg text-sm font-mono text-indigo-900">
                                    {selected.model} / {selected.prompt_id}
                                </div>
                            </div>

                            <div className="space-y-3">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Nearest Neighbors (Output)</h4>
                                {selected.similar.map((sim, idx) => (
                                    <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex gap-4">
                                        <div className="flex flex-col items-center justify-center w-16 bg-white rounded border border-slate-100 p-1">
                                            <span className="text-xs font-bold text-emerald-600">{(sim.score * 100).toFixed(0)}%</span>
                                            <span className="text-[10px] text-slate-400">Match</span>
                                        </div>
                                        <div className="flex-1">
                                            <div className="text-xs font-bold text-slate-700 mb-1">{sim.model}</div>
                                            <div className="text-xs text-slate-500 font-mono line-clamp-2">{sim.response}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
