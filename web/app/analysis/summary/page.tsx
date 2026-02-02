'use client';

import { useAnalysis } from '@/app/analysis/AnalysisContext';
import { FileText, Brain } from 'lucide-react';

export default function SummaryPage() {
    const { reportContent, loading } = useAnalysis();

    if (loading) return <LoadingState />;

    return (
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><FileText className="w-5 h-5" /> Executive Summary</h3>
            {reportContent ? (
                <article className="prose prose-slate max-w-none text-sm">
                    {reportContent.split('\n').map((line, i) => {
                        if (line.startsWith('# ')) return <h1 key={i} className="text-2xl font-bold mt-6 mb-4">{line.replace('# ', '')}</h1>;
                        if (line.startsWith('## ')) return <h2 key={i} className="text-xl font-bold mt-6 mb-3 border-b pb-1">{line.replace('## ', '')}</h2>;
                        if (line.startsWith('### ')) return <h3 key={i} className="text-lg font-bold mt-4 mb-2">{line.replace('### ', '')}</h3>;
                        if (line.startsWith('- ')) return <li key={i} className="ml-4 list-disc my-1">{line.replace('- ', '')}</li>;
                        return <p key={i} className="my-2 whitespace-pre-wrap">{line}</p>;
                    })}
                </article>
            ) : <div className="text-slate-400">No report generated.</div>}
        </div>
    );
}

export function LoadingState() {
    return (
        <div className="min-h-[50vh] flex items-center justify-center text-slate-500 bg-slate-50 rounded-2xl border border-slate-200 border-dashed">
            <div className="flex flex-col items-center gap-2">
                <Brain className="h-8 w-8 animate-pulse text-indigo-500" />
                <span>Loading analysis data...</span>
            </div>
        </div>
    );
}
