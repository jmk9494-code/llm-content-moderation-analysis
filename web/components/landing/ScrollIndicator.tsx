'use client';

import { motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

export default function ScrollIndicator() {
    return (
        <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
                delay: 2,
                duration: 1,
                repeat: Infinity,
                repeatType: 'reverse'
            }}
            className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-slate-400 z-20"
        >
            <span className="text-[10px] uppercase tracking-[0.2em]">Scroll to Discover</span>
            <ChevronDown className="h-6 w-6 animate-bounce" />
        </motion.div>
    );
}
