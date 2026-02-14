'use client';

import { useState, useMemo } from 'react';
import { CheckCircle, XCircle, AlertTriangle, RefreshCw, Play, RotateCcw } from 'lucide-react';
import { AuditRow } from '@/lib/data-loading';

interface AuditWizardProps {
    data: AuditRow[];
}

type AuditStep = 'start' | 'auditing' | 'results';

export function AuditWizard({ data }: AuditWizardProps) {
    const [step, setStep] = useState<AuditStep>('start');
    const [sample, setSample] = useState<AuditRow[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [humanVerdicts, setHumanVerdicts] = useState<Record<string, 'safe' | 'unsafe'>>({});
    const [kappa, setKappa] = useState<number | null>(null);

    const startAudit = () => {
        // Select 20 random samples that have a valid AI verdict
        const validData = data.filter(d => d.verdict && d.prompt && d.model);
        if (validData.length === 0) return;

        const randomSample = [...validData]
            .sort(() => 0.5 - Math.random())
            .slice(0, 20);

        setSample(randomSample);
        setHumanVerdicts({});
        setCurrentIndex(0);
        setStep('auditing');
    };

    const handleVote = (verdict: 'safe' | 'unsafe') => {
        const currentItem = sample[currentIndex];
        // Use a unique key based on index to avoid collision if IDs missing
        setHumanVerdicts(prev => ({ ...prev, [currentIndex]: verdict }));

        if (currentIndex < sample.length - 1) {
            setCurrentIndex(prev => prev + 1);
        } else {
            calculateResults();
        }
    };

    const calculateResults = () => {
        let agreed = 0;
        let aiSafe = 0;
        let humanSafe = 0;
        const n = sample.length;

        sample.forEach((item, idx) => {
            // Normalize AI verdict
            const aiV = (item.verdict || '').toLowerCase();
            const isAiSafe = aiV.includes('safe') || aiV.includes('allow') || aiV === 'allowed';
            const aiVote = isAiSafe ? 'safe' : 'unsafe';

            const humanVote = humanVerdicts[idx];

            if (aiVote === humanVote) agreed++;
            if (aiVote === 'safe') aiSafe++;
            if (humanVote === 'safe') humanSafe++;
        });

        // Cohen's Kappa Calculation
        const po = agreed / n;
        const pe = ((aiSafe / n) * (humanSafe / n)) + (((n - aiSafe) / n) * ((n - humanSafe) / n));

        let k = 0;
        if (1 - pe !== 0) {
            k = (po - pe) / (1 - pe);
        }

        setKappa(k);
        setStep('results');
    };

    const currentItem = sample[currentIndex];

    if (step === 'start') {
        return (
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 text-center">
                <div className="w-16 h-16 bg-muted text-primary rounded-full flex items-center justify-center mx-auto mb-4">
                    <Play className="w-8 h-8 ml-1" />
                </div>
                <h3 className="text-xl font-bold mb-2">Start Human Audit</h3>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                    Audit 20 random model responses to calculate your agreement score (Cohen's Kappa) with the AI systems.
                </p>
                <button
                    onClick={startAudit}
                    className="bg-primary hover:bg-primary/90 text-white font-bold py-3 px-8 rounded-lg transition-colors flex items-center gap-2 mx-auto"
                >
                    Start Session
                </button>
            </div>
        );
    }

    if (step === 'auditing' && currentItem) {
        return (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="bg-muted/30 px-6 py-3 border-b border-border flex justify-between items-center">
                    <span className="font-mono text-xs font-bold text-muted-foreground uppercase tracking-wider">
                        Audit Progress
                    </span>
                    <span className="font-bold text-primary text-sm">
                        {currentIndex + 1} / {sample.length}
                    </span>
                </div>
                <div className="p-6 md:p-8 space-y-6">
                    <div>
                        <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Prompt</h4>
                        <div className="bg-muted/30 p-4 rounded-lg text-foreground text-sm leading-relaxed border border-border">
                            {currentItem.prompt}
                        </div>
                    </div>
                    <div>
                        <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Model Response ({currentItem.model?.split('/').pop()})</h4>
                        <div className="bg-muted/30 p-4 rounded-lg text-muted-foreground text-sm leading-relaxed italic border border-border">
                            {currentItem.verdict === 'REFUSAL' || currentItem.verdict === 'hard refusal' ?
                                <span className="flex items-center gap-2 text-[#A4343A] not-italic font-medium"><XCircle className="w-4 h-4" /> Model Refused</span> :
                                <span className="flex items-center gap-2 text-[#275D38] not-italic font-medium"><CheckCircle className="w-4 h-4" /> Model Complied</span>
                            }
                        </div>
                    </div>

                    <div className="pt-6 border-t border-border flex flex-col items-center gap-4">
                        <h4 className="font-bold text-foreground">How would you rate this?</h4>
                        <div className="flex gap-4 w-full max-w-md">
                            <button
                                onClick={() => handleVote('unsafe')}
                                className="flex-1 flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-border hover:border-[#A4343A]/30 hover:bg-[#A4343A]/5 transition-all group"
                            >
                                <XCircle className="w-8 h-8 text-muted-foreground group-hover:text-[#A4343A] transition-colors" />
                                <span className="font-bold text-muted-foreground group-hover:text-[#A4343A]">Unsafe / Refuse</span>
                            </button>
                            <button
                                onClick={() => handleVote('safe')}
                                className="flex-1 flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-border hover:border-[#275D38]/30 hover:bg-[#275D38]/5 transition-all group"
                            >
                                <CheckCircle className="w-8 h-8 text-muted-foreground group-hover:text-[#275D38] transition-colors" />
                                <span className="font-bold text-muted-foreground group-hover:text-[#275D38]">Safe / Allow</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (step === 'results') {
        const interpretation = !kappa ? 'N/A' :
            kappa < 0 ? 'Poor Agreement' :
                kappa < 0.2 ? 'Slight Agreement' :
                    kappa < 0.4 ? 'Fair Agreement' :
                        kappa < 0.6 ? 'Moderate Agreement' :
                            kappa < 0.8 ? 'Substantial Agreement' : 'Almost Perfect Agreement';

        const color = !kappa ? 'text-slate-400' : kappa < 0.4 ? 'text-amber-500' : 'text-green-500';

        return (
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 text-center animate-in fade-in zoom-in duration-300">
                <h3 className="text-xl font-bold mb-6">Audit Complete</h3>

                <div className="mb-8">
                    <div className="text-sm text-slate-500 mb-1">Your Cohen's Kappa Score</div>
                    <div className={`text-6xl font-black ${color} mb-2`}>
                        {kappa?.toFixed(3)}
                    </div>
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-sm font-medium">
                        {interpretation}
                    </div>
                </div>

                <button
                    onClick={startAudit}
                    className="text-primary hover:text-primary/80 font-medium flex items-center justify-center gap-2 mx-auto"
                >
                    <RotateCcw className="w-4 h-4" /> Start New Session
                </button>
            </div>
        );
    }

    return null;
}
