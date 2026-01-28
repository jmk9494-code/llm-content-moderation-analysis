'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Lightbulb } from 'lucide-react';

interface AuditRow {
    timestamp: string;
    model: string;
    verdict: string;
    cost?: number;
    category?: string;
}

interface InsightsSummaryProps {
    data: AuditRow[];
}

interface Insight {
    type: 'success' | 'warning' | 'info' | 'trend';
    icon: React.ReactNode;
    title: string;
    description: string;
}

export function InsightsSummary({ data }: InsightsSummaryProps) {
    const insights = useMemo((): Insight[] => {
        if (data.length === 0) return [];

        const results: Insight[] = [];

        // Helper to check if verdict is "safe" (not refused)
        const isSafe = (verdict: string) => {
            const v = verdict?.toUpperCase();
            return v !== 'REMOVED' && v !== 'REFUSAL' && v !== 'UNSAFE';
        };

        // Calculate overall pass rate
        const safeCount = data.filter(d => isSafe(d.verdict)).length;
        const unsafeCount = data.filter(d => !isSafe(d.verdict)).length;
        const passRate = data.length > 0 ? (safeCount / data.length * 100) : 0;

        // 1. Overall status insight
        if (passRate >= 90) {
            results.push({
                type: 'success',
                icon: <CheckCircle className="h-5 w-5 text-green-500" />,
                title: 'Excellent Safety Rate',
                description: `${passRate.toFixed(1)}% of prompts are passing moderation across all models.`
            });
        } else if (passRate < 70) {
            results.push({
                type: 'warning',
                icon: <AlertTriangle className="h-5 w-5 text-amber-500" />,
                title: 'Safety Concerns Detected',
                description: `Only ${passRate.toFixed(1)}% of prompts passing. Consider reviewing flagged content.`
            });
        }

        // 2. Find best performing model
        const modelStats: Record<string, { safe: number; total: number }> = {};
        data.forEach(d => {
            const model = d.model?.split('/')[1] || d.model || 'Unknown';
            if (!modelStats[model]) modelStats[model] = { safe: 0, total: 0 };
            modelStats[model].total++;
            if (isSafe(d.verdict)) modelStats[model].safe++;
        });

        const modelRates = Object.entries(modelStats)
            .map(([model, stats]) => ({
                model,
                rate: stats.total > 0 ? (stats.safe / stats.total * 100) : 0,
                total: stats.total
            }))
            .filter(m => m.total >= 3) // Only consider models with enough data
            .sort((a, b) => b.rate - a.rate);

        if (modelRates.length > 0) {
            const best = modelRates[0];
            results.push({
                type: 'success',
                icon: <TrendingUp className="h-5 w-5 text-green-500" />,
                title: `Top Performer: ${best.model}`,
                description: `${best.rate.toFixed(1)}% pass rate across ${best.total} tests.`
            });

            // Find underperformers
            const worst = modelRates[modelRates.length - 1];
            if (worst.rate < 70 && worst.model !== best.model) {
                results.push({
                    type: 'warning',
                    icon: <TrendingDown className="h-5 w-5 text-red-500" />,
                    title: `Needs Attention: ${worst.model}`,
                    description: `Only ${worst.rate.toFixed(1)}% pass rate. May require policy adjustments.`
                });
            }
        }

        // 3. Category analysis
        const categoryStats: Record<string, { safe: number; total: number }> = {};
        data.forEach(d => {
            let cat = d.category || 'unknown';
            // Filter out invalid categories (numeric, short, or explicitly ignored)
            if (!isNaN(Number(cat)) || cat.length < 3 || ['uncategorized', 'unknown', 'nan', 'none'].includes(cat.toLowerCase())) {
                return;
            }
            if (!categoryStats[cat]) categoryStats[cat] = { safe: 0, total: 0 };
            categoryStats[cat].total++;
            if (isSafe(d.verdict)) categoryStats[cat].safe++;
        });

        const problemCategories = Object.entries(categoryStats)
            .map(([cat, stats]) => ({
                category: cat,
                rate: stats.total > 0 ? (stats.safe / stats.total * 100) : 0,
                total: stats.total
            }))
            .filter(c => c.rate < 60 && c.total >= 2)
            .sort((a, b) => a.rate - b.rate);

        if (problemCategories.length > 0) {
            const worst = problemCategories[0];
            results.push({
                type: 'info',
                icon: <Lightbulb className="h-5 w-5 text-blue-500" />,
                title: `Category Alert: ${worst.category}`,
                description: `This category has a ${worst.rate.toFixed(0)}% pass rate. Consider reviewing test cases.`
            });
        }

        // 4. Cost insight (if available)
        const totalCost = data.reduce((sum, d) => sum + (d.cost || 0), 0);
        if (totalCost > 0) {
            const avgCost = totalCost / data.length;
            results.push({
                type: 'info',
                icon: <Sparkles className="h-5 w-5 text-purple-500" />,
                title: 'Cost Overview',
                description: `Total spend: $${totalCost.toFixed(4)}. Average per test: $${avgCost.toFixed(6)}.`
            });
        }

        return results.slice(0, 4); // Limit to 4 insights
    }, [data]);

    if (insights.length === 0) {
        return null;
    }

    return (
        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-xl border border-indigo-100 dark:border-indigo-800 p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
                <div className="p-1.5 bg-indigo-100 dark:bg-indigo-800 rounded-lg">
                    <Sparkles className="h-5 w-5 text-indigo-600 dark:text-indigo-300" />
                </div>
                <div>
                    <h3 className="font-bold text-slate-900 dark:text-white">AI Insights</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Automated analysis of your data</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {insights.map((insight, index) => (
                    <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="flex items-start gap-3 p-3 bg-white dark:bg-slate-800 rounded-lg shadow-sm"
                    >
                        {insight.icon}
                        <div>
                            <div className="font-medium text-sm text-slate-900 dark:text-white">
                                {insight.title}
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                {insight.description}
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
}
