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
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-6 mb-8">
            <div className="flex items-start gap-3">
                <div className="p-2 bg-indigo-100 rounded-lg flex-shrink-0">
                    <Info className="h-5 w-5 text-indigo-600" />
                </div>
                <div className="flex-1">
                    <h2 className="text-lg font-bold text-slate-900 mb-2">{title}</h2>
                    <p className="text-slate-700 leading-relaxed mb-3">
                        {description}
                    </p>
                    <div className="bg-white rounded-lg p-4 border border-indigo-100">
                        <h3 className="text-sm font-semibold text-indigo-900 mb-2">Why This Matters</h3>
                        <p className="text-sm text-slate-600">
                            {importance}
                        </p>
                    </div>
                    {metrics && metrics.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-indigo-200">
                            <h3 className="text-sm font-semibold text-slate-700 mb-2">Key Metrics:</h3>
                            <ul className="space-y-1">
                                {metrics.map((metric, idx) => (
                                    <li key={idx} className="text-sm text-slate-600 flex items-start">
                                        <span className="text-indigo-600 mr-2">•</span>
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
