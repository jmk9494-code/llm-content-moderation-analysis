'use client';

import { useRef, ReactNode } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';

interface ScrollSectionProps {
    children: ReactNode;
    className?: string;
    fadeIn?: boolean;
    translateY?: boolean;
    id?: string;
}

/**
 * ScrollSection - Foundation component for scroll-triggered animations
 * 
 * Wraps content in a motion.section with configurable scroll-based animations.
 * Uses Framer Motion's useScroll to detect when section enters/exits viewport.
 */
export function ScrollSection({
    children,
    className = '',
    fadeIn = true,
    translateY = true,
    id
}: ScrollSectionProps) {
    const ref = useRef(null);

    const { scrollYProgress } = useScroll({
        target: ref,
        offset: ["start end", "end start"] // Track from when it enters bottom to when it exits top
    });

    // Fade in when entering, fade out when leaving
    const opacity = fadeIn
        ? useTransform(scrollYProgress, [0, 0.2, 0.8, 1], [0, 1, 1, 0])
        : 1;

    // Parallax effect - subtle upward movement as you scroll
    const y = translateY
        ? useTransform(scrollYProgress, [0, 1], [100, -100])
        : 0;

    return (
        <motion.section
            ref={ref}
            id={id}
            style={{ opacity, y }}
            className={`min-h-screen flex items-center justify-center ${className}`}
        >
            {children}
        </motion.section>
    );
}

/**
 * StickySection - Section that stays in place while content scrolls past
 * Perfect for narrative text that needs to remain visible
 */
export function StickySection({ children, className = '' }: { children: ReactNode; className?: string }) {
    return (
        <div className={`sticky top-0 h-screen flex items-center justify-center ${className}`}>
            {children}
        </div>
    );
}
