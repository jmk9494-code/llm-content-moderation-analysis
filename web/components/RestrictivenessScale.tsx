'use client';

import { useState } from 'react';
import { Info } from 'lucide-react';

interface ModelData {
    name: string;
    refusalRate: number;
    cost: number;
    displayName?: string;
}

interface RestrictivenessScaleProps {
    models: ModelData[];
    onModelClick?: (model: ModelData) => void;
}

export default function RestrictivenessScale({ models, onModelClick }: RestrictivenessScaleProps) {
    const [hoveredModel, setHoveredModel] = useState<string | null>(null);
    const [selectedModel, setSelectedModel] = useState<string | null>(null);

    // Sort models by refusal rate (restrictiveness)
    const sortedModels = [...models].sort((a, b) => a.refusalRate - b.refusalRate);

    const handleModelClick = (model: ModelData) => {
        setSelectedModel(model.name);
        onModelClick?.(model);
    };

    // Color gradient from green (permissive) to red (restrictive)
    const getColor = (refusalRate: number) => {
        if (refusalRate < 0.1) return 'bg-green-500';
        if (refusalRate < 0.3) return 'bg-yellow-500';
        if (refusalRate < 0.6) return 'bg-orange-500';
        return 'bg-red-500';
    };

    const getBorder = (modelName: string) => {
        if (selectedModel === modelName) return 'ring-4 ring-indigo-600 ring-offset-2';
        if (hoveredModel === modelName) return 'ring-2 ring-slate-400';
        return '';
    };

    return (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 mb-8">
            <div className="flex items-start justify-between mb-6">
                <div>
                    <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                        🎚️ Restrictiveness Spectrum
                    </h2>
                    <p className="text-sm text-slate-500 mt-1">
                        Models positioned by their refusal rate (click to highlight)
                    </p>
                </div>
                <button
                    className="p-2 hover:bg-slate-100 rounded-lg transition-colors group relative"
                    title="How to read this"
                >
                    <Info className="w-4 h-4 text-slate-400" />
                    <div className="absolute right-0 top-10 w-64 bg-slate-900 text-white text-xs p-3 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                        Bubble size represents refusal rate. Left = least restrictive (permissive), Right = most restrictive (conservative).
                    </div>
                </button>
            </div>

            {/* Spectrum Bar */}
            <div className="relative">
                {/* Gradient background */}
                <div className="h-2 rounded-full bg-gradient-to-r from-green-200 via-yellow-200 via-orange-200 to-red-200 mb-4" />

                {/* Labels */}
                <div className="flex justify-between text-xs text-slate-500 mb-8">
                    <span className="font-semibold">← Least Restrictive</span>
                    <span className="font-semibold">Most Restrictive →</span>
                </div>

                {/* Model bubbles */}
                <div className="relative h-32">
                    {sortedModels.map((model, index) => {
                        const position = (model.refusalRate * 100); // 0-100%
                        const size = 40 + (model.refusalRate * 40); // 40-80px

                        return (
                            <div
                                key={model.name}
                                className="absolute transition-all duration-300 cursor-pointer"
                                style={{
                                    left: `${position}%`,
                                    bottom: `${(index % 3) * 35}px`,
                                    transform: 'translateX(-50%)',
                                }}
                                onMouseEnter={() => setHoveredModel(model.name)}
                                onMouseLeave={() => setHoveredModel(null)}
                                onClick={() => handleModelClick(model)}
                            >
                                <div
                                    className={`
                                        ${getColor(model.refusalRate)}
                                        ${getBorder(model.name)}
                                        rounded-full flex items-center justify-center
                                        hover:scale-110 transition-all shadow-md
                                        opacity-${hoveredModel === model.name || selectedModel === model.name ? '100' : '80'}
                                    `}
                                    style={{
                                        width: `${size}px`,
                                        height: `${size}px`,
                                    }}
                                >
                                    <span className="text-white font-bold text-xs text-center px-1">
                                        {(model.refusalRate * 100).toFixed(0)}%
                                    </span>
                                </div>

                                {/* Model name tooltip */}
                                {(hoveredModel === model.name || selectedModel === model.name) && (
                                    <div className="absolute top-full mt-2 left-1/2 transform -translate-x-1/2 bg-slate-900 text-white text-xs px-3 py-2 rounded-lg whitespace-nowrap z-20 shadow-lg">
                                        <div className="font-semibold">{model.displayName || model.name}</div>
                                        <div className="text-slate-300 mt-1">
                                            Refusal: {(model.refusalRate * 100).toFixed(1)}% | Cost: ${model.cost}/1k
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Legend */}
            <div className="mt-8 pt-4 border-t border-slate-200">
                <div className="flex flex-wrap gap-4 text-xs">
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full bg-green-500" />
                        <span className="text-slate-600">Permissive (\u003c10%)</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full bg-yellow-500" />
                        <span className="text-slate-600">Moderate (10-30%)</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full bg-orange-500" />
                        <span className="text-slate-600">Restrictive (30-60%)</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full bg-red-500" />
                        <span className="text-slate-600">Very Restrictive (\u003e60%)</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
