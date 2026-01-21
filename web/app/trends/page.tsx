'use client';

import { useEffect, useState } from 'react';
import Papa from 'papaparse';
import TimeLapseChart from '@/components/TimeLapseChart';
import { TrendingUp, Clock } from 'lucide-react';

export default function TrendsPage() {
    const [trends, setTrends] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Papa.parse<any>('/trends.csv', {
            download: true,
            header: true,
            complete: (results: any) => {
                setTrends(results.data.filter((r: any) => r.model));
                setLoading(false);
            },
            error: () => setLoading(false)
        });
    }, []);

    return (
        <main className="min-h-screen bg-slate-50 text-slate-900 p-8 font-sans">
            <div className="max-w-7xl mx-auto space-y-8">

                {/* Header */}
                <header className="border-b border-slate-200 pb-6">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-indigo-100 rounded-lg">
                            <Clock className="h-6 w-6 text-indigo-700" />
                        </div>
                        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
                            Time-Travel Trends
                        </h1>
                    </div>
                    <p className="text-lg text-slate-500 font-medium">
                        Visualize how model refusals and safety behaviors evolve over time.
                    </p>
                </header>

                {/* Content */}
                {loading ? (
                    <div className="flex justify-center items-center h-64">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                    </div>
                ) : (
                    <div className="space-y-6">
                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                            <p className="text-slate-600 mb-4">
                                This chart tracks the percentage of prompts that triggered a refusal (red lines) over multiple audit runs.
                                Use the slider to replay history.
                            </p>
                            <TimeLapseChart data={trends} />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-blue-50 p-6 rounded-xl border border-blue-100">
                                <h3 className="flex items-center gap-2 font-bold text-blue-900 mb-2">
                                    <TrendingUp className="h-5 w-5" />
                                    What to look for?
                                </h3>
                                <ul className="list-disc list-inside text-sm text-blue-800 space-y-1">
                                    <li><strong>Rising Trends:</strong> A model becoming stricter over time.</li>
                                    <li><strong>Falling Trends:</strong> A model becoming more permissible or "jailbroken".</li>
                                    <li><strong>Spikes:</strong> Sudden changes often correlate with provider updates or new system prompts.</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </main>
    );
}
