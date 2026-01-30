'use client';

import { Search } from 'lucide-react';

export default function EvidencePage() {
    return (
        <div className="bg-white rounded-xl border border-slate-200 p-8 shadow-sm flex flex-col items-center text-center max-w-2xl mx-auto">
            <h3 className="text-xl font-bold flex items-center gap-2 mb-4">📂 Evidence Locker</h3>
            <p className="text-slate-500 mb-8 max-w-md">
                Explore raw audit traces with full transparency. Identify cases where models exhibit "Paternalism" or inconsistent safety boundaries.
            </p>
            <a href="/explorer.html" target="_blank" className="inline-flex justify-center items-center px-6 py-3 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors font-medium text-base gap-2">
                <Search className="w-5 h-5" /> Open Evidence Locker
            </a>
        </div>
    );
}
