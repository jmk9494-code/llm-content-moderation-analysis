
'use client';

import { useEffect, useState, useMemo } from 'react';
import { Check, X, AlertTriangle, PlayCircle, Save } from 'lucide-react';
import Papa from 'papaparse';

type AuditRow = {
    case_id: string;
    model: string;
    category: string;
    prompt: string;
    response: string;
    verdict: string;
    timestamp?: string;
};

type GradeRow = {
    case_id: string;
    human_verdict: string;
};

export default function GradingPage() {
    const [auditData, setAuditData] = useState<AuditRow[]>([]);
    const [gradedIds, setGradedIds] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);
    const [currentIndex, setCurrentIndex] = useState(0);

    // Fetch data on load
    useEffect(() => {
        Promise.all([
            fetch('/api/audit').then(r => r.json()),
            fetch('/api/grades').then(r => r.json())
        ]).then(([auditRes, gradesRes]) => {
            const auditRows = auditRes.data || [];
            const gradeRows = gradesRes.data || [];

            setAuditData(auditRows);
            setGradedIds(new Set(gradeRows.map((g: any) => g.case_id)));
            setLoading(false);
        }).catch(err => {
            console.error("Failed to load data", err);
            setLoading(false);
        });
    }, []);

    // Filter unreviewed cases
    const queue = useMemo(() => {
        return auditData.filter(r => !gradedIds.has(r.case_id));
    }, [auditData, gradedIds]);

    const currentCase = queue[currentIndex];

    const submitGrade = async (human_verdict: string) => {
        if (!currentCase) return;

        try {
            const payload = {
                case_id: currentCase.case_id,
                original_verdict: currentCase.verdict,
                human_verdict,
                notes: ''
            };

            const res = await fetch('/api/grades', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                // Mark as graded locally
                const newGraded = new Set(gradedIds);
                newGraded.add(currentCase.case_id);
                setGradedIds(newGraded);

                // Move to next? (Actually queue automatically filters it out, so index stays 0 generally, 
                // but if we want to support skipping we might need index logic. 
                // Since queue shrinks, index 0 is always the *next* available one if we just removed the head).
                // However, let's keep it simple: we just re-render and queue[0] is new.
            } else {
                alert('Failed to save grade');
            }
        } catch (e) {
            console.error(e);
            alert('Error submitting grade');
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-screen bg-slate-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    if (!currentCase) {
        return (
            <main className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
                <div className="bg-white p-8 rounded-2xl shadow-lg text-center max-w-md">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Check className="h-8 w-8 text-green-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800 mb-2">All Caught Up!</h2>
                    <p className="text-slate-500 mb-6">There are no more cases waiting for review.</p>
                </div>
            </main>
        );
    }

    const progress = Math.round((gradedIds.size / auditData.length) * 100) || 0;

    return (
        <main className="min-h-screen bg-slate-100 p-6 font-sans flex flex-col items-center">

            {/* Top Bar */}
            <div className="w-full max-w-4xl flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">HITL Grading</h1>
                    <p className="text-slate-500 text-sm">Validating {auditData.length} audit logs</p>
                </div>
                <div className="text-right">
                    <div className="text-sm font-semibold text-slate-700">{gradedIds.size} / {auditData.length} Checked</div>
                    <div className="w-48 h-2 bg-slate-200 rounded-full mt-1 overflow-hidden">
                        <div className="h-full bg-indigo-500 transition-all duration-300" style={{ width: `${progress}%` }}></div>
                    </div>
                </div>
            </div>

            {/* Main Grading Card */}
            <div className="w-full max-w-4xl bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col md:flex-row min-h-[600px]">

                {/* Left: Context */}
                <div className="w-full md:w-1/2 p-6 border-b md:border-b-0 md:border-r border-slate-100 flex flex-col gap-6">
                    <div>
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Context</span>
                        <div className="flex gap-2 mt-2">
                            <span className="bg-slate-100 text-slate-700 px-2 py-1 rounded text-xs font-semibold border border-slate-200">
                                {currentCase.model}
                            </span>
                            <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs font-semibold border border-blue-100">
                                {currentCase.category}
                            </span>
                            <span className={`px-2 py-1 rounded text-xs font-semibold border ${currentCase.verdict === 'refusal'
                                    ? 'bg-red-50 text-red-700 border-red-100'
                                    : 'bg-green-50 text-green-700 border-green-100'
                                }`}>
                                Auto-Verdict: {currentCase.verdict}
                            </span>
                        </div>
                    </div>

                    <div className="flex-1">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">User Prompt</span>
                        <div className="mt-2 p-4 bg-slate-50 rounded-lg text-slate-800 text-sm whitespace-pre-wrap font-medium leading-relaxed border border-slate-200">
                            {currentCase.prompt}
                        </div>
                    </div>
                </div>

                {/* Right: Response & Actions */}
                <div className="w-full md:w-1/2 flex flex-col">
                    <div className="flex-1 p-6 overflow-y-auto max-h-[500px]">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Model Response</span>
                        <div className="mt-2 text-slate-700 text-sm leading-relaxed whitespace-pre-wrap font-mono bg-white">
                            {currentCase.response}
                        </div>
                    </div>

                    <div className="p-6 bg-slate-50 border-t border-slate-200">
                        <p className="text-sm text-slate-600 mb-3 font-medium text-center">Is the verdict <b>{currentCase.verdict}</b> correct?</p>

                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={() => submitGrade(currentCase.verdict)} // Agrees with auto
                                className="col-span-2 bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-colors shadow-sm"
                            >
                                <Check className="h-5 w-5" />
                                Yes, Report is Correct
                            </button>

                            <button
                                onClick={() => submitGrade('safe')} // Force safe
                                className="bg-white hover:bg-red-50 text-slate-700 border border-slate-200 hover:border-red-200 py-2 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
                            >
                                Actually Safe
                            </button>

                            <button
                                onClick={() => submitGrade('refusal')} // Force refusal
                                className="bg-white hover:bg-red-50 text-slate-700 border border-slate-200 hover:border-red-200 py-2 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
                            >
                                Actually Refusal
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="mt-4 text-xs text-slate-400">
                Case ID: {currentCase.case_id}
            </div>

        </main>
    );
}
