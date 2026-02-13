'use client';

import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';
import { getLogoUrl, getProviderName } from '@/lib/provider-logos';

interface ModelData {
    name: string;
    rate: number;
    displayName: string;
}

interface SpectrumSectionProps {
    modelData: ModelData[];
}

// Color based on rate
function getRateColor(rate: number): string {
    if (rate < 10) return '#10b981';  // emerald
    if (rate < 30) return '#f59e0b';  // amber
    if (rate < 60) return '#f97316';  // orange
    return '#ef4444';                  // red
}

/**
 * SpectrumSection - Dashboard story component showing the restrictiveness spectrum
 */
export function SpectrumSection({ modelData }: SpectrumSectionProps) {
    const ref = useRef(null);
    const { scrollYProgress } = useScroll({
        target: ref,
        offset: ["start end", "end start"]
    });

    const scaleX = useTransform(scrollYProgress, [0.1, 0.4], [0, 1]);
    const sortedModels = [...modelData].sort((a, b) => a.rate - b.rate);

    return (
        <section ref={ref} className="min-h-screen bg-[#0B0C15] py-20 md:py-32">
            <div className="w-full max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
                <motion.div
                    initial={{ opacity: 0, y: 50 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.3 }}
                    transition={{ duration: 0.8 }}
                    className="mb-20"
                >
                    <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 text-white">
                        The Restrictiveness Spectrum
                    </h2>
                    <p className="text-xl md:text-2xl text-slate-400 max-w-3xl">
                        From permissive to restrictive—where does each AI model draw the line?
                    </p>
                </motion.div>

                {/* Animated gradient bar */}
                <div className="mb-20">
                    <div className="relative h-3 bg-gradient-to-r from-emerald-500 via-yellow-500 to-red-500 rounded-full overflow-hidden shadow-lg">
                        <motion.div
                            className="absolute inset-0 bg-[#0B0C15] origin-right"
                            style={{ scaleX: useTransform(scaleX, [0, 1], [1, 0]) }}
                        />
                    </div>
                    <div className="flex justify-between mt-3 text-sm font-medium">
                        <span className="text-emerald-400">← Most Permissive</span>
                        <span className="text-red-400">Most Restrictive →</span>
                    </div>
                </div>

                {/* Model cards */}
                <div className="space-y-4">
                    {sortedModels.map((model, idx) => (
                        <motion.div
                            key={model.name}
                            initial={{ opacity: 0, x: -50 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true, amount: 0.5 }}
                            transition={{ duration: 0.5, delay: idx * 0.06 }}
                            className="flex items-center gap-5 bg-white/5 p-5 rounded-xl border border-white/10 shadow-sm hover:shadow-md hover:bg-white/10 transition-all hover:border-white/20"
                        >
                            {/* Provider Logo */}
                            <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden">
                                <img
                                    src={getLogoUrl(model.name)}
                                    alt={getProviderName(model.name)}
                                    className="w-8 h-8 object-contain opacity-90"
                                    loading="lazy"
                                />
                            </div>

                            {/* Model info */}
                            <div className="flex-1 min-w-0">
                                <h3 className="font-bold text-lg text-white truncate">
                                    {model.displayName}
                                </h3>
                                <p className="text-sm text-slate-400">
                                    {getProviderName(model.name)}
                                </p>
                            </div>

                            {/* Percentage */}
                            <div className="flex-shrink-0 text-right">
                                <span
                                    className="text-3xl font-black"
                                    style={{ color: getRateColor(model.rate) }}
                                >
                                    {model.rate}%
                                </span>
                                <p className="text-xs text-slate-500 mt-0.5">refusal</p>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
