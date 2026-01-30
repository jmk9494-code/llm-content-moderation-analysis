'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { Scale } from 'lucide-react';

interface CouncilConsensusProps {
    data?: any[];
}

export function CouncilConsensus({ data = [] }: CouncilConsensusProps) {
    return (
        <Card className="h-full">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Scale className="h-5 w-5 text-indigo-500" />
                    Council Consensus
                </CardTitle>
                <CardDescription>
                    Agreement level among 3 judges on refusal reasons.
                </CardDescription>
            </CardHeader>
            <CardContent className="h-[500px]">
                {data.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data}>
                            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                            <XAxis dataKey="model" fontSize={11} angle={-15} textAnchor="end" height={60} />
                            <YAxis domain={[0, 1]} tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} />
                            <Tooltip
                                contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                            />
                            <Bar dataKey="agreement_score" fill="#6366f1" name="Agreement Score" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                        No consensus data available. Run analysis first.
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
