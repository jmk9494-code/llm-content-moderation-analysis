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
    selectedModels: string[];
    setSelectedModels: React.Dispatch<React.SetStateAction<string[]>>;
    allModels: string[];
    filteredAuditData: AuditRow[];
    filteredPoliticalData: any[];
    filteredPaternalismData: any[];
    filteredDriftData: any[];
    filteredConsensusData: any[];
    filteredPValues: any[];
    filteredClusters: Cluster[];
    timelineDates: string[];
    stats: any;
    efficiencyData: any[];
    isLite: boolean;
    isLoadingFull: boolean;
    loadFullDetails: () => Promise<void>;
}

const AnalysisContext = createContext<AnalysisContextType | undefined>(undefined);

// Helper: filter any array with a model field by selectedModels
function filterByModels<T extends { model?: string }>(data: T[], selectedModels: string[]): T[] {
    if (selectedModels.length === 0) return data;
    return data.filter(d => {
        if (!d.model) return true; // Keep items without a model field
        return selectedModels.some(m => d.model!.includes(m) || m.includes(d.model!));
    });
}

export function AnalysisProvider({ children }: { children: React.ReactNode }) {
    // Data Loading
    // Data Loading
    const [auditData, setAuditData] = useState<AuditRow[]>([]);
    const [isLite, setIsLite] = useState(true); // Track if we are using lite data
    const [isLoadingFull, setIsLoadingFull] = useState(false); // Track background loading

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
    const [selectedModels, setSelectedModels] = useState<string[]>([]);

    // Action to load full data (text columns)
    const loadFullDetails = async () => {
        if (!isLite || isLoadingFull) return; // Already full or loading

        console.log("🚀 Triggering FULL data load...");
        setIsLoadingFull(true);
        try {
            const fullData = await fetchAuditData(false, false); // lite=false
            setAuditData(fullData);
            setIsLite(false);
            console.log("✅ FULL data loaded (replaced lite data)");
        } catch (e) {
            console.error("Failed to load full data", e);
        } finally {
            setIsLoadingFull(false);
        }
    };

    useEffect(() => {
        const loadAll = async () => {
            try {
                // progressive loading: fetch lite first
                const data = await fetchAuditData(false, true); // lite=true
                setAuditData(data);
                setIsLite(true);

                fetch('/api/report').then(async r => {
                    if (r.ok) {
                        const j = await r.json();
                        if (j.content) setReportContent(j.content);
                    }
                }).catch(() => { });

                setTimeout(() => {
                    Promise.allSettled([
                        fetch('/clusters.json').then(async r => { if (r.ok) setClusters(await r.json()); }).catch(() => { }),
                        fetch('/drift_report.json').then(async r => { if (r.ok) setDriftData(await r.json()); }).catch(() => { }),
                        fetch('/consensus_bias.csv').then(async r => {
                            if (r.ok) {
                                const text = await r.text();
                                Papa.parse(text, { header: true, skipEmptyLines: true, complete: (res: any) => setConsensusData(res.data) });
                            }
                        }).catch(() => { }),
                        fetch('/assets/p_values.csv').then(async r => {
                            if (r.ok) {
                                const text = await r.text();
                                Papa.parse(text, { header: true, skipEmptyLines: true, complete: (res: any) => setPValues(res.data) });
                            }
                        }).catch(() => { }),
                        fetch('/political_compass.json').then(async r => { if (r.ok) setPoliticalData(await r.json()); }).catch(() => { }),
                        fetch('/paternalism.json').then(async r => { if (r.ok) setPaternalismData(await r.json()); }).catch(() => { }),
                        fetch('/assets/trigger_words.json').then(async r => { if (r.ok) setTriggerData(await r.json()); }).catch(() => { })
                    ]);
                }, 100);

            } catch (err) {
                console.error("Failed to load analysis data", err);
            } finally {
                setLoading(false);
            }
        };
        loadAll();
    }, []);

    // All available models (from raw data, before any filtering)
    const allModels = useMemo(() => {
        if (auditData.length === 0) return [];
        return Array.from(new Set(auditData.map(d => d.model))).filter(m => m).sort();
    }, [auditData]);

    // Derived State
    const timelineDates = useMemo(() => {
        if (auditData.length === 0) return [];
        return Array.from(new Set(auditData.map(d => d.timestamp?.split('T')[0] || ''))).filter(d => d).sort();
    }, [auditData]);

    const filteredAuditData = useMemo(() => {
        let data = auditData;
        if (dateRange.start || dateRange.end) {
            data = data.filter((d: AuditRow) => {
                const date = d.timestamp?.split('T')[0] || '';
                if (dateRange.start && date < dateRange.start) return false;
                if (dateRange.end && date > dateRange.end) return false;
                return true;
            });
        }
        if (selectedModels.length > 0) {
            data = data.filter(d => selectedModels.includes(d.model));
        }
        return data;
    }, [auditData, dateRange, selectedModels]);

    // Filtered static datasets — respond to model filter
    const filteredPoliticalData = useMemo(() => filterByModels(politicalData, selectedModels), [politicalData, selectedModels]);
    const filteredPaternalismData = useMemo(() => {
        const filtered = filterByModels(paternalismData, selectedModels);
        // Remove entries with 0 refusal rate (empty bars)
        return filtered.filter(d => {
            const rate = parseFloat(d.is_refusal ?? d.refusal_rate ?? 0);
            return rate > 0;
        });
    }, [paternalismData, selectedModels]);
    const filteredDriftData = useMemo(() => filterByModels(driftData, selectedModels), [driftData, selectedModels]);
    const filteredConsensusData = useMemo(() => filterByModels(consensusData, selectedModels), [consensusData, selectedModels]);

    // P-values: filter rows where BOTH Model A and Model B match selected models
    const filteredPValues = useMemo(() => {
        if (selectedModels.length === 0) return pValues;
        return pValues.filter(row => {
            const a = row['Model A'] || row.model_a || '';
            const b = row['Model B'] || row.model_b || '';
            return selectedModels.some(m => a.includes(m) || m.includes(a)) &&
                selectedModels.some(m => b.includes(m) || m.includes(b));
        });
    }, [pValues, selectedModels]);

    // Clusters: filter the nested models object inside each cluster
    const filteredClusters = useMemo(() => {
        if (selectedModels.length === 0) return clusters;
        return clusters.map(c => {
            const filteredModels: Record<string, number> = {};
            let filteredSize = 0;
            Object.entries(c.models || {}).forEach(([model, count]) => {
                if (selectedModels.some(m => model.includes(m) || m.includes(model))) {
                    filteredModels[model] = count;
                    filteredSize += count;
                }
            });
            return { ...c, models: filteredModels, size: filteredSize };
        }).filter(c => c.size > 0);
    }, [clusters, selectedModels]);

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

        // Optimization: Pass the already built map to avoid re-looping
        const rawReliability = calculateFleissKappa(promptMap, models, prompts);

        const reliability = {
            score: (rawReliability && !isNaN(rawReliability.score) && isFinite(rawReliability.score))
                ? rawReliability.score
                : 0,
            interpretation: rawReliability?.interpretation || 'Insufficient data'
        };

        const distributionMap = new Map<string, number>();
        promptMap.forEach((rows) => {
            const relevant = rows;
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
            reportContent, loading, dateRange, setDateRange, selectedModels, setSelectedModels, allModels,
            filteredAuditData, filteredPoliticalData, filteredPaternalismData, filteredDriftData,
            filteredConsensusData, filteredPValues, filteredClusters,
            timelineDates, stats, efficiencyData,
            isLite, isLoadingFull, loadFullDetails
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
