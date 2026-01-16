'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';

interface Props {
    children?: ReactNode;
    fallbackMessage?: string;
}

interface State {
    hasError: boolean;
}

export class ChartErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false
    };

    public static getDerivedStateFromError(_: Error): State {
        return { hasError: true };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Chart Error:", error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="flex h-full min-h-[200px] w-full flex-col items-center justify-center rounded-lg border border-red-200 bg-red-50 p-4 text-center">
                    <AlertCircle className="h-8 w-8 text-red-500 mb-2" />
                    <h3 className="text-sm font-semibold text-red-700">Chart Visualization Failed</h3>
                    <p className="text-xs text-red-600 mt-1 max-w-xs text-balance">
                        {this.props.fallbackMessage || "We couldn't render this chart due to a data issue."}
                    </p>
                </div>
            );
        }

        return this.props.children;
    }
}
