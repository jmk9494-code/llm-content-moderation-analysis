'use client';

import { useSidebar } from '@/components/providers/SidebarProvider';

export function MainContentWrapper({ children, className }: { children: React.ReactNode; className?: string }) {
    const { isCollapsed } = useSidebar();

    return (
        <div
            className={`flex flex-col flex-1 transition-all duration-300 ${isCollapsed ? 'lg:ml-20' : 'lg:ml-72'} ${className || ''}`}
        >
            {children}
        </div>
    );
}
