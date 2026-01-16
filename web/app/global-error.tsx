'use client';

import { useEffect } from 'react';
import { AlertOctagon } from 'lucide-react';

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        // Log error to an error reporting service
        console.error("Global Error Caught:", error);
    }, [error]);

    return (
        <html>
            <body className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans text-slate-900">
                <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-200 p-8 text-center">
                    <div className="mx-auto w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-6">
                        <AlertOctagon className="h-8 w-8 text-red-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900 mb-2">Something went wrong!</h2>
                    <p className="text-slate-500 mb-8">
                        A critical error occurred. Usually this is due to a network glitch or data inconsistency.
                    </p>
                    <div className="flex flex-col gap-3">
                        <button
                            onClick={() => reset()}
                            className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold transition-colors"
                        >
                            Try Again
                        </button>
                        <button
                            onClick={() => window.location.reload()}
                            className="w-full py-3 px-4 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl font-medium transition-colors"
                        >
                            Reload Page
                        </button>
                    </div>
                    {error.digest && (
                        <p className="mt-6 text-xs text-slate-400 font-mono">Error ID: {error.digest}</p>
                    )}
                </div>
            </body>
        </html>
    );
}
