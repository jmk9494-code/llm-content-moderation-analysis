'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Shield, LayoutDashboard, Crosshair, ArrowLeftRight, Home, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
    { name: 'Home', href: '/', icon: Home },
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Strategies', href: '/strategies', icon: Crosshair },
    { name: 'Compare', href: '/compare', icon: ArrowLeftRight },
    { name: 'Audit Log', href: '/audit', icon: FileText },
];

export function NavBar() {
    const pathname = usePathname();

    return (
        <nav className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/80 backdrop-blur-md">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex h-16 items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-2 font-bold text-xl tracking-tight text-slate-900">
                            <Shield className="h-6 w-6 text-indigo-600" />
                            Algorithmic Arbiters
                        </div>
                    </div>
                    <div className="hidden md:block">
                        <div className="ml-10 flex items-baseline space-x-4">
                            {navItems.map((item) => {
                                const isActive = pathname === item.href;
                                return (
                                    <Link
                                        key={item.name}
                                        href={item.href}
                                        className={cn(
                                            'flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                                            isActive
                                                ? 'bg-indigo-50 text-indigo-700'
                                                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                                        )}
                                    >
                                        <item.icon className={cn("h-4 w-4", isActive ? "text-indigo-600" : "text-slate-400")} />
                                        {item.name}
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </nav>
    );
}
