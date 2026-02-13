'use client';

import { Search } from 'lucide-react';

export default function EvidencePage() {
    return (
        <div className="bg-card rounded-xl border border-border p-8 shadow-sm flex-col items-center text-center max-w-2xl mx-auto flex">
            <h3 className="text-xl font-bold flex items-center gap-2 mb-4 text-foreground">📂 Evidence Locker</h3>
            <p className="text-muted-foreground mb-8 max-w-md">
                Explore raw audit traces with full transparency. Identify cases where models exhibit "Paternalism" or inconsistent safety boundaries.
            </p>
            <a href="/explorer.html" target="_blank" className="inline-flex justify-center items-center px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium text-base gap-2">
                <Search className="w-5 h-5" /> Open Evidence Locker
            </a>
        </div>
    );
}
