'use client';

import { cn } from '@/lib/utils';
import { Bot, Zap, Globe, Cpu } from 'lucide-react';

interface ModelLogoProps {
    modelId: string;
    className?: string;
}

export function ModelLogo({ modelId, className }: ModelLogoProps) {
    // Extract provider and clean name
    const provider = modelId.split('/')[0]?.toLowerCase() || 'unknown';

    // Define provider styles
    const styles: Record<string, { bg: string; text: string; icon: any; initial: string }> = {
        openai: {
            bg: 'bg-emerald-100',
            text: 'text-emerald-700',
            icon: Zap,
            initial: 'O'
        },
        google: {
            bg: 'bg-blue-100',
            text: 'text-blue-700',
            icon: Globe,
            initial: 'G'
        },
        anthropic: {
            bg: 'bg-amber-100',
            text: 'text-amber-700',
            icon: Bot,
            initial: 'A'
        },
        meta: {
            bg: 'bg-sky-100',
            text: 'text-sky-700',
            icon: Cpu,
            initial: 'M'
        },
        mistralai: {
            bg: 'bg-violet-100',
            text: 'text-violet-700',
            icon: Zap,
            initial: 'M'
        },
        'x-ai': {
            bg: 'bg-slate-900',
            text: 'text-white',
            icon: Bot,
            initial: 'X'
        },
        deepseek: {
            bg: 'bg-blue-900',
            text: 'text-white',
            icon: Globe,
            initial: 'D'
        },
        qwen: {
            bg: 'bg-indigo-900',
            text: 'text-white',
            icon: Cpu,
            initial: 'Q'
        },
    };

    const style = styles[provider] || {
        bg: 'bg-slate-100',
        text: 'text-slate-600',
        icon: Bot,
        initial: provider.charAt(0).toUpperCase()
    };

    const Icon = style.icon;

    return (
        <div className={cn("rounded-2xl flex items-center justify-center shadow-inner", style.bg, style.text, className)}>
            <span className="font-bold font-display select-none">
                {style.initial}
            </span>
        </div>
    );
}
