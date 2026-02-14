import Link from 'next/link';
import { Search } from 'lucide-react';

export function BrandBar() {
    return (
        <div className="w-full bg-[#800000] text-white h-[45px] sm:h-[50px] flex items-center justify-between px-4 md:px-8 lg:px-12 z-50 relative shadow-sm">
            <div className="flex items-center gap-4">
                <Link href="/" className="flex items-center gap-2 hover:opacity-90 transition-opacity">
                    <span className="uppercase text-sm font-serif tracking-widest font-bold hidden sm:block">Moderation Bias</span>
                </Link>
            </div>

            <div className="flex items-center gap-6 text-sm font-medium uppercase tracking-wide text-white/90">
                <nav className="hidden md:flex items-center gap-6">
                    <Link href="https://github.com/jacobkandel" target="_blank" className="hover:text-white transition-colors">GitHub</Link>
                </nav>
            </div>
        </div>
    );
}
