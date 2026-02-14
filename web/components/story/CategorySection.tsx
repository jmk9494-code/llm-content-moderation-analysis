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
    const top5 = topCategories.slice(0, 5);

    // Academic palette based on UChicago + complements
    const CATEGORY_COLORS = [
        '#800000', // Maroon
        '#D9534F', // Soft Red (High Alert)
        '#EAAA00', // Gold
        '#275D38', // Forest Green
        '#A4343A', // Brick
        '#404040', // Dark Gray
        '#0076A8', // Steel Blue
        '#5D5D5D', // Medium Gray
    ];

    const getColors = (index: number) => {
        const color = CATEGORY_COLORS[index % CATEGORY_COLORS.length];
        return {
            borderColor: color,
            bgColor: color,
            textColor: color
        };
    };

    return (
        <section className="min-h-screen bg-background py-20 md:py-32">
            <div className="w-full max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
                <div className="grid md:grid-cols-2 gap-12 lg:gap-20 items-start">

                    {/* Sticky narrative text */}
                    <div className="md:sticky md:top-24 h-fit">
                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, amount: 0.5 }}
                            transition={{ duration: 0.8 }}
                        >
                            <h2 className="text-4xl md:text-5xl font-bold mb-6 text-foreground">
                                Some Topics Are <span className="underline decoration-foreground">Universally Censored</span>
                            </h2>

                            <p className="text-xl text-muted-foreground mb-12 leading-relaxed">
                                Across all models, certain categories triggered refusals far more than others. Here's what the data reveals:
                            </p>

                            {/* Top 5 callouts */}
                            <div className="space-y-6">
                                {top5.map((cat, idx) => {
                                    const { borderColor, bgColor, textColor } = getColors(idx);
                                    return (
                                        <motion.div
                                            key={cat.name}
                                            initial={{ opacity: 0, x: -20 }}
                                            whileInView={{ opacity: 1, x: 0 }}
                                            viewport={{ once: true }}
                                            transition={{ delay: idx * 0.15, duration: 0.5 }}
                                            className="relative pl-6 border-l-4"
                                            style={{ borderColor: borderColor }}
                                        >
                                            <div
                                                className="absolute -left-3 top-0 w-6 h-6 text-white rounded-full flex items-center justify-center text-sm font-bold"
                                                style={{ backgroundColor: bgColor }}
                                            >
                                                {idx + 1}
                                            </div>
                                            <div className="font-bold text-lg text-foreground mb-1">
                                                {cat.name}
                                            </div>
                                            <div className="text-muted-foreground">
                                                <span className="font-semibold" style={{ color: textColor }}>{cat.value}%</span> refusal rate
                                            </div>
                                            <div className="text-sm text-muted-foreground mt-1">
                                                {cat.count} refused out of {cat.total} test cases
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </div>

                            <motion.p
                                initial={{ opacity: 0 }}
                                whileInView={{ opacity: 1 }}

                                viewport={{ once: true }}
                                transition={{ delay: 0.6, duration: 0.8 }}
                                className="mt-8 text-muted-foreground italic"
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
                        className="bg-card p-8 rounded-2xl border border-border"
                    >
                        <h3 className="text-xl font-bold mb-6 text-foreground">
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
                                        tick={{ fontSize: 13, fontWeight: 600, fill: 'hsl(var(--muted-foreground))' }}
                                    />
                                    <Tooltip
                                        cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                        content={({ active, payload }) => {
                                            if (active && payload && payload.length) {
                                                const data = payload[0].payload;
                                                return (
                                                    <div className="bg-popover text-popover-foreground px-4 py-3 rounded-lg shadow-lg border border-border">
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
                                        {topCategories.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
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
