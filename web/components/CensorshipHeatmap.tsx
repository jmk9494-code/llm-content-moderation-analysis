
"use client";

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

// Mock Data Structure (In real app, fetch from API)
// heatmapData: { x: string (Topic), y: string (Model), value: number (Refusal Rate 0-1) }[]

interface HeatmapProps {
    data: { topic: string; model: string; refusalRate: number }[];
}

export function CensorshipHeatmap({ data }: HeatmapProps) {

    // Pivot data for grid
    const processed = useMemo(() => {
        const models = Array.from(new Set(data.map(d => d.model))).sort();
        const topics = Array.from(new Set(data.map(d => d.topic))).sort();

        // Map: Key="Model-Topic", Value=Rate
        const map = new Map();
        data.forEach(d => map.set(`${d.model}-${d.topic}`, d.refusalRate));

        return { models, topics, map };
    }, [data]);

    const getColor = (rate: number) => {
        // Gradient: White (0%) -> Yellow (50%) -> Red (100%)
        if (rate === undefined) return '#f3f4f6'; // Gray for missing
        if (rate <= 0.5) {
            // White to Yellow
            // 0 -> 255, 255, 255
            // 0.5 -> 255, 255, 0
            const g = Math.floor(255);
            const b = Math.floor(255 - (rate * 2 * 255));
            return `rgb(255, ${g}, ${b})`;
        } else {
            // Yellow to Red
            // 0.5 -> 255, 255, 0
            // 1.0 -> 255, 0, 0
            const g = Math.floor(255 - ((rate - 0.5) * 2 * 255));
            return `rgb(255, ${g}, 0)`;
        }
    };

    return (
        <Card className="w-full">
            <CardHeader>
                <CardTitle>Censorship Heatmap</CardTitle>
                <CardDescription>
                    Visualizing the Refusal Boundary. X-Axis: Topic Sensitivity. Y-Axis: Model Aggressiveness.
                </CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
                <div className="min-w-[600px]">
                    <table className="w-full border-collapse text-sm">
                        <thead>
                            <tr>
                                <th className="p-2 border bg-muted">Model \ Topic</th>
                                {processed.topics.map(t => (
                                    <th key={t} className="p-2 border bg-muted font-medium">{t}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {processed.models.map(m => (
                                <tr key={m}>
                                    <td className="p-2 border font-medium bg-muted/50">{m}</td>
                                    {processed.topics.map(t => {
                                        const val = processed.map.get(`${m}-${t}`);
                                        return (
                                            <td
                                                key={`${m}-${t}`}
                                                className="p-2 border text-center font-bold"
                                                style={{ backgroundColor: getColor(val), color: val > 0.6 ? 'white' : 'black' }}
                                            >
                                                {val !== undefined ? `${(val * 100).toFixed(0)}%` : '-'}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </CardContent>
        </Card>
    );
}
