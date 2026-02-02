'use client';

import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { fetchAuditData, type AuditRow } from '@/lib/data-loading';
import { calculateFleissKappa } from '@/lib/statistics';
import Papa from 'papaparse';

// --- Types ---
export type Cluster = {
    cluster_id: number;
    size: number;
    keywords: string[];
    exemplar: string;
    models: Record<string, number>;
};

interface AnalysisContextType {
    auditData: AuditRow[];
    clusters: Cluster[];
    driftData: any[];
    consensusData: any[];
    pValues: any[];
    politicalData: any[];
    paternalismData: any[];
    triggerData: any[];
    reportContent: string;
    loading: boolean;
    dateRange: { start: string; end: string };
    setDateRange: React.Dispatch<React.SetStateAction<{ start: string; end: string }>>;
    filteredAuditData: AuditRow[];
    timelineDates: string[];
    stats: any;
    efficiencyData: any[];
}

const AnalysisContext = createContext<AnalysisContextType | undefined>(undefined);

export function AnalysisProvider({ children }: { children: React.ReactNode }) {
    // Data Loading
    const [auditData, setAuditData] = useState<AuditRow[]>([]);
    const [clusters, setClusters] = useState<Cluster[]>([]);
    const [driftData, setDriftData] = useState<any[]>([]);
    const [consensusData, setConsensusData] = useState<any[]>([]);
    const [pValues, setPValues] = useState<any[]>([]);
    const [politicalData, setPoliticalData] = useState<any[]>([]);
    const [paternalismData, setPaternalismData] = useState<any[]>([]);
    const [triggerData, setTriggerData] = useState<any[]>([]);
    const [reportContent, setReportContent] = useState<string>('');
    const [loading, setLoading] = useState(true);

    // Global Filters
    const [dateRange, setDateRange] = useState<{ start: string; end: string }>({ start: '', end: '' });

    useEffect(() => {
        const loadAll = async () => {
            try {
                // Fetch audit data client-side to avoid API limits
                const data = await fetchAuditData();
                setAuditData(data);

                // Parallel fetches for other assets
                await Promise.allSettled([
                    fetch('/clusters.json').then(async r => { if (r.ok) setClusters(await r.json()); }),
                    fetch('/api/report').then(async r => { if (r.ok) { const j = await r.json(); if (j.content) setReportContent(j.content); } }),
                    fetch('/drift_report.json').then(async r => { if (r.ok) setDriftData(await r.json()); }),
                    fetch('/consensus_bias.csv').then(async r => {
                        if (r.ok) {
                            const text = await r.text();
                            Papa.parse(text, { header: true, skipEmptyLines: true, complete: (res: any) => setConsensusData(res.data) });
                        }
                    }),
                    fetch('/assets/p_values.csv').then(async r => {
                        if (r.ok) {
                            const text = await r.text();
                            Papa.parse(text, { header: true, skipEmptyLines: true, complete: (res: any) => setPValues(res.data) });
                        }
                    }),
                    fetch('/political_compass.json').then(async r => { if (r.ok) setPoliticalData(await r.json()); }),
                    fetch('/paternalism.json').then(async r => { if (r.ok) setPaternalismData(await r.json()); }),
                    fetch('/assets/trigger_words.json').then(async r => { if (r.ok) setTriggerData(await r.json()); })
                ]);

            } catch (err) {
                console.error("Failed to load analysis data", err);
            } finally {
                setLoading(false);
            }
        };
        loadAll();
    }, []);

    // Derived State
    const timelineDates = useMemo(() => {
        if (auditData.length === 0) return [];
        return Array.from(new Set(auditData.map(d => d.timestamp?.split('T')[0] || ''))).filter(d => d).sort();
    }, [auditData]);

    const filteredAuditData = useMemo(() => {
        if (!dateRange.start && !dateRange.end) return auditData;
        return auditData.filter((d: AuditRow) => {
            const date = d.timestamp?.split('T')[0] || '';
            if (dateRange.start && date < dateRange.start) return false;
            if (dateRange.end && date > dateRange.end) return false;
            return true;
        });
    }, [auditData, dateRange]);

    const stats = useMemo(() => {
        if (filteredAuditData.length === 0) return null;
        const uniqueModels = new Set<string>();
        const uniquePrompts = new Set<string>();
        const promptMap = new Map<string, AuditRow[]>();

        filteredAuditData.forEach((row) => {
            uniqueModels.add(row.model);
            const pId = row.case_id || row.prompt_id || row.prompt;
            uniquePrompts.add(pId);
            if (!promptMap.has(pId)) promptMap.set(pId, []);
            promptMap.get(pId)!.push(row);
        });

        const models = Array.from(uniqueModels);
        const prompts = Array.from(uniquePrompts);
        const reliability = calculateFleissKappa(filteredAuditData, models, prompts);

        const distributionMap = new Map<string, number>();
        promptMap.forEach((rows) => {
            const relevant = rows.filter(d => d.verdict !== 'ERROR');
            if (relevant.length === 0) return;
            const safeCount = relevant.filter(d => ['ALLOWED', 'safe', 'safe_response'].includes(d.verdict)).length;
            const percentage = (safeCount / relevant.length);

            let bucket = "";
            if (relevant.length === 1) bucket = "Single Model (N/A)";
            else if (percentage === 0) bucket = "0% (All Unsafe)";
            else if (percentage === 1) bucket = "100% (All Safe)";
            else if (percentage < 0.5) bucket = "< 50% Safe";
            else if (percentage >= 0.5) bucket = "> 50% Safe";

            distributionMap.set(bucket, (distributionMap.get(bucket) || 0) + 1);
        });
        const distribution = Array.from(distributionMap.entries()).map(([name, value]) => ({ name, value }));

        return { reliability, models, prompts, distribution };
    }, [filteredAuditData]);

    const efficiencyData = useMemo(() => {
        if (filteredAuditData.length === 0) return [];
        const modelStats = new Map<string, { total: number, refused: number, cost: number }>();
        filteredAuditData.forEach(row => {
            if (!modelStats.has(row.model)) modelStats.set(row.model, { total: 0, refused: 0, cost: 0 });
            const s = modelStats.get(row.model)!;
            s.total++;
            s.cost += (row.cost || 0);
            if (['REFUSAL', 'REMOVED', 'unsafe', 'Hard Refusal'].includes(row.verdict)) s.refused++;
        });

        return Array.from(modelStats.entries()).map(([model, stats]) => ({
            name: model.split('/').pop(),
            fullName: model,
            refusalRate: (stats.refused / stats.total) * 100,
            costPer1k: (stats.cost / stats.total) * 1000,
            total: stats.total
        })).filter(m => m.total > 0);
    }, [filteredAuditData]);

    return (
        <AnalysisContext.Provider value={{
            auditData, clusters, driftData, consensusData, pValues, politicalData, paternalismData, triggerData,
            reportContent, loading, dateRange, setDateRange, filteredAuditData, timelineDates, stats, efficiencyData
        }}>
            {children}
        </AnalysisContext.Provider>
    );
}

export function useAnalysis() {
    const context = useContext(AnalysisContext);
    if (context === undefined) {
        throw new Error('useAnalysis must be used within an AnalysisProvider');
    }
    return context;
}
