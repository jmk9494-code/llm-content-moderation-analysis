'use client';

import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface LandingSectionProps {
    children: ReactNode;
    className?: string;
    id?: string;
}

export default function LandingSection({ children, className = "", id }: LandingSectionProps) {
    return (
        <section
            id={id}
            className={`h-screen w-full snap-start flex items-center justify-center relative overflow-hidden ${className}`}
        >
            <motion.div
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: false, margin: "-20%" }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="max-w-7xl mx-auto px-6 w-full relative z-10"
            >
                {children}
            </motion.div>
        </section>
    );
}
