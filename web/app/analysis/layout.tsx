'use client';

import React from 'react';
import { AnalysisProvider } from './AnalysisContext';

// Analysis layout now just provides context
// Global sidebar handles all navigation
export default function AnalysisLayout({ children }: { children: React.ReactNode }) {
    return (
        <AnalysisProvider>
            <div className="w-full">
                {children}
            </div>
        </AnalysisProvider>
    );
}
