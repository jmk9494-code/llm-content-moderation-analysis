'use client';

import { useSidebar } from '@/components/providers/SidebarProvider';

export function MainContentWrapper({ children, className }: { children: React.ReactNode; className?: string }) {
    return (
        <div
            className={`flex flex-col flex-1 min-h-screen w-full ${className || ''}`}
        >
            {children}
        </div>
    );
}
