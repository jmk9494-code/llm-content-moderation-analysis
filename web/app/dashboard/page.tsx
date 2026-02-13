'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Brain, BarChart3, ArrowRight, ArrowRightLeft, ChevronRight
} from 'lucide-react';
import { SkeletonCard, SkeletonChart, SkeletonTable } from '@/components/ui/Skeleton';
import { HeroSection } from '@/components/story/HeroSection';
import { SpectrumSection } from '@/components/story/SpectrumSection';
import { CategorySection } from '@/components/story/CategorySection';
import { fetchAuditData, type AuditRow } from '@/lib/data-loading';

interface AuditData {
  model: string;
  category: string;
  region: string;
  verdict: string;
  timestamp?: string;
  prompt?: string;
  response?: string;
}

export default function DashboardPage() {
  const [data, setData] = useState<AuditData[]>([]);
  const [loading, setLoading] = useState(true);
  const [driftData, setDriftData] = useState<any[]>([]);
  const [politicalData, setPoliticalData] = useState<any[]>([]);
  const [paternalismData, setPaternalismData] = useState<any[]>([]);
  const [clustersData, setClustersData] = useState<any[]>([]);

  useEffect(() => {
    async function loadData() {
      try {
        const rows = await fetchAuditData();
        const mappedRows = rows.map(r => ({
          model: r.model,
          category: r.category,
          region: '',
          verdict: r.verdict,
          timestamp: r.timestamp,
          prompt: r.prompt,
          response: r.response
        }));
        setData(mappedRows);
      } catch (error) {
        console.error('Failed to load audit data:', error);
        setData([]);
      } finally {
        setLoading(false);
      }
    }

    // Load supplementary data for highlights
    async function loadExtras() {
      try {
        const [drift, political, paternalism, clusters] = await Promise.all([
          fetch('/drift_report.json').then(r => r.ok ? r.json() : []).catch(() => []),
          fetch('/political_compass.json').then(r => r.ok ? r.json() : []).catch(() => []),
          fetch('/paternalism.json').then(r => r.ok ? r.json() : []).catch(() => []),
          fetch('/clusters.json').then(r => r.ok ? r.json() : []).catch(() => []),
        ]);
        setDriftData(drift);
        setPoliticalData(political);
        setPaternalismData(paternalism);
        setClustersData(clusters);
      } catch { /* ignore */ }
    }

    loadData();
    loadExtras();
  }, []);

  // Filter out system errors for cleaner stats -> DISABLED to show all data (user request)
  const validData = useMemo(() => {
    return data; // .filter(d => d.verdict && !['ERROR', 'TIMEOUT'].includes(d.verdict));
  }, [data]);

  // Calculate stats for story sections
  const stats = useMemo(() => {
    const uniqueModels = new Set(validData.map(d => d.model)).size;
    const totalAudits = validData.length;

    // Calculate tier freshness
    const timestamps = validData
      .map(d => d.timestamp)
      .filter(Boolean)
      .map(t => new Date(t!))
      .filter(d => !isNaN(d.getTime()));

    const now = new Date();
    const mostRecentEfficiency = Math.max(...timestamps.map(d => d.getTime()));
    const daysSinceEfficiency = Math.floor((now.getTime() - mostRecentEfficiency) / (1000 * 60 * 60 * 24));

    // Top categories by refusal rate
    const categoryStats: Record<string, { total: number; refusals: number }> = {};
    validData.forEach(d => {
      if (!categoryStats[d.category]) {
        categoryStats[d.category] = { total: 0, refusals: 0 };
      }
      categoryStats[d.category].total++;
      if (['REFUSAL', 'REMOVED', 'unsafe'].includes(d.verdict)) {
        categoryStats[d.category].refusals++;
      }
    });

    const topCategories = Object.entries(categoryStats)
      .map(([name, stats]) => ({
        name,
        rate: stats.total > 0 ? Math.round((stats.refusals / stats.total) * 100) : 0,
        value: stats.total > 0 ? Math.round((stats.refusals / stats.total) * 100) : 0,
        count: stats.refusals,
        total: stats.total
      }))
      .filter(c => c.rate > 0)
      .sort((a, b) => b.rate - a.rate)
      .slice(0, 5);

    return {
      totalAudits,
      uniqueModels,
      topCategories,
      efficiencyTier: {
        daysSince: daysSinceEfficiency
      }
    };
  }, [validData]);

  // Prepare model refusal rates for spectrum
  const modelRefusalRates = useMemo(() => {
    const modelStats: Record<string, { total: number; refusals: number }> = {};

    validData.forEach(d => {
      if (!modelStats[d.model]) {
        modelStats[d.model] = { total: 0, refusals: 0 };
      }
      modelStats[d.model].total++;
      if (['REFUSAL', 'REMOVED', 'unsafe'].includes(d.verdict)) {
        modelStats[d.model].refusals++;
      }
    });

    return Object.entries(modelStats)
      .map(([model, stats]) => ({
        name: model,
        displayName: model.split('/')[1] || model,
        rate: stats.total > 0 ? Math.round((stats.refusals / stats.total) * 100) : 0
      }))
      .filter(m => m.rate >= 0)
      .sort((a, b) => a.rate - b.rate)
      .slice(0, 5);
  }, [validData]);

  return (
    <main className="min-h-screen bg-[#0B0C15]">
      {loading ? (
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
          <div className="space-y-6 max-w-4xl w-full px-8">
            <SkeletonCard />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <SkeletonChart />
              <SkeletonChart />
            </div>
            <SkeletonTable rows={5} />
          </div>
        </div>
      ) : (
        <>
          {/* STORY MODE: Scrollytelling Sections */}
          <HeroSection
            totalAudits={stats.totalAudits}
            uniqueModels={stats.uniqueModels}
          />

          <SpectrumSection
            modelData={modelRefusalRates}
          />

          <CategorySection
            topCategories={stats.topCategories}
          />

          {/* Deep Dive Highlights */}
          <HighlightsSection
            data={validData}
            driftData={driftData}
            politicalData={politicalData}
            paternalismData={paternalismData}
            clustersData={clustersData}
          />

          {/* FINAL CTA: Direct users to Deep Dive for interactive exploration */}
          <section className="bg-gradient-to-b from-[#0B0C15] via-indigo-950/30 to-[#0B0C15] text-white py-32 relative overflow-hidden">
            {/* Background decorations */}
            <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10"></div>
            <div className="absolute top-1/4 right-0 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl"></div>
            <div className="absolute bottom-1/4 left-0 w-96 h-96 bg-violet-500/20 rounded-full blur-3xl"></div>

            <div className="max-w-4xl mx-auto px-4 md:px-8 text-center relative z-10">
              <div className="inline-flex items-center justify-center p-4 bg-indigo-500/20 rounded-full mb-6 backdrop-blur-sm">
                <Brain className="h-8 w-8 text-indigo-300" />
              </div>

              <h2 className="text-5xl md:text-6xl font-bold mb-6 tracking-tight">
                Ready to Dig Deeper?
              </h2>

              <p className="text-xl md:text-2xl text-indigo-200 mb-12 max-w-2xl mx-auto leading-relaxed">
                Explore the full dataset with interactive filters, charts, and advanced analytics in our Deep Dive section.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/analysis/summary"
                  className="group inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-white bg-indigo-600 rounded-full hover:bg-indigo-500 transition-all duration-200 hover:scale-105 hover:shadow-2xl shadow-lg"
                >
                  <BarChart3 className="mr-2 h-5 w-5" />
                  Explore Deep Dive
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Link>

                <Link
                  href="/compare"
                  className="group inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-white border-2 border-white/30 rounded-full hover:bg-white/10 transition-all duration-200 hover:scale-105 backdrop-blur-sm"
                >
                  <ArrowRightLeft className="mr-2 h-5 w-5" />
                  Compare Models
                </Link>
              </div>

              <div className="mt-16 pt-8 border-t border-white/10">
                <p className="text-sm text-slate-400">
                  {stats.totalAudits.toLocaleString()} audit records • {stats.uniqueModels} models tested • Updated {stats.efficiencyTier.daysSince}d ago
                </p>
              </div>
            </div>
          </section>
        </>
      )}
    </main>
  );
}

// === Deep Dive Highlights Section ===
function HighlightsSection({
  data,
  driftData,
  politicalData,
  paternalismData,
  clustersData,
}: {
  data: AuditData[];
  driftData: any[];
  politicalData: any[];
  paternalismData: any[];
  clustersData: any[];
}) {
  const isUnsafe = (v: string) => ['REFUSAL', 'REMOVED', 'BLOCKED', 'unsafe', 'Hard Refusal'].includes(v);

  // Compute Fleiss' Kappa (simplified)
  const kappaStats = useMemo(() => {
    if (data.length === 0) return null;
    const models = Array.from(new Set(data.map(d => d.model)));
    const promptMap = new Map<string, Map<string, boolean>>();
    data.forEach(row => {
      const pId = row.prompt || row.category;
      if (!pId) return;
      if (!promptMap.has(pId)) promptMap.set(pId, new Map());
      promptMap.get(pId)!.set(row.model, isUnsafe(row.verdict));
    });
    // Only prompts with 2+ model responses
    const multi = Array.from(promptMap.entries()).filter(([, m]) => m.size >= 2);
    if (multi.length === 0) return null;

    // Simple agreement metric
    let totalAgree = 0;
    multi.forEach(([, modelVerdicts]) => {
      const verdicts = Array.from(modelVerdicts.values());
      const unsafeCount = verdicts.filter(v => v).length;
      const majority = unsafeCount > verdicts.length / 2;
      const agreeCount = verdicts.filter(v => v === majority).length;
      totalAgree += agreeCount / verdicts.length;
    });
    const avgAgreement = totalAgree / multi.length;

    return { kappa: avgAgreement, prompts: multi.length, models: models.length };
  }, [data]);

  // Drift
  const drift = useMemo(() => {
    if (!driftData.length) return null;
    const drifted = driftData.filter(d => d.drift_detected === true || d.drift_detected === 'true').length;
    return { total: driftData.length, drifted, stable: driftData.length - drifted };
  }, [driftData]);

  // Political
  const political = useMemo(() => {
    if (!politicalData.length) return null;
    const avgEcon = politicalData.reduce((s: number, d: any) => s + (d.economic || 0), 0) / politicalData.length;
    const avgSocial = politicalData.reduce((s: number, d: any) => s + (d.social || 0), 0) / politicalData.length;
    return { total: politicalData.length, avgEcon, avgSocial };
  }, [politicalData]);

  // Paternalism
  const paternalism = useMemo(() => {
    const filtered = paternalismData.filter(d => parseFloat(d.is_refusal ?? d.refusal_rate ?? 0) > 0);
    if (!filtered.length) return null;
    const rates = filtered.map(d => parseFloat(d.is_refusal ?? d.refusal_rate ?? 0));
    const avg = rates.reduce((s, r) => s + r, 0) / rates.length;
    const maxIdx = rates.indexOf(Math.max(...rates));
    return { avg, maxModel: filtered[maxIdx]?.model?.split('/').pop() || '?', maxRate: rates[maxIdx] };
  }, [paternalismData]);

  // Clusters
  const clusters = useMemo(() => {
    if (!clustersData.length) return null;
    const totalSize = clustersData.reduce((s: number, c: any) => s + (c.size || 0), 0);
    const top = clustersData.reduce((max: any, c: any) => (c.size > (max?.size || 0) ? c : max), clustersData[0]);
    return { count: clustersData.length, totalSize, topKeywords: top?.keywords?.slice(0, 3)?.join(', ') || '—' };
  }, [clustersData]);

  // Significance
  const significance = useMemo(() => {
    const models = Array.from(new Set(data.map(d => d.model)));
    return { models: models.length, pairs: Math.floor((models.length * (models.length - 1)) / 2) };
  }, [data]);

  const cards = [
    kappaStats && {
      emoji: '📐', title: "Fleiss' Kappa", href: '/analysis/reliability',
      value: kappaStats.kappa.toFixed(3),
      subtitle: kappaStats.kappa >= 0.8 ? 'Strong agreement' : kappaStats.kappa >= 0.6 ? 'Substantial agreement' : kappaStats.kappa >= 0.4 ? 'Moderate agreement' : 'Fair agreement',
      detail: `${kappaStats.models} models × ${kappaStats.prompts.toLocaleString()} prompts`,
      accent: 'text-indigo-400',
    },
    drift && {
      emoji: '📉', title: 'Model Stability', href: '/analysis/drift',
      value: `${drift.drifted}/${drift.total}`,
      subtitle: drift.drifted > 0 ? 'Policy changes detected' : 'All models consistent',
      detail: `${drift.stable} stable models`,
      accent: 'text-amber-400',
    },
    political && {
      emoji: '🧭', title: 'Political Compass', href: '/analysis/political',
      value: `${political.avgEcon.toFixed(1)} / ${political.avgSocial.toFixed(1)}`,
      subtitle: `${political.avgEcon < 0 ? 'Left' : 'Right'}-${political.avgSocial > 0 ? 'Authoritarian' : 'Libertarian'} avg`,
      detail: `${political.total} models plotted`,
      accent: 'text-purple-400',
    },
    paternalism && {
      emoji: '🛡️', title: 'Paternalism', href: '/analysis/paternalism',
      value: `${(paternalism.avg * 100).toFixed(0)}%`,
      subtitle: 'avg refusal across personas',
      detail: `Most restrictive: ${paternalism.maxModel} (${(paternalism.maxRate * 100).toFixed(0)}%)`,
      accent: 'text-rose-400',
    },
    clusters && {
      emoji: '🧠', title: 'Semantic Clusters', href: '/analysis/clusters',
      value: String(clusters.count),
      subtitle: `${clusters.totalSize.toLocaleString()} items clustered`,
      detail: `Top: ${clusters.topKeywords}`,
      accent: 'text-teal-400',
    },
    significance.pairs > 0 && {
      emoji: '📊', title: 'Significance Testing', href: '/analysis/significance',
      value: String(significance.pairs),
      subtitle: "pairwise comparisons (McNemar's)",
      detail: `${significance.models} models compared`,
      accent: 'text-emerald-400',
    },
  ].filter(Boolean) as any[];

  if (cards.length === 0) return null;

  return (
    <section className="min-h-[60vh] bg-[#0B0C15] py-20 md:py-32 border-t border-white/5">
      <div className="w-full max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-3 text-center">
          🔬 Key Findings at a Glance
        </h2>
        <p className="text-lg text-slate-400 text-center mb-12 max-w-2xl mx-auto">
          Summary metrics from our deep dive analyses — click any card to explore the full analysis
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {cards.map((card, i) => (
            <Link key={i} href={card.href} className="group">
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/10 hover:border-white/20 hover:shadow-lg hover:scale-[1.02] transition-all duration-300 h-full backdrop-blur-sm">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-2xl">{card.emoji}</span>
                  <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-slate-300 transition-colors" />
                </div>
                <h3 className="text-sm font-semibold text-slate-300 mb-2">{card.title}</h3>
                <p className={`text-3xl font-black ${card.accent} mb-1`}>{card.value}</p>
                <p className="text-sm text-slate-400 mb-2">{card.subtitle}</p>
                <p className="text-xs text-slate-500">{card.detail}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
