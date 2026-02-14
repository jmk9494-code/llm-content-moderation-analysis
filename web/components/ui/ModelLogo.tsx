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
            bg: 'bg-[#9CAF88]', // Light Forest
            text: 'text-[#275D38]', // Forest
            icon: Zap,
            initial: 'O'
        },
        google: {
            bg: 'bg-[#3EB1C8]', // Light Lake
            text: 'text-[#007396]', // Lake
            icon: Globe,
            initial: 'G'
        },
        anthropic: {
            bg: 'bg-[#F3D03E]', // Light Goldenrod
            text: 'text-[#CC8A00]', // Dark Goldenrod
            icon: Bot,
            initial: 'A'
        },
        meta: {
            bg: 'bg-[#3EB1C8]', // Light Lake (reuse or distinct?) Lake works well.
            text: 'text-[#002A3A]', // Dark Lake
            icon: Cpu,
            initial: 'M'
        },
        mistralai: {
            bg: 'bg-[#86647A]', // Light Violet
            text: 'text-[#59315F]', // Violet
            icon: Zap,
            initial: 'M'
        },
        'x-ai': {
            bg: 'bg-[#737373]', // Dark Greystone
            text: 'text-white',
            icon: Bot,
            initial: 'X'
        },
        deepseek: {
            bg: 'bg-[#002A3A]', // Dark Lake
            text: 'text-white',
            icon: Globe,
            initial: 'D'
        },
        qwen: {
            bg: 'bg-[#41273B]', // Dark Violet
            text: 'text-white',
            icon: Cpu,
            initial: 'Q'
        },
    };

    const style = styles[provider] || {
        bg: 'bg-[#D9D9D9]', // Light Greystone
        text: 'text-[#737373]', // Dark Greystone
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
