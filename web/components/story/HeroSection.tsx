'use client';

import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { useEffect, useState } from 'react';

interface HeroSectionProps {
    totalAudits: number;
    uniqueModels: number;
}

/**
 * HeroSection - Full-screen opening with animated statistics
 * 
 * Creates an impactful first impression with:
 * - Animated number counter that counts up when in view
 * - Gradient background with subtle animations
 * - Scroll indicator at bottom
 */
export function HeroSection({ totalAudits, uniqueModels }: HeroSectionProps) {
    const [ref, inView] = useInView({ threshold: 0.5, triggerOnce: true });
    const [count, setCount] = useState(0);

    // Animate counter when section comes into view
    useEffect(() => {
        if (inView && totalAudits > 0) {
            const duration = 2000; // 2 seconds
            const steps = 60; // 60fps
            const increment = totalAudits / steps;
            let current = 0;

            const timer = setInterval(() => {
                current += increment;
                if (current >= totalAudits) {
                    setCount(totalAudits);
                    clearInterval(timer);
                } else {
                    setCount(Math.floor(current));
                }
            }, duration / steps);

            return () => clearInterval(timer);
        }
    }, [inView, totalAudits]);

    return (
        <section
            ref={ref}
            className="min-h-screen bg-gradient-to-b from-indigo-100 via-purple-100 to-background dark:from-indigo-950 dark:via-purple-950 dark:to-background flex items-center justify-center text-foreground relative overflow-hidden transition-colors duration-500"
        >
            {/* Animated background grid */}
            <div className="absolute inset-0 opacity-20 dark:opacity-30">
                <div className="absolute inset-0" style={{
                    backgroundImage: `
            linear-gradient(to right, currentColor 1px, transparent 1px),
            linear-gradient(to bottom, currentColor 1px, transparent 1px)
          `,
                    backgroundSize: '50px 50px',
                    color: 'rgba(99, 102, 241, 0.1)'
                }} />
            </div>

            {/* Gradient orbs for visual interest - darker for dark mode */}
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/10 dark:bg-indigo-500/20 rounded-full blur-3xl animate-pulse" />
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 dark:bg-purple-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />

            {/* Main content */}
            <div className="relative z-10 text-center max-w-5xl px-8">
                <motion.h1
                    initial={{ opacity: 0, y: 30 }}
                    animate={inView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="text-4xl md:text-6xl lg:text-7xl font-bold mb-8 leading-tight text-foreground px-4 md:px-0"
                >
                    We Tested Every Major AI Model
                    <br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-purple-500 dark:from-indigo-400 dark:to-purple-400 inline-block">for Content Moderation Bias</span>
                </motion.h1>

                {/* Giant animated number */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={inView ? { opacity: 1, scale: 1 } : {}}
                    transition={{ duration: 1, delay: 0.3, ease: "easeOut" }}
                    className="my-12 md:my-16"
                >
                    <div className="text-6xl sm:text-8xl md:text-9xl lg:text-[10rem] font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 dark:from-indigo-400 dark:via-purple-400 dark:to-pink-400 drop-shadow-2xl break-all sm:break-normal leading-none tracking-tighter">
                        {count.toLocaleString()}
                    </div>
                    <p className="text-xl md:text-2xl text-muted-foreground mt-4">
                        test cases across <span className="font-bold text-foreground">{uniqueModels}</span> AI models
                    </p>
                </motion.div>

                {/* Subtitle with call to explore */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={inView ? { opacity: 1 } : {}}
                    transition={{ duration: 0.8, delay: 0.9 }}
                    className="mt-12 space-y-4"
                >
                    <p className="text-lg md:text-xl text-muted-foreground/80 max-w-3xl mx-auto leading-relaxed">
                        Discover how AI companies moderate content — and who draws the line where.
                    </p>
                    <p className="text-sm md:text-base text-indigo-500 dark:text-indigo-300">
                        Scroll to explore the findings
                    </p>
                </motion.div>
            </div>

            {/* Simple scroll indicator without arrow character if preferred, but usually characters are fine. User said ALL emojis. I'll just remove the text arrow. */}

            <motion.div
                animate={{ y: [0, 12, 0] }}
                transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                className="absolute bottom-8 left-1/2 transform -translate-x-1/2"
            >
                <div className="w-6 h-10 border-2 border-indigo-300/30 rounded-full flex justify-center pt-2">
                    <motion.div
                        className="w-1 h-2 bg-indigo-400 rounded-full"
                        animate={{ y: [0, 16, 0] }}
                        transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                    />
                </div>
            </motion.div>
        </section>
    );
}
