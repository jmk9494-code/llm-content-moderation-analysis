'use client';

import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';

interface ModelData {
    name: string;
    rate: number;
    displayName: string;
}

interface SpectrumSectionProps {
    modelData: ModelData[];
}

/**
 * SpectrumSection - Shows models on the restrictiveness spectrum
 * 
 * Features:
 * - Scroll-animated gradient bar that reveals left to right
 * - Models appear sequentially as user scrolls
 * - Color-coded by restrictiveness level
 */
export function SpectrumSection({ modelData }: SpectrumSectionProps) {
    const ref = useRef(null);
    const { scrollYProgress } = useScroll({
        target: ref,
        offset: ["start end", "end start"]
    });

    // Animate the gradient bar reveal
    const scaleX = useTransform(scrollYProgress, [0.1, 0.4], [0, 1]);

    // Sort models by refusal rate
    const sortedModels = [...modelData].sort((a, b) => a.rate - b.rate);

    return (
        <section ref={ref} className="min-h-screen bg-white py-20 md:py-32">
            <div className="max-w-6xl mx-auto px-6 md:px-8">
                {/* Section header */}
                <motion.div
                    initial={{ opacity: 0, y: 50 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.3 }}
                    transition={{ duration: 0.8 }}
                    className="mb-20"
                >
                    <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 text-slate-900">
                        The Restrictiveness Spectrum
                    </h2>
                    <p className="text-xl md:text-2xl text-slate-600 max-w-3xl">
                        From permissive to restrictive—where does each AI model draw the line?
                    </p>
                </motion.div>

                {/* Animated gradient bar */}
                <div className="mb-20">
                    <div className="relative h-3 bg-gradient-to-r from-emerald-500 via-yellow-500 to-red-500 rounded-full overflow-hidden shadow-lg">
                        <motion.div
                            className="absolute inset-0 bg-slate-100 origin-right"
                            style={{ scaleX: useTransform(scaleX, [0, 1], [1, 0]) }} // Reverse the mask
                        />
                    </div>

                    {/* Labels */}
                    <div className="flex justify-between mt-3 text-sm font-medium">
                        <span className="text-emerald-700">← Most Permissive</span>
                        <span className="text-red-700">Most Restrictive →</span>
                    </div>
                </div>

                {/* Model cards appearing on scroll */}
                <div className="space-y-6">
                    {sortedModels.map((model, idx) => (
                        <motion.div
                            key={model.name}
                            initial={{ opacity: 0, x: -50 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true, amount: 0.5 }}
                            transition={{ duration: 0.5, delay: idx * 0.08 }}
                            className="flex items-center gap-6 bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow"
                        >
                            {/* Colored badge with percentage */}
                            <div
                                className="flex-shrink-0 w-20 h-20 rounded-2xl flex flex-col items-center justify-center text-white font-bold shadow-lg"
                                style={{
                                    background: model.rate < 10
                                        ? 'linear-gradient(135deg, #10b981, #059669)'
                                        : model.rate < 30
                                            ? 'linear-gradient(135deg, #f59e0b, #d97706)'
                                            : 'linear-gradient(135deg, #ef4444, #dc2626)'
                                }}
                            >
                                <span className="text-2xl">{model.rate}%</span>
                                <span className="text-xs opacity-90">refusal</span>
                            </div>

                            {/* Model info */}
                            <div className="flex-1">
                                <h3 className="font-bold text-xl text-slate-900 mb-1">
                                    {model.displayName}
                                </h3>
                                <p className="text-slate-600">
                                    Refuses <span className="font-semibold">{model.rate}%</span> of content across all test categories
                                </p>
                            </div>

                            {/* Visual indicator bar */}
                            <div className="hidden md:block w-32">
                                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                    <div
                                        className="h-full rounded-full transition-all duration-1000"
                                        style={{
                                            width: `${model.rate}%`,
                                            background: model.rate < 10
                                                ? '#10b981'
                                                : model.rate < 30
                                                    ? '#f59e0b'
                                                    : '#ef4444'
                                        }}
                                    />
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
