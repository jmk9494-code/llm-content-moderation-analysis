'use client';

import { motion } from 'framer-motion';
import { ReactNode } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface StatCardProps {
    title: string;
    value: string | number;
    description?: string | ReactNode; // Optional description text
    change?: number; // Percentage change (e.g., 5.2 for +5.2%)
    icon?: ReactNode;
    delay?: number; // Animation delay
}

export function StatCard({ title, value, description, change, icon, delay = 0 }: StatCardProps) {
    const isPositive = change !== undefined && change > 0;
    const isNegative = change !== undefined && change < 0;
    const isNeutral = change === undefined || change === 0;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay }}
            className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow"
        >
            <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-slate-500">{title}</span>
                {icon && (
                    <div className="p-2 bg-slate-100 rounded-lg">
                        {icon}
                    </div>
                )}
            </div>
            <motion.div
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.3, delay: delay + 0.1 }}
                className="text-3xl font-bold text-slate-900"
            >
                {value}
            </motion.div>
            {description && (
                <p className="text-sm text-slate-500 mt-1">{description}</p>
            )}
            {change !== undefined && (
                <div className="flex items-center gap-1 mt-2">
                    {isPositive && <TrendingUp className="h-4 w-4 text-green-500" />}
                    {isNegative && <TrendingDown className="h-4 w-4 text-red-500" />}
                    {isNeutral && <Minus className="h-4 w-4 text-slate-400" />}
                    <span
                        className={`text-sm font-medium ${isPositive ? 'text-green-600' :
                            isNegative ? 'text-red-600' :
                                'text-slate-500'
                            }`}
                    >
                        {isPositive ? '+' : ''}{change.toFixed(1)}%
                    </span>
                    <span className="text-sm text-slate-400">vs last period</span>
                </div>
            )}
        </motion.div>
    );
}

export function StatCardGrid({ children }: { children: ReactNode }) {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {children}
        </div>
    );
}
