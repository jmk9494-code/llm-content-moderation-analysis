import React from 'react';
import { Info } from 'lucide-react';

interface AnalysisOverviewProps {
    title: string;
    description: string;
    importance: string;
    metrics?: string[];
}

export default function AnalysisOverview({ title, description, importance, metrics }: AnalysisOverviewProps) {
    return (
        <div className="bg-card border border-border rounded-xl p-6 mb-8">
            <div className="flex items-start gap-3">
                <div className="p-2 bg-muted rounded-lg flex-shrink-0">
                    <Info className="h-5 w-5 text-foreground" />
                </div>
                <div className="flex-1">
                    <h2 className="text-lg font-bold text-foreground mb-2">{title}</h2>
                    <p className="text-muted-foreground leading-relaxed mb-3">
                        {description}
                    </p>
                    <div className="bg-card rounded-lg p-4 border border-border">
                        <h3 className="text-sm font-semibold text-foreground mb-2">Why This Matters</h3>
                        <p className="text-sm text-muted-foreground">
                            {importance}
                        </p>
                    </div>
                    {metrics && metrics.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-border">
                            <h3 className="text-sm font-semibold text-foreground mb-2">Key Metrics:</h3>
                            <ul className="space-y-1">
                                {metrics.map((metric, idx) => (
                                    <li key={idx} className="text-sm text-muted-foreground flex items-start">
                                        <span className="text-foreground mr-2">•</span>
                                        <span>{metric}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
