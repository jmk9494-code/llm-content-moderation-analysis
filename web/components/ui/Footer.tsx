'use client';

import Link from 'next/link';
import { Linkedin } from 'lucide-react';

export function Footer() {
    return (
        <footer className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 mt-12 print:hidden">
            <div className="max-w-7xl mx-auto px-6 py-8 flex flex-col md:flex-row items-center justify-between gap-6">

                {/* Left: Author Info */}
                <div className="flex items-center gap-4">
                    <div className="text-sm text-slate-500 dark:text-slate-400 font-medium">
                        Research by <span className="text-slate-900 dark:text-white font-bold">Jacob Kandel</span>
                    </div>
                    <a
                        href="https://www.linkedin.com/in/jacob-kandel"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-3 py-1.5 bg-[#0077b5] text-white rounded-full text-xs font-bold hover:shadow-md transition-all hover:-translate-y-0.5"
                        aria-label="LinkedIn Profile"
                    >
                        <Linkedin className="h-3 w-3" />
                        Connect
                    </a>
                </div>

                {/* Right: University Logo */}
                <div className="flex items-center gap-4 group">
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest text-right leading-tight hidden md:block border-r border-slate-200 dark:border-slate-700 pr-4">
                        Academic<br />Research
                    </span>
                    <a href="https://www.uchicago.edu/" target="_blank" rel="noopener noreferrer" className="block">
                        <img
                            src="https://img.logo.dev/uchicago.edu?token=pk_JCpYIPZHQjiSB9uwIkO50A&size=200&format=png"
                            alt="The University of Chicago"
                            className="h-12 w-auto object-contain opacity-80 group-hover:opacity-100 transition-opacity dark:invert dark:brightness-0 dark:filter"
                        />
                    </a>
                </div>
            </div>
        </footer>
    );
}
