'use client';

import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell, Tooltip } from 'recharts';

interface CategoryData {
    name: string;
    value: number;
    count: number;
    total: number;
}

interface CategorySectionProps {
    topCategories: CategoryData[];
}

/**
 * CategorySection - Reveals top censored categories with sticky narrative
 * 
 * Features:
 * - Sticky text on left that stays while chart animates
 * - Bar chart builds category by category
 * - Highlighted callouts for top 3 categories
 */
export function CategorySection({ topCategories }: CategorySectionProps) {
    const top3 = topCategories.slice(0, 3);

    return (
        <section className="min-h-screen bg-gradient-to-b from-slate-50 to-white py-20 md:py-32">
            <div className="max-w-7xl mx-auto px-6 md:px-8">
                <div className="grid md:grid-cols-2 gap-12 lg:gap-20 items-start">

                    {/* Sticky narrative text */}
                    <div className="md:sticky md:top-24 h-fit">
                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, amount: 0.5 }}
                            transition={{ duration: 0.8 }}
                        >
                            <h2 className="text-4xl md:text-5xl font-bold mb-6 text-slate-900">
                                Some Topics Are <span className="text-red-600">Universally Censored</span>
                            </h2>

                            <p className="text-xl text-slate-600 mb-12 leading-relaxed">
                                Across all models, certain categories triggered refusals far more than others. Here's what the data reveals:
                            </p>

                            {/* Top 3 callouts */}
                            <div className="space-y-6">
                                {top3.map((cat, idx) => (
                                    <motion.div
                                        key={cat.name}
                                        initial={{ opacity: 0, x: -20 }}
                                        whileInView={{ opacity: 1, x: 0 }}
                                        viewport={{ once: true }}
                                        transition={{ delay: idx * 0.15, duration: 0.5 }}
                                        className="relative pl-6 border-l-4 border-red-500"
                                    >
                                        <div className="absolute -left-3 top-0 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                                            {idx + 1}
                                        </div>
                                        <div className="font-bold text-lg text-slate-900 mb-1">
                                            {cat.name}
                                        </div>
                                        <div className="text-slate-600">
                                            <span className="font-semibold text-red-600">{cat.value}%</span> refusal rate
                                        </div>
                                        <div className="text-sm text-slate-500 mt-1">
                                            {cat.count} refused out of {cat.total} test cases
                                        </div>
                                    </motion.div>
                                ))}
                            </div>

                            <motion.p
                                initial={{ opacity: 0 }}
                                whileInView={{ opacity: 1 }}
                                viewport={{ once: true }}
                                transition={{ delay: 0.6, duration: 0.8 }}
                                className="mt-8 text-slate-500 italic"
                            >
                                These patterns hold across models from different companies, suggesting industry-wide standards for certain content types.
                            </motion.p>
                        </motion.div>
                    </div>

                    {/* Animated chart */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true, amount: 0.3 }}
                        transition={{ duration: 0.8, delay: 0.2 }}
                        className="bg-white p-8 rounded-2xl shadow-xl border border-slate-200"
                    >
                        <h3 className="text-xl font-bold mb-6 text-slate-900">
                            Category Refusal Rates
                        </h3>

                        <div style={{ height: `${Math.max(400, topCategories.length * 50)}px` }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                    data={topCategories}
                                    layout="vertical"
                                    margin={{ left: 20, right: 40, top: 10, bottom: 10 }}
                                >
                                    <XAxis type="number" hide domain={[0, 100]} />
                                    <YAxis
                                        dataKey="name"
                                        type="category"
                                        width={150}
                                        tick={{ fontSize: 13, fontWeight: 600, fill: '#475569' }}
                                    />
                                    <Tooltip
                                        cursor={{ fill: 'rgba(0,0,0,0.05)' }}
                                        content={({ active, payload }) => {
                                            if (active && payload && payload.length) {
                                                const data = payload[0].payload;
                                                return (
                                                    <div className="bg-slate-900 text-white px-4 py-3 rounded-lg shadow-lg">
                                                        <div className="font-bold mb-1">{data.name}</div>
                                                        <div className="text-sm">
                                                            <div>{data.value}% refusal rate</div>
                                                            <div className="opacity-75">{data.count} / {data.total} cases</div>
                                                        </div>
                                                    </div>
                                                );
                                            }
                                            return null;
                                        }}
                                    />
                                    <Bar dataKey="value" radius={[0, 8, 8, 0]} barSize={35}>
                                        {topCategories.map((_, index) => (
                                            <Cell
                                                key={`cell-${index}`}
                                                fill={
                                                    index === 0 ? '#dc2626' :
                                                        index === 1 ? '#ea580c' :
                                                            index === 2 ? '#f59e0b' :
                                                                index === 3 ? '#eab308' :
                                                                    index === 4 ? '#84cc16' :
                                                                        '#64748b'
                                                }
                                            />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </motion.div>
                </div>
            </div>
        </section>
    );
}
