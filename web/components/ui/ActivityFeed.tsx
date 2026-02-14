'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Activity, CheckCircle, XCircle, AlertCircle, Clock } from 'lucide-react';

interface AuditEvent {
    timestamp: string;
    model: string;
    verdict: string;
    category?: string;
}

interface ActivityFeedProps {
    data: AuditEvent[];
    maxItems?: number;
}

const verdictConfig = {
    safe: { icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-50 dark:bg-green-900/20' },
    unsafe: { icon: XCircle, color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-900/20' },
    unclear: { icon: AlertCircle, color: 'text-[#EAAA00]', bg: 'bg-[#EAAA00]/10 dark:bg-[#EAAA00]/20' },
    error: { icon: AlertCircle, color: 'text-gray-500', bg: 'bg-gray-50 dark:bg-gray-900/20' },
};

function formatTimeAgo(timestamp: string): string {
    const date = new Date(timestamp);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
}

export function ActivityFeed({ data, maxItems = 10 }: ActivityFeedProps) {
    const recentItems = useMemo(() => {
        return [...data]
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
            .slice(0, maxItems);
    }, [data, maxItems]);

    if (recentItems.length === 0) {
        return (
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                    <Activity className="h-5 w-5 text-primary" />
                    <h3 className="font-bold text-slate-800 dark:text-white">Recent Activity</h3>
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-8">
                    No recent activity
                </p>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-primary" />
                    <h3 className="font-bold text-slate-800 dark:text-white">Recent Activity</h3>
                </div>
                <span className="text-xs text-slate-400 dark:text-slate-500 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Live
                </span>
            </div>

            <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {recentItems.map((item, index) => {
                    const verdict = item.verdict?.toLowerCase() || 'error';
                    const config = verdictConfig[verdict as keyof typeof verdictConfig] || verdictConfig.error;
                    const Icon = config.icon;

                    return (
                        <motion.div
                            key={`${item.timestamp}-${index}`}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className={`flex items-start gap-3 p-3 rounded-lg ${config.bg} transition-colors`}
                        >
                            <div className={`mt-0.5 ${config.color}`}>
                                <Icon className="h-4 w-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2">
                                    <span className="text-sm font-medium text-slate-900 dark:text-white truncate">
                                        {item.model?.split('/')[1] || item.model || 'Unknown'}
                                    </span>
                                    <span className="text-xs text-slate-400 dark:text-slate-500 whitespace-nowrap">
                                        {formatTimeAgo(item.timestamp)}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 mt-0.5">
                                    <span className={`text-xs font-medium capitalize ${config.color}`}>
                                        {verdict}
                                    </span>
                                    {item.category && (
                                        <>
                                            <span className="text-slate-300 dark:text-slate-600">•</span>
                                            <span className="text-xs text-slate-500 dark:text-slate-400 truncate">
                                                {item.category}
                                            </span>
                                        </>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    );
                })}
            </div>
        </div>
    );
}
