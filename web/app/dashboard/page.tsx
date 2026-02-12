'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Brain, BarChart3, ArrowRight, ArrowRightLeft
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

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch('/audit_log.csv.gz');
        if (!response.ok) {
          throw new Error(`HTTP error!status: ${response.status}`);
        }

        const blob = await response.blob();
        let csvText = '';
        try {
          const decompressedStream = blob.stream().pipeThrough(
            new DecompressionStream('gzip')
          );
          const decompressedBlob = await new Response(decompressedStream).blob();
          csvText = await decompressedBlob.text();
        } catch (e) {
          console.warn('Decompression failed for dashboard data, using plain text fallback', e);
          csvText = await blob.text();
        }

        const lines = csvText.trim().split('\n');
        if (lines.length <= 1) {
          setData([]);
          setLoading(false);
          return;
        }

        const headers = lines[0].split(',').map(h => h.trim());
        const modelIdx = headers.indexOf('model');
        const categoryIdx = headers.indexOf('category');
        const regionIdx = headers.indexOf('region');
        const verdictIdx = headers.indexOf('verdict');
        const timestampIdx = headers.indexOf('timestamp');
        const promptIdx = headers.indexOf('prompt');
        const responseIdx = headers.indexOf('response');

        const rows = lines.slice(1).map(line => {
          const cols = line.split(',').map(c => c.trim());
          return {
            model: cols[modelIdx] || '',
            category: cols[categoryIdx] || '',
            region: cols[regionIdx] || '',
            verdict: cols[verdictIdx] || '',
            timestamp: cols[timestampIdx] || '',
            prompt: cols[promptIdx] || '',
            response: cols[responseIdx] || '',
          };
        });

        setData(rows);
      } catch (error) {
        console.error('Failed to load audit data:', error);
        setData([]);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  // Filter out system errors for cleaner stats
  const validData = useMemo(() => {
    return data.filter(d => d.verdict && !['ERROR', 'TIMEOUT'].includes(d.verdict));
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
      .sort((a, b) => a.rate - b.rate);
  }, [validData]);

  return (
    <main className="min-h-screen bg-white">
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

          {/* FINAL CTA: Direct users to Deep Dive for interactive exploration */}
          <section className="bg-gradient-to-br from-indigo-900 via-slate-900 to-black text-white py-32 relative overflow-hidden">
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
