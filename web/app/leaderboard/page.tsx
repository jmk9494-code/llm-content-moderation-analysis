
'use client';

import { useEffect, useState, useMemo } from 'react';
import { Trophy, TrendingUp, TrendingDown, Minus, Shield, AlertTriangle } from 'lucide-react';
import ModelComparison from '@/components/ModelComparison';

type AuditRow = {
    model: string;
    verdict: string;
    category: string;
    response_text: string;
    timestamp?: string;
};

type ModelRank = {
    rank: number;
    model: string;
    safetyScore: number;
    refusalRate: number;
    total: number;
    avgLength: number;
};

export default function LeaderboardPage() {
    const [data, setData] = useState<AuditRow[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/audit')
            .then(r => r.json())
            .then(res => {
                setData(res.data || []);
                setLoading(false);
            })
            .catch(e => {
                console.error(e);
                setLoading(false);
            });
    }, []);

    const rankings = useMemo(() => {
        if (!data.length) return [];

        const modelStats: Record<string, { total: number; refusals: number; totalLen: number }> = {};

        data.forEach(r => {
            if (!r.model) return;
            if (!modelStats[r.model]) {
                modelStats[r.model] = { total: 0, refusals: 0, totalLen: 0 };
            }
            const s = modelStats[r.model];
            s.total++;
            if (r.verdict === 'REFUSAL' || r.verdict === 'REMOVED') s.refusals++;
            s.totalLen += r.response_text?.length || 0;
        });

        const ranks: ModelRank[] = Object.entries(modelStats).map(([model, s]) => {
            const refusalRate = (s.refusals / s.total) * 100;
            return {
                rank: 0,
                model,
                safetyScore: 100 - refusalRate,
                refusalRate,
                total: s.total,
                avgLength: s.totalLen / s.total
            };
        });

        // Sort by Safety Score desc (Safest first)
        // Or "Strictest" first? Usually "Leaderboard" implies "Best" = "Safest" (?)
        // Let's sort by Safety Score DESC
        ranks.sort((a, b) => b.safetyScore - a.safetyScore);

        return ranks.map((r, i) => ({ ...r, rank: i + 1 }));
    }, [data]);

    if (loading) return <div className="p-12 text-center text-slate-500">Loading rankings...</div>;

    const getMedal = (rank: number) => {
        if (rank === 1) return <Trophy className="h-6 w-6 text-yellow-500" />;
        if (rank === 2) return <Trophy className="h-6 w-6 text-slate-400" />;
        if (rank === 3) return <Trophy className="h-6 w-6 text-amber-700" />;
        return <span className="text-lg font-bold text-slate-400">#{rank}</span>;
    };

    return (
        <main className="min-h-screen bg-slate-50 text-slate-900 p-8 font-sans">
            <div className="max-w-5xl mx-auto space-y-8">
                <header className="text-center space-y-4">
                    <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 flex items-center justify-center gap-3">
                        <Trophy className="h-10 w-10 text-indigo-600" />
                        Model Comparison
                    </h1>
                    <p className="text-lg text-slate-500">
                        Compare how different models handle safety challenges and view strictness rankings.
                    </p>
                </header>

                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <ModelComparison data={data} />
                </div>

                <div className="text-center text-sm text-slate-400 mt-8">
                    * Safety Score calculated as (100 - Refusal Rate). Higher is "Safer" (or more Compliant).
                </div>
            </div>
        </main>
    );
}
